import React, { useEffect, useState } from 'react';
import { User } from '../../types/user.d';
import { UserBadge } from './UserBadge';
import { fetchUserAuditLogs, AuditLog } from '../../api/usersApi';

interface UserDetailProps {
  user: User;
  onClose: () => void;
}

export const UserDetail: React.FC<UserDetailProps> = ({ user, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUserAuditLogs(user.id)
      .then(setLogs)
      .catch(e => setError(e.message || 'Erreur lors du chargement de l\'historique'))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="modal">
      <div className="modal-content" style={{ minWidth: 350 }}>
        <h2>
          Profil utilisateur
          <button style={{ float: 'right' }} onClick={onClose}>&times;</button>
        </h2>
        <div>
          <strong>Nom complet:</strong> {user.fullName}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Rôle:</strong> <UserBadge role={user.role} />
        </div>
        <div>
          <strong>Département:</strong> {user.department || <span style={{ color: '#888' }}>-</span>}
        </div>
        <div>
          <strong>État:</strong>{' '}
          <span className={`user-state ${user.active ? 'active' : 'inactive'}`}>
            {user.active ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div>
          <strong>Créé le:</strong> {new Date(user.createdAt).toLocaleString()}
        </div>
        <div>
          <strong>Dernière modification:</strong> {new Date(user.updatedAt).toLocaleString()}
        </div>
        <div style={{ marginTop: 24 }}>
          <strong>Historique des actions :</strong>
          {loading && <div>Chargement...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {!loading && !error && logs.length === 0 && <div>Aucune action trouvée.</div>}
          {!loading && !error && logs.length > 0 && (
            <ul className="audit-log-list">
              {logs.slice(0, 10).map(log => (
                <li key={log.id}>
                  <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleString()}</span> —
                  <span style={{ marginLeft: 8 }}>{log.action}</span>
                  {log.details && (
                    <span style={{ marginLeft: 8, color: '#666', fontSize: '90%' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};