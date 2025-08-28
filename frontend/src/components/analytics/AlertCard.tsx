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
  TextField
} from '@mui/material';
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
  const [comment, setComment] = useState('');

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
        alertId: alert.id || alert.bordereau.id,
        comment: comment.trim()
      });
      setComment('');
      setCommentDialog(false);
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
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Bordereau #{alert.bordereau.id}
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
              }}
            />
          </Box>

          <Box display="flex" gap={2} mb={2}>
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
            {alert.bordereau.clientId && (
              <Chip
                label={`Client: ${alert.bordereau.clientId}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<CheckCircle />}
                color="success"
                onClick={handleResolve}
                disabled={resolveMutation.isLoading}
              >
                Résoudre
              </Button>
              <Button
                size="small"
                startIcon={<Comment />}
                onClick={() => setCommentDialog(true)}
              >
                Commenter
              </Button>
              <Button
                size="small"
                startIcon={<Visibility />}
                onClick={() => window.open(`/bordereaux/${alert.bordereau.id}`, '_blank')}
              >
                Voir Détails
              </Button>
            </Box>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
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

      {/* Comment Dialog */}
      <Dialog open={commentDialog} onClose={() => setCommentDialog(false)} maxWidth="sm" fullWidth>
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