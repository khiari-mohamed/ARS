import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  SwapHoriz,
  Assessment,
  Notifications,
  TrendingUp,
  Group,
  Assignment,
  Speed
} from '@mui/icons-material';

interface DashboardStats {
  totalAssigned: number;
  inProgress: number;
  completedToday: number;
  overdue: number;
  teamPerformance: number;
}

interface Gestionnaire {
  id: string;
  fullName: string;
  currentWorkload: number;
  capacity: number;
  efficiency: number;
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await LocalAPI.get('/workflow/chef-equipe/dashboard-stats');
  return data;
};

const fetchGestionnaires = async (): Promise<Gestionnaire[]> => {
  const { data } = await LocalAPI.get('/users/gestionnaires');
  return data;
};

const reassignBordereau = async (data: {
  bordereauId: string;
  fromGestionnaireId: string;
  toGestionnaireId: string;
  reason?: string;
}) => {
  const { data: result } = await LocalAPI.put('/workflow/chef-equipe/reassign', data);
  return result;
};

const recupererBordereau = async (data: {
  bordereauId: string;
  reason?: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/chef-equipe/recuperer', data);
  return result;
};

const getBordereausForReassignment = async (): Promise<{id: string; reference: string; assignedTo: string; assignedToId: string}[]> => {
  const { data } = await LocalAPI.get('/workflow/chef-equipe/corbeille');
  return data.enCours?.map((b: any) => ({
    id: b.id,
    reference: b.reference,
    assignedTo: b.assignedTo || 'Unknown',
    assignedToId: b.assignedToId || ''
  })) || [];
};

export const ChefEquipeActionButtons: React.FC = () => {
  const queryClient = useQueryClient();
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [fromGestionnaire, setFromGestionnaire] = useState('');
  const [toGestionnaire, setToGestionnaire] = useState('');
  const [selectedBordereau, setSelectedBordereau] = useState('');
  const [reason, setReason] = useState('');

  const { data: stats } = useQuery(
    ['chef-dashboard-stats'],
    fetchDashboardStats,
    { 
      refetchInterval: 120000, // 2 minutes for stats
      refetchIntervalInBackground: false,
      staleTime: 60000
    }
  );

  const { data: gestionnaires = [] } = useQuery(
    ['gestionnaires'],
    fetchGestionnaires
  );

  const { data: availableBordereaux = [] } = useQuery(
    ['bordereaux-for-reassignment'],
    getBordereausForReassignment,
    { enabled: showReassignDialog }
  );

  const reassignMutation = useMutation(reassignBordereau, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-dashboard-stats']);
      queryClient.invalidateQueries(['chef-corbeille']);
      setShowReassignDialog(false);
      setFromGestionnaire('');
      setToGestionnaire('');
      setSelectedBordereau('');
      setReason('');
    }
  });

  const handleReassign = () => {
    if (selectedBordereau && fromGestionnaire && toGestionnaire) {
      reassignMutation.mutate({
        bordereauId: selectedBordereau,
        fromGestionnaireId: fromGestionnaire,
        toGestionnaireId: toGestionnaire,
        reason
      });
    }
  };

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 80) return 'success';
    if (efficiency >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ⚡ Actions Rapides Chef d'Équipe
      </Typography>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Vue d'Ensemble
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {stats?.totalAssigned || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Assignés
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {stats?.inProgress || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      En Cours
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {stats?.completedToday || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Traités Aujourd'hui
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {stats?.overdue || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      En Retard
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Actions Rapides
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<SwapHoriz />}
                  onClick={() => setShowReassignDialog(true)}
                  fullWidth
                >
                  Réassigner Dossiers
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assessment />}
                  onClick={() => setShowStatsDialog(true)}
                  fullWidth
                >
                  Performance Équipe
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Notifications />}
                  fullWidth
                >
                  Alertes & Notifications
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Team Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👥 Performance de l'Équipe
              </Typography>
              <Grid container spacing={2}>
                {gestionnaires.map((gest) => (
                  <Grid item xs={12} sm={6} md={4} key={gest.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            {gest.fullName}
                          </Typography>
                          <Chip
                            label={`${gest.efficiency || 0}%`}
                            color={getPerformanceColor(gest.efficiency || 0) as any}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Charge: {gest.currentWorkload}/{gest.capacity}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Box
                            sx={{
                              width: '100%',
                              height: 8,
                              bgcolor: 'grey.300',
                              borderRadius: 1,
                              overflow: 'hidden'
                            }}
                          >
                            <Box
                              sx={{
                                width: `${Math.min((gest.currentWorkload / gest.capacity) * 100, 100)}%`,
                                height: '100%',
                                bgcolor: gest.currentWorkload > gest.capacity ? 'error.main' : 'primary.main'
                              }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onClose={() => setShowReassignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réassigner des Dossiers</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sélectionnez un bordereau spécifique à réassigner d'un gestionnaire vers un autre.
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Bordereau à réassigner</InputLabel>
            <Select
              value={selectedBordereau}
              onChange={(e) => {
                setSelectedBordereau(e.target.value);
                const bordereau = availableBordereaux.find(b => b.id === e.target.value);
                if (bordereau) {
                  setFromGestionnaire(bordereau.assignedToId);
                }
              }}
              label="Bordereau à réassigner"
            >
              {availableBordereaux.length === 0 ? (
                <MenuItem value="" disabled>
                  Aucun bordereau disponible pour réassignation
                </MenuItem>
              ) : (
                availableBordereaux.map((bordereau) => (
                  <MenuItem key={bordereau.id} value={bordereau.id}>
                    {bordereau.reference} - {bordereau.assignedTo}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>De (Gestionnaire actuel)</InputLabel>
            <Select
              value={fromGestionnaire}
              onChange={(e) => setFromGestionnaire(e.target.value)}
              label="De (Gestionnaire actuel)"
              disabled
            >
              {gestionnaires.map((gest) => (
                <MenuItem key={gest.id} value={gest.id}>
                  {gest.fullName} ({gest.currentWorkload} dossiers)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Vers (Gestionnaire)</InputLabel>
            <Select
              value={toGestionnaire}
              onChange={(e) => setToGestionnaire(e.target.value)}
              label="Vers (Gestionnaire)"
            >
              {gestionnaires.filter(g => g.currentWorkload < g.capacity && g.id !== fromGestionnaire).map((gest) => (
                <MenuItem key={gest.id} value={gest.id}>
                  {gest.fullName} ({gest.currentWorkload}/{gest.capacity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Raison de la réassignation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReassignDialog(false)}>Annuler</Button>
          <Button
            onClick={handleReassign}
            variant="contained"
            disabled={!selectedBordereau || !fromGestionnaire || !toGestionnaire || reassignMutation.isLoading}
          >
            Réassigner
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onClose={() => setShowStatsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>📈 Performance Détaillée de l'Équipe</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Indicateurs Globaux
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><TrendingUp /></ListItemIcon>
                  <ListItemText
                    primary="Performance Moyenne"
                    secondary={`${stats?.teamPerformance || 0}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Speed /></ListItemIcon>
                  <ListItemText
                    primary="Dossiers Traités Aujourd'hui"
                    secondary={stats?.completedToday || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Group /></ListItemIcon>
                  <ListItemText
                    primary="Gestionnaires Actifs"
                    secondary={gestionnaires.length}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Alertes
              </Typography>
              {(stats?.overdue || 0) > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {stats?.overdue || 0} dossier(s) en retard nécessitent une attention immédiate
                </Alert>
              )}
              {gestionnaires.some(g => g.currentWorkload > g.capacity) && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Certains gestionnaires sont surchargés
                </Alert>
              )}
              {!(stats?.overdue || 0) && !gestionnaires.some(g => g.currentWorkload > g.capacity) && (
                <Alert severity="success">
                  Toutes les équipes fonctionnent dans les limites normales
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatsDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChefEquipeActionButtons;