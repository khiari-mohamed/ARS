import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Warning, CheckCircle, Schedule, Error } from '@mui/icons-material';

interface AlertsKPICardsProps {
  data: any;
  loading: boolean;
}

const AlertsKPICards: React.FC<AlertsKPICardsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">Aucune donnée KPI disponible</Typography>
      </Box>
    );
  }

  const kpiCards = [
    {
      title: 'Alertes Totales',
      value: data.totalAlerts || 0,
      icon: <Warning color="primary" />,
      color: 'primary',
      trend: data.totalAlerts > 50 ? 'up' : 'down'
    },
    {
      title: 'Alertes Critiques',
      value: data.criticalAlerts || 0,
      icon: <Error color="error" />,
      color: 'error',
      trend: data.criticalAlerts > 10 ? 'up' : 'down'
    },
    {
      title: 'Résolues Aujourd\'hui',
      value: data.resolvedToday || 0,
      icon: <CheckCircle color="success" />,
      color: 'success',
      trend: data.resolvedToday > data.criticalAlerts ? 'up' : 'down'
    },
    {
      title: 'Temps Résolution Moyen',
      value: `${data.avgResolutionTime || 0}h`,
      icon: <Schedule color="info" />,
      color: 'info',
      trend: (data.avgResolutionTime || 0) < 24 ? 'down' : 'up'
    },
    {
      title: 'Conformité SLA',
      value: `${data.slaCompliance || 0}%`,
      icon: data.slaCompliance >= 90 ? <CheckCircle color="success" /> : <Warning color="warning" />,
      color: data.slaCompliance >= 90 ? 'success' : 'warning',
      trend: data.slaCompliance >= 90 ? 'up' : 'down'
    }
  ];

  return (
    <Grid container spacing={3} mb={4}>
      {kpiCards.map((kpi, index) => (
        <Grid item xs={12} sm={6} md={2.4} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                {kpi.icon}
                {kpi.trend === 'up' ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
              </Box>
              <Typography variant="h4" component="div" color={`${kpi.color}.main`}>
                {kpi.value}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {kpi.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default AlertsKPICards;