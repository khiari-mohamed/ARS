import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';

import {
  Send,
  CheckCircle,
  Schedule,
  Person,
  Email,
  Phone,
  AttachFile,
  Refresh,
  Download,
  Close,
  Warning,
  Info,
  Error,
  CheckCircleOutline,
  ExpandMore,
  History,
  Visibility,
  Edit,
  Delete,
  Reply,
  Star,
  StarBorder
} from '@mui/icons-material';

interface CustomerClaimSubmission {
  clientId: string;
  type: string;
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  contactPreference: 'email' | 'phone' | 'mail';
  attachments?: File[];
  bordereauReference?: string;
  contractReference?: string;
}

interface CustomerClaim {
  id: string;
  reference: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedAgent?: string;
  estimatedResolution?: string;
  progress: number;
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    date: string;
    user?: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    uploadedAt: string;
  }>;
  canCustomerRespond: boolean;
  rating?: number;
  feedback?: string;
  statusLabel?: string;
  lastUpdate?: string;
  availableActions?: string[];
}

const submitCustomerClaim = async (submission: CustomerClaimSubmission) => {
  const formData = new FormData();
  Object.entries(submission).forEach(([key, value]) => {
    if (key === 'attachments' && Array.isArray(value)) {
      value.forEach(file => formData.append('attachments', file));
    } else if (value !== undefined) {
      formData.append(key, value.toString());
    }
  });
  const { data } = await LocalAPI.post('/reclamations/customer/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

const getCustomerClaimStatus = async (claimId: string, clientId: string): Promise<CustomerClaim> => {
  const { data } = await LocalAPI.get(`/reclamations/customer/${claimId}/status`, {
    params: { clientId }
  });
  return data;
};

const getCustomerPortalStats = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/reclamations/customer/${clientId}/stats`);
  return data;
};

const getCustomerClaims = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/reclamations/customer/${clientId}/claims`);
  return data;
};

const submitClaimResponse = async (claimId: string, response: string, attachments?: File[]) => {
  const formData = new FormData();
  formData.append('message', response);
  if (attachments) {
    attachments.forEach(file => formData.append('attachments', file));
  }
  const { data } = await LocalAPI.post(`/reclamations/customer/${claimId}/response`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

const rateClaim = async (claimId: string, rating: number, feedback?: string) => {
  const { data } = await LocalAPI.post(`/reclamations/customer/${claimId}/feedback`, {
    rating,
    comments: feedback
  });
  return data;
};

const CustomerPortalInterface: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'submit' | 'track' | 'stats' | 'my-claims'>('my-claims');
  const [formData, setFormData] = useState<CustomerClaimSubmission>({
    clientId: user?.id || '',
    type: 'reclamation',
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    contactPreference: 'email'
  });
  const [files, setFiles] = useState<File[]>([]);
  const [trackingId, setTrackingId] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [responseDialog, setResponseDialog] = useState<{ open: boolean; claim: CustomerClaim | null }>({ open: false, claim: null });
  const [ratingDialog, setRatingDialog] = useState<{ open: boolean; claim: CustomerClaim | null }>({ open: false, claim: null });
  const [responseText, setResponseText] = useState('');
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });

  const queryClient = useQueryClient();

  const { data: customerClaims = [], isLoading: claimsLoading, error: claimsError, refetch: refetchClaims } = useQuery(
    ['customer-claims', user?.id],
    () => getCustomerClaims(user?.id || ''),
    { 
      enabled: !!user?.id,
      retry: 2,
      onError: (error: any) => {
        setSnackbar({ 
          open: true, 
          message: error?.response?.data?.message || 'Erreur lors du chargement des réclamations', 
          severity: 'error' 
        });
      }
    }
  );

  const submitMutation = useMutation(submitCustomerClaim, {
    onSuccess: (data) => {
      setSuccessDialogOpen(true);
      setSnackbar({ open: true, message: 'Réclamation soumise avec succès!', severity: 'success' });
      setFormData({
        clientId: user?.id || '',
        type: 'reclamation',
        category: '',
        subject: '',
        description: '',
        priority: 'medium',
        contactPreference: 'email'
      });
      setFiles([]);
      queryClient.invalidateQueries(['customer-claims']);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error?.response?.data?.message || 'Erreur lors de la soumission', severity: 'error' });
    }
  });

  const responseMutation = useMutation(
    ({ claimId, response, attachments }: { claimId: string; response: string; attachments?: File[] }) =>
      submitClaimResponse(claimId, response, attachments),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'Réponse envoyée avec succès', severity: 'success' });
        setResponseDialog({ open: false, claim: null });
        setResponseText('');
        setResponseFiles([]);
        queryClient.invalidateQueries(['customer-claims']);
        queryClient.invalidateQueries(['claim-status']);
      },
      onError: (error: any) => {
        setSnackbar({ open: true, message: error?.response?.data?.message || 'Erreur lors de l\'envoi de la réponse', severity: 'error' });
      }
    }
  );

  const ratingMutation = useMutation(
    ({ claimId, rating, feedback }: { claimId: string; rating: number; feedback?: string }) =>
      rateClaim(claimId, rating, feedback),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'Évaluation enregistrée avec succès', severity: 'success' });
        setRatingDialog({ open: false, claim: null });
        setRating(0);
        setRatingFeedback('');
        queryClient.invalidateQueries(['customer-claims']);
        queryClient.invalidateQueries(['claim-status']);
      },
      onError: (error: any) => {
        setSnackbar({ open: true, message: error?.response?.data?.message || 'Erreur lors de l\'évaluation', severity: 'error' });
      }
    }
  );

  const { data: claimStatus, isLoading: trackingLoading, error: trackingError } = useQuery(
    ['claim-status', trackingId],
    () => getCustomerClaimStatus(trackingId, user?.id || ''),
    { 
      enabled: !!trackingId && activeView === 'track' && !!user?.id,
      retry: 2,
      onError: (error: any) => {
        setSnackbar({ 
          open: true, 
          message: error?.response?.data?.message || 'Réclamation non trouvée', 
          severity: 'error' 
        });
      }
    }
  );

  const { data: portalStats, isLoading: statsLoading, error: statsError } = useQuery(
    ['portal-stats', user?.id],
    () => getCustomerPortalStats(user?.id || ''),
    { 
      enabled: activeView === 'stats' && !!user?.id,
      retry: 2,
      onError: (error: any) => {
        setSnackbar({ 
          open: true, 
          message: error?.response?.data?.message || 'Erreur lors du chargement des statistiques', 
          severity: 'error' 
        });
      }
    }
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'RESOLU':
      case 'RESOLVED':
      case 'FERME':
      case 'CLOSED':
        return 'success';
      case 'EN_COURS':
      case 'IN_PROGRESS':
      case 'ANALYSE':
        return 'info';
      case 'NOUVEAU':
      case 'OPEN':
      case 'OUVERTE':
        return 'warning';
      case 'ATTENTE_CLIENT':
      case 'PENDING_CLIENT_REPLY':
        return 'secondary';
      case 'REJETE':
      case 'REJECTED':
        return 'error';
      case 'ESCALATED':
      case 'ESCALADE':
        return 'error';
      default: 
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    const statusLabels: Record<string, string> = {
      'NOUVEAU': 'Nouvelle',
      'OPEN': 'Ouverte',
      'OUVERTE': 'Ouverte',
      'EN_COURS': 'En cours',
      'IN_PROGRESS': 'En cours',
      'ANALYSE': 'En analyse',
      'ATTENTE_CLIENT': 'En attente de votre réponse',
      'PENDING_CLIENT_REPLY': 'En attente de votre réponse',
      'RESOLUTION': 'En cours de résolution',
      'RESOLU': 'Résolue',
      'RESOLVED': 'Résolue',
      'FERME': 'Fermée',
      'CLOSED': 'Fermée',
      'REJETE': 'Rejetée',
      'REJECTED': 'Rejetée',
      'ESCALATED': 'Escaladée',
      'ESCALADE': 'Escaladée'
    };
    return statusLabels[normalizedStatus] || status;
  };

  const handleResponse = (claim: CustomerClaim) => {
    setResponseDialog({ open: true, claim });
  };

  const handleRating = (claim: CustomerClaim) => {
    setRatingDialog({ open: true, claim });
  };

  const handleSubmitResponse = () => {
    if (responseDialog.claim && responseText.trim()) {
      const formData = {
        claimId: responseDialog.claim.id,
        response: responseText,
        attachments: responseFiles,
        clientId: user?.id || ''
      };
      responseMutation.mutate(formData);
    }
  };

  const handleSubmitRating = () => {
    if (ratingDialog.claim && rating > 0) {
      ratingMutation.mutate({
        claimId: ratingDialog.claim.id,
        rating,
        feedback: ratingFeedback
      });
    }
  };

  const handleSubmit = () => {
    const submission = { ...formData, attachments: files };
    submitMutation.mutate(submission);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const renderSubmissionForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Soumettre une nouvelle réclamation
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
                <MenuItem value="DELAI_TRAITEMENT">Délai de traitement</MenuItem>
                <MenuItem value="QUALITE_SERVICE">Qualité de service</MenuItem>
                <MenuItem value="ERREUR_DOSSIER">Erreur de dossier</MenuItem>
                <MenuItem value="TECHNIQUE">Problème technique</MenuItem>
                <MenuItem value="AUTRE">Autre</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Priorité</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}
              >
                <MenuItem value="low">Normale</MenuItem>
                <MenuItem value="medium">Urgente</MenuItem>
                <MenuItem value="high">Haute</MenuItem>
                <MenuItem value="critical">Critique</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Objet de la réclamation"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Résumez votre réclamation en quelques mots"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={6}
              label="Description détaillée"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre réclamation en détail..."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Contact préféré</InputLabel>
              <Select
                value={formData.contactPreference}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPreference: e.target.value as any }))}
              >
                <MenuItem value="email">
                  <Email sx={{ mr: 1 }} />
                  Email
                </MenuItem>
                <MenuItem value="phone">
                  <Phone sx={{ mr: 1 }} />
                  Téléphone
                </MenuItem>
                <MenuItem value="mail">Courrier postal</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Formats acceptés: PDF, Images, Documents Word
              </Typography>
              {files.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {files.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      onDelete={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.category || !formData.subject || !formData.description || submitMutation.isLoading || !user?.id}
                startIcon={submitMutation.isLoading ? <Schedule /> : <Send />}
                size="large"
              >
                {submitMutation.isLoading ? 'Envoi en cours...' : 'Soumettre la réclamation'}
              </Button>
              
              {(!formData.category || !formData.subject || !formData.description) && (
                <Alert severity="warning" sx={{ flex: 1 }}>
                  Veuillez remplir tous les champs obligatoires
                </Alert>
              )}
              
              {!user?.id && (
                <Alert severity="error" sx={{ flex: 1 }}>
                  Vous devez être connecté pour soumettre une réclamation
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderClaimTracking = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Suivi de réclamation
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Numéro de réclamation"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Saisissez votre numéro de réclamation"
            sx={{ mb: 2 }}
          />
          {trackingLoading && <LinearProgress />}
        </Box>

        {trackingError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Réclamation non trouvée. Vérifiez le numéro saisi.
          </Alert>
        )}

        {claimStatus && (
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Réclamation {claimStatus.reference}
                </Typography>
                <Typography><strong>Statut:</strong> {claimStatus.statusLabel || getStatusLabel(claimStatus.status)}</Typography>
                <Typography><strong>Agent assigné:</strong> {claimStatus.assignedAgent || 'En attente'}</Typography>
                <Typography><strong>Dernière mise à jour:</strong> {new Date(claimStatus.lastUpdate || claimStatus.updatedAt).toLocaleString('fr-FR')}</Typography>
                {claimStatus.estimatedResolution && (
                  <Typography><strong>Résolution estimée:</strong> {new Date(claimStatus.estimatedResolution).toLocaleDateString('fr-FR')}</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" gutterBottom>
                    {claimStatus.progress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={claimStatus.progress}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Progression du traitement
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Historique
                </Typography>
                <List>
                  {claimStatus.timeline?.map((event: any, index: number) => (
                    <ListItem key={event.id}>
                      <ListItemText
                        primary={event.description}
                        secondary={`${new Date(event.date).toLocaleString('fr-FR')}${event.user ? ` - ${event.user}` : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              {claimStatus.canCustomerRespond && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      Vous pouvez répondre à cette réclamation ou ajouter des informations complémentaires.
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {claimStatus.availableActions?.map((action: string, index: number) => (
                        <Button key={index} size="small" sx={{ mr: 1 }}>
                          {action}
                        </Button>
                      )) || (
                        <Button size="small" onClick={() => handleResponse(claimStatus)}>
                          Répondre
                        </Button>
                      )}
                    </Box>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </CardContent>
    </Card>
  );

  const renderPortalStats = () => {
    if (statsLoading) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chargement des statistiques...
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      );
    }

    if (statsError) {
      return (
        <Card>
          <CardContent>
            <Alert severity="error">
              Erreur lors du chargement des statistiques.
              <Button size="small" onClick={() => window.location.reload()} sx={{ ml: 1 }}>
                Réessayer
              </Button>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Réclamations
              </Typography>
              <Typography variant="h4">
                {portalStats?.totalClaims || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                En Cours
              </Typography>
              <Typography variant="h4" color="info.main">
                {portalStats?.openClaims || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Résolues
              </Typography>
              <Typography variant="h4" color="success.main">
                {portalStats?.resolvedClaims || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Temps Moyen
              </Typography>
              <Typography variant="h4">
                {portalStats?.avgResolutionTime || 0}j
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activité Récente
              </Typography>
              {portalStats?.recentActivity && portalStats.recentActivity.length > 0 ? (
                portalStats.recentActivity.map((activity: any) => (
                  <Paper key={activity.id} sx={{ p: 2, mb: 1, cursor: 'pointer' }} onClick={() => {
                    if (activity.claimReference) {
                      setTrackingId(activity.claimReference);
                      setActiveView('track');
                    }
                  }}>
                    <Typography variant="body1">{activity.description}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(activity.date).toLocaleString('fr-FR')}
                    </Typography>
                  </Paper>
                ))
              ) : (
                <Alert severity="info">
                  Aucune activité récente
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <div className="customer-portal p-4">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Portail Client - Réclamations
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Bienvenue {user?.fullName || 'Client'}. Vous pouvez ici soumettre de nouvelles réclamations, suivre leur progression et consulter vos statistiques.
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant={activeView === 'my-claims' ? 'contained' : 'outlined'}
          onClick={() => setActiveView('my-claims')}
          startIcon={<History />}
        >
          Mes Réclamations
        </Button>
        <Button
          variant={activeView === 'submit' ? 'contained' : 'outlined'}
          onClick={() => setActiveView('submit')}
          startIcon={<Send />}
        >
          Nouvelle Réclamation
        </Button>
        <Button
          variant={activeView === 'track' ? 'contained' : 'outlined'}
          onClick={() => setActiveView('track')}
          startIcon={<Visibility />}
        >
          Suivi par Numéro
        </Button>
        <Button
          variant={activeView === 'stats' ? 'contained' : 'outlined'}
          onClick={() => setActiveView('stats')}
          startIcon={<Person />}
        >
          Mes Statistiques
        </Button>
        </Box>
        
        <Box>
          <Tooltip title="Actualiser les données">
            <IconButton 
              onClick={() => {
                refetchClaims();
                queryClient.invalidateQueries(['portal-stats']);
                queryClient.invalidateQueries(['claim-status']);
              }}
              disabled={claimsLoading || statsLoading || trackingLoading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {activeView === 'my-claims' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mes Réclamations
            </Typography>
            {claimsLoading ? (
              <LinearProgress />
            ) : claimsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Erreur lors du chargement des réclamations. 
                <Button size="small" onClick={() => refetchClaims()} sx={{ ml: 1 }}>
                  Réessayer
                </Button>
              </Alert>
            ) : customerClaims.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Info sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Aucune réclamation trouvée
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Vous n'avez pas encore soumis de réclamation.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Send />}
                  onClick={() => setActiveView('submit')}
                >
                  Soumettre une réclamation
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {customerClaims.map((claim: any) => (
                  <Grid item xs={12} key={claim.id}>
                    <Paper sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h6" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{claim.reference}</Typography>
                        <Chip
                          label={claim.statusLabel || getStatusLabel(claim.status)}
                          color={getStatusColor(claim.status) as any}
                          size="small"
                          sx={{ flexShrink: 0 }}
                        />
                      </Box>
                      <Typography variant="body1" gutterBottom>{claim.subject}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        <Chip label={`Catégorie: ${claim.category}`} size="small" variant="outlined" />
                        <Chip label={`Priorité: ${claim.priority}`} size="small" variant="outlined" color={getPriorityColor(claim.priority) as any} />
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        Créée le: {new Date(claim.createdAt).toLocaleDateString('fr-FR')}
                        {claim.assignedAgent && ` | Agent: ${claim.assignedAgent}`}
                      </Typography>
                      {claim.progress && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress variant="determinate" value={claim.progress} />
                          <Typography variant="caption">{claim.progress}% complété</Typography>
                        </Box>
                      )}
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                          size="small" 
                          startIcon={<Visibility />}
                          onClick={() => {
                            setTrackingId(claim.id);
                            setActiveView('track');
                          }}
                        >
                          Voir détails
                        </Button>
                        {claim.canRespond && (
                          <Button size="small" startIcon={<Reply />} onClick={() => handleResponse(claim)}>
                            Répondre
                          </Button>
                        )}
                        {(claim.status === 'RESOLU' || claim.status === 'FERME') && !claim.rating && (
                          <Button size="small" startIcon={<Star />} onClick={() => handleRating(claim)}>
                            Évaluer
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}
      {activeView === 'submit' && renderSubmissionForm()}
      {activeView === 'track' && renderClaimTracking()}
      {activeView === 'stats' && renderPortalStats()}

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            Réclamation soumise avec succès
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Votre réclamation a été enregistrée et sera traitée dans les plus brefs délais.
            Vous recevrez un accusé de réception par email.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Vous pouvez suivre l'évolution de votre réclamation dans l'onglet "Mes Réclamations" ou en utilisant le numéro de référence dans "Suivi par Numéro".
          </Typography>
          {submitMutation.data && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Numéro de réclamation:</strong> {submitMutation.data.reference}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialog.open} onClose={() => setResponseDialog({ open: false, claim: null })} maxWidth="md" fullWidth>
        <DialogTitle>Répondre à la réclamation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Votre réponse"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setResponseFiles(e.target.files ? Array.from(e.target.files) : [])}
              style={{ marginBottom: 8 }}
            />
            <Typography variant="caption" color="textSecondary" display="block">
              Formats acceptés: PDF, Images, Documents Word
            </Typography>
            {responseFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {responseFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                    onDelete={() => setResponseFiles(prev => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setResponseDialog({ open: false, claim: null });
              setResponseText('');
              setResponseFiles([]);
            }}
            disabled={responseMutation.isLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmitResponse} 
            variant="contained" 
            disabled={!responseText.trim() || responseMutation.isLoading}
            startIcon={responseMutation.isLoading ? <Schedule /> : <Send />}
          >
            {responseMutation.isLoading ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog.open} onClose={() => setRatingDialog({ open: false, claim: null })}>
        <DialogTitle>Évaluer la réclamation</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton key={star} onClick={() => setRating(star)}>
                {star <= rating ? <Star color="primary" /> : <StarBorder />}
              </IconButton>
            ))}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Commentaire (optionnel)"
            value={ratingFeedback}
            onChange={(e) => setRatingFeedback(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setRatingDialog({ open: false, claim: null });
              setRating(0);
              setRatingFeedback('');
            }}
            disabled={ratingMutation.isLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmitRating} 
            variant="contained" 
            disabled={rating === 0 || ratingMutation.isLoading}
            startIcon={ratingMutation.isLoading ? <Schedule /> : <Star />}
          >
            {ratingMutation.isLoading ? 'Évaluation...' : 'Évaluer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default CustomerPortalInterface;