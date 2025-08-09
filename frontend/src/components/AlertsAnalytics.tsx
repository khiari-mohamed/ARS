import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper
} from '@mui/material';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { useAlertsDashboard, useAlertHistory } from '../hooks/useAlertsQuery';
import { AlertsDashboardQuery } from '../types/alerts.d';
import 'chart.js/auto';

interface KPICardProps {
  title: string;
  value: number | string;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, color, subtitle }) => (
  <Card>
    <CardContent>
      <Typography color="textSecondary" gutterBottom variant="h6">
        {title}
      </Typography>
      <Typography variant="h4" component="div" color={color}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const AlertsAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState('7');
  const [filters] = useState<AlertsDashboardQuery>({
    fromDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { data: alerts = [] } = useAlertsDashboard(filters);
  const { data: history = [] } = useAlertHistory(filters);

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a: any) => a.alertLevel === 'red').length;
  const warningAlerts = alerts.filter((a: any) => a.alertLevel === 'orange').length;
  const resolvedAlerts = history.filter((h: any) => h.resolved).length;
  
  const avgResolutionTime = history.length > 0 
    ? Math.round(history
        .filter((h: any) => h.resolved && h.resolvedAt)
        .reduce((acc: number, h: any) => {
          const time = (new Date(h.resolvedAt!).getTime() - new Date(h.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return acc + time;
        }, 0) / resolvedAlerts)
    : 0;

  const alertsByTypeData = {
    labels: ['SLA Breach', 'Risk of Delay', 'Team Overload', 'System Error'],
    datasets: [{
      data: [
        alerts.filter((a: any) => a.reason === 'SLA breach').length,
        alerts.filter((a: any) => a.reason === 'Risk of delay').length,
        alerts.filter((a: any) => a.reason === 'Team overloaded').length,
        alerts.filter((a: any) => a.reason.includes('Error')).length
      ],
      backgroundColor: ['#f44336', '#ff9800', '#2196f3', '#9c27b0']
    }]
  };

  const alertsByUrgencyData = {
    labels: ['Critique', 'Alerte', 'Normal'],
    datasets: [{
      data: [
        criticalAlerts,
        warningAlerts,
        alerts.filter((a: any) => a.alertLevel === 'green').length
      ],
      backgroundColor: ['#f44336', '#ff9800', '#4caf50']
    }]
  };

  return (
    <div className="space-y-6">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Analytics & Rapports</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <MenuItem value="7">7 jours</MenuItem>
            <MenuItem value="30">30 jours</MenuItem>
            <MenuItem value="90">90 jours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Alertes" value={totalAlerts} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Alertes Critiques" value={criticalAlerts} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Temps Moyen" value={`${avgResolutionTime}j`} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Taux Résolution" value={`${totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0}%`} color="success" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Répartition par Type</Typography>
            <Pie data={alertsByTypeData} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Répartition par Urgence</Typography>
            <Pie data={alertsByUrgencyData} />
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default AlertsAnalytics;