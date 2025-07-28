import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WireTransferAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any>({ errorTransfers: [], pendingBatches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get('/wire-transfer/alerts')
      .then(res => setAlerts(res.data))
      .catch(err => setError(err?.message || 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="wire-transfer-alerts">
      <h3>Alerts</h3>
      {loading ? <div>Chargement...</div> : error ? <div className="error">{error}</div> : (
        <>
          {alerts.errorTransfers.length > 0 && (
            <div className="alert-error">
              <b>Transfers with Errors:</b>
              <ul>
                {alerts.errorTransfers.map((t: any) => (
                  <li key={t.id}>Transfer {t.id} | Batch {t.batch?.id} | {t.member?.name} | {t.error}</li>
                ))}
              </ul>
            </div>
          )}
          {alerts.pendingBatches.length > 0 && (
            <div className="alert-warning">
              <b>Pending Batches:</b>
              <ul>
                {alerts.pendingBatches.map((b: any) => (
                  <li key={b.id}>Batch {b.id} ({b.transfers.length} transfers)</li>
                ))}
              </ul>
            </div>
          )}
          {alerts.errorBatches.length === 0 && alerts.pendingBatches.length === 0 && <div>No alerts.</div>}
        </>
      )}
    </div>
  );
};

export default WireTransferAlerts;
