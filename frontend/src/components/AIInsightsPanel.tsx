import React from "react";
import { AIComplaintAnalysis, AIRecommendations } from "../types/bordereaux";

interface Props {
  aiAnalysis?: AIComplaintAnalysis | null;
  aiRecommendations?: AIRecommendations | null;
}

const AIInsightsPanel: React.FC<Props> = ({ aiAnalysis, aiRecommendations }) => (
  <div className="ai-insights-panel mt-8">
    <h2>Analyse IA des réclamations</h2>
    {aiAnalysis ? (
      <div>
        <div>{aiAnalysis.message}</div>
        {aiAnalysis.analysis && (
          <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
            {JSON.stringify(aiAnalysis.analysis, null, 2)}
          </pre>
        )}
      </div>
    ) : (
      <div className="text-gray-500">Aucune analyse IA disponible.</div>
    )}
    <h2 className="mt-4">Recommandations IA</h2>
    {aiRecommendations ? (
      <div>
        <div>{aiRecommendations.message}</div>
        {aiRecommendations.recommendations && aiRecommendations.recommendations.length > 0 && (
          <ul className="list-disc ml-6">
            {aiRecommendations.recommendations.map((rec, idx) => (
              <li key={idx}>{rec.suggestion || JSON.stringify(rec)}</li>
            ))}
          </ul>
        )}
      </div>
    ) : (
      <div className="text-gray-500">Aucune recommandation IA disponible.</div>
    )}
  </div>
);

export default AIInsightsPanel;