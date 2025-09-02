import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Schedule,
  Warning,
  CheckCircle,
  Refresh
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface WorkforceData {
  currentStaff: number;
  requiredStaff: number;
  currentWorkload: number;
  targetWorkload: number;
  efficiency: number;
  recommendations: string[];
  departmentAnalysis: {
    department: string;
    currentStaff: number;
    requiredStaff: number;
    workload: number;
    efficiency: number;
    status: 'understaffed' | 'optimal' | 'overstaffed';
  }[];
}

const WorkforceEstimator: React.FC = () => {
  const [data, setData] = useState<WorkforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current');

  useEffect(() => {
    loadWorkforceData();
    const interval = setInterval(loadWorkforceData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [period]);

  const loadWorkforceData = async () => {
    try {
      const response = await LocalAPI.get('/analytics/workforce-estimator', {
        params: { period }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load workforce data:', error);
      // No fallback data - show empty state when database is empty
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'understaffed': return 'error';
      case 'optimal': return 'success';
      case 'overstaffed': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'understaffed': return <Warning color="error" />;
      case 'optimal': return <CheckCircle color="success" />;
      case 'overstaffed': return <TrendingDown color="warning" />;
      default: return <People />;
    }
  };

  const calculateStaffingGap = () => {
    if (!data) return 0;
    return data.requiredStaff - data.currentStaff;
  };

  const getWorkloadStatus = () => {
    if (!data) return 'normal';
    const ratio = data.currentWorkload / data.targetWorkload;
    if (ratio > 1.2) return 'critical';
    if (ratio > 1.1) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estimateur de Main-d'œuvre
          </Typography>
          <Alert severity="info">
            Aucune donnée disponible. Veuillez ajouter des utilisateurs et des données de charge de travail.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const staffingGap = calculateStaffingGap();
  const workloadStatus = getWorkloadStatus();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Estimateur de Main-d'œuvre
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={period}
              label="Période"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="current">Actuel</MenuItem>
              <MenuItem value="forecast">Prévision</MenuItem>
              <MenuItem value="optimal">Optimal</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadWorkforceData}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Global Status Alert */}
      {staffingGap !== 0 && (
        <Alert 
          severity={staffingGap > 0 ? 'warning' : 'info'} 
          sx={{ mb: 3 }}
          icon={staffingGap > 0 ? <Warning /> : <TrendingUp />}
        >
          <Typography variant="subtitle2">
            {staffingGap > 0 
              ? `Sous-effectif détecté: ${staffingGap} gestionnaire(s) manquant(s)`
              : `Sur-effectif: ${Math.abs(staffingGap)} gestionnaire(s) en excès`
            }
          </Typography>
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Effectif Actuel
                  </Typography>
                  <Typography variant="h4" component="div">
                    {data.currentStaff}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    gestionnaires
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
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
                    Effectif Requis
                  </Typography>
                  <Typography variant="h4" component="div" color={staffingGap > 0 ? 'error.main' : 'success.main'}>
                    {data.requiredStaff}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    pour objectifs SLA
                  </Typography>
                </Box>
                {staffingGap > 0 ? <TrendingUp color="error" sx={{ fontSize: 40 }} /> : <CheckCircle color="success" sx={{ fontSize: 40 }} />}
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
                    Charge Actuelle
                  </Typography>
                  <Typography variant="h4" component="div">
                    {data.currentWorkload}
                  </Typography>
                  <Typography variant="caption" color={workloadStatus === 'critical' ? 'error.main' : 'text.secondary'}>
                    / {data.targetWorkload} cible
                  </Typography>
                </Box>
                <Schedule color={workloadStatus === 'critical' ? 'error' : 'info'} sx={{ fontSize: 40 }} />
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
                    Efficacité Globale
                  </Typography>
                  <Typography variant="h4" component="div">
                    {data.efficiency.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={data.efficiency}
                    color={data.efficiency > 80 ? 'success' : data.efficiency > 60 ? 'warning' : 'error'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <TrendingUp color={data.efficiency > 80 ? 'success' : 'warning'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analyse par Département
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Département</TableCell>
                  <TableCell align="center">Effectif</TableCell>
                  <TableCell align="center">Requis</TableCell>
                  <TableCell align="center">Charge</TableCell>
                  <TableCell align="center">Efficacité</TableCell>
                  <TableCell align="center">Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.departmentAnalysis.map((dept) => (
                  <TableRow key={dept.department}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {dept.department}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {dept.currentStaff}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography 
                        variant="body2" 
                        color={dept.currentStaff < dept.requiredStaff ? 'error.main' : 'text.primary'}
                        fontWeight={dept.currentStaff < dept.requiredStaff ? 'bold' : 'normal'}
                      >
                        {dept.requiredStaff}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {dept.workload}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <Typography variant="body2">
                          {dept.efficiency}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={dept.efficiency}
                          sx={{ width: 40, height: 4 }}
                          color={dept.efficiency > 80 ? 'success' : 'warning'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={`${dept.status === 'understaffed' ? 'Sous-effectif' : dept.status === 'optimal' ? 'Optimal' : 'Sur-effectif'}`}>
                        <Chip
                          icon={getStatusIcon(dept.status)}
                          label={dept.status === 'understaffed' ? 'Manque' : dept.status === 'optimal' ? 'OK' : 'Excès'}
                          color={getStatusColor(dept.status) as any}
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            🤖 Recommandations IA
          </Typography>
          <Box>
            {data.recommendations.map((recommendation, index) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                {recommendation}
              </Alert>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkforceEstimator;