import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  Send as SendIcon,
  Block as BlockIcon,
  Description as DescriptionIcon,
  AccountBalance as AccountBalanceIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VirementHistoryEntry {
  id: string;
  action: string;
  previousState?: string;
  newState?: string;
  comment?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface VirementHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  virementId: string;
  virementReference: string;
}

// ─── Action Labels & Icons ────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'CREATION': { label: 'Création du virement', icon: <AddIcon />, color: '#2196f3' },
  'VALIDATION': { label: 'Validation', icon: <CheckCircleIcon />, color: '#4caf50' },
  'AUTORISATION': { label: 'Autorisation', icon: <VerifiedIcon />, color: '#9c27b0' },
  'EXECUTION': { label: 'Exécution', icon: <AccountBalanceIcon />, color: '#4caf50' },
  'REJET': { label: 'Rejet', icon: <CancelIcon />, color: '#f44336' },
  'MODIFICATION': { label: 'Modification', icon: <EditIcon />, color: '#ff9800' },
  'ANNULATION': { label: 'Annulation', icon: <BlockIcon />, color: '#f44336' },
  'REINJECTION': { label: 'Réinjection', icon: <ReplayIcon />, color: '#ff9800' },
  'EXPORT': { label: 'Export', icon: <SendIcon />, color: '#00bcd4' },
  'GENERATION_OV': { label: 'Génération OV', icon: <DescriptionIcon />, color: '#3f51b5' },
  'GENERATION_VIR': { label: 'Génération VIR', icon: <DescriptionIcon />, color: '#3f51b5' },
  'DEMANDE_RECUPERATION': { label: 'Demande de récupération', icon: <SendIcon />, color: '#ff9800' },
  'MONTANT_RECUPERE': { label: 'Montant récupéré', icon: <CheckCircleIcon />, color: '#4caf50' },
  'CHANGEMENT_STATUT': { label: 'Changement de statut', icon: <EditIcon />, color: '#607d8b' },
  'CORRECTION': { label: 'Correction', icon: <EditIcon />, color: '#ff5722' },
  'RELANCE_TRAITEMENT': { label: 'Relance du traitement', icon: <ReplayIcon />, color: '#9c27b0' },
};

const ROLE_LABELS: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'FINANCE': 'Service Financier',
  'CHEF_EQUIPE': 'Chef d\'Équipe',
  'GESTIONNAIRE_SENIOR': 'Gestionnaire Senior',
  'GESTIONNAIRE': 'Gestionnaire',
  'RESPONSABLE': 'Responsable',
};

// ─── Component ────────────────────────────────────────────────────────────────
const VirementHistoryDialog: React.FC<VirementHistoryDialogProps> = ({
  open,
  onClose,
  virementId,
  virementReference
}) => {
  const [history, setHistory] = useState<VirementHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && virementId) {
      loadHistory();
    }
  }, [open, virementId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get(`/finance/ordres-virement/${virementId}/history`);
      setHistory(response.data || []);
    } catch (err: any) {
      console.error('Failed to load virement history:', err);
      setError(err?.response?.data?.message || 'Erreur lors du chargement de l\'historique');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { 
      label: action, 
      icon: <EditIcon />, 
      color: '#757575' 
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          borderBottom: '2px solid #e0e7ef',
          bgcolor: '#f4f7fb',
          pb: 2
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon sx={{ color: '#1e3a5f' }} />
            Historique du Virement
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 600 }}>
            Référence: {virementReference}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#fafbfc' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Chargement de l'historique...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : history.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: '#f8faff',
              borderRadius: 2,
              border: '1px dashed #c5d4e8',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Aucun historique disponible
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Les actions effectuées sur ce virement apparaîtront ici
            </Typography>
          </Box>
        ) : (
          <Timeline position="right" sx={{ p: 0, m: 0 }}>
            {history.map((entry, index) => {
              const config = getActionConfig(entry.action);
              const isLast = index === history.length - 1;

              return (
                <TimelineItem key={entry.id}>
                  <TimelineOppositeContent
                    sx={{ 
                      flex: 0.3, 
                      py: 2,
                      pr: 2
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: '#546e7a',
                        display: 'block',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatDate(entry.createdAt)}
                    </Typography>
                  </TimelineOppositeContent>

                  <TimelineSeparator>
                    <TimelineDot
                      sx={{
                        bgcolor: config.color,
                        boxShadow: `0 0 0 4px ${config.color}20`,
                        p: 1.2,
                        border: `2px solid ${config.color}`,
                      }}
                    >
                      {config.icon}
                    </TimelineDot>
                    {!isLast && (
                      <TimelineConnector
                        sx={{
                          bgcolor: '#e0e7ef',
                          width: 2,
                          minHeight: 40
                        }}
                      />
                    )}
                  </TimelineSeparator>

                  <TimelineContent sx={{ py: 2, pl: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #e0e7ef',
                        borderRadius: 1.5,
                        borderLeft: `4px solid ${config.color}`,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: '#1e3a5f',
                          mb: 0.5
                        }}
                      >
                        {config.label}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={entry.user.name}
                          size="small"
                          sx={{
                            bgcolor: '#e3f2fd',
                            color: '#1565c0',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                        <Chip
                          label={ROLE_LABELS[entry.user.role] || entry.user.role}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: '#90a4ae',
                            color: '#546e7a',
                            fontSize: '0.70rem'
                          }}
                        />
                      </Box>

                      {(entry.previousState || entry.newState) && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          {entry.previousState && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#f44336' }}>
                              <strong>Ancien statut:</strong> {entry.previousState}
                            </Typography>
                          )}
                          {entry.newState && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#4caf50' }}>
                              <strong>Nouveau statut:</strong> {entry.newState}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {entry.comment && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: '#fff8e1',
                            borderRadius: 1,
                            fontSize: '0.8rem',
                            color: '#5d4037',
                            fontStyle: 'italic',
                            borderLeft: '3px solid #ffc107'
                          }}
                        >
                          💬 {entry.comment}
                        </Typography>
                      )}
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e0e7ef',
          bgcolor: '#fafbfc',
          gap: 1
        }}
      >
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
        {!loading && !error && history.length > 0 && (
          <Button
            variant="contained"
            onClick={() => {
              // Export history as CSV or PDF
              const csvContent = [
                ['Date', 'Action', 'Intervenant', 'Rôle', 'Ancien Statut', 'Nouveau Statut', 'Commentaire'],
                ...history.map(entry => [
                  formatDate(entry.createdAt),
                  getActionConfig(entry.action).label,
                  entry.user.name,
                  ROLE_LABELS[entry.user.role] || entry.user.role,
                  entry.previousState || '',
                  entry.newState || '',
                  entry.comment || ''
                ])
              ].map(row => row.join(',')).join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `Historique_${virementReference}_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
          >
            📥 Exporter
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VirementHistoryDialog;
