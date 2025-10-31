import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';

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
  if (!notification) return null;

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
      </DialogContent>

      <DialogActions>
        {!notification.read && onMarkAsRead && (
          <Button onClick={onMarkAsRead} color="primary">
            Marquer comme lu
          </Button>
        )}
        
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