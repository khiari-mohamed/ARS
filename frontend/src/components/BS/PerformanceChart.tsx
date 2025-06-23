// src/components/BS/PerformanceChart.tsx
import React from 'react';
import { Line } from '@ant-design/charts';

export const PerformanceChart: React.FC<{ data: { date: string; bsProcessed: number }[] }> = ({ data }) => {
  const config = {
    data,
    xField: 'date',
    yField: 'bsProcessed',
    smooth: true,
    point: { size: 4, shape: 'diamond' },
    annotations: [{ type: 'region', start: ['min', 10], end: ['max', 10] }],
  };
  return <Line {...config} />;
};