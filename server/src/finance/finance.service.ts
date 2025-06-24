import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVirementDto } from './dto/create-virement.dto';
import { ConfirmVirementDto } from './dto/confirm-virement.dto';
import { SearchVirementDto } from './dto/search-virement.dto';
import { Virement, User } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

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
}
