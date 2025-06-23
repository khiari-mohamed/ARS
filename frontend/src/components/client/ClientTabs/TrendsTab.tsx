import React, { useEffect, useState } from 'react';
import { fetchClientTrends } from '../../../services/clientService';
import { Paper, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, ChartTooltip, Legend);

const TrendsTab: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchClientTrends(clientId).then(setData);
  }, [clientId]);

  if (!data) return <Typography>Loading trends...</Typography>;

  const chartData = {
    labels: data.monthlyBordereaux.map((d: any) => `${d.year}-${String(d.month).padStart(2, '0')}`),
    datasets: [
      {
        label: 'Bordereaux per Month',
        data: data.monthlyBordereaux.map((d: any) => d.count),
        fill: false,
        borderColor: '#1976d2',
        tension: 0.1,
      },
    ],
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Monthly Bordereaux Trend</Typography>
      <Line data={chartData} />
    </Paper>
  );
};

export default TrendsTab;