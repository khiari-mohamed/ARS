import React, { useState, useEffect } from 'react';
import { fetchBordereau } from '../services/bordereauxService';

interface BordereauDetailsModalProps {
  bordereauId: string;
  onClose: () => void;
}

const BordereauDetailsModal: React.FC<BordereauDetailsModalProps> = ({ bordereauId, onClose }) => {
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBordereau = async () => {
      try {
        const data = await fetchBordereau(bordereauId);
        setBordereau(data);
      } catch (error) {
        console.error('Error loading bordereau:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBordereau();
  }, [bordereauId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bordereau-details-modal">
      <div className="bordereau-details-content">
        <div className="bordereau-details-header">
          <h2 className="bordereau-details-title">📄 Détails du Bordereau</h2>
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
          {bordereau ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bordereau-details-section">
                <h3>📊 Informations générales</h3>
                <div className="space-y-4">
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Référence</label>
                    <p className="bordereau-details-value">{bordereau.reference}</p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Client</label>
                    <p className="bordereau-details-value">{bordereau.client?.name || 'N/A'}</p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Statut</label>
                    <span className="bordereau-status-badge-large">
                      {bordereau.statut}
                    </span>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Date de réception</label>
                    <p className="bordereau-details-value">
                      {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Délai de règlement</label>
                    <p className="bordereau-details-value">{bordereau.delaiReglement} jours</p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Nombre de BS</label>
                    <p className="bordereau-details-value">{bordereau.nombreBS}</p>
                  </div>
                </div>
              </div>

              <div className="bordereau-details-section">
                <h3>👥 Suivi et affectation</h3>
                <div className="space-y-4">
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Assigné à</label>
                    <p className="bordereau-details-value">
                      {bordereau.assignedToUser?.fullName || 'Non assigné'}
                    </p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Créé par</label>
                    <p className="bordereau-details-value">
                      {bordereau.createdByUser?.fullName || 'N/A'}
                    </p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Date de création</label>
                    <p className="bordereau-details-value">
                      {new Date(bordereau.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="bordereau-details-field">
                    <label className="bordereau-details-label">Dernière mise à jour</label>
                    <p className="bordereau-details-value">
                      {new Date(bordereau.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                <div className="md:col-span-2 bordereau-details-section">
                  <h3>📝 Bulletins de Soin</h3>
                  <div className="overflow-x-auto">
                    <table className="bordereau-bs-table">
                      <thead>
                        <tr>
                          <th>Référence</th>
                          <th>Montant</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bordereau.BulletinSoin.map((bs: any, index: number) => (
                          <tr key={index}>
                            <td>{bs.reference || `BS-${index + 1}`}</td>
                            <td>{bs.montant ? `${bs.montant.toFixed(2)} €` : 'N/A'}</td>
                            <td>
                              <span className="bordereau-status-badge">
                                {bs.statut || 'En cours'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Bordereau non trouvé</p>
            </div>
          )}
        </div>

        <div className="bordereau-details-footer">
          <button
            onClick={onClose}
            className="bordereau-btn-close"
          >
            ✖ Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BordereauDetailsModal;