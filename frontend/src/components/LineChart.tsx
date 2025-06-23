import React from 'react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

type LegacyLineChartProps = {
  data: any[];
  dataKey: string;
  label: string;
  color?: string;
};

type AnalyticsLineChartProps = {
  data: { x: string | number; y: number }[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  color?: string;
};

type LineChartProps = LegacyLineChartProps | AnalyticsLineChartProps;

/**
 * Unified LineChart component.
 * - If `dataKey` and `label` are provided, uses legacy mode (dataKey/label/color).
 * - Otherwise, expects analytics mode: data as {x, y}, with optional xLabel, yLabel, title, color.
 */
const LineChart: React.FC<LineChartProps> = (props) => {
  // Legacy mode: dataKey/label
  if ('dataKey' in props && 'label' in props) {
    const { data, dataKey, label, color = '#1976d2' } = props;
    return (
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <ReLineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke={color} name={label} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Analytics mode: x/y data
  const { data, xLabel, yLabel, title, color = '#2563eb' } = props as AnalyticsLineChartProps;
  return (
    <div>
      {title && <h3 className="font-semibold mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <ReLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined} />
          <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
          <Tooltip />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;