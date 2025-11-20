import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid
} from '@mui/material';
import { useResponsive } from '../../hooks/useResponsive';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Assignment,
  Visibility,
  Comment
} from '@mui/icons-material';
import { Alert } from '../../types/alerts.d';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';
import { useResolveAlert, useAddAlertComment } from '../../hooks/useAlertsQuery';

interface AlertCardProps {
  alert: Alert;
  onResolved?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onResolved }) => {
  const [expanded, setExpanded] = useState(false);
  const [commentDialog, setCommentDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [comment, setComment] = useState('');
  const { isMobile } = useResponsive();

  const resolveMutation = useResolveAlert();
  const commentMutation = useAddAlertComment();

  const handleResolve = async () => {
    try {
      await resolveMutation.mutateAsync(alert.bordereau.id);
      onResolved?.();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      await commentMutation.mutateAsync({
        alertId: alert.bordereau.id,
        comment: comment.trim()
      });
      setComment('');
      setCommentDialog(false);
      onResolved?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getSLAStatus = () => {
    const daysSince = alert.bordereau.dateReception 
      ? (new Date().getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    return Math.round(daysSince);
  };

  return (
    <>
      <Card sx={{ mb: 2, border: `2px solid ${alertLevelColor(alert.alertLevel)}` }}>
        <CardContent>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            mb={2}
            gap={{ xs: 1, sm: 0 }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
                Bordereau {alert.bordereau.reference || `#${alert.bordereau.id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {alert.reason}
              </Typography>
            </Box>
            <Chip
              label={alertLevelLabel(alert.alertLevel)}
              sx={{
                backgroundColor: alertLevelColor(alert.alertLevel),
                color: '#fff',
                alignSelf: { xs: 'flex-start', sm: 'center' }
              }}
            />
          </Box>

          <Box 
            display="flex" 
            flexWrap="wrap"
            gap={{ xs: 1, sm: 2 }} 
            mb={2}
          >
            <Chip
              label={`Statut: ${alert.bordereau.statut}`}
              color={alert.bordereau.statut === 'CLOTURE' ? 'success' : 'warning'}
              size="small"
            />
            <Chip
              label={`SLA: ${getSLAStatus()} jours`}
              color={getSLAStatus() > 7 ? 'error' : getSLAStatus() > 5 ? 'warning' : 'success'}
              size="small"
            />
            {(alert.bordereau.client?.name || alert.bordereau.clientId) && (
              <Chip
                label={`Client: ${alert.bordereau.client?.name || alert.bordereau.clientId}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'stretch', sm: 'center' }}
            gap={{ xs: 2, sm: 0 }}
          >
            <Box 
              display="flex" 
              flexDirection={{ xs: 'column', sm: 'row' }}
              gap={1}
            >
              <Button
                size="small"
                startIcon={<CheckCircle />}
                color="success"
                onClick={handleResolve}
                disabled={resolveMutation.isLoading}
                fullWidth={isMobile}
              >
                Résoudre
              </Button>
              <Button
                size="small"
                startIcon={<Comment />}
                onClick={() => setCommentDialog(true)}
                fullWidth={isMobile}
              >
                Commenter
              </Button>
              <Button
                size="small"
                startIcon={<Visibility />}
                onClick={() => setDetailsDialog(true)}
                fullWidth={isMobile}
              >
                Voir Détails
              </Button>
            </Box>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Informations Détaillées
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Équipe:</strong> {alert.bordereau.teamId || 'Non assignée'}
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Assigné à:</strong> {alert.assignedTo?.fullName || 'Non assigné'}
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Date de réception:</strong> {
                  alert.bordereau.dateReception 
                    ? new Date(alert.bordereau.dateReception).toLocaleDateString()
                    : 'Non définie'
                }
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Créé le:</strong> {new Date(alert.bordereau.createdAt).toLocaleDateString()}
              </Typography>
              
              {alert.comments && alert.comments.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Commentaires ({alert.comments.length})
                  </Typography>
                  {alert.comments.slice(-3).map((comment, index) => (
                    <Box key={index} mb={1} p={1} bgcolor="white" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        {comment.user?.fullName} - {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        {comment.comment}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Détails du Bordereau {alert.bordereau.reference || `#${alert.bordereau.id}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                <Typography variant="body1" gutterBottom>{alert.bordereau.statut}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Date de réception</Typography>
                <Typography variant="body1" gutterBottom>
                  {alert.bordereau.dateReception 
                    ? new Date(alert.bordereau.dateReception).toLocaleDateString('fr-FR')
                    : 'Non définie'
                  }
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Date de création</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(alert.bordereau.createdAt).toLocaleDateString('fr-FR')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">SLA</Typography>
                <Typography variant="body1" gutterBottom>
                  {getSLAStatus()} jours écoulés
                </Typography>
              </Grid>
              {(alert.bordereau.client?.name || alert.bordereau.clientId) && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                  <Typography variant="body1" gutterBottom>{alert.bordereau.client?.name || alert.bordereau.clientId}</Typography>
                </Grid>
              )}
              {(alert.bordereau.team?.fullName || alert.bordereau.teamId) && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Équipe</Typography>
                  <Typography variant="body1" gutterBottom>{alert.bordereau.team?.fullName || alert.bordereau.teamId}</Typography>
                </Grid>
              )}
              {(alert.bordereau.currentHandler?.fullName || alert.bordereau.chargeCompte?.fullName || alert.bordereau.assignedToUserId) && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Gestionnaire</Typography>
                  <Typography variant="body1" gutterBottom>{alert.bordereau.currentHandler?.fullName || alert.bordereau.chargeCompte?.fullName || alert.bordereau.assignedToUserId}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Niveau d'alerte</Typography>
                <Chip
                  label={alertLevelLabel(alert.alertLevel)}
                  sx={{
                    backgroundColor: alertLevelColor(alert.alertLevel),
                    color: '#fff',
                    mt: 1
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Raison de l'alerte</Typography>
                <Typography variant="body1" gutterBottom>{alert.reason}</Typography>
              </Grid>
              {alert.aiScore && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Score IA</Typography>
                  <Typography variant="body1" gutterBottom>
                    {Math.round(alert.aiScore * 100)}% de confiance
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog 
        open={commentDialog} 
        onClose={() => setCommentDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Ajouter un Commentaire</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Commentaire"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleAddComment}
            disabled={!comment.trim() || commentMutation.isLoading}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlertCard;