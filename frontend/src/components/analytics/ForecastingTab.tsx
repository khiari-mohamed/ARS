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
      const aiRecommendations = aiRecommendationsResponse.data.recommendations || [];

      // Get resource planning from backend
      const resourcePlanningResponse = await LocalAPI.get('/analytics/resource-planning');
      const resourcePlanning = resourcePlanningResponse.data;

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
      
      // Load advanced analytics in background (non-blocking)
      loadAdvancedAnalytics();
      
    } catch (error) {
      console.error('Failed to load forecast data:', error);
      // Set minimal data to prevent infinite loading
      setData({
        forecast: { nextWeek: 0, nextMonth: 0, recommendedStaff: 0, currentStaff: 0, accuracy: 0 },
        plannedVsActual: [],
        aiRecommendations: [],
        resourcePlanning: [],
        trends: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadAdvancedAnalytics = async () => {
    try {
      const [clusteringResponse, anomalyResponse, reportResponse] = await Promise.all([
        getAdvancedClustering().catch(() => ({ clusters: [] })),
        getSophisticatedAnomalyDetection().catch(() => ({ anomalies: [] })),
        generateExecutiveReport({ report_type: 'performance', time_period: '7d' }).catch(() => ({ executive_summary: null }))
      ]);
      
      setAdvancedAnalytics({
        clustering: clusteringResponse,
        anomalies: anomalyResponse,
        criticalClusters: clusteringResponse.clusters?.filter((c: any) => c.severity === 'critical') || [],
        highAnomalies: anomalyResponse.anomalies?.filter((a: any) => a.severity === 'high') || []
      });
      
      setExecutiveReport(reportResponse.executive_summary);
    } catch (error) {
      console.warn('Advanced analytics failed:', error);
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
      {/* Forecast KPI Cards - Executive Summary Style */}
      {forecastKpis && (
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Weekly Forecast - Action Oriented */}
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <TrendingUpIcon sx={{ fontSize: 40, mr: 2 }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {forecastKpis.nextWeekForecast} dossiers
                      </Typography>
                      <Typography variant="h6">attendus cette semaine</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    Prévision basée sur {Math.round(forecastKpis.accuracy)}% de fiabilité
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    ≈ {Math.round(forecastKpis.nextWeekForecast / 5)} dossiers/jour en moyenne
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Forecast - Strategic View */}
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 40, mr: 2 }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {forecastKpis.nextMonthForecast} dossiers
                      </Typography>
                      <Typography variant="h6">prévus ce mois</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    <AssessmentIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    Planification: {Math.round(forecastKpis.nextMonthForecast / 4)} dossiers/semaine
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    Capacité actuelle: {forecastKpis.currentStaff} gestionnaires
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Staffing Decision - Action Required */}
            <Grid item xs={12}>
              <Card elevation={3} sx={{ 
                bgcolor: staffingGap > 0 ? 'error.main' : staffingGap < 0 ? 'success.main' : 'info.main',
                color: 'white'
              }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <PeopleIcon sx={{ fontSize: 40, mr: 2 }} />
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {staffingGap > 0 ? (
                              <><WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />RECRUTEMENT URGENT</>
                            ) : staffingGap < 0 ? (
                              <><AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />SUREFFECTIF DÉTECTÉ</>
                            ) : (
                              <><AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />EFFECTIF OPTIMAL</>
                            )}
                          </Typography>
                          <Typography variant="h6">
                            {staffingGap > 0 ? `Besoin de ${staffingGap} gestionnaire(s) supplémentaire(s)` :
                             staffingGap < 0 ? `${Math.abs(staffingGap)} gestionnaire(s) en excès` :
                             'Effectif adapté à la charge'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" sx={{ mt: 2, opacity: 0.9 }}>
                        <AssessmentIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        Actuel: {forecastKpis.currentStaff} gestionnaires | Requis: {data.forecast.recommendedStaff} gestionnaires
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                        Charge prévue: {Math.round(forecastKpis.nextWeekForecast / data.forecast.recommendedStaff)} dossiers/gestionnaire
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {staffingGap > 0 && (
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                          <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            {staffingGap > 0 ? '+' : ''}{staffingGap}
                          </Typography>
                          <Typography variant="body1">Action requise</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Planned vs Actual Chart - Simplified */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Évolution de la Charge de Travail</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.plannedVsActual.slice(-8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Période', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Nombre de dossiers', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ccc' }}
                formatter={(value: any) => [`${value} dossiers`, '']}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="planned" 
                fill="#1976d2" 
                name="Planifié"
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="actual" 
                fill="#4caf50" 
                name="Réalisé"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <AssessmentIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
              Ce graphique compare la charge de travail planifiée vs réalisée sur les 8 dernières périodes
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* AI Recommendations - Executive Actions */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
            Actions Prioritaires Recommandées par l'IA
          </Typography>
          <Grid container spacing={2}>
            {data.aiRecommendations.slice(0, 3).map((recommendation: string, index: number) => {
              const isUrgent = recommendation.includes('🚨') || recommendation.includes('critique') || recommendation.includes('CRITIQUE');
              const isWarning = recommendation.includes('⚠️') || recommendation.includes('🟠');
              const cleanRec = recommendation.replace(/📊|💡|🟠|🚨|⚠️/g, '').trim();
              
              return (
                <Grid item xs={12} key={index}>
                  <Alert 
                    severity={isUrgent ? 'error' : isWarning ? 'warning' : 'info'}
                    sx={{ 
                      fontSize: '1.1rem',
                      '& .MuiAlert-message': { width: '100%' }
                    }}
                    icon={
                      isUrgent ? <WarningIcon sx={{ fontSize: 28 }} /> :
                      isWarning ? <AssessmentIcon sx={{ fontSize: 28 }} /> :
                      <TrendingUpIcon sx={{ fontSize: 28 }} />
                    }
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {cleanRec}
                    </Typography>
                  </Alert>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ForecastingTab;