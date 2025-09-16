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
  Alert,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Block,
  Undo,
  Pause,
  PlayArrow,
  Warning,
  Schedule,
  Assignment
} from '@mui/icons-material';

interface GestionnaireActionsProps {
  bordereau: {
    id: string;
    reference: string;
    clientName: string;
    nombreBS: number;
    statut: string;
    canProcess: boolean;
    slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    remainingTime: number;
    bsStats?: {
      total: number;
      traites: number;
      rejetes: number;
      enCours: number;
      nonTraites: number;
      completionRate: number;
    };
    actions: string[];
  };
  onActionComplete?: () => void;
}

const processBordereau = async (data: {
  bordereauId: string;
  action: 'TRAITE' | 'REJETE' | 'RETOURNE_CHEF' | 'MIS_EN_INSTANCE';
  notes?: string;
  reason?: string;
}) => {
  const { data: result } = await LocalAPI.post('/workflow/gestionnaire/process', data);
  return result;
};

const startProcessing = async (bordereauId: string) => {
  const { data: result } = await LocalAPI.put(`/workflow/gestionnaire/start-processing/${bordereauId}`);
  return result;
};

export const GestionnaireActions: React.FC<GestionnaireActionsProps> = ({
  bordereau,
  onActionComplete
}) => {
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const processMutation = useMutation(processBordereau, {
    onSuccess: () => {
      setActionDialog(null);
      setNotes('');
      setReason('');
      queryClient.invalidateQueries(['gestionnaire-corbeille']);
      onActionComplete?.();
    }
  });

  const startMutation = useMutation(startProcessing, {
    onSuccess: () => {
      queryClient.invalidateQueries(['gestionnaire-corbeille']);
      onActionComplete?.();
    }
  });

  const handleAction = (action: string) => {
    if (action === 'START_PROCESSING') {
      startMutation.mutate(bordereau.id);
    } else {
      setActionDialog(action);
    }
  };

  const confirmAction = () => {
    if (actionDialog) {
      processMutation.mutate({
        bordereauId: bordereau.id,
        action: actionDialog as any,
        notes,
        reason
      });
    }
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

  const getActionButton = (action: string) => {
    const isLoading = processMutation.isLoading || startMutation.isLoading;
    
    switch (action) {
      case 'START_PROCESSING':
        return (
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => handleAction(action)}
            disabled={isLoading}
            color="primary"
          >
            Commencer le Traitement
          </Button>
        );
      case 'TRAITE':
        return (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => handleAction(action)}
            disabled={isLoading}
            color="success"
          >
            Marquer comme Traité
          </Button>
        );
      case 'REJETE':
        return (
          <Button
            variant="outlined"
            startIcon={<Block />}
            onClick={() => handleAction(action)}
            disabled={isLoading}
            color="error"
          >
            Rejeter
          </Button>
        );
      case 'RETOURNE_CHEF':
        return (
          <Button
            variant="outlined"
            startIcon={<Undo />}
            onClick={() => handleAction(action)}
            disabled={isLoading}
            color="warning"
          >
            Retourner au Chef
          </Button>
        );
      case 'MIS_EN_INSTANCE':
        return (
          <Button
            variant="outlined"
            startIcon={<Pause />}
            onClick={() => handleAction(action)}
            disabled={isLoading}
          >
            Mettre en Instance
          </Button>
        );
      default:
        return null;
    }
  };

  const getDialogContent = () => {
    switch (actionDialog) {
      case 'TRAITE':
        return {
          title: 'Marquer comme Traité',
          content: (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Confirmer que tous les bulletins de soins ont été traités et que le bordereau est prêt pour le virement.
                </Typography>
              </Alert>
              {bordereau.bsStats && bordereau.bsStats.nonTraites > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Attention: {bordereau.bsStats.nonTraites} BS ne sont pas encore traités.
                  </Typography>
                </Alert>
              )}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes de traitement (optionnel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Commentaires sur le traitement..."
              />
            </Box>
          ),
          confirmText: 'Marquer comme Traité',
          confirmColor: 'success' as const
        };

      case 'REJETE':
        return {
          title: 'Rejeter le Bordereau',
          content: (
            <Box>
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Le bordereau sera marqué comme rejeté et ne sera pas traité.
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Raison du rejet"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Expliquez pourquoi ce bordereau est rejeté..."
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes additionnelles (optionnel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
              />
            </Box>
          ),
          confirmText: 'Rejeter',
          confirmColor: 'error' as const,
          requireReason: true
        };

      case 'RETOURNE_CHEF':
        return {
          title: 'Retourner au Chef d\'Équipe',
          content: (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Le bordereau sera retourné au chef d'équipe pour réassignation ou assistance.
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Raison du retour"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Expliquez pourquoi vous retournez ce bordereau..."
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes additionnelles (optionnel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
              />
            </Box>
          ),
          confirmText: 'Retourner au Chef',
          confirmColor: 'warning' as const,
          requireReason: true
        };

      case 'MIS_EN_INSTANCE':
        return {
          title: 'Mettre en Instance',
          content: (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Le bordereau sera mis en attente temporaire. Vous pourrez le reprendre plus tard.
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Raison de la mise en instance (optionnel)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Pourquoi mettre ce bordereau en instance..."
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes (optionnel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
              />
            </Box>
          ),
          confirmText: 'Mettre en Instance',
          confirmColor: 'primary' as const
        };

      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Box>
      {/* Bordereau Info Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {bordereau.reference}
            </Typography>
            {getSLAChip()}
          </Box>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Client: {bordereau.clientName} • {bordereau.nombreBS} BS • Statut: {bordereau.statut}
          </Typography>

          {bordereau.bsStats && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Progression des BS ({bordereau.bsStats.completionRate}%)
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary={`Traités: ${bordereau.bsStats.traites}`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Block color="error" /></ListItemIcon>
                  <ListItemText primary={`Rejetés: ${bordereau.bsStats.rejetes}`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Schedule color="warning" /></ListItemIcon>
                  <ListItemText primary={`En cours: ${bordereau.bsStats.enCours}`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Assignment color="action" /></ListItemIcon>
                  <ListItemText primary={`Non traités: ${bordereau.bsStats.nonTraites}`} />
                </ListItem>
              </List>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" gap={2} flexWrap="wrap">
        {bordereau.actions.map((action) => (
          <Box key={action}>
            {getActionButton(action)}
          </Box>
        ))}
      </Box>

      {/* Action Dialog */}
      {dialogContent && (
        <Dialog 
          open={!!actionDialog} 
          onClose={() => setActionDialog(null)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            {dialogContent.title} - {bordereau.reference}
          </DialogTitle>
          <DialogContent>
            {dialogContent.content}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialog(null)}>
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              variant="contained"
              color={dialogContent.confirmColor}
              disabled={
                processMutation.isLoading || 
                (dialogContent.requireReason && !reason)
              }
            >
              {processMutation.isLoading ? 'Traitement...' : dialogContent.confirmText}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default GestionnaireActions;