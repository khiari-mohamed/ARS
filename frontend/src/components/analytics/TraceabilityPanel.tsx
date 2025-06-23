import React, { useState } from 'react';
import { getTraceability } from '../../api/analyticsApi';

const TraceabilityPanel: React.FC = () => {
  const [bordereauId, setBordereauId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTraceability(bordereauId);
      setData(result);
    } catch (e: any) {
      setError('Erreur chargement traçabilité');
      setData(null);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded shadow p-4 mb-4">
      <div className="mb-2 flex gap-2 items-end">
        <input
          className="border p-1"
          placeholder="ID Bordereau"
          value={bordereauId}
          onChange={e => setBordereauId(e.target.value)}
        />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleFetch} disabled={loading || !bordereauId}>
          {loading ? 'Chargement...' : 'Afficher'}
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {data && (
        <div>
          <div className="font-bold mb-1">Traçabilité Bordereau #{bordereauId}</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
export default TraceabilityPanel;
