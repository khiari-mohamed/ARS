import React, { useState, useEffect } from 'react';
import { fetchUsers, bulkAssignBordereaux } from '../services/bordereauxService';
import { useNotification } from '../contexts/NotificationContext';

interface BordereauAssignModalProps {
  bordereauId?: string;
  selectedBordereaux?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauAssignModal: React.FC<BordereauAssignModalProps> = ({ 
  bordereauId, 
  selectedBordereaux, 
  onClose, 
  onSuccess 
}) => {
  const { notify } = useNotification();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers({ role: 'GESTIONNAIRE' });
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error loading users:', error);
        notify('Erreur lors du chargement des utilisateurs', 'error');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const handleAssign = async () => {
    if (!selectedUserId) {
      notify('Veuillez sélectionner un utilisateur', 'warning');
      return;
    }

    setLoading(true);
    try {
      const ids = bordereauId ? [bordereauId] : selectedBordereaux || [];
      await bulkAssignBordereaux(ids, selectedUserId);
      
      const count = ids.length;
      notify(`${count} bordereau(x) assigné(s) avec succès`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de l\'assignation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const borderCount = bordereauId ? 1 : (selectedBordereaux?.length || 0);

  return (
    <div className="bordereau-progress-modal">
      <div className="bordereau-progress-content">
        <div className="bordereau-details-header">
          <h2 className="bordereau-details-title">👥 Assigner Bordereau(x)</h2>
          <button
            onClick={onClose}
            className="bordereau-details-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bordereau-details-body">
          <div className="bordereau-details-section">
            <div className="bordereau-details-field">
              <label className="bordereau-details-label">Nombre de bordereaux</label>
              <p className="bordereau-details-value">{borderCount} bordereau(x) sélectionné(s)</p>
            </div>

            {loadingUsers ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Chargement des utilisateurs...</p>
              </div>
            ) : (
              <div className="bordereau-details-field">
                <label className="bordereau-details-label">Assigner à</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un gestionnaire...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {users.length === 0 && !loadingUsers && (
              <div className="text-center py-4">
                <p className="text-gray-500">Aucun gestionnaire disponible</p>
              </div>
            )}
          </div>
        </div>

        <div className="bordereau-details-footer">
          <button
            onClick={onClose}
            className="bordereau-btn-close"
            disabled={loading}
          >
            ✖ Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedUserId || loadingUsers}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Assignation...' : '✅ Assigner'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BordereauAssignModal;