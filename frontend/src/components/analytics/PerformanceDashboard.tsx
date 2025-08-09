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
    <div className="dashboard-sharp-panel">
      <h3 className="dashboard-sharp-title">Performance par utilisateur (IA)</h3>
      <div className="performance-filters-bar">
        <input name="fromDate" type="date" onChange={handleFilterChange} className="performance-filter-input" />
        <input name="toDate" type="date" onChange={handleFilterChange} className="performance-filter-input" />
        <input name="teamId" placeholder="ID équipe" onChange={handleFilterChange} className="performance-filter-input" />
        <input name="userId" placeholder="ID utilisateur" onChange={handleFilterChange} className="performance-filter-input" />
        <select name="role" onChange={handleFilterChange} className="performance-filter-input performance-filter-select">
          <option value="">Tous rôles</option>
          <option value="GESTIONNAIRE">Gestionnaire</option>
          <option value="CHEF_EQUIPE">Chef d'équipe</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <button
          className="performance-filter-reset"
          onClick={() => setFilters(defaultFilters)}
        >
          Réinitialiser
        </button>
      </div>
      <div className="performance-table-wrapper">
        <table className="performance-table">
          <thead>
            <tr>
              <th className="performance-th">Utilisateur</th>
              <th className="performance-th">Réel</th>
              <th className="performance-th">Attendu</th>
              <th className="performance-th">Delta</th>
              <th className="performance-th">Statut</th>
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
                  <td>{u.user_id}</td>
                  <td>{u.actual}</td>
                  <td>{u.expected}</td>
                  <td>{u.delta}</td>
                  <td>{u.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
