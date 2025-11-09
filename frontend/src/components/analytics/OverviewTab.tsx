import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { LocalAPI } from '../../services/axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';

interface Props {
  filters: any;
  dateRange: any;
}

const OverviewTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      const [kpiResponse, alertsResponse] = await Promise.all([
        LocalAPI.get('/analytics/kpis/daily', { params: dateRange }),
        LocalAPI.get('/analytics/alerts')
      ]);

      const kpiData = kpiResponse.data;
      const alertData = alertsResponse.data;

      // Calculate KPIs from real data
      const totalBordereaux = kpiData.totalCount || 0;
      const processedCount = kpiData.processedCount || 0;
      const enAttenteCount = kpiData.enAttenteCount || 0;
      const avgProcessingTime = kpiData.avgDelay || 0;
      const processingRate = totalBordereaux > 0 ? Math.round((processedCount / totalBordereaux) * 100) : 0;

      setKpis({
        totalBordereaux,
        processedCount,
        enAttenteCount,
        avgProcessingTime,
        processingRate
      });

      // Process volume trend data from bsPerDay
      const volumeTrend = kpiData.bsPerDay?.map((day: any) => ({
        date: new Date(day.createdAt).toLocaleDateString('fr-FR'),
        volume: day._count?.id || 0
      })) || [];

      // Calculate SLA distribution from alert data
      const slaCompliant = alertData.ok?.length || 0;
      const slaAtRisk = alertData.warning?.length || 0;
      const slaOverdue = alertData.critical?.length || 0;
      
      const slaDistribution = [
        { name: 'À temps', value: slaCompliant, color: '#4caf50' },
        { name: 'À risque', value: slaAtRisk, color: '#ff9800' },
        { name: 'En retard', value: slaOverdue, color: '#f44336' }
      ];

      setData({
        volumeTrend,
        slaDistribution
      });
    } catch (error) {
      console.error('Failed to load overview data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, [filters, dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des données...</Typography>
      </Box>
    );
  }

  if (!data) return <Typography>Aucune donnée disponible</Typography>;

  return (
    <Grid container spacing={3}>
      {/* KPI Cards */}
      {kpis && (
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* COMMENTED OUT: Redundant Total Bordereaux card - Already in header */}
            {/* <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AssignmentIcon color="primary" />
                    <Box>
                      <Typography variant="h4">{kpis.totalBordereaux}</Typography>
                      <Typography color="textSecondary">Total Bordereaux</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid> */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TrendingUpIcon color="success" />
                    <Box>
                      <Typography variant="h4">{kpis.processedCount}</Typography>
                      <Typography color="textSecondary">Traités</Typography>
                      <Chip size="small" label={`${kpis.processingRate}%`} color="success" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AccessTimeIcon color="info" />
                    <Box>
                      <Typography variant="h4">{kpis.avgProcessingTime.toFixed(1)}j</Typography>
                      <Typography color="textSecondary">Temps Moyen</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon color="warning" />
                    <Box>
                      <Typography variant="h4">{kpis.enAttenteCount}</Typography>
                      <Typography color="textSecondary">En Attente</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Volume Trend Chart */}
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Volume de Traitement</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#1976d2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* SLA Distribution Chart */}
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Répartition SLA</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.slaDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                {data.slaDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;