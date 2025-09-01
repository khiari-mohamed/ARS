import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useResponsive } from '../../hooks/useResponsive';

interface AlertsChartsProps {
  data: any;
  loading: boolean;
}

const AlertsCharts: React.FC<AlertsChartsProps> = ({ data, loading }) => {
  const { isMobile } = useResponsive();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || !data.alertsByDay) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">Aucune donnée de graphique disponible</Typography>
      </Box>
    );
  }

  const COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1'];

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }} mb={4}>
      {/* Alerts by Day */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
              Évolution des Alertes (7 derniers jours)
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart data={data.alertsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke="#ff4d4f" name="Critiques" strokeWidth={2} />
                <Line type="monotone" dataKey="warning" stroke="#faad14" name="Alertes" strokeWidth={2} />
                <Line type="monotone" dataKey="normal" stroke="#52c41a" name="Normales" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts by Type */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
              Répartition par Type
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={data.alertsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={isMobile ? 50 : 70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.alertsByType.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* SLA Compliance Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
              Conformité SLA (7 derniers jours)
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <BarChart data={data.slaComplianceChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip formatter={(value) => [`${value}%`, 'Conformité SLA']} />
                <Bar dataKey="compliance" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AlertsCharts;