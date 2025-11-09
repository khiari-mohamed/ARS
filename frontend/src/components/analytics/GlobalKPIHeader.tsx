import React, { useState, useEffect } from 'react';
import { Paper, Grid, Card, CardContent, Typography, LinearProgress, Chip, Box, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { LocalAPI } from '../../services/axios';

interface KPIData {
  slaCompliance: number;
  totalBordereaux: number;
  avgProcessingTime: number;
  rejectionRate: number;
  activeAlerts: number;
}

const GlobalKPIHeader: React.FC = () => {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadKPIData = async () => {
    try {
      const [kpiResponse, alertsResponse] = await Promise.all([
        LocalAPI.get('/analytics/kpis/daily'),
        LocalAPI.get('/analytics/alerts')
      ]);

      const kpiData = kpiResponse.data;
      const alertData = alertsResponse.data;
      
      console.log('🔍 Raw KPI Data:', kpiData);
      console.log('🔍 Raw Alert Data:', alertData);

      // Extract real data from API response
      const totalBordereaux = kpiData.totalCount || 0;
      const processedCount = kpiData.processedCount || 0;
      const enAttenteCount = kpiData.enAttenteCount || 0;
      const avgProcessingTime = kpiData.avgDelay || 0;
      
      // Calculate SLA compliance from processed vs total
      const slaCompliance = totalBordereaux > 0 ? Math.round((processedCount / totalBordereaux) * 100) : 0;
      
      // Calculate rejection rate (total - processed - en attente)
      const rejectedCount = Math.max(0, totalBordereaux - processedCount - enAttenteCount);
      const rejectionRate = totalBordereaux > 0 ? Math.round((rejectedCount / totalBordereaux) * 100) : 0;
      
      // Count active alerts from all alert types
      const criticalAlerts = Array.isArray(alertData.critical) ? alertData.critical.length : 0;
      const warningAlerts = Array.isArray(alertData.warning) ? alertData.warning.length : 0;
      const activeAlerts = criticalAlerts + warningAlerts;
      
      console.log('📊 Calculated KPIs:', {
        totalBordereaux,
        processedCount,
        slaCompliance,
        rejectionRate,
        avgProcessingTime,
        activeAlerts
      });

      setKpis({
        slaCompliance,
        totalBordereaux,
        avgProcessingTime,
        rejectionRate,
        activeAlerts
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load KPI data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadKPIData, 60000);
    
    return () => clearInterval(interval);
  }, []);
  if (loading || !kpis) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={24} />
          <Typography>Chargement des KPIs en temps réel...</Typography>
        </Box>
      </Paper>
    );
  }

  const getSLAColor = (compliance: number) => {
    if (compliance >= 90) return 'success';
    if (compliance >= 80) return 'warning';
    return 'error';
  };

  const kpiCards = [
    {
      title: 'Conformité SLA',
      value: `${kpis.slaCompliance}%`,
      icon: <TrendingUpIcon />,
      color: getSLAColor(kpis.slaCompliance),
      progress: kpis.slaCompliance,

    },
    {
      title: 'Bordereaux Traités',
      value: kpis.totalBordereaux.toLocaleString(),
      icon: <AssignmentIcon />,
      color: 'primary',

    },
    {
      title: 'Temps Moyen',
      value: `${Math.round(kpis.avgProcessingTime)}j`,
      icon: <AccessTimeIcon />,
      color: kpis.avgProcessingTime <= 3 ? 'success' : 'warning',

    },
    {
      title: 'Taux de Rejet',
      value: `${kpis.rejectionRate}%`,
      icon: <ErrorIcon />,
      color: kpis.rejectionRate <= 3 ? 'success' : 'error',

    },
    {
      title: 'Alertes Actives',
      value: kpis.activeAlerts.toString(),
      icon: <NotificationsIcon />,
      color: kpis.activeAlerts === 0 ? 'success' : kpis.activeAlerts <= 5 ? 'warning' : 'error',
      urgent: kpis.activeAlerts > 10
    }
  ];

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Tableau de Bord Analytics - Vue d'ensemble
      </Typography>
      
      <Grid container spacing={3}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card elevation={3} sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.95)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Box sx={{ color: `${kpi.color}.main` }}>
                    {kpi.icon}
                  </Box>

                </Box>
                
                <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>
                  {kpi.title}
                </Typography>
                
                <Typography variant="h4" sx={{ fontWeight: 600, color: `${kpi.color}.main`, mb: 1 }}>
                  {kpi.value}
                </Typography>

                {kpi.progress !== undefined && (
                  <LinearProgress 
                    variant="determinate" 
                    value={kpi.progress} 
                    color={kpi.color as any}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                )}

                {kpi.urgent && (
                  <Chip 
                    label="URGENT" 
                    color="error" 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Status Summary */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Status Système: {kpis.slaCompliance >= 90 ? '🟢 Optimal' : kpis.slaCompliance >= 80 ? '🟠 Attention' : '🔴 Critique'} | 
              Charge de travail: {kpis.totalBordereaux > 1000 ? 'Élevée' : 'Normale'} | 
              Alertes: {kpis.activeAlerts === 0 ? 'Aucune' : `${kpis.activeAlerts} active(s)`}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" sx={{ opacity: 0.9, textAlign: { xs: 'left', md: 'right' } }}>
              Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default GlobalKPIHeader;