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
  Grid,
  CircularProgress
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
  const [resolveDialog, setResolveDialog] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [comment, setComment] = useState('');
  const { isMobile } = useResponsive();

  const resolveMutation = useResolveAlert();
  const commentMutation = useAddAlertComment();

  const handleResolveClick = () => {
    setResolveDialog(true);
    fetchAISuggestion();
  };

  const fetchAISuggestion = async () => {
    setLoadingAI(true);
    try {
      const AI_URL = process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002';
      
      // Get token first
      const tokenResponse = await fetch(`${AI_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: 'admin',
          password: 'secret'
        })
      });
      const tokenData = await tokenResponse.json();
      
      // Make authenticated request to alert resolution endpoint
      const response = await fetch(`${AI_URL}/alert_resolution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`
        },
        body: JSON.stringify({
          alert: {
            alert_level: alert.alertLevel,
            days_since_reception: alert.daysSinceReception ?? 0,
            sla_threshold: alert.slaThreshold ?? 30,
            reason: alert.reason
          },
          bordereau: {
            id: alert.bordereau.id,
            reference: alert.bordereau.reference,
            nombreBS: 1,
            delaiReglement: alert.slaThreshold ?? 30,
            statut: alert.bordereau.statut,
            client_name: alert.bordereau.client?.name,
            assignedToUserId: alert.bordereau.assignedToUserId
          }
        })
      });
      const data = await response.json();
      console.log('AI Response:', data);
      
      // Parse alert resolution response with clean formatting
      let suggestion = 'Aucune suggestion disponible';
      if (data.suggestions && data.suggestions.length > 0) {
        const sug = data.suggestions[0];
        const priority = data.priority || 'MEDIUM';
        const priorityIcon = priority === 'CRITICAL' ? '🔴' : priority === 'HIGH' ? '🟠' : '🟡';
        const priorityText = priority === 'CRITICAL' ? 'CRITIQUE' : priority === 'HIGH' ? 'HAUTE' : 'MOYENNE';
        const confidence = Math.round((sug.confidence === 'high' ? 0.9 : sug.confidence === 'medium' ? 0.75 : 0.6) * 100);
        
        suggestion = `🤖 ANALYSE IA - RÉSOLUTION ALERTE
───────────────────────────────────

PRIORITÉ: ${priorityIcon} ${priorityText}

🎯 RECOMMANDATION
${sug.title}

📋 ANALYSE
${sug.description}

💡 PLAN D'ACTION
${sug.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

⏱️ TEMPS ESTIMÉ: ${sug.estimated_time}
📊 CONFIANCE IA: ${confidence}%${data.suggestions.length > 1 ? `

───────────────────────────────────
📌 SUGGESTION ADDITIONNELLE
${data.suggestions[1].title}
• ${data.suggestions[1].steps[0]}` : ''}`;
      } else if (data.error) {
        suggestion = `❌ Erreur: ${data.error}`;
      }
      
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to fetch AI suggestion:', error);
      setAiSuggestion('Erreur lors de la récupération de la suggestion IA');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleResolve = async () => {
    try {
      await resolveMutation.mutateAsync(alert.bordereau.id);
      setResolveDialog(false);
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
                onClick={handleResolveClick}
                disabled={resolveMutation.isLoading}
                fullWidth={isMobile}
              >
                Résoudre
              </Button>
              {/* <Button
                size="small"
                startIcon={<Comment />}
                onClick={() => setCommentDialog(true)}
                fullWidth={isMobile}
              >
                Commenter
              </Button> */}
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
                <strong>Équipe:</strong> {alert.bordereau.teamName || 'Non assignée'}
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Assigné à:</strong> {alert.bordereau.assignedToName || 'Non assigné'}
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
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Équipe</Typography>
                <Typography variant="body1" gutterBottom>{alert.bordereau.teamName || 'Non assignée'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Gestionnaire</Typography>
                <Typography variant="body1" gutterBottom>{alert.bordereau.assignedToName || 'Non assigné'}</Typography>
              </Grid>
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

      {/* Resolve Dialog with AI Suggestion */}
      <Dialog 
        open={resolveDialog} 
        onClose={() => setResolveDialog(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Résoudre l'Alerte</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bordereau: {alert.bordereau.reference || alert.bordereau.id}
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                🤖 Suggestion IA
              </Typography>
              {loadingAI ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} />
                  <Typography>Analyse en cours...</Typography>
                </Box>
              ) : (
                <Typography variant="body1">
                  {aiSuggestion}
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Informations de l'alerte:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Niveau: {alertLevelLabel(alert.alertLevel)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Raison: {alert.reason}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • SLA: {alert.daysSinceReception} jours écoulés / {alert.slaThreshold} jours
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={resolveMutation.isLoading}
            startIcon={<CheckCircle />}
          >
            Résoudre Manuellement
          </Button>
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