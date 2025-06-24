import React, { useEffect, useState } from 'react';
import { getSlaPredictionAI } from '../../services/alertsService';

// Example props: items = [{ id, start_date, deadline, current_progress, total_required, sla_days }]
type SlaPrediction = { id: string; risk: string; score: number; days_left: number };
interface Props { items: SlaPrediction[]; }
const SLAStatusPanel: React.FC<Props> = ({ items }: Props) => {
  const [predictions, setPredictions] = useState<SlaPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!items || !items.length) return;
    setLoading(true);
    getSlaPredictionAI(items)
      .then(data => setPredictions(data.sla_predictions || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [items]);

  if (loading) return <div>Chargement des prédictions SLA...</div>;
  if (error) return <div style={{ color: 'red' }}>Erreur: {error}</div>;
  if (!predictions.length) return <div>Aucune donnée SLA.</div>;

  return (
    <div>
      <h3>Prédiction du risque SLA</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Risque</th>
            <th>Score</th>
            <th>Jours restants</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.risk}</td>
              <td>{p.score}</td>
              <td>{p.days_left}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SLAStatusPanel;
