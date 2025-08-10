import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Balance,
  TrendingUp,
  TrendingDown,
  Person,
  Assignment,
  Refresh
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { fetchTeamWorkloads, rebalanceWorkload, reassignBordereau } from '../services/teamLeaderService';

const WorkloadBalancer: React.FC = () => {
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebalanceDialogOpen, setRebalanceDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [targetUser, setTargetUser] = useState('');
  const [rebalanceResults, setRebalanceResults] = useState<any>(null);

  useEffect(() => {
    loadWorkloads();
    const interval = setInterval(loadWorkloads, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWorkloads = async () => {
    try {
      const data = await fetchTeamWorkloads();
      setWorkloads(data);
    } catch (error) {
      console.error('Failed to load workloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRebalance = async () => {
    try {
      const results = await rebalanceWorkload();
      setRebalanceResults(results);
      setRebalanceDialogOpen(true);
      await loadWorkloads();
    } catch (error) {
      console.error('Auto rebalance failed:', error);
    }
  };

  const handleManualReassign = async () => {
    if (!selectedBordereau || !targetUser) return;

    try {
      await reassignBordereau(selectedBordereau.id, targetUser);
      await loadWorkloads();
      setReassignDialogOpen(false);
      setSelectedBordereau(null);
      setTargetUser('');
    } catch (error) {
      console.error('Manual reassignment failed:', error);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 1.0) return 'error';
    if (utilization > 0.8) return 'warning';
    return 'success';
  };

  const getWorkloadStatus = (utilization: number) => {
    if (utilization > 1.0) return 'Surchargé';
    if (utilization > 0.8) return 'Chargé';
    if (utilization < 0.5) return 'Disponible';
    return 'Normal';
  };

  const calculateTeamBalance = () => {
    if (workloads.length === 0) return 0;
    
    const utilizations = workloads.map(w => w.currentLoad / w.capacity);
    const avg = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - avg, 2), 0) / utilizations.length;
    
    return Math.max(0, 100 - (Math.sqrt(variance) * 100));
  };

  const getRecommendations = () => {
    const recommendations = [];
    const overloaded = workloads.filter(w => (w.currentLoad / w.capacity) > 1.0);
    const underloaded = workloads.filter(w => (w.currentLoad / w.capacity) < 0.5);

    if (overloaded.length > 0) {
      recommendations.push(`${overloaded.length} membre(s) surchargé(s) - Rééquilibrage recommandé`);
    }

    if (underloaded.length > 0 && overloaded.length > 0) {
      recommendations.push('Redistribuer la charge des membres surchargés vers les disponibles');
    }

    const lowEfficiency = workloads.filter(w => w.efficiency < 0.7);
    if (lowEfficiency.length > 0) {
      recommendations.push(`${lowEfficiency.length} membre(s) avec efficacité faible - Formation recommandée`);
    }

    return recommendations;
  };

  const teamBalance = calculateTeamBalance();
  const recommendations = getRecommendations();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Équilibrage de la Charge de Travail
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Balance />}
            onClick={handleAutoRebalance}
          >
            Rééquilibrage Auto
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadWorkloads}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* Team Balance Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Équilibre Équipe
                  </Typography>
                  <Typography variant="h4" component="div">
                    {teamBalance.toFixed(1)}%
                  </Typography>
                </Box>
                <Balance color={teamBalance > 80 ? 'success' : teamBalance > 60 ? 'warning' : 'error'} sx={{ fontSize: 40 }} />
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
                    Membres Surchargés
                  </Typography>
                  <Typography variant="h4" component="div">
                    {workloads.filter(w => (w.currentLoad / w.capacity) > 1.0).length}
                  </Typography>
                </Box>
                <TrendingUp color="error" sx={{ fontSize: 40 }} />
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
                    Membres Disponibles
                  </Typography>
                  <Typography variant="h4" component="div">
                    {workloads.filter(w => (w.currentLoad / w.capacity) < 0.5).length}
                  </Typography>
                </Box>
                <TrendingDown color="success" sx={{ fontSize: 40 }} />
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
                    Charge Moyenne
                  </Typography>
                  <Typography variant="h4" component="div">
                    {workloads.length > 0 ? 
                      ((workloads.reduce((sum, w) => sum + (w.currentLoad / w.capacity), 0) / workloads.length) * 100).toFixed(1) 
                      : '0.0'}%
                  </Typography>
                </Box>
                <Person color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recommandations:
          </Typography>
          {recommendations.map((rec, index) => (
            <Typography key={index} variant="body2">
              • {rec}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Workload Visualization */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Charge de Travail par Membre
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloads.map(w => ({
                name: w.fullName,
                charge: w.currentLoad,
                capacite: w.capacity,
                utilisation: (w.currentLoad / w.capacity) * 100
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="charge" fill="#8884d8" name="Charge actuelle" />
                <Bar dataKey="capacite" fill="#82ca9d" name="Capacité" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance vs Charge
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={workloads.map(w => ({
                name: w.fullName.split(' ')[0],
                utilisation: (w.currentLoad / w.capacity) * 100,
                efficacite: w.efficiency * 100,
                vitesse: Math.max(0, 100 - (w.avgProcessingTime * 10))
              }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Utilisation" dataKey="utilisation" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Efficacité" dataKey="efficacite" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Radar name="Vitesse" dataKey="vitesse" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Workload Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Détail des Charges de Travail
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Membre</TableCell>
                  <TableCell align="center">Charge Actuelle</TableCell>
                  <TableCell align="center">Capacité</TableCell>
                  <TableCell align="center">Utilisation</TableCell>
                  <TableCell align="center">Efficacité</TableCell>
                  <TableCell align="center">Temps Moyen</TableCell>
                  <TableCell align="center">Statut</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workloads.map((member) => {
                  const utilization = member.currentLoad / member.capacity;
                  return (
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
                          {member.currentLoad}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {member.capacity}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(utilization * 100, 100)}
                            color={getUtilizationColor(utilization) as any}
                            sx={{ width: 80, mb: 0.5 }}
                          />
                          <Typography variant="caption">
                            {(utilization * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={member.efficiency * 100}
                            color={member.efficiency > 0.8 ? 'success' : member.efficiency > 0.6 ? 'warning' : 'error'}
                            sx={{ width: 80, mb: 0.5 }}
                          />
                          <Typography variant="caption">
                            {(member.efficiency * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {member.avgProcessingTime?.toFixed(1)}j
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getWorkloadStatus(utilization)}
                          color={getUtilizationColor(utilization) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Assignment />}
                          onClick={() => {
                            // Open manual reassignment dialog
                            setSelectedBordereau({ userId: member.userId });
                            setReassignDialogOpen(true);
                          }}
                          disabled={utilization < 0.3}
                        >
                          Réassigner
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Auto Rebalance Results Dialog */}
      <Dialog open={rebalanceDialogOpen} onClose={() => setRebalanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Résultats du Rééquilibrage Automatique</DialogTitle>
        <DialogContent>
          {rebalanceResults && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {rebalanceResults.length} réaffectations effectuées
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bordereau</TableCell>
                      <TableCell>De</TableCell>
                      <TableCell>Vers</TableCell>
                      <TableCell>Raison</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rebalanceResults.map((result: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{result.bordereauId}</TableCell>
                        <TableCell>{result.fromUserId}</TableCell>
                        <TableCell>{result.toUserId}</TableCell>
                        <TableCell>{result.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRebalanceDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Manual Reassignment Dialog */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réassignation Manuelle</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Réassigner à</InputLabel>
            <Select
              value={targetUser}
              label="Réassigner à"
              onChange={(e) => setTargetUser(e.target.value)}
            >
              {workloads
                .filter(w => w.userId !== selectedBordereau?.userId && (w.currentLoad / w.capacity) < 0.8)
                .map((user) => (
                  <MenuItem key={user.userId} value={user.userId}>
                    {user.fullName} ({((user.currentLoad / user.capacity) * 100).toFixed(1)}% utilisé)
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleManualReassign} 
            variant="contained"
            disabled={!targetUser}
          >
            Réassigner
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkloadBalancer;