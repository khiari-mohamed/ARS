import React from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface BarChartProps {
  data?: any[];
  dataKey?: string;
  label?: string;
  color?: string;
  byStatus?: Record<string, number>;
}

const BarChart: React.FC<BarChartProps> = ({ data, dataKey = 'value', label = 'Nombre', color = '#1976d2', byStatus }) => {
  // If byStatus is provided, map it to [{ name, value }]
  const chartData = byStatus
    ? Object.entries(byStatus).map(([name, value]) => ({ name, value }))
    : data || [];

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <ReBarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill={color} name={label} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
