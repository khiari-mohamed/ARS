import React, { useState } from 'react';
import { exportAnalytics } from '../../api/analyticsApi';
import { AnalyticsExportDto } from '../../types/analytics';

const ExportButton: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params: AnalyticsExportDto = { format };
      const { filePath } = await exportAnalytics(params);
      window.open(filePath, '_blank');
    } catch (e) {
      alert('Erreur export');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <select value={format} onChange={e => setFormat(e.target.value as any)} className="border p-1">
        <option value="excel">Excel</option>
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        className="px-3 py-1 bg-blue-600 text-white rounded"
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Export...' : 'Exporter'}
      </button>
    </div>
  );
};

export default ExportButton;