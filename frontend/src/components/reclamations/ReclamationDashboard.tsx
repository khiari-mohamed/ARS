import React from 'react';
import { useReclamationStats } from '../../hooks/useReclamationStats';
import { Pie, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

export const ReclamationDashboard: React.FC = () => {
  const { data: stats, isLoading } = useReclamationStats();

  if (isLoading || !stats) return <div>Chargement des statistiques...</div>;

  // Pie chart for status
  const statusData = {
    labels: Object.keys(stats.byType || {}),
    datasets: [
      {
        label: 'Par type',
        data: (stats.byType || []).map((t: any) => t._count.id),
        backgroundColor: [
          '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        ],
      },
    ],
  };

  // Pie chart for severity
  const severityData = {
    labels: (stats.bySeverity || []).map((s: any) => s.severity),
    datasets: [
      {
        label: 'Par gravité',
        data: (stats.bySeverity || []).map((s: any) => s._count.id),
        backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB'],
      },
    ],
  };

  // Line chart for trend (dummy, replace with real trend data if available)
  const trendData = {
    labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
    datasets: [
      {
        label: 'Réclamations',
        data: [12, 19, 7, 15],
        fill: false,
        borderColor: '#36A2EB',
      },
    ],
  };

  return (
    <div className="reclamation-dashboard grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-bold mb-2">Répartition par type</h3>
        <Pie data={statusData} />
      </div>
      <div>
        <h3 className="font-bold mb-2">Répartition par gravité</h3>
        <Pie data={severityData} />
      </div>
      <div className="md:col-span-2">
        <h3 className="font-bold mb-2">Tendance des réclamations</h3>
        <Line data={trendData} />
      </div>
    </div>
  );
};
