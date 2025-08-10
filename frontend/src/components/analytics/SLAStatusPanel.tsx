import React, { useEffect, useState } from 'react';
// Removed non-existent getSlaPredictionAI import

// Example props: items = [{ id, start_date, deadline, current_progress, total_required, sla_days }]
type SlaPrediction = { id: string; risk: string; score: number; days_left: number };
interface Props { items: SlaPrediction[]; }
const SLAStatusPanel: React.FC<Props> = ({ items }: Props) => {
  const [predictions, setPredictions] = useState<SlaPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock SLA prediction function
  const getSlaPredictionAI = async (items: SlaPrediction[]) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock predictions based on input items
    const sla_predictions = items.map(item => ({
      ...item,
      risk: item.score > 70 ? 'HIGH' : item.score > 40 ? 'MEDIUM' : 'LOW',
      days_left: Math.max(0, item.days_left - Math.floor(Math.random() * 5))
    }));
    
    return { sla_predictions };
  };

  useEffect(() => {
    if (!items || !items.length) return;
    setLoading(true);
    getSlaPredictionAI(items)
      .then((data: any) => setPredictions(data.sla_predictions || []))
      .catch((e: any) => setError(e.message))
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
