import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Lightbulb,
  ExpandMore,
  Psychology,
  Analytics,
  BugReport,
  Insights
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { getClaimPatterns, getRootCauses, getAnalyticsInsights, getAdvancedMetrics } from '../../services/reclamationsService';

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState('90d');
  const [patterns, setPatterns] = useState<any[]>([]);
  const [rootCauses, setRootCauses] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [patternsData, rootCausesData, insightsData, metricsData] = await Promise.all([
        getClaimPatterns(period),
        getRootCauses(period),
        getAnalyticsInsights(period),
        getAdvancedMetrics(period)
      ]);

      setPatterns(patternsData);
      setRootCauses(rootCausesData);
      setInsights(insightsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="error" />;
      case 'decreasing': return <TrendingDown color="success" />;
      default: return <TrendingUp color="action" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading || !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Analyses Avancées des Réclamations
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            label="Période"
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
          >
            <MenuItem value="30d">30 jours</MenuItem>
            <MenuItem value="90d">90 jours</MenuItem>
            <MenuItem value="180d">6 mois</MenuItem>
            <MenuItem value="365d">1 an</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Patterns Identifiés
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.patterns.total}
              </Typography>
              <Typography variant="caption" color="error">
                {metrics.patterns.highImpact} à fort impact
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Causes Racines
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.rootCauses.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Coût prévention: {metrics.rootCauses.preventionCost.toLocaleString()}€
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Taux de Résolution
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.overview.resolutionRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="success.main">
                {metrics.overview.resolvedClaims} résolues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Temps Moyen
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.overview.avgResolutionTime}j
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Résolution moyenne
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights Alerts */}
      {insights.length > 0 && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Insights et Recommandations
            </Typography>
            {insights.slice(0, 3).map((insight, index) => (
              <Alert
                key={index}
                severity={getSeverityColor(insight.severity) as any}
                sx={{ mb: 2 }}
                action={
                  insight.actionable && (
                    <Button color="inherit" size="small">
                      Agir
                    </Button>
                  )
                }
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {insight.title}
                </Typography>
                <Typography variant="body2">
                  {insight.description}
                </Typography>
                {insight.suggestedActions.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Actions suggérées: {insight.suggestedActions.slice(0, 2).join(', ')}
                    </Typography>
                  </Box>
                )}
              </Alert>
            ))}
          </Grid>
        </Grid>
      )}

      {/* Main Analytics */}
      <Grid container spacing={3}>
        {/* Claim Patterns */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
                Patterns de Réclamations
              </Typography>
              
              <List>
                {patterns.slice(0, 5).map((pattern, index) => (
                  <ListItem key={pattern.id}>
                    <ListItemIcon>
                      {getTrendIcon(pattern.trend)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {pattern.pattern}
                          </Typography>
                          <Chip
                            label={pattern.impact}
                            color={getImpactColor(pattern.impact) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Fréquence: {pattern.frequency} | Temps moyen: {pattern.avgResolutionTime}j
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Catégories: {pattern.categories.join(', ')}
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

        {/* Root Causes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                Causes Racines
              </Typography>
              
              {rootCauses.slice(0, 3).map((cause, index) => (
                <Accordion key={cause.id}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {cause.cause}
                      </Typography>
                      <Chip label={`${cause.frequency} cas`} size="small" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Catégorie: {cause.category} | Coût estimé: {cause.estimatedCost.toLocaleString()}€
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Actions préventives:
                    </Typography>
                    <List dense>
                      {cause.preventionActions.map((action: string, actionIndex: number) => (
                        <ListItem key={actionIndex}>
                          <ListItemIcon>
                            <Lightbulb fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={action} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Analysis */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                Analyse des Tendances
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { date: '2024-01', volume: 45, resolution: 38 },
                  { date: '2024-02', volume: 52, resolution: 44 },
                  { date: '2024-03', volume: 48, resolution: 41 },
                  { date: '2024-04', volume: 61, resolution: 52 },
                  { date: '2024-05', volume: 58, resolution: 49 },
                  { date: '2024-06', volume: 67, resolution: 58 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Volume"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolution" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Résolues"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition par Catégorie
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Remboursement', value: 35 },
                      { name: 'Délai', value: 25 },
                      { name: 'Service', value: 20 },
                      { name: 'Erreur', value: 15 },
                      { name: 'Technique', value: 5 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Impact Analysis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Insights sx={{ mr: 1, verticalAlign: 'middle' }} />
                Analyse d'Impact
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Impact par Fréquence
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={patterns.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="pattern" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Temps de Résolution Moyen
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={patterns.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="pattern" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgResolutionTime" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recommandations Stratégiques
              </Typography>
              
              <Grid container spacing={2}>
                {insights.filter(i => i.type === 'recommendation').map((recommendation, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {recommendation.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {recommendation.description}
                      </Typography>
                      <List dense>
                        {recommendation.suggestedActions.slice(0, 3).map((action: string, actionIndex: number) => (
                          <ListItem key={actionIndex} sx={{ px: 0 }}>
                            <ListItemText 
                              primary={`• ${action}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {recommendation.data?.estimatedCost && (
                        <Typography variant="caption" color="text.secondary">
                          Coût estimé: {recommendation.data.estimatedCost.toLocaleString()}€
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;