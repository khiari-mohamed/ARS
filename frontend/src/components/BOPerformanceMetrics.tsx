import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Speed, Error, TrendingUp, Assessment } from '@mui/icons-material';
import { fetchBOPerformance } from '../services/boService';

interface Props {
  userId?: string;
}

const BOPerformanceMetrics: React.FC<Props> = ({ userId }) => {
  const [period, setPeriod] = useState('daily');
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [period, userId]);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const data = await fetchBOPerformance(userId, period);
      setPerformance(data);
    } catch (error) {
      console.error('Failed to load BO performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!performance) {
    return (
      <Typography color="text.secondary" align="center">
        Aucune donnée de performance disponible
      </Typography>
    );
  }

  // Prepare chart data from activities
  const chartData = performance.activities
    .filter((activity: any) => activity.action === 'BO_CREATE_ENTRY')
    .reduce((acc: any[], activity: any) => {
      const date = new Date(activity.timestamp).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [])
    .slice(-7); // Last 7 days

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Performance BO</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            label="Période"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="daily">Quotidien</MenuItem>
            <MenuItem value="weekly">Hebdomadaire</MenuItem>
            <MenuItem value="monthly">Mensuel</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <TrendingUp color="primary" />
                <Typography variant="h6" ml={1}>
                  {performance.totalEntries}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Total Entrées
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <Speed color="info" />
                <Typography variant="h6" ml={1}>
                  {performance.entrySpeed}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Entrées/Heure
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <Assessment color="secondary" />
                <Typography variant="h6" ml={1}>
                  {performance.avgProcessingTime}s
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Temps Moyen
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <Error color={performance.errorRate > 5 ? 'error' : 'success'} />
                <Typography variant="h6" ml={1}>
                  {performance.errorRate}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Taux d'Erreur
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity Chart */}
      {chartData.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Activité des 7 derniers jours
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Performance Indicators */}
      <Box mt={2}>
        <Typography variant="subtitle2" gutterBottom>
          Indicateurs de Performance
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">Vitesse d'Entrée</Typography>
              <Typography variant="body2" fontWeight={500}>
                {performance.entrySpeed > 2 ? 'Excellent' : 
                 performance.entrySpeed > 1 ? 'Bon' : 'À améliorer'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(performance.entrySpeed * 20, 100)}
              color={performance.entrySpeed > 2 ? 'success' : 
                     performance.entrySpeed > 1 ? 'warning' : 'error'}
            />
          </Grid>
          <Grid item xs={12} mt={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">Qualité (Taux d'Erreur Inversé)</Typography>
              <Typography variant="body2" fontWeight={500}>
                {performance.errorRate < 2 ? 'Excellent' : 
                 performance.errorRate < 5 ? 'Bon' : 'À améliorer'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(100 - performance.errorRate * 10, 0)}
              color={performance.errorRate < 2 ? 'success' : 
                     performance.errorRate < 5 ? 'warning' : 'error'}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default BOPerformanceMetrics;