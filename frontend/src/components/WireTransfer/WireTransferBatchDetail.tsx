import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WireTransferBatchDetail: React.FC<{ batchId: string }> = ({ batchId }) => {
  const [batch, setBatch] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/wire-transfer/batch/${batchId}`)
      .then(res => setBatch(res.data))
      .catch(err => setError(err?.message || 'Erreur'))
      .finally(() => setLoading(false));
    axios.get(`/wire-transfer/batch/${batchId}/history`)
      .then(res => setHistory(res.data))
      .catch(() => {});
  }, [batchId]);

  const handleArchive = async () => {
    await axios.patch(`/wire-transfer/batch/${batchId}/archive`);
    window.location.reload();
  };

  const handleDownload = async (type: 'pdf' | 'txt') => {
    const res = await axios.get(`/wire-transfer/batch/${batchId}/download/${type}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data instanceof Blob ? res.data : new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${batchId}.${type}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="wire-transfer-batch-detail">
      <h3>Batch Detail: {batchId}</h3>
      {loading ? <div>Chargement...</div> : error ? <div className="error">{error}</div> : batch && (
        <>
          <div>Status: {batch.status} | Archived: {batch.archived ? 'Yes' : 'No'}</div>
          <div>Society: {batch.society?.name}</div>
          <div>Donneur d'Ordre: {batch.donneur?.name}</div>
          <div>Transfers: {batch.transfers.length}</div>
          <button onClick={() => handleDownload('pdf')}>Download PDF</button>
          <button onClick={() => handleDownload('txt')}>Download TXT</button>
          {!batch.archived && <button onClick={handleArchive}>Archive</button>}
          <h4>Transfers</h4>
          <ul>
            {batch.transfers.map((t: any) => (
              <li key={t.id}>
                {t.member?.name} | {t.member?.rib} | {t.amount} | {t.reference} | Status: {t.status}
              </li>
            ))}
          </ul>
          <h4>Batch History</h4>
          <ul>
            {history.map((h: any) => (
              <li key={h.id}>{h.status} by {h.changedBy || 'system'} at {new Date(h.changedAt).toLocaleString()}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default WireTransferBatchDetail;
