import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface PerformanceChartProps {
  data: any[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => (
  <div className="dashboard-sharp-panel">
    <h3 className="dashboard-sharp-title">Performance par utilisateur</h3>
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="user" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="bsProcessed" fill="#147BFF" name="BS traités" />
          <Bar dataKey="avgTime" fill="#ff9c14" name="Temps moyen (min)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default PerformanceChart;
