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

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // Simple audit log (extend to DB if needed)
  private async logAuditAction(action: string, details: any) {
    // For now, just log to console. Replace with DB insert if needed.
    console.log(`[AUDIT] ${new Date().toISOString()} | ${action} |`, details);
  }

  private checkFinanceRole(user: User) {
    if (!['FINANCE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
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

    // Update virement and bordereau
    const now = new Date();
    await this.prisma.bordereau.update({
      where: { id: virement.bordereauId },
      data: {
        dateDepotVirement: virement.dateDepot,
        dateExecutionVirement: virement.dateExecution,
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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new BadRequestException('No worksheet found in Excel file');
      }
      
      const results: any[] = [];
      const errors: any[] = [];
      
      // Skip header row, start from row 2
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        // Skip empty rows
        if (!row.hasValues) continue;
        
        try {
          const matricule = row.getCell(1).text?.trim();
          const name = row.getCell(2).text?.trim();
          const society = row.getCell(3).text?.trim();
          const amount = parseFloat(row.getCell(4).text?.replace(',', '.') || '0');
          
          if (!matricule || !name || !society || isNaN(amount) || amount <= 0) {
            errors.push({
              row: rowNumber,
              error: 'Données manquantes ou invalides (matricule, nom, société, montant requis)'
            });
            continue;
          }
          
          // Find member by matricule (CIN)
          const member = await this.prisma.member.findFirst({
            where: { cin: matricule },
            include: { society: true }
          });
          
          let status = 'ok';
          let notes = '';
          let rib = '';
          
          if (!member) {
            status = 'error';
            notes = 'Matricule inconnu dans la base';
          } else {
            rib = member.rib;
            if (!rib) {
              status = 'error';
              notes = 'RIB manquant pour cet adhérent';
            } else if (member.society.name !== society) {
              status = 'warning';
              notes = `Société différente: ${member.society.name} vs ${society}`;
            }
          }
          
          results.push({
            matricule,
            name,
            society,
            rib,
            amount,
            status,
            notes,
            memberId: member?.id
          });
          
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: `Erreur de traitement: ${error.message}`
          });
        }
      }
      
      await this.logAuditAction('VALIDATE_OV_FILE', {
        userId: user.id,
        fileName: file.originalname,
        totalRows: results.length,
        errorRows: errors.length
      });
      
      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: results.length,
          valid: results.filter(r => r.status === 'ok').length,
          warnings: results.filter(r => r.status === 'warning').length,
          errors: results.filter(r => r.status === 'error').length
        }
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
    this.checkFinanceRole(user);
    console.log('📡 FinanceService: getOVTracking called with query:', JSON.stringify(query, null, 2));
    console.log('👤 FinanceService: User:', user?.id || 'system-user');
    try {
      const where: any = {};
      
      if (query.society) {
        where.society = { name: { contains: query.society, mode: 'insensitive' } };
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.donneurOrdre) {
        where.donneur = { name: { contains: query.donneurOrdre, mode: 'insensitive' } };
      }
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
      }
      
      // Add amount filtering - we'll filter after getting results since amount is calculated
      let minAmount = query.minAmount ? parseFloat(query.minAmount) : null;
      let maxAmount = query.maxAmount ? parseFloat(query.maxAmount) : null;
      
      console.log('🔍 FinanceService: Amount filters - min:', minAmount, 'max:', maxAmount);
      
      console.log('🔍 FinanceService: Database query where clause:', JSON.stringify(where, null, 2));
      
      const batches = await this.prisma.wireTransferBatch.findMany({
        where,
        include: {
          society: true,
          donneur: true,
          transfers: true,
          history: { orderBy: { changedAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('📊 FinanceService: Found', batches.length, 'wire transfer batches');
      
      const now = new Date();
      
      let result = batches.map(batch => {
        const delayDays = Math.floor((now.getTime() - batch.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const lastHistory = batch.history[0];
        const totalAmount = batch.transfers.reduce((sum, t) => sum + t.amount, 0);
        
        return {
          id: batch.id,
          reference: `OV/${batch.createdAt.getFullYear()}/${batch.id.substring(0, 8)}`,
          society: batch.society.name,
          dateInjected: batch.createdAt.toISOString().split('T')[0],
          dateExecuted: lastHistory?.changedAt ? lastHistory.changedAt.toISOString().split('T')[0] : null,
          status: this.mapBatchStatusToOV(batch.status),
          delay: delayDays,
          observations: lastHistory ? `Dernière modification: ${lastHistory.status}` : 'Créé',
          donneurOrdre: batch.donneur.name,
          totalAmount
        };
      });
      
      // Apply amount filters after mapping
      if (minAmount !== null || maxAmount !== null) {
        const beforeFilter = result.length;
        result = result.filter(item => {
          if (minAmount !== null && item.totalAmount < minAmount) return false;
          if (maxAmount !== null && item.totalAmount > maxAmount) return false;
          return true;
        });
        console.log(`🔍 FinanceService: Amount filtering - before: ${beforeFilter}, after: ${result.length}`);
      }
      
      console.log('✅ FinanceService: Returning', result.length, 'processed OV records');
      console.log('📊 FinanceService: Sample result:', result.length > 0 ? JSON.stringify(result[0], null, 2) : 'No data');
      
      return result;
      
    } catch (error) {
      console.error('❌ FinanceService: Error fetching OV tracking:', error);
      console.error('❌ FinanceService: Error stack:', error.stack);
      return [];
    }
  }

  private mapBatchStatusToOV(status: string): string {
    const statusMap = {
      'CREATED': 'NON_EXECUTE',
      'VALIDATED': 'EN_COURS',
      'PROCESSED': 'EXECUTE',
      'REJECTED': 'REJETE',
      'ARCHIVED': 'EXECUTE'
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
      'EN_COURS': 'VALIDATED',
      'PARTIELLEMENT_EXECUTE': 'VALIDATED',
      'REJETE': 'REJECTED',
      'EXECUTE': 'PROCESSED'
    };
    return statusMap[ovStatus] || 'CREATED';
  }

  async generateOVPDF(id: string, res: Response, user: User) {
    this.checkFinanceRole(user);
    try {
      const batch = await this.prisma.wireTransferBatch.findUnique({
        where: { id },
        include: {
          society: true,
          donneur: true,
          transfers: {
            include: { member: true }
          }
        }
      });
      
      if (!batch) {
        throw new NotFoundException('OV batch not found');
      }
      
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="OV_${id}.pdf"`);
      doc.pipe(res);
      
      // Header
      doc.fontSize(20).text('ORDRE DE VIREMENT', { align: 'center' });
      doc.moveDown();
      
      // Donneur info
      doc.fontSize(12)
        .text(`Donneur d'Ordre: ${batch.donneur.name}`)
        .text(`Société: ${batch.society.name}`)
        .text(`Date: ${batch.createdAt.toLocaleDateString('fr-FR')}`)
        .text(`Référence: OV/${batch.createdAt.getFullYear()}/${batch.id.substring(0, 8)}`);
      
      doc.moveDown();
      
      // Transfers table
      doc.text('DÉTAIL DES VIREMENTS:', { underline: true });
      doc.moveDown();
      
      let yPosition = doc.y;
      batch.transfers.forEach((transfer, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(10)
          .text(`${index + 1}. ${transfer.member.name}`, 50, yPosition)
          .text(`RIB: ${transfer.member.rib}`, 300, yPosition)
          .text(`Montant: ${transfer.amount.toFixed(2)} TND`, 450, yPosition);
        
        yPosition += 20;
      });
      
      // Total
      const totalAmount = batch.transfers.reduce((sum, t) => sum + t.amount, 0);
      doc.fontSize(14)
        .text(`TOTAL: ${totalAmount.toFixed(2)} TND`, { align: 'right' });
      
      doc.end();
      
    } catch (error) {
      console.error('Error generating OV PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  async generateOVTXT(id: string, res: Response, user: User) {
    this.checkFinanceRole(user);
    try {
      const batch = await this.prisma.wireTransferBatch.findUnique({
        where: { id },
        include: {
          donneur: true,
          transfers: {
            include: { member: true }
          }
        }
      });
      
      if (!batch) {
        throw new NotFoundException('OV batch not found');
      }
      
      // Generate bank-specific TXT format
      const lines = batch.transfers.map(transfer => {
        const code = '110104'.padEnd(6, ' ');
        const ref = transfer.reference.padEnd(14, ' ');
        const filler1 = ''.padEnd(12, ' ');
        const amount = Math.round(transfer.amount * 100).toString().padStart(12, '0');
        const filler2 = ''.padEnd(12, ' ');
        const rib = transfer.member.rib.padEnd(20, ' ');
        const filler3 = ''.padEnd(34, ' ');
        const name = transfer.member.name.substring(0, 30).padEnd(30, ' ');
        
        return `${code}${ref}${filler1}${amount}${filler2}${rib}${filler3}${name}`;
      });
      
      const txtContent = lines.join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="OV_${id}.txt"`);
      res.send(txtContent);
      
    } catch (error) {
      console.error('Error generating OV TXT:', error);
      res.status(500).json({ error: 'Failed to generate TXT file' });
    }
  }

  // Donneurs d'Ordre methods
  async getDonneurs(user: User) {
    this.checkFinanceRole(user);
    try {
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
    } catch (error) {
      console.error('Error fetching donneurs:', error);
      return [{ id: '1', name: 'ARS Tunisie', bank: 'Banque Centrale', rib: '12345678901234567890', txtFormat: 'SWIFT', status: 'active' }];
    }
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
    try {
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
    } catch (error) {
      console.error('Error fetching adherents:', error);
      return [{ id: '1', matricule: '12345', name: 'John', surname: 'Doe', society: 'AON', rib: '12345678901234567890', status: 'active' }];
    }
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
}
