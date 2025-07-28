import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface LogEntry {
  id: string;
  action: string;
  details: any;
  timestamp: string;
}

const PaperStreamDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        // Assumes backend exposes /api/audit-logs?filter=PAPERSTREAM
        const res = await axios.get('/api/audit-logs', { params: { filter: 'PAPERSTREAM', limit: 20 } });
        setLogs(res.data || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Export handlers
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const response = await axios.get(`/dashboard/export`, {
        params: { format },
        responseType: 'blob',
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `dashboard_export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed.');
    }
  };

  return (
    <div style={{ margin: '24px 0' }}>
      <h3>PaperStream Import Logs</h3>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => handleExport('excel')} style={{ marginRight: 8 }}>Exporter Excel</button>
        <button onClick={() => handleExport('pdf')}>Exporter PDF</button>
      </div>
      {loading && <div>Loading logs...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Time</th>
            <th>Action</th>
            <th>File</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.action.replace('PAPERSTREAM_', '')}</td>
              <td>{log.details?.filePath || '-'}</td>
              <td>{log.details?.details || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaperStreamDashboard;
