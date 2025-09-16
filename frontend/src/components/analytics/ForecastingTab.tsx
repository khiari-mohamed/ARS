import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Card, CardContent, Box, Alert, CircularProgress, Chip, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { LocalAPI } from '../../services/axios';
import { getAdvancedClustering, getSophisticatedAnomalyDetection, generateExecutiveReport } from '../../services/analyticsService';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import BugReportIcon from '@mui/icons-material/BugReport';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import ReportIcon from '@mui/icons-material/Report';

interface Props {
  filters: any;
  dateRange: any;
}

const ForecastingTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forecastKpis, setForecastKpis] = useState<any>(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<any>(null);
  const [executiveReport, setExecutiveReport] = useState<any>(null);

  const loadForecastData = async () => {
    try {
      setLoading(true);
      
      // Get core data first
      const [forecastResponse, trendsResponse, recommendationsResponse, currentStaffResponse] = await Promise.all([
        LocalAPI.get('/analytics/forecast'),
        LocalAPI.get('/analytics/trends', { params: { period: 'week', ...dateRange } }),
        LocalAPI.get('/analytics/recommendations'),
        LocalAPI.get('/analytics/current-staff')
      ]);
      
      // Get advanced analytics with error handling
      let clusteringResponse = { clusters: [] };
      let anomalyResponse = { anomalies: [] };
      let reportResponse = { executive_summary: null };
      
      try {
        clusteringResponse = await getAdvancedClustering();
      } catch (error) {
        console.warn('Advanced clustering failed:', error);
      }
      
      try {
        anomalyResponse = await getSophisticatedAnomalyDetection();
      } catch (error) {
        console.warn('Anomaly detection failed:', error);
      }
      
      try {
        reportResponse = await generateExecutiveReport({ report_type: 'performance', time_period: '7d' });
      } catch (error) {
        console.warn('Executive report failed:', error);
      }

      const forecastData = forecastResponse.data;
      const trendsData = trendsResponse.data;
      const recommendationsData = recommendationsResponse.data;
      const currentStaff = currentStaffResponse.data.count;

      // Calculate forecast KPIs from real data
      const nextWeekForecast = forecastData.nextWeekForecast;
      const nextMonthForecast = Math.round(nextWeekForecast * 4.3);
      const recommendedStaff = recommendationsData.neededStaff;
      const accuracy = forecastData.modelPerformance?.accuracy || (100 - (forecastData.modelPerformance?.mape || 0));

      setForecastKpis({
        nextWeekForecast,
        nextMonthForecast,
        recommendedStaff,
        currentStaff,
        accuracy
      });

      // Get planned vs actual from backend
      const plannedVsActualResponse = await LocalAPI.get('/analytics/planned-vs-actual', { params: dateRange });
      const plannedVsActual = plannedVsActualResponse.data;

      // Get AI recommendations from backend
      const aiRecommendationsResponse = await LocalAPI.get('/analytics/ai-recommendations');
      const aiRecommendations = aiRecommendationsResponse.data.recommendations;

      // Get resource planning from backend
      const resourcePlanningResponse = await LocalAPI.get('/analytics/resource-planning');
      const resourcePlanning = resourcePlanningResponse.data;

      // Set advanced analytics data
      setAdvancedAnalytics({
        clustering: clusteringResponse,
        anomalies: anomalyResponse,
        criticalClusters: clusteringResponse.clusters?.filter((c: any) => c.severity === 'critical') || [],
        highAnomalies: anomalyResponse.anomalies?.filter((a: any) => a.severity === 'high') || []
      });
      
      setExecutiveReport(reportResponse.executive_summary);

      setData({
        forecast: {
          nextWeek: nextWeekForecast,
          nextMonth: nextMonthForecast,
          recommendedStaff,
          currentStaff,
          accuracy
        },
        plannedVsActual,
        aiRecommendations,
        resourcePlanning,
        trends: forecastData.history || []
      });
    } catch (error) {
      console.error('Failed to load forecast data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecastData();
  }, [filters, dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des prévisions...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Chargement des Prévisions IA
          </Typography>
          <Typography variant="body2">
            Initialisation du service de prévisions en cours...
          </Typography>
          <Button 
            variant="outlined" 
            onClick={loadForecastData} 
            sx={{ mt: 2 }}
          >
            Réessayer
          </Button>
        </Alert>
      </Box>
    );
  }

  const staffingGap = data.forecast.recommendedStaff - data.forecast.currentStaff;

  return (
    <Grid container spacing={3}>
      {/* Forecast KPI Cards */}
      {forecastKpis && (
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Prévision Semaine</Typography>
                  </Box>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 600 }}>
                    {forecastKpis.nextWeekForecast}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    dossiers attendus
                  </Typography>
                  <Chip 
                    size="small" 
                    label={`${forecastKpis.accuracy}% précision`} 
                    color="success" 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <AutoAwesomeIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Prévision Mois</Typography>
                  </Box>
                  <Typography variant="h3" color="warning.main" sx={{ fontWeight: 600 }}>
                    {forecastKpis.nextMonthForecast}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    dossiers attendus
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <PeopleIcon color={staffingGap > 0 ? 'error' : 'success'} sx={{ mr: 1 }} />
                    <Typography variant="h6">Personnel Requis</Typography>
                  </Box>
                  <Typography variant="h3" color={staffingGap > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>
                    {data.forecast.recommendedStaff}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    gestionnaires ({staffingGap > 0 ? `+${staffingGap}` : staffingGap} vs actuel)
                  </Typography>
                  {staffingGap > 0 && (
                    <Chip 
                      size="small" 
                      label="Action requise" 
                      color="error" 
                      icon={<WarningIcon />}
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <AssessmentIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Précision Modèle</Typography>
                  </Box>
                  <Typography variant="h3" color="info.main" sx={{ fontWeight: 600 }}>
                    {forecastKpis.accuracy}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    fiabilité des prévisions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Planned vs Actual Chart */}
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Planifié vs Réalisé</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.plannedVsActual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="planned" 
                stroke="#1976d2" 
                strokeWidth={3}
                name="Planifié"
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#4caf50" 
                strokeWidth={3}
                name="Réalisé"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Resource Planning */}
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Planification Ressources</Typography>
          {data.resourcePlanning?.map((resource: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2">{resource.resource}</Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="body2">Actuel: {resource.current}</Typography>
                <Typography variant="body2">Requis: {resource.needed}</Typography>
              </Box>
              {resource.gap !== 0 && (
                <Chip 
                  size="small" 
                  label={resource.gap > 0 ? `+${resource.gap}` : resource.gap}
                  color={resource.gap > 0 ? 'warning' : 'success'}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          ))}
        </Paper>
      </Grid>

      {/* Advanced Analytics Section */}
      {advancedAnalytics && (
        <>
          {/* Process Clustering */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <GroupWorkIcon sx={{ mr: 1 }} />
                Clustering Processus IA
              </Typography>
              {advancedAnalytics.criticalClusters.length > 0 ? (
                advancedAnalytics.criticalClusters.map((cluster: any, index: number) => (
                  <Alert key={index} severity="error" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">{cluster.process_count} processus critiques</Typography>
                    <Typography variant="body2">{cluster.recommendations?.[0] || 'Action immédiate requise'}</Typography>
                  </Alert>
                ))
              ) : (
                <Alert severity="success">
                  Aucun cluster critique détecté - processus optimaux
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Anomaly Detection */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <BugReportIcon sx={{ mr: 1 }} />
                Détection Anomalies IA
              </Typography>
              {advancedAnalytics.highAnomalies.length > 0 ? (
                advancedAnalytics.highAnomalies.slice(0, 3).map((anomaly: any, index: number) => (
                  <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">Anomalie: {anomaly.record_id}</Typography>
                    <Typography variant="body2">{anomaly.explanation?.[0] || 'Comportement anormal détecté'}</Typography>
                  </Alert>
                ))
              ) : (
                <Alert severity="success">
                  Aucune anomalie critique détectée
                </Alert>
              )}
            </Paper>
          </Grid>
        </>
      )}

      {/* Executive Summary */}
      {executiveReport && (
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ReportIcon sx={{ mr: 1 }} />
              Rapport Exécutif IA
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="h4">{executiveReport.overall_health_score}</Typography>
                <Typography variant="body2">Score Santé Système</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="h4">{executiveReport.critical_anomalies}</Typography>
                <Typography variant="body2">Anomalies Critiques</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="h4">{executiveReport.problematic_clusters}</Typography>
                <Typography variant="body2">Clusters Problématiques</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="h4">{executiveReport.total_bordereaux}</Typography>
                <Typography variant="body2">Bordereaux Analysés</Typography>
              </Grid>
            </Grid>
            {executiveReport.key_recommendations && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Recommandations Clés:</Typography>
                {executiveReport.key_recommendations.slice(0, 2).map((rec: string, index: number) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>• {rec}</Typography>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      )}

      {/* AI Recommendations */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recommandations IA</Typography>
          {data.aiRecommendations.map((recommendation: string, index: number) => (
            <Alert 
              key={index} 
              severity="info" 
              sx={{ mb: 1 }}
              icon={<AutoAwesomeIcon />}
            >
              {recommendation}
            </Alert>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ForecastingTab;