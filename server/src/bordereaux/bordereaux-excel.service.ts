import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

type SLAStatus = 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'UNKNOWN';

@Injectable()
export class BordereauxExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async exportExcel(filters: any = {}): Promise<Buffer> {
    const where = this.buildWhereClause(filters);

    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        client: { select: { name: true } },
        currentHandler: { select: { fullName: true, role: true } },
        contract: {
          select: {
            delaiReglement: true,
            assignedManager: { select: { fullName: true } },
            teamLeader: { select: { fullName: true } },
          },
        },
        BulletinSoin: { select: { id: true, etat: true } },
        ordresVirement: {
          select: { etatVirement: true, dateEtatFinal: true, dateTraitement: true },
          orderBy: { dateEtatFinal: 'desc' },
          take: 1,
        },
      },
      orderBy: { dateReception: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ARS Tunisie';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bordereaux', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Client / Prestataire', key: 'client', width: 26 },
      { header: 'Référence Bordereau', key: 'reference', width: 20 },
      { header: 'Gestionnaire', key: 'gestionnaire', width: 24 },
      { header: 'Date réception BO', key: 'dateReception', width: 16 },
      { header: 'Bulletins de soins', key: 'nombreBS', width: 14 },
      { header: 'BS Traités', key: 'bsTraites', width: 12 },
      { header: 'Date fin Scan', key: 'dateFinScan', width: 16 },
      { header: 'Délai contractuel (j)', key: 'delaiReglement', width: 18 },
      { header: 'Durée de traitement', key: 'dureeTraitement', width: 18 },
      { header: 'Durée de règlement', key: 'dureeReglement', width: 18 },
      { header: 'SLA', key: 'sla', width: 14 },
      { header: 'Statut Virement', key: 'statutVirement', width: 20 },
      { header: 'Dernière MAJ', key: 'updatedAt', width: 16 },
      { header: 'Statut', key: 'statut', width: 18 },
    ];

    // --- Header styling (ARS brand red) ---
    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD62121' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB71C1C' } },
        bottom: { style: 'thin', color: { argb: 'FFB71C1C' } },
        left: { style: 'thin', color: { argb: 'FFB71C1C' } },
        right: { style: 'thin', color: { argb: 'FFB71C1C' } },
      };
    });

    // --- Data rows ---
    bordereaux.forEach((b: any, index) => {
      const slaStatus = this.calculateSLAStatus(b);
      const bsTraites = (b.BulletinSoin || []).filter((bs: any) => bs.etat === 'VALIDATED').length;
      const virement = b.ordresVirement?.[0];

      const row = sheet.addRow({
        client: b.client?.name || 'N/A',
        reference: b.reference,
        gestionnaire: this.resolveGestionnaire(b),
        dateReception: b.dateReception ? new Date(b.dateReception) : null,
        nombreBS: b.nombreBS ?? (b.BulletinSoin?.length || 0),
        bsTraites,
        dateFinScan: b.dateFinScan ? new Date(b.dateFinScan) : null,
        delaiReglement: b.delaiReglement ?? b.contract?.delaiReglement ?? 0,
        dureeTraitement: b.dureeTraitement ?? null,
        dureeReglement: b.dureeReglement ?? null,
        sla: this.slaLabel(slaStatus),
        statutVirement: this.virementLabel(virement),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : null,
        statut: b.statut,
      });

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 3 ? 'left' : 'center',
        };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      });

      // Date formatting
      ['dateReception', 'dateFinScan', 'updatedAt'].forEach((key) => {
        const cell = row.getCell(sheet.getColumn(key).number);
        if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
      });

      // Zebra striping
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          if (!cell.fill) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
      }

      // SLA color coding
      const slaCell = row.getCell(sheet.getColumn('sla').number);
      if (slaStatus === 'OVERDUE') slaCell.font = { color: { argb: 'FFC62828' }, bold: true };
      else if (slaStatus === 'AT_RISK') slaCell.font = { color: { argb: 'FFF57C00' }, bold: true };
      else if (slaStatus === 'ON_TIME') slaCell.font = { color: { argb: 'FF2E7D32' }, bold: true };

      // Durée de traitement color coding (based on backend-computed status)
      const dtCell = row.getCell(sheet.getColumn('dureeTraitement').number);
      if (b.dureeTraitement !== null && b.dureeTraitement !== undefined) {
        dtCell.font = { color: { argb: b.dureeTraitementStatus === 'GREEN' ? 'FF2E7D32' : 'FFC62828' } };
        if (b.dureeTraitementWarning) dtCell.note = b.dureeTraitementWarning;
      }

      // Durée de règlement color coding
      const drCell = row.getCell(sheet.getColumn('dureeReglement').number);
      if (b.dureeReglement !== null && b.dureeReglement !== undefined) {
        drCell.font = { color: { argb: b.dureeReglementStatus === 'GREEN' ? 'FF2E7D32' : 'FFC62828' } };
      }

      // Statut color coding
      const statutCell = row.getCell(sheet.getColumn('statut').number);
      if (['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)) {
        statutCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
      }
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private resolveGestionnaire(b: any): string {
    if (b.contract?.assignedManager?.fullName) return b.contract.assignedManager.fullName;
    if (b.currentHandler?.fullName) return b.currentHandler.fullName;
    return 'Non assigné';
  }

  private virementLabel(virement: any): string {
    if (!virement) return 'Pas de virement';
    const map: Record<string, string> = {
      EXECUTE: 'Exécuté',
      REJETE: 'Rejeté',
      EN_COURS: 'En cours',
      EN_COURS_VALIDATION: 'En attente validation',
    };
    return map[virement.etatVirement] || virement.etatVirement || 'En attente';
  }

  private slaLabel(status: SLAStatus): string {
    const map: Record<SLAStatus, string> = {
      OVERDUE: 'En retard',
      AT_RISK: 'À risque',
      ON_TIME: 'Respecté',
      UNKNOWN: '-',
    };
    return map[status];
  }

  // Mirrors calculateSLAStatus() in BordereauxDashboard.tsx — freeze on virement execution
  private calculateSLAStatus(b: any): SLAStatus {
    const delai = b.delaiReglement ?? b.contract?.delaiReglement;
    if (!b.dateReception || !delai) return 'UNKNOWN';

    const today = new Date();
    const reception = new Date(b.dateReception);

    const isFrozen = ['VIREMENT_EXECUTE', 'PAYE', 'CLOTURE'].includes(b.statut);
    const freezeDate = b.dateExecutionVirement || b.dateCloture;
    const effectiveEndDate = isFrozen && freezeDate ? new Date(freezeDate) : today;

    const daysElapsed = (effectiveEndDate.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24);
    const percentElapsed = (daysElapsed / delai) * 100;

    if (percentElapsed > 100) return 'OVERDUE';
    if (percentElapsed > 80) return 'AT_RISK';
    return 'ON_TIME';
  }

  private buildWhereClause(filters: any): any {
    const where: any = {
      archived: filters.archived === true || filters.archived === 'true',
    };

    if (filters.dateStart || filters.dateEnd) {
      where.dateReception = {};
      if (filters.dateStart) where.dateReception.gte = new Date(filters.dateStart);
      if (filters.dateEnd) where.dateReception.lte = new Date(filters.dateEnd);
    }

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.gestionnaireId) where.assignedToUserId = filters.gestionnaireId;

    if (filters.gestionnaireSeniorId) {
      where.contract = { ...(where.contract || {}), assignedManagerId: filters.gestionnaireSeniorId };
    }
    if (filters.chefEquipeId) {
      where.contract = { ...(where.contract || {}), teamLeaderId: filters.chefEquipeId };
    }
    if (filters.reference) {
      where.reference = { contains: filters.reference, mode: 'insensitive' };
    }
    if (filters.statut) {
      where.statut = filters.statut;
    }

    return where;
  }
}