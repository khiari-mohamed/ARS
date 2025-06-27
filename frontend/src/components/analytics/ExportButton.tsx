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
      // Download the file as blob using authenticated request
      const axios = await import('axios');
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await axios.default.get(filePath, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Try to extract filename from response headers or fallback
      const disposition = response.headers['content-disposition'];
      let filename = 'export.' + format;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
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