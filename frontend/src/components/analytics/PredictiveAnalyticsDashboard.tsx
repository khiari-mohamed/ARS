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
  const { user } = useAuth();

  useEffect(() => {
    loadPredictiveData();
  }, [timeHorizon]);

  const loadPredictiveData = async () => {
    setLoading(true);
    try {
      const [slaResponse, capacityResponse, recommendationsResponse, forecastResponse] = await Promise.all([
        LocalAPI.get('/analytics/sla/predictions'),
        LocalAPI.get('/analytics/sla/capacity'),
        LocalAPI.get('/analytics/recommendations/enhanced'),
        LocalAPI.get('/analytics/forecast')
      ]);

      setData({
        slaPredictions: slaResponse.data,
        capacityAnalysis: capacityResponse.data,
        recommendations: generateAIRecommendations(slaResponse.data, capacityResponse.data),
        forecast: forecastResponse.data
      });
    } catch (error) {
      console.error('Failed to load predictive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = (sla: SLAPrediction[], capacity: CapacityAnalysis[]): AIRecommendation[] => {
    const recommendations: AIRecommendation[] = [];

    // SLA-based recommendations
    const highRiskCount = sla.filter(s => s.risk === '🔴').length;
    if (highRiskCount > 0) {
      recommendations.push({
        type: 'process',
        priority: 'high',
        title: 'Risque SLA Critique Détecté',
        description: `${highRiskCount} bordereaux à risque critique de dépassement SLA`,
        impact: 'Risque de non-conformité contractuelle',
        actionRequired: true
      });
    }

    // Capacity-based recommendations
    const overloadedUsers = capacity.filter(c => c.capacityStatus === 'overloaded');
    if (overloadedUsers.length > 0) {
      recommendations.push({
        type: 'reassignment',
        priority: 'high',
        title: 'Surcharge Détectée',
        description: `${overloadedUsers.length} gestionnaires en surcharge`,
        impact: 'Réassignation recommandée pour optimiser la charge',
        actionRequired: true
      });
    }

    // Staffing recommendations
    const totalWorkload = capacity.reduce((sum, c) => sum + c.activeBordereaux, 0);
    const totalCapacity = capacity.reduce((sum, c) => sum + c.dailyCapacity * 7, 0);
    
    if (totalWorkload > totalCapacity * 1.2) {
      recommendations.push({
        type: 'staffing',
        priority: 'medium',
        title: 'Renforcement d\'Équipe Recommandé',
        description: 'La charge de travail dépasse la capacité actuelle de 20%',
        impact: 'Embauche de personnel supplémentaire suggérée',
        actionRequired: false
      });
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
        <Typography variant="h4" component="h1">
          🔮 Analyses Prédictives IA
        </Typography>
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
          <Tab label="Prédictions SLA" icon={<Warning />} />
          <Tab label="Analyse Capacité" icon={<Speed />} />
          <Tab label="Recommandations IA" icon={<Psychology />} />
          <Tab label="Prévisions" icon={<Timeline />} />
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
                        <Button size="small" color="error" variant="outlined">
                          Réassigner
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
                        <Button color="inherit" size="small">
                          Appliquer
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
      </Paper>
    </Box>
  );
};

export default PredictiveAnalyticsDashboard;