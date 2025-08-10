import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Star,
  Speed,
  Assignment
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { fetchTeamAnalytics, fetchIndividualComparison } from '../services/teamLeaderService';

const TeamPerformanceAnalytics: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [teamAnalytics, setTeamAnalytics] = useState<any>(null);
  const [individualComparisons, setIndividualComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const [analytics, comparisons] = await Promise.all([
        fetchTeamAnalytics(period),
        fetchIndividualComparison(period)
      ]);
      setTeamAnalytics(analytics);
      setIndividualComparisons(comparisons);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp color="success" />;
    if (change < 0) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.9) return 'success';
    if (score >= 0.7) return 'warning';
    return 'error';
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return '#4caf50';
    if (level >= 3) return '#ff9800';
    return '#f44336';
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
      {/* Header Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Analytics de Performance Équipe
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
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
      </Box>

      {/* Team Overview Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Traités Total
                  </Typography>
                  <Typography variant="h4" component="div">
                    {teamAnalytics?.totalProcessed || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(teamAnalytics?.processedChange || 0)}
                    <Typography variant="caption" color="text.secondary">
                      {teamAnalytics?.processedChange > 0 ? '+' : ''}{teamAnalytics?.processedChange || 0}%
                    </Typography>
                  </Box>
                </Box>
                <Assignment color="primary" sx={{ fontSize: 40 }} />
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
                    Temps Moyen
                  </Typography>
                  <Typography variant="h4" component="div">
                    {teamAnalytics?.avgProcessingTime?.toFixed(1) || '0.0'}j
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(-(teamAnalytics?.timeChange || 0))}
                    <Typography variant="caption" color="text.secondary">
                      {teamAnalytics?.timeChange > 0 ? '+' : ''}{teamAnalytics?.timeChange || 0}%
                    </Typography>
                  </Box>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
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
                    Efficacité
                  </Typography>
                  <Typography variant="h4" component="div">
                    {((teamAnalytics?.efficiency || 0) * 100).toFixed(1)}%
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(teamAnalytics?.efficiencyChange || 0)}
                    <Typography variant="caption" color="text.secondary">
                      {teamAnalytics?.efficiencyChange > 0 ? '+' : ''}{teamAnalytics?.efficiencyChange || 0}%
                    </Typography>
                  </Box>
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
                    Score Qualité
                  </Typography>
                  <Typography variant="h4" component="div">
                    {((teamAnalytics?.qualityScore || 0) * 100).toFixed(1)}%
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(teamAnalytics?.qualityChange || 0)}
                    <Typography variant="caption" color="text.secondary">
                      {teamAnalytics?.qualityChange > 0 ? '+' : ''}{teamAnalytics?.qualityChange || 0}%
                    </Typography>
                  </Box>
                </Box>
                <Star color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tendances de Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={teamAnalytics?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="processed" stroke="#8884d8" strokeWidth={2} name="Traités" />
                <Line type="monotone" dataKey="efficiency" stroke="#82ca9d" strokeWidth={2} name="Efficacité" />
                <Line type="monotone" dataKey="quality" stroke="#ffc658" strokeWidth={2} name="Qualité" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribution Horaire
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamAnalytics?.hourlyDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Individual Performance Comparison */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Individuelle vs Équipe
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Membre</TableCell>
                <TableCell align="center">Traités</TableCell>
                <TableCell align="center">Temps Moyen</TableCell>
                <TableCell align="center">Efficacité</TableCell>
                <TableCell align="center">Qualité</TableCell>
                <TableCell align="center">Charge</TableCell>
                <TableCell align="center">Niveau</TableCell>
                <TableCell align="center">Classement</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {individualComparisons.map((member, index) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {member.fullName?.charAt(0) || 'U'}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {member.fullName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {member.processed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Moy: {teamAnalytics?.avgProcessed || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      {member.avgTime?.toFixed(1)}j
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Moy: {teamAnalytics?.avgProcessingTime?.toFixed(1) || '0.0'}j
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={member.efficiency * 100}
                        color={getPerformanceColor(member.efficiency) as any}
                        sx={{ width: 60, mb: 0.5 }}
                      />
                      <Typography variant="caption">
                        {(member.efficiency * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={member.qualityScore * 100}
                        color={getPerformanceColor(member.qualityScore) as any}
                        sx={{ width: 60, mb: 0.5 }}
                      />
                      <Typography variant="caption">
                        {(member.qualityScore * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={(member.workload / member.capacity) * 100}
                        color={(member.workload / member.capacity) > 0.8 ? 'warning' : 'success'}
                        sx={{ width: 60, mb: 0.5 }}
                      />
                      <Typography variant="caption">
                        {member.workload}/{member.capacity}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`Niveau ${member.skillLevel?.toFixed(1) || '3.0'}`}
                      size="small"
                      sx={{
                        backgroundColor: getSkillLevelColor(member.skillLevel || 3),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600}>
                      #{index + 1}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Productivity Analysis */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analyse des Goulots d'Étranglement
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Étape</TableCell>
                    <TableCell align="center">Temps Moyen</TableCell>
                    <TableCell align="center">Impact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(teamAnalytics?.bottlenecks || []).map((bottleneck: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{bottleneck.stage}</TableCell>
                      <TableCell align="center">{bottleneck.avgTime?.toFixed(1)}j</TableCell>
                      <TableCell align="center">
                        <LinearProgress
                          variant="determinate"
                          value={bottleneck.impact * 100}
                          color={bottleneck.impact > 0.7 ? 'error' : bottleneck.impact > 0.4 ? 'warning' : 'success'}
                          sx={{ width: 60 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recommandations
            </Typography>
            <Box>
              {(teamAnalytics?.recommendations || []).map((recommendation: string, index: number) => (
                <Box key={index} display="flex" alignItems="start" gap={1} mb={2}>
                  <Typography variant="body2" color="primary" fontWeight={600}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2">
                    {recommendation}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamPerformanceAnalytics;