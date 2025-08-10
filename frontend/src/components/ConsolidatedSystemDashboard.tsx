import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Memory,
  Storage,
  Speed,
  NetworkCheck,
  Queue,
  Error,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchSystemHealth, fetchQueuesOverview, fetchPerformanceMetrics } from '../services/superAdminService';

const ConsolidatedSystemDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, [period]);

  const loadDashboardData = async () => {
    try {
      const [health, queuesData, metricsData] = await Promise.all([
        fetchSystemHealth(),
        fetchQueuesOverview(),
        fetchPerformanceMetrics(period)
      ]);
      setSystemHealth(health);
      setQueues(queuesData);
      setPerformanceMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load system dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getQueueStatusColor = (queue: any) => {
    if (queue.failed > 5) return 'error';
    if (queue.pending > 20) return 'warning';
    return 'success';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* System Health Metrics */}
      <Typography variant="h6" gutterBottom>
        Santé du Système en Temps Réel
      </Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    CPU
                  </Typography>
                  <Typography variant="h5" component="div">
                    {systemHealth?.cpuUsage?.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.cpuUsage || 0}
                    color={systemHealth?.cpuUsage > 80 ? 'error' : systemHealth?.cpuUsage > 60 ? 'warning' : 'success'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Speed color={systemHealth?.cpuUsage > 80 ? 'error' : 'primary'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Mémoire
                  </Typography>
                  <Typography variant="h5" component="div">
                    {systemHealth?.memoryUsage?.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.memoryUsage || 0}
                    color={systemHealth?.memoryUsage > 85 ? 'error' : systemHealth?.memoryUsage > 70 ? 'warning' : 'success'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Memory color={systemHealth?.memoryUsage > 85 ? 'error' : 'primary'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Disque
                  </Typography>
                  <Typography variant="h5" component="div">
                    {systemHealth?.diskUsage?.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.diskUsage || 0}
                    color={systemHealth?.diskUsage > 90 ? 'error' : systemHealth?.diskUsage > 80 ? 'warning' : 'success'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Storage color={systemHealth?.diskUsage > 90 ? 'error' : 'primary'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Connexions
                  </Typography>
                  <Typography variant="h5" component="div">
                    {systemHealth?.activeConnections || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Temps réponse: {systemHealth?.responseTime?.toFixed(0)}ms
                  </Typography>
                </Box>
                <NetworkCheck color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Métriques de Performance
              </Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Période</InputLabel>
                <Select
                  value={period}
                  label="Période"
                  onChange={(e) => setPeriod(e.target.value)}
                  size="small"
                >
                  <MenuItem value="24h">24 heures</MenuItem>
                  <MenuItem value="7d">7 jours</MenuItem>
                  <MenuItem value="30d">30 jours</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line type="monotone" dataKey="throughput" stroke="#8884d8" strokeWidth={2} name="Débit" />
                <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" strokeWidth={2} name="Temps réponse" />
                <Line type="monotone" dataKey="errorRate" stroke="#ffc658" strokeWidth={2} name="Taux d'erreur" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Utilisateurs Actifs
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMetrics.slice(-24)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).getHours() + 'h'}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activeUsers" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Queues Overview */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vue d'Ensemble des Files d'Attente
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File d'Attente</TableCell>
                <TableCell align="center">En Attente</TableCell>
                <TableCell align="center">En Cours</TableCell>
                <TableCell align="center">Terminés</TableCell>
                <TableCell align="center">Échecs</TableCell>
                <TableCell align="center">Temps Moyen</TableCell>
                <TableCell align="center">Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Queue />
                      <Typography variant="body2" fontWeight={500}>
                        {queue.name.replace('_', ' ')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {queue.pending}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600} color="info.main">
                      {queue.processing}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {queue.completed}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600} color="error.main">
                      {queue.failed}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatDuration(queue.avgProcessingTime)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={
                        getQueueStatusColor(queue) === 'error' ? <Error /> :
                        getQueueStatusColor(queue) === 'warning' ? <Warning /> :
                        <CheckCircle />
                      }
                      label={
                        getQueueStatusColor(queue) === 'error' ? 'Critique' :
                        getQueueStatusColor(queue) === 'warning' ? 'Attention' :
                        'Normal'
                      }
                      color={getQueueStatusColor(queue) as any}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ConsolidatedSystemDashboard;