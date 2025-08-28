import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@mui/material';
import { GetApp, PictureAsPdf } from '@mui/icons-material';

interface ExportButtonsProps {
  data: any[];
  columns: { label: string; key: string }[];
  fileName?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ data, columns, fileName = 'reclamations' }) => {
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(data.map(row => {
      const obj: any = {};
      columns.forEach(col => { 
        let value = row[col.key];
        if (col.key === 'createdAt' && value) {
          value = new Date(value).toLocaleDateString('fr-FR');
        }
        obj[col.label] = value || '-';
      });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Réclamations');
    XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Rapport des Réclamations', 14, 15);
      doc.setFontSize(10);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 25);
      
      const tableColumn = columns.map(col => col.label);
      const tableRows = data.map(row => 
        columns.map(col => {
          let value = row[col.key];
          if (col.key === 'createdAt' && value) {
            value = new Date(value).toLocaleDateString('fr-FR');
          }
          return value || '-';
        })
      );
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
        margin: { top: 35 }
      });
      
      doc.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Erreur lors de l\'export PDF');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<GetApp />}
        onClick={handleExportExcel}
        size="small"
      >
        Exporter Excel
      </Button>
      <Button
        variant="contained"
        color="error"
        startIcon={<PictureAsPdf />}
        onClick={handleExportPDF}
        size="small"
      >
        Exporter PDF
      </Button>
    </>
  );
};
