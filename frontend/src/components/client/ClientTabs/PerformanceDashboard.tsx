import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, LinearProgress, Chip, Card, CardContent,
  Select, MenuItem, FormControl, InputLabel, Alert
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { fetchClientAnalytics, fetchClientTrends } from '../../../services/clientService';

interface Props {
  clientId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const PerformanceDashboard: React.FC<Props> = ({ clientId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [analyticsData, trendsData] = await Promise.all([
          fetchClientAnalytics(clientId),
          fetchClientTrends(clientId)
        ]);
        setAnalytics(analyticsData);
        setTrends(trendsData);
      } catch (error) {
        console.error('Failed to load performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId, period]);

  if (loading) {
    return <LinearProgress />;
  }

  const slaCompliance = analytics?.avgSLA && analytics?.reglementDelay 
    ? Math.max(0, Math.min(100, ((analytics.reglementDelay - analytics.avgSLA) / analytics.reglementDelay) * 100))
    : 0;

  const kpiCards = [
    {
      title: 'Dossiers Traités',
      value: analytics?.bordereauxCount || 0,
      color: '#1976d2',
      trend: '+12%'
    },
    {
      title: 'Conformité SLA',
      value: `${slaCompliance.toFixed(1)}%`,
      color: slaCompliance > 80 ? '#4caf50' : slaCompliance > 60 ? '#ff9800' : '#f44336',
      trend: slaCompliance > 80 ? '+5%' : '-3%'
    },
    {
      title: 'Réclamations',
      value: analytics?.reclamationsCount || 0,
      color: '#ff5722',
      trend: '-8%'
    },
    {
      title: 'Temps Moyen',
      value: `${analytics?.avgSLA?.toFixed(1) || 0}j`,
      color: '#9c27b0',
      trend: analytics?.avgSLA > analytics?.reglementDelay ? '+15%' : '-5%'
    }
  ];

  const processingSummary = [
    { name: 'À temps', value: Math.floor(slaCompliance), color: '#4caf50' },
    { name: 'En retard', value: Math.floor(100 - slaCompliance), color: '#f44336' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Period Filter */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Tableau de Bord Performance
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            label="Période"
          >
            <MenuItem value="week">Semaine</MenuItem>
            <MenuItem value="month">Mois</MenuItem>
            <MenuItem value="quarter">Trimestre</MenuItem>
            <MenuItem value="year">Année</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      {kpi.title}
                    </Typography>
                    <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 600 }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Chip 
                    label={kpi.trend} 
                    size="small" 
                    color={kpi.trend.startsWith('+') ? 'success' : 'error'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Volume Trend */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Volume Traité dans le Temps
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends?.monthlyBordereaux || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#1976d2" 
                  strokeWidth={3}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* SLA Distribution */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Répartition SLA
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processingSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {processingSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {processingSummary.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      bgcolor: item.color, 
                      borderRadius: '50%', 
                      mr: 1 
                    }} 
                  />
                  <Typography variant="body2">
                    {item.name}: {item.value}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* SLA Alert */}
      {slaCompliance < 80 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ Attention: La conformité SLA est en dessous du seuil recommandé (80%). 
          Considérez l'augmentation des ressources ou la révision des processus.
        </Alert>
      )}

      {/* Processing Time Breakdown */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Répartition des Temps de Traitement
        </Typography>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={[
            { name: '0-2 jours', value: 45, color: '#4caf50' },
            { name: '3-5 jours', value: 30, color: '#ff9800' },
            { name: '6-10 jours', value: 20, color: '#f44336' },
            { name: '>10 jours', value: 5, color: '#9c27b0' }
          ]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#1976d2" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default PerformanceDashboard;