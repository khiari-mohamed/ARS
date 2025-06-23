import React, { useEffect, useState } from 'react';
import { getDocumentAudit } from '../../api/gedService';

interface Props {
  documentId: string;
  onClose: () => void;
}

const DocumentAuditTrail: React.FC<Props> = ({ documentId, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDocumentAudit(documentId)
      .then(setLogs)
      .catch(() => setError('Failed to load audit trail'))
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Audit Trail</h3>
        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
        <ul style={{ maxHeight: 300, overflowY: 'auto' }}>
          {logs.map((log, i) => (
            <li key={i}>
              <b>{log.action}</b> by {log.userId} at {new Date(log.timestamp).toLocaleString()}<br />
              <pre style={{ fontSize: 12 }}>{JSON.stringify(log.details, null, 2)}</pre>
            </li>
          ))}
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default DocumentAuditTrail;
