import React, { useEffect, useState } from 'react';
import { fetchVirementById, linkBordereauxToVirement, fetchBordereauxByClient } from '../../api/financeService';
import { Virement, Bordereau } from '../../types/finance';

interface Props {
  virementId: string;
}

const VirementReconciliationPanel: React.FC<Props> = ({ virementId }) => {
  const [virement, setVirement] = useState<Virement | null>(null);
  const [bordereaux, setBordereaux] = useState<Bordereau[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVirementById(virementId).then((v) => {
      setVirement(v);
      setSelected(v.linkedBordereaux?.map((b) => b.id) || []);
      if (v.clientId) {
        fetchBordereauxByClient(v.clientId).then(setBordereaux);
      }
    });
  }, [virementId]);

  const handleChange = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!virement) return;
    setLoading(true);
    await linkBordereauxToVirement(virement.id, selected);
    setLoading(false);
  };

  return (
    <div className="virement-reconciliation">
      <h4>Rapprochement Bordereaux</h4>
      <ul>
        {bordereaux.map((b) => (
          <li key={b.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                onChange={() => handleChange(b.id)}
              />
              {b.reference} — {b.totalAmount}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={handleSave} disabled={loading}>
        Sauvegarder
      </button>
    </div>
  );
};

export default VirementReconciliationPanel;