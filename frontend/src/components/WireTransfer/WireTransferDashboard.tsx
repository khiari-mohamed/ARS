import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WireTransferAlerts from './WireTransferAlerts';

const defaultFilters = {
  periodStart: '',
  periodEnd: '',
  state: '',
  companyId: '',
  delayMin: '',
  delayMax: '',
};

const WireTransferDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchAnalytics = () => {
    setLoading(true);
    setError(null);
    axios.get('/wire-transfer/dashboard/analytics', { params: filters })
      .then(res => {
        setAnalytics(res.data.analytics);
        setKpis(res.data.kpis);
      })
      .catch(err => setError(err?.message || 'Erreur'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line
  }, [filters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const url = format === 'excel'
        ? '/wire-transfer/dashboard/analytics/export/excel'
        : '/wire-transfer/dashboard/analytics/export/pdf';
      const response = await axios.get(url, {
        params: filters,
        responseType: 'blob',
      });
      let filename = `wiretransfer_dashboard_export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Export failed.');
    }
  };

  return (
    <div className="wire-transfer-dashboard">
      <h2>Wire Transfer Dashboard</h2>
      <div className="dashboard-filters" style={{ marginBottom: 16 }}>
        <input
          type="date"
          name="periodStart"
          value={filters.periodStart}
          onChange={handleChange}
          placeholder="From date"
          style={{ marginRight: 8 }}
        />
        <input
          type="date"
          name="periodEnd"
          value={filters.periodEnd}
          onChange={handleChange}
          placeholder="To date"
          style={{ marginRight: 8 }}
        />
        <select name="state" value={filters.state} onChange={handleChange} style={{ marginRight: 8 }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSED">Processed</option>
          <option value="ARCHIVED">Archived</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          type="text"
          name="companyId"
          value={filters.companyId}
          onChange={handleChange}
          placeholder="Company ID"
          style={{ marginRight: 8 }}
        />
        <input
          type="number"
          name="delayMin"
          value={filters.delayMin}
          onChange={handleChange}
          placeholder="Min Delay (h)"
          style={{ marginRight: 8, width: 120 }}
        />
        <input
          type="number"
          name="delayMax"
          value={filters.delayMax}
          onChange={handleChange}
          placeholder="Max Delay (h)"
          style={{ marginRight: 8, width: 120 }}
        />
        <button onClick={() => setFilters(defaultFilters)} style={{ marginRight: 8 }}>Reset</button>
        <button onClick={() => handleExport('excel')} style={{ marginRight: 8 }}>Exporter Excel</button>
        <button onClick={() => handleExport('pdf')}>Exporter PDF</button>
      </div>
      {loading ? <div>Chargement...</div> : error ? <div className="error">{error}</div> : (
        <>
          <div className="dashboard-kpis" style={{ marginBottom: 16 }}>
            <b>Total:</b> {kpis.total} | <b>Pending:</b> {kpis.pending} | <b>Processed:</b> {kpis.processed} | <b>Archived:</b> {kpis.archived} | <b>Avg Delay (h):</b> {kpis.avgDelay?.toFixed(1)}
          </div>
          <table className="dashboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Society</th>
                <th>Donneur</th>
                <th>Status</th>
                <th>Delay (h)</th>
                <th>Total Amount</th>
                <th>Transfers</th>
                <th>File</th>
                <th>Created At</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((row: any) => (
                <tr key={row.id} style={{ background: row.color === 'warning' ? '#fff3cd' : row.color === 'danger' ? '#f8d7da' : row.color === 'success' ? '#d4edda' : undefined }}>
                  <td>{row.id}</td>
                  <td>{row.society}</td>
                  <td>{row.donneur}</td>
                  <td>{row.status}</td>
                  <td>{row.delayHours.toFixed(1)}</td>
                  <td>{row.totalAmount}</td>
                  <td>{row.transfersCount}</td>
                  <td>{row.fileName}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{new Date(row.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <WireTransferAlerts />
    </div>
  );
};

export default WireTransferDashboard;
