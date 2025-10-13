import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVirementDto } from './dto/create-virement.dto';
import { ConfirmVirementDto } from './dto/confirm-virement.dto';
import { SearchVirementDto } from './dto/search-virement.dto';
import { CreateOVDto } from './dto/create-ov.dto';
import { UpdateOVStatusDto } from './dto/update-ov-status.dto';
import { Virement, User } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Express } from 'express';
import { ExcelValidationService } from './excel-validation.service';
import { PdfGenerationService } from './pdf-generation.service';
import { TxtGenerationService } from './txt-generation.service';
import { WorkflowNotificationService } from '../workflow/workflow-notification.service';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private excelValidationService: ExcelValidationService,
    private pdfGenerationService: PdfGenerationService,
    private txtGenerationService: TxtGenerationService,
    private workflowNotificationService: WorkflowNotificationService
  ) {}

  // Simple audit log (extend to DB if needed)
  private async logAuditAction(action: string, details: any) {
    // For now, just log to console. Replace with DB insert if needed.
    console.log(`[AUDIT] ${new Date().toISOString()} | ${action} |`, details);
  }

  private checkFinanceRole(user: User) {
    console.log('🔐 Checking role for user:', user?.role);
    if (!['FINANCE', 'SUPER_ADMIN'].includes(user.role)) {
      console.log('❌ Role check failed for:', user?.role);
      throw new ForbiddenException('Access denied');
    }
    console.log('✅ Role check passed');
  }

  async createVirement(dto: CreateVirementDto, user: User): Promise<Virement> {
    this.checkFinanceRole(user);
    // Defensive: ensure bordereau exists and is CLOTURE
    const bordereau = await this.prisma.bordereau.findUnique({ where: { id: dto.bordereauId } });
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    if (bordereau.statut !== 'CLOTURE') throw new BadRequestException('Bordereau must be CLOTURE');
    // Defensive: ensure no duplicate virement for this bordereau
    const existing = await this.prisma.virement.findUnique({ where: { bordereauId: dto.bordereauId } });
    if (existing) throw new BadRequestException('Virement already exists for this bordereau');
    // Defensive: montant must be positive
    if (dto.montant <= 0) throw new BadRequestException('Montant must be positive.');
    // Defensive: dateDepot <= dateExecution
    if (new Date(dto.dateDepot) > new Date(dto.dateExecution)) throw new BadRequestException('dateDepot must be before or equal to dateExecution.');
    const virement = await this.prisma.virement.create({
      data: {
        bordereauId: dto.bordereauId,
        montant: dto.montant,
        referenceBancaire: dto.referenceBancaire,
        dateDepot: new Date(dto.dateDepot),
        dateExecution: new Date(dto.dateExecution),
      },
    });
    await this.logAuditAction('CREATE_VIREMENT', { userId: user.id, virementId: virement.id });
    return virement;
  }

  async confirmVirement(id: string, user: User): Promise<Virement> {
    this.checkFinanceRole(user);

    const virement = await this.prisma.virement.findUnique({ where: { id } });
    if (!virement) throw new NotFoundException('Virement not found');
    if (virement.confirmed) throw new BadRequestException('Already confirmed');

    // Update virement and bordereau - FIXED: Use actual execution date
    const now = new Date();
    await this.prisma.bordereau.update({
      where: { id: virement.bordereauId },
      data: {
        dateDepotVirement: virement.dateDepot,
        dateExecutionVirement: now, // Use current date as actual execution
        statut: 'VIREMENT_EXECUTE'
      },
    });

    const updated = await this.prisma.virement.update({
      where: { id },
      data: {
        confirmed: true,
        confirmedAt: now,
        confirmedById: user.id,
      },
    });
    await this.logAuditAction('CONFIRM_VIREMENT', { userId: user.id, virementId: id });
    return updated;
  }

  async searchVirements(query: SearchVirementDto, user: User) {
    this.checkFinanceRole(user);

    const where: any = {};
    if (query.confirmed !== undefined) {
      if (typeof query.confirmed === 'string') {
        where.confirmed = query.confirmed === 'true';
      } else {
        where.confirmed = query.confirmed;
      }
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }
    if (query.bordereauReference) {
      where.bordereau = { reference: query.bordereauReference };
    }
    if (query.clientName) {
      where.bordereau = {
        ...where.bordereau,
        client: { fullName: { contains: query.clientName, mode: 'insensitive' } },
      };
    }

    const results = await this.prisma.virement.findMany({
      where,
      include: { bordereau: { include: { client: true } }, confirmedBy: true },
      orderBy: { createdAt: 'desc' },
    });
    await this.logAuditAction('SEARCH_VIREMENTS', { userId: user.id, filters: query });
    return results;
  }

  async getVirementById(id: string, user: User) {
    this.checkFinanceRole(user);

    const virement = await this.prisma.virement.findUnique({
      where: { id },
      include: { bordereau: { include: { client: true } }, confirmedBy: true },
    });
    if (!virement) throw new NotFoundException('Virement not found');
    await this.logAuditAction('GET_VIREMENT', { userId: user.id, virementId: id });
    return virement;
  }

  async exportVirements(format: string, query: SearchVirementDto, user: User, res: Response) {
    this.checkFinanceRole(user);

    const virements = await this.searchVirements(query, user);
    await this.logAuditAction('EXPORT_VIREMENTS', { userId: user.id, format, filters: query });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Virements');
      sheet.addRow([
        'ID', 'Bordereau Ref', 'Client', 'Montant', 'Ref Bancaire', 'Date Dépôt', 'Date Exécution', 'Confirmé', 'Confirmé Par', 'Confirmé Le'
      ]);
      virements.forEach(v => {
        sheet.addRow([
          v.id,
          v.bordereau.reference,
          v.bordereau.client.name,
          v.montant,
          v.referenceBancaire,
          v.dateDepot.toISOString(),
          v.dateExecution.toISOString(),
          v.confirmed ? 'Oui' : 'Non',
          v.confirmedBy?.fullName || '',
          v.confirmedAt ? v.confirmedAt.toISOString() : ''
        ]);
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="virements.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="virements.pdf"');
      doc.pipe(res);
      doc.fontSize(16).text('Liste des Virements', { align: 'center' });
      doc.moveDown();
      virements.forEach(v => {
        doc.fontSize(12).text(
          `ID: ${v.id}\nBordereau: ${v.bordereau.reference}\nClient: ${v.bordereau.client.name}\nMontant: ${v.montant}\nRef Bancaire: ${v.referenceBancaire}\nDate Dépôt: ${v.dateDepot.toISOString()}\nDate Exécution: ${v.dateExecution.toISOString()}\nConfirmé: ${v.confirmed ? 'Oui' : 'Non'}\nConfirmé Par: ${v.confirmedBy?.fullName || ''}\nConfirmé Le: ${v.confirmedAt ? v.confirmedAt.toISOString() : ''}\n-----------------------------`
        );
        doc.moveDown();
      });
      doc.end();
    } else {
      throw new BadRequestException('Format must be excel or pdf');
    }
  }

  /**
   * Auto-confirm virements older than 2 days (example rule)
   * This would be called by a scheduler/cron in production
   */
  async autoConfirmVirements() {
    // SYSTEM user (replace with real system user if available)
    const SYSTEM_USER_ID = 'SYSTEM';
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const virements = await this.prisma.virement.findMany({
      where: {
        confirmed: false,
        createdAt: { lte: twoDaysAgo },
      },
    });
    for (const v of virements) {
      // Update bordereau as in manual confirmation
      await this.prisma.bordereau.update({
        where: { id: v.bordereauId },
        data: {
          dateDepotVirement: v.dateDepot,
          dateExecutionVirement: v.dateExecution,
        },
      });
      await this.prisma.virement.update({
        where: { id: v.id },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
          confirmedById: SYSTEM_USER_ID,
        },
      });
      await this.logAuditAction('AUTO_CONFIRM_VIREMENT', { system: true, virementId: v.id });
    }
    await this.logAuditAction('AUTO_CONFIRM_VIREMENTS_RUN', { count: virements.length });
    return { autoConfirmed: virements.length };
  }

  // OV Processing methods
  async validateOVFile(file: Express.Multer.File, body: any, user: User) {
    this.checkFinanceRole(user);
    if (!file) throw new BadRequestException('No file uploaded');
    
    try {
      let clientId = body.clientId;
      
      // Ensure client exists or create default
      if (!clientId || clientId === 'default') {
        const defaultClient = await this.prisma.client.findFirst();
        if (defaultClient) {
          clientId = defaultClient.id;
        } else {
          const newClient = await this.prisma.client.create({
            data: {
              name: 'ARS TUNISIE',
              reglementDelay: 30,
              reclamationDelay: 15,
              email: 'contact@ars.tn',
              phone: '00000000',
              address: 'Tunis'
            }
          });
          clientId = newClient.id;
        }
      }

      const validationResult = await this.excelValidationService.validateExcelFile(file.buffer, clientId);
      
      await this.logAuditAction('VALIDATE_OV_FILE', {
        userId: user.id,
        fileName: file.originalname,
        clientId,
        totalRows: validationResult.summary.total,
        validRows: validationResult.summary.valid,
        errorRows: validationResult.summary.errors,
        warningRows: validationResult.summary.warnings,
        totalAmount: validationResult.summary.totalAmount
      });
      
      return {
        valid: validationResult.valid,
        data: validationResult.data,
        errors: validationResult.errors,
        summary: validationResult.summary
      };
      
    } catch (error) {
      console.error('Error validating OV file:', error);
      throw new BadRequestException('Failed to process Excel file: ' + error.message);
    }
  }

  async processOV(dto: CreateOVDto, user: User) {
    this.checkFinanceRole(user);
    try {
      // Find or create default society
      let society = await this.prisma.society.findFirst({ where: { code: 'DEFAULT' } });
      if (!society) {
        society = await this.prisma.society.create({
          data: { name: 'Default Society', code: 'DEFAULT' }
        });
      }
      
      // Create wire transfer batch
      const batch = await this.prisma.wireTransferBatch.create({
        data: {
          societyId: society.id,
          donneurId: dto.donneurOrdreId,
          status: 'CREATED',
          fileName: `OV_${new Date().toISOString().split('T')[0]}.xlsx`
        },
        include: {
          society: true,
          donneur: true
        }
      });
      
      // Create individual transfers for valid adherents
      if (dto.adherents && dto.adherents.length > 0) {
        const transfers = dto.adherents
          .filter(a => a.status === 'ok' && a.memberId)
          .map(a => ({
            batchId: batch.id,
            memberId: a.memberId!,
            donneurId: dto.donneurOrdreId,
            amount: a.amount,
            reference: `${batch.id}-${a.matricule}`,
            status: 'CREATED'
          }));
        
        await this.prisma.wireTransfer.createMany({ data: transfers });
      }
      
      const ovRecord = {
        id: batch.id,
        reference: `OV/${new Date().getFullYear()}/${batch.id.substring(0, 8)}`,
        donneurOrdreId: dto.donneurOrdreId,
        societyId: dto.societyId,
        totalAmount: dto.totalAmount,
        status: 'NON_EXECUTE',
        createdAt: batch.createdAt,
        createdBy: user.id
      };
      
      await this.logAuditAction('CREATE_OV', { userId: user.id, ovId: ovRecord.id });
      return ovRecord;
      
    } catch (error) {
      console.error('Error processing OV:', error);
      throw new BadRequestException('Failed to process OV: ' + error.message);
    }
  }

  async getOVTracking(query: any, user: User) {
    console.log('🔍 getOVTracking called with query:', query);
    console.log('👤 User:', user);
    this.checkFinanceRole(user);
    try {
      // Get both WireTransferBatch and OrdreVirement data
      const [batches, ordresVirement] = await Promise.all([
        this.prisma.wireTransferBatch.findMany({
          include: {
            society: true,
            donneur: true,
            transfers: true,
            history: { orderBy: { changedAt: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.ordreVirement.findMany({
          include: {
            bordereau: { include: { client: true } },
            donneurOrdre: true
          },
          orderBy: { dateCreation: 'desc' }
        })
      ]);
      
      const now = new Date();
      const result: any[] = [];
      
      // Add WireTransferBatch records
      batches.forEach(batch => {
        const delayDays = Math.floor((now.getTime() - batch.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const lastHistory = batch.history[0];
        const totalAmount = batch.transfers.reduce((sum, t) => sum + t.amount, 0);
        
        result.push({
          id: batch.id,
          reference: `OV/${batch.createdAt.getFullYear()}/${batch.id.substring(0, 8)}`,
          society: batch.society.name,
          dateInjected: batch.createdAt.toISOString(),
          dateExecuted: lastHistory?.changedAt ? lastHistory.changedAt.toISOString() : null,
          status: this.mapBatchStatusToOV(batch.status),
          delay: delayDays,
          observations: lastHistory ? `Dernière modification: ${lastHistory.status}` : 'Créé',
          donneurOrdre: batch.donneur.name,
          totalAmount
        });
      });
      
      // Add OrdreVirement records
      ordresVirement.forEach(ov => {
        const delayDays = Math.floor((now.getTime() - ov.dateCreation.getTime()) / (1000 * 60 * 60 * 24));
        
        result.push({
          id: ov.id,
          reference: ov.reference,
          society: ov.bordereau?.client?.name || 'Entrée manuelle',
          dateInjected: ov.dateCreation.toISOString(),
          dateExecuted: ov.dateTraitement ? ov.dateTraitement.toISOString() : null,
          status: ov.etatVirement,
          delay: delayDays,
          observations: ov.commentaire || '-',
          donneurOrdre: ov.donneurOrdre?.nom || 'N/A',
          totalAmount: ov.montantTotal,
          dateTraitement: ov.dateTraitement ? ov.dateTraitement.toISOString() : null,
          motifObservation: ov.motifObservation || null,
          demandeRecuperation: ov.demandeRecuperation || false,
          dateDemandeRecuperation: ov.dateDemandeRecuperation ? ov.dateDemandeRecuperation.toISOString() : null,
          montantRecupere: ov.montantRecupere || false,
          dateMontantRecupere: ov.dateMontantRecupere ? ov.dateMontantRecupere.toISOString() : null
        });
      });
      
      // Apply filters
      let filteredResult = result;
      if (query.society) {
        filteredResult = filteredResult.filter(r => r.society.toLowerCase().includes(query.society.toLowerCase()));
      }
      if (query.status) {
        filteredResult = filteredResult.filter(r => r.status === query.status);
      }
      if (query.donneurOrdre) {
        filteredResult = filteredResult.filter(r => r.donneurOrdre.toLowerCase().includes(query.donneurOrdre.toLowerCase()));
      }
      if (query.dateFrom) {
        filteredResult = filteredResult.filter(r => new Date(r.dateInjected) >= new Date(query.dateFrom));
      }
      if (query.dateTo) {
        filteredResult = filteredResult.filter(r => new Date(r.dateInjected) <= new Date(query.dateTo));
      }
      
      // Sort by date (newest first)
      filteredResult.sort((a, b) => new Date(b.dateInjected).getTime() - new Date(a.dateInjected).getTime());
      
      return filteredResult;
      
    } catch (error) {
      console.error('❌ FinanceService: Error fetching OV tracking:', error);
      return [];
    }
  }

  private mapBatchStatusToOV(status: string): string {
    const statusMap = {
      'CREATED': 'NON_EXECUTE',
      'VALIDATED': 'EN_COURS',
      'PROCESSED': 'EXECUTE',
      'REJECTED': 'REJETE',
      'ARCHIVED': 'EXECUTE',
      'BLOCKED': 'REJETE'
    };
    return statusMap[status] || 'NON_EXECUTE';
  }

  async updateOVStatus(id: string, dto: UpdateOVStatusDto, user: User) {
    this.checkFinanceRole(user);
    try {
      const batchStatus = this.mapOVStatusToBatch(dto.status);
      
      const batch = await this.prisma.wireTransferBatch.update({
        where: { id },
        data: { status: batchStatus as any },
        include: { society: true, donneur: true }
      });
      
      // Add history record
      await this.prisma.wireTransferBatchHistory.create({
        data: {
          batchId: id,
          status: batchStatus as any,
          changedBy: user.id
        }
      });
      
      await this.logAuditAction('UPDATE_OV_STATUS', { userId: user.id, ovId: id, status: dto.status });
      
      return {
        id,
        status: dto.status,
        dateExecuted: dto.dateExecuted,
        observations: dto.observations,
        updatedAt: new Date(),
        updatedBy: user.id
      };
      
    } catch (error) {
      console.error('Error updating OV status:', error);
      throw new BadRequestException('Failed to update OV status: ' + error.message);
    }
  }

  private mapOVStatusToBatch(ovStatus: string): string {
    const statusMap = {
      'NON_EXECUTE': 'CREATED',
      'EN_COURS_EXECUTION': 'VALIDATED',
      'EXECUTE_PARTIELLEMENT': 'VALIDATED',
      'REJETE': 'REJECTED',
      'BLOQUE': 'BLOCKED',
      'EXECUTE': 'PROCESSED'
    };
    return statusMap[ovStatus] || 'CREATED';
  }

  async generateOVPDF(id: string, res: Response, user: User) {
    this.checkFinanceRole(user);
    try {
      const pdfBuffer = await this.pdfGenerationService.generateOVFromOrderId(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="OV_${id}.pdf"`);
      res.send(pdfBuffer);
      
      await this.logAuditAction('GENERATE_OV_PDF', {
        userId: user.id,
        ordreVirementId: id
      });
      
    } catch (error) {
      console.error('Error generating OV PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  async generateOVTXT(id: string, res: Response, user: User) {
    this.checkFinanceRole(user);
    try {
      const txtContent = await this.txtGenerationService.generateOVTxtFromOrderId(id);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="OV_${id}.txt"`);
      res.send(txtContent);
      
      await this.logAuditAction('GENERATE_OV_TXT', {
        userId: user.id,
        ordreVirementId: id
      });
      
    } catch (error) {
      console.error('Error generating OV TXT:', error);
      res.status(500).json({ error: 'Failed to generate TXT file' });
    }
  }

  // Donneurs d'Ordre methods
  async getDonneurs(user: User) {
    this.checkFinanceRole(user);
    const donneurs = await this.prisma.donneurDOrdre.findMany({
      where: {
        NOT: {
          name: { startsWith: '[DELETED]' }
        }
      },
      include: { society: true }
    });
    return donneurs.map(d => ({
      id: d.id,
      name: d.name,
      bank: d.society.name,
      rib: d.rib,
      txtFormat: 'SWIFT',
      status: 'active'
    }));
  }

  async createDonneur(data: any, user: User) {
    this.checkFinanceRole(user);
    try {
      // Find or create society
      let society = await this.prisma.society.findFirst({ where: { name: data.bank } });
      if (!society) {
        society = await this.prisma.society.create({
          data: { name: data.bank, code: data.bank.substring(0, 3).toUpperCase() }
        });
      }
      
      const donneur = await this.prisma.donneurDOrdre.create({
        data: {
          name: data.name,
          rib: data.rib,
          societyId: society.id
        },
        include: { society: true }
      });
      
      await this.logAuditAction('CREATE_DONNEUR', { userId: user.id, donneurId: donneur.id });
      return {
        id: donneur.id,
        name: donneur.name,
        bank: donneur.society.name,
        rib: donneur.rib,
        txtFormat: data.txtFormat || 'SWIFT',
        status: 'active'
      };
    } catch (error) {
      console.error('Error creating donneur:', error);
      throw new BadRequestException('Failed to create donneur d\'ordre');
    }
  }

  async updateDonneur(id: string, data: any, user: User) {
    this.checkFinanceRole(user);
    try {
      const donneur = await this.prisma.donneurDOrdre.update({
        where: { id },
        data: {
          name: data.name,
          rib: data.rib
        },
        include: { society: true }
      });
      
      await this.logAuditAction('UPDATE_DONNEUR', { userId: user.id, donneurId: id });
      return {
        id: donneur.id,
        name: donneur.name,
        bank: donneur.society.name,
        rib: donneur.rib,
        txtFormat: data.txtFormat || 'SWIFT',
        status: 'active'
      };
    } catch (error) {
      console.error('Error updating donneur:', error);
      throw new BadRequestException('Failed to update donneur d\'ordre');
    }
  }

  async deleteDonneur(id: string, user: User) {
    this.checkFinanceRole(user);
    try {
      // Check if donneur has related records
      const donneur = await this.prisma.donneurDOrdre.findUnique({
        where: { id },
        include: {
          WireTransferBatch: true,
          wireTransfers: true
        }
      });
      
      if (!donneur) {
        throw new NotFoundException('Donneur d\'ordre not found');
      }
      
      // If donneur has related records, use soft delete (update status)
      if (donneur.WireTransferBatch.length > 0 || donneur.wireTransfers.length > 0) {
        const updatedDonneur = await this.prisma.donneurDOrdre.update({
          where: { id },
          data: { 
            name: `[DELETED] ${donneur.name}`
          }
        });
        await this.logAuditAction('SOFT_DELETE_DONNEUR', { userId: user.id, donneurId: id });
        return { deleted: true, soft: true };
      }
      
      // If no related records, safe to hard delete
      await this.prisma.donneurDOrdre.delete({ where: { id } });
      await this.logAuditAction('DELETE_DONNEUR', { userId: user.id, donneurId: id });
      return { deleted: true, soft: false };
    } catch (error) {
      console.error('Error deleting donneur:', error);
      throw new BadRequestException('Failed to delete donneur d\'ordre');
    }
  }

  // Adherents methods (using Member model)
  async getAdherents(query: any, user: User) {
    this.checkFinanceRole(user);
    const where: any = {};
    if (query.society) {
      where.society = { name: { contains: query.society, mode: 'insensitive' } };
    }
    
    const members = await this.prisma.member.findMany({
      where,
      include: { society: true },
      orderBy: { name: 'asc' }
    });
    
    // Check for duplicate RIBs
    const ribCounts = new Map();
    members.forEach(m => {
      ribCounts.set(m.rib, (ribCounts.get(m.rib) || 0) + 1);
    });
    
    return members.map(m => ({
      id: m.id,
      matricule: m.cin || m.id.substring(0, 8),
      name: m.name.split(' ')[0] || m.name,
      surname: m.name.split(' ').slice(1).join(' ') || '',
      society: m.society.name,
      rib: m.rib,
      status: 'active',
      duplicateRib: ribCounts.get(m.rib) > 1
    }));
  }

  async createAdherent(data: any, user: User) {
    this.checkFinanceRole(user);
    try {
      // Find or create society
      let society = await this.prisma.society.findFirst({ where: { name: data.society } });
      if (!society) {
        society = await this.prisma.society.create({
          data: { name: data.society, code: data.society.substring(0, 3).toUpperCase() }
        });
      }
      
      const member = await this.prisma.member.create({
        data: {
          name: `${data.name} ${data.surname}`.trim(),
          rib: data.rib,
          cin: data.matricule,
          societyId: society.id
        },
        include: { society: true }
      });
      
      await this.logAuditAction('CREATE_ADHERENT', { userId: user.id, adherentId: member.id });
      return {
        id: member.id,
        matricule: member.cin || member.id.substring(0, 8),
        name: data.name,
        surname: data.surname,
        society: member.society.name,
        rib: member.rib,
        status: 'active'
      };
    } catch (error) {
      console.error('Error creating adherent:', error);
      throw new BadRequestException('Failed to create adherent');
    }
  }

  async updateAdherent(id: string, data: any, user: User) {
    this.checkFinanceRole(user);
    try {
      const member = await this.prisma.member.update({
        where: { id },
        data: {
          name: `${data.name} ${data.surname}`.trim(),
          rib: data.rib,
          cin: data.matricule
        },
        include: { society: true }
      });
      
      await this.logAuditAction('UPDATE_ADHERENT', { userId: user.id, adherentId: id });
      return {
        id: member.id,
        matricule: member.cin || member.id.substring(0, 8),
        name: data.name,
        surname: data.surname,
        society: member.society.name,
        rib: member.rib,
        status: 'active'
      };
    } catch (error) {
      console.error('Error updating adherent:', error);
      throw new BadRequestException('Failed to update adherent');
    }
  }

  async deleteAdherent(id: string, user: User) {
    this.checkFinanceRole(user);
    try {
      await this.prisma.member.delete({ where: { id } });
      await this.logAuditAction('DELETE_ADHERENT', { userId: user.id, adherentId: id });
      return { deleted: true };
    } catch (error) {
      console.error('Error deleting adherent:', error);
      throw new BadRequestException('Failed to delete adherent');
    }
  }

  // Notification methods
  async notifyFinanceTeam(bordereauId: string, message?: string, user?: User) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });
      
      if (!bordereau) {
        throw new NotFoundException('Bordereau not found');
      }
      
      // Find finance team users
      const financeUsers = await this.prisma.user.findMany({
        where: { role: { in: ['FINANCE', 'SUPER_ADMIN'] }, active: true }
      });
      
      // Create notifications
      const notifications = financeUsers.map(financeUser => ({
        userId: financeUser.id,
        type: 'FINANCE_NOTIFICATION',
        title: 'Nouveau bordereau à traiter',
        message: message || `Bordereau ${bordereau.reference} de ${bordereau.client.name} prêt pour virement`,
        data: {
          bordereauId: bordereau.id,
          bordereauReference: bordereau.reference,
          clientName: bordereau.client.name,
          nombreBS: bordereau.nombreBS
        }
      }));
      
      await this.prisma.notification.createMany({ data: notifications });
      
      await this.logAuditAction('NOTIFY_FINANCE_TEAM', {
        userId: user?.id,
        bordereauId,
        notifiedUsers: financeUsers.length
      });
      
      return { notified: financeUsers.length };
    } catch (error) {
      console.error('Error notifying finance team:', error);
      throw new BadRequestException('Failed to notify finance team');
    }
  }

  async getFinanceAlerts(user: User) {
    this.checkFinanceRole(user);
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      // Get bordereaux ready for virement but not processed
      const pendingBordereaux = await this.prisma.bordereau.findMany({
        where: {
          statut: 'PRET_VIREMENT',
          virement: null,
          updatedAt: { lt: yesterday }
        },
        include: { client: true },
        orderBy: { updatedAt: 'asc' }
      });
      
      // Get overdue virements
      const overdueVirements = await this.prisma.virement.findMany({
        where: {
          confirmed: false,
          createdAt: { lt: twoDaysAgo }
        },
        include: { bordereau: { include: { client: true } } }
      });
      
      const alerts = [
        ...pendingBordereaux.map(b => {
          const delayHours = Math.floor((now.getTime() - b.updatedAt.getTime()) / (1000 * 60 * 60));
          return {
            id: `pending-${b.id}`,
            type: 'PENDING_VIREMENT',
            level: delayHours > 48 ? 'error' : 'warning',
            title: 'Bordereau en attente de virement',
            message: `${b.reference} (${b.client.name}) - ${delayHours}h de retard`,
            data: { bordereauId: b.id, delayHours },
            createdAt: b.updatedAt
          };
        }),
        ...overdueVirements.map(v => {
          const delayHours = Math.floor((now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60));
          return {
            id: `overdue-${v.id}`,
            type: 'OVERDUE_VIREMENT',
            level: 'error',
            title: 'Virement en retard',
            message: `${v.bordereau.reference} (${v.bordereau.client.name}) - ${delayHours}h de retard`,
            data: { virementId: v.id, delayHours },
            createdAt: v.createdAt
          };
        })
      ];
      
      return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching finance alerts:', error);
      return [];
    }
  }

  async generateOV(data: {
    bordereauIds: string[];
    donneurOrdre?: string;
    format: 'PDF' | 'TXT' | 'BOTH';
    includeDetails: boolean;
  }) {
    console.log('💰 Generating OV for bordereaux:', data.bordereauIds);
    
    try {
      // First, check what bordereaux exist and their status
      const allBordereaux = await this.prisma.bordereau.findMany({
        where: { id: { in: data.bordereauIds } },
        include: { client: true, BulletinSoin: true }
      });
      
      console.log('🔍 Found bordereaux:', allBordereaux.map(b => `${b.reference}: ${b.statut}`));
      
      // Filter for valid statuses - allow more statuses for demo purposes
      const bordereaux = allBordereaux.filter(b => ['TRAITE', 'PRET_VIREMENT', 'A_SCANNER', 'SCANNE', 'EN_COURS', 'EN_ATTENTE'].includes(b.statut));
      
      console.log('✅ Valid bordereaux for OV:', bordereaux.map(b => `${b.reference}: ${b.statut}`));

      if (bordereaux.length === 0) {
        const availableStatuses = allBordereaux.map(b => b.statut).join(', ');
        throw new Error(`Aucun bordereau valide trouvé pour la génération OV. Statuts disponibles: ${availableStatuses}. Requis: TRAITE, PRET_VIREMENT, A_SCANNER, SCANNE, EN_COURS, ou EN_ATTENTE`);
      }

      const totalBS = bordereaux.reduce((sum, b) => sum + (b.nombreBS || 0), 0);
      const estimatedAmount = totalBS * 150;

      const ovContent = `ORDRE DE VIREMENT
===================

Date: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
Donneur d'ordre: ARS Tunisie
Montant total: ${estimatedAmount.toLocaleString('fr-FR')} TND

BORDEREAUX À TRAITER:
========================

${bordereaux.map((b, i) => 
        `${i + 1}. ${b.reference} (${b.client?.name}) - ${b.nombreBS} BS - ${((b.nombreBS || 0) * 150).toLocaleString('fr-FR')} TND`
      ).join('\n')}

RÉCAPITULATIF:
==============
Bordereaux: ${bordereaux.length}
Total BS: ${totalBS}
Montant total: ${estimatedAmount.toLocaleString('fr-FR')} TND

Document généré automatiquement par ARS`;

      await this.prisma.bordereau.updateMany({
        where: {
          id: { in: bordereaux.filter(b => b.statut === 'TRAITE').map(b => b.id) },
        },
        data: { statut: 'PRET_VIREMENT' }
      });

      console.log('✅ OV generated successfully for', bordereaux.length, 'bordereaux');
      return { 
        content: ovContent, 
        filename: `OV_${new Date().toISOString().split('T')[0]}_${bordereaux.length}bordereaux.txt`,
        count: bordereaux.length,
        totalAmount: estimatedAmount
      };
    } catch (error) {
      console.error('❌ Error generating OV:', error);
      throw error;
    }
  }

  async exportReport(exportData: any, res: Response, user: User) {
    console.log('📡 FinanceService: Export report called with format:', exportData.format);
    try {
      if (exportData.format === 'pdf') {
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="rapport_financier_${new Date().toISOString().split('T')[0]}.pdf"`);
        doc.pipe(res);
        
        doc.fontSize(20).text('RAPPORT FINANCIER', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`);
        const dataArray = Array.isArray(exportData.data) ? exportData.data : (exportData.data?.byBeneficiary || []);
        const totalAmount = dataArray.reduce ? dataArray.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) : 0;
        doc.text(`Transactions: ${dataArray.length || 0}`);
        doc.text(`Montant total: ${totalAmount.toFixed(2)} DT`);
        doc.end();
      } else {
        const dataArray = Array.isArray(exportData.data) ? exportData.data : (exportData.data?.byBeneficiary || []);
        const csvContent = 'Reference,Society,Donneur,Amount_DT,Status,Date\n' + 
          dataArray.map((item: any) => 
            `${item.reference || item.beneficiaryName || 'N/A'},${item.society || 'N/A'},${item.donneurOrdre || 'N/A'},${item.totalAmount || item.totalAmount || 0},${item.status || 'N/A'},${item.dateInjected || new Date().toISOString().split('T')[0]}`
          ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rapport_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      }
      console.log('✅ FinanceService: Export completed successfully');
    } catch (error) {
      console.error('❌ FinanceService: Export failed:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  }

  async updateRecoveryInfo(id: string, data: any, user: User) {
    // EXACT SPEC: Only Finance and Super Admin can update recovery
    if (!['FINANCE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only Finance service can update recovery information');
    }
    
    try {
      const updateData: any = {};
      
      // EXACT SPEC: Demande de récupération: Oui/Non + date
      if (data.demandeRecuperation !== undefined) {
        updateData.demandeRecuperation = data.demandeRecuperation;
        if (data.demandeRecuperation) {
          updateData.dateDemandeRecuperation = data.dateDemandeRecuperation 
            ? new Date(data.dateDemandeRecuperation) 
            : new Date();
        } else {
          updateData.dateDemandeRecuperation = null;
        }
      }
      
      // EXACT SPEC: Montant récupéré: Oui/Non + date
      if (data.montantRecupere !== undefined) {
        updateData.montantRecupere = data.montantRecupere;
        if (data.montantRecupere) {
          updateData.dateMontantRecupere = data.dateMontantRecupere 
            ? new Date(data.dateMontantRecupere) 
            : new Date();
        } else {
          updateData.dateMontantRecupere = null;
        }
      }
      
      // EXACT SPEC: Motif/Observation (free field)
      if (data.motifObservation !== undefined) {
        updateData.motifObservation = data.motifObservation;
      }
      
      const ordreVirement = await this.prisma.ordreVirement.update({
        where: { id },
        data: updateData,
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        }
      });
      
      await this.logAuditAction('UPDATE_RECOVERY_INFO', {
        userId: user.id,
        ordreVirementId: id,
        changes: updateData
      });
      
      return {
        success: true,
        message: 'Informations de récupération mises à jour',
        ordreVirement
      };
    } catch (error) {
      console.error('Error updating recovery info:', error);
      throw new BadRequestException('Failed to update recovery information');
    }
  }

  async createManualOV(data: any, user: User) {
    if (!['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only Chef d\'équipe and Super Admin can create manual OV');
    }
    
    try {
      // Create manual OV without bordereau link
      const ordreVirement = await this.prisma.ordreVirement.create({
        data: {
          reference: data.reference,
          donneurOrdreId: data.donneurOrdreId,
          bordereauId: null, // Manual entry not linked to bordereau
          utilisateurSante: user.id,
          montantTotal: data.montantTotal,
          nombreAdherents: data.nombreAdherents,
          etatVirement: 'NON_EXECUTE',
          commentaire: 'Entrée manuelle créée par Chef d\'équipe'
        },
        include: {
          donneurOrdre: true
        }
      });
      
      await this.logAuditAction('CREATE_MANUAL_OV', {
        userId: user.id,
        ordreVirementId: ordreVirement.id,
        reference: data.reference
      });
      
      return {
        success: true,
        message: 'Ordre de virement manuel créé avec succès',
        ordreVirement
      };
    } catch (error) {
      console.error('Error creating manual OV:', error);
      throw new BadRequestException('Failed to create manual OV');
    }
  }

  async reinjectOV(id: string, user: User) {
    // EXACT SPEC: Only Chef d'équipe and Super Admin
    if (!['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only Chef d\'équipe and Super Admin can reinject OV');
    }
    
    try {
      const ordreVirement = await this.prisma.ordreVirement.findUnique({
        where: { id },
        include: { bordereau: true }
      });
      
      if (!ordreVirement) {
        throw new NotFoundException('Ordre de virement not found');
      }
      
      // EXACT SPEC: Only if status is REJETE
      if (ordreVirement.etatVirement !== 'REJETE') {
        throw new BadRequestException('Only rejected OV can be reinjected');
      }
      
      // EXACT SPEC: Update dateCreation (injection date)
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id },
        data: {
          etatVirement: 'NON_EXECUTE',
          dateCreation: new Date(), // Date injection updated
          dateTraitement: null,
          dateEtatFinal: null,
          commentaire: `Réinjection effectuée par ${user.fullName} le ${new Date().toLocaleDateString('fr-FR')}`
        },
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        }
      });
      
      // Notify Finance service
      if (updatedOV.bordereauId) {
        await this.notifyFinanceTeam(updatedOV.bordereauId, `OV ${updatedOV.reference} réinjecté`, user);
      }
      
      await this.logAuditAction('REINJECT_OV', {
        userId: user.id,
        ordreVirementId: id,
        previousStatus: 'REJETE',
        newStatus: 'NON_EXECUTE'
      });
      
      return {
        success: true,
        message: 'Ordre de virement réinjecté avec succès',
        ordreVirement: updatedOV
      };
    } catch (error) {
      console.error('Error reinjecting OV:', error);
      throw new BadRequestException('Failed to reinject OV');
    }
  }

  async getFinanceDashboardWithFilters(filters: {
    compagnie?: string;
    client?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: User) {
    this.checkFinanceRole(user);
    
    try {
      const where: any = {};
      
      if (filters.compagnie || filters.client) {
        where.bordereau = {};
        if (filters.compagnie || filters.client) {
          where.bordereau.client = {
            name: {
              contains: filters.compagnie || filters.client,
              mode: 'insensitive'
            }
          };
        }
      }
      
      if (filters.dateFrom || filters.dateTo) {
        where.dateCreation = {};
        if (filters.dateFrom) where.dateCreation.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.dateCreation.lte = new Date(filters.dateTo);
      }
      
      const ordresVirement = await this.prisma.ordreVirement.findMany({
        where,
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        },
        orderBy: { dateCreation: 'desc' },
        take: 50
      });
      
      const stats = {
        totalOrdres: ordresVirement.length,
        montantTotal: ordresVirement.reduce((sum, ov) => sum + ov.montantTotal, 0),
        parStatut: ordresVirement.reduce((acc, ov) => {
          acc[ov.etatVirement] = (acc[ov.etatVirement] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        demandesRecuperation: ordresVirement.filter(ov => ov.demandeRecuperation).length,
        montantsRecuperes: ordresVirement.filter(ov => ov.montantRecupere).length
      };
      
      return {
        ordresVirement: ordresVirement.map(ov => ({
          id: ov.id,
          reference: ov.reference,
          client: ov.bordereau?.client?.name || 'Entrée manuelle',
          montant: ov.montantTotal,
          statut: ov.etatVirement,
          dateCreation: ov.dateCreation,
          dateTraitement: ov.dateTraitement,
          demandeRecuperation: ov.demandeRecuperation,
          dateDemandeRecuperation: ov.dateDemandeRecuperation,
          montantRecupere: ov.montantRecupere,
          dateMontantRecupere: ov.dateMontantRecupere,
          motifObservation: ov.motifObservation
        })),
        stats
      };
    } catch (error) {
      console.error('Error fetching finance dashboard:', error);
      throw new BadRequestException('Failed to fetch dashboard data');
    }
  }

  async getBordereauxTraites(filters: any, user: User) {
    this.checkFinanceRole(user);
    
    try {
      const where: any = {
        statut: 'TRAITE' // EXACT: Only TRAITÉ bordereaux
      };
      
      // Apply filters
      if (filters.compagnie || filters.client) {
        where.client = {
          name: {
            contains: filters.compagnie || filters.client,
            mode: 'insensitive'
          }
        };
      }
      
      if (filters.dateFrom || filters.dateTo) {
        where.dateCloture = {};
        if (filters.dateFrom) where.dateCloture.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.dateCloture.lte = new Date(filters.dateTo);
      }
      
      const bordereaux = await this.prisma.bordereau.findMany({
        where,
        include: {
          client: true,
          ordresVirement: {
            include: {
              donneurOrdre: true
            }
          }
        },
        orderBy: { dateCloture: 'desc' }
      });
      
      return bordereaux.map(b => {
        const ov = b.ordresVirement[0];
        return {
          id: ov?.id || b.id,
          clientSociete: b.client.name,
          referenceOV: ov?.reference || null,
          referenceBordereau: b.reference,
          montantBordereau: ov?.montantTotal || 0,
          dateFinalisationBordereau: b.dateCloture,
          dateInjection: ov?.dateCreation || null,
          statutVirement: ov?.etatVirement || 'NON_EXECUTE',
          dateTraitementVirement: ov?.dateTraitement || null,
          motifObservation: ov?.motifObservation || null,
          demandeRecuperation: ov?.demandeRecuperation || false,
          dateDemandeRecuperation: ov?.dateDemandeRecuperation || null,
          montantRecupere: ov?.montantRecupere || false,
          dateMontantRecupere: ov?.dateMontantRecupere || null
        };
      });
    } catch (error) {
      console.error('Error fetching bordereaux traités:', error);
      throw new BadRequestException('Failed to fetch bordereaux traités');
    }
  }

  async updateBordereauTraite(id: string, data: any, user: User) {
    // EXACT SPEC: Only Finance and Super Admin
    if (!['FINANCE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only Finance service can update bordereau traité');
    }
    
    try {
      // Find bordereau
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id },
        include: {
          ordresVirement: true,
          client: true
        }
      });
      
      if (!bordereau) {
        throw new NotFoundException('Bordereau not found');
      }
      
      if (bordereau.statut !== 'TRAITE') {
        throw new BadRequestException('Only TRAITÉ bordereaux can be updated in Finance module');
      }
      
      // Find or create OrdreVirement for this bordereau
      let ordreVirement = bordereau.ordresVirement[0];
      
      if (!ordreVirement) {
        // Create OV if doesn't exist
        const donneurs = await this.prisma.donneurOrdre.findMany({ where: { statut: 'ACTIF' }, take: 1 });
        const donneurId = donneurs[0]?.id;
        
        if (!donneurId) {
          throw new BadRequestException('No active donneur d\'ordre found');
        }
        
        const bulletinsSoin = await this.prisma.bulletinSoin.findMany({
          where: { bordereauId: id },
          select: { montant: true }
        });
        const actualAmount = bulletinsSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0);
        
        ordreVirement = await this.prisma.ordreVirement.create({
          data: {
            reference: `OV-${bordereau.reference}`,
            donneurOrdreId: donneurId,
            bordereauId: id,
            utilisateurSante: user.id,
            montantTotal: actualAmount,
            nombreAdherents: bordereau.nombreBS,
            etatVirement: 'NON_EXECUTE'
          }
        });
      }
      
      // Update OrdreVirement with new data
      const updateData: any = {};
      
      if (data.statutVirement) {
        updateData.etatVirement = data.statutVirement;
        updateData.utilisateurFinance = user.id;
        updateData.dateTraitement = new Date();
        
        if (['EXECUTE', 'REJETE', 'BLOQUE'].includes(data.statutVirement)) {
          updateData.dateEtatFinal = new Date();
        }
      }
      
      if (data.dateTraitementVirement) {
        updateData.dateTraitement = new Date(data.dateTraitementVirement);
      }
      
      if (data.motifObservation !== undefined) {
        updateData.motifObservation = data.motifObservation;
      }
      
      if (data.demandeRecuperation !== undefined) {
        updateData.demandeRecuperation = data.demandeRecuperation;
        if (data.demandeRecuperation) {
          updateData.dateDemandeRecuperation = data.dateDemandeRecuperation 
            ? new Date(data.dateDemandeRecuperation) 
            : new Date();
        } else {
          updateData.dateDemandeRecuperation = null;
        }
      }
      
      if (data.montantRecupere !== undefined) {
        updateData.montantRecupere = data.montantRecupere;
        if (data.montantRecupere) {
          updateData.dateMontantRecupere = data.dateMontantRecupere 
            ? new Date(data.dateMontantRecupere) 
            : new Date();
        } else {
          updateData.dateMontantRecupere = null;
        }
      }
      
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id: ordreVirement.id },
        data: updateData,
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        }
      });
      
      await this.logAuditAction('UPDATE_BORDEREAU_TRAITE', {
        userId: user.id,
        bordereauId: id,
        ordreVirementId: updatedOV.id,
        changes: updateData
      });
      
      return {
        success: true,
        message: 'Bordereau traité mis à jour avec succès',
        bordereau: {
          id: bordereau.id,
          clientSociete: bordereau.client.name,
          referenceOV: updatedOV.reference,
          referenceBordereau: bordereau.reference,
          montantBordereau: updatedOV.montantTotal,
          dateFinalisationBordereau: bordereau.dateCloture,
          dateInjection: updatedOV.dateCreation,
          statutVirement: updatedOV.etatVirement,
          dateTraitementVirement: updatedOV.dateTraitement,
          motifObservation: updatedOV.motifObservation,
          demandeRecuperation: updatedOV.demandeRecuperation,
          dateDemandeRecuperation: updatedOV.dateDemandeRecuperation,
          montantRecupere: updatedOV.montantRecupere,
          dateMontantRecupere: updatedOV.dateMontantRecupere
        }
      };
    } catch (error) {
      console.error('Error updating bordereau traité:', error);
      throw new BadRequestException('Failed to update bordereau traité');
    }
  }

  // === OV VALIDATION METHODS ===
  async getPendingValidationOVs(user: User) {
    console.log('🔍 getPendingValidationOVs called for user:', user?.role);
    
    try {
      console.log('🔍 Executing database query...');
      const pendingOVs = await this.prisma.ordreVirement.findMany({
        where: {
          validationStatus: 'EN_ATTENTE_VALIDATION'
        },
        include: {
          donneurOrdre: true,
          bordereau: { include: { client: true } }
        },
        orderBy: { dateCreation: 'asc' }
      });
      
      console.log(`🔍 Database query successful, found ${pendingOVs.length} OVs`);
      
      const result = pendingOVs.map((ov, index) => {
        console.log(`🔍 Processing OV ${index + 1}:`, {
          id: ov.id,
          reference: ov.reference,
          hasClient: !!ov.bordereau?.client,
          hasDonneur: !!ov.donneurOrdre
        });
        
        return {
          id: ov.id,
          reference: ov.reference,
          client: ov.bordereau?.client?.name || 'Entrée manuelle',
          donneurOrdre: ov.donneurOrdre?.nom || 'N/A',
          montantTotal: ov.montantTotal,
          nombreAdherents: ov.nombreAdherents,
          dateCreation: ov.dateCreation,
          utilisateurSante: ov.utilisateurSante
        };
      });
      
      console.log(`✅ Successfully returning ${result.length} pending OVs`);
      return result;
    } catch (error) {
      console.error('❌ Error in getPendingValidationOVs:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw new BadRequestException('Failed to fetch pending validation OVs: ' + error.message);
    }
  }

  async validateOV(id: string, approved: boolean, comment: string | undefined, user: User) {
    // EXACT SPEC: Only RESPONSABLE_DEPARTEMENT and SUPER_ADMIN can validate
    if (!['RESPONSABLE_DEPARTEMENT', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only RESPONSABLE_DEPARTEMENT and SUPER_ADMIN can validate OVs');
    }
    
    try {
      const ov = await this.prisma.ordreVirement.findUnique({
        where: { id },
        include: { bordereau: { include: { client: true } } }
      });
      
      if (!ov) {
        throw new NotFoundException('Ordre de virement not found');
      }
      
      const newStatus = approved ? 'VALIDE' : 'REJETE_VALIDATION';
      
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id },
        data: {
          validationStatus: newStatus,
          validatedBy: user.id,
          validatedAt: new Date(),
          validationComment: comment
        },
        include: {
          donneurOrdre: true,
          bordereau: { include: { client: true } }
        }
      });
      
      // Notify relevant users
      if (approved) {
        await this.notifyChefEquipeValidation(updatedOV, user);
      } else {
        await this.notifyRejectedValidation(updatedOV, user, comment);
      }
      
      await this.logAuditAction('VALIDATE_OV', {
        userId: user.id,
        ordreVirementId: id,
        approved,
        comment
      });
      
      return {
        success: true,
        message: approved ? 'OV validé avec succès' : 'OV rejeté',
        ordreVirement: updatedOV
      };
    } catch (error) {
      console.error('Error validating OV:', error);
      throw new BadRequestException('Failed to validate OV');
    }
  }

  private async notifyChefEquipeValidation(ov: any, validator: User) {
    try {
      const chefEquipeUsers = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true }
      });
      
      const notifications = chefEquipeUsers.map(chef => ({
        userId: chef.id,
        type: 'OV_VALIDATED',
        title: 'OV validé - Prêt pour traitement',
        message: `L'OV ${ov.reference} a été validé par ${validator.fullName} et est maintenant prêt pour traitement.`,
        data: {
          ordreVirementId: ov.id,
          reference: ov.reference,
          validatedBy: validator.fullName
        }
      }));
      
      await this.prisma.notification.createMany({ data: notifications });
    } catch (error) {
      console.error('Failed to notify chef equipe:', error);
    }
  }

  private async notifyRejectedValidation(ov: any, validator: User, comment?: string) {
    try {
      // Find the user who created the OV
      const creator = await this.prisma.user.findUnique({
        where: { id: ov.utilisateurSante }
      });
      
      if (creator) {
        await this.prisma.notification.create({
          data: {
            userId: creator.id,
            type: 'OV_REJECTED',
            title: 'OV rejeté lors de la validation',
            message: `L'OV ${ov.reference} a été rejeté par ${validator.fullName}. ${comment ? `Motif: ${comment}` : ''}`,
            data: {
              ordreVirementId: ov.id,
              reference: ov.reference,
              rejectedBy: validator.fullName,
              comment
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to notify OV creator:', error);
    }
  }

  async notifyResponsableEquipeForValidation(data: {
    ovId: string;
    reference: string;
    message: string;
    createdBy: string;
  }, user: User) {
    try {
      // Find all RESPONSABLE_DEPARTEMENT users
      const responsableUsers = await this.prisma.user.findMany({
        where: { 
          role: 'RESPONSABLE_DEPARTEMENT', 
          active: true 
        }
      });
      
      if (responsableUsers.length === 0) {
        console.log('No RESPONSABLE_DEPARTEMENT users found');
        return { notified: 0 };
      }
      
      // Create notifications for all RESPONSABLE_DEPARTEMENT users
      const notifications = responsableUsers.map(responsable => ({
        userId: responsable.id,
        type: 'OV_PENDING_VALIDATION',
        title: 'Nouvel OV à valider',
        message: `${data.message} par ${data.createdBy}`,
        data: {
          ordreVirementId: data.ovId,
          reference: data.reference,
          createdBy: data.createdBy
        }
      }));
      
      await this.prisma.notification.createMany({ data: notifications });
      
      await this.logAuditAction('NOTIFY_RESPONSABLE_EQUIPE', {
        userId: user.id,
        ordreVirementId: data.ovId,
        notifiedUsers: responsableUsers.length
      });
      
      console.log(`✅ Notified ${responsableUsers.length} RESPONSABLE_DEPARTEMENT users for OV ${data.reference}`);
      
      return {
        success: true,
        notified: responsableUsers.length,
        message: `${responsableUsers.length} responsable(s) de département notifié(s)`
      };
    } catch (error) {
      console.error('Failed to notify RESPONSABLE_EQUIPE:', error);
      throw new BadRequestException('Failed to send notifications');
    }
  }

  // EXACT SPEC: Automatic notification when bordereau becomes TRAITÉ
  async createOVFromBordereaux(bordereauIds: string[], donneurOrdreId: string, user: User) {
    this.checkFinanceRole(user);
    
    try {
      // Fetch bordereaux
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          id: { in: bordereauIds },
          statut: 'TRAITE'
        },
        include: { client: true }
      });
      
      if (bordereaux.length === 0) {
        throw new BadRequestException('No TRAITÉ bordereaux found');
      }
      
      // Check if any already have OVs
      const existingOVs = await this.prisma.ordreVirement.findMany({
        where: { bordereauId: { in: bordereauIds } }
      });
      
      if (existingOVs.length > 0) {
        throw new BadRequestException('Some bordereaux already have OVs');
      }
      
      // Create OV for each bordereau
      const createdOVs: any[] = [];
      
      for (const bordereau of bordereaux) {
        const reference = `OV-${bordereau.reference}`;
        const montantTotal = bordereau.nombreBS * 150; // Estimate
        
        const ov = await this.prisma.ordreVirement.create({
          data: {
            reference,
            donneurOrdreId,
            bordereauId: bordereau.id,
            utilisateurSante: user.id,
            montantTotal,
            nombreAdherents: bordereau.nombreBS,
            etatVirement: 'NON_EXECUTE',
            validationStatus: 'EN_ATTENTE_VALIDATION'
          },
          include: {
            bordereau: { include: { client: true } },
            donneurOrdre: true
          }
        });
        
        createdOVs.push(ov);
        
        // Notify RESPONSABLE_DEPARTEMENT
        await this.notifyResponsableEquipeForValidation({
          ovId: ov.id,
          reference: ov.reference,
          message: `Nouvel OV créé depuis bordereau ${bordereau.reference}`,
          createdBy: user.fullName
        }, user);
      }
      
      await this.logAuditAction('CREATE_OV_FROM_BORDEREAU', {
        userId: user.id,
        bordereauIds,
        createdOVs: createdOVs.map(ov => ov.id)
      });
      
      return {
        success: true,
        message: `${createdOVs.length} OV(s) créé(s) avec succès`,
        ordresVirement: createdOVs
      };
    } catch (error) {
      console.error('Error creating OV from bordereaux:', error);
      throw new BadRequestException('Failed to create OV from bordereaux: ' + error.message);
    }
  }

  async notifyFinanceOnBordereauTraite(bordereauId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });
      
      if (!bordereau || bordereau.statut !== 'TRAITE') {
        return { notified: 0 };
      }
      
      // Find all Finance and Super Admin users
      const financeUsers = await this.prisma.user.findMany({
        where: { 
          role: { in: ['FINANCE', 'SUPER_ADMIN'] }, 
          active: true 
        }
      });
      
      if (financeUsers.length === 0) {
        console.log('No Finance users found');
        return { notified: 0 };
      }
      
      // Create notifications
      const notifications = financeUsers.map(financeUser => ({
        userId: financeUser.id,
        type: 'BORDEREAU_TRAITE',
        title: 'Nouveau bordereau traité à traiter',
        message: `Le bordereau ${bordereau.reference} de ${bordereau.client.name} est maintenant en statut TRAITÉ et prêt pour le traitement financier.`,
        data: {
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          clientName: bordereau.client.name,
          nombreBS: bordereau.nombreBS
        }
      }));
      
      await this.prisma.notification.createMany({ data: notifications });
      
      await this.logAuditAction('NOTIFY_FINANCE_BORDEREAU_TRAITE', {
        bordereauId,
        notifiedUsers: financeUsers.length
      });
      
      console.log(`✅ Notified ${financeUsers.length} Finance users for bordereau ${bordereau.reference}`);
      
      return {
        success: true,
        notified: financeUsers.length
      };
    } catch (error) {
      console.error('Failed to notify Finance on bordereau traité:', error);
      return { notified: 0 };
    }
  }
}
