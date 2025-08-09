import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import { assignBordereau2 as assignBordereau, fetchUsers } from '../services/bordereauxService';

interface Props {
  bordereauId?: string;
  selectedBordereaux?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauAssignModal: React.FC<Props> = ({ bordereauId, selectedBordereaux, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetchUsers({ role: 'GESTIONNAIRE' });
      setUsers(response || []);
    } catch (error) {
      notify('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      notify('Veuillez sélectionner un utilisateur', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (bordereauId) {
        await assignBordereau(bordereauId, selectedUserId);
        notify('Bordereau assigné avec succès', 'success');
      } else if (selectedBordereaux && selectedBordereaux.length > 0) {
        for (const id of selectedBordereaux) {
          await assignBordereau(id, selectedUserId);
        }
        notify(`${selectedBordereaux.length} bordereau(x) assigné(s) avec succès`, 'success');
      }
      onSuccess();
    } catch (error) {
      notify('Erreur lors de l\'assignation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const bordereauCount = bordereauId ? 1 : (selectedBordereaux?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" 
          onClick={onClose} 
          aria-label="Fermer"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-bold mb-4">
          Assigner {bordereauCount} bordereau{bordereauCount > 1 ? 'x' : ''}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gestionnaire
            </label>
            {loadingUsers ? (
              <div className="text-sm text-gray-500">Chargement...</div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Sélectionner un gestionnaire</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || loadingUsers}
            >
              {loading ? 'Assignation...' : 'Assigner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BordereauAssignModal;