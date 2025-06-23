import React, { useEffect, useState } from 'react';
import { fetchVirementById, confirmVirement } from '../../api/financeService';
import { Virement } from '../../types/finance';

interface Props {
  virementId: string | null;
  onClose: () => void;
}

const VirementFormModal: React.FC<Props> = ({ virementId, onClose }) => {
  const [virement, setVirement] = useState<Virement | null>(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (virementId) {
      setLoading(true);
      fetchVirementById(virementId)
        .then((data) => {
          setVirement(data);
          setRemarks(data.remarks || '');
        })
        .catch((err) => setError(err.message || 'Erreur'))
        .finally(() => setLoading(false));
    }
  }, [virementId]);

  const handleConfirm = async () => {
    if (!virement) return;
    setLoading(true);
    try {
      await confirmVirement(virement.id, remarks);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la confirmation');
    } finally {
      setLoading(false);
    }
  };

  if (!virement) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Confirmer le virement</h3>
        <p>
          <b>Client:</b> {virement.clientName}<br />
          <b>Montant:</b> {virement.amount}<br />
          <b>Référence:</b> {virement.reference}
        </p>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarques (optionnel)"
        />
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>Annuler</button>
          <button onClick={handleConfirm} disabled={loading}>
            Confirmer
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
      <style>{`
        .modal { position: fixed; top:0; left:0; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal-content { background:#fff; padding:2rem; border-radius:8px; min-width:300px; position:relative; }
        .modal-backdrop { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:999; }
        .modal-actions { margin-top:1rem; display:flex; gap:1rem; }
      `}</style>
    </div>
  );
};

export default VirementFormModal;