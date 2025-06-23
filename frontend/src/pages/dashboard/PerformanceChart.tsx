import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface PerformanceChartProps {
  data: any[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => (
  <div style={{ width: '100%', height: 300 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="user" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="bsProcessed" fill="#8884d8" name="BS traités" />
        <Bar dataKey="avgTime" fill="#82ca9d" name="Temps moyen (min)" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default PerformanceChart;
