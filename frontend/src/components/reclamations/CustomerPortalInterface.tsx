import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  // Timeline components removed - will use custom implementation
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Add,
  Upload,
  Visibility,
  CheckCircle,
  Schedule,
  Warning,
  Star,
  Message,
  AttachFile
} from '@mui/icons-material';
import { submitCustomerClaim, getCustomerClaimStatus, getCustomerPortalStats, addCustomerResponse } from '../../services/reclamationsService';

interface ClaimSubmission {
  type: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  contactPreference: string;
  attachments: File[];
}

const CustomerPortalInterface: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [portalStats, setPortalStats] = useState<any>(null);
  const [claimSubmission, setClaimSubmission] = useState<ClaimSubmission>({
    type: '',
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    contactPreference: 'email',
    attachments: []
  });
  const [submittedClaim, setSubmittedClaim] = useState<any>(null);
  const [claimStatus, setClaimStatus] = useState<any>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [responseDialog, setResponseDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [customerResponse, setCustomerResponse] = useState('');
  const [feedback, setFeedback] = useState({ rating: 0, comments: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPortalStats();
  }, []);

  const loadPortalStats = async () => {
    try {
      const stats = await getCustomerPortalStats('current_client');
      setPortalStats(stats);
    } catch (error) {
      console.error('Failed to load portal stats:', error);
    }
  };

  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const result = await submitCustomerClaim({
        clientId: 'current_client',
        ...claimSubmission
      });
      
      setSubmittedClaim(result);
      setActiveStep(3); // Move to confirmation step
    } catch (error) {
      console.error('Failed to submit claim:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = async (claimId: string) => {
    try {
      const status = await getCustomerClaimStatus(claimId, 'current_client');
      setClaimStatus(status);
      setStatusDialogOpen(true);
    } catch (error) {
      console.error('Failed to get claim status:', error);
    }
  };

  const handleAddResponse = async () => {
    if (!claimStatus || !customerResponse.trim()) return;

    try {
      await addCustomerResponse(claimStatus.id, 'current_client', customerResponse);
      setResponseDialog(false);
      setCustomerResponse('');
      // Refresh status
      await handleViewStatus(claimStatus.id);
    } catch (error) {
      console.error('Failed to add response:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setClaimSubmission(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setClaimSubmission(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOUVEAU': return 'info';
      case 'EN_COURS': return 'primary';
      case 'ATTENTE_CLIENT': return 'warning';
      case 'RESOLU': return 'success';
      case 'FERME': return 'default';
      case 'REJETE': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const steps = [
    'Type de réclamation',
    'Détails de la réclamation',
    'Pièces jointes',
    'Confirmation'
  ];

  if (!portalStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Portail Client - Réclamations
      </Typography>

      {/* Dashboard Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Réclamations
              </Typography>
              <Typography variant="h4" component="div">
                {portalStats.totalClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                En Cours
              </Typography>
              <Typography variant="h4" component="div">
                {portalStats.openClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Résolues
              </Typography>
              <Typography variant="h4" component="div">
                {portalStats.resolvedClaims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Satisfaction
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h4" component="div">
                  {portalStats.satisfactionScore.toFixed(1)}
                </Typography>
                <Rating value={portalStats.satisfactionScore} readOnly size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Claim Submission Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nouvelle Réclamation
              </Typography>

              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>Type de réclamation</StepLabel>
                  <StepContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={claimSubmission.type}
                            label="Type"
                            onChange={(e) => setClaimSubmission(prev => ({ ...prev, type: e.target.value }))}
                          >
                            <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                            <MenuItem value="DEMANDE_INFO">Demande d'information</MenuItem>
                            <MenuItem value="SUGGESTION">Suggestion</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Catégorie</InputLabel>
                          <Select
                            value={claimSubmission.category}
                            label="Catégorie"
                            onChange={(e) => setClaimSubmission(prev => ({ ...prev, category: e.target.value }))}
                          >
                            <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
                            <MenuItem value="DELAI_TRAITEMENT">Délai de traitement</MenuItem>
                            <MenuItem value="QUALITE_SERVICE">Qualité de service</MenuItem>
                            <MenuItem value="ERREUR_DOSSIER">Erreur de dossier</MenuItem>
                            <MenuItem value="TECHNIQUE">Problème technique</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    <Box sx={{ mb: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(1)}
                        disabled={!claimSubmission.type || !claimSubmission.category}
                      >
                        Continuer
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Détails de la réclamation</StepLabel>
                  <StepContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Objet"
                          value={claimSubmission.subject}
                          onChange={(e) => setClaimSubmission(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Résumé de votre réclamation"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={6}
                          label="Description détaillée"
                          value={claimSubmission.description}
                          onChange={(e) => setClaimSubmission(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Décrivez votre réclamation en détail..."
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Priorité</InputLabel>
                          <Select
                            value={claimSubmission.priority}
                            label="Priorité"
                            onChange={(e) => setClaimSubmission(prev => ({ ...prev, priority: e.target.value }))}
                          >
                            <MenuItem value="low">Basse</MenuItem>
                            <MenuItem value="medium">Moyenne</MenuItem>
                            <MenuItem value="high">Haute</MenuItem>
                            <MenuItem value="urgent">Urgente</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Contact préféré</InputLabel>
                          <Select
                            value={claimSubmission.contactPreference}
                            label="Contact préféré"
                            onChange={(e) => setClaimSubmission(prev => ({ ...prev, contactPreference: e.target.value }))}
                          >
                            <MenuItem value="email">Email</MenuItem>
                            <MenuItem value="phone">Téléphone</MenuItem>
                            <MenuItem value="mail">Courrier</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    <Box sx={{ mb: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(2)}
                        disabled={!claimSubmission.subject || !claimSubmission.description}
                        sx={{ mr: 1 }}
                      >
                        Continuer
                      </Button>
                      <Button onClick={() => setActiveStep(0)}>
                        Retour
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Pièces jointes</StepLabel>
                  <StepContent>
                    <Box>
                      <input
                        accept="*/*"
                        style={{ display: 'none' }}
                        id="file-upload"
                        multiple
                        type="file"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Upload />}
                          sx={{ mb: 2 }}
                        >
                          Ajouter des fichiers
                        </Button>
                      </label>

                      {claimSubmission.attachments.length > 0 && (
                        <List>
                          {claimSubmission.attachments.map((file, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <AttachFile />
                              </ListItemIcon>
                              <ListItemText
                                primary={file.name}
                                secondary={`${(file.size / 1024).toFixed(1)} KB`}
                              />
                              <Button
                                size="small"
                                color="error"
                                onClick={() => removeAttachment(index)}
                              >
                                Supprimer
                              </Button>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                    <Box sx={{ mb: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleSubmitClaim}
                        disabled={loading}
                        sx={{ mr: 1 }}
                      >
                        {loading ? 'Envoi...' : 'Soumettre la réclamation'}
                      </Button>
                      <Button onClick={() => setActiveStep(1)}>
                        Retour
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Confirmation</StepLabel>
                  <StepContent>
                    {submittedClaim && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Réclamation soumise avec succès !
                        </Typography>
                        <Typography variant="body2">
                          Référence: <strong>{submittedClaim.reference}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Vous recevrez une confirmation par email et pourrez suivre l'évolution de votre réclamation.
                        </Typography>
                      </Alert>
                    )}
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setActiveStep(0);
                        setClaimSubmission({
                          type: '',
                          category: '',
                          subject: '',
                          description: '',
                          priority: 'medium',
                          contactPreference: 'email',
                          attachments: []
                        });
                        setSubmittedClaim(null);
                      }}
                    >
                      Nouvelle réclamation
                    </Button>
                  </StepContent>
                </Step>
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activité Récente
              </Typography>
              <List>
                {portalStats.recentActivity.map((activity: any) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {activity.type === 'claim_submitted' && <Add />}
                      {activity.type === 'status_updated' && <Schedule />}
                      {activity.type === 'message_received' && <Message />}
                      {activity.type === 'claim_resolved' && <CheckCircle />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={formatDate(activity.date)}
                    />
                    {activity.claimReference && (
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleViewStatus(activity.claimReference)}
                      >
                        Voir
                      </Button>
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Suivi de la Réclamation - {claimStatus?.reference}
        </DialogTitle>
        <DialogContent>
          {claimStatus && (
            <Box>
              {/* Status Overview */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1">Statut:</Typography>
                    <Chip
                      label={claimStatus.statusLabel}
                      color={getStatusColor(claimStatus.status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1">Progression:</Typography>
                    <Box sx={{ width: '100%', ml: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={claimStatus.progress}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {claimStatus.progress}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Custom Timeline */}
              <Typography variant="h6" gutterBottom>
                Historique
              </Typography>
              <Box>
                {claimStatus.timeline.map((event: any, index: number) => (
                  <Box key={event.id} display="flex" mb={2}>
                    {/* Timeline Dot */}
                    <Box display="flex" flexDirection="column" alignItems="center" mr={2}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        {event.event === 'CLAIM_SUBMITTED' && <Add />}
                        {event.event === 'CUSTOMER_RESPONSE' && <Message />}
                        {event.event === 'CLAIM_RESOLVED' && <CheckCircle />}
                      </Box>
                      {index < claimStatus.timeline.length - 1 && (
                        <Box
                          sx={{
                            width: 2,
                            height: 40,
                            bgcolor: 'divider',
                            mt: 1
                          }}
                        />
                      )}
                    </Box>
                    {/* Timeline Content */}
                    <Box flex={1}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {event.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.date)} - {event.actor}
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Available Actions */}
              {claimStatus.availableActions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Actions Disponibles
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {claimStatus.availableActions.map((action: string) => (
                      <Button
                        key={action}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          if (action === 'Répondre') {
                            setResponseDialog(true);
                          } else if (action === 'Évaluer le service') {
                            setFeedbackDialog(true);
                          }
                        }}
                      >
                        {action}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialog} onClose={() => setResponseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter une Réponse</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Votre réponse"
            value={customerResponse}
            onChange={(e) => setCustomerResponse(e.target.value)}
            placeholder="Ajoutez des informations complémentaires..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog(false)}>Annuler</Button>
          <Button
            onClick={handleAddResponse}
            variant="contained"
            disabled={!customerResponse.trim()}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Évaluer le Service</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Note globale:
            </Typography>
            <Rating
              value={feedback.rating}
              onChange={(_, value) => setFeedback(prev => ({ ...prev, rating: value || 0 }))}
              size="large"
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Commentaires (optionnel)"
              value={feedback.comments}
              onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Partagez votre expérience..."
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={feedback.rating === 0}
          >
            Envoyer l'Évaluation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerPortalInterface;