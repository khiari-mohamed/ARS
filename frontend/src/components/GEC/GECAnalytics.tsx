import React, { useEffect, useState } from 'react';
import {
  getCourrierVolume,
  getCourrierSlaBreaches,
  getCourrierRecurrence,
  getCourrierEscalations,
} from '../../api/gecService';
import { LocalAPI } from '../../services/axios';

const GECAnalytics: React.FC = () => {
  const [volume, setVolume] = useState<any>({});
  const [sla, setSla] = useState<any>({});
  const [recurrence, setRecurrence] = useState<any>({});
  const [escalations, setEscalations] = useState<any>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getCourrierVolume().then(setVolume);
    getCourrierSlaBreaches().then(setSla);
    getCourrierRecurrence().then(setRecurrence);
    getCourrierEscalations().then(setEscalations);
  }, []);

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const res = await LocalAPI.get('/analytics/export', { params: { format } });
      const url = res.data.filePath;
      // Secure download with token
      const axios = await import('axios');
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await axios.default.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      const disposition = response.headers['content-disposition'];
      let filename = 'export.' + format;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert('Erreur export');
    }
    setExporting(false);
  };

  return (
    <div style={{ margin: '2em 0' }}>
      <h2>GEC Analytics Dashboard</h2>
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8 }}>
          <h4>Volume by Status</h4>
          <ul>
            {(volume.byStatus || []).map((v: any) => (
              <li key={v.status}>{v.status}: {v._count.id}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8 }}>
          <h4>Volume by Type</h4>
          <ul>
            {(volume.byType || []).map((v: any) => (
              <li key={v.type}>{v.type}: {v._count.id}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8 }}>
          <h4>By User</h4>
          <ul>
            {(volume.byUser || []).map((v: any) => (
              <li key={v.uploadedById}>{v.uploadedById}: {v._count.id}</li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h4>SLA Breaches (Pending, Per-Client SLA)</h4>
        <div style={{ fontSize: '0.95em', color: '#b71c1c', marginBottom: 8 }}>
          SLA breaches are calculated using each client’s specific SLA configuration.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Sent At</th>
              <th>Type</th>
              {sla.pending && sla.pending.length > 0 && sla.pending[0].client && <th>Client</th>}
              {sla.pending && sla.pending.length > 0 && sla.pending[0].clientSla && <th>Client SLA (days)</th>}
            </tr>
          </thead>
          <tbody>
            {(sla.pending || []).map((c: any) => (
              <tr key={c.id} style={{ background: '#ffebee' }}>
                <td>{c.subject}</td>
                <td>{c.status}</td>
                <td>{c.sentAt ? new Date(c.sentAt).toLocaleString() : '-'}</td>
                <td>{c.type}</td>
                {c.client && <td>{c.client}</td>}
                {c.clientSla && <td>{c.clientSla}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h4>Recurrence (Multiple Relances/Reclamations)</h4>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <strong>Relances &gt; 1:</strong>
            <ul>
              {(recurrence.relances || []).map((r: any) => (
                <li key={r.bordereauId}>Bordereau: {r.bordereauId} ({r._count.id})</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Reclamations &gt; 1:</strong>
            <ul>
              {(recurrence.reclamations || []).map((r: any) => (
                <li key={r.bordereauId}>Bordereau: {r.bordereauId} ({r._count.id})</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h4>Escalations</h4>
        <div>
          <strong>Relances Escalated (&gt;2):</strong>
          <ul>
            {(escalations.escalatedRelances || []).map((e: any) => (
              <li key={e.bordereauId}>Bordereau: {e.bordereauId} ({e._count.id})</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Failed Courriers:</strong>
          <ul>
            {(escalations.failed || []).map((f: any) => (
              <li key={f.id}>{f.subject} (ID: {f.id})</li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ margin: '2em 0' }}>
        <h4>Export Analytics</h4>
        <button className="btn" onClick={() => handleExport('csv')} disabled={exporting}>Export CSV</button>
        <button className="btn" onClick={() => handleExport('pdf')} disabled={exporting} style={{ marginLeft: 8 }}>Export PDF</button>
        <button className="btn" onClick={() => handleExport('excel')} disabled={exporting} style={{ marginLeft: 8 }}>Export Excel</button>
      </div>
    </div>
  );
};

export default GECAnalytics;
