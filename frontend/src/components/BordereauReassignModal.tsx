import React, { useState, useEffect } from 'react';
import { fetchUsersWithWorkload, reassignBordereau, fetchBordereau, sendReassignmentNotification } from '../services/bordereauxService';
import { useNotification } from '../contexts/NotificationContext';

interface BordereauReassignModalProps {
  bordereauId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauReassignModal: React.FC<BordereauReassignModalProps> = ({ 
  bordereauId, 
  onClose, 
  onSuccess 
}) => {
  const { notify } = useNotification();
  const [bordereau, setBordereau] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bordereauxData, usersData] = await Promise.all([
          fetchBordereau(bordereauId),
          fetchUsersWithWorkload({ role: 'GESTIONNAIRE' })
        ]);
        
        setBordereau(bordereauxData);
        console.log('=== REASSIGNMENT DEBUG ===');
        console.log('API Response - usersData:', usersData);
        console.log('Users count:', usersData?.length || 0);
        console.log('Users array:', JSON.stringify(usersData, null, 2));
        console.log('Filter used: { role: "GESTIONNAIRE" }');
        console.log('=========================');
        
        setUsers(usersData || []);
        
        if (!usersData || usersData.length === 0) {
          console.warn('❌ No gestionnaires found for reassignment!');
          console.log('Possible issues:');
          console.log('1. No users with role GESTIONNAIRE in database');
          console.log('2. API endpoint /users/with-workload not working');
          console.log('3. Fallback to /users not working');
          console.log('4. Network connectivity issues');
        } else {
          console.log('✅ Successfully loaded', usersData.length, 'gestionnaires');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        notify('Erreur lors du chargement des données', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    // Add debug logging
    console.log('Loading reassignment data for bordereau:', bordereauId);
    loadData();
  }, [bordereauId]);

  const handleReassign = async () => {
    if (!selectedUserId) {
      notify('Veuillez sélectionner un gestionnaire', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Use the dedicated reassignment API
      await reassignBordereau(bordereauId, selectedUserId, comment.trim() || undefined);
      
      // Send notification to the new assignee (optional)
      if (bordereau?.assignedToUserId) {
        try {
          await sendReassignmentNotification(
            bordereauId,
            bordereau.assignedToUserId,
            selectedUserId,
            comment.trim() || undefined
          );
          console.log('✅ Notification sent successfully');
        } catch (notificationError) {
          console.log('⚠️ Notification failed (non-critical):', notificationError);
          // Don't fail the whole operation if notification fails
        }
      }
      
      notify('Bordereau réaffecté avec succès', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de la réaffectation', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="bordereau-details-modal">
        <div className="bordereau-progress-content">
          <div className="bordereau-details-body">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="bordereau-details-modal">
      <div className="bordereau-progress-content" style={{maxWidth: '600px'}}>
        <div className="bordereau-details-header">
          <h2 className="bordereau-details-title">↔️ Réaffecter Bordereau</h2>
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
          {/* Bordereau Details Section */}
          <div className="bordereau-details-section">
            <h3>📋 Détails du bordereau</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bordereau-details-field">
                <label className="bordereau-details-label">Référence</label>
                <p className="bordereau-details-value">{bordereau?.reference}</p>
              </div>
              <div className="bordereau-details-field">
                <label className="bordereau-details-label">Client</label>
                <p className="bordereau-details-value">{bordereau?.client?.name || 'N/A'}</p>
              </div>
              <div className="bordereau-details-field">
                <label className="bordereau-details-label">Statut actuel</label>
                <span className="bordereau-status-badge-large">
                  {bordereau?.statut}
                </span>
              </div>
              <div className="bordereau-details-field">
                <label className="bordereau-details-label">Assigné actuellement à</label>
                <p className="bordereau-details-value">
                  {bordereau?.assignedToUser?.fullName || 'Non assigné'}
                </p>
              </div>
            </div>
          </div>

          {/* New Assignment Section */}
          <div className="bordereau-details-section">
            <h3>👥 Nouveau gestionnaire</h3>
            <div className="bordereau-details-field">
              <label className="bordereau-details-label">Sélectionner un gestionnaire</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                disabled={loading}
              >
                <option value="">-- Choisir un gestionnaire --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} — {user.currentWorkload || 0} dossiers en cours
                  </option>
                ))}
              </select>
              
              {users.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ Aucun gestionnaire trouvé</p>
                  <p className="text-xs text-yellow-600 mt-1">Vérifiez que des utilisateurs avec le rôle GESTIONNAIRE existent</p>
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">{selectedUser.fullName}</p>
                    <p className="text-sm text-blue-700">{selectedUser.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-900">
                      {selectedUser.currentWorkload} dossiers
                    </p>
                    <p className="text-xs text-blue-600">
                      {selectedUser.currentWorkload < 10 ? '🟢 Charge faible' : 
                       selectedUser.currentWorkload < 15 ? '🟡 Charge normale' : 
                       '🔴 Charge élevée'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div className="bordereau-details-section">
            <h3>💬 Commentaire (optionnel)</h3>
            <div className="bordereau-details-field">
              <label className="bordereau-details-label">Motif de la réaffectation</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Gestionnaire absent, surcharge détectée, expertise requise..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ce commentaire sera enregistré pour la traçabilité
              </p>
            </div>
          </div>

          {/* Summary Section */}
          {selectedUser && (
            <div className="bordereau-details-section bg-green-50 border-green-200">
              <h3>✅ Résumé de la réaffectation</h3>
              <div className="text-sm space-y-1">
                <p><strong>De:</strong> {bordereau?.assignedToUser?.fullName || 'Non assigné'}</p>
                <p><strong>Vers:</strong> {selectedUser.fullName} ({selectedUser.email})</p>
                <p><strong>Charge actuelle:</strong> {selectedUser.currentWorkload} dossiers</p>
                {comment && <p><strong>Motif:</strong> {comment}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="bordereau-details-footer">
          <button
            onClick={onClose}
            className="bordereau-btn-close"
            disabled={loading}
          >
            ❌ Annuler
          </button>
          <button
            onClick={handleReassign}
            disabled={loading || !selectedUserId}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Réaffectation...' : '✅ Confirmer la réaffectation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BordereauReassignModal;