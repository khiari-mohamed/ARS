import * as ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import { ExcelService } from './excel.service';
import {
  ALIGNMENTS,
  BORDERS,
  COLORS,
  FILLS,
  FONTS,
  getStatusColor,
  getStatusLabel,
  getModeLabel,
  getSlaStatusColor,
  getSlaStatusLabel,
  makeFill,
} from './styles.constants';

// ─── Column definitions ────────────────────────────────────────────────────────
const CLIENT_COLUMNS = [
  { key: 'index',            label: '#',                    width: 6  },
  { key: 'name',             label: 'Nom du Client',        width: 32 },
  { key: 'compagnie',        label: "Compagnie d'Assurance", width: 28 },
  { key: 'status',           label: 'Statut',               width: 16 },
  { key: 'email',            label: 'Email',                width: 28 },
  { key: 'phone',            label: 'Téléphone',            width: 18 },
  { key: 'address',          label: 'Adresse',              width: 32 },
  { key: 'reglementDelay',   label: 'Délai Règlement (j)',  width: 20 },
  { key: 'reclamationDelay', label: 'Délai Réclamation (h)', width: 22 },
  { key: 'modeRecuperation', label: 'Mode Récupération',    width: 22 },
  { key: 'chargeCompte',     label: "Chef d'Équipe",        width: 24 },
  { key: 'gestionnaires',    label: 'Gestionnaires',        width: 30 },
  { key: 'bordereaux',       label: 'Nb Bordereaux',        width: 16 },
  { key: 'contrats',         label: 'Nb Contrats',          width: 14 },
  { key: 'reclamations',     label: 'Nb Réclamations',      width: 18 },
  { key: 'adherents',        label: 'Nb Adhérents',         width: 14 },
  { key: 'slaStatus',        label: 'Statut SLA',           width: 18 },
  { key: 'createdAt',        label: 'Créé le',              width: 16 },
  { key: 'updatedAt',        label: 'Modifié le',           width: 16 },
];

// Row where data starts (after banner + header)
const DATA_START_ROW = 5;
const HEADER_ROW     = 4;
const COL_COUNT      = CLIENT_COLUMNS.length;

@Injectable()
export class ClientExcelGenerator extends ExcelService {

  // ─── Public entry point ──────────────────────────────────────────────────────
  async generateClientReport(clients: any[]): Promise<Buffer> {
    const wb = this.createWorkbook('ARS System', 'ARS');

    this._addClientListSheet(wb, clients);
    this._addStatisticsSheet(wb, clients);
    this._addSlaAnalysisSheet(wb, clients);
    this._addRawDataSheet(wb, clients);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 1 — Liste des Clients
  // ══════════════════════════════════════════════════════════════════════════════
  private _addClientListSheet(wb: ExcelJS.Workbook, clients: any[]): void {
    const sheet = wb.addWorksheet('📋 Clients', {
      properties:  { tabColor: { argb: COLORS.TAB_CLIENTS } },
      pageSetup:   { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    // ── Banner ──
    this.addHeaderBanner(
      sheet,
      '   📋  LISTE DES CLIENTS',
      `   Base de données clients — ${clients.length} enregistrement(s) — Exporté le ${new Date().toLocaleDateString('fr-FR')}`,
      COL_COUNT,
      COLORS.PRIMARY,
    );

    // ── Column widths + headers ──
    CLIENT_COLUMNS.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width;
    });
    this.addColumnHeaders(sheet, HEADER_ROW, CLIENT_COLUMNS, COLORS.PRIMARY);

    // ── Data rows ──
    clients.forEach((client, idx) => {
      const rowNum  = DATA_START_ROW + idx;
      const isEven  = idx % 2 === 0;
      const row     = sheet.getRow(rowNum);
      row.height    = 22;

      const avgSla  = (client._avg?.delaiReglement) ?? client.reglementDelay;
      const values  = this._buildRowValues(client, idx);

      values.forEach((val, ci) => {
        const cell     = row.getCell(ci + 1);
        cell.fill      = isEven ? FILLS.rowEven : FILLS.rowOdd;
        cell.border    = BORDERS.allThin;
        cell.font      = ci === 1 ? FONTS.dataCellBold : FONTS.dataCell;
        cell.alignment = typeof val === 'number' ? ALIGNMENTS.centerMiddle : ALIGNMENTS.leftMiddle;

        // Special cells
        if (ci === 3) {
          // Status badge
          this.setBadgeCell(cell, getStatusLabel(client.status), getStatusColor(client.status));
        } else if (ci === 7) {
          // Règlement delay — conditional color
          cell.value = client.reglementDelay;
          this.applyConditionalFill(cell, client.reglementDelay, 20);
          cell.font  = { ...FONTS.dataCell, bold: true };
          cell.alignment = ALIGNMENTS.centerMiddle;
        } else if (ci === 16) {
          // SLA status badge
          const slaColor = getSlaStatusColor(avgSla, client.reglementDelay);
          const slaLabel = getSlaStatusLabel(avgSla, client.reglementDelay);
          this.setBadgeCell(cell, slaLabel, slaColor);
        } else {
          cell.value = val ?? '—';
        }
      });
    });

    const lastRow = DATA_START_ROW + clients.length;

    // ── Totals row ──
    const totRow = sheet.getRow(lastRow);
    totRow.height = 26;
    const totCell = sheet.getCell(lastRow, 1);
    totCell.value     = `TOTAL — ${clients.length} clients`;
    totCell.font      = { ...FONTS.columnHeader, color: { argb: COLORS.WHITE } };
    totCell.fill      = makeFill(COLORS.PRIMARY_LIGHT);
    totCell.alignment = ALIGNMENTS.leftMiddle;
    sheet.mergeCells(lastRow, 1, lastRow, 4);

    // Numeric totals
    const numericCols: { ci: number; formula: string }[] = [
      { ci: 12, formula: `=SUM(M${DATA_START_ROW}:M${lastRow - 1})` },  // Bordereaux
      { ci: 13, formula: `=SUM(N${DATA_START_ROW}:N${lastRow - 1})` },  // Contrats
      { ci: 14, formula: `=SUM(O${DATA_START_ROW}:O${lastRow - 1})` },  // Réclamations
      { ci: 15, formula: `=SUM(P${DATA_START_ROW}:P${lastRow - 1})` },  // Adhérents
    ];
    numericCols.forEach(({ ci, formula }) => {
      const c       = sheet.getCell(lastRow, ci + 1);
      c.value       = { formula } as ExcelJS.CellFormulaValue;
      c.font        = { ...FONTS.dataCellBold, color: { argb: COLORS.WHITE } };
      c.fill        = makeFill(COLORS.PRIMARY_LIGHT);
      c.alignment   = ALIGNMENTS.centerMiddle;
      c.border      = BORDERS.allThin;
    });
    // Fill remaining total row cells
    for (let ci = 0; ci < COL_COUNT; ci++) {
      if (![0, 1, 2, 3, 12, 13, 14, 15].includes(ci)) {
        const c  = sheet.getCell(lastRow, ci + 1);
        c.fill   = makeFill(COLORS.PRIMARY_LIGHT);
        c.border = BORDERS.allThin;
      }
    }

    // ── Footer ──
    this.addFooter(sheet, lastRow + 2, COL_COUNT);

    // ── Auto-filter + freeze ──
    this.enableAutoFilter(sheet, HEADER_ROW, COL_COUNT);
    this.freezeRows(sheet, HEADER_ROW);

    // ── Print settings ──
    sheet.headerFooter = {
      oddHeader: '&L&B📋 Liste des Clients — ARS&R&D',
      oddFooter: '&CPage &P de &N',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 2 — Statistiques Globales
  // ══════════════════════════════════════════════════════════════════════════════
  private _addStatisticsSheet(wb: ExcelJS.Workbook, clients: any[]): void {
    const sheet = wb.addWorksheet('📊 Statistiques', {
      properties: { tabColor: { argb: COLORS.TAB_STATS } },
    });

    const COLS = 10;
    this.addHeaderBanner(
      sheet,
      '   📊  STATISTIQUES GLOBALES',
      `   Analyse de la base clients — ${new Date().toLocaleDateString('fr-FR')}`,
      COLS,
      COLORS.ACCENT,
    );
    sheet.getColumn(1).width = 4;
    for (let c = 2; c <= COLS; c++) sheet.getColumn(c).width = 18;

    // ── KPI Cards ──
    const active    = clients.filter(c => (c.status || 'active') === 'active').length;
    const inactive  = clients.filter(c => c.status === 'inactive').length;
    const suspended = clients.filter(c => c.status === 'suspended').length;
    const totalBord = clients.reduce((s, c) => s + (c.bordereaux?.length || 0), 0);
    const totalRec  = clients.reduce((s, c) => s + (c.reclamations?.length || 0), 0);
    const avgReg    = clients.length
      ? (clients.reduce((s, c) => s + c.reglementDelay, 0) / clients.length).toFixed(1)
      : '0';
    const avgRecl   = clients.length
      ? (clients.reduce((s, c) => s + c.reclamationDelay, 0) / clients.length).toFixed(1)
      : '0';

    this.addSectionTitle(sheet, 5, '  🔢  Indicateurs Clés (KPI)', COLS, COLORS.PRIMARY);

    const cards: Array<[number, number, string | number, string, string]> = [
      [6, 2, clients.length,  'Total Clients',       COLORS.PRIMARY      ],
      [6, 4, active,           'Clients Actifs',      COLORS.SUCCESS      ],
      [6, 6, inactive,         'Clients Inactifs',    COLORS.DANGER       ],
      [6, 8, suspended,        'Clients Suspendus',   COLORS.WARNING      ],
      [10, 2, totalBord,       'Total Bordereaux',    COLORS.ACCENT       ],
      [10, 4, totalRec,        'Total Réclamations',  COLORS.INFO         ],
      [10, 6, `${avgReg}j`,   'Délai Règlt Moyen',   COLORS.PRIMARY_LIGHT],
      [10, 8, `${avgRecl}h`,  'Délai Récl. Moyen',   COLORS.SUCCESS      ],
    ];
    cards.forEach(([r, c, val, lbl, color]) =>
      this.addStatCard(sheet, r, c, val, lbl, color)
    );

    // ── Status breakdown table ──
    this.addSectionTitle(sheet, 15, '  📈  Répartition par Statut', COLS, COLORS.PRIMARY_LIGHT);

    const statusHeaders = ['Statut', 'Nombre', '% du Total'];
    this.addColumnHeaders(sheet, 16, statusHeaders.map(l => ({ label: l, key: l, width: 20 })), COLORS.PRIMARY_LIGHT);
    const statusRows = [
      ['✅ Actif',     active,    clients.length ? active / clients.length    : 0],
      ['❌ Inactif',   inactive,  clients.length ? inactive / clients.length  : 0],
      ['⚠️ Suspendu', suspended, clients.length ? suspended / clients.length : 0],
    ];
    statusRows.forEach(([label, count, pct], i) => {
      const r = 17 + i;
      sheet.getRow(r).height = 22;

      const c1 = sheet.getCell(r, 2); c1.value = label as string;
      c1.font = FONTS.dataCell; c1.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c1.border = BORDERS.allThin; c1.alignment = ALIGNMENTS.leftMiddle;

      const c2 = sheet.getCell(r, 3); c2.value = count as number;
      c2.font = FONTS.dataCellBold; c2.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c2.border = BORDERS.allThin; c2.alignment = ALIGNMENTS.centerMiddle;

      const c3 = sheet.getCell(r, 4); c3.value = pct as number;
      c3.numFmt = '0.0%'; c3.font = FONTS.dataCell;
      c3.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c3.border = BORDERS.allThin; c3.alignment = ALIGNMENTS.centerMiddle;
    });

    // ── Delay distribution ──
    this.addSectionTitle(sheet, 22, '  ⏱️  Analyse des Délais', COLS, COLORS.PRIMARY_LIGHT);
    const delayHeaders = ['Tranche Délai Règlement', 'Nb Clients', '%'];
    this.addColumnHeaders(sheet, 23, delayHeaders.map(l => ({ label: l, key: l, width: 22 })), COLORS.PRIMARY_LIGHT);

    const tranches = [
      { label: '≤ 10 jours',           filter: (c: any) => c.reglementDelay <= 10    },
      { label: '11 – 20 jours',         filter: (c: any) => c.reglementDelay <= 20 && c.reglementDelay > 10 },
      { label: '21 – 30 jours',         filter: (c: any) => c.reglementDelay <= 30 && c.reglementDelay > 20 },
      { label: '> 30 jours',            filter: (c: any) => c.reglementDelay > 30    },
    ];
    tranches.forEach(({ label, filter }, i) => {
      const count = clients.filter(filter).length;
      const pct   = clients.length ? count / clients.length : 0;
      const r     = 24 + i;
      sheet.getRow(r).height = 22;

      const c1 = sheet.getCell(r, 2); c1.value = label;
      c1.font = FONTS.dataCell; c1.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c1.border = BORDERS.allThin; c1.alignment = ALIGNMENTS.leftMiddle;

      const c2 = sheet.getCell(r, 3); c2.value = count;
      c2.font = FONTS.dataCellBold; c2.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c2.border = BORDERS.allThin; c2.alignment = ALIGNMENTS.centerMiddle;

      const c3 = sheet.getCell(r, 4); c3.value = pct;
      c3.numFmt = '0.0%'; c3.font = FONTS.dataCell;
      c3.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c3.border = BORDERS.allThin; c3.alignment = ALIGNMENTS.centerMiddle;
    });

    // ── Mode récupération breakdown ──
    this.addSectionTitle(sheet, 30, '  💳  Modes de Récupération', COLS, COLORS.PRIMARY_LIGHT);
    const modeHeaders = ['Mode', 'Nb Clients', '%'];
    this.addColumnHeaders(sheet, 31, modeHeaders.map(l => ({ label: l, key: l, width: 22 })), COLORS.PRIMARY_LIGHT);

    const modes = ['VIREMENT', 'CHEQUE', 'FEUILLE_CAISSE', undefined];
    modes.forEach((mode, i) => {
      const count = clients.filter(c => c.modeRecuperation === (mode ?? null) || (!mode && !c.modeRecuperation)).length;
      const pct   = clients.length ? count / clients.length : 0;
      const r     = 32 + i;
      sheet.getRow(r).height = 22;

      const c1 = sheet.getCell(r, 2); c1.value = getModeLabel(mode);
      c1.font = FONTS.dataCell; c1.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c1.border = BORDERS.allThin; c1.alignment = ALIGNMENTS.leftMiddle;

      const c2 = sheet.getCell(r, 3); c2.value = count;
      c2.font = FONTS.dataCellBold; c2.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c2.border = BORDERS.allThin; c2.alignment = ALIGNMENTS.centerMiddle;

      const c3 = sheet.getCell(r, 4); c3.value = pct;
      c3.numFmt = '0.0%'; c3.font = FONTS.dataCell;
      c3.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c3.border = BORDERS.allThin; c3.alignment = ALIGNMENTS.centerMiddle;
    });

    this.addFooter(sheet, 38, COLS);
    this.freezeRows(sheet, 4);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 3 — Analyse SLA
  // ══════════════════════════════════════════════════════════════════════════════
  private _addSlaAnalysisSheet(wb: ExcelJS.Workbook, clients: any[]): void {
    const sheet = wb.addWorksheet('⏱️ Analyse SLA', {
      properties: { tabColor: { argb: COLORS.TAB_SLA } },
    });

    const COLS = 8;
    this.addHeaderBanner(
      sheet,
      '   ⏱️  ANALYSE SLA & PERFORMANCE',
      `   Classement des clients par conformité SLA — ${new Date().toLocaleDateString('fr-FR')}`,
      COLS,
      COLORS.WARNING,
    );

    for (let c = 1; c <= COLS; c++) sheet.getColumn(c).width = 22;
    sheet.getColumn(1).width = 6;

    // Sort by reglementDelay desc (highest risk first)
    const sorted = [...clients].sort((a, b) => b.reglementDelay - a.reglementDelay);

    // ── SLA Table header ──
    const slaHeaders = [
      { key: 'idx',   label: '#',                   width: 6  },
      { key: 'name',  label: 'Client',              width: 32 },
      { key: 'comp',  label: "Compagnie",            width: 28 },
      { key: 'reg',   label: 'Délai Règlt (j)',      width: 18 },
      { key: 'recl',  label: 'Délai Récl. (h)',      width: 18 },
      { key: 'bord',  label: 'Bordereaux',           width: 14 },
      { key: 'recs',  label: 'Réclamations',         width: 16 },
      { key: 'sla',   label: 'Statut SLA',           width: 18 },
    ];
    this.addColumnHeaders(sheet, HEADER_ROW, slaHeaders, COLORS.WARNING);

    sorted.forEach((client, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const isEven = idx % 2 === 0;
      sheet.getRow(rowNum).height = 22;

      const bgFill = isEven ? FILLS.rowEven : FILLS.rowOdd;

      const setCel = (ci: number, val: any, center = false) => {
        const cell    = sheet.getCell(rowNum, ci);
        cell.value    = val ?? '—';
        cell.font     = FONTS.dataCell;
        cell.fill     = bgFill;
        cell.border   = BORDERS.allThin;
        cell.alignment = center ? ALIGNMENTS.centerMiddle : ALIGNMENTS.leftMiddle;
      };

      setCel(1, idx + 1, true);
      const nameCell = sheet.getCell(rowNum, 2);
      nameCell.value = client.name; nameCell.font = FONTS.dataCellBold;
      nameCell.fill = bgFill; nameCell.border = BORDERS.allThin; nameCell.alignment = ALIGNMENTS.leftMiddle;

      setCel(3, client.compagnieAssurance?.nom || '—');
      setCel(4, client.reglementDelay, true);
      setCel(5, client.reclamationDelay, true);
      setCel(6, client.bordereaux?.length || 0, true);
      setCel(7, client.reclamations?.length || 0, true);

      // SLA status badge
      const slaColor = getSlaStatusColor(client.reglementDelay, 20);
      const slaLabel = getSlaStatusLabel(client.reglementDelay, 20);
      this.setBadgeCell(sheet.getCell(rowNum, 8), slaLabel, slaColor);

      // Conditional on delay col
      const delayCell = sheet.getCell(rowNum, 4);
      this.applyConditionalFill(delayCell, client.reglementDelay, 20);
    });

    const lastRow = DATA_START_ROW + sorted.length;

    // ── Summary below table ──
    this.addSectionTitle(sheet, lastRow + 2, '  📊  Résumé SLA', COLS, COLORS.WARNING);

    const highRisk = clients.filter(c => c.reglementDelay > 20).length;
    const medRisk  = clients.filter(c => c.reglementDelay > 10 && c.reglementDelay <= 20).length;
    const lowRisk  = clients.filter(c => c.reglementDelay <= 10).length;

    const summaryData = [
      ['🔴 Risque Élevé   (> 20j)', highRisk],
      ['🟡 Risque Moyen   (11–20j)', medRisk],
      ['🟢 Risque Faible  (≤ 10j)',  lowRisk],
    ];
    summaryData.forEach(([label, count], i) => {
      const r = lastRow + 3 + i;
      sheet.getRow(r).height = 22;
      const c1 = sheet.getCell(r, 1); c1.value = label;
      c1.font = FONTS.dataCell; c1.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c1.border = BORDERS.allThin; c1.alignment = ALIGNMENTS.leftMiddle;
      sheet.mergeCells(r, 1, r, 3);

      const c2 = sheet.getCell(r, 4); c2.value = count;
      c2.font = FONTS.dataCellBold; c2.fill = i % 2 === 0 ? FILLS.rowEven : FILLS.rowOdd;
      c2.border = BORDERS.allThin; c2.alignment = ALIGNMENTS.centerMiddle;
    });

    this.enableAutoFilter(sheet, HEADER_ROW, COLS);
    this.freezeRows(sheet, HEADER_ROW);
    this.addFooter(sheet, lastRow + 8, COLS);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 4 — Données Brutes (for power users / pivot tables)
  // ══════════════════════════════════════════════════════════════════════════════
  private _addRawDataSheet(wb: ExcelJS.Workbook, clients: any[]): void {
    const sheet = wb.addWorksheet('🗂️ Données Brutes', {
      properties: { tabColor: { argb: COLORS.TAB_ANALYSE } },
    });

    const rawHeaders = [
      'ID', 'Nom', 'Compagnie', 'Statut', 'Email', 'Téléphone', 'Adresse',
      'Délai Règlement', 'Délai Réclamation', 'Mode Récupération',
      "Chef d'Équipe", 'Email Chef', 'Gestionnaires',
      'Nb Bordereaux', 'Nb Contrats', 'Nb Réclamations', 'Nb Adhérents',
      'Créé le', 'Modifié le',
    ];

    const widths = [36, 32, 28, 14, 28, 16, 32, 16, 18, 20, 24, 26, 30, 14, 12, 16, 14, 16, 16];

    // Header row (row 1)
    sheet.getRow(1).height = 28;
    rawHeaders.forEach((h, i) => {
      sheet.getColumn(i + 1).width = widths[i] ?? 16;
      const cell        = sheet.getCell(1, i + 1);
      cell.value        = h;
      cell.font         = FONTS.columnHeader;
      cell.fill         = makeFill(COLORS.GRAY_800);
      cell.alignment    = ALIGNMENTS.centerMiddle;
      cell.border       = BORDERS.allThin;
    });

    // Data rows
    clients.forEach((client, idx) => {
      const rowNum = 2 + idx;
      const isEven = idx % 2 === 0;
      sheet.getRow(rowNum).height = 20;

      const gestNames = (client.gestionnaires || []).map((g: any) => g.fullName).join(', ');

      const vals = [
        client.id,
        client.name,
        client.compagnieAssurance?.nom || '',
        client.status || 'active',
        client.email || '',
        client.phone || '',
        client.address || '',
        client.reglementDelay,
        client.reclamationDelay,
        getModeLabel(client.modeRecuperation),
        client.chargeCompte?.fullName || '',
        client.chargeCompte?.email || '',
        gestNames,
        client.bordereaux?.length || 0,
        client.contracts?.length || 0,
        client.reclamations?.length || 0,
        (client as any).adherents?.length || 0,
        new Date(client.createdAt).toLocaleDateString('fr-FR'),
        new Date(client.updatedAt).toLocaleDateString('fr-FR'),
      ];

      vals.forEach((val, ci) => {
        const cell     = sheet.getCell(rowNum, ci + 1);
        cell.value     = val;
        cell.font      = FONTS.dataCell;
        cell.fill      = isEven ? FILLS.rowEven : FILLS.rowOdd;
        cell.border    = BORDERS.allThin;
        cell.alignment = typeof val === 'number' ? ALIGNMENTS.centerMiddle : ALIGNMENTS.leftMiddle;
      });
    });

    this.enableAutoFilter(sheet, 1, rawHeaders.length);
    this.freezeRows(sheet, 1);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private _buildRowValues(client: any, idx: number): Array<string | number | null> {
    const gestNames = (client.gestionnaires || []).map((g: any) => g.fullName).join(', ');
    const avgSla    = client.reglementDelay; // fallback; real avg from analytics if available

    return [
      idx + 1,                                                  // #
      client.name,                                              // Nom
      client.compagnieAssurance?.nom || '—',                   // Compagnie
      null,                                                      // Status (handled specially)
      client.email || '—',                                      // Email
      client.phone || '—',                                      // Téléphone
      client.address || '—',                                    // Adresse
      null,                                                      // Règlement delay (handled specially)
      client.reclamationDelay,                                  // Réclamation delay
      getModeLabel(client.modeRecuperation),                   // Mode récupération
      client.chargeCompte?.fullName || '—',                    // Chef équipe
      gestNames || '—',                                         // Gestionnaires
      client.bordereaux?.length   || 0,                        // Bordereaux
      client.contracts?.length    || 0,                        // Contrats
      client.reclamations?.length || 0,                        // Réclamations
      (client as any).adherents?.length || 0,                  // Adhérents
      null,                                                      // SLA status (handled specially)
      new Date(client.createdAt).toLocaleDateString('fr-FR'),  // Créé le
      new Date(client.updatedAt).toLocaleDateString('fr-FR'),  // Modifié le
    ];
  }
}