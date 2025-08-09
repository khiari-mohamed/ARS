import React, { useEffect, useState } from 'react';
import { 
  Paper, Typography, Grid, Card, CardContent, Box, LinearProgress,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface Props {
  contractId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ContractStatisticsTab: React.FC<Props> = ({ contractId }) => {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  // Mock data - replace with actual API calls
  const kpiData = {
    totalBordereaux: 156,
    slaCompliance: 87.5,
    avgProcessingTime: 3.2,
    totalClaims: 8,
    resolvedClaims: 6
  };

  const monthlyData = [
    { month: 'Jan', bordereaux: 45, claims: 2, avgSLA: 3.1 },
    { month: 'Fév', bordereaux: 52, claims: 1, avgSLA: 2.8 },
    { month: 'Mar', bordereaux: 38, claims: 3, avgSLA: 3.5 },
    { month: 'Avr', bordereaux: 41, claims: 2, avgSLA: 3.0 }
  ];

  const slaDistribution = [
    { name: 'À temps', value: 87.5, color: '#4caf50' },
    { name: 'En retard', value: 12.5, color: '#f44336' }
  ];

  const processingTimeData = [
    { range: '0-2j', count: 45 },
    { range: '3-5j', count: 78 },
    { range: '6-10j', count: 28 },
    { range: '>10j', count: 5 }
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Statistiques du Contrat</Typography>
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
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Total Bordereaux
              </Typography>
              <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 600 }}>
                {kpiData.totalBordereaux}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Conformité SLA
              </Typography>
              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 600 }}>
                {kpiData.slaCompliance}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={kpiData.slaCompliance} 
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Temps Moyen
              </Typography>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 600 }}>
                {kpiData.avgProcessingTime}j
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Réclamations
              </Typography>
              <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 600 }}>
                {kpiData.totalClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Taux Résolution
              </Typography>
              <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 600 }}>
                {Math.round((kpiData.resolvedClaims / kpiData.totalClaims) * 100)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Volume Trend */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Évolution du Volume
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="bordereaux" 
                  stroke="#1976d2" 
                  strokeWidth={3}
                  name="Bordereaux"
                />
                <Line 
                  type="monotone" 
                  dataKey="claims" 
                  stroke="#f44336" 
                  strokeWidth={2}
                  name="Réclamations"
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
                  data={slaDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {slaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {slaDistribution.map((item, index) => (
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

        {/* Processing Time Distribution */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Répartition des Temps de Traitement
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processingTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ContractStatisticsTab;