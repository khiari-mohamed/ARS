import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Analytics
} from '@mui/icons-material';
import {
  useAlertEffectiveness,
  useFalsePositiveAnalysis,
  useAlertTrends,
  useAlertRecommendations,
  useAlertPerformanceReport
} from '../hooks/useAlertsKPI';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AlertAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [selectedAlertType, setSelectedAlertType] = useState<string>('');

  const { data: effectiveness, isLoading: loadingEffectiveness } = useAlertEffectiveness(selectedAlertType, period);
  const { data: falsePositives, isLoading: loadingFP } = useFalsePositiveAnalysis(period);
  const { data: trends, isLoading: loadingTrends } = useAlertTrends(period);
  const { data: recommendations, isLoading: loadingRecs } = useAlertRecommendations(period);
  const { data: performanceReport, isLoading: loadingReport } = useAlertPerformanceReport(period);

  const getEffectivenessColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analyses Avancées des Alertes
      </Typography>

      {/* Controls */}
      <Box display="flex" gap={2} mb={3}>
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type d'Alerte</InputLabel>
          <Select
            value={selectedAlertType}
            label="Type d'Alerte"
            onChange={(e) => setSelectedAlertType(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="SLA_BREACH">Dépassement SLA</MenuItem>
            <MenuItem value="SYSTEM_DOWN">Système Indisponible</MenuItem>
            <MenuItem value="HIGH_VOLUME">Volume Élevé</MenuItem>
            <MenuItem value="PROCESSING_DELAY">Retard de Traitement</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Performance Overview */}
        {performanceReport && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vue d'Ensemble des Performances
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {performanceReport.overview.totalAlerts}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Alertes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {performanceReport.overview.resolvedAlerts}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Résolues
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {performanceReport.overview.avgResolutionTime}min
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Temps Moyen
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {performanceReport.overview.falsePositiveRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Faux Positifs
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main">
                        {performanceReport.overview.escalationRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Escalades
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Alert Effectiveness */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Efficacité des Alertes
              </Typography>
              {loadingEffectiveness ? (
                <CircularProgress />
              ) : effectiveness ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Précision</TableCell>
                        <TableCell>Rappel</TableCell>
                        <TableCell>Score F1</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {effectiveness.map((item: any) => (
                        <TableRow key={item.alertType}>
                          <TableCell>{item.alertType}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={item.precision}
                                sx={{ width: 60, height: 6 }}
                                color={getEffectivenessColor(item.precision) as any}
                              />
                              <Typography variant="caption">
                                {item.precision.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={item.recall}
                                sx={{ width: 60, height: 6 }}
                                color={getEffectivenessColor(item.recall) as any}
                              />
                              <Typography variant="caption">
                                {item.recall.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${item.f1Score.toFixed(1)}%`}
                              color={getEffectivenessColor(item.f1Score) as any}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>Aucune donnée disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* False Positives Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analyse des Faux Positifs
              </Typography>
              {loadingFP ? (
                <CircularProgress />
              ) : falsePositives ? (
                <Box>
                  {falsePositives.slice(0, 5).map((fp: any, index: number) => (
                    <Box key={index} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {fp.alertType}
                        </Typography>
                        <Chip
                          label={fp.impact}
                          color={fp.impact === 'high' ? 'error' : fp.impact === 'medium' ? 'warning' : 'info'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {fp.reason}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        💡 {fp.suggestedFix}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography>Aucune donnée disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Trends Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendances des Alertes
              </Typography>
              {loadingTrends ? (
                <CircularProgress />
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="Nombre d'Alertes" />
                    <Line type="monotone" dataKey="avgResolutionTime" stroke="#82ca9d" name="Temps Résolution (min)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography>Aucune donnée de tendance disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommandations d'Amélioration
              </Typography>
              {loadingRecs ? (
                <CircularProgress />
              ) : recommendations ? (
                <Grid container spacing={2}>
                  {recommendations.map((rec: any, index: number) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={2}>
                            <Analytics color="primary" />
                            <Typography variant="subtitle1" fontWeight={600}>
                              {rec.type.replace('_', ' ').toUpperCase()}
                            </Typography>
                            <Chip
                              label={rec.priority}
                              color={getPriorityColor(rec.priority) as any}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" mb={2}>
                            {rec.description}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="success.main">
                              📈 {rec.expectedImpact}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ⏱️ {rec.estimatedEffort}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography>Aucune recommandation disponible</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlertAnalyticsDashboard;