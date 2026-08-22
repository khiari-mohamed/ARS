import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAllSLAs, SLAColor } from '../utils/sla-calculator';

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
      { header: 'Date clôture (traitement)', key: 'dateCloture', width: 18 },
      { header: 'Date exécution virement', key: 'dateExecutionVirement', width: 20 },
      { header: 'Délai contractuel (j)', key: 'delaiReglement', width: 18 },
      { header: 'SLA Scan (j)', key: 'slaScanDays', width: 14 },
      { header: 'SLA Scan', key: 'slaScanStatus', width: 12 },
      { header: 'SLA Traitement (j)', key: 'slaTraitementDays', width: 16 },
      { header: 'SLA Traitement', key: 'slaTraitementStatus', width: 14 },
      { header: 'SLA Règlement BO (j)', key: 'slaReglementBODays', width: 18 },
      { header: 'SLA Règlement BO', key: 'slaReglementBOStatus', width: 16 },
      { header: 'SLA Règlement Finance (j)', key: 'slaReglementFinanceDays', width: 22 },
      { header: 'SLA Règlement Finance', key: 'slaReglementFinanceStatus', width: 18 },
      { header: 'Statut Virement', key: 'statutVirement', width: 20 },
      { header: 'Dernière MAJ', key: 'updatedAt', width: 16 },
      { header: 'Statut', key: 'statut', width: 18 },
    ];

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

    bordereaux.forEach((b: any, index) => {
      const sla = calculateAllSLAs({
        dateReception: b.dateReception,
        delaiReglement: b.delaiReglement ?? b.contract?.delaiReglement ?? 30,
        statut: b.statut,
        dateDebutScan: b.dateDebutScan,
        dateFinScan: b.dateFinScan,
        dateCloture: b.dateCloture,
        dateExecutionVirement: b.dateExecutionVirement,
        ordresVirement: b.ordresVirement,
      });

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
        dateCloture: b.dateCloture ? new Date(b.dateCloture) : null,
        dateExecutionVirement: sla.reglementBO.endDate,
        delaiReglement: b.delaiReglement ?? b.contract?.delaiReglement ?? 0,
        slaScanDays: sla.scan.daysElapsed,
        slaScanStatus: this.slaLabel(sla.scan.statusColor, sla.scan.applicable),
        slaTraitementDays: sla.traitement.daysElapsed,
        slaTraitementStatus: this.slaLabel(sla.traitement.statusColor, sla.traitement.applicable),
        slaReglementBODays: sla.reglementBO.daysElapsed,
        slaReglementBOStatus: this.slaLabel(sla.reglementBO.statusColor, sla.reglementBO.applicable),
        slaReglementFinanceDays: sla.reglementFinance.daysElapsed,
        slaReglementFinanceStatus: this.slaLabel(sla.reglementFinance.statusColor, sla.reglementFinance.applicable),
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

      ['dateReception', 'dateFinScan', 'dateCloture', 'dateExecutionVirement', 'updatedAt'].forEach((key) => {
        const cell = row.getCell(sheet.getColumn(key).number);
        if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
      });

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          if (!cell.fill) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
      }

      this.colorSLACell(row.getCell(sheet.getColumn('slaScanStatus').number), sla.scan.statusColor);
      this.colorSLACell(row.getCell(sheet.getColumn('slaTraitementStatus').number), sla.traitement.statusColor);
      this.colorSLACell(row.getCell(sheet.getColumn('slaReglementBOStatus').number), sla.reglementBO.statusColor);
      this.colorSLACell(
        row.getCell(sheet.getColumn('slaReglementFinanceStatus').number),
        sla.reglementFinance.statusColor,
      );

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

  private slaLabel(status: SLAColor | null, applicable: boolean): string {
    if (!applicable || !status) return '-';
    const map: Record<SLAColor, string> = {
      RED: 'En retard',
      ORANGE: 'À risque',
      GREEN: 'Respecté',
    };
    return map[status];
  }

  private colorSLACell(cell: ExcelJS.Cell, status: SLAColor | null): void {
    if (status === 'RED') cell.font = { color: { argb: 'FFC62828' }, bold: true };
    else if (status === 'ORANGE') cell.font = { color: { argb: 'FFF57C00' }, bold: true };
    else if (status === 'GREEN') cell.font = { color: { argb: 'FF2E7D32' }, bold: true };
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