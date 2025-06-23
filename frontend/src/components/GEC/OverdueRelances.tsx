import React, { useEffect, useState } from 'react';
import { getCourrierSlaBreaches } from '../../api/gecService';
import { getBordereau } from '../../api/bordereauService';
import { Courrier } from '../../types/mail';

const OverdueRelances: React.FC = () => {
  const [relances, setRelances] = useState<Courrier[]>([]);
  const [relanceDetails, setRelanceDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCourrierSlaBreaches().then(async data => {
      // Only RELANCE type and PENDING_RESPONSE, and check per-client SLA
      const pending = (data.pending || []).filter((c: Courrier) => c.type === 'RELANCE' && c.status === 'PENDING_RESPONSE');
      const filtered: Courrier[] = [];
      const details: any[] = [];
      for (const c of pending) {
        if (c.bordereauId && c.sentAt) {
          const bordereau = await getBordereau(c.bordereauId);
          const client = bordereau?.client;
          const slaDays = (client?.slaConfig?.reglementDelay || client?.reglementDelay || 3);
          const sent = new Date(c.sentAt).getTime();
          if (Date.now() - sent > slaDays * 24 * 60 * 60 * 1000) {
            filtered.push(c);
            details.push({
              ...c,
              clientName: client?.name || c.clientId || '-',
              slaDays,
            });
          }
        }
      }
      setRelances(filtered);
      setRelanceDetails(details);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ margin: '2em 0' }}>
      <h3 style={{ color: '#d32f2f' }}>Overdue Relances (Pending Response, Per-Client SLA)</h3>
      <div style={{ fontSize: '0.95em', color: '#b71c1c', marginBottom: 8 }}>
        Overdue relances are determined using each client’s SLA configuration.
      </div>
      {loading ? <div>Loading...</div> : relanceDetails.length === 0 ? <div>No overdue relances.</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Bordereau</th>
              <th>Client</th>
              <th>Sent At</th>
              <th>Client SLA (days)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {relanceDetails.map(r => (
              <tr key={r.id} style={{ background: '#ffebee' }}>
                <td>{r.subject}</td>
                <td>{r.bordereauId || '-'}</td>
                <td>{r.clientName || '-'}</td>
                <td>{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</td>
                <td>{r.slaDays}</td>
                <td>
                  {/* Could add a details button or relance action here */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OverdueRelances;
