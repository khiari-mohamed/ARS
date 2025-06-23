import React, { useEffect, useState } from 'react';
import { fetchVirementHistory } from '../../api/financeService';
import { VirementHistoryEntry } from '../../types/finance';

interface Props {
  virementId: string;
}

const VirementHistory: React.FC<Props> = ({ virementId }) => {
  const [history, setHistory] = useState<VirementHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchVirementHistory(virementId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [virementId]);

  return (
    <div className="virement-history">
      <h4>Historique</h4>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <ul>
          {history.map((h) => (
            <li key={h.id}>
              <b>{h.action}</b> par {h.user} le {new Date(h.timestamp).toLocaleString('fr-FR')}
              {h.remarks && <> — {h.remarks}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VirementHistory;