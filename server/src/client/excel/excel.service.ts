import * as ExcelJS from 'exceljs';
import {
  ALIGNMENTS,
  BORDERS,
  COLORS,
  FILLS,
  FONTS,
  makeFill,
} from './styles.constants';

export class ExcelService {
  // ─── Workbook ───────────────────────────────────────────────────────────────
  createWorkbook(creator = 'ARS System', company = 'ARS'): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator   = creator;
    wb.company   = company;
    wb.created   = new Date();
    wb.modified  = new Date();
    return wb;
  }

  // ─── Header Banner ──────────────────────────────────────────────────────────
  addHeaderBanner(
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    colSpan: number,
    accentColor = COLORS.PRIMARY,
  ): void {
    // Row 1: main title
    sheet.getRow(1).height = 50;
    const titleCell = sheet.getCell('A1');
    titleCell.value          = title;
    titleCell.font           = FONTS.title;
    titleCell.fill           = makeFill(accentColor);
    titleCell.alignment      = ALIGNMENTS.leftMiddle;
    sheet.mergeCells(1, 1, 1, colSpan);

    // Row 2: subtitle / meta
    sheet.getRow(2).height = 24;
    const subCell = sheet.getCell('A2');
    subCell.value       = subtitle;
    subCell.font        = { ...FONTS.subtitle, color: { argb: COLORS.GRAY_100 } };
    subCell.fill        = makeFill(COLORS.PRIMARY_LIGHT);
    subCell.alignment   = ALIGNMENTS.leftMiddle;
    sheet.mergeCells(2, 1, 2, colSpan);

    // Row 3: spacer
    sheet.getRow(3).height = 8;
    for (let c = 1; c <= colSpan; c++) {
      sheet.getCell(3, c).fill = makeFill(COLORS.ACCENT);
    }
    sheet.mergeCells(3, 1, 3, colSpan);
  }

  // ─── Column Headers ─────────────────────────────────────────────────────────
  addColumnHeaders(
    sheet: ExcelJS.Worksheet,
    row: number,
    headers: Array<{ label: string; width?: number; key: string }>,
    bgColor = COLORS.PRIMARY,
  ): void {
    sheet.getRow(row).height = 32;
    headers.forEach((h, i) => {
      const cell         = sheet.getCell(row, i + 1);
      cell.value         = h.label;
      cell.font          = FONTS.columnHeader;
      cell.fill          = makeFill(bgColor);
      cell.alignment     = ALIGNMENTS.centerMiddle;
      cell.border        = BORDERS.allThin;
      sheet.getColumn(i + 1).width = h.width ?? 18;
    });
  }

  // ─── Data Row ───────────────────────────────────────────────────────────────
  addDataRow(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    values: Array<string | number | null | undefined>,
    isEven: boolean,
    rowHeight = 22,
  ): ExcelJS.Row {
    const row    = sheet.getRow(rowNum);
    row.height   = rowHeight;
    const fill   = isEven ? FILLS.rowEven : FILLS.rowOdd;

    values.forEach((val, i) => {
      const cell     = row.getCell(i + 1);
      cell.value     = val ?? '—';
      cell.font      = FONTS.dataCell;
      cell.fill      = fill;
      cell.border    = BORDERS.allThin;
      cell.alignment = typeof val === 'number'
        ? ALIGNMENTS.centerMiddle
        : ALIGNMENTS.leftMiddle;
    });
    return row;
  }

  // ─── Stat Cards ─────────────────────────────────────────────────────────────
  addStatCard(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    startCol: number,
    value: string | number,
    label: string,
    color = COLORS.PRIMARY,
  ): void {
    // Merge 3 rows × 2 cols for the card
    sheet.mergeCells(startRow, startCol, startRow,     startCol + 1);
    sheet.mergeCells(startRow + 1, startCol, startRow + 1, startCol + 1);
    sheet.mergeCells(startRow + 2, startCol, startRow + 2, startCol + 1);

    const topBorder = sheet.getCell(startRow, startCol);
    topBorder.fill  = makeFill(color);
    sheet.getRow(startRow).height = 6;

    const valCell       = sheet.getCell(startRow + 1, startCol);
    valCell.value       = value;
    valCell.font        = { ...FONTS.statValue, color: { argb: color } };
    valCell.fill        = FILLS.statCard;
    valCell.alignment   = ALIGNMENTS.centerMiddle;
    valCell.border      = BORDERS.allThin;
    sheet.getRow(startRow + 1).height = 40;

    const lblCell       = sheet.getCell(startRow + 2, startCol);
    lblCell.value       = label;
    lblCell.font        = FONTS.statLabel;
    lblCell.fill        = FILLS.statCard;
    lblCell.alignment   = ALIGNMENTS.centerMiddle;
    lblCell.border      = BORDERS.allThin;
    sheet.getRow(startRow + 2).height = 20;
  }

  // ─── Section Title ──────────────────────────────────────────────────────────
  addSectionTitle(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    text: string,
    colSpan: number,
    color = COLORS.PRIMARY_LIGHT,
  ): void {
    sheet.getRow(rowNum).height = 28;
    const cell        = sheet.getCell(rowNum, 1);
    cell.value        = text;
    cell.font         = { ...FONTS.sectionHeader, color: { argb: COLORS.WHITE } };
    cell.fill         = makeFill(color);
    cell.alignment    = { ...ALIGNMENTS.leftMiddle, indent: 2 };
    cell.border       = BORDERS.bottomThick;
    sheet.mergeCells(rowNum, 1, rowNum, colSpan);
  }

  // ─── Footer ─────────────────────────────────────────────────────────────────
  addFooter(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    colSpan: number,
  ): void {
    sheet.getRow(rowNum).height = 20;
    const cell      = sheet.getCell(rowNum, 1);
    cell.value      = `Généré le ${new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })} — ARS System © ${new Date().getFullYear()}`;
    cell.font       = FONTS.footerText;
    cell.fill       = makeFill(COLORS.GRAY_100);
    cell.alignment  = ALIGNMENTS.centerMiddle;
    sheet.mergeCells(rowNum, 1, rowNum, colSpan);
  }

  // ─── Auto-filter ────────────────────────────────────────────────────────────
  enableAutoFilter(sheet: ExcelJS.Worksheet, headerRow: number, colCount: number): void {
    sheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to:   { row: headerRow, column: colCount },
    };
  }

  // ─── Freeze Panes ───────────────────────────────────────────────────────────
  freezeRows(sheet: ExcelJS.Worksheet, rowCount: number): void {
    sheet.views = [{ state: 'frozen', ySplit: rowCount, xSplit: 0 }];
  }

  // ─── Colored Badge Cell ─────────────────────────────────────────────────────
  setBadgeCell(
    cell: ExcelJS.Cell,
    text: string,
    bgColor: string,
  ): void {
    cell.value     = text;
    cell.font      = { ...FONTS.badge, color: { argb: COLORS.WHITE } };
    cell.fill      = makeFill(bgColor);
    cell.alignment = ALIGNMENTS.centerMiddle;
    cell.border    = BORDERS.allThin;
  }

  // ─── Number format helpers ───────────────────────────────────────────────────
  formatNumber(cell: ExcelJS.Cell, format = '#,##0'): void {
    cell.numFmt = format;
  }

  formatPercent(cell: ExcelJS.Cell): void {
    cell.numFmt = '0.0%';
  }

  // ─── Conditional fill ───────────────────────────────────────────────────────
  applyConditionalFill(
    cell: ExcelJS.Cell,
    value: number,
    threshold: number,
    highColor = COLORS.DANGER_LIGHT,
    lowColor  = COLORS.SUCCESS_LIGHT,
  ): void {
    cell.fill = value > threshold ? makeFill(highColor) : makeFill(lowColor);
  }
}
