import React, { useState, useEffect } from 'react';
import { AnalyticsPerformanceDto } from '../../types/analytics';
import LoadingSpinner from '../LoadingSpinner';
import { getPerformanceAI } from '../../services/analyticsService';

const defaultFilters: AnalyticsPerformanceDto = {
  fromDate: undefined,
  toDate: undefined,
  teamId: undefined,
  userId: undefined,
  role: undefined,
};

const PerformanceDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsPerformanceDto>(defaultFilters);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value || undefined });
  };

 useEffect(() => {
  // Only send the request if at least one filter is set
  const hasValidFilter = Object.values(filters).some(v => v !== undefined && v !== '');
  if (!hasValidFilter) {
    setAiData([]);
    return;
  }
  setLoading(true);
  setError(null);
  getPerformanceAI({ users: [filters] })
    .then(data => setAiData(data.performance || []))
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, [filters]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Erreur chargement performance IA: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Performance par utilisateur (IA)</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <input name="fromDate" type="date" onChange={handleFilterChange} className="border p-1 rounded" />
        <input name="toDate" type="date" onChange={handleFilterChange} className="border p-1 rounded" />
        <input name="teamId" placeholder="Team ID" onChange={handleFilterChange} className="border p-1 rounded" />
        <input name="userId" placeholder="User ID" onChange={handleFilterChange} className="border p-1 rounded" />
        <select name="role" onChange={handleFilterChange} className="border p-1 rounded">
          <option value="">Tous rôles</option>
          <option value="GESTIONNAIRE">Gestionnaire</option>
          <option value="CHEF_EQUIPE">Chef d'équipe</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <button
          className="ml-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setFilters(defaultFilters)}
        >
          Reset
        </button>
      </div>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utilisateur</th>
            <th className="p-2">Réel</th>
            <th className="p-2">Attendu</th>
            <th className="p-2">Delta</th>
            <th className="p-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {aiData && aiData.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-4">
                Aucun utilisateur trouvé pour les filtres sélectionnés.
              </td>
            </tr>
          ) : (
            aiData && aiData.map((u: any) => (
              <tr key={u.user_id}>
                <td className="p-2">{u.user_id}</td>
                <td className="p-2">{u.actual}</td>
                <td className="p-2">{u.expected}</td>
                <td className="p-2">{u.delta}</td>
                <td className="p-2">{u.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceDashboard;