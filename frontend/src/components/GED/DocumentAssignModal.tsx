import React, { useState } from 'react';
import { assignDocument } from '../../api/gedService';
import { Document } from '../../types/document';

interface Props {
  document: Document;
  onClose: () => void;
  onAssign: (doc: Document) => void;
}

const DocumentAssignModal: React.FC<Props> = ({ document, onClose, onAssign }) => {
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await assignDocument(document.id, { assignedToUserId, teamId });
      onAssign(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Assignment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Assign Document</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>User ID</label>
            <input value={assignedToUserId} onChange={e => setAssignedToUserId(e.target.value)} placeholder="User ID" />
          </div>
          <div>
            <label>Team ID</label>
            <input value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="Team ID" />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Assigning...' : 'Assign'}</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default DocumentAssignModal;
