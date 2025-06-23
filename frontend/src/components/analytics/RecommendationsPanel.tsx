import React from 'react';
import { useRecommendations, useEnhancedRecommendations } from '../../hooks/useAnalytics';
import LoadingSpinner from '../LoadingSpinner';

const RecommendationsPanel: React.FC = () => {
  // Try enhanced first, fallback to base if not available
  const { data: enhanced, isLoading: loadingEnhanced, error: errorEnhanced } = useEnhancedRecommendations();
  const { data, isLoading, error } = useRecommendations();

  if (loadingEnhanced || isLoading) return <LoadingSpinner />;
  if (errorEnhanced && error) return <div className="text-red-600">Erreur chargement recommandations</div>;

  const rec = enhanced || data;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Recommandations IA</h2>
      <div className="mb-2">
        <span className="font-semibold">Prévision semaine prochaine:</span>
        <span className="ml-2">{rec?.forecast?.nextWeekForecast ?? '-'}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Effectif recommandé:</span>
        <span className="ml-2">{rec?.neededStaff ?? '-'}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Conseil:</span>
        <span className="ml-2">{rec?.recommendation ?? '-'}</span>
      </div>
      {rec?.tips && (
        <div className="mb-2">
          <span className="font-semibold">Tips IA:</span>
          <ul className="list-disc ml-6">
            {rec.tips.map((tip: string, i: number) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RecommendationsPanel;
