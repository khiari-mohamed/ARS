import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Card, CardContent, Box, Alert, CircularProgress, Chip, Button } from '@mui/material';
import { generateExecutiveReport, getAdvancedClustering, getSophisticatedAnomalyDetection } from '../../services/analyticsService';
import ReportIcon from '@mui/icons-material/Report';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import BugReportIcon from '@mui/icons-material/BugReport';

interface Props {
  filters?: any;
  dateRange?: any;
}

const ExecutiveDashboard: React.FC<Props> = ({ filters, dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [executiveData, setExecutiveData] = useState<any>(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<any>(null);

  const loadExecutiveData = async () => {
    try {
      setLoading(true);
      
      const [reportResponse, clusteringResponse, anomalyResponse] = await Promise.all([
        generateExecutiveReport({
          report_type: 'comprehensive',
          time_period: '30d',
          include_forecasts: true
        }),
        getAdvancedClustering(),
        getSophisticatedAnomalyDetection()
      ]);

      setExecutiveData(reportResponse);
      setAdvancedAnalytics({
        clustering: clusteringResponse,
        anomalies: anomalyResponse
      });

    } catch (error) {
      console.error('Failed to load executive data:', error);
      setExecutiveData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutiveData();
  }, [filters, dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Génération du rapport exécutif IA...</Typography>
      </Box>
    );
  }

  if (!executiveData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Erreur de génération du rapport exécutif
          </Typography>
          <Typography variant="body2">
            Impossible de générer le rapport exécutif. Vérifiez la connexion au service IA.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const { executive_summary, ai_insights } = executiveData;
  const healthScore = executive_summary?.overall_health_score || 0;
  const healthColor = healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error';

  return (
    <Grid container spacing={3}>
      {/* Executive Summary Header */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReportIcon sx={{ mr: 2, fontSize: 40 }} />
                Rapport Exécutif IA
              </Typography>
              <Typography variant="subtitle1">
                Analyse complète générée le {new Date(executive_summary?.generated_at || Date.now()).toLocaleDateString('fr-FR')}
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={loadExecutiveData}
              startIcon={<TrendingUpIcon />}
            >
              Actualiser
            </Button>
          </Box>
        </Paper>
      </Grid>

      {/* Key Metrics Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <CheckCircleIcon color={healthColor} sx={{ mr: 1 }} />
                  <Typography variant="h6">Santé Système</Typography>
                </Box>
                <Typography variant="h3" color={`${healthColor}.main`} sx={{ fontWeight: 600 }}>
                  {healthScore}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Score global de performance
                </Typography>
                <Chip 
                  size="small" 
                  label={healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Bon' : 'Critique'} 
                  color={healthColor} 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Anomalies Critiques</Typography>
                </Box>
                <Typography variant="h3" color="error.main" sx={{ fontWeight: 600 }}>
                  {executive_summary?.critical_anomalies || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Nécessitent une action immédiate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <GroupWorkIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Clusters Problématiques</Typography>
                </Box>
                <Typography variant="h3" color="warning.main" sx={{ fontWeight: 600 }}>
                  {executive_summary?.problematic_clusters || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Processus nécessitant optimisation
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <BugReportIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Données Analysées</Typography>
                </Box>
                <Typography variant="h3" color="info.main" sx={{ fontWeight: 600 }}>
                  {executive_summary?.total_bordereaux || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Bordereaux dans l'analyse
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Key Recommendations */}
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recommandations Stratégiques IA</Typography>
          {executive_summary?.key_recommendations?.length > 0 ? (
            executive_summary.key_recommendations.map((recommendation: string, index: number) => (
              <Alert 
                key={index} 
                severity={index === 0 ? 'error' : index === 1 ? 'warning' : 'info'} 
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">Priorité {index + 1}</Typography>
                <Typography variant="body2">{recommendation}</Typography>
              </Alert>
            ))
          ) : (
            <Alert severity="success">
              Aucune recommandation critique - système fonctionnel optimal
            </Alert>
          )}
        </Paper>
      </Grid>

      {/* Advanced Analytics Summary */}
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Analyse Avancée IA</Typography>
          
          {/* Clustering Summary */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupWorkIcon sx={{ mr: 1, fontSize: 16 }} />
              Clustering Processus
            </Typography>
            <Typography variant="body2">
              {advancedAnalytics?.clustering?.clusters?.length || 0} clusters identifiés
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Algorithme: {advancedAnalytics?.clustering?.algorithm_used || 'N/A'}
            </Typography>
          </Box>

          {/* Anomaly Detection Summary */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
              <BugReportIcon sx={{ mr: 1, fontSize: 16 }} />
              Détection Anomalies
            </Typography>
            <Typography variant="body2">
              {advancedAnalytics?.anomalies?.anomalies?.length || 0} anomalies détectées
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Méthodes: Ensemble + Statistique
            </Typography>
          </Box>

          {/* AI Confidence */}
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="primary.contrastText">
              Confiance IA Globale
            </Typography>
            <Typography variant="h4" color="primary.contrastText">
              {Math.round((advancedAnalytics?.clustering?.silhouette_score || 0.8) * 100)}%
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* Detailed AI Insights */}
      {ai_insights && (
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Insights IA Détaillés</Typography>
            <Grid container spacing={2}>
              
              {/* Performance Anomalies */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Anomalies de Performance</Typography>
                {ai_insights.performance_anomalies?.length > 0 ? (
                  ai_insights.performance_anomalies.slice(0, 3).map((anomaly: any, index: number) => (
                    <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {anomaly.explanation?.[0] || `Anomalie détectée (ID: ${anomaly.record_id})`}
                      </Typography>
                      <Typography variant="caption">
                        Confiance: {Math.round((anomaly.confidence || 0) * 100)}%
                      </Typography>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">Aucune anomalie de performance détectée</Alert>
                )}
              </Grid>

              {/* Process Clusters */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Clusters de Processus</Typography>
                {ai_insights.process_clusters?.length > 0 ? (
                  ai_insights.process_clusters.slice(0, 3).map((cluster: any, index: number) => (
                    <Alert 
                      key={index} 
                      severity={cluster.severity === 'critical' ? 'error' : cluster.severity === 'high' ? 'warning' : 'info'} 
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="body2">
                        Cluster {cluster.cluster_id}: {cluster.process_count} processus
                      </Typography>
                      <Typography variant="caption">
                        Sévérité: {cluster.severity} | Temps moyen: {Math.round(cluster.avg_processing_time)}h
                      </Typography>
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">Tous les clusters de processus sont optimaux</Alert>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default ExecutiveDashboard;