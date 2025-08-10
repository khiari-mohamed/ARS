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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';

import {
  Warning,
  CheckCircle,
  Error,
  Visibility,
  Assignment,
  Notifications,
  TrendingUp
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchEscalationCases, resolveEscalation, fetchEscalationStats } from '../services/teamLeaderService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const EscalationManager: React.FC = () => {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    loadEscalationData();
    const interval = setInterval(loadEscalationData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEscalationData = async () => {
    try {
      const [escalationData, statsData] = await Promise.all([
        fetchEscalationCases(),
        fetchEscalationStats()
      ]);
      setEscalations(escalationData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load escalation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (escalation: any) => {
    setSelectedEscalation(escalation);
    setDetailsDialogOpen(true);
  };

  const handleResolveEscalation = (escalation: any) => {
    setSelectedEscalation(escalation);
    setResolveDialogOpen(true);
  };

  const handleSaveResolution = async () => {
    if (!selectedEscalation || !resolution.trim()) return;

    try {
      await resolveEscalation(selectedEscalation.id, resolution);
      await loadEscalationData();
      setResolveDialogOpen(false);
      setResolution('');
      setSelectedEscalation(null);
    } catch (error) {
      console.error('Failed to resolve escalation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getRuleIcon = (ruleId: string) => {
    if (ruleId.includes('sla')) return <Warning color="error" />;
    if (ruleId.includes('quality')) return <Error color="warning" />;
    if (ruleId.includes('workload')) return <TrendingUp color="info" />;
    return <Notifications color="action" />;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Gestion des Escalations
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Notifications />}
          onClick={loadEscalationData}
        >
          Actualiser
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Escalations Actives
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.pendingEscalations || 0}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
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
                    Résolues (30j)
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.resolvedEscalations || 0}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
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
                    Temps Résolution Moy.
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.avgResolutionTime?.toFixed(1) || '0.0'}h
                  </Typography>
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40 }} />
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
                    Total (30j)
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats?.totalEscalations || 0}
                  </Typography>
                </Box>
                <Assignment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tendances des Escalations
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.escalationTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Escalations par Règle
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.escalationsByRule || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ ruleId, count }) => `${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(stats?.escalationsByRule || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Escalations Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Escalations en Cours
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Règle</TableCell>
                  <TableCell>Bordereau</TableCell>
                  <TableCell>Déclenché</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Assigné à</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {escalations.map((escalation) => (
                  <TableRow key={escalation.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getRuleIcon(escalation.ruleId)}
                        <Typography variant="body2" fontWeight={500}>
                          {escalation.ruleId.replace('rule_', '').replace('_', ' ')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {escalation.bordereauId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(escalation.triggeredAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={escalation.status}
                        color={getStatusColor(escalation.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {escalation.assignedTo || 'Non assigné'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(escalation)}
                        >
                          <Visibility />
                        </IconButton>
                        {escalation.status === 'PENDING' && (
                          <IconButton
                            size="small"
                            onClick={() => handleResolveEscalation(escalation)}
                            color="success"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Escalation Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'Escalation</DialogTitle>
        <DialogContent>
          {selectedEscalation && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    ID Escalation
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedEscalation.id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Bordereau
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedEscalation.bordereauId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Règle Déclenchée
                  </Typography>
                  <Typography variant="body2">
                    {selectedEscalation.ruleId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Statut
                  </Typography>
                  <Chip
                    label={selectedEscalation.status}
                    color={getStatusColor(selectedEscalation.status) as any}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Chronologie
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                  <Box sx={{ mt: 0.5 }}>
                    <Warning color="warning" />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Escalation déclenchée
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedEscalation.triggeredAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                
                {selectedEscalation.assignedTo && (
                  <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                    <Box sx={{ mt: 0.5 }}>
                      <Assignment color="info" />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Assigné à {selectedEscalation.assignedTo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        En cours de traitement
                      </Typography>
                    </Box>
                  </Box>
                )}

                {selectedEscalation.status === 'RESOLVED' && (
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box sx={{ mt: 0.5 }}>
                      <CheckCircle color="success" />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Escalation résolue
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedEscalation.resolvedAt && new Date(selectedEscalation.resolvedAt).toLocaleString()}
                      </Typography>
                      {selectedEscalation.resolution && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {selectedEscalation.resolution}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Escalation Dialog */}
      <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Résoudre l'Escalation</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Décrivez les actions prises pour résoudre cette escalation.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Résolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Décrivez les actions prises pour résoudre l'escalation..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleSaveResolution} 
            variant="contained"
            disabled={!resolution.trim()}
          >
            Résoudre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscalationManager;