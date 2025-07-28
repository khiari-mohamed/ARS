import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WireTransferBatchList: React.FC<{ onSelectBatch: (id: string) => void }> = ({ onSelectBatch }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get('/wire-transfer/batch')
      .then(res => setBatches(res.data))
      .catch(err => setError(err?.message || 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="wire-transfer-batch-list">
      <h3>Batches</h3>
      {loading ? <div>Chargement...</div> : error ? <div className="error">{error}</div> : (
        <ul>
          {batches.map(b => (
            <li key={b.id}>
              <button onClick={() => onSelectBatch(b.id)}>
                Batch {b.id} | Status: {b.status} | {b.archived ? 'Archived' : 'Active'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WireTransferBatchList;
