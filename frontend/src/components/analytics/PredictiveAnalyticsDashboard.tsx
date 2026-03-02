import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, Typography, Card, CardContent, Alert, Chip, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody, Divider, Stack } from '@mui/material';
import { Psychology, TrendingUp, Warning, Assignment, TrendingDown, CheckCircle } from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface SLAPrediction {
  id: string;
  risk: string;
  score: number;
  days_left: number;
  bordereau?: { reference: string; clientName: string; assignedTo: string };
}

interface CapacityAnalysis {
  userId: string;
  userName: string;
  activeBordereaux: number;
  capacityStatus: 'available' | 'at_capacity' | 'overloaded';
}

const PredictiveAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [sla, capacity, forecast, recs] = await Promise.all([
        LocalAPI.get('/analytics/sla/predictions'),
        LocalAPI.get('/analytics/sla/capacity'),
        LocalAPI.get('/analytics/forecast'),
        LocalAPI.get('/analytics/ai-recommendations')
      ]);

      setData({
        slaPredictions: sla.data || [],
        capacityAnalysis: capacity.data || [],
        forecast: forecast.data,
        recommendations: (recs.data?.recommendations || []).map((r: string) => r.replace(/📊|💡|🟠|🚨|⚠️/g, '').trim())
      });
      setLoading(false);
    } catch (error) {
      console.error('Load error:', error);
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk === '🔴') return 'error';
    if (risk === '🟠') return 'warning';
    return 'success';
  };

  const getPriorityLabel = (rec: string) => {
    if (rec.includes('CRITIQUE') || rec.includes('URGENT') || rec.includes('critique')) return { severity: 'error' as const, label: 'URGENT' };
    if (rec.includes('Charge') || rec.includes('Surcharge')) return { severity: 'warning' as const, label: 'IMPORTANT' };
    return { severity: 'info' as const, label: 'INFO' };
  };

  if (loading) return <Box sx={{ p: 3 }}><LinearProgress /><Typography sx={{ mt: 2 }}>Chargement des analyses prédictives...</Typography></Box>;
  if (!data) return <Alert severity="error">Erreur de chargement des données</Alert>;

  const criticalCount = (data.slaPredictions || []).filter((s: SLAPrediction) => s.risk === '🔴').length;
  const warningCount = (data.slaPredictions || []).filter((s: SLAPrediction) => s.risk === '🟠').length;
  const overloadedCount = (data.capacityAnalysis || []).filter((c: CapacityAnalysis) => c.capacityStatus === 'overloaded').length;
  const atCapacityCount = (data.capacityAnalysis || []).filter((c: CapacityAnalysis) => c.capacityStatus === 'at_capacity').length;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">🔮 Analyses Prédictives IA</Typography>
        <Chip label={`Dernière mise à jour: ${new Date().toLocaleTimeString('fr-FR')}`} size="small" variant="outlined" />
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: criticalCount > 0 ? 'error.light' : 'background.paper', height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Warning color="error" sx={{ fontSize: 32 }} />
                <Chip label="CRITIQUE" size="small" color="error" sx={{ display: criticalCount > 0 ? 'flex' : 'none' }} />
              </Stack>
              <Typography variant="h3" fontWeight="bold" color={criticalCount > 0 ? 'error.main' : 'text.primary'}>
                {criticalCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Dépassements SLA</Typography>
              {warningCount > 0 && (
                <Typography variant="caption" color="warning.main">+ {warningCount} à risque</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: overloadedCount > 0 ? 'warning.light' : 'background.paper', height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Assignment color="warning" sx={{ fontSize: 32 }} />
                <Chip label="ALERTE" size="small" color="warning" sx={{ display: overloadedCount > 0 ? 'flex' : 'none' }} />
              </Stack>
              <Typography variant="h3" fontWeight="bold" color={overloadedCount > 0 ? 'warning.main' : 'text.primary'}>
                {overloadedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Gestionnaires Surchargés</Typography>
              {atCapacityCount > 0 && (
                <Typography variant="caption" color="text.secondary">+ {atCapacityCount} à capacité max</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <TrendingUp color="info" sx={{ fontSize: 32 }} />
                <Chip label="PRÉVISION" size="small" color="info" variant="outlined" />
              </Stack>
              <Typography variant="h3" fontWeight="bold" color="info.main">
                {data.forecast?.nextWeekForecast || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Bordereaux Semaine Prochaine</Typography>
              <Typography variant="caption" color="text.secondary">
                ~{Math.round((data.forecast?.nextWeekForecast || 0) / 7)} par jour
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Psychology color="primary" sx={{ fontSize: 32 }} />
                <Chip label="IA" size="small" color="primary" variant="outlined" />
              </Stack>
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {data.recommendations.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Recommandations Actives</Typography>
              <Typography variant="caption" color="text.secondary">
                Basées sur analyse temps réel
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Recommendations */}
      {data.recommendations.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Psychology color="primary" />
            <Typography variant="h6" fontWeight="bold">Recommandations Intelligentes</Typography>
            <Chip label={`${data.recommendations.length} actions`} size="small" color="primary" />
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {data.recommendations.slice(0, 5).map((rec: string, i: number) => {
              const priority = getPriorityLabel(rec);
              return (
                <Alert 
                  key={i} 
                  severity={priority.severity}
                  icon={priority.severity === 'error' ? <Warning /> : priority.severity === 'warning' ? <TrendingDown /> : <CheckCircle />}
                  sx={{ '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">{rec}</Typography>
                    </Box>
                    <Chip label={priority.label} size="small" color={priority.severity} sx={{ ml: 2 }} />
                  </Stack>
                </Alert>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* SLA Predictions */}
      {(criticalCount > 0 || warningCount > 0) && (
        <Paper sx={{ p: 3, mb: 3, border: '2px solid', borderColor: criticalCount > 0 ? 'error.main' : 'warning.main' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Warning color={criticalCount > 0 ? 'error' : 'warning'} />
              <Typography variant="h6" fontWeight="bold">Bordereaux à Risque SLA</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {criticalCount > 0 && <Chip label={`${criticalCount} Critiques`} size="small" color="error" />}
              {warningCount > 0 && <Chip label={`${warningCount} À Risque`} size="small" color="warning" />}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Référence</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Gestionnaire</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'center' }}>Niveau Risque</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'center' }}>Retard (jours)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.slaPredictions || [])
                  .filter((p: SLAPrediction) => p.risk === '🔴' || p.risk === '🟠')
                  .slice(0, 15)
                  .map((pred: SLAPrediction) => {
                    const daysOverdue = Math.abs(pred.days_left);
                    const isCritical = pred.risk === '🔴';
                    return (
                      <TableRow 
                        key={pred.id} 
                        sx={{ 
                          bgcolor: isCritical ? 'error.light' : 'warning.light',
                          '&:hover': { bgcolor: isCritical ? 'error.main' : 'warning.main', opacity: 0.8 }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Typography variant="body2" noWrap>{pred.bordereau?.reference || `BR-${pred.id.slice(-8)}`}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{pred.bordereau?.clientName || 'Client non spécifié'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pred.bordereau?.assignedTo || 'Non assigné'} 
                            size="small" 
                            variant="outlined"
                            sx={{ maxWidth: '100%' }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            size="small" 
                            label={isCritical ? 'CRITIQUE' : 'ALERTE'} 
                            color={getRiskColor(pred.risk)}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: daysOverdue > 20 ? 'error.dark' : 'error.main',
                              fontSize: daysOverdue > 20 ? '1.1rem' : '1rem'
                            }}
                          >
                            {daysOverdue}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Capacity Analysis */}
      {overloadedCount > 0 && (
        <Paper sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Assignment color="warning" />
              <Typography variant="h6" fontWeight="bold">Gestionnaires en Surcharge</Typography>
            </Stack>
            <Chip label={`${overloadedCount} Surchargés`} size="small" color="warning" />
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">Action requise: Redistribuer la charge ou affecter des ressources supplémentaires</Typography>
          </Alert>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Gestionnaire</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Charge Actuelle</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Niveau Capacité</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.capacityAnalysis || [])
                  .filter((c: CapacityAnalysis) => c.capacityStatus === 'overloaded')
                  .map((analysis: CapacityAnalysis) => {
                    const workload = analysis.activeBordereaux;
                    const isExtreme = workload > 15;
                    return (
                      <TableRow 
                        key={analysis.userId} 
                        sx={{ 
                          bgcolor: isExtreme ? 'error.light' : 'warning.light',
                          '&:hover': { bgcolor: isExtreme ? 'error.main' : 'warning.main', opacity: 0.8 }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Typography variant="body2">{analysis.userName}</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <Typography variant="h6" fontWeight="bold" color={isExtreme ? 'error.main' : 'warning.main'}>
                              {workload}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">bordereaux</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            size="small" 
                            label={isExtreme ? 'CRITIQUE' : 'SURCHARGÉ'} 
                            color={isExtreme ? 'error' : 'warning'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default PredictiveAnalyticsDashboard;
