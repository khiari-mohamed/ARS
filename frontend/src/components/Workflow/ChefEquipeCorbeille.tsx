import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
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
  Tabs,
  Tab
} from '@mui/material';
import {
  Assignment,
  PersonAdd,
  Cancel,
  CheckCircle,
  Refresh
} from '@mui/icons-material';

interface Bordereau {
  id: string;
  reference: string;
  client: { name: string };
  dateReception: string;
  nombreBS: number;
  statut: string;
  delaiReglement: number;
  documents: any[];
  assignedTo?: string;
  currentHandler?: {
    id: string;
    fullName: string;
  };
}

interface Gestionnaire {
  id: string;
  fullName: string;
  capacity: number;
  currentWorkload: number;
}

const fetchChefCorbeille = async (): Promise<{
  traites: Bordereau[];
  enCours: Bordereau[];
  nonAffectes: Bordereau[];
}> => {
  const { data } = await LocalAPI.get('/workflow/chef-equipe/corbeille');
  return data;
};

const fetchGestionnaires = async (): Promise<Gestionnaire[]> => {
  const { data } = await LocalAPI.get('/users/gestionnaires');
  return data;
};

const assignToGestionnaire = async (data: {
  bordereauId: string;
  gestionnaireId: string;
  notes?: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/chef-equipe/assign', data);
  return result;
};

const rejectBordereau = async (data: {
  bordereauId: string;
  reason: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/chef-equipe/reject', data);
  return result;
};

const handlePersonally = async (data: {
  bordereauId: string;
  notes?: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/chef-equipe/handle-personally', data);
  return result;
};

const recupererBordereau = async (data: {
  bordereauId: string;
  reason?: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/chef-equipe/recuperer', data);
  return result;
};

export const ChefEquipeCorbeille: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBordereau, setSelectedBordereau] = useState<Bordereau | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'reject' | 'handle' | 'recuperer' | null>(null);
  const [selectedGestionnaire, setSelectedGestionnaire] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const { data: corbeille, isLoading, refetch } = useQuery(
    ['chef-corbeille'],
    fetchChefCorbeille,
    { 
      refetchInterval: 60000, // Reduced from 30s to 60s
      refetchIntervalInBackground: false, // Stop polling when tab not active
      staleTime: 30000 // Consider data fresh for 30s
    }
  );

  const { data: gestionnaires = [] } = useQuery(
    ['gestionnaires'],
    fetchGestionnaires
  );

  const assignMutation = useMutation(assignToGestionnaire, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error('Assignment failed:', error);
      alert('Erreur lors de l\'affectation: ' + (error.response?.data?.message || error.message));
    }
  });

  const rejectMutation = useMutation(rejectBordereau, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error('Rejection failed:', error);
      alert('Erreur lors du rejet: ' + (error.response?.data?.message || error.message));
    }
  });

  const handlePersonallyMutation = useMutation(handlePersonally, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      handleCloseDialog();
    }
  });

  const recupererMutation = useMutation(recupererBordereau, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error('Recuperation failed:', error);
      alert('Erreur lors de la récupération: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleAction = (bordereau: Bordereau, action: 'assign' | 'reject' | 'handle' | 'recuperer') => {
    setSelectedBordereau(bordereau);
    setActionType(action);
  };

  const handleCloseDialog = () => {
    setSelectedBordereau(null);
    setActionType(null);
    setSelectedGestionnaire('');
    setNotes('');
    setReason('');
  };

  const handleSubmit = () => {
    if (!selectedBordereau) return;

    switch (actionType) {
      case 'assign':
        if (selectedGestionnaire) {
          assignMutation.mutate({
            bordereauId: selectedBordereau.id,
            gestionnaireId: selectedGestionnaire,
            notes
          });
        }
        break;
      case 'reject':
        if (reason) {
          rejectMutation.mutate({
            bordereauId: selectedBordereau.id,
            reason
          });
        }
        break;
      case 'handle':
        handlePersonallyMutation.mutate({
          bordereauId: selectedBordereau.id,
          notes
        });
        break;
      case 'recuperer':
        if (reason) {
          recupererMutation.mutate({
            bordereauId: selectedBordereau.id,
            reason
          });
        }
        break;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'TRAITE': return 'success';
      case 'EN_COURS': return 'info';
      case 'SCANNE': return 'warning';
      default: return 'default';
    }
  };

  const renderBordereauTable = (bordereaux: Bordereau[], tabIndex: number) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Date Réception</TableCell>
            <TableCell>Nombre BS</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Documents</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bordereaux.map((bordereau) => (
            <TableRow key={bordereau.id}>
              <TableCell>{bordereau.reference}</TableCell>
              <TableCell>{bordereau.client?.name || 'N/A'}</TableCell>
              <TableCell>
                {new Date(bordereau.dateReception).toLocaleDateString()}
              </TableCell>
              <TableCell>{bordereau.nombreBS}</TableCell>
              <TableCell>
                <Chip
                  label={bordereau.statut}
                  color={getStatusColor(bordereau.statut) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={`${bordereau.documents?.length || 0} docs`}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  {/* Non Affectés tab (0) - Show assignment actions */}
                  {tabIndex === 0 && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => handleAction(bordereau, 'assign')}
                      >
                        Affecter
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleAction(bordereau, 'reject')}
                      >
                        Rejeter
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Assignment />}
                        onClick={() => handleAction(bordereau, 'handle')}
                      >
                        Traiter
                      </Button>
                    </>
                  )}
                  
                  {/* En Cours tab (1) - Show récupérer action */}
                  {tabIndex === 1 && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<Assignment />}
                        onClick={() => handleAction(bordereau, 'recuperer')}
                      >
                        Récupérer
                      </Button>
                      {bordereau.currentHandler && (
                        <Chip
                          label={`Assigné à: ${bordereau.currentHandler.fullName}`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Traités tab (2) - Show view only */}
                  {tabIndex === 2 && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CheckCircle />}
                      disabled
                    >
                      Terminé
                    </Button>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {bordereaux.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary">
                  Aucun dossier dans cette catégorie
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography>Chargement de la corbeille...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            📋 Corbeille Chef d'Équipe
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
            size="small"
          >
            Actualiser
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Non Affectés (${corbeille?.nonAffectes.length || 0})`} />
          <Tab label={`En Cours (${corbeille?.enCours.length || 0})`} />
          <Tab label={`Traités (${corbeille?.traites.length || 0})`} />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && renderBordereauTable(corbeille?.nonAffectes || [], 0)}
          {activeTab === 1 && renderBordereauTable(corbeille?.enCours || [], 1)}
          {activeTab === 2 && renderBordereauTable(corbeille?.traites || [], 2)}
        </Box>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {actionType === 'assign' && 'Affecter à un Gestionnaire'}
            {actionType === 'reject' && 'Rejeter le Bordereau'}
            {actionType === 'handle' && 'Traiter Personnellement'}
            {actionType === 'recuperer' && 'Récupérer le Bordereau'}
          </DialogTitle>
          <DialogContent>
            {selectedBordereau && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Bordereau: {selectedBordereau.reference} - {selectedBordereau.client?.name || 'N/A'}
              </Alert>
            )}

            {actionType === 'assign' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Gestionnaire</InputLabel>
                  <Select
                    value={selectedGestionnaire}
                    onChange={(e) => setSelectedGestionnaire(e.target.value)}
                    label="Gestionnaire"
                  >
                    {gestionnaires.map((gest) => (
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
                  label="Notes (optionnel)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}

            {actionType === 'reject' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Raison du rejet"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            )}

            {actionType === 'handle' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes de traitement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}

            {actionType === 'recuperer' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Raison de la récupération"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={
                (actionType === 'assign' && !selectedGestionnaire) ||
                (actionType === 'reject' && !reason) ||
                (actionType === 'recuperer' && !reason) ||
                assignMutation.isLoading ||
                rejectMutation.isLoading ||
                handlePersonallyMutation.isLoading ||
                recupererMutation.isLoading
              }
            >
              {actionType === 'assign' && 'Affecter'}
              {actionType === 'reject' && 'Rejeter'}
              {actionType === 'handle' && 'Traiter'}
              {actionType === 'recuperer' && 'Récupérer'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ChefEquipeCorbeille;