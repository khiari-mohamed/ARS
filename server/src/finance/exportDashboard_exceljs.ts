import * as ExcelJS from 'exceljs';
// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  NAVY:        'FF1E3A5F',
  NAVY_LIGHT:  'FF2E5F8E',
  ACCENT:      'FF2196F3',
  SLATE:       'FF2C3E50',
  WHITE:       'FFFFFFFF',
  LIGHT_BLUE:  'FFE8F0FE',
  ROW_ALT:     'FFF4F7FB',
  BORDER:      'FFD0D9E8',
  BORDER_DARK: 'FF8FA5C0',
  GREEN:       'FF1B8A4C',
  GREEN_BG:    'FFE6F4ED',
  RED:         'FFC0392B',
  RED_BG:      'FFFDECEA',
  ORANGE:      'FFD35400',
  ORANGE_BG:   'FFFFF3E0',
  BLUE_STATUS: 'FF1565C0',
  BLUE_STATUS_BG: 'FFE3F0FF',
  TOTAL_BG:    'FF152D4A',
  GRAY_TEXT:   'FF5A6A7E',
};

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
  { header: 'Référence OV',          key: 'reference',           width: 20 },
  { header: 'Référence Bordereau',   key: 'referenceBordereau',  width: 30 },
  { header: "Compagnie d'Assurance", key: 'compagnieAssurance',  width: 26 },
  { header: 'Client / Société',      key: 'client',              width: 24 },
  { header: 'Bordereau',             key: 'bordereau',           width: 30 },
  { header: 'Montant (TND)',         key: 'montant',             width: 17 },
  { header: 'Statut',               key: 'statut',              width: 24 },
  { header: "Date d'Exécution",      key: 'dateExecution',       width: 18 },
  { header: 'Motif / Observations',  key: 'motifObservation',    width: 32 },
  { header: 'Mode de Récupération',  key: 'modeRecuperation',    width: 24 },
  { header: 'Nom du Donneur',        key: 'nomDonneur',          width: 22 },
  { header: 'Numéro de Contrat',     key: 'numeroContrat',       width: 20 },
  { header: 'Demande Récupération',  key: 'demandeRecuperation', width: 22 },
  { header: 'Montant Récupéré',      key: 'montantRecupere',     width: 20 },
];

const COL_COUNT = COLUMNS.length;

// ── Helper: uniform border ────────────────────────────────────────────────────
function border(
  color: string = C.BORDER,
  style: ExcelJS.BorderStyle = 'thin',
): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style, color: { argb: color } };
  return { top: s, bottom: s, left: s, right: s };
}

function cellFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// ── Status colouring ─────────────────────────────────────────────────────────
function statusColors(statut: string): { fg: string; bg: string } {
  if (['EXECUTE', 'VIREMENT_DEPOSE'].includes(statut))
    return { fg: C.GREEN, bg: C.GREEN_BG };
  if (['REJETE', 'VIREMENT_NON_VALIDE'].includes(statut))
    return { fg: C.RED, bg: C.RED_BG };
  if (['EN_COURS', 'PENDING', 'EN_COURS_VALIDATION'].includes(statut))
    return { fg: C.ORANGE, bg: C.ORANGE_BG };
  return { fg: C.BLUE_STATUS, bg: C.BLUE_STATUS_BG };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// Replace the workbook-building section of your controller with this.
// `ordres` is your existing array of OV objects from the DB query.
// ─────────────────────────────────────────────────────────────────────────────
export async function buildExportWorkbook(ordres: any[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ARS Finance System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Tableau de Bord Finance', {
    pageSetup: {
      paperSize: 9,           // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: '&C&"Calibri,Bold"&12ARS — Tableau de Bord Finance',
      oddFooter:  '&LExporté le &D &T&RPage &P / &N',
    },
  });

  // ── 1. Title row ────────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = ws.getCell('A1');
  titleCell.value = '⬛  TABLEAU DE BORD FINANCE — ORDRES DE VIREMENT';
  titleCell.font  = { name: 'Calibri', size: 15, bold: true, color: { argb: C.WHITE } };
  titleCell.fill  = cellFill(C.NAVY);
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 44;

  // ── 2. Subtitle / date row ───────────────────────────────────────────────────
  ws.mergeCells(2, 1, 2, COL_COUNT);
  const subCell = ws.getCell('A2');
  const now = new Date();
  subCell.value = `Exporté le ${now.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}  ·  ${ordres.length} ordre${ordres.length !== 1 ? 's' : ''} au total`;
  subCell.font      = { name: 'Calibri', size: 10, italic: true, color: { argb: C.WHITE } };
  subCell.fill      = cellFill(C.NAVY_LIGHT);
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // ── 3. Spacer row ────────────────────────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── 4. Column headers ────────────────────────────────────────────────────────
  const headerRow = ws.getRow(4);
  headerRow.height = 32;

  COLUMNS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;

    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font      = { name: 'Calibri', size: 9, bold: true, color: { argb: C.WHITE } };
    cell.fill      = cellFill(C.SLATE);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = {
      top:    { style: 'medium', color: { argb: C.NAVY } },
      bottom: { style: 'medium', color: { argb: C.ACCENT } },
      left:   { style: 'thin',   color: { argb: 'FF3D5166' } },
      right:  { style: 'thin',   color: { argb: 'FF3D5166' } },
    };
  });

  // ── 5. Data rows ─────────────────────────────────────────────────────────────
  ordres.forEach((ordre, idx) => {
    const rowNum  = idx + 5;
    const row     = ws.getRow(rowNum);
    const isEven  = idx % 2 === 0;
    const rowBg   = isEven ? C.WHITE : C.ROW_ALT;

    const values: any[] = [
      ordre.reference            || '—',
      ordre.referenceBordereau   || '—',
      ordre.compagnieAssurance   || ordre.client || '—',
      ordre.client               || '—',
      ordre.bordereau            || '—',
      typeof ordre.montant === 'number' ? ordre.montant : (parseFloat(ordre.montant) || 0),
      ordre.statut               || '—',
      ordre.dateExecution
        ? new Date(ordre.dateExecution).toLocaleDateString('fr-FR')
        : '—',
      ordre.motifObservation     || '—',
      ordre.modeRecuperation     || '—',
      ordre.nomDonneur           || '—',
      ordre.numeroContrat        || '—',
      ordre.demandeRecuperation  ? '✔ Oui' : 'Non',
      ordre.montantRecupere      ? '✔ Oui' : 'Non',
    ];

    values.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val;

      // Base style
      cell.font      = { name: 'Calibri', size: 9.5, color: { argb: C.SLATE } };
      cell.fill      = cellFill(rowBg);
      cell.alignment = {
        vertical: 'middle',
        horizontal: ci === 5 ? 'right' : 'left',
        wrapText: ci === 8,   // Motif column wraps
      };
      cell.border = {
        top:    { style: 'hair',  color: { argb: C.BORDER } },
        bottom: { style: 'hair',  color: { argb: C.BORDER } },
        left:   { style: ci === 0 ? 'medium' : 'thin', color: { argb: ci === 0 ? C.BORDER_DARK : C.BORDER } },
        right:  { style: ci === COL_COUNT - 1 ? 'medium' : 'thin', color: { argb: ci === COL_COUNT - 1 ? C.BORDER_DARK : C.BORDER } },
      };

      // Montant column: number format
      if (ci === 5) {
        cell.numFmt = '#,##0.000';
        cell.font   = { ...cell.font as any, bold: true };
      }

      // Statut column: coloured text
      if (ci === 6 && val !== '—') {
        const sc = statusColors(val as string);
        cell.font = { ...cell.font as any, color: { argb: sc.fg }, bold: true };
        cell.fill = cellFill(sc.bg);
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      }

      // Demande / Montant Récupéré columns
      if ((ci === 12 || ci === 13)) {
        const isOui = String(val).startsWith('✔');
        cell.font = { ...cell.font as any,
          color: { argb: isOui ? C.GREEN : C.GRAY_TEXT },
          bold: isOui,
        };
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      }

      // Reference OV column: emphasis
      if (ci === 0) {
        cell.font = { ...cell.font as any, bold: true, color: { argb: C.NAVY } };
      }
    });

    row.height = 20;
  });

  // ── 6. Totals row ─────────────────────────────────────────────────────────
  const totalRowNum = ordres.length + 5;
  const totalRow    = ws.getRow(totalRowNum);
  totalRow.height   = 28;

  // Merge cols 1-5 for label
  ws.mergeCells(totalRowNum, 1, totalRowNum, 5);
  const lblCell  = totalRow.getCell(1);
  lblCell.value  = `TOTAL — ${ordres.length} ordre${ordres.length !== 1 ? 's' : ''}`;
  lblCell.font   = { name: 'Calibri', size: 10, bold: true, color: { argb: C.WHITE } };
  lblCell.fill   = cellFill(C.TOTAL_BG);
  lblCell.alignment = { horizontal: 'right', vertical: 'middle' };
  lblCell.border = { top: { style: 'medium', color: { argb: C.ACCENT } } };

  // Montant total cell
  const sumCell  = totalRow.getCell(6);
  sumCell.value  = { formula: `SUM(F5:F${totalRowNum - 1})` };
  sumCell.numFmt = '#,##0.000';
  sumCell.font   = { name: 'Calibri', size: 10, bold: true, color: { argb: C.WHITE } };
  sumCell.fill   = cellFill(C.TOTAL_BG);
  sumCell.alignment = { horizontal: 'right', vertical: 'middle' };
  sumCell.border    = { top: { style: 'medium', color: { argb: C.ACCENT } } };

  // Fill remaining cells in total row
  for (let c = 7; c <= COL_COUNT; c++) {
    const cell  = totalRow.getCell(c);
    cell.fill   = cellFill(C.TOTAL_BG);
    cell.border = { top: { style: 'medium', color: { argb: C.ACCENT } } };
  }

  // ── 7. Freeze panes (rows 1-4, col 1) ─────────────────────────────────────
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 1, activeCell: 'B5' }];

  // ── 8. Auto-filter on header row ──────────────────────────────────────────
  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to:   { row: 4, column: COL_COUNT },
  };

  return wb.xlsx.writeBuffer();
}
