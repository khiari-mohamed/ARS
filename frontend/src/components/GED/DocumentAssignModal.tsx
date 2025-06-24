import React, { useState, useEffect } from 'react';
import { assignDocument } from '../../api/gedService';
import { Document } from '../../types/document';
import { LocalAPI } from '../../services/axios';
import { Select, MenuItem, InputLabel, FormControl } from '@mui/material';

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
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
      .then(res => setUsers(res.data || []))
      .catch(() => setUsers([]));
    // If you have teams endpoint, uncomment below:
    // LocalAPI.get('/teams').then(res => setTeams(res.data || []));
  }, []);

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
          <FormControl fullWidth style={{ marginBottom: 16 }}>
            <InputLabel id="assignedToUserId-label">User</InputLabel>
            <Select
              labelId="assignedToUserId-label"
              value={assignedToUserId}
              onChange={e => setAssignedToUserId(e.target.value)}
              label="User"
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth style={{ marginBottom: 16 }}>
            <InputLabel id="teamId-label">Team</InputLabel>
            <Select
              labelId="teamId-label"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              label="Team"
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {teams.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <button type="submit" disabled={loading}>{loading ? 'Assigning...' : 'Assign'}</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default DocumentAssignModal;
