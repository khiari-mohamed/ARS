import React, { useState } from 'react';
import { usePriorityScoring } from '../../hooks/useAnalytics';

const PriorityScoreList: React.FC = () => {
  const [type, setType] = useState('');
  const { data = [], isLoading, error } = usePriorityScoring(type ? { type } : {});
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Classement de priorité (IA)</h3>
      <input
        className="border p-1 mb-2"
        placeholder="Type (RECLAMATION, RELANCE, etc.)"
        value={type}
        onChange={e => setType(e.target.value)}
      />
      {isLoading && <div>Chargement...</div>}
      {error && <div className="text-red-600">Erreur chargement scoring</div>}
      <ul className="list-disc ml-6">
        {data.length === 0 ? (
          <li className="text-gray-500">Aucun bordereau</li>
        ) : (
          data.map((item: any) => (
            <li key={item.id}>
              Bordereau #{item.id} - Score: <span className="font-bold">{item.priorityScore}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
export default PriorityScoreList;
