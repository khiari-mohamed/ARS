import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Assessment, Speed } from '@mui/icons-material';
import { fetchClientPerformanceAnalytics } from '../../services/clientService';

interface Props {
  clientId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ClientPerformanceAnalytics: React.FC<Props> = ({ clientId }) => {
  const [period, setPeriod] = useState('monthly');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const data = await fetchClientPerformanceAnalytics(clientId, period);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load performance analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [clientId, period]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Typography variant="h6" color="text.secondary" align="center">
        No analytics data available
      </Typography>
    );
  }

  const { slaCompliance, processingTimes, volumeCapacity } = analytics;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Performance Analytics Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    SLA Compliance
                  </Typography>
                  <Typography variant="h4" component="div">
                    {slaCompliance.overallCompliance.toFixed(1)}%
                  </Typography>
                </Box>
                <Assessment color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <Box mt={1}>
                <Chip
                  label={slaCompliance.overallCompliance >= 90 ? 'Excellent' : 
                         slaCompliance.overallCompliance >= 80 ? 'Good' : 'Needs Improvement'}
                  color={slaCompliance.overallCompliance >= 90 ? 'success' : 
                         slaCompliance.overallCompliance >= 80 ? 'warning' : 'error'}
                  size="small"
                />
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
                    Avg Processing Time
                  </Typography>
                  <Typography variant="h4" component="div">
                    {processingTimes.average.toFixed(1)}d
                  </Typography>
                </Box>
                <Speed color="secondary" sx={{ fontSize: 40 }} />
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
                    Total Volume
                  </Typography>
                  <Typography variant="h4" component="div">
                    {volumeCapacity.totalVolume}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
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
                    Capacity Utilization
                  </Typography>
                  <Typography variant="h4" component="div">
                    {volumeCapacity.capacityUtilization.toFixed(1)}%
                  </Typography>
                </Box>
                <TrendingDown color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* SLA Compliance Trends */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              SLA Compliance Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={slaCompliance.trends.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name: string) => [
                    name === 'avgSla' ? `${value} days` : value,
                    name === 'avgSla' ? 'Avg SLA' : 'Count'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Volume"
                />
                <Line 
                  type="monotone" 
                  dataKey="avgSla" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Avg SLA"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Volume Breakdown */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Volume by Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={volumeCapacity.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ statut, _count }) => `${statut}: ${_count.id}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="_count.id"
                >
                  {volumeCapacity.statusBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Processing Time Trends */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Processing Time Trends (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processingTimes.trends.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [`${value} days`, 'Processing Time']}
                />
                <Bar dataKey="processingDays" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientPerformanceAnalytics;