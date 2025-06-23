import React, { useState } from 'react';
import { tagDocument } from '../../api/gedService';
import { Document } from '../../types/document';

interface Props {
  document: Document;
  onClose: () => void;
  onTag: (doc: Document) => void;
}

const DocumentTagModal: React.FC<Props> = ({ document, onClose, onTag }) => {
  const [type, setType] = useState<string>(document.type || '');
  const [bordereauId, setBordereauId] = useState(document.bordereauId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await tagDocument(document.id, { type, bordereauId });
      onTag(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Tag update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Tag Document</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} required>
              <option value="BS">BS</option>
              <option value="contrat">Contrat</option>
              <option value="justificatif">Justificatif</option>
              <option value="reçu">Reçu</option>
              <option value="courrier">Courrier</option>
            </select>
          </div>
          <div>
            <label>Bordereau ID</label>
            <input value={bordereauId} onChange={e => setBordereauId(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default DocumentTagModal;
