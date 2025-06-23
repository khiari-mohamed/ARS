import React from 'react';
import { useAlerts } from '../../hooks/useAnalytics';
import LoadingSpinner from '../LoadingSpinner';

const AlertsPanel: React.FC = () => {
  const { data, isLoading, error } = useAlerts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Erreur chargement alertes</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Alertes SLA</h2>
      <div className="mb-4">
        <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
        <span className="font-semibold">Critique (délai &gt; 5j):</span>
        <ul className="list-disc ml-6">
          {data?.critical.map((b, i) => (
            <li key={i}>
              Bordereau #{b.id} - {b.nomSociete} - Délai: {b.delaiReglement}j
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="inline-block w-3 h-3 bg-orange-400 rounded-full mr-2"></span>
        <span className="font-semibold">Alerte (délai 3-5j):</span>
        <ul className="list-disc ml-6">
          {data?.warning.map((b, i) => (
            <li key={i}>
              Bordereau #{b.id} - {b.nomSociete} - Délai: {b.delaiReglement}j
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AlertsPanel;