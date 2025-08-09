import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, Warning, CheckCircle, Schedule } from '@mui/icons-material';

interface KPIData {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  avgResolutionTime: number;
  slaCompliance: number;
}

interface Props {
  data?: KPIData;
  loading?: boolean;
}

const AlertsKPICards: React.FC<Props> = ({ data, loading }) => {
  const kpis = [
    {
      title: 'Alertes Actives',
      value: data?.totalAlerts || 0,
      icon: <Warning color="warning" />,
      color: '#faad14',
      trend: '+12%'
    },
    {
      title: 'Critiques',
      value: data?.criticalAlerts || 0,
      icon: <Warning color="error" />,
      color: '#ff4d4f',
      trend: '-5%'
    },
    {
      title: 'Résolues Aujourd\'hui',
      value: data?.resolvedToday || 0,
      icon: <CheckCircle color="success" />,
      color: '#52c41a',
      trend: '+8%'
    },
    {
      title: 'Temps Moyen',
      value: `${data?.avgResolutionTime || 0}h`,
      icon: <Schedule color="info" />,
      color: '#1890ff',
      trend: '-15%'
    },
    {
      title: 'Conformité SLA',
      value: `${data?.slaCompliance || 0}%`,
      icon: <TrendingUp color="success" />,
      color: '#52c41a',
      trend: '+3%'
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {kpis.map((kpi, index) => (
        <Grid item xs={12} sm={6} md={2.4} key={index}>
          <Card sx={{ height: '100%', borderLeft: `4px solid ${kpi.color}` }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                {kpi.icon}
                <Chip 
                  label={kpi.trend} 
                  size="small" 
                  color={kpi.trend.startsWith('+') ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>
              <Typography variant="h4" fontWeight="bold" color={kpi.color}>
                {loading ? '...' : kpi.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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