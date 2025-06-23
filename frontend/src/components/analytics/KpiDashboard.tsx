import React, { useState } from 'react';
import { useDailyKpis } from '../../hooks/useAnalytics';
import { AnalyticsKpiDto } from '../../types/analytics';
import LineChart from '../LineChart';
import KPIBox from '../KPIBox';
import LoadingSpinner from '../LoadingSpinner';
import { formatDate } from '../../utils/formatDate';

const defaultFilters: AnalyticsKpiDto = {
  fromDate: undefined,
  toDate: undefined,
  teamId: undefined,
  userId: undefined,
};

const KpiDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsKpiDto>(defaultFilters);
  const { data, isLoading, error } = useDailyKpis(filters);

  // Log filters, loading, error, and data
  console.log('KPI Dashboard filters:', filters);
  console.log('KPI Dashboard loading:', isLoading);
  console.log('KPI Dashboard error:', error);
  console.log('KPI Dashboard data:', data);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value || undefined });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Erreur chargement KPIs</div>;

  // Log when data is empty
  if (data && data.bsPerDay.length === 0) {
    console.log('No KPI data available for current filters.');
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <h2 className="text-2xl font-bold mb-4">KPI Dashboard</h2>
        <div className="text-lg mb-2">Aucune donnée KPI disponible pour la période sélectionnée.</div>
        <div className="text-sm">Essayez d’élargir la période ou de vérifier les filtres.</div>
      </div>
    );
  }

  const chartData = data?.bsPerDay.map(d => ({
    x: formatDate(d.createdAt),
    y: d._count.id,
  })) || [];

  // Log chart data
  console.log('KPI Dashboard chartData:', chartData);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">KPI Dashboard</h2>
      <div className="flex gap-4 mb-6">
        <input name="fromDate" type="date" onChange={handleFilterChange} className="border p-1" />
        <input name="toDate" type="date" onChange={handleFilterChange} className="border p-1" />
        <input name="teamId" placeholder="Team ID" onChange={handleFilterChange} className="border p-1" />
        <input name="userId" placeholder="User ID" onChange={handleFilterChange} className="border p-1" />
        <button className="ml-2 px-3 py-1 bg-gray-200 rounded" onClick={() => setFilters(defaultFilters)}>Reset</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPIBox label="Moyenne Délai (jours)" value={data?.avgDelay?.toFixed(2) ?? '-'} />
        <KPIBox label="Total BS" value={data?.bsPerDay.reduce((a, b) => a + b._count.id, 0) ?? '-'} />
        <KPIBox label="BS / Jour (max)" value={Math.max(...(data?.bsPerDay.map(d => d._count.id) ?? [0]))} />
      </div>
      <div className="bg-white rounded shadow p-4">
        <LineChart
          data={chartData}
          xLabel="Date"
          yLabel="BS reçus"
          title="BS reçus par jour"
        />
      </div>
    </div>
  );
};

export default KpiDashboard;