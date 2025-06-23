import React from 'react';
import { useThroughputGap } from '../../hooks/useAnalytics';

const ThroughputGapKPI: React.FC = () => {
  const { data, isLoading, error } = useThroughputGap();
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">Erreur chargement throughput gap</div>;
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col items-center">
      <div className="text-lg font-bold mb-2">Écart Prévu/Réalisé</div>
      <div className="flex gap-4 mb-2">
        <div>
          <div className="text-xs text-gray-500">Prévu</div>
          <div className="text-xl font-bold text-blue-600">{data?.planned ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Réalisé</div>
          <div className="text-xl font-bold text-green-600">{data?.actual ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Écart</div>
          <div className={`text-xl font-bold ${(data?.gap ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{data?.gap ?? '-'}</div>
        </div>
      </div>
    </div>
  );
};
export default ThroughputGapKPI;
