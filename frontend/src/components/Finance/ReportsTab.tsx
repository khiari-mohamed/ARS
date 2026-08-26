// D:\ARS\frontend\src\components\Finance\ReportsTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Card, CardContent, Box, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, Alert, TableContainer, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, TablePagination
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import RefreshIcon from '@mui/icons-material/Refresh';

// ── Export libraries (client-side generation — no backend round-trip) ──────────
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  Document, Packer, Paragraph, Table as DocxTable, TableRow as DocxTableRow,
  TableCell as DocxTableCell, TextRun, HeadingLevel, WidthType, ShadingType
} from 'docx';

// ─── Shared table cell styles (mirrors dashboard design) ──────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.8,
  px: 1.5,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

// ─── Custom Tooltip for charts ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        bgcolor: '#1e3a5f',
        color: '#fff',
        px: 1.5, py: 1,
        borderRadius: 1.5,
        boxShadow: '0 4px 16px rgba(30,58,95,0.25)',
        fontSize: '0.78rem',
        minWidth: 120,
      }}>
        {label && <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#90caf9', fontWeight: 700 }}>{label}</Typography>}
        {payload.map((p: any, i: number) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.3 }}>
            <span style={{ color: p.color || '#90caf9' }}>{p.name}</span>
            <strong>{typeof p.value === 'number' && p.name === 'Montant' ? p.value.toLocaleString('fr-TN') + ' TND' : p.value}{p.unit || ''}</strong>
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

// ─── Status badge helper ───────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  EXECUTE:             { label: 'Exécuté',       bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  EN_COURS_VALIDATION: { label: 'En validation', bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  REJETE:              { label: 'Rejeté',        bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
  NON_EXECUTE:         { label: 'Non exécuté',   bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
};
function getStatusStyle(status: string) {
  return STATUS_MAP[status] ?? { label: status, bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' };
}
const STATUS_LABELS: Record<string, string> = {
  EXECUTE: 'Exécuté',
  EN_COURS_VALIDATION: 'En validation',
  REJETE: 'Rejeté',
  NON_EXECUTE: 'Non exécuté',
};

// ═════════════════════════════════════════════════════════════════════════════
// ── EXPORT HELPERS — build real PDF / Excel / Word files entirely client-side ──
// ═════════════════════════════════════════════════════════════════════════════

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  society: string;
  donneurOrdre: string;
}

interface ReportExportData {
  filters: ReportFilters;
  reportData: any[];
  statusData: any[];
  slaData: any[];
  trendData: any[];
}

interface ReportSections {
  includeCharts: boolean;
  includeDetails: boolean;
  includeSLA: boolean;
  includeExceptions: boolean;
}

function formatDateFR(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function formatMontant(v?: number | null) {
  return `${(v ?? 0).toLocaleString('fr-TN')} TND`;
}

function buildFilterSummary(filters: ReportFilters) {
  const parts: string[] = [];
  if (filters.dateFrom) parts.push(`Du ${formatDateFR(filters.dateFrom)}`);
  if (filters.dateTo) parts.push(`Au ${formatDateFR(filters.dateTo)}`);
  if (filters.society) parts.push(`Société: ${filters.society}`);
  if (filters.donneurOrdre) parts.push(`Donneur: ${filters.donneurOrdre}`);
  return parts.length ? parts.join('  •  ') : 'Aucun filtre appliqué';
}

function computeKPIs(reportData: any[]) {
  const total = reportData?.length || 0;
  const totalMontant = (reportData || []).reduce((s: number, r: any) => s + (r.montantTotal || 0), 0);
  const executed = (reportData || []).filter((r: any) => r.etatVirement === 'EXECUTE').length;
  const rejected = (reportData || []).filter((r: any) => r.etatVirement === 'REJETE').length;
  return { total, totalMontant, executed, rejected };
}

// ── PDF ─────────────────────────────────────────────────────────────────────
async function generatePDFReport(data: ReportExportData, options: ReportSections): Promise<Blob> {
  const { filters, reportData, statusData, slaData, trendData } = data;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { total, totalMontant, executed, rejected } = computeKPIs(reportData);

  // Header band
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ARS TUNISIE — Rapport Financier des Virements', 10, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  doc.text(
    `Généré le ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    10, 18
  );

  let y = 30;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Filtres : ${buildFilterSummary(filters)}`, 10, y);
  y += 8;

  // KPI cards
  const kpis = [
    { label: 'Total Ordres', value: String(total) },
    { label: 'Montant Total', value: formatMontant(totalMontant) },
    { label: 'Exécutés', value: `${executed} (${total ? Math.round(executed / total * 100) : 0}%)` },
    { label: 'Rejetés', value: `${rejected} (${total ? Math.round(rejected / total * 100) : 0}%)` },
  ];
  const kpiWidth = (pageWidth - 20 - 3 * 4) / 4;
  kpis.forEach((k, i) => {
    const x = 10 + i * (kpiWidth + 4);
    doc.setFillColor(240, 244, 255);
    doc.setDrawColor(208, 223, 245);
    doc.roundedRect(x, y, kpiWidth, 18, 2, 2, 'FD');
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, x + 4, y + 8);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 106, 126);
    doc.text(k.label, x + 4, y + 14);
  });
  y += 26;

  if (options.includeCharts && statusData?.length) {
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Répartition par Statut', 10, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Statut', 'Nombre', 'Pourcentage']],
      body: statusData.map((s: any) => [s.name, String(s.count || 0), `${s.value}%`]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 10, right: 10 },
      tableWidth: (pageWidth - 20) / 2 - 5,
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (options.includeSLA && slaData?.length) {
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Conformité SLA par Société', 10, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Société', 'À temps', 'À risque', 'En retard']],
      body: slaData.map((s: any) => [s.society, `${s.onTime}%`, `${s.atRisk}%`, `${s.overdue}%`]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 10, right: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (options.includeCharts && trendData?.length) {
    if (y > 160) { doc.addPage(); y = 15; }
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Évolution — 7 derniers jours', 10, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Total', 'Exécutés', 'Montant']],
      body: trendData.map((t: any) => [t.date, String(t.total), String(t.executed), formatMontant(t.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 10, right: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (options.includeDetails && reportData?.length) {
    if (y > 170) { doc.addPage(); y = 15; }
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Liste des Ordres de Virement', 10, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Référence', 'Client', 'Montant', 'Statut', 'Date']],
      body: reportData.map((ov: any) => [
        ov.reference || '—',
        ov.bordereau?.client?.name || 'Entrée manuelle',
        formatMontant(ov.montantTotal),
        STATUS_LABELS[ov.etatVirement] || ov.etatVirement,
        formatDateFR(ov.dateCreation),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      margin: { left: 10, right: 10 },
    });
  }

  if (options.includeExceptions) {
    const rejectedList = (reportData || []).filter((r: any) => r.etatVirement === 'REJETE');
    if (rejectedList.length) {
      doc.addPage();
      let ey = 15;
      doc.setTextColor(183, 28, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Exceptions et Alertes — Virements Rejetés', 10, ey);
      ey += 4;
      autoTable(doc, {
        startY: ey,
        head: [['Référence', 'Client', 'Montant', 'Date', 'Commentaire']],
        body: rejectedList.map((ov: any) => [
          ov.reference || '—',
          ov.bordereau?.client?.name || 'Entrée manuelle',
          formatMontant(ov.montantTotal),
          formatDateFR(ov.dateCreation),
          ov.commentaire || ov.motifObservation || '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [183, 28, 28], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
      });
    }
  }

  // Page numbers on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 6);
  }

  return doc.output('blob');
}

// ── EXCEL ────────────────────────────────────────────────────────────────────
async function generateExcelReport(data: ReportExportData, options: ReportSections): Promise<Blob> {
  const { filters, reportData, statusData, slaData, trendData } = data;
  const { total, totalMontant, executed, rejected } = computeKPIs(reportData);

  const C = {
    NAVY: 'FF1E3A5F', NAVY_LIGHT: 'FF2E5F8E', SLATE: 'FF2C3E50',
    WHITE: 'FFFFFFFF', ROW_ALT: 'FFF4F7FB', BORDER: 'FFD0D9E8',
    GREEN: 'FF1B8A4C', GREEN_BG: 'FFE6F4ED', RED: 'FFC0392B', RED_BG: 'FFFDECEA',
    ORANGE: 'FFD35400', ORANGE_BG: 'FFFFF3E0', BLUE: 'FF1565C0', BLUE_BG: 'FFE3F0FF',
    TOTAL_BG: 'FF152D4A',
  };
  const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const thin = (argb = C.BORDER): Partial<ExcelJS.Border> => ({ style: 'thin', color: { argb } });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ARS Finance System';
  wb.created = new Date();

  // ── Sheet: Résumé ──
  const wsSummary = wb.addWorksheet('Résumé', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  wsSummary.mergeCells('A1:D1');
  const title = wsSummary.getCell('A1');
  title.value = 'RAPPORT FINANCIER — ORDRES DE VIREMENT';
  title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: C.WHITE } };
  title.fill = fill(C.NAVY);
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(1).height = 32;

  wsSummary.mergeCells('A2:D2');
  const sub = wsSummary.getCell('A2');
  const now = new Date();
  sub.value = `Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.WHITE } };
  sub.fill = fill(C.NAVY_LIGHT);
  sub.alignment = { horizontal: 'center' };
  wsSummary.getRow(2).height = 20;

  wsSummary.getCell('A4').value = 'Filtres appliqués';
  wsSummary.getCell('A4').font = { bold: true, color: { argb: C.NAVY } };
  wsSummary.mergeCells('A5:D5');
  wsSummary.getCell('A5').value = buildFilterSummary(filters);

  const kpiRows: [string, number][] = [
    ['Total Ordres', total],
    ['Montant Total (TND)', totalMontant],
    ['Exécutés', executed],
    ['Rejetés', rejected],
  ];
  const kr = 7;
  wsSummary.getCell(`A${kr}`).value = 'Indicateur';
  wsSummary.getCell(`B${kr}`).value = 'Valeur';
  [wsSummary.getCell(`A${kr}`), wsSummary.getCell(`B${kr}`)].forEach(c => {
    c.font = { bold: true, color: { argb: C.WHITE } };
    c.fill = fill(C.SLATE);
  });
  kpiRows.forEach((row, i) => {
    const r = kr + 1 + i;
    wsSummary.getCell(`A${r}`).value = row[0];
    wsSummary.getCell(`B${r}`).value = row[1];
    const bg = i % 2 === 0 ? C.WHITE : C.ROW_ALT;
    wsSummary.getCell(`A${r}`).fill = fill(bg);
    wsSummary.getCell(`B${r}`).fill = fill(bg);
    if (row[0] === 'Montant Total (TND)') wsSummary.getCell(`B${r}`).numFmt = '#,##0.000';
  });
  [1, 2, 3, 4].forEach(i => { wsSummary.getColumn(i).width = 24; });

  // ── Sheet: Répartition Statuts ──
  if (options.includeCharts && statusData?.length) {
    const ws = wb.addWorksheet('Répartition Statuts');
    ws.addRow(['Statut', 'Nombre', 'Pourcentage']);
    ws.getRow(1).eachCell(c => {
      c.font = { bold: true, color: { argb: C.WHITE } };
      c.fill = fill(C.NAVY);
      c.alignment = { horizontal: 'center' };
    });
    statusData.forEach((s: any, i: number) => {
      const row = ws.addRow([s.name, s.count || 0, `${s.value}%`]);
      row.eachCell(c => { c.fill = fill(i % 2 === 0 ? C.WHITE : C.ROW_ALT); });
    });
    ws.columns.forEach(col => { col.width = 22; });
  }

  // ── Sheet: SLA ──
  if (options.includeSLA && slaData?.length) {
    const ws = wb.addWorksheet('SLA par Société');
    ws.addRow(['Société', 'À temps (%)', 'À risque (%)', 'En retard (%)']);
    ws.getRow(1).eachCell(c => {
      c.font = { bold: true, color: { argb: C.WHITE } };
      c.fill = fill(C.NAVY);
      c.alignment = { horizontal: 'center' };
    });
    slaData.forEach((s: any, i: number) => {
      const row = ws.addRow([s.society, s.onTime, s.atRisk, s.overdue]);
      row.eachCell(c => { c.fill = fill(i % 2 === 0 ? C.WHITE : C.ROW_ALT); });
    });
    ws.columns.forEach(col => { col.width = 24; });
  }

  // ── Sheet: Évolution 7 jours ──
  if (options.includeCharts && trendData?.length) {
    const ws = wb.addWorksheet('Évolution 7 jours');
    ws.addRow(['Date', 'Total', 'Exécutés', 'Montant (TND)']);
    ws.getRow(1).eachCell(c => {
      c.font = { bold: true, color: { argb: C.WHITE } };
      c.fill = fill(C.NAVY);
      c.alignment = { horizontal: 'center' };
    });
    trendData.forEach((t: any, i: number) => {
      const row = ws.addRow([t.date, t.total, t.executed, t.amount]);
      row.getCell(4).numFmt = '#,##0.000';
      row.eachCell(c => { c.fill = fill(i % 2 === 0 ? C.WHITE : C.ROW_ALT); });
    });
    ws.columns.forEach(col => { col.width = 20; });
  }

  // ── Sheet: Détail OV ──
  if (options.includeDetails && reportData?.length) {
    const ws = wb.addWorksheet('Détail OV', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });
    const COLUMNS = [
      { header: 'Référence', width: 20 },
      { header: 'Client', width: 28 },
      { header: 'Montant (TND)', width: 18 },
      { header: 'Statut', width: 20 },
      { header: 'Date Création', width: 18 },
    ];
    const hRow = ws.addRow(COLUMNS.map(c => c.header));
    hRow.eachCell((c, i) => {
      c.font = { bold: true, color: { argb: C.WHITE } };
      c.fill = fill(C.SLATE);
      c.alignment = { horizontal: 'center' };
      ws.getColumn(i).width = COLUMNS[i - 1].width;
    });

    const statusColors: Record<string, { fg: string; bg: string }> = {
      EXECUTE: { fg: C.GREEN, bg: C.GREEN_BG },
      REJETE: { fg: C.RED, bg: C.RED_BG },
      EN_COURS_VALIDATION: { fg: C.BLUE, bg: C.BLUE_BG },
      NON_EXECUTE: { fg: C.ORANGE, bg: C.ORANGE_BG },
    };

    reportData.forEach((ov: any, i: number) => {
      const row = ws.addRow([
        ov.reference || '—',
        ov.bordereau?.client?.name || 'Entrée manuelle',
        ov.montantTotal || 0,
        STATUS_LABELS[ov.etatVirement] || ov.etatVirement,
        formatDateFR(ov.dateCreation),
      ]);
      const bg = i % 2 === 0 ? C.WHITE : C.ROW_ALT;
      row.eachCell(c => { c.fill = fill(bg); c.border = { top: thin(), bottom: thin(), left: thin(), right: thin() }; });
      row.getCell(3).numFmt = '#,##0.000';
      const sc = statusColors[ov.etatVirement] || { fg: C.SLATE, bg: C.WHITE };
      row.getCell(4).font = { color: { argb: sc.fg }, bold: true };
      row.getCell(4).fill = fill(sc.bg);
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const totalRow = ws.addRow(['TOTAL', '', totalMontant, '', `${reportData.length} enregistrement(s)`]);
    totalRow.eachCell(c => { c.font = { bold: true, color: { argb: C.WHITE } }; c.fill = fill(C.TOTAL_BG); });
    totalRow.getCell(3).numFmt = '#,##0.000';

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  }

  // ── Sheet: Exceptions ──
  if (options.includeExceptions) {
    const rejectedList = (reportData || []).filter((r: any) => r.etatVirement === 'REJETE');
    if (rejectedList.length) {
      const ws = wb.addWorksheet('Exceptions');
      ws.addRow(['Référence', 'Client', 'Montant (TND)', 'Date', 'Commentaire']);
      ws.getRow(1).eachCell(c => {
        c.font = { bold: true, color: { argb: C.WHITE } };
        c.fill = fill(C.RED);
        c.alignment = { horizontal: 'center' };
      });
      rejectedList.forEach((ov: any, i: number) => {
        const row = ws.addRow([
          ov.reference || '—',
          ov.bordereau?.client?.name || 'Entrée manuelle',
          ov.montantTotal || 0,
          formatDateFR(ov.dateCreation),
          ov.commentaire || ov.motifObservation || '—',
        ]);
        row.getCell(3).numFmt = '#,##0.000';
        row.eachCell(c => { c.fill = fill(i % 2 === 0 ? C.WHITE : C.RED_BG); });
      });
      ws.columns.forEach(col => { col.width = 24; });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── WORD (.docx) ─────────────────────────────────────────────────────────────
async function generateWordReport(data: ReportExportData, options: ReportSections): Promise<Blob> {
  const { filters, reportData, statusData, slaData, trendData } = data;
  const { total, totalMontant, executed, rejected } = computeKPIs(reportData);
  const NAVY = '1E3A5F';
  const RED = 'B71C1C';

  const headerCell = (text: string, bg = NAVY) => new DocxTableCell({
    shading: { type: ShadingType.CLEAR, fill: bg, color: 'auto' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
  });
  const cell = (text: string) => new DocxTableCell({
    children: [new Paragraph({ children: [new TextRun({ text: text ?? '—', size: 18 })] })],
  });

  const children: any[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: 'ARS TUNISIE — Rapport Financier des Virements', bold: true, color: NAVY })],
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Généré le ${new Date().toLocaleDateString('fr-FR')} — ${buildFilterSummary(filters)}`,
        italics: true, size: 18,
      })],
      spacing: { after: 300 },
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Indicateurs clés' }),
    new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({ children: [headerCell('Indicateur'), headerCell('Valeur')] }),
        new DocxTableRow({ children: [cell('Total Ordres'), cell(String(total))] }),
        new DocxTableRow({ children: [cell('Montant Total'), cell(formatMontant(totalMontant))] }),
        new DocxTableRow({ children: [cell('Exécutés'), cell(`${executed} (${total ? Math.round(executed / total * 100) : 0}%)`)] }),
        new DocxTableRow({ children: [cell('Rejetés'), cell(`${rejected} (${total ? Math.round(rejected / total * 100) : 0}%)`)] }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 300 } }),
  ];

  if (options.includeCharts && statusData?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Répartition par Statut' }));
    children.push(new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({ children: [headerCell('Statut'), headerCell('Nombre'), headerCell('Pourcentage')] }),
        ...statusData.map((s: any) => new DocxTableRow({
          children: [cell(s.name), cell(String(s.count || 0)), cell(`${s.value}%`)],
        })),
      ],
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }

  if (options.includeSLA && slaData?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Conformité SLA par Société' }));
    children.push(new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({ children: [headerCell('Société'), headerCell('À temps'), headerCell('À risque'), headerCell('En retard')] }),
        ...slaData.map((s: any) => new DocxTableRow({
          children: [cell(s.society), cell(`${s.onTime}%`), cell(`${s.atRisk}%`), cell(`${s.overdue}%`)],
        })),
      ],
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }

  if (options.includeCharts && trendData?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Évolution — 7 derniers jours' }));
    children.push(new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({ children: [headerCell('Date'), headerCell('Total'), headerCell('Exécutés'), headerCell('Montant')] }),
        ...trendData.map((t: any) => new DocxTableRow({
          children: [cell(t.date), cell(String(t.total)), cell(String(t.executed)), cell(formatMontant(t.amount))],
        })),
      ],
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }

  if (options.includeDetails && reportData?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Liste des Ordres de Virement' }));
    children.push(new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({ children: [headerCell('Référence'), headerCell('Client'), headerCell('Montant'), headerCell('Statut'), headerCell('Date')] }),
        ...reportData.map((ov: any) => new DocxTableRow({
          children: [
            cell(ov.reference),
            cell(ov.bordereau?.client?.name || 'Entrée manuelle'),
            cell(formatMontant(ov.montantTotal)),
            cell(STATUS_LABELS[ov.etatVirement] || ov.etatVirement),
            cell(formatDateFR(ov.dateCreation)),
          ],
        })),
      ],
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }

  if (options.includeExceptions) {
    const rejectedList = (reportData || []).filter((r: any) => r.etatVirement === 'REJETE');
    if (rejectedList.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Exceptions et Alertes' }));
      children.push(new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxTableRow({ children: [headerCell('Référence', RED), headerCell('Client', RED), headerCell('Montant', RED), headerCell('Date', RED), headerCell('Commentaire', RED)] }),
          ...rejectedList.map((ov: any) => new DocxTableRow({
            children: [
              cell(ov.reference),
              cell(ov.bordereau?.client?.name || 'Entrée manuelle'),
              cell(formatMontant(ov.montantTotal)),
              cell(formatDateFR(ov.dateCreation)),
              cell(ov.commentaire || ov.motifObservation || '—'),
            ],
          })),
        ],
      }));
    }
  }

  const wordDoc = new Document({ sections: [{ children }] });
  return await Packer.toBlob(wordDoc);
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Component ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    society: '',
    donneurOrdre: ''
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [customReportOptions, setCustomReportOptions] = useState({
    includeCharts: true,
    includeDetails: true,
    includeSLA: true,
    includeExceptions: true,
    format: 'pdf'
  });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  // ── Pagination state for the OV table ──
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  // Reset to first page whenever the underlying dataset changes
  useEffect(() => {
    setPage(0);
  }, [reportData]);

  const loadReportData = async () => {
    setLoading(true);
    console.log('🔄 ReportsTab: Loading report data with filters:', filters);
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.society) queryParams.append('societe', filters.society);
      if (filters.donneurOrdre) queryParams.append('donneurOrdre', filters.donneurOrdre);

      const [ordresVirement, suiviVirements, clients] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/suivi-virement/list?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()).catch(() => [])
      ]);

      let filteredData = ordresVirement;
      if (filters.dateFrom || filters.dateTo) {
        filteredData = filteredData.filter((item: any) => {
          const itemDate = new Date(item.dateCreation);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
          const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
          return true;
        });
      }

      if (filters.society) {
        filteredData = filteredData.filter((item: any) =>
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.society.toLowerCase())
        );
      }

      if (filters.donneurOrdre) {
        filteredData = filteredData.filter((item: any) =>
          item.donneurOrdre?.nom?.toLowerCase().includes(filters.donneurOrdre.toLowerCase())
        );
      }

      console.log('📊 ReportsTab: Loaded data:', {
        ordresVirement: ordresVirement.length,
        suiviVirements: suiviVirements.length,
        clients: clients.length
      });

      const realData = filteredData;
      if (realData && realData.length > 0) {
        const statusCounts = realData.reduce((acc: any, item: any) => {
          acc[item.etatVirement] = (acc[item.etatVirement] || 0) + 1;
          return acc;
        }, {});

        const total = realData.length;
        const realStatusData = [
          { name: 'Exécuté',     value: Math.round((statusCounts['EXECUTE'] || 0) / total * 100),            color: '#4caf50', count: statusCounts['EXECUTE'] || 0 },
          { name: 'En validation', value: Math.round((statusCounts['EN_COURS_VALIDATION'] || 0) / total * 100), color: '#2196f3', count: statusCounts['EN_COURS_VALIDATION'] || 0 },
          { name: 'Rejeté',      value: Math.round((statusCounts['REJETE'] || 0) / total * 100),             color: '#f44336', count: statusCounts['REJETE'] || 0 },
          { name: 'Non Exécuté', value: Math.round((statusCounts['NON_EXECUTE'] || 0) / total * 100),        color: '#ff9800', count: statusCounts['NON_EXECUTE'] || 0 }
        ];

        setStatusData(realStatusData);

        const donneurGroups = realData.reduce((acc: any, item: any) => {
          const key = item.donneurOrdre?.nom || 'Unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        const realSlaData = Object.keys(donneurGroups).slice(0, 5).map(society => {
          const items = donneurGroups[society];
          const executed = items.filter((i: any) => i.etatVirement === 'EXECUTE').length;
          const inProgress = items.filter((i: any) => i.etatVirement === 'EN_COURS_VALIDATION').length;
          const failed = items.filter((i: any) => i.etatVirement === 'REJETE').length;
          const total = items.length;
          return {
            society,
            onTime:  Math.round(executed / total * 100),
            atRisk:  Math.round(inProgress / total * 100),
            overdue: Math.round(failed / total * 100)
          };
        });

        setSlaData(realSlaData);

        const trendDays = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dayData = realData.filter((item: any) =>
            new Date(item.dateCreation).toDateString() === date.toDateString()
          );
          trendDays.push({
            date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            total:    dayData.length,
            executed: dayData.filter((i: any) => i.etatVirement === 'EXECUTE').length,
            amount:   dayData.reduce((sum: number, i: any) => sum + (i.montantTotal || 0), 0)
          });
        }

        setTrendData(trendDays);
        setReportData(realData);
        console.log('✅ ReportsTab: Successfully processed real data');
      } else {
        console.log('⚠️ ReportsTab: No real data found');
        setStatusData([]);
        setSlaData([]);
        setTrendData([]);
        setReportData(null);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Failed to load report data:', error);
      setStatusData([]);
      setSlaData([]);
      setTrendData([]);
      setReportData(null);
    } finally {
      setLoading(false);
      console.log('🏁 ReportsTab: Data loading completed');
    }
  };

  // ── Quick export (PDF or Excel) — full report, all sections ──
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!reportData || reportData.length === 0) {
      alert('Aucune donnée à exporter. Modifiez les filtres.');
      return;
    }
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting export with format:', format);

      const exportData: ReportExportData = { filters, reportData, statusData, slaData, trendData };
      const opts: ReportSections = { includeCharts: true, includeDetails: true, includeSLA: true, includeExceptions: true };
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'pdf') {
        const blob = await generatePDFReport(exportData, opts);
        const filename = `rapport_financier_${dateStr}.pdf`;
        saveAs(blob, filename);
        console.log('✅ ReportsTab: PDF export successful:', filename);
      } else {
        const blob = await generateExcelReport(exportData, opts);
        const filename = `rapport_financier_${dateStr}.xlsx`;
        saveAs(blob, filename);
        console.log('✅ ReportsTab: Excel export successful:', filename);
      }
    } catch (error) {
      console.error('❌ ReportsTab: Export failed:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  // ── Custom report — respects the sections & format chosen in the dialog ──
  const handleCustomReport = async () => {
    if (!reportData || reportData.length === 0) {
      alert('Aucune donnée à exporter. Modifiez les filtres.');
      return;
    }
    try {
      setLoading(true);
      console.log('🔄 ReportsTab: Starting custom report generation', customReportOptions);

      const exportData: ReportExportData = { filters, reportData, statusData, slaData, trendData };
      const opts: ReportSections = {
        includeCharts: customReportOptions.includeCharts,
        includeDetails: customReportOptions.includeDetails,
        includeSLA: customReportOptions.includeSLA,
        includeExceptions: customReportOptions.includeExceptions,
      };
      const dateStr = new Date().toISOString().split('T')[0];

      let blob: Blob;
      let filename: string;

      if (customReportOptions.format === 'pdf') {
        blob = await generatePDFReport(exportData, opts);
        filename = `rapport_personnalise_${dateStr}.pdf`;
      } else if (customReportOptions.format === 'excel') {
        blob = await generateExcelReport(exportData, opts);
        filename = `rapport_personnalise_${dateStr}.xlsx`;
      } else {
        blob = await generateWordReport(exportData, opts);
        filename = `rapport_personnalise_${dateStr}.docx`;
      }

      if (blob.size === 0) throw new Error('Le fichier généré est vide');

      saveAs(blob, filename);
      console.log('✅ ReportsTab: Custom report generated successfully:', filename);
      setCustomReportDialog(false);
    } catch (error) {
      console.error('❌ ReportsTab: Custom report failed:', error);
      alert('Erreur lors de la génération du rapport personnalisé: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Paginated slice of the OV list for the table
  const paginatedData: any[] = reportData
    ? reportData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f', letterSpacing: -0.5 }}>
            Historique &amp; Archives des Virements
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Rapports, statistiques et exports des ordres de virement
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadReportData}
          disabled={loading}
          variant="contained"
          size="small"
          sx={{ fontWeight: 600 }}
        >
          Actualiser
        </Button>
      </Box>

      {/* ── Filter Panel ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 3,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          🔍 Filtres Avancés — Société / Date / Donneur / Utilisateur
        </Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date Début"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date Fin"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Société"
              value={filters.society}
              onChange={(e) => setFilters({ ...filters, society: e.target.value })}
              size="small"
              fullWidth
              placeholder="Filtrer par société"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Donneur d'Ordre"
              value={filters.donneurOrdre}
              onChange={(e) => setFilters({ ...filters, donneurOrdre: e.target.value })}
              size="small"
              fullWidth
              placeholder="Filtrer par donneur"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Utilisateur"
              size="small"
              fullWidth
              placeholder="Filtrer par utilisateur"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ dateFrom: '', dateTo: '', society: '', donneurOrdre: '' })}
              size="small"
              fullWidth
              sx={{ height: 40 }}
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
          <CircularProgress sx={{ color: '#1e3a5f' }} />
          <Typography variant="body1" sx={{ ml: 2, color: '#546e7a' }}>Chargement des données...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>

          {/* ── Pie Chart — Répartition par Statut ── */}
          <Grid item xs={12} md={5}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Répartition par Statut
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribution des ordres de virement
                  </Typography>
                </Box>

                {statusData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} formatter={(value: any, name: any) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>

                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      {statusData.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            px: 1.5, py: 0.8,
                            borderRadius: 1.5,
                            bgcolor: `${item.color}12`,
                            border: `1px solid ${item.color}30`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, bgcolor: item.color, borderRadius: '50%', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#37474f' }}>{item.name}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: '#78909c' }}>{item.count || 0} ord.</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: item.color, minWidth: 36, textAlign: 'right' }}>
                              {item.value}%
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Bar Chart — Conformité SLA ── */}
          <Grid item xs={12} md={7}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Conformité SLA par Société
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Analyse des délais d'exécution par donneur d'ordre
                  </Typography>
                </Box>

                {slaData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slaData} barSize={16} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                      <XAxis
                        dataKey="society"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={{ stroke: '#e0e7ef' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<ChartTooltip />} formatter={(value: any) => [`${value}%`]} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                      />
                      <Bar dataKey="onTime"  fill="#4caf50" name="À temps"   radius={[3, 3, 0, 0]} />
                      <Bar dataKey="atRisk"  fill="#ff9800" name="À risque"  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="overdue" fill="#f44336" name="En retard" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Line Chart — Évolution 7 jours ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Évolution des Virements — 7 derniers jours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Volume quotidien et montants traités
                  </Typography>
                </Box>

                {trendData.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260, color: '#90a4ae' }}>
                    <Typography variant="body2">Aucune donnée disponible</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2196f3" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={{ stroke: '#e0e7ef' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: '#546e7a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: '#ff9800' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} formatter={(value: any, name: any) => {
                        if (name === 'Montant') return [`${Number(value).toLocaleString('fr-TN')} TND`, name];
                        return [value, name];
                      }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="total"
                        stroke="#2196f3"
                        strokeWidth={2.5}
                        name="Total"
                        dot={{ r: 4, fill: '#2196f3', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="executed"
                        stroke="#4caf50"
                        strokeWidth={2.5}
                        name="Exécutés"
                        dot={{ r: 4, fill: '#4caf50', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="amount"
                        stroke="#ff9800"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        name="Montant"
                        dot={{ r: 4, fill: '#ff9800', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── OV Records Table (with pagination) ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  pb={1.5}
                  mb={2}
                  sx={{ borderBottom: '2px solid #e8edf5' }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                      📋 Liste des Ordres de Virement
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reportData ? `${Array.isArray(reportData) ? reportData.length : 0} enregistrement(s)` : 'Aucune donnée'}
                    </Typography>
                  </Box>
                </Box>

                {reportData && reportData.length > 0 ? (
                  <>
                    <TableContainer
                      sx={{
                        borderRadius: 1.5,
                        border: '1px solid #dde3ef',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { height: 6, width: 6 },
                        '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
                      }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={HEAD_CELL_SX}>Référence</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Client</TableCell>
                            <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                            <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedData.map((ov: any, index: number) => {
                            const st = getStatusStyle(ov.etatVirement);
                            return (
                              <TableRow
                                key={ov.id ?? index}
                                sx={{
                                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                                  '&:hover': { backgroundColor: '#e8f0fe' },
                                  '&:last-child td': { borderBottom: 0 },
                                }}
                              >
                                <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                  {ov.reference}
                                </TableCell>
                                <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontWeight: 600 }}>
                                  {ov.bordereau?.client?.name || 'Entrée manuelle'}
                                </TableCell>
                                <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                                  {ov.montantTotal?.toLocaleString('fr-TN')}{' '}
                                  <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                                </TableCell>
                                <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                                  <Box
                                    sx={{
                                      display: 'inline-flex', alignItems: 'center',
                                      px: 1, py: 0.3, borderRadius: 1,
                                      fontSize: '0.70rem', fontWeight: 700, whiteSpace: 'nowrap',
                                      backgroundColor: st.bg,
                                      color: st.color,
                                      border: `1px solid ${st.border}`,
                                    }}
                                  >
                                    {st.label}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                                  {new Date(ov.dateCreation).toLocaleDateString('fr-FR')}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={reportData.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25, 50, 100]}
                      labelRowsPerPage="Lignes par page"
                      labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                      sx={{
                        mt: 1,
                        '.MuiTablePagination-toolbar': { pl: 0 },
                      }}
                    />
                  </>
                ) : (
                  <Box
                    sx={{
                      p: 5, textAlign: 'center',
                      bgcolor: '#f8faff', borderRadius: 2,
                      border: '1px dashed #c5d4e8',
                    }}
                  >
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Aucun ordre de virement trouvé
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Modifiez les filtres pour afficher les données
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Export Cards ── */}
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box pb={1.5} mb={2.5} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    📈 Statistiques d'Export
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                    Revoir un ancien ordre de virement, télécharger à nouveau les fichiers, filtrer par société, date, donneur, etc.
                  </Typography>
                </Box>

                <Grid container spacing={2.5}>
                  {/* PDF */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #ef9a9a',
                        borderLeft: '4px solid #f44336',
                        bgcolor: '#fff5f5',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(244,67,54,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#fdecea', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PictureAsPdfIcon sx={{ color: '#f44336' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Rapport PDF</Typography>
                          <Typography variant="caption" color="text.secondary">Rapport complet avec graphiques</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Générer un rapport complet avec tous les traitements enregistrés
                      </Typography>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => handleExport('pdf')}
                        fullWidth
                        disabled={loading || !reportData || reportData.length === 0}
                        sx={{ fontWeight: 600 }}
                      >
                        📄 Générer rapport PDF
                      </Button>
                    </Box>
                  </Grid>

                  {/* Excel */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #a5d6a7',
                        borderLeft: '4px solid #4caf50',
                        bgcolor: '#f0fff4',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(76,175,80,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#e6f4ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <TableViewIcon sx={{ color: '#4caf50' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Export Excel</Typography>
                          <Typography variant="caption" color="text.secondary">Données détaillées pour analyse</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Exporter les données en format Excel pour analyse approfondie
                      </Typography>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<TableViewIcon />}
                        onClick={() => handleExport('excel')}
                        fullWidth
                        disabled={loading || !reportData || reportData.length === 0}
                        sx={{ fontWeight: 600 }}
                      >
                        📈 Exporter Excel
                      </Button>
                    </Box>
                  </Grid>

                  {/* Custom */}
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid #ffcc80',
                        borderLeft: '4px solid #ff9800',
                        bgcolor: '#fff8e1',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(255,152,0,0.12)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '50%',
                          bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <GetAppIcon sx={{ color: '#ff9800' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>Rapport Personnalisé</Typography>
                          <Typography variant="caption" color="text.secondary">Configurer les sections</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Créer un rapport personnalisé avec les sections de votre choix
                      </Typography>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<GetAppIcon />}
                        onClick={() => setCustomReportDialog(true)}
                        fullWidth
                        disabled={!reportData || reportData.length === 0}
                        sx={{ fontWeight: 600 }}
                      >
                        📤 Configurer &amp; Exporter
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}

      {/* ── Custom Report Dialog ── */}
      <Dialog
        open={customReportDialog}
        onClose={() => setCustomReportDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Rapport Personnalisé</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
              Sélectionnez les sections à inclure :
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
              {[
                { key: 'includeCharts',     label: 'Graphiques et statistiques' },
                { key: 'includeDetails',    label: 'Détails des transactions' },
                { key: 'includeSLA',        label: 'Analyse SLA' },
                { key: 'includeExceptions', label: 'Exceptions et alertes' },
              ].map(({ key, label }) => (
                <Box
                  key={key}
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: 1.5,
                    bgcolor: customReportOptions[key as keyof typeof customReportOptions] ? '#f0f4ff' : '#fafafa',
                    border: `1px solid ${customReportOptions[key as keyof typeof customReportOptions] ? '#d0dff5' : '#e0e0e0'}`,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={customReportOptions[key as keyof typeof customReportOptions] as boolean}
                        onChange={(e) => setCustomReportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                        size="small"
                        sx={{ '&.Mui-checked': { color: '#1e3a5f' } }}
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>}
                  />
                </Box>
              ))}
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Format d'export</InputLabel>
              <Select
                value={customReportOptions.format}
                onChange={(e) => setCustomReportOptions(prev => ({ ...prev, format: e.target.value }))}
                label="Format d'export"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="word">Word</MenuItem>
              </Select>
            </FormControl>

            {reportData && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
                Données disponibles : {Array.isArray(reportData) ? reportData.length : 0} enregistrement(s)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setCustomReportDialog(false)} variant="outlined">Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCustomReport}
            disabled={loading || !Object.values(customReportOptions).slice(0, 4).some(Boolean)}
            sx={{ fontWeight: 600 }}
          >
            Générer le rapport
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ReportsTab;