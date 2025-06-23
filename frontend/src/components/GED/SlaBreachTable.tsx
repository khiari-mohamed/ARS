import React, { useEffect, useState } from 'react';
import { getSlaBreaches } from '../../api/gedService';
import { Document } from '../../types/document';

const SlaBreachTable: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSlaBreaches()
      .then(setDocs)
      .catch(() => setError('Failed to load SLA breaches'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h4>SLA Breaches</h4>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      <table className="sla-breach-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Uploader</th>
            <th>Uploaded At</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(doc => (
            <tr key={doc.id} style={{ background: '#ffeaea' }}>
              <td>{doc.name}</td>
              <td>{doc.type}</td>
              <td>{doc.uploader?.fullName || '-'}</td>
              <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
              <td>{doc.status || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SlaBreachTable;
