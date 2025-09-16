import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import corbeilleService, { CorbeilleResponse } from '../../services/corbeilleService';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  Assignment, 
  CheckCircle, 
  Schedule, 
  Warning,
  MoreVert,
  Reply,
  Pause,
  Block,
  Send
} from '@mui/icons-material';

interface CorbeilleItem {
  id: string;
  reference: string;
  clientName: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number;
}

const fetchGestionnaireCorbeille = async (): Promise<CorbeilleResponse> => {
  return await corbeilleService.getReclamationsGestionnaireCorbeille();
};

const updateReclamationStatus = async (payload: { id: string; status: string; description?: string }) => {
  const { data } = await LocalAPI.patch(`/reclamations/${payload.id}`, {
    status: payload.status,
    description: payload.description
  });
  return data;
};

const returnToChef = async (payload: { id: string; reason: string }) => {
  const { data } = await LocalAPI.post('/workflow/enhanced-corbeille/return-to-chef', {
    bordereauId: payload.id,
    reason: payload.reason
  });
  return data;
};

export const GestionnaireCorbeille: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CorbeilleItem | null>(null);
  const [actionType, setActionType] = useState<'treat' | 'hold' | 'reject'>('treat');
  const [comment, setComment] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error } = useQuery(
    ['gestionnaire-corbeille'],
    fetchGestionnaireCorbeille,
    { refetchInterval: 30000 }
  );

  const updateMutation = useMutation(updateReclamationStatus, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['gestionnaire-corbeille']);
      setActionModalOpen(false);
      setComment('');
      setSelectedItem(null);
      // Show success message
      if (data?.message) {
        alert(data.message);
      } else {
        alert('Réclamation mise à jour avec succès');
      }
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      alert('Erreur lors de la mise à jour: ' + (error.response?.data?.message || error.message));
    }
  });

  const returnMutation = useMutation(returnToChef, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['gestionnaire-corbeille']);
      setActionModalOpen(false);
      setComment('');
      setSelectedItem(null);
      // Show success message
      if (data?.message) {
        alert(data.message);
      } else {
        alert('Réclamation retournée au chef avec succès');
      }
    },
    onError: (error: any) => {
      console.error('Return error:', error);
      alert('Erreur lors du retour: ' + (error.response?.data?.message || error.message));
    }
  });

  if (isLoading) return <div>Chargement de votre corbeille...</div>;
  if (error) return <div>Erreur lors du chargement</div>;

  const { enCours = [], traites = [], retournes = [], stats } = corbeilleData || {};

  const handleAction = (item: CorbeilleItem, action: typeof actionType) => {
    setSelectedItem(item);
    setActionType(action);
    setActionModalOpen(true);
    setAnchorEl(null);
  };

  const handleSubmitAction = () => {
    if (!selectedItem) return;

    const statusMap = {
      treat: 'RESOLVED',
      hold: 'PENDING_CLIENT_REPLY',
      reject: 'CLOSED'
    };

    updateMutation.mutate({
      id: selectedItem.id,
      status: statusMap[actionType],
      description: comment
    });
  };

  const getSLAColor = (slaStatus: string) => {
    return corbeilleService.getSLAColor(slaStatus);
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats?.enCours || 0}
                </Typography>
              </Box>
              <Schedule color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Traités
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats?.traites || 0}
                </Typography>
              </Box>
              <CheckCircle color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Retournés
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats?.nonAffectes || 0}
                </Typography>
              </Box>
              <Reply color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Retard
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats?.enRetard || 0}
                </Typography>
              </Box>
              <Warning color="error" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTable = (items: CorbeilleItem[], showActions = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Objet</TableCell>
            <TableCell>Priorité</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>SLA</TableCell>
            <TableCell>Date</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>{item.reference}</TableCell>
              <TableCell>{item.clientName}</TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                  {item.subject}
                </Typography>
              </TableCell>
              <TableCell>
                <PriorityBadge severity={item.priority as any} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status as any} />
              </TableCell>
              <TableCell>
                <Chip
                  label={`${item.remainingTime}h`}
                  color={getSLAColor(item.slaStatus) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              {showActions && (
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        // Navigate to reclamation detail page within the app
                        window.location.href = `/reclamations/detail/${item.id}`;
                      }}
                    >
                      Voir
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedItem(item);
                        setAnchorEl(e.currentTarget);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const getActionTitle = () => {
    switch (actionType) {
      case 'treat': return 'Traiter la réclamation';
      case 'hold': return 'Mettre en attente';
      case 'reject': return 'Rejeter la réclamation';

      default: return 'Action';
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'treat': return 'success';
      case 'hold': return 'warning';
      case 'reject': return 'error';

      default: return 'primary';
    }
  };

  return (
    <div className="gestionnaire-corbeille p-4">
      <Typography variant="h4" gutterBottom>
        Ma Corbeille
      </Typography>

      {/* Personal Alerts */}
      {(stats?.enRetard || 0) > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> Vous avez {stats?.enRetard || 0} réclamations en retard SLA
        </Alert>
      )}

      {(stats?.critiques || 0) > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Urgent:</strong> {stats?.critiques || 0} réclamations critiques vous sont assignées
        </Alert>
      )}

      {/* Personal Stats */}
      {renderStatsCards()}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`En Cours (${enCours.length})`} />
          <Tab label={`Traités (${traites.length})`} />
          <Tab label={`Retournés (${retournes.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && renderTable(enCours)}
      {activeTab === 1 && renderTable(traites, false)}
      {activeTab === 2 && renderTable(retournes)}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleAction(selectedItem!, 'treat')}>
          <CheckCircle sx={{ mr: 1 }} color="success" />
          Traiter
        </MenuItem>
        <MenuItem onClick={() => handleAction(selectedItem!, 'hold')}>
          <Pause sx={{ mr: 1 }} color="warning" />
          Mettre en attente
        </MenuItem>
        <MenuItem onClick={() => handleAction(selectedItem!, 'reject')}>
          <Block sx={{ mr: 1 }} color="error" />
          Rejeter
        </MenuItem>

      </Menu>

      {/* Action Modal */}
      <Dialog open={actionModalOpen} onClose={() => setActionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {actionType === 'treat' && <CheckCircle color="success" />}
            {actionType === 'hold' && <Pause color="warning" />}
            {actionType === 'reject' && <Block color="error" />}

            {getActionTitle()}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Réclamation: {selectedItem.reference}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Client: {selectedItem.clientName}
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={false}
            placeholder={
              actionType === 'treat' 
                ? 'Décrivez la solution apportée...'
                : actionType === 'hold'
                ? 'Raison de la mise en attente...'
                : 'Raison du rejet...'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionModalOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={getActionColor() as any}
            disabled={updateMutation.isLoading}
            startIcon={<Send />}
          >
            {updateMutation.isLoading || returnMutation.isLoading 
              ? 'Traitement...' 
              : 'Confirmer'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default GestionnaireCorbeille;