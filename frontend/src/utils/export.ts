import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// TypeScript augmentation for jsPDF autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(columns: string[], data: any[], filename: string) {
  const doc = new jsPDF();
  doc.autoTable({
    head: [columns],
    body: data.map(row => columns.map(col => row[col])),
  });
  doc.save(`${filename}.pdf`);
}