import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  Psychology,
  Speed,
  ExpandMore,
  Warning,
  CheckCircle,
  Lightbulb,
  Assessment
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const PredictiveAnalyticsDashboard: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('bordereaux_count');
  const [forecastPeriod, setForecastPeriod] = useState('30');
  const [trendForecast, setTrendForecast] = useState<any>(null);
  const [capacityPlan, setCapacityPlan] = useState<any>(null);
  const [predictiveModels, setPredictiveModels] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState('staff');

  useEffect(() => {
    loadPredictiveData();
  }, [selectedMetric, forecastPeriod, selectedResource]);

  const loadPredictiveData = async () => {
    try {
      // Mock trend forecast
      setTrendForecast({
        metric: selectedMetric,
        period: 'daily',
        historicalData: generateHistoricalData(),
        forecast: generateForecastData(),
        confidence: 0.87,
        trend: 'increasing',
        seasonality: {
          type: 'weekly',
          strength: 0.15,
          peaks: [1, 2, 3], // Monday, Tuesday, Wednesday
          valleys: [5, 6] // Friday, Saturday
        },
        accuracy: {
          mape: 8.5,
          rmse: 12.3,
          mae: 9.1,
          r2: 0.87
        }
      });

      // Mock capacity plan
      setCapacityPlan({
        resource: selectedResource,
        currentCapacity: 25,
        projectedDemand: generateCapacityProjections(),
        recommendations: [
          {
            type: 'increase_capacity',
            priority: 'high',
            description: `Augmenter la capacité ${selectedResource} de 3 unités pour répondre à la demande projetée`,
            expectedImpact: 'Éliminer les goulots d\'étranglement et maintenir les niveaux de service',
            timeframe: '2-4 semaines',
            cost: 15000,
            roi: 180
          },
          {
            type: 'optimize_process',
            priority: 'medium',
            description: `Optimiser les processus ${selectedResource} pour améliorer l'efficacité`,
            expectedImpact: 'Réduire l\'utilisation moyenne de 10-15%',
            timeframe: '1-2 mois',
            cost: 8000,
            roi: 220
          }
        ],
        riskFactors: [
          {
            factor: 'Forte Utilisation des Capacités',
            probability: 0.7,
            impact: 0.8,
            description: `Utilisation moyenne de ${selectedResource} de 85% augmente le risque de dégradation du service`,
            mitigation: 'Augmenter la capacité ou optimiser les processus'
          },
          {
            factor: 'Volatilité de la Demande',
            probability: 0.5,
            impact: 0.6,
            description: 'Forte volatilité de la demande rend la planification difficile',
            mitigation: 'Implémenter une mise à l\'échelle flexible et des stratégies de lissage'
          }
        ],
        optimizationOpportunities: [
          {
            area: 'Automatisation des Processus',
            currentEfficiency: 75,
            potentialEfficiency: 90,
            description: `Automatiser les tâches routines ${selectedResource} pour améliorer l'efficacité`,
            implementation: 'Déployer des outils d\'automatisation et des workflows',
            expectedSavings: 22500
          },
          {
            area: 'Mutualisation des Ressources',
            currentEfficiency: 70,
            potentialEfficiency: 85,
            description: `Mutualiser ${selectedResource} entre les équipes pour améliorer l'utilisation`,
            implementation: 'Implémenter un système de gestion partagée des ressources',
            expectedSavings: 18000
          }
        ]
      });

      // Mock predictive models
      setPredictiveModels([
        {
          id: 'model_demand_forecast',
          name: 'Modèle de Prévision de Demande',
          type: 'arima',
          target: 'volume_quotidien',
          accuracy: { mape: 8.5, r2: 0.87 },
          lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'model_processing_time',
          name: 'Prédiction Temps de Traitement',
          type: 'neural_network',
          target: 'duree_traitement',
          accuracy: { mape: 12.1, r2: 0.82 },
          lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'model_capacity_planning',
          name: 'Modèle de Planification Capacité',
          type: 'linear_regression',
          target: 'utilisation_ressources',
          accuracy: { mape: 15.3, r2: 0.75 },
          lastTrained: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          status: 'training'
        }
      ]);
    } catch (error) {
      console.error('Failed to load predictive analytics data:', error);
    }
  };

  const generateHistoricalData = () => {
    const data = [];
    const baseValue = getBaseValue(selectedMetric);
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const trend = 0.01 * (30 - i); // Slight upward trend
      const seasonal = Math.sin((date.getDay() / 7) * 2 * Math.PI) * baseValue * 0.1;
      const noise = (Math.random() - 0.5) * baseValue * 0.1;
      
      let value = baseValue * (1 + trend) + seasonal + noise;
      value = Math.max(value, baseValue * 0.5);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100,
        actual: true
      });
    }
    
    return data;
  };

  const generateForecastData = () => {
    const data = [];
    const baseValue = getBaseValue(selectedMetric);
    const days = parseInt(forecastPeriod);
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const trend = 0.01 * i;
      const seasonal = Math.sin((date.getDay() / 7) * 2 * Math.PI) * baseValue * 0.1;
      
      let predicted = baseValue * (1 + trend) + seasonal;
      const confidence = Math.max(0.5, 0.95 - (i / days) * 0.4);
      const errorMargin = predicted * (1 - confidence);
      
      data.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round((predicted - errorMargin) * 100) / 100,
        upperBound: Math.round((predicted + errorMargin) * 100) / 100,
        confidence
      });
    }
    
    return data;
  };

  const generateCapacityProjections = () => {
    const data = [];
    const currentCapacity = 25;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const demand = 15 + Math.sin((i / 7) * 2 * Math.PI) * 5 + Math.random() * 3;
      const utilization = (demand / currentCapacity) * 100;
      
      data.push({
        date: date.toISOString().split('T')[0],
        demandForecast: Math.round(demand * 100) / 100,
        capacityUtilization: Math.round(utilization * 100) / 100,
        shortfall: demand > currentCapacity ? demand - currentCapacity : undefined,
        surplus: demand < currentCapacity ? currentCapacity - demand : undefined,
        confidence: 0.85 - (Math.random() * 0.2)
      });
    }
    
    return data;
  };

  const getBaseValue = (metric: string) => {
    const baseValues: Record<string, number> = {
      'bordereaux_count': 150,
      'processing_time': 2.5,
      'success_rate': 95,
      'workload': 80,
      'staff_utilization': 75
    };
    return baseValues[metric] || 100;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="success" />;
      case 'decreasing': return <TrendingDown color="error" />;
      default: return <Timeline color="action" />;
    }
  };

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'training': return 'info';
      case 'deprecated': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analyses Prédictives et Planification
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Métrique à Prévoir</InputLabel>
            <Select
              value={selectedMetric}
              label="Métrique à Prévoir"
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <MenuItem value="bordereaux_count">Nombre de Bordereaux</MenuItem>
              <MenuItem value="processing_time">Temps de Traitement</MenuItem>
              <MenuItem value="success_rate">Taux de Succès</MenuItem>
              <MenuItem value="workload">Charge de Travail</MenuItem>
              <MenuItem value="staff_utilization">Utilisation Personnel</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Période de Prévision</InputLabel>
            <Select
              value={forecastPeriod}
              label="Période de Prévision"
              onChange={(e) => setForecastPeriod(e.target.value)}
            >
              <MenuItem value="7">7 jours</MenuItem>
              <MenuItem value="14">14 jours</MenuItem>
              <MenuItem value="30">30 jours</MenuItem>
              <MenuItem value="90">90 jours</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Ressource (Capacité)</InputLabel>
            <Select
              value={selectedResource}
              label="Ressource (Capacité)"
              onChange={(e) => setSelectedResource(e.target.value)}
            >
              <MenuItem value="staff">Personnel</MenuItem>
              <MenuItem value="processing_power">Puissance de Traitement</MenuItem>
              <MenuItem value="storage">Stockage</MenuItem>
              <MenuItem value="bandwidth">Bande Passante</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="contained"
            startIcon={<Psychology />}
            onClick={loadPredictiveData}
            fullWidth
          >
            Actualiser Prévisions
          </Button>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Trend Forecast */}
        {trendForecast && (
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Prévision de Tendance - {selectedMetric}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(trendForecast.trend)}
                    <Chip
                      label={`Confiance: ${(trendForecast.confidence * 100).toFixed(0)}%`}
                      color={trendForecast.confidence > 0.8 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Box>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      data={trendForecast.historicalData}
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Historique"
                    />
                    <Line
                      data={trendForecast.forecast}
                      type="monotone"
                      dataKey="predicted"
                      stroke="#ff7300"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Prévision"
                    />
                  </LineChart>
                </ResponsiveContainer>

                <Alert severity="info" sx={{ mt: 2 }}>
                  Tendance {trendForecast.trend === 'increasing' ? 'croissante' : 
                           trendForecast.trend === 'decreasing' ? 'décroissante' : 'stable'} 
                  détectée avec une précision de {trendForecast.accuracy.mape.toFixed(1)}% MAPE.
                  {trendForecast.seasonality && (
                    ` Saisonnalité ${trendForecast.seasonality.type} identifiée.`
                  )}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Model Performance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                Modèles Prédictifs
              </Typography>
              
              <List>
                {predictiveModels.map((model) => (
                  <ListItem key={model.id}>
                    <ListItemIcon>
                      <Psychology color={model.status === 'active' ? 'success' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {model.name}
                          </Typography>
                          <Chip
                            label={model.status}
                            color={getModelStatusColor(model.status) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Type: {model.type} | R²: {model.accuracy.r2.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            MAPE: {model.accuracy.mape.toFixed(1)}% | 
                            Entraîné: {new Date(model.lastTrained).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Capacity Planning */}
        {capacityPlan && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Planification de Capacité - {selectedResource}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={capacityPlan.projectedDemand}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="demandForecast"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                          name="Demande Prévue"
                        />
                        <Area
                          type="monotone"
                          dataKey="capacityUtilization"
                          stackId="2"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          name="Utilisation %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom>
                      Métriques Clés
                    </Typography>
                    <Paper sx={{ p: 2, mb: 2 }}>
                      <Typography variant="h4" color="primary" textAlign="center">
                        {capacityPlan.currentCapacity}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Capacité Actuelle
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 2, mb: 2 }}>
                      <Typography variant="h4" color="warning.main" textAlign="center">
                        {capacityPlan.projectedDemand.reduce((sum: number, p: any) => sum + p.demandForecast, 0) / capacityPlan.projectedDemand.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Demande Moyenne Prévue
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h4" color="info.main" textAlign="center">
                        {(capacityPlan.projectedDemand.reduce((sum: number, p: any) => sum + p.capacityUtilization, 0) / capacityPlan.projectedDemand.length).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Utilisation Moyenne
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recommendations */}
        {capacityPlan && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Recommandations
                </Typography>
                
                {capacityPlan.recommendations.map((rec: any, index: number) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <Typography variant="subtitle1" fontWeight={600}>
                          {rec.type === 'increase_capacity' ? 'Augmenter Capacité' :
                           rec.type === 'optimize_process' ? 'Optimiser Processus' :
                           rec.type === 'redistribute_workload' ? 'Redistribuer Charge' : rec.type}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                          label={rec.priority}
                          color={getPriorityColor(rec.priority) as any}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        {rec.description}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Impact Attendu:
                          </Typography>
                          <Typography variant="body2">
                            {rec.expectedImpact}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Délai:
                          </Typography>
                          <Typography variant="body2">
                            {rec.timeframe}
                          </Typography>
                        </Grid>
                        {rec.cost && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">
                              Coût Estimé:
                            </Typography>
                            <Typography variant="body2">
                              €{rec.cost.toLocaleString()}
                            </Typography>
                          </Grid>
                        )}
                        {rec.roi && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">
                              ROI:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              {rec.roi}%
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Risk Factors */}
        {capacityPlan && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Facteurs de Risque
                </Typography>
                
                <List>
                  {capacityPlan.riskFactors.map((risk: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {risk.factor}
                            </Typography>
                            <Chip
                              label={`${(risk.probability * 100).toFixed(0)}% prob.`}
                              size="small"
                              color="warning"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {risk.description}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              Mitigation: {risk.mitigation}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={risk.probability * risk.impact * 100}
                              sx={{ mt: 1, height: 4 }}
                              color="warning"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PredictiveAnalyticsDashboard;