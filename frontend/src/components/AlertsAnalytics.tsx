import React, { useState } from 'react';
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
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  useAlertEffectiveness,
  useFalsePositiveAnalysis,
  useAlertTrends,
  useAlertRecommendations
} from '../hooks/useAlertsKPI';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AlertsAnalytics: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [alertType, setAlertType] = useState('');

  const { data: effectiveness, isLoading: loadingEffectiveness, error: errorEffectiveness } = useAlertEffectiveness(alertType, period);
  const { data: falsePositives, isLoading: loadingFP } = useFalsePositiveAnalysis(period);
  const { data: trends, isLoading: loadingTrends } = useAlertTrends(period);
  const { data: recommendations, isLoading: loadingRecs } = useAlertRecommendations(period);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analytics & Rapports
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
            value={alertType}
            label="Type d'Alerte"
            onChange={(e) => setAlertType(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="SLA_BREACH">Dépassement SLA</MenuItem>
            <MenuItem value="SYSTEM_DOWN">Système Indisponible</MenuItem>
            <MenuItem value="HIGH_VOLUME">Volume Élevé</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Effectiveness Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Efficacité des Alertes
              </Typography>
              {loadingEffectiveness ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : errorEffectiveness ? (
                <Alert severity="error">Erreur lors du chargement des données d'efficacité</Alert>
              ) : effectiveness && effectiveness.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={effectiveness}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="alertType" 
                      tickFormatter={(value) => value.replace('_', ' ')}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [`${value.toFixed(1)}%`, name]}
                      labelFormatter={(label) => label.replace('_', ' ')}
                    />
                    <Legend />
                    <Bar dataKey="precision" fill="#8884d8" name="Précision %" />
                    <Bar dataKey="recall" fill="#82ca9d" name="Rappel %" />
                    <Bar dataKey="f1Score" fill="#ffc658" name="Score F1 %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">Aucune donnée d'efficacité disponible</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Trends Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendances des Alertes
              </Typography>
              {loadingTrends ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis yAxisId="count" orientation="left" />
                    <YAxis yAxisId="time" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                      formatter={(value: any, name: string) => [
                        name.includes('Temps') ? `${Math.round(value)} min` : value,
                        name
                      ]}
                    />
                    <Legend />
                    <Line 
                      yAxisId="count"
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      name="Nombre d'Alertes"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="time"
                      type="monotone" 
                      dataKey="avgResolutionTime" 
                      stroke="#82ca9d" 
                      name="Temps Résolution (min)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">Aucune donnée de tendance disponible</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* False Positives */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Faux Positifs Récents
              </Typography>
              {loadingFP ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : falsePositives && falsePositives.length > 0 ? (
                <Box>
                  {falsePositives.slice(0, 3).map((fp: any, index: number) => (
                    <Box key={fp.alertId || index} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {fp.alertType.replace('_', ' ')}
                        </Typography>
                        <Chip
                          label={fp.impact.toUpperCase()}
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
                  {falsePositives.length > 3 && (
                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
                      +{falsePositives.length - 3} autres faux positifs
                    </Typography>
                  )}
                </Box>
              ) : (
                <Alert severity="info">Aucun faux positif récent</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommandations
              </Typography>
              {loadingRecs ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : recommendations && recommendations.length > 0 ? (
                <Box>
                  {recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <Box key={`${rec.alertType}-${rec.type}-${index}`} mb={2} p={2} bgcolor="info.light" borderRadius={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {rec.type.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Chip
                          label={rec.priority.toUpperCase()}
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" mb={1}>
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
                    </Box>
                  ))}
                  {recommendations.length > 3 && (
                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
                      +{recommendations.length - 3} autres recommandations
                    </Typography>
                  )}
                </Box>
              ) : (
                <Alert severity="info">Aucune recommandation disponible</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlertsAnalytics;