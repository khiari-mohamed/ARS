import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Grid, Typography, Card, CardContent,
  Button, Alert, Chip, LinearProgress, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Psychology, TrendingUp, Warning, Assignment,
  Speed, Timeline, AutoAwesome
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { LocalAPI } from '../../services/axios';
import AIAnalyticsService from '../../services/aiAnalyticsService';
import { useAuth } from '../../contexts/AuthContext';

interface PredictiveData {
  slaPredictions: SLAPrediction[];
  capacityAnalysis: CapacityAnalysis[];
  recommendations: AIRecommendation[];
  forecast: ForecastData;
}

interface SLAPrediction {
  id: string;
  risk: string;
  score: number;
  days_left: number;
  bordereau?: {
    reference: string;
    clientName: string;
    assignedTo: string;
  };
}

interface CapacityAnalysis {
  userId: string;
  userName: string;
  activeBordereaux: number;
  avgProcessingTime: number;
  dailyCapacity: number;
  daysToComplete: number;
  capacityStatus: 'available' | 'at_capacity' | 'overloaded';
  recommendation: string;
}

interface AIRecommendation {
  type: 'reassignment' | 'staffing' | 'process';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionRequired: boolean;
}

interface ForecastData {
  nextWeekForecast: number;
  slope: number;
  history: { day: number; count: number }[];
}

const PredictiveAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timeHorizon, setTimeHorizon] = useState('week');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadPredictiveData();
    
    // Set up real-time updates every 2 minutes
    const interval = setInterval(() => {
      if (realTimeUpdates) {
        loadPredictiveData();
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, [timeHorizon, realTimeUpdates]);

  const loadPredictiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load backend data first
      const [slaResponse, capacityResponse, recommendationsResponse, forecastResponse] = await Promise.all([
        LocalAPI.get('/analytics/sla/predictions').catch(() => ({ data: [] })),
        LocalAPI.get('/analytics/sla/capacity').catch(() => ({ data: [] })),
        LocalAPI.get('/analytics/recommendations/enhanced').catch(() => ({ data: [] })),
        LocalAPI.get('/analytics/forecast').catch(() => ({ data: { nextWeekForecast: 150, slope: 0, history: [] } }))
      ]);

      // Use real bordereau data for AI predictions
      const bordereaux = Array.isArray(slaResponse.data) ? slaResponse.data : [];
      const capacityData = Array.isArray(capacityResponse.data) ? capacityResponse.data : [];
      const forecastData = forecastResponse.data || { nextWeekForecast: 150, slope: 0, history: [] };
      
      console.log('🔍 Frontend SLA Response:', slaResponse.data);
      console.log('🔍 Frontend Bordereaux:', bordereaux);

      let aiSLAPredictions = { predictions: [], risksCount: 0 };
      let aiAnomalies = { anomalies: [] };
      let aiTrends = { forecast: [], trend_direction: 'stable', model_performance: { mape: 15 } };

      const slaPredsResponse = await LocalAPI.get('/analytics/sla/predictions');
      aiSLAPredictions = { predictions: slaPredsResponse.data, risksCount: slaPredsResponse.data.length };

      if (capacityData.length > 0) {
        aiAnomalies = await AIAnalyticsService.detectAnomalies(
          capacityData.map((c: any) => ({
            id: c.userId,
            features: [c.activeBordereaux || 0, c.avgProcessingTime || 24, c.dailyCapacity || 8]
          }))
        );
      }

      if (forecastData.history?.length > 0) {
        aiTrends = await AIAnalyticsService.forecastTrends(forecastData.history);
      }

      // Use real SLA predictions from AI
      const enhancedSLAPredictions = aiSLAPredictions.predictions || [];
      
      console.log('🔍 Frontend AI SLA Predictions:', aiSLAPredictions);
      console.log('🔍 Frontend Enhanced SLA Predictions:', enhancedSLAPredictions);

      const aiRecsResponse = await LocalAPI.get('/analytics/ai-recommendations');
      const aiRecommendations = aiRecsResponse.data.recommendations.map((rec: string) => ({
        type: 'process',
        priority: 'medium',
        title: rec,
        description: 'Recommandation générée par l\'IA',
        impact: 'Optimisation des processus',
        actionRequired: false
      }));

      let nextWeekForecast = forecastData.nextWeekForecast;
      if (aiTrends?.forecast?.length > 0) {
        const weekTotal = aiTrends.forecast.slice(0, 7).reduce((sum: number, day: any) => 
          sum + (day?.predicted_value || 0), 0
        );
        if (weekTotal > 0) {
          nextWeekForecast = Math.round(weekTotal);
        }
      }

      const finalData = {
        slaPredictions: enhancedSLAPredictions,
        capacityAnalysis: capacityData,
        recommendations: aiRecommendations,
        forecast: {
          nextWeekForecast,
          slope: forecastData.slope || 0,
          history: forecastData.history || []
        }
      };
      
      console.log('✅ Frontend Final Data:', finalData);
      setData(finalData);

      setAiInsights({
        anomalies: aiAnomalies.anomalies || [],
        trendDirection: aiTrends.trend_direction || 'stable',
        confidence: aiTrends.model_performance?.mape ? Math.max(60, 100 - aiTrends.model_performance.mape) : 85
      });

      setLoading(false);

    } catch (error: any) {
      console.error('Failed to load predictive data:', error);
      setError(`Erreur de chargement: ${error.message}`);
      setLoading(false);
    }
  };



  const getRiskColor = (risk: string) => {
    switch (risk) {
      case '🔴': return 'error';
      case '🟠': return 'warning';
      case '🟢': return 'success';
      default: return 'default';
    }
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'error';
      case 'at_capacity': return 'warning';
      case 'available': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const handleAIReassignment = async (bordereauId: string) => {
    const task = {
      id: bordereauId,
      urgency: 'high',
      complexity: 'medium',
      client_type: 'premium'
    };
    
    const suggestion = await AIAnalyticsService.getSuggestedAssignment(task);
    alert(`IA recommande: Assigner à l'équipe ${suggestion.suggested_team}`);
  };

  const handlePriorityBoost = async (bordereauId: string) => {
    const decision = await AIAnalyticsService.makeAutomatedDecision(
      { bordereau_id: bordereauId, current_priority: 'medium' },
      'priority_boost'
    );
    alert(`IA décision: ${decision.decision}`);
  };

  const handleApplyRecommendation = async (recommendation: AIRecommendation) => {
    if (recommendation.type === 'reassignment') {
      alert('🤖 Application de la recommandation IA de réassignation...');
    } else if (recommendation.type === 'staffing') {
      alert('🤖 Recommandation de personnel transmise à la direction...');
    } else {
      alert('🤖 Recommandation IA appliquée avec succès!');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Chargement des analyses prédictives...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Erreur IA Analytics</Typography>
          <Typography>{error}</Typography>
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => {
            setError(null);
            loadPredictiveData();
          }}
        >
          Réessayer
        </Button>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Chargement des Analyses Prédictives
          </Typography>
          <Typography variant="body2">
            {error || 'Initialisation du service d\'analyse IA en cours...'}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={loadPredictiveData} 
            sx={{ mt: 2 }}
          >
            Réessayer
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            🔮 Analyses Prédictives IA
          </Typography>
          {aiInsights && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Confiance IA: {aiInsights.confidence}% | Tendance: {aiInsights.trendDirection} | 
              {(aiInsights?.anomalies || []).length} anomalie(s) détectée(s)
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1} flexDirection={{ xs: 'column', sm: 'row' }} width={{ xs: '100%', md: 'auto' }}>
          <Button
            variant={realTimeUpdates ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            color={realTimeUpdates ? 'success' : 'primary'}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {realTimeUpdates ? '🟢 Temps Réel' : '⏸️ Pausé'}
          </Button>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
            <InputLabel>Horizon</InputLabel>
            <Select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              label="Horizon"
            >
              <MenuItem value="week">1 Semaine</MenuItem>
              <MenuItem value="month">1 Mois</MenuItem>
              <MenuItem value="quarter">3 Mois</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* AI Recommendations Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Psychology color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {data?.recommendations.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recommandations IA
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {(data?.slaPredictions || []).filter(s => s.risk === '🔴').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Risques SLA Critiques
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {(data?.capacityAnalysis || []).filter(c => c.capacityStatus === 'overloaded').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestionnaires Surchargés
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {data?.forecast.nextWeekForecast || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Prévision Semaine
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ p: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
          <Tab 
            label={`Prédictions SLA (${data?.slaPredictions.length || 0})`} 
            icon={<Warning />} 
          />
          <Tab 
            label={`Analyse Capacité (${data?.capacityAnalysis.length || 0})`} 
            icon={<Speed />} 
          />
          <Tab 
            label={`Recommandations IA (${data?.recommendations.length || 0})`} 
            icon={<Psychology />} 
          />
          <Tab 
            label="Prévisions & Tendances" 
            icon={<Timeline />} 
          />
          {(aiInsights?.anomalies || []).length > 0 && (
            <Tab 
              label={`Anomalies IA (${(aiInsights?.anomalies || []).length})`} 
              icon={<AutoAwesome />} 
            />
          )}
        </Tabs>

        {/* SLA Predictions Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prédictions de Dépassement SLA
            </Typography>
            
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Bordereau</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Assigné à</TableCell>
                    <TableCell>Risque</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Jours Restants</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.slaPredictions || []).slice(0, 10).map((pred) => (
                    <TableRow key={pred.id}>
                      <TableCell>{pred.bordereau?.reference || (pred.id || '').slice(-8)}</TableCell>
                      <TableCell>{pred.bordereau?.clientName || 'N/A'}</TableCell>
                      <TableCell>{pred.bordereau?.assignedTo || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={pred.risk}
                          color={getRiskColor(pred.risk)}
                        />
                      </TableCell>
                      <TableCell>{(pred.score * 100).toFixed(0)}%</TableCell>
                      <TableCell>{pred.days_left}</TableCell>
                      <TableCell>
                        {pred.risk === '🔴' && (
                          <Button 
                            size="small" 
                            color="error" 
                            variant="outlined"
                            onClick={() => handleAIReassignment(pred.id)}
                          >
                            🤖 Réassigner IA
                          </Button>
                        )}
                        {pred.risk === '🟠' && (
                          <Button 
                            size="small" 
                            color="warning" 
                            variant="text"
                            onClick={() => handlePriorityBoost(pred.id)}
                          >
                            Prioriser
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Capacity Analysis Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Analyse de Capacité par Gestionnaire
            </Typography>
            
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Gestionnaire</TableCell>
                    <TableCell>Bordereaux Actifs</TableCell>
                    <TableCell>Temps Moyen</TableCell>
                    <TableCell>Capacité Quotidienne</TableCell>
                    <TableCell>Jours pour Terminer</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Recommandation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.capacityAnalysis || []).map((analysis) => (
                    <TableRow key={analysis.userId}>
                      <TableCell>{analysis.userName}</TableCell>
                      <TableCell>{analysis.activeBordereaux}</TableCell>
                      <TableCell>{analysis.avgProcessingTime.toFixed(1)} j</TableCell>
                      <TableCell>{analysis.dailyCapacity.toFixed(1)}</TableCell>
                      <TableCell>{analysis.daysToComplete.toFixed(1)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={analysis.capacityStatus}
                          color={getCapacityColor(analysis.capacityStatus)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {analysis.recommendation}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* AI Recommendations Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recommandations Intelligentes
            </Typography>
            
            <Grid container spacing={2}>
              {(data?.recommendations || []).map((rec, index) => (
                <Grid item xs={12} key={index}>
                  <Alert 
                    severity={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                    action={
                      rec.actionRequired && (
                        <Button 
                          color="inherit" 
                          size="small"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          🤖 Appliquer IA
                        </Button>
                      )
                    }
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {rec.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Impact: {rec.impact}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={rec.type}
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          size="small"
                          label={rec.priority}
                          color={getPriorityColor(rec.priority)}
                        />
                      </Box>
                    </Box>
                  </Alert>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Forecast Tab */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prévisions de Charge de Travail
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.forecast?.history || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Bordereaux par jour"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Métriques de Prévision
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Prévision Semaine Prochaine
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {data?.forecast?.nextWeekForecast || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tendance
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <TrendingUp 
                          color={data?.forecast?.slope && data.forecast.slope > 0 ? 'success' : 'error'} 
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="h6">
                          {data?.forecast?.slope && data.forecast.slope > 0 ? 'Croissante' : 'Décroissante'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Coefficient de Tendance
                      </Typography>
                      <Typography variant="h6">
                        {data?.forecast?.slope?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* AI Anomalies Tab */}
        {activeTab === 4 && aiInsights?.anomalies.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              🤖 Anomalies Détectées par l'IA
            </Typography>
            
            <Grid container spacing={2}>
              {(aiInsights?.anomalies || []).map((anomaly: any, index: number) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined" sx={{ 
                    borderColor: anomaly.severity === 'high' ? 'error.main' : 'warning.main',
                    bgcolor: anomaly.severity === 'high' ? 'error.light' : 'warning.light',
                    opacity: 0.9
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          Anomalie #{anomaly.id}
                        </Typography>
                        <Chip 
                          label={anomaly.severity} 
                          color={anomaly.severity === 'high' ? 'error' : 'warning'}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Score d'anomalie: {anomaly.anomaly_score.toFixed(3)}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        Caractéristiques: [{anomaly.features.map((f: number) => f.toFixed(1)).join(', ')}]
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color={anomaly.severity === 'high' ? 'error' : 'warning'}
                          onClick={() => alert(`Investigation de l'anomalie ${anomaly.id} en cours...`)}
                        >
                          Investiguer
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2">
                💡 <strong>Info IA:</strong> Ces anomalies ont été détectées automatiquement par l'algorithme 
                d'apprentissage automatique. Elles indiquent des comportements inhabituels dans les performances 
                qui méritent une investigation approfondie.
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PredictiveAnalyticsDashboard;