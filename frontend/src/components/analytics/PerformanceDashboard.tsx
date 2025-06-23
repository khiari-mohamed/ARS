import React, { useState } from 'react';
import { usePerformanceByUser } from '../../hooks/useAnalytics';
import { AnalyticsPerformanceDto } from '../../types/analytics';
import LoadingSpinner from '../LoadingSpinner';

const defaultFilters: AnalyticsPerformanceDto = {
  fromDate: undefined,
  toDate: undefined,
  teamId: undefined,
  userId: undefined,
  role: undefined,
};

const PerformanceDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsPerformanceDto>(defaultFilters);
  const { data, isLoading, error } = usePerformanceByUser(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value || undefined });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Erreur chargement performance</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Performance par utilisateur</h2>
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
      <div className="mb-4">
        <span className="font-semibold">SLA compliant (&lt;=3j): </span>
        <span className="text-green-600 font-bold">{data?.slaCompliant ?? '-'}</span>
      </div>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utilisateur</th>
            <th className="p-2">BS traités</th>
          </tr>
        </thead>
        <tbody>
          {data?.processedByUser.length === 0 ? (
            <tr>
              <td colSpan={2} className="text-center text-gray-500 py-4">
                Aucun utilisateur trouvé pour les filtres sélectionnés.
              </td>
            </tr>
          ) : (
            data?.processedByUser.map(u => (
              <tr key={u.clientId}>
                <td className="p-2">{u.clientId}</td>
                <td className="p-2">{u._count.id}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceDashboard;