import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface ChartsData {
  alertsByDay: Array<{ date: string; critical: number; warning: number; normal: number }>;
  alertsByType: Array<{ name: string; value: number; color: string }>;
  slaComplianceChart: Array<{ date: string; compliance: number }>;
}

interface Props {
  data?: ChartsData;
  loading?: boolean;
}

const AlertsCharts: React.FC<Props> = ({ data, loading }) => {
  const defaultData = {
    alertsByDay: [
      { date: '01/01', critical: 5, warning: 12, normal: 8 },
      { date: '02/01', critical: 3, warning: 15, normal: 10 },
      { date: '03/01', critical: 8, warning: 9, normal: 12 },
      { date: '04/01', critical: 2, warning: 18, normal: 15 },
      { date: '05/01', critical: 6, warning: 11, normal: 9 }
    ],
    alertsByType: [
      { name: 'SLA Breach', value: 35, color: '#ff4d4f' },
      { name: 'Surcharge', value: 25, color: '#faad14' },
      { name: 'Réclamation', value: 20, color: '#722ed1' },
      { name: 'Système', value: 20, color: '#1890ff' }
    ],
    slaComplianceChart: [
      { date: '01/01', compliance: 85 },
      { date: '02/01', compliance: 88 },
      { date: '03/01', compliance: 82 },
      { date: '04/01', compliance: 91 },
      { date: '05/01', compliance: 87 }
    ]
  };

  const chartData = data || defaultData;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Alertes par Jour</Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.alertsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="critical" stackId="a" fill="#ff4d4f" name="Critique" />
                  <Bar dataKey="warning" stackId="a" fill="#faad14" name="Alerte" />
                  <Bar dataKey="normal" stackId="a" fill="#52c41a" name="Normal" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Répartition par Type</Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.alertsByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.alertsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Évolution Conformité SLA</Typography>
            <Box height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slaComplianceChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Conformité']} />
                  <Line 
                    type="monotone" 
                    dataKey="compliance" 
                    stroke="#1890ff" 
                    strokeWidth={3}
                    dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AlertsCharts;