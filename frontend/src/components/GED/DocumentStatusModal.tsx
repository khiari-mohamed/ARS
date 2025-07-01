import React, { useState } from 'react';
import { updateDocumentStatus } from '../../api/gedService';
import { Document } from '../../types/document';

interface Props {
  document: Document;
  onClose: () => void;
  onStatus: (doc: Document) => void;
}

const DocumentStatusModal: React.FC<Props> = ({ document, onClose, onStatus }) => {
  const [status, setStatus] = useState(document.status || 'uploaded');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await updateDocumentStatus(document.id, status);
      onStatus(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Update Document Status</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} required>
              <option value="UPLOADED">Uploaded</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITE">Traité</option>
              <option value="REJETE">Rejeté</option>
              <option value="RETOUR_ADMIN">Retour corbeille Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default DocumentStatusModal;
