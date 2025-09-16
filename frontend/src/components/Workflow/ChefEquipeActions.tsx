import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Box,
  Button,
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
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Assignment,
  Block,
  PersonAdd,
  Warning,
  CheckCircle,
  Schedule
} from '@mui/icons-material';

interface ChefEquipeActionsProps {
  bordereau: {
    id: string;
    reference: string;
    clientName: string;
    nombreBS: number;
    statut: string;
    canAssign: boolean;
    canReject: boolean;
    canHandle: boolean;
    slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    remainingTime: number;
  };
  availableGestionnaires: Array<{
    id: string;
    name: string;
    currentWorkload: number;
    maxCapacity: number;
    availableCapacity: number;
    utilizationRate: number;
    isAvailable: boolean;
    status: 'FULL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  onActionComplete?: () => void;
}

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
  returnTo?: 'BO' | 'SCAN';
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

export const ChefEquipeActions: React.FC<ChefEquipeActionsProps> = ({
  bordereau,
  availableGestionnaires,
  onActionComplete
}) => {
  const queryClient = useQueryClient();
  const [assignDialog, setAssignDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [handleDialog, setHandleDialog] = useState(false);
  
  const [selectedGestionnaire, setSelectedGestionnaire] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [returnTo, setReturnTo] = useState<'BO' | 'SCAN'>('SCAN');
  const [handleNotes, setHandleNotes] = useState('');

  const assignMutation = useMutation(assignToGestionnaire, {
    onSuccess: () => {
      setAssignDialog(false);
      setSelectedGestionnaire('');
      setAssignNotes('');
      queryClient.invalidateQueries(['chef-corbeille']);
      onActionComplete?.();
    }
  });

  const rejectMutation = useMutation(rejectBordereau, {
    onSuccess: () => {
      setRejectDialog(false);
      setRejectReason('');
      queryClient.invalidateQueries(['chef-corbeille']);
      onActionComplete?.();
    }
  });

  const handleMutation = useMutation(handlePersonally, {
    onSuccess: () => {
      setHandleDialog(false);
      setHandleNotes('');
      queryClient.invalidateQueries(['chef-corbeille']);
      onActionComplete?.();
    }
  });

  const handleAssign = () => {
    if (selectedGestionnaire) {
      assignMutation.mutate({
        bordereauId: bordereau.id,
        gestionnaireId: selectedGestionnaire,
        notes: assignNotes
      });
    }
  };

  const handleReject = () => {
    if (rejectReason) {
      rejectMutation.mutate({
        bordereauId: bordereau.id,
        reason: rejectReason,
        returnTo
      });
    }
  };

  const handlePersonallyAction = () => {
    handleMutation.mutate({
      bordereauId: bordereau.id,
      notes: handleNotes
    });
  };

  const getSLAChip = () => {
    const { slaStatus, remainingTime } = bordereau;
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    let icon = <Schedule />;

    switch (slaStatus) {
      case 'ON_TIME':
        color = 'success';
        icon = <CheckCircle />;
        break;
      case 'AT_RISK':
        color = 'warning';
        icon = <Warning />;
        break;
      case 'OVERDUE':
      case 'CRITICAL':
        color = 'error';
        icon = <Warning />;
        break;
    }

    const timeText = remainingTime > 24 
      ? `${Math.floor(remainingTime / 24)}j ${Math.floor(remainingTime % 24)}h`
      : `${Math.floor(remainingTime)}h`;

    return (
      <Chip
        icon={icon}
        label={slaStatus === 'OVERDUE' ? 'En retard' : timeText}
        color={color}
        size="small"
      />
    );
  };

  const getWorkloadColor = (status: string) => {
    switch (status) {
      case 'FULL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'success';
    }
  };

  return (
    <Box display="flex" gap={1}>
      {/* Assign Button */}
      {bordereau.canAssign && (
        <Button
          variant="contained"
          size="small"
          startIcon={<Assignment />}
          onClick={() => setAssignDialog(true)}
          disabled={assignMutation.isLoading}
        >
          Affecter
        </Button>
      )}

      {/* Reject Button */}
      {bordereau.canReject && (
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<Block />}
          onClick={() => setRejectDialog(true)}
          disabled={rejectMutation.isLoading}
        >
          Rejeter
        </Button>
      )}

      {/* Handle Personally Button */}
      {bordereau.canHandle && (
        <Button
          variant="outlined"
          size="small"
          color="primary"
          startIcon={<PersonAdd />}
          onClick={() => setHandleDialog(true)}
          disabled={handleMutation.isLoading}
        >
          Traiter
        </Button>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Affecter le Bordereau {bordereau.reference}
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Client: {bordereau.clientName} • {bordereau.nombreBS} BS • {getSLAChip()}
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Gestionnaire</InputLabel>
            <Select
              value={selectedGestionnaire}
              onChange={(e) => setSelectedGestionnaire(e.target.value)}
              label="Gestionnaire"
            >
              {availableGestionnaires.map((gestionnaire) => (
                <MenuItem 
                  key={gestionnaire.id} 
                  value={gestionnaire.id}
                  disabled={!gestionnaire.isAvailable}
                >
                  <Box display="flex" alignItems="center" width="100%">
                    <Typography sx={{ flexGrow: 1 }}>
                      {gestionnaire.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="textSecondary">
                        {gestionnaire.currentWorkload}/{gestionnaire.maxCapacity}
                      </Typography>
                      <Chip
                        label={`${gestionnaire.utilizationRate}%`}
                        color={getWorkloadColor(gestionnaire.status) as any}
                        size="small"
                      />
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedGestionnaire && (
            <Box mb={2}>
              {(() => {
                const selected = availableGestionnaires.find(g => g.id === selectedGestionnaire);
                return selected ? (
                  <Alert severity={selected.status === 'FULL' ? 'error' : selected.status === 'HIGH' ? 'warning' : 'info'}>
                    <Typography variant="body2">
                      <strong>{selected.name}</strong> - Charge actuelle: {selected.currentWorkload}/{selected.maxCapacity} 
                      ({selected.utilizationRate}% d'utilisation)
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={selected.utilizationRate} 
                      sx={{ mt: 1 }}
                      color={selected.status === 'FULL' ? 'error' : selected.status === 'HIGH' ? 'warning' : 'primary'}
                    />
                  </Alert>
                ) : null;
              })()}
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optionnel)"
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.target.value)}
            placeholder="Instructions spéciales, priorités, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            disabled={!selectedGestionnaire || assignMutation.isLoading}
          >
            {assignMutation.isLoading ? 'Affectation...' : 'Affecter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Rejeter le Bordereau {bordereau.reference}
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Client: {bordereau.clientName} • {bordereau.nombreBS} BS
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Retourner vers</InputLabel>
            <Select
              value={returnTo}
              onChange={(e) => setReturnTo(e.target.value as 'BO' | 'SCAN')}
              label="Retourner vers"
            >
              <MenuItem value="SCAN">Service SCAN</MenuItem>
              <MenuItem value="BO">Bureau d'Ordre</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Raison du rejet"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            placeholder="Expliquez pourquoi ce bordereau est rejeté..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!rejectReason || rejectMutation.isLoading}
          >
            {rejectMutation.isLoading ? 'Rejet...' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Handle Personally Dialog */}
      <Dialog open={handleDialog} onClose={() => setHandleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Traiter Personnellement - {bordereau.reference}
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Client: {bordereau.clientName} • {bordereau.nombreBS} BS • {getSLAChip()}
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              En choisissant de traiter ce bordereau personnellement, il sera directement 
              assigné à votre corbeille et passera en statut "En cours".
            </Typography>
          </Alert>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optionnel)"
            value={handleNotes}
            onChange={(e) => setHandleNotes(e.target.value)}
            placeholder="Raisons de la prise en charge personnelle..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandleDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handlePersonallyAction}
            variant="contained"
            disabled={handleMutation.isLoading}
          >
            {handleMutation.isLoading ? 'Prise en charge...' : 'Traiter Personnellement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChefEquipeActions;