import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Person,
  Business,
  Schedule,
  Refresh,
  Psychology
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line } from 'recharts';
import { LocalAPI } from '../../services/axios';

interface ClaimsAnalyticsData {
  summary: {
    totalClaims: number;
    resolvedClaims: number;
    avgResolutionTime: number;
    recurringIssues: number;
  };
  performanceRanking: {
    department: string;
    personnel: string;
    claimsHandled: number;
    avgResolutionTime: number;
    satisfactionScore: number;
    rank: number;
  }[];
  recurringPatterns: {
    issue: string;
    frequency: number;
    impact: 'low' | 'medium' | 'high';
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  }[];
  correlationAnalysis: {
    factor: string;
    correlation: number;
    description: string;
  }[];
  aiRecommendations: {
    type: 'process_improvement' | 'training' | 'resource_allocation' | 'prevention';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }[];
  trendsData: {
    date: string;
    claims: number;
    resolved: number;
    avgTime: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ClaimsAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<ClaimsAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    loadClaimsAnalytics();
    const interval = setInterval(loadClaimsAnalytics, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [period]);

  const loadClaimsAnalytics = async () => {
    try {
      const response = await LocalAPI.get('/analytics/claims-advanced', {
        params: { period }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load claims analytics:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="error" />;
      case 'decreasing': return <TrendingDown color="success" />;
      case 'stable': return <Schedule color="info" />;
      default: return null;
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
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Analytics Avancées des Réclamations
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={period}
              label="Période"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="7d">7 jours</MenuItem>
              <MenuItem value="30d">30 jours</MenuItem>
              <MenuItem value="90d">90 jours</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadClaimsAnalytics}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Summary KPIs */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Réclamations
              </Typography>
              <Typography variant="h4" component="div">
                {data.summary.totalClaims}
              </Typography>
              <Typography variant="caption" color="success.main">
                {data.summary.resolvedClaims} résolues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Temps Moyen Résolution
              </Typography>
              <Typography variant="h4" component="div">
                {data.summary.avgResolutionTime}j
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (5 - data.summary.avgResolutionTime) * 20)}
                color={data.summary.avgResolutionTime < 2 ? 'success' : data.summary.avgResolutionTime < 3 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Problèmes Récurrents
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {data.summary.recurringIssues}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                nécessitent attention
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
              <Typography variant="h4" component="div" color="success.main">
                {((data.summary.resolvedClaims / data.summary.totalClaims) * 100).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(data.summary.resolvedClaims / data.summary.totalClaims) * 100}
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Performance Ranking */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Person /> Classement Performance
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rang</TableCell>
                      <TableCell>Personnel</TableCell>
                      <TableCell align="center">Traitées</TableCell>
                      <TableCell align="center">Temps Moy.</TableCell>
                      <TableCell align="center">Satisfaction</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.performanceRanking.map((person) => (
                      <TableRow key={person.personnel}>
                        <TableCell>
                          <Chip
                            label={`#${person.rank}`}
                            color={person.rank === 1 ? 'success' : person.rank === 2 ? 'info' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {person.personnel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {person.department}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {person.claimsHandled}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {person.avgResolutionTime}j
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Typography variant="body2">
                              {person.satisfactionScore}/5
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(person.satisfactionScore / 5) * 100}
                              sx={{ width: 30, height: 4 }}
                              color={person.satisfactionScore > 4 ? 'success' : 'warning'}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Trends Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendances des Réclamations
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                  />
                  <Line type="monotone" dataKey="claims" stroke="#8884d8" strokeWidth={2} name="Nouvelles" />
                  <Line type="monotone" dataKey="resolved" stroke="#82ca9d" strokeWidth={2} name="Résolues" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recurring Patterns */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Warning /> Problèmes Récurrents Détectés
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Problème</TableCell>
                      <TableCell align="center">Fréquence</TableCell>
                      <TableCell align="center">Impact</TableCell>
                      <TableCell align="center">Tendance</TableCell>
                      <TableCell>Recommandation IA</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recurringPatterns.map((pattern, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {pattern.issue}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={pattern.frequency}
                            color={pattern.frequency > 20 ? 'error' : pattern.frequency > 10 ? 'warning' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={pattern.impact.toUpperCase()}
                            color={getImpactColor(pattern.impact) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            {getTrendIcon(pattern.trend)}
                            <Typography variant="body2">
                              {pattern.trend}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {pattern.recommendation}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Correlation Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Business /> Analyse de Corrélation
              </Typography>
              {data.correlationAnalysis.map((correlation, index) => (
                <Box key={index} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={500}>
                      {correlation.factor}
                    </Typography>
                    <Chip
                      label={`${(correlation.correlation * 100).toFixed(0)}%`}
                      color={Math.abs(correlation.correlation) > 0.7 ? 'error' : Math.abs(correlation.correlation) > 0.5 ? 'warning' : 'info'}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.abs(correlation.correlation) * 100}
                    color={Math.abs(correlation.correlation) > 0.7 ? 'error' : Math.abs(correlation.correlation) > 0.5 ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {correlation.description}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Recommendations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Psychology /> Recommandations IA
              </Typography>
              {data.aiRecommendations.map((recommendation, index) => (
                <Alert key={index} severity={getPriorityColor(recommendation.priority) as any} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {recommendation.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {recommendation.description}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      📈 Impact attendu: {recommendation.expectedImpact}
                    </Typography>
                  </Box>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClaimsAnalyticsDashboard;