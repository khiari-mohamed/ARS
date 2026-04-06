import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Collapse
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface NotificationDetailModalProps {
  open: boolean;
  onClose: () => void;
  notification: {
    id?: string;
    title?: string;
    message: string;
    _type?: string;
    createdAt?: string;
    data?: any;
    read: boolean;
  } | null;
  onMarkAsRead?: () => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  open,
  onClose,
  notification,
  onMarkAsRead
}) => {
  const [justification, setJustification] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedDup, setExpandedDup] = useState<string | null>(null);
  const [localData, setLocalData] = useState<any>(null);

  React.useEffect(() => {
    if (notification?.data) {
      setLocalData(notification.data);
    }
  }, [notification]);

  if (!notification) return null;

  const isDuplicateRibNotification = notification._type === 'DUPLICATE_RIB_APPROVAL_REQUIRED';
  const duplicates = localData?.duplicates || [];
  const pendingCount = duplicates.filter((d: any) => d.status === 'PENDING').length;

  const handleApproveDuplicate = async (duplicateId: string, singleJustification?: string) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/duplicate-rib/approve/${notification.id}/${duplicateId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ justification: singleJustification || justification })
        }
      );

      if (!response.ok) throw new Error('Failed to approve');

      const updatedDuplicates = duplicates.map((d: any) => 
        d.id === duplicateId ? { ...d, status: 'APPROVED', justification: singleJustification || justification } : d
      );
      setLocalData({ ...localData, duplicates: updatedDuplicates });
      alert('✅ RIB dupliqué approuvé avec succès!');
    } catch (error) {
      alert('❌ Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDuplicate = async (duplicateId: string, reason?: string) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/duplicate-rib/reject/${notification.id}/${duplicateId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ reason: reason || 'Rejeté par l\'administrateur' })
        }
      );

      if (!response.ok) throw new Error('Failed to reject');

      const updatedDuplicates = duplicates.map((d: any) => 
        d.id === duplicateId ? { ...d, status: 'REJECTED', justification: reason } : d
      );
      setLocalData({ ...localData, duplicates: updatedDuplicates });
      alert('✅ RIB dupliqué rejeté');
    } catch (error) {
      alert('❌ Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    if (!justification.trim()) {
      alert('⚠️ Veuillez fournir une justification pour l\'approbation en masse');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/duplicate-rib/approve-all/${notification.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ justification })
        }
      );

      if (!response.ok) throw new Error('Failed to approve all');

      const result = await response.json();
      
      const updatedDuplicates = duplicates.map((d: any) => 
        d.status === 'PENDING' ? { ...d, status: 'APPROVED', justification } : d
      );
      setLocalData({ ...localData, duplicates: updatedDuplicates });
      
      alert(`✅ ${result.approved} RIB(s) approuvé(s) avec succès!`);
    } catch (error) {
      alert('❌ Erreur lors de l\'approbation en masse');
    } finally {
      setProcessing(false);
    }
  };

  const getNotificationIcon = (type: string, level?: string) => {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN': return '📄';
      case 'BORDEREAU_READY_ASSIGNMENT': return '📋';
      case 'BORDEREAU_RETURNED': return '↩️';
      case 'TEAM_OVERLOAD_ALERT': return '⚠️';
      case 'ASSIGNMENT_FAILURE': return '❌';
      case 'SLA_BREACH': return '🔴';
      case 'OV_PENDING_VALIDATION': return '💰';
      case 'OV_VALIDATED': return '✅';
      case 'OV_REJECTED': return '❌';
      case 'DUPLICATE_RIB_APPROVAL_REQUIRED': return '🚨';
      case 'WORKFLOW_ASSIGNMENT': return '📋';
      case 'reclamation': 
        if (level === 'error') return '🚨';
        if (level === 'warning') return '⚠️';
        return '📝';
      default: return '🔔';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN': return 'Nouveau scan';
      case 'BORDEREAU_READY_ASSIGNMENT': return 'Prêt pour affectation';
      case 'BORDEREAU_RETURNED': return 'Bordereau retourné';
      case 'TEAM_OVERLOAD_ALERT': return 'Alerte surcharge';
      case 'ASSIGNMENT_FAILURE': return 'Échec affectation';
      case 'SLA_BREACH': return 'Dépassement SLA';
      case 'OV_PENDING_VALIDATION': return 'Validation requise';
      case 'OV_VALIDATED': return 'Validé';
      case 'OV_REJECTED': return 'Rejeté';
      case 'DUPLICATE_RIB_APPROVAL_REQUIRED': return 'RIB Dupliqués';
      case 'reclamation': return 'Réclamation';
      default: return 'Notification';
    }
  };

  const handleAction = () => {
    if (notification._type === 'reclamation' && notification.data?.reclamationId) {
      window.open(`/home/reclamations/${notification.data.reclamationId}`, '_blank');
    } else if (notification.data?.redirectUrl) {
      // Handle redirect URL for rejected bordereaux
      window.location.href = notification.data.redirectUrl;
    } else if (notification.data?.bordereauId) {
      window.open(`/home/bordereaux/${notification.data.bordereauId}`, '_blank');
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <span style={{ fontSize: '24px' }}>
          {getNotificationIcon(notification._type || 'default', notification.data?.level)}
        </span>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="div">
            {notification.title || 'Notification'}
          </Typography>
          <Chip 
            label={getTypeLabel(notification._type || 'default')} 
            size="small" 
            color={notification.read ? 'default' : 'primary'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {isDuplicateRibNotification ? (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {localData?.importedByName} ({localData?.importedByRole}) a tenté d'importer {localData?.blockedCount} adhérent(s) avec des RIB dupliqués.
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Date: {localData?.importDate ? new Date(localData.importDate).toLocaleString('fr-FR') : 'N/A'}
              </Typography>
            </Alert>

            <Typography variant="body2" sx={{ mb: 2 }}>
              📊 <strong>Résumé:</strong> {localData?.successCount} importés, {localData?.blockedCount} bloqués, {pendingCount} en attente d'approbation
            </Typography>

            {pendingCount > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  💡 Justification pour approbation en masse:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Ex: Compte conjoint mari/femme, Compte familial, etc."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={handleApproveAll}
                  disabled={processing || !justification.trim()}
                  startIcon={processing ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                >
                  ✅ Approuver tous les {pendingCount} RIB(s) en attente
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              📋 Liste des RIB dupliqués ({duplicates.length}):
            </Typography>

            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {duplicates.map((dup: any, index: number) => (
                <Box
                  key={dup.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: dup.status === 'APPROVED' ? 'success.main' : dup.status === 'REJECTED' ? 'error.main' : 'warning.main',
                    borderRadius: 1,
                    bgcolor: dup.status === 'APPROVED' ? 'success.light' : dup.status === 'REJECTED' ? 'error.light' : 'warning.light',
                    opacity: dup.status !== 'PENDING' ? 0.7 : 1
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      #{index + 1} - {dup.newAdherent.fullName}
                    </Typography>
                    <Chip
                      label={dup.status === 'APPROVED' ? '✅ Approuvé' : dup.status === 'REJECTED' ? '❌ Rejeté' : '⏳ En attente'}
                      color={dup.status === 'APPROVED' ? 'success' : dup.status === 'REJECTED' ? 'error' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => setExpandedDup(expandedDup === dup.id ? null : dup.id)}
                    sx={{ mb: 1 }}
                  >
                    {expandedDup === dup.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {expandedDup === dup.id ? 'Masquer' : 'Voir'} les détails
                    </Typography>
                  </IconButton>

                  <Collapse in={expandedDup === dup.id}>
                    <Table size="small" sx={{ mb: 2 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Champ</strong></TableCell>
                          <TableCell><strong>Nouvel Adhérent</strong></TableCell>
                          <TableCell><strong>Adhérent Existant</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Matricule</TableCell>
                          <TableCell>{dup.newAdherent.matricule}</TableCell>
                          <TableCell>{dup.existingAdherent.matricule}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Nom Complet</TableCell>
                          <TableCell>{dup.newAdherent.fullName}</TableCell>
                          <TableCell>{dup.existingAdherent.fullName}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>RIB</TableCell>
                          <TableCell colSpan={2} sx={{ fontFamily: 'monospace', color: 'error.main', fontWeight: 600 }}>
                            {dup.newAdherent.rib}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Société</TableCell>
                          <TableCell>{dup.newAdherent.clientName}</TableCell>
                          <TableCell>{dup.existingAdherent.clientName}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {dup.justification && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <strong>Justification:</strong> {dup.justification}
                      </Alert>
                    )}
                  </Collapse>

                  {dup.status === 'PENDING' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        fullWidth
                        onClick={() => {
                          const reason = prompt('Justification (optionnelle):', 'Compte conjoint');
                          if (reason !== null) handleApproveDuplicate(dup.id, reason);
                        }}
                        disabled={processing}
                        startIcon={<CheckCircleIcon />}
                      >
                        ✅ Approuver
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        onClick={() => {
                          const reason = prompt('Raison du rejet:', 'Erreur de saisie');
                          if (reason) handleRejectDuplicate(dup.id, reason);
                        }}
                        disabled={processing}
                        startIcon={<CancelIcon />}
                      >
                        ❌ Rejeter
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box>
        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
          {notification.message}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Date:</strong> {notification.createdAt ? 
              new Date(notification.createdAt).toLocaleString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'
            }
          </Typography>

          <Typography variant="caption" color="text.secondary">
            <strong>Statut:</strong> {notification.read ? 'Lu' : 'Non lu'}
          </Typography>

          {notification.data?.clientName && (
            <Typography variant="caption" color="text.secondary">
              <strong>Client:</strong> {notification.data.clientName}
            </Typography>
          )}

          {notification.data?.reference && (
            <Typography variant="caption" color="text.secondary">
              <strong>Référence:</strong> {notification.data.reference}
            </Typography>
          )}

          {notification.data?.priority && (
            <Typography variant="caption" color="text.secondary">
              <strong>Priorité:</strong> {notification.data.priority}
            </Typography>
          )}
        </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {(notification.data?.reclamationId || notification.data?.bordereauId || notification.data?.redirectUrl) && (
          <Button onClick={handleAction} variant="outlined">
            {notification.data?.redirectUrl ? 'Corriger Documents' : 'Voir détails'}
          </Button>
        )}
        
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationDetailModal;