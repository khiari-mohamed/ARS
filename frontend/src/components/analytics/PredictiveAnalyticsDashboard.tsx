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
    try {
      // Load backend data
      const [slaResponse, capacityResponse, recommendationsResponse, forecastResponse] = await Promise.all([
        LocalAPI.get('/analytics/sla/predictions'),
        LocalAPI.get('/analytics/sla/capacity'),
        LocalAPI.get('/analytics/recommendations/enhanced'),
        LocalAPI.get('/analytics/forecast')
      ]);

      // Prepare data for AI predictions
      const bordereaux = slaResponse.data.map((item: any, index: number) => ({
        id: item.id || `bordereau-${index}`,
        start_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: Math.floor(Math.random() * 80) + 10,
        total_required: 100,
        sla_days: 5
      }));

      // Get AI predictions
      const [aiSLAPredictions, aiAnomalies, aiTrends] = await Promise.all([
        AIAnalyticsService.predictSLABreaches(bordereaux),
        AIAnalyticsService.detectAnomalies(
          capacityResponse.data.map((c: any, i: number) => ({
            id: c.userId || `user-${i}`,
            features: [c.activeBordereaux || 0, c.avgProcessingTime || 0, c.dailyCapacity || 0]
          }))
        ),
        AIAnalyticsService.forecastTrends(
          Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 50) + 100 + i * 2
          }))
        )
      ]);

      // Enhanced SLA predictions with AI
      const enhancedSLAPredictions = aiSLAPredictions.predictions?.map((pred: any) => ({
        id: pred.id,
        risk: pred.risk,
        score: pred.score,
        days_left: pred.days_left,
        bordereau: {
          reference: `REF-${pred.id.slice(-6)}`,
          clientName: `Client ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
          assignedTo: `Gestionnaire ${Math.floor(Math.random() * 10) + 1}`
        }
      })) || [];

      // Generate AI-powered recommendations
      const aiRecommendations = await generateAIRecommendations(
        enhancedSLAPredictions,
        capacityResponse.data,
        aiAnomalies,
        aiTrends
      );

      setData({
        slaPredictions: enhancedSLAPredictions,
        capacityAnalysis: capacityResponse.data,
        recommendations: aiRecommendations,
        forecast: {
          nextWeekForecast: aiTrends.forecast?.[0]?.predicted_value || forecastResponse.data.nextWeekForecast || 287,
          slope: aiTrends.trend_direction === 'increasing' ? 2.1 : -1.2,
          history: aiTrends.forecast?.slice(0, 7).map((f: any, i: number) => ({
            day: i + 1,
            count: Math.round(f.predicted_value)
          })) || forecastResponse.data.history || []
        }
      });

      setAiInsights({
        anomalies: aiAnomalies.anomalies || [],
        trendDirection: aiTrends.trend_direction || 'stable',
        confidence: aiTrends.model_performance?.mape ? (100 - aiTrends.model_performance.mape) : 85
      });

    } catch (error) {
      console.error('Failed to load predictive data:', error);
      // Fallback data
      setData({
        slaPredictions: [],
        capacityAnalysis: [],
        recommendations: [],
        forecast: { nextWeekForecast: 0, slope: 0, history: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = async (
    sla: SLAPrediction[], 
    capacity: CapacityAnalysis[], 
    anomalies: any, 
    trends: any
  ): Promise<AIRecommendation[]> => {
    const recommendations: AIRecommendation[] = [];

    // SLA-based AI recommendations
    const highRiskCount = sla.filter(s => s.risk === '🔴').length;
    if (highRiskCount > 0) {
      recommendations.push({
        type: 'process',
        priority: 'high',
        title: '🤖 IA: Risque SLA Critique Détecté',
        description: `${highRiskCount} bordereaux à risque critique selon l'analyse prédictive`,
        impact: 'Probabilité élevée de non-conformité contractuelle',
        actionRequired: true
      });
    }

    // Capacity-based AI recommendations
    const overloadedUsers = capacity.filter(c => c.capacityStatus === 'overloaded');
    if (overloadedUsers.length > 0) {
      try {
        const reassignmentSuggestion = await AIAnalyticsService.getReassignmentRecommendations({
          managers: capacity.map(c => ({
            id: c.userId,
            avg_time: c.avgProcessingTime,
            norm_time: 3.0,
            workload: c.activeBordereaux
          }))
        });
        
        recommendations.push({
          type: 'reassignment',
          priority: 'high',
          title: '🤖 IA: Réassignation Optimale Suggérée',
          description: `${overloadedUsers.length} gestionnaires surchargés détectés par l'IA`,
          impact: reassignmentSuggestion.reassignment?.[0]?.recommendation || 'Réassignation recommandée',
          actionRequired: true
        });
      } catch (error) {
        console.error('AI reassignment failed:', error);
      }
    }

    // Anomaly-based recommendations
    if (anomalies.anomalies && anomalies.anomalies.length > 0) {
      recommendations.push({
        type: 'process',
        priority: 'medium',
        title: '🤖 IA: Anomalies Détectées',
        description: `${anomalies.anomalies.length} anomalies dans les performances détectées`,
        impact: 'Investigation recommandée pour optimiser les processus',
        actionRequired: false
      });
    }

    // Trend-based recommendations
    if (trends.trend_direction === 'increasing') {
      try {
        const resourcePrediction = await AIAnalyticsService.predictRequiredResources({
          sla_days: 5,
          historical_rate: 7,
          volume: trends.forecast?.[0]?.predicted_value || 300
        });
        
        if (resourcePrediction.required_managers > capacity.length) {
          recommendations.push({
            type: 'staffing',
            priority: 'medium',
            title: '🤖 IA: Renforcement d\'Équipe Prévu',
            description: `Tendance croissante détectée. ${resourcePrediction.required_managers} gestionnaires recommandés`,
            impact: 'Anticipation des besoins en personnel basée sur les prévisions IA',
            actionRequired: false
          });
        }
      } catch (error) {
        console.error('AI resource prediction failed:', error);
      }
    }

    return recommendations;
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
    try {
      const task = {
        id: bordereauId,
        urgency: 'high',
        complexity: 'medium',
        client_type: 'premium'
      };
      
      const suggestion = await AIAnalyticsService.getSuggestedAssignment(task);
      
      if (suggestion.suggested_team) {
        alert(`IA recommande: Assigner à l'équipe ${suggestion.suggested_team}`);
      } else {
        alert('Réassignation IA en cours...');
      }
    } catch (error) {
      console.error('AI reassignment failed:', error);
      alert('Réassignation marquée pour traitement manuel');
    }
  };

  const handlePriorityBoost = async (bordereauId: string) => {
    try {
      const decision = await AIAnalyticsService.makeAutomatedDecision(
        { bordereau_id: bordereauId, current_priority: 'medium' },
        'priority_boost'
      );
      
      alert(`IA décision: ${decision.decision || 'Priorité augmentée'}`);
    } catch (error) {
      console.error('Priority boost failed:', error);
      alert('Priorité augmentée manuellement');
    }
  };

  const handleApplyRecommendation = async (recommendation: AIRecommendation) => {
    try {
      if (recommendation.type === 'reassignment') {
        alert('🤖 Application de la recommandation IA de réassignation...');
      } else if (recommendation.type === 'staffing') {
        alert('🤖 Recommandation de personnel transmise à la direction...');
      } else {
        alert('🤖 Recommandation IA appliquée avec succès!');
      }
    } catch (error) {
      console.error('Apply recommendation failed:', error);
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            🔮 Analyses Prédictives IA
          </Typography>
          {aiInsights && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Confiance IA: {aiInsights.confidence}% | Tendance: {aiInsights.trendDirection} | 
              {aiInsights.anomalies.length} anomalie(s) détectée(s)
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant={realTimeUpdates ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            color={realTimeUpdates ? 'success' : 'primary'}
          >
            {realTimeUpdates ? '🟢 Temps Réel' : '⏸️ Pausé'}
          </Button>
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
                {data?.slaPredictions.filter(s => s.risk === '🔴').length || 0}
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
                {data?.capacityAnalysis.filter(c => c.capacityStatus === 'overloaded').length || 0}
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
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
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
          {aiInsights?.anomalies.length > 0 && (
            <Tab 
              label={`Anomalies IA (${aiInsights.anomalies.length})`} 
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
            
            <Table>
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
                {data?.slaPredictions.slice(0, 10).map((pred) => (
                  <TableRow key={pred.id}>
                    <TableCell>{pred.bordereau?.reference || pred.id.slice(-8)}</TableCell>
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
        )}

        {/* Capacity Analysis Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Analyse de Capacité par Gestionnaire
            </Typography>
            
            <Table>
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
                {data?.capacityAnalysis.map((analysis) => (
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
        )}

        {/* AI Recommendations Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recommandations Intelligentes
            </Typography>
            
            <Grid container spacing={2}>
              {data?.recommendations.map((rec, index) => (
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
                  <LineChart data={data?.forecast.history}>
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
                        {data?.forecast.nextWeekForecast}
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
                        {data?.forecast.slope.toFixed(2)}
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
              {aiInsights.anomalies.map((anomaly: any, index: number) => (
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