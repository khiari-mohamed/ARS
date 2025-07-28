import React, { useState } from 'react';
import axios from 'axios';

const WireTransferUpload: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [societyId, setSocietyId] = useState('');
  const [donneurId, setDonneurId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPreview(null);
    if (!file || !societyId || !donneurId) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('societyId', societyId);
    formData.append('donneurId', donneurId);
    try {
      const res = await axios.post('/wire-transfer/batch/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setError(null);
    setSuccess(null);
    setFinalizing(true);
    const formData = new FormData();
    if (!file) return;
    formData.append('file', file);
    formData.append('societyId', societyId);
    formData.append('donneurId', donneurId);
    try {
      const res = await axios.post('/wire-transfer/batch/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(`Batch uploaded: ${res.data.batch?.id} (${res.data.batch?.transfers?.length || 0} transfers)`);
      setPreview(null);
      setFile(null);
      setSocietyId('');
      setDonneurId('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="wire-transfer-upload">
      <h3>Upload Wire Transfer Batch (TXT)</h3>
      <form onSubmit={handlePreview}>
        <input type="file" accept=".txt" onChange={e => setFile(e.target.files?.[0] || null)} />
        <input type="text" placeholder="Society ID" value={societyId} onChange={e => setSocietyId(e.target.value)} />
        <input type="text" placeholder="Donneur d'Ordre ID" value={donneurId} onChange={e => setDonneurId(e.target.value)} />
        <button type="submit" disabled={loading}>Preview</button>
      </form>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {preview && (
        <div className="preview-section">
          <h4>Preview Data</h4>
          {preview.errors && preview.errors.length > 0 && (
            <div className="error">
              <b>Validation Errors:</b>
              <ul>
                {preview.errors.map((err: any, idx: number) => (
                  <li key={idx}>Line {err.line}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
          {preview.transfers && preview.transfers.length > 0 && (
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>RIB</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {preview.transfers.map((t: any, idx: number) => (
                  <tr key={idx}>
                    <td>{t.code}</td>
                    <td>{t.ref}</td>
                    <td>{t.amount}</td>
                    <td>{t.rib}</td>
                    <td>{t.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview.success && preview.errors.length === 0 && (
            <button onClick={handleFinalize} disabled={finalizing}>Generate & Upload TXT</button>
          )}
        </div>
      )}
    </div>
  );
};

export default WireTransferUpload;
