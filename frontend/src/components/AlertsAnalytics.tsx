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
  Alert
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
                <CircularProgress />
              ) : errorEffectiveness ? (
                <Alert severity="error">Erreur lors du chargement</Alert>
              ) : effectiveness && effectiveness.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={effectiveness}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="alertType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="precision" fill="#8884d8" name="Précision %" />
                    <Bar dataKey="recall" fill="#82ca9d" name="Rappel %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography>Aucune donnée disponible</Typography>
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
                <CircularProgress />
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.slice(-14)}>
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
                <Typography>Aucune donnée de tendance</Typography>
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
                <CircularProgress />
              ) : falsePositives && falsePositives.length > 0 ? (
                <Box>
                  {falsePositives.slice(0, 3).map((fp: any, index: number) => (
                    <Box key={index} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        {fp.alertType}
                      </Typography>
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
                <Typography>Aucun faux positif récent</Typography>
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
                <CircularProgress />
              ) : recommendations && recommendations.length > 0 ? (
                <Box>
                  {recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <Box key={index} mb={2} p={2} bgcolor="info.light" borderRadius={1}>
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        {rec.type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="body2" mb={1}>
                        {rec.description}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        📈 {rec.expectedImpact}
                      </Typography>
                    </Box>
                  ))}
                </Box>
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

export default AlertsAnalytics;