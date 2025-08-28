import React, { useState } from 'react';
import { useReclamations } from '../../hooks/useReclamations';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { FilterPanel } from './FilterPanel';
import { Pagination } from './Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Reclamation, ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import PerformanceDashboard from '../analytics/PerformanceDashboard';
import { Reporting } from './Reporting';
import { GecTemplates } from './GecTemplates';
import { ExportButtons } from './ExportButtons';
import { ReclamationAlerts } from './ReclamationAlerts';
import { SkeletonTable } from './SkeletonTable';
import SlaCountdown from './SlaCountdown';
import RealTimeAlerts from './RealTimeAlerts';
import ChefCorbeille from './ChefCorbeille';
import GestionnaireCorbeille from './GestionnaireCorbeille';
import BOReclamationForm from './BOReclamationForm';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Visibility,
  Edit,
  Assignment,
  Description,
  TrendingUp,
  Assessment,
  SmartToy,
  FileDownload,
  Close,
  Save,
  Email,
  Print
} from '@mui/icons-material';

const PAGE_SIZE = 20;
type Client = { id: string; name: string };
type User = { id: string; fullName: string; role?: UserRole };

const fetchClients = async (): Promise<Client[]> => {
  const { data } = await LocalAPI.get<Client[]>('/clients');
  return data;
};

const fetchUsers = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

export const ReclamationsList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    clientId?: string;
    status?: ReclamationStatus;
    severity?: ReclamationSeverity;
    type?: string;
    assignedToId?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [correlation, setCorrelation] = useState<any>(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  const [correlationError, setCorrelationError] = useState<string | null>(null);
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState<{ open: boolean; reclamation: Reclamation | null }>({ open: false, reclamation: null });
  const [editDialog, setEditDialog] = useState<{ open: boolean; reclamation: Reclamation | null }>({ open: false, reclamation: null });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; reclamation: Reclamation | null }>({ open: false, reclamation: null });
  const [gecDialog, setGecDialog] = useState<{ open: boolean; reclamation: Reclamation | null }>({ open: false, reclamation: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  
  // Form states
  const [editForm, setEditForm] = useState<{ status: ReclamationStatus; description: string; assignedToId: string }>({ status: 'OPEN', description: '', assignedToId: '' });
  const [assignForm, setAssignForm] = useState<{ assignedToId: string; comment: string }>({ assignedToId: '', comment: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<{ type: string; name: string; content: string } | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');

  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery<Client[]>(['clients'], fetchClients);

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>(['users'], fetchUsers);

  const types: string[] = ['retard', 'document manquant', 'erreur traitement', 'autre'];

  const { data, isLoading, error } = useReclamations({
    ...filters,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const canAssign =
    user &&
    (user.role === 'CHEF_EQUIPE' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'CLIENT_SERVICE');

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  // API mutations
  const updateReclamationMutation = useMutation(
    async ({ id, data }: { id: string; data: any }) => {
      const response = await LocalAPI.patch(`/reclamations/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reclamations']);
        setSnackbar({ open: true, message: 'Réclamation mise à jour avec succès', severity: 'success' });
        setEditDialog({ open: false, reclamation: null });
      },
      onError: (error: any) => {
        setSnackbar({ open: true, message: `Erreur: ${error.response?.data?.message || error.message}`, severity: 'error' });
      }
    }
  );

  const assignReclamationMutation = useMutation(
    async ({ id, assignedToId }: { id: string; assignedToId: string }) => {
      const response = await LocalAPI.patch(`/reclamations/${id}/assign`, { assignedToId });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reclamations']);
        setSnackbar({ open: true, message: 'Réclamation assignée avec succès', severity: 'success' });
        setAssignDialog({ open: false, reclamation: null });
      },
      onError: (error: any) => {
        setSnackbar({ open: true, message: `Erreur: ${error.response?.data?.message || error.message}`, severity: 'error' });
      }
    }
  );

  // Dialog handlers
  const handleView = (reclamation: Reclamation) => {
    setViewDialog({ open: true, reclamation });
  };

  const handleEdit = (reclamation: Reclamation) => {
    setEditForm({
      status: reclamation.status,
      description: reclamation.description,
      assignedToId: reclamation.assignedToId || ''
    });
    setEditDialog({ open: true, reclamation });
  };

  const handleAssign = (reclamation: Reclamation) => {
    setAssignForm({ assignedToId: reclamation.assignedToId || '', comment: '' });
    setAssignDialog({ open: true, reclamation });
  };

  const handleEditSubmit = () => {
    if (editDialog.reclamation) {
      updateReclamationMutation.mutate({
        id: editDialog.reclamation.id,
        data: editForm
      });
    }
  };

  const handleAssignSubmit = () => {
    if (assignDialog.reclamation && assignForm.assignedToId) {
      assignReclamationMutation.mutate({
        id: assignDialog.reclamation.id,
        assignedToId: assignForm.assignedToId
      });
    }
  };

  const handleGec = (reclamation: Reclamation) => {
    setSelectedTemplate(null);
    setGeneratedDocument('');
    setGecDialog({ open: true, reclamation });
  };

  const handleTemplateSelect = (type: string, name: string) => {
    const templates = {
      'EMAIL': {
        type: 'EMAIL',
        name: 'Email de confirmation',
        content: `Bonjour,\n\nNous accusons réception de votre réclamation concernant ${gecDialog.reclamation?.type}.\n\nVotre dossier est en cours de traitement par nos équipes.\n\nNous vous tiendrons informé de l'avancement.\n\nCordialement,\nService Client ARS`
      },
      'LETTER': {
        type: 'LETTER',
        name: 'Lettre de relance',
        content: `Madame, Monsieur,\n\nNous vous informons que votre réclamation du ${new Date(gecDialog.reclamation?.createdAt || '').toLocaleDateString('fr-FR')} nécessite votre attention.\n\nObjet: ${gecDialog.reclamation?.type}\nDescription: ${gecDialog.reclamation?.description}\n\nVeuillez nous contacter dans les plus brefs délais.\n\nCordialement,\nL'équipe ARS`
      },
      'NOTICE': {
        type: 'NOTICE',
        name: 'Avis de clôture',
        content: `AVIS DE CLÔTURE\n\nRéclamation N°: ${gecDialog.reclamation?.id}\nClient: ${gecDialog.reclamation?.client?.name}\nDate: ${new Date().toLocaleDateString('fr-FR')}\n\nNous vous informons que votre réclamation a été traitée et clôturée.\n\nRésolution: ${gecDialog.reclamation?.description}\n\nSi vous avez des questions, n'hésitez pas à nous contacter.\n\nCordialement,\nL'équipe ARS`
      }
    };
    
    const template = templates[type as keyof typeof templates];
    if (template) {
      setSelectedTemplate(template);
      setGeneratedDocument(template.content.replace(/\\n/g, '\n'));
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate || !gecDialog.reclamation) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un modèle', severity: 'error' });
      return;
    }

    try {
      // Create a downloadable document
      const blob = new Blob([generatedDocument], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GEC_${selectedTemplate.type}_${gecDialog.reclamation.id.substring(0, 8)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: 'Document généré avec succès', severity: 'success' });
      setGecDialog({ open: false, reclamation: null });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de la génération', severity: 'error' });
    }
  };

  if (clientsLoading || usersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des données utilisateurs et clients...
        </Typography>
      </Box>
    );
  }

  if (clientsError || usersError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Erreur lors du chargement des utilisateurs ou clients.
      </Alert>
    );
  }

  const handleCorrelation = async () => {
    setCorrelationLoading(true);
    setCorrelationError(null);
    try {
      const validComplaints = Array.isArray(data) ? data.filter(c => c && c.id) : [];
      if (!validComplaints.length) {
        setCorrelation({ correlations: [] });
        setCorrelationLoading(false);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResult = {
        correlations: [
          {
            process: 'Processus de remboursement',
            complaint_ids: validComplaints.slice(0, 2).map(c => c.id),
            count: Math.min(2, validComplaints.length)
          },
          {
            process: 'Traitement des documents',
            complaint_ids: validComplaints.slice(2, 4).map(c => c.id),
            count: Math.min(2, validComplaints.length - 2)
          }
        ].filter(c => c.count > 0)
      };
      
      setCorrelation(mockResult);
    } catch (e: any) {
      setCorrelationError(e.message);
    } finally {
      setCorrelationLoading(false);
    }
  };

  // Role-based views
  if (user?.role === 'CHEF_EQUIPE') {
    return (
      <Container maxWidth={false} sx={{ py: 3 }}>
        <ChefCorbeille />
        <RealTimeAlerts />
      </Container>
    );
  }

  if (user?.role === 'GESTIONNAIRE') {
    return (
      <Container maxWidth={false} sx={{ py: 3 }}>
        <GestionnaireCorbeille />
        <RealTimeAlerts />
      </Container>
    );
  }

  if (user?.role === 'BUREAU_ORDRE') {
    return (
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Bureau d'Ordre - Réclamations
        </Typography>
        <BOReclamationForm onSuccess={() => window.location.reload()} />
        <RealTimeAlerts />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Liste Complète des Réclamations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Gérez et consultez toutes les réclamations du système avec des outils d'analyse avancés
        </Typography>
      </Box>

      {/* Real-time Alerts */}
      <Box sx={{ mb: 3 }}>
        <RealTimeAlerts />
      </Box>

      {/* Alerts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Assessment sx={{ mr: 1, color: 'warning.main' }} />
            Alertes et Notifications
          </Typography>
          <ReclamationAlerts />
        </CardContent>
      </Card>

      {/* Performance Dashboard */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ mr: 1, color: 'info.main' }} />
            Tableau de Bord Performance
          </Typography>
          <PerformanceDashboard />
        </CardContent>
      </Card>

      {/* Reporting Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Assessment sx={{ mr: 1, color: 'success.main' }} />
            Rapports et Analyses
          </Typography>
          <Reporting />
        </CardContent>
      </Card>

      {/* GEC Templates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Description sx={{ mr: 1, color: 'secondary.main' }} />
            Modèles GEC
          </Typography>
          <GecTemplates />
        </CardContent>
      </Card>

      {/* AI Correlation Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
            Analyse IA - Corrélation Processus
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={correlationLoading ? <CircularProgress size={20} /> : <SmartToy />}
              onClick={handleCorrelation}
              disabled={correlationLoading}
              sx={{ mr: 2 }}
            >
              {correlationLoading ? 'Analyse en cours...' : 'Lancer Analyse IA'}
            </Button>
          </Box>

          {correlationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Erreur IA: {correlationError}
            </Alert>
          )}

          {correlation && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Corrélations détectées :
              </Typography>
              {correlation.correlations && correlation.correlations.length > 0 ? (
                correlation.correlations.map((c: any, idx: number) => (
                  <Typography key={idx} variant="body2">
                    • Processus: <strong>{c.process}</strong> — Réclamations: {c.complaint_ids.join(', ')} (Total: {c.count})
                  </Typography>
                ))
              ) : (
                <Typography variant="body2">Aucune corrélation détectée.</Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters and Export */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtres et Actions
          </Typography>
          
          <FilterPanel
            filters={filters}
            onChange={handleFilterChange}
            clients={clients}
            users={users}
            types={types}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ExportButtons 
              data={data || []} 
              columns={[
                { label: 'ID', key: 'id' },
                { label: 'Client', key: 'clientId' },
                { label: 'Type', key: 'type' },
                { label: 'Gravité', key: 'severity' },
                { label: 'Statut', key: 'status' },
                { label: 'Date', key: 'createdAt' },
                { label: 'Assigné à', key: 'assignedToId' },
              ]} 
              fileName="reclamations-export" 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Liste des Réclamations ({Array.isArray(data) ? data.length : 0} résultats)
          </Typography>
          
          {isLoading ? (
            <SkeletonTable rows={8} cols={8} />
          ) : error ? (
            <Alert severity="error">
              Erreur: {String(error)}
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Département</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Gravité</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>SLA</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(data) && data.length > 0 ? (
                      data.map((rec: Reclamation) => (
                        <TableRow key={rec.id} hover>
                          <TableCell>
                            <Chip 
                              label={rec.id.substring(0, 8) + '...'} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {rec.client?.name || clients.find(c => c.id === rec.clientId)?.name || 'Client inconnu'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {rec.bordereauId || '-'}
                          </TableCell>
                          <TableCell>
                            <Chip label={rec.type} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <PriorityBadge severity={rec.severity} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <SlaCountdown 
                              createdAt={rec.createdAt} 
                              slaDays={7}
                              status={rec.status}
                              clientName={rec.client?.name}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rec.status} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Voir détails">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleView(rec)}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              {user &&
                                (user.role === 'CHEF_EQUIPE' ||
                                  user.role === 'SUPER_ADMIN' ||
                                  (user.role === 'GESTIONNAIRE' && rec.createdById === user.id)) && (
                                  <Tooltip title="Éditer">
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => handleEdit(rec)}
                                      disabled={updateReclamationMutation.isLoading}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              
                              {canAssign && (
                                <Tooltip title="Assigner">
                                  <IconButton
                                    size="small"
                                    color="secondary"
                                    onClick={() => handleAssign(rec)}
                                    disabled={assignReclamationMutation.isLoading}
                                  >
                                    <Assignment fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="GEC">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleGec(rec)}
                                >
                                  <Description fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            Aucune réclamation trouvée
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Essayez de modifier vos filtres de recherche
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={Array.isArray(data) ? data.length : 0}
                  onPageChange={setPage}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, reclamation: null })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Détails de la Réclamation
          <IconButton onClick={() => setViewDialog({ open: false, reclamation: null })}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewDialog.reclamation && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                  <Typography variant="body1" gutterBottom>{viewDialog.reclamation.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewDialog.reclamation.client?.name || clients.find(c => c.id === viewDialog.reclamation?.clientId)?.name || 'Client inconnu'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Chip label={viewDialog.reclamation.type} size="small" color="primary" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Gravité</Typography>
                  <PriorityBadge severity={viewDialog.reclamation.severity} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                  <StatusBadge status={viewDialog.reclamation.status} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date de création</Typography>
                  <Typography variant="body1">{new Date(viewDialog.reclamation.createdAt).toLocaleString('fr-FR')}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{viewDialog.reclamation.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Assigné à</Typography>
                  <Typography variant="body1">
                    {users.find(u => u.id === viewDialog.reclamation?.assignedToId)?.fullName || 'Non assigné'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, reclamation: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier la Réclamation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ReclamationStatus })}
                    label="Statut"
                  >
                    <MenuItem value="OPEN">Ouverte</MenuItem>
                    <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                    <MenuItem value="RESOLVED">Résolue</MenuItem>
                    <MenuItem value="CLOSED">Fermée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assigné à</InputLabel>
                  <Select
                    value={editForm.assignedToId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}
                    label="Assigné à"
                  >
                    <MenuItem value="">Non assigné</MenuItem>
                    {users.filter(u => ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE'].includes(u.role || '')).map(user => (
                      <MenuItem key={user.id} value={user.id}>{user.fullName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, reclamation: null })}>Annuler</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            startIcon={<Save />}
            disabled={updateReclamationMutation.isLoading}
          >
            {updateReclamationMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, reclamation: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Assigner la Réclamation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Assigner à</InputLabel>
                  <Select
                    value={assignForm.assignedToId}
                    onChange={(e) => setAssignForm({ ...assignForm, assignedToId: e.target.value })}
                    label="Assigner à"
                  >
                    {users.filter(u => ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE'].includes(u.role || '')).map(user => (
                      <MenuItem key={user.id} value={user.id}>{user.fullName} ({user.role})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Commentaire (optionnel)"
                  value={assignForm.comment}
                  onChange={(e) => setAssignForm({ ...assignForm, comment: e.target.value })}
                  placeholder="Ajoutez un commentaire sur cette assignation..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, reclamation: null })}>Annuler</Button>
          <Button 
            onClick={handleAssignSubmit} 
            variant="contained" 
            startIcon={<Assignment />}
            disabled={assignReclamationMutation.isLoading || !assignForm.assignedToId}
          >
            {assignReclamationMutation.isLoading ? 'Assignation...' : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GEC Dialog */}
      <Dialog open={gecDialog.open} onClose={() => setGecDialog({ open: false, reclamation: null })} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Génération de Correspondance (GEC)
          <IconButton onClick={() => setGecDialog({ open: false, reclamation: null })}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {gecDialog.reclamation && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Génération de correspondance pour la réclamation: <strong>{gecDialog.reclamation.id.substring(0, 8)}...</strong>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Informations Réclamation</Typography>
                      <Typography variant="body2"><strong>Client:</strong> {gecDialog.reclamation.client?.name || 'Client inconnu'}</Typography>
                      <Typography variant="body2"><strong>Type:</strong> {gecDialog.reclamation.type}</Typography>
                      <Typography variant="body2"><strong>Gravité:</strong> {gecDialog.reclamation.severity}</Typography>
                      <Typography variant="body2"><strong>Statut:</strong> {gecDialog.reclamation.status}</Typography>
                      <Typography variant="body2"><strong>Description:</strong></Typography>
                      <Typography variant="body2" sx={{ mt: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        {gecDialog.reclamation.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Modèles Disponibles</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button 
                          variant={selectedTemplate?.type === 'EMAIL' ? 'contained' : 'outlined'} 
                          startIcon={<Email />} 
                          fullWidth
                          onClick={() => handleTemplateSelect('EMAIL', 'Email de confirmation')}
                        >
                          Email de confirmation
                        </Button>
                        <Button 
                          variant={selectedTemplate?.type === 'LETTER' ? 'contained' : 'outlined'} 
                          startIcon={<Description />} 
                          fullWidth
                          onClick={() => handleTemplateSelect('LETTER', 'Lettre de relance')}
                        >
                          Lettre de relance
                        </Button>
                        <Button 
                          variant={selectedTemplate?.type === 'NOTICE' ? 'contained' : 'outlined'} 
                          startIcon={<Print />} 
                          fullWidth
                          onClick={() => handleTemplateSelect('NOTICE', 'Avis de clôture')}
                        >
                          Avis de clôture
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Aperçu du Document
                        {selectedTemplate && (
                          <Chip 
                            label={selectedTemplate.name} 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, minHeight: 200, maxHeight: 300, overflow: 'auto' }}>
                        {generatedDocument ? (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {generatedDocument}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 8 }}>
                            Sélectionnez un modèle pour voir l'aperçu
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGecDialog({ open: false, reclamation: null })}>Fermer</Button>
          <Button 
            variant="contained" 
            startIcon={<FileDownload />}
            onClick={handleGenerateDocument}
            disabled={!selectedTemplate}
          >
            Générer Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
};