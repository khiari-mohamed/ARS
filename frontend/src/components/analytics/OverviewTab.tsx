import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  filters: any;
  dateRange: any;
}

const OverviewTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      volumeTrend: [
        { date: '2025-01-01', volume: 45 },
        { date: '2025-01-02', volume: 52 },
        { date: '2025-01-03', volume: 38 }
      ],
      slaDistribution: [
        { name: 'À temps', value: 75, color: '#4caf50' },
        { name: 'À risque', value: 15, color: '#ff9800' },
        { name: 'En retard', value: 10, color: '#f44336' }
      ]
    });
  }, [filters, dateRange]);

  if (!data) return <Typography>Chargement...</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Volume de Traitement</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#1976d2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Répartition SLA</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.slaDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                {data.slaDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;