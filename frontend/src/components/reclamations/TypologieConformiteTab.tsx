import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { useAuth } from '../../contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';

interface ReclamationItem {
  id: string;
  client?: { name: string };
  clientId: string;
  type: string;
  typologie?: string;
  conformite?: string;
  status: string;
  severity: string;
  description: string;
  createdAt: string;
  assignedTo?: { fullName: string };
}

const fetchReclamations = async (): Promise<ReclamationItem[]> => {
  const { data } = await LocalAPI.get('/reclamations', {
    params: { take: 1000 }
  });
  return data;
};

const updateConformite = async (payload: { id: string; conformite: string }) => {
  const { data } = await LocalAPI.patch(`/reclamations/${payload.id}`, {
    conformite: payload.conformite
  });
  return data;
};

export const TypologieConformiteTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ open: boolean; reclamation: ReclamationItem | null }>({ 
    open: false, 
    reclamation: null 
  });
  const [conformiteValue, setConformiteValue] = useState('');

  const { data: reclamations = [], isLoading, error } = useQuery(
    ['reclamations-typologie'],
    fetchReclamations,
    { refetchInterval: 30000 }
  );

  const conformiteMutation = useMutation(updateConformite, {
    onSuccess: () => {
      queryClient.invalidateQueries(['reclamations-typologie']);
      setEditDialog({ open: false, reclamation: null });
      setConformiteValue('');
    }
  });

  const canUpdateConformite = user && ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role);

  const handleEditConformite = (reclamation: ReclamationItem) => {
    setConformiteValue(reclamation.conformite || '');
    setEditDialog({ open: true, reclamation });
  };

  const handleSaveConformite = () => {
    if (editDialog.reclamation && conformiteValue) {
      conformiteMutation.mutate({
        id: editDialog.reclamation.id,
        conformite: conformiteValue
      });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement des réclamations...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Erreur lors du chargement des réclamations</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Typologie & Conformité des Réclamations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gestion de la typologie et de la conformité des réclamations (Chef d'équipe & Super Admin)
      </Typography>
      
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Typologie Réclamation</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Conformité</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Gravité</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assigné à</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reclamations.length > 0 ? (
              reclamations.map((rec) => (
                <TableRow key={rec.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {rec.client?.name || 'Client inconnu'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={rec.type} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {rec.typologie ? (
                      <Chip 
                        label={rec.typologie} 
                        size="small" 
                        color="info" 
                        variant="filled"
                        sx={{ maxWidth: 200 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Non spécifiée</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {rec.conformite ? (
                      <Chip 
                        label={rec.conformite} 
                        size="small" 
                        color={rec.conformite === 'Fondé' ? 'success' : 'error'}
                        variant="filled"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Non définie</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rec.status as any} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge severity={rec.severity as any} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {rec.assignedTo?.fullName || 'Non assigné'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {canUpdateConformite && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleEditConformite(rec)}
                        disabled={conformiteMutation.isLoading}
                      >
                        Conformité
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Aucune réclamation trouvée
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Les réclamations apparaîtront ici une fois créées
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Conformité Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, reclamation: null })}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Modifier la Conformité</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Seuls les gestionnaires, chefs d'équipe et super admins peuvent modifier la conformité.
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Conformité</InputLabel>
              <Select
                value={conformiteValue}
                onChange={(e) => setConformiteValue(e.target.value)}
                label="Conformité"
              >
                <MenuItem value="">Non définie</MenuItem>
                <MenuItem value="Fondé">Fondé</MenuItem>
                <MenuItem value="Non fondé">Non fondé</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, reclamation: null })}>
            Annuler
          </Button>
          <Button 
            onClick={handleSaveConformite} 
            variant="contained"
            disabled={conformiteMutation.isLoading || !conformiteValue}
          >
            {conformiteMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TypologieConformiteTab;