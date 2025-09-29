import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import corbeilleService, { CorbeilleResponse } from '../../services/corbeilleService';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import SlaCountdown from './SlaCountdown';
import BulkAssignmentModal from './BulkAssignmentModal';
import ExcelImportModal from './ExcelImportModal';
import CreateReclamationModal from './CreateReclamationModal';
import OutlookEmailMonitoring from './OutlookEmailMonitoring';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Checkbox, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import { Assignment, Warning, CheckCircle, Schedule, TrendingUp, Person, Business, CalendarToday, Description, Close } from '@mui/icons-material';

interface ReclamationCorbeilleItem {
  id: string;
  type: 'reclamation';
  reference: string;
  clientName: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
  assignedTo?: string;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number;
}

interface CorbeilleStats {
  nonAffectes: number;
  enCours: number;
  traites: number;
  enRetard: number;
  critiques: number;
}

const fetchChefCorbeille = async (): Promise<CorbeilleResponse> => {
  return await corbeilleService.getReclamationsChefCorbeille();
};

const fetchUsers = async () => {
  return await corbeilleService.getAvailableGestionnaires();
};

const fetchReclamationDetails = async (id: string) => {
  const { data } = await LocalAPI.get(`/reclamations/${id}`);
  return data;
};

const bulkAssign = async (payload: { reclamationIds: string[]; assignedToId: string }) => {
  return await corbeilleService.bulkAssignReclamations(payload.reclamationIds, payload.assignedToId);
};

const updateReclamationStatus = async (payload: { id: string; status: string; assignedToId?: string }) => {
  const { data } = await LocalAPI.patch(`/reclamations/${payload.id}`, {
    status: payload.status,
    assignedToId: payload.assignedToId
  });
  return data;
};

const escalateReclamation = async (id: string) => {
  const { data } = await LocalAPI.patch(`/reclamations/${id}/escalate`);
  return data;
};

export const ChefCorbeille: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReclamationId, setSelectedReclamationId] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'reassign' | 'escalate' | 'resolve' | null>(null);
  const [selectedItemForAction, setSelectedItemForAction] = useState<string | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [createReclamationOpen, setCreateReclamationOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error, refetch } = useQuery(
    ['chef-corbeille'],
    fetchChefCorbeille,
    { 
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 3,
      retryDelay: 1000,
      staleTime: 10000, // Consider data stale after 10 seconds
    }
  );

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery(
    ['gestionnaires'], 
    fetchUsers,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2
    }
  );

  const { data: reclamationDetails, isLoading: detailsLoading } = useQuery(
    ['reclamation-details', selectedReclamationId],
    () => fetchReclamationDetails(selectedReclamationId!),
    {
      enabled: !!selectedReclamationId,
      retry: 2
    }
  );

  const assignMutation = useMutation(bulkAssign, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chef-corbeille']);
      setSelectedItems([]);
      setAssignModalOpen(false);
      setSelectedAssignee('');
      console.log(`${data.assigned || selectedItems.length} réclamations assignées avec succès`);
    },
    onError: (error) => {
      console.error('Erreur lors de l\'assignation:', error);
    }
  });

  const statusMutation = useMutation(updateReclamationStatus, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      setActionModalOpen(false);
      setSelectedAction(null);
      setSelectedItemForAction(null);
      setSelectedAssignee('');
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
    }
  });

  const escalateMutation = useMutation(escalateReclamation, {
    onSuccess: () => {
      queryClient.invalidateQueries(['chef-corbeille']);
      setActionModalOpen(false);
      setSelectedAction(null);
      setSelectedItemForAction(null);
    },
    onError: (error) => {
      console.error('Erreur lors de l\'escalade:', error);
    }
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <div>
          <Typography variant="h6" gutterBottom>Chargement de la corbeille...</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </Box>
        </div>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement de la corbeille</Typography>
        <Typography variant="body2">
          {error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement des données'}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={() => refetch()}
          >
            Réessayer
          </Button>
          <Button 
            variant="text" 
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </Button>
        </Box>
      </Alert>
    );
  }

  const { nonAffectes = [], enCours = [], traites = [], stats } = corbeilleData || {};

  const handleSelectAll = (items: ReclamationCorbeilleItem[]) => {
    const itemIds = items.map(item => item.id);
    if (selectedItems.length === itemIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(itemIds);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleBulkAssign = () => {
    if (selectedItems.length === 0 || !selectedAssignee) return;
    assignMutation.mutate({
      reclamationIds: selectedItems,
      assignedToId: selectedAssignee
    });
  };

  const handleViewDetails = (itemId: string) => {
    setSelectedReclamationId(itemId);
    setDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedReclamationId(null);
  };

  const handleAction = (itemId: string, action: 'reassign' | 'escalate' | 'resolve') => {
    setSelectedItemForAction(itemId);
    setSelectedAction(action);
    setSelectedAssignee(''); // Reset assignee selection
    setActionModalOpen(true);
  };

  const handleExecuteAction = () => {
    if (!selectedItemForAction || !selectedAction) return;

    switch (selectedAction) {
      case 'reassign':
        if (selectedAssignee) {
          statusMutation.mutate({
            id: selectedItemForAction,
            status: 'IN_PROGRESS',
            assignedToId: selectedAssignee
          });
        }
        break;
      case 'escalate':
        escalateMutation.mutate(selectedItemForAction);
        break;
      case 'resolve':
        statusMutation.mutate({
          id: selectedItemForAction,
          status: 'RESOLVED'
        });
        break;
    }
  };

  const getSLAColor = (slaStatus: string) => {
    return corbeilleService.getSLAColor(slaStatus);
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Non Affectés
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.nonAffectes || 0}
                </Typography>
              </Box>
              <Assignment color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats?.enCours || 0}
                </Typography>
              </Box>
              <Schedule color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Traités
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats?.traites || 0}
                </Typography>
              </Box>
              <CheckCircle color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Retard
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats?.enRetard || 0}
                </Typography>
              </Box>
              <Warning color="error" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Critiques
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats?.critiques || 0}
                </Typography>
              </Box>
              <TrendingUp color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTable = (items: ReclamationCorbeilleItem[], showAssignee = false, showActions = false) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
                onChange={() => handleSelectAll(items)}
              />
            </TableCell>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Objet</TableCell>
            <TableCell>Priorité</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>SLA</TableCell>
            <TableCell>Date</TableCell>
            {showAssignee && <TableCell>Assigné à</TableCell>}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                />
              </TableCell>
              <TableCell>{item.reference}</TableCell>
              <TableCell>{item.clientName}</TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                  {item.subject}
                </Typography>
              </TableCell>
              <TableCell>
                <PriorityBadge severity={item.priority as any} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status as any} />
              </TableCell>
              <TableCell>
                <Chip
                  label={`${item.remainingTime}h`}
                  color={getSLAColor(item.slaStatus) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              {showAssignee && (
                <TableCell>{item.assignedTo || '-'}</TableCell>
              )}
              <TableCell>
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleViewDetails(item.id)}
                  >
                    Voir
                  </Button>
                  {showActions && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleAction(item.id, 'escalate')}
                        disabled={item.status === 'ESCALATED'}
                      >
                        Escalader
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        onClick={() => handleAction(item.id, 'reassign')}
                      >
                        Réassigner
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleAction(item.id, 'resolve')}
                      >
                        Résoudre
                      </Button>
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="chef-corbeille p-4">
      {/* Outlook Email Monitoring */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <OutlookEmailMonitoring />
        </CardContent>
      </Card>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
        sx={{ 
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        <Typography 
          variant="h4"
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            minWidth: 0,
            wordBreak: 'break-word'
          }}
        >
          Corbeille Chef d'Équipe - Gestion de l'Équipe
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button 
            variant="contained"
            color="primary"
            onClick={() => setCreateReclamationOpen(true)}
            size="small"
          >
            Créer Réclamation
          </Button>
          <Button 
            variant="outlined"
            onClick={() => setExcelImportOpen(true)}
            size="small"
          >
            Import Excel
          </Button>
          {/* <Button
            variant="contained"
            onClick={() => setBulkAssignOpen(true)}
            size="small"
            disabled={!nonAffectes || nonAffectes.length === 0}
          >
            Affectation en Lot
          </Button> */}
          <Button 
            variant="outlined" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {(stats?.enRetard || 0) > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {stats?.enRetard || 0} réclamations en retard SLA
        </Alert>
      )}

      {(stats?.critiques || 0) > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Urgent:</strong> {stats?.critiques || 0} réclamations critiques
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {selectedItems.length} élément(s) sélectionné(s)
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              onClick={() => setAssignModalOpen(true)}
              disabled={selectedItems.length === 0}
            >
              Assigner en lot
            </Button>
            {activeTab === 1 && ( // En cours tab
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    selectedItems.forEach(id => {
                      escalateMutation.mutate(id);
                    });
                    setSelectedItems([]);
                  }}
                  disabled={selectedItems.length === 0 || escalateMutation.isLoading}
                >
                  Escalader sélection
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => {
                    selectedItems.forEach(id => {
                      statusMutation.mutate({ id, status: 'RESOLVED' });
                    });
                    setSelectedItems([]);
                  }}
                  disabled={selectedItems.length === 0 || statusMutation.isLoading}
                >
                  Résoudre sélection
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={`Non Affectés (${nonAffectes.length})`} />
          <Tab label={`En Cours (${enCours.length})`} />
          <Tab label={`Traités (${traites.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        nonAffectes.length > 0 ? renderTable(nonAffectes as ReclamationCorbeilleItem[]) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucune réclamation non affectée
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Toutes les réclamations ont été assignées
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 1 && (
        enCours.length > 0 ? renderTable(enCours as ReclamationCorbeilleItem[], true, true) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucune réclamation en cours
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 2 && (
        traites.length > 0 ? renderTable(traites as ReclamationCorbeilleItem[], true) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucune réclamation traitée
            </Typography>
          </Paper>
        )
      )}

      {/* Assignment Modal */}
      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)}>
        <DialogTitle>Assigner en lot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Assigner {selectedItems.length} réclamation(s) à :
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Gestionnaire</InputLabel>
            <Select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
            >
              {users.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)}>Annuler</Button>
          <Button
            onClick={handleBulkAssign}
            variant="contained"
            disabled={!selectedAssignee || assignMutation.isLoading}
          >
            {assignMutation.isLoading ? 'Attribution...' : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Modal */}
      <Dialog 
        open={detailsModalOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Détails de la réclamation
            </Typography>
            <Button onClick={handleCloseDetails}>
              <Close />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : reclamationDetails ? (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Informations générales
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><Business /></ListItemIcon>
                          <ListItemText 
                            primary="Client" 
                            secondary={reclamationDetails.client?.name || 'Non spécifié'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CalendarToday /></ListItemIcon>
                          <ListItemText 
                            primary="Date de création" 
                            secondary={new Date(reclamationDetails.createdAt).toLocaleString('fr-FR')} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Person /></ListItemIcon>
                          <ListItemText 
                            primary="Créé par" 
                            secondary={reclamationDetails.createdBy?.fullName || 'Non spécifié'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Assignment /></ListItemIcon>
                          <ListItemText 
                            primary="Assigné à" 
                            secondary={reclamationDetails.assignedTo?.fullName || 'Non assigné'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Statut et priorité
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Type" 
                            secondary={reclamationDetails.type || 'Non spécifié'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Gravité" 
                            secondary={<PriorityBadge severity={reclamationDetails.severity} />} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Statut" 
                            secondary={<StatusBadge status={reclamationDetails.status} />} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="SLA" 
                            secondary={
                              <SlaCountdown 
                                createdAt={reclamationDetails.createdAt}
                                slaDays={reclamationDetails.client?.reclamationDelay || reclamationDetails.contract?.delaiReclamation || 7}
                                status={reclamationDetails.status}
                                clientName={reclamationDetails.client?.name}
                              />
                            } 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Description
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {reclamationDetails.description || 'Aucune description disponible'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                {reclamationDetails.history && reclamationDetails.history.length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Historique
                        </Typography>
                        <List>
                          {reclamationDetails.history.slice(0, 5).map((event: any, index: number) => (
                            <React.Fragment key={event.id}>
                              <ListItem>
                                <ListItemText
                                  primary={event.action || 'Action'}
                                  secondary={
                                    <Box>
                                      <Typography variant="body2">
                                        {event.description || 'Aucune description'}
                                      </Typography>
                                      <Typography variant="caption" color="textSecondary">
                                        {new Date(event.createdAt).toLocaleString('fr-FR')} - {event.user?.fullName || 'Système'}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                              {index < reclamationDetails.history.length - 1 && <Divider />}
                            </React.Fragment>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <Alert severity="error">
              Impossible de charger les détails de la réclamation
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Fermer</Button>
          {reclamationDetails && !reclamationDetails.assignedTo && (
            <Button 
              variant="contained" 
              onClick={() => {
                setSelectedItems([selectedReclamationId!]);
                setDetailsModalOpen(false);
                setAssignModalOpen(true);
              }}
            >
              Assigner
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Action Modal */}
      <Dialog 
        open={actionModalOpen} 
        onClose={() => setActionModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: 200 }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedAction === 'reassign' && 'Réassigner la réclamation'}
              {selectedAction === 'escalate' && 'Escalader la réclamation'}
              {selectedAction === 'resolve' && 'Résoudre la réclamation'}
            </Typography>
            <Button onClick={() => setActionModalOpen(false)} size="small">
              <Close />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedAction === 'reassign' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Sélectionnez un nouveau gestionnaire pour cette réclamation :
              </Typography>
              
              {usersLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : usersError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Erreur lors du chargement des gestionnaires
                </Alert>
              ) : (
                <FormControl fullWidth>
                  <InputLabel id="gestionnaire-select-label">Gestionnaire</InputLabel>
                  <Select
                    labelId="gestionnaire-select-label"
                    value={selectedAssignee}
                    label="Gestionnaire"
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                  >
                    {users.length === 0 ? (
                      <MenuItem disabled>
                        <em>Aucun gestionnaire disponible</em>
                      </MenuItem>
                    ) : (
                      users.map((user: any) => (
                        <MenuItem key={user.id} value={user.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.fullName || user.name || 'Nom non disponible'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {user.email} - {user.role}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              )}
              
              {selectedAssignee && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    ℹ️ La réclamation sera assignée à {users.find((u: any) => u.id === selectedAssignee)?.fullName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          
          {selectedAction === 'escalate' && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Cette réclamation sera escaladée vers le niveau supérieur.
                </Typography>
              </Alert>
              <Typography variant="body2">
                Êtes-vous sûr de vouloir continuer ?
              </Typography>
            </Box>
          )}
          
          {selectedAction === 'resolve' && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Cette réclamation sera marquée comme résolue.
                </Typography>
              </Alert>
              <Typography variant="body2">
                Êtes-vous sûr de vouloir continuer ?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setActionModalOpen(false)}
            variant="outlined"
          >
            Annuler
          </Button>
          <Button
            onClick={handleExecuteAction}
            variant="contained"
            disabled={
              (selectedAction === 'reassign' && (!selectedAssignee || usersLoading)) ||
              statusMutation.isLoading ||
              escalateMutation.isLoading
            }
            color={
              selectedAction === 'escalate' ? 'warning' :
              selectedAction === 'resolve' ? 'success' : 'primary'
            }
          >
            {(statusMutation.isLoading || escalateMutation.isLoading) ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} color="inherit" />
                Traitement...
              </Box>
            ) : (
              'Confirmer'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assignment Modal */}
      <BulkAssignmentModal
        open={bulkAssignOpen}
        onClose={() => setBulkAssignOpen(false)}
        reclamations={nonAffectes || []}
        onAssignmentComplete={() => {
          setBulkAssignOpen(false);
          refetch();
        }}
      />
      
      {/* Create Reclamation Modal */}
      <CreateReclamationModal
        open={createReclamationOpen}
        onClose={() => setCreateReclamationOpen(false)}
        onReclamationCreated={() => {
          setCreateReclamationOpen(false);
          refetch();
        }}
      />
      
      {/* Excel Import Modal */}
      <ExcelImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        onImportComplete={() => {
          setExcelImportOpen(false);
          refetch();
        }}
      />
    </div>
  );
};

export default ChefCorbeille;