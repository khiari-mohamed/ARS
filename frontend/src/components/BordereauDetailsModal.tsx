import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Progress, Card, Row, Col, Tag, Table, Button, message } from 'antd';
import { fetchBordereau } from '../services/bordereauxService';

interface BordereauDetailsModalProps {
  bordereauId: string;
  open: boolean;
  onClose: () => void;
}

const BordereauDetailsModal: React.FC<BordereauDetailsModalProps> = ({ bordereauId, open, onClose }) => {
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any>(null);

  useEffect(() => {
    if (!open || !bordereauId) return;
    
    const loadBordereau = async () => {
      try {
        const data = await fetchBordereau(bordereauId);
        setBordereau(data);
        
        // Calculate progress data
        if (data.BulletinSoin) {
          const total = data.BulletinSoin.length;
          const traites = data.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length;
          const rejetes = data.BulletinSoin.filter((bs: any) => bs.etat === 'REJECTED').length;
          const enCours = total - traites - rejetes;
          const completionRate = total > 0 ? Math.round(((traites + rejetes) / total) * 100) : 0;
          
          let scanStatus = 'NON_SCANNE';
          if (completionRate > 0 && completionRate < 100) scanStatus = 'SCAN_EN_COURS';
          if (completionRate === 100) scanStatus = 'SCAN_FINALISE';
          
          setProgressData({ total, traites, rejetes, enCours, completionRate, scanStatus });
        } else {
          // Default progress data when no BS available
          const completionRate = data?.statut === 'CLOTURE' ? 100 : 
                                data?.statut === 'TRAITE' ? 80 : 
                                data?.statut === 'EN_COURS' ? 50 : 0;
          let scanStatus = 'NON_SCANNE';
          if (data?.statut === 'SCAN_EN_COURS') scanStatus = 'SCAN_EN_COURS';
          if (data?.statut === 'SCANNE' || completionRate > 0) scanStatus = 'SCAN_FINALISE';
          
          setProgressData({ 
            total: data.nombreBS || 0, 
            traites: 0, 
            rejetes: 0, 
            enCours: data.nombreBS || 0, 
            completionRate, 
            scanStatus 
          });
        }
      } catch (error) {
        console.error('Error loading bordereau:', error);
        message.error('Erreur lors du chargement du bordereau');
      } finally {
        setLoading(false);
      }
    };

    loadBordereau();
  }, [bordereauId, open]);

  const getScanStatusColor = (status: string) => {
    switch (status) {
      case 'NON_SCANNE': return 'orange';
      case 'SCAN_EN_COURS': return 'blue';
      case 'SCAN_FINALISE': return 'green';
      default: return 'default';
    }
  };

  const getScanStatusText = (status: string) => {
    switch (status) {
      case 'NON_SCANNE': return 'Non scanné';
      case 'SCAN_EN_COURS': return 'Scan en cours';
      case 'SCAN_FINALISE': return 'Scan finalisé';
      default: return status;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#52c41a';
    if (percentage >= 75) return '#1890ff';
    if (percentage >= 50) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <Modal
      title={`Bordereau ${bordereau?.reference || ''} - Détails et Progression`}
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          Fermer
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      ) : bordereau ? (
        <div>

        <div className="bordereau-details-body">
          {bordereau ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enhanced Progression Section */}
              {progressData && (
                <div className="md:col-span-2 bordereau-details-section">
                  <h3>📊 Progression du Bordereau</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Tag color={getScanStatusColor(progressData.scanStatus)} className="text-sm px-3 py-1">
                          🏷️ {getScanStatusText(progressData.scanStatus)}
                        </Tag>
                        <span className="text-lg font-semibold">
                          📈 {progressData.completionRate}% complété
                        </span>
                      </div>
                    </div>
                    
                    <Progress 
                      percent={progressData.completionRate} 
                      strokeColor={getProgressColor(progressData.completionRate)}
                      showInfo={false}
                    />
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{progressData.traites}</div>
                        <div className="text-sm text-green-700">📊 Traités</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{progressData.rejetes}</div>
                        <div className="text-sm text-red-700">📊 Rejetés</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{progressData.enCours}</div>
                        <div className="text-sm text-blue-700">📊 En cours</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                          <th>🏷️ Scan Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bordereau.BulletinSoin.map((bs: any, index: number) => (
                          <tr key={index}>
                            <td>{bs.reference || `BS-${index + 1}`}</td>
                            <td>{bs.montant ? `${bs.montant.toFixed(2)} €` : 'N/A'}</td>
                            <td>
                              <Tag color={bs.etat === 'VALIDATED' ? 'green' : bs.etat === 'REJECTED' ? 'red' : 'blue'}>
                                {bs.etat === 'VALIDATED' ? 'Validé' : bs.etat === 'REJECTED' ? 'Rejeté' : 'En cours'}
                              </Tag>
                            </td>
                            <td>
                              <Tag color={bs.etat === 'VALIDATED' ? 'green' : bs.etat === 'REJECTED' ? 'orange' : 'blue'}>
                                {bs.etat === 'VALIDATED' ? 'Scan finalisé' : bs.etat === 'REJECTED' ? 'Scan en cours' : 'Non scanné'}
                              </Tag>
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

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>Bordereau non trouvé</p>
        </div>
      )}
    </Modal>
  );
};

export default BordereauDetailsModal;