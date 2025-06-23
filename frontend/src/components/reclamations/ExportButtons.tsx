import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExportButtonsProps {
  data: any[];
  columns: { label: string; key: string }[];
  fileName?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ data, columns, fileName = 'reclamations' }) => {
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(row => {
      const obj: any = {};
      columns.forEach(col => { obj[col.label] = row[col.key]; });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableColumn = columns.map(col => col.label);
    const tableRows = data.map(row => columns.map(col => row[col.key]));
    (doc as any).autoTable({ head: [tableColumn], body: tableRows });
    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="flex gap-2 my-2">
      <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={handleExportExcel}>
        Exporter Excel
      </button>
      <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleExportPDF}>
        Exporter PDF
      </button>
    </div>
  );
};
