import React from 'react';
import { exportVirements } from '../../api/financeService';
import { VirementSearchParams } from '../../types/finance';

interface Props {
  filters?: VirementSearchParams;
}

const ExportButton: React.FC<Props> = ({ filters }) => {
  const handleExport = async (format: 'excel' | 'pdf') => {
    const blob = await exportVirements(format, filters || {});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'excel' ? 'virements.xlsx' : 'virements.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="export-buttons">
      <button onClick={() => handleExport('excel')}>Exporter Excel</button>
      <button onClick={() => handleExport('pdf')}>Exporter PDF</button>
    </div>
  );
};

export default ExportButton;