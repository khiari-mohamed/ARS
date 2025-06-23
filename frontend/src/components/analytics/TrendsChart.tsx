import React, { useState } from 'react';
import { useTrends } from '../../hooks/useAnalytics';
import LineChart from '../LineChart';
import LoadingSpinner from '../LoadingSpinner';

const TrendsChart: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { data, isLoading, error } = useTrends(period);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Erreur chargement tendances</div>;

  const chartData = data?.map(d => ({
    x: d.date,
    y: d.count,
  })) ?? [];

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <label>Période:</label>
        <select value={period} onChange={e => setPeriod(e.target.value as any)} className="border p-1">
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
        </select>
      </div>
      <LineChart
        data={chartData}
        xLabel="Date"
        yLabel="Volume"
        title={`Tendance (${period})`}
      />
    </div>
  );
};

export default TrendsChart;