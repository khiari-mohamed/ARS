import React, { useState } from 'react';
import { progressToNextStage, batchUpdateStatus } from '../services/bordereauxService';
import { useNotification } from '../contexts/NotificationContext';

interface BordereauProgressModalProps {
  bordereau: any;
  onClose: () => void;
  onSuccess: () => void;
}

const BordereauProgressModal: React.FC<BordereauProgressModalProps> = ({ bordereau, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);

  const getNextStatusOptions = (currentStatus: string) => {
    const transitions: Record<string, Array<{value: string, label: string, description: string}>> = {
      'EN_ATTENTE': [
        { value: 'A_SCANNER', label: 'À scanner', description: 'Envoyer au service SCAN' }
      ],
      'A_SCANNER': [
        { value: 'SCAN_EN_COURS', label: 'Scan en cours', description: 'Démarrer le processus de scan' }
      ],
      'SCAN_EN_COURS': [
        { value: 'SCANNE', label: 'Scanné', description: 'Marquer comme scanné et terminé' }
      ],
      'SCANNE': [
        { value: 'A_AFFECTER', label: 'À affecter', description: 'Prêt pour affectation' }
      ],
      'A_AFFECTER': [
        { value: 'ASSIGNE', label: 'Assigné', description: 'Affecter à un gestionnaire' }
      ],
      'ASSIGNE': [
        { value: 'EN_COURS', label: 'En cours', description: 'Démarrer le traitement' }
      ],
      'EN_COURS': [
        { value: 'TRAITE', label: 'Traité', description: 'Marquer comme traité' },
        { value: 'MIS_EN_INSTANCE', label: 'Mis en instance', description: 'Suspendre temporairement' },
        { value: 'REJETE', label: 'Rejeté', description: 'Rejeter le dossier' }
      ],
      'TRAITE': [
        { value: 'PRET_VIREMENT', label: 'Prêt virement', description: 'Prêt pour le virement' }
      ],
      'PRET_VIREMENT': [
        { value: 'VIREMENT_EN_COURS', label: 'Virement en cours', description: 'Lancer le virement' }
      ],
      'VIREMENT_EN_COURS': [
        { value: 'VIREMENT_EXECUTE', label: 'Virement exécuté', description: 'Virement terminé avec succès' },
        { value: 'VIREMENT_REJETE', label: 'Virement rejeté', description: 'Virement échoué' }
      ],
      'VIREMENT_EXECUTE': [
        { value: 'CLOTURE', label: 'Clôturé', description: 'Clôturer le dossier' }
      ]
    };

    return transitions[currentStatus] || [];
  };

  const handleProgressTo = async (newStatus: string) => {
    setLoading(true);
    try {
      await batchUpdateStatus([bordereau.id], newStatus);
      notify(`Bordereau progressé vers "${newStatus}"`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de la progression', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoProgress = async () => {
    setLoading(true);
    try {
      await progressToNextStage(bordereau.id);
      notify('Bordereau progressé automatiquement', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de la progression automatique', 'error');
    } finally {
      setLoading(false);
    }
  };

  const nextOptions = getNextStatusOptions(bordereau.statut);

  return (
    <div className="bordereau-progress-modal">
      <div className="bordereau-progress-content">
        <div className="bordereau-details-header">
          <h2 className="bordereau-details-title">⚡ Progresser le Bordereau</h2>
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
              <label className="bordereau-details-label">Bordereau</label>
              <p className="bordereau-details-value">{bordereau.reference}</p>
            </div>
            <div className="bordereau-details-field">
              <label className="bordereau-details-label">Statut actuel</label>
              <span className="bordereau-status-badge-large">
                {bordereau.statut}
              </span>
            </div>
          </div>

          {nextOptions.length > 0 ? (
            <div className="bordereau-details-section">
              <h3>🎯 Choisir la prochaine étape</h3>
              
              <div className="bordereau-progress-option bordereau-progress-auto" onClick={handleAutoProgress}>
                <div className="bordereau-progress-icon">
                  <span>🚀</span>
                </div>
                <div className="bordereau-progress-text">
                  <h4>Progression automatique</h4>
                  <p>Suivre le workflow standard</p>
                </div>
              </div>

              {nextOptions.map((option) => (
                <div
                  key={option.value}
                  className="bordereau-progress-option bordereau-progress-manual"
                  onClick={() => handleProgressTo(option.value)}
                >
                  <div className="bordereau-progress-icon">
                    <span>➡️</span>
                  </div>
                  <div className="bordereau-progress-text">
                    <h4>{option.label}</h4>
                    <p>{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bordereau-details-section text-center">
              <p className="bordereau-details-value">⚠️ Aucune progression possible depuis ce statut</p>
            </div>
          )}
        </div>

        <div className="bordereau-details-footer">
          <button
            onClick={onClose}
            className="bordereau-btn-close"
          >
            ✖ Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default BordereauProgressModal;