import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import ContractAssignment from '../../components/ContractAssignment';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { LocalAPI } from '../../services/axios';
import {
  fetchContracts,
  fetchContract,
  createContract,
  updateContract,
  deleteContract,
  uploadContractDocument,
  downloadContractDocument,
  fetchContractStatistics,
  fetchSLACompliance,
  exportContractsToExcel,
  fetchAvailableClients,
  fetchAvailableUsers
} from '../../services/contractService';
import { Contract, ContractStatistics, SLACompliance, CreateContractRequest, ContractSearchFilters } from '../../types/contract.d';
import '../../styles/contracts.css';

const ContractsPage: React.FC = () => {
  const { user } = useAuthContext();
  const { notify } = useNotification();

  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [statistics, setStatistics] = useState<ContractStatistics | null>(null);
  const [slaCompliance, setSlaCompliance] = useState<SLACompliance | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [mainTab, setMainTab] = useState(0);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [scanSLAIssues, setScanSLAIssues] = useState<any[]>([]);

  // Filters
  const [filters, setFilters] = useState<ContractSearchFilters>({
    status: 'all'
  });

  // Form state
  const [formData, setFormData] = useState<CreateContractRequest>({
    clientId: '',
    contractNumber: '',
    codeAssure: '',  // NEW: Code Assuré field
    treatmentDelay: 30,
    claimsReplyDelay: 48,
    paymentDelay: 30,
    warningThreshold: 25,
    criticalThreshold: 35,
    escalationChain: [],
    accountOwnerId: '',
    startDate: '',
    endDate: '',
    alertSettings: {
      emailNotifications: true,
      smsNotifications: false,
      escalationEnabled: true
    },
    notes: ''
  });

  const [contractFile, setContractFile] = useState<File | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedNewChef, setSelectedNewChef] = useState('');

  // Permissions
  const canManage = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE'].includes(user?.role || '');
  const canDelete = ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user?.role || '');

  // Load data
  useEffect(() => {
    loadContracts();
    loadStatistics();
    loadAvailableData();
    loadScanSLAIssues();
  }, [filters]);

  const loadScanSLAIssues = async () => {
    try {
      const { data } = await LocalAPI.get('/scan-sla/issues');
      setScanSLAIssues(data || []);
    } catch (error) {
      console.error('Error loading SCAN SLA issues:', error);
    }
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await fetchContracts(filters);
      setContracts(data);
    } catch (error) {
      notify('Erreur lors du chargement des contrats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await fetchContractStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadAvailableData = async () => {
    try {
      const [clients, users] = await Promise.all([
        fetchAvailableClients(),
        LocalAPI.get('/users').then(res => res.data)
      ]);
      setAvailableClients(clients);
      setAvailableUsers(users);
      console.log('Available users loaded:', users);
    } catch (error) {
      console.error('Error loading available data:', error);
    }
  };

  const loadSLACompliance = async (contractId: string) => {
    try {
      const compliance = await fetchSLACompliance(contractId);
      setSlaCompliance(compliance);
    } catch (error) {
      console.error('Error loading SLA compliance:', error);
    }
  };

  // Handlers
  const handleCreateContract = () => {
    setEditingContract(null);
    setFormData({
      clientId: '',
      contractNumber: '',
      codeAssure: '',  // NEW: Code Assuré field
      treatmentDelay: 30,
      claimsReplyDelay: 48,
      paymentDelay: 30,
      warningThreshold: 25,
      criticalThreshold: 35,
      escalationChain: [],
      accountOwnerId: '', // user?.id || '',
      startDate: '',
      endDate: '',
      alertSettings: {
        emailNotifications: true,
        smsNotifications: false,
        escalationEnabled: true
      },
      notes: ''
    });
    setContractFile(null);
    setShowForm(true);
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      clientId: contract.clientId,
      contractNumber: contract.clientName,
      codeAssure: contract.codeAssure || '',  // NEW: Code Assuré field
      treatmentDelay: contract.delaiReglement,
      claimsReplyDelay: contract.delaiReclamation,
      paymentDelay: contract.delaiReglement,
      warningThreshold: contract.escalationThreshold,
      criticalThreshold: contract.escalationThreshold,
      escalationChain: [],
      accountOwnerId: contract.assignedManagerId,
      startDate: contract.startDate.split('T')[0],
      endDate: contract.endDate.split('T')[0],
      alertSettings: {
        emailNotifications: true,
        smsNotifications: false,
        escalationEnabled: true
      },
      notes: contract.signature || ''
    });
    setContractFile(null);
    setShowForm(true);
  };

  const handleSubmitContract = async () => {
    // Validation
    if (!formData.clientId) {
      notify('Veuillez sélectionner un client', 'error');
      return;
    }
    if (!formData.contractNumber) {
      notify('Veuillez saisir un numéro de contrat', 'error');
      return;
    }
    // Auto-assign current user as account owner
    // if (!formData.accountOwnerId && user?.id) {
    //   formData.accountOwnerId = user.id;
    // }
    // if (!formData.accountOwnerId) {
    //   notify('Erreur: utilisateur non identifié', 'error');
    //   return;
    // }
    if (!formData.startDate) {
      notify('Veuillez saisir une date de début', 'error');
      return;
    }
    if (!formData.endDate) {
      notify('Veuillez saisir une date de fin', 'error');
      return;
    }
    
    try {
      if (editingContract) {
        await updateContract(editingContract.id, formData);
        notify('Contrat modifié avec succès', 'success');
      } else {
        await createContract(formData, contractFile || undefined);
        notify('Contrat créé avec succès', 'success');
      }
      setShowForm(false);
      loadContracts();
      loadStatistics();
    } catch (error: any) {
      console.error('Contract submission error:', error);
      notify(error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) return;
    
    try {
      await deleteContract(id);
      notify('Contrat supprimé avec succès', 'success');
      loadContracts();
      loadStatistics();
      if (selectedContract?.id === id) {
        setSelectedContract(null);
      }
    } catch (error) {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract);
    setActiveTab(0);
    await loadSLACompliance(contract.id);
  };

  const handleExport = async () => {
    try {
      const blob = await exportContractsToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracts-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify('Export réussi', 'success');
    } catch (error) {
      notify('Erreur lors de l\'export', 'error');
    }
  };

  const getStatusColor = (contract: Contract) => {
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (endDate < now) return 'error';
    if (endDate <= soon) return 'warning';
    return 'success';
  };

  const getStatusLabel = (contract: Contract) => {
    const now = new Date();
    const endDate = new Date(contract.endDate);
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (endDate < now) return 'Expiré';
    if (endDate <= soon) return 'Expire bientôt';
    return 'Actif';
  };

  return (
    <div className="contracts-module">
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'primary.main' }}>
            📋 Module Contrats
          </Typography>
        </Box>
        
        {/* Main Tabs */}
        <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Liste des Contrats" />
          <Tab label="Affectation aux Équipes" />
        </Tabs>
      </Paper>

      {mainTab === 0 && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExport}
                >
                  Exporter
                </Button>
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateContract}
                  >
                    Nouveau Contrat
                  </Button>
                )}
              </Box>
            </Box>

        {/* Statistics */}
        {statistics && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">{statistics.total}</Typography>
                  <Typography variant="body2">Total</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{statistics.active}</Typography>
                  <Typography variant="body2">Actifs</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">{statistics.expired}</Typography>
                  <Typography variant="body2">Expirés</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">{statistics.expiringSoon}</Typography>
                  <Typography variant="body2">Expirent bientôt</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">{statistics.withDocuments}</Typography>
                  <Typography variant="body2">Avec documents</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary.main">{statistics.documentCoverage.toFixed(1)}%</Typography>
                  <Typography variant="body2">Couverture docs</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Box mt={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={availableClients}
                getOptionLabel={(option) => option.name || ''}
                value={availableClients.find(c => c.id === filters.clientId) || null}
                onChange={(e, newValue) => setFilters({ ...filters, clientId: newValue?.id || undefined })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Client"
                    size="small"
                    placeholder="Rechercher un client..."
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText="Aucun client trouvé"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Numéro de contrat"
                value={filters.contractNumber || ''}
                onChange={(e) => setFilters({ ...filters, contractNumber: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status || 'all'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  label="Statut"
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="active">Actifs</MenuItem>
                  <MenuItem value="expired">Expirés</MenuItem>
                  <MenuItem value="expiring_soon">Expirent bientôt</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Avec document</InputLabel>
                <Select
                  value={filters.hasDocument === undefined ? 'all' : filters.hasDocument.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({ 
                      ...filters, 
                      hasDocument: value === 'all' ? undefined : value === 'true'
                    });
                  }}
                  label="Avec document"
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="true">Avec document</MenuItem>
                  <MenuItem value="false">Sans document</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Contracts List */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ height: 'calc(100vh - 400px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box p={2} borderBottom={1} borderColor="divider">
              <Typography variant="h6">
                Contrats ({contracts.length})
              </Typography>
            </Box>
            
            <Box flex={1} overflow="auto">
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Alerte SCAN</TableCell>
                      <TableCell>Numéro</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Chef d'équipe</TableCell>
                      <TableCell>Période</TableCell>
                      <TableCell>SLA</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contracts.map((contract) => {
                      // Check if this contract has SCAN SLA issues
                      const hasScanIssues = scanSLAIssues.some((issue: any) => 
                        issue.client?.id === contract.clientId
                      );
                      const scanIssue = scanSLAIssues.find((issue: any) => 
                        issue.client?.id === contract.clientId
                      );
                      
                      return (
                      <TableRow 
                        key={contract.id}
                        hover
                        selected={selectedContract?.id === contract.id}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleViewContract(contract)}
                      >
                        <TableCell>
                          {hasScanIssues && scanIssue?.scanSLA ? (
                            <Tooltip title={`${scanIssue.scanSLA.daysElapsed} jours écoulés - ${scanIssue.scanSLA.status}`}>
                              <span style={{ fontSize: '20px', cursor: 'pointer' }}>
                                {scanIssue.scanSLA.status === 'CRITICAL' ? '🔴' : '🟠'}
                              </span>
                            </Tooltip>
                          ) : (
                            <span style={{ fontSize: '16px', opacity: 0.3 }}>🟢</span>
                          )}
                        </TableCell>
                        <TableCell>{contract.clientName}</TableCell>
                        <TableCell>{contract.client?.name}</TableCell>
                        <TableCell>{contract.teamLeader?.fullName || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Chip size="small" label={`R:${contract.delaiReglement}j`} />
                            <Chip size="small" label={`C:${contract.delaiReclamation}j`} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getStatusLabel(contract)}
                            color={getStatusColor(contract)}
                            icon={
                              getStatusColor(contract) === 'success' ? <CheckIcon /> :
                              getStatusColor(contract) === 'warning' ? <WarningIcon /> : <ErrorIcon />
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="Voir">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewContract(contract); }}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {canManage && (
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditContract(contract); }}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Supprimer">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteContract(contract.id); }}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Paper>
        </Grid>


      </Grid>

      {/* Contract Form Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingContract ? 'Modifier le contrat' : 'Nouveau contrat'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  label="Client"
                >
                  {availableClients.map(client => (
                    <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numéro de contrat"
                value={formData.contractNumber}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                required
              />
            </Grid>
            
            {/* NEW: Code Assuré field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Code Assuré *"
                value={formData.codeAssure || ''}
                onChange={(e) => setFormData({ ...formData, codeAssure: e.target.value })}
                placeholder="Ex: CA-BTL-001"
                required
                helperText="Ce code sera utilisé pour auto-remplir le champ lors de l'ajout d'adhérents"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Délai de traitement (jours)"
                type="number"
                value={formData.treatmentDelay}
                onChange={(e) => setFormData({ ...formData, treatmentDelay: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Délai réclamations (jours)"
                type="number"
                value={formData.claimsReplyDelay}
                onChange={(e) => setFormData({ ...formData, claimsReplyDelay: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Délai paiement (jours)"
                type="number"
                value={formData.paymentDelay}
                onChange={(e) => setFormData({ ...formData, paymentDelay: parseInt(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Seuil d'avertissement (jours)"
                type="number"
                value={formData.warningThreshold}
                onChange={(e) => setFormData({ ...formData, warningThreshold: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Seuil critique (jours)"
                type="number"
                value={formData.criticalThreshold}
                onChange={(e) => setFormData({ ...formData, criticalThreshold: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            {/* <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Chargé de compte</InputLabel>
                <Select
                  value={formData.accountOwnerId}
                  onChange={(e) => setFormData({ ...formData, accountOwnerId: e.target.value })}
                  label="Chargé de compte"
                >
                  {availableUsers.map(user => (
                    <MenuItem key={user.id} value={user.id}>{user.fullName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chargé de compte"
                value={user?.fullName || ''}
                disabled
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid> */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de début"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de fin"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {contractFile ? contractFile.name : 'Télécharger le contrat PDF'}
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>Annuler</Button>
          <Button onClick={handleSubmitContract} variant="contained">
            {editingContract ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contract Details Modal */}
      {selectedContract && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '95vw',
            maxHeight: '95vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              right: 0,
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: 'white',
              borderRadius: '12px 12px 0 0',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <Typography variant="h6">
                Contrat {selectedContract.clientName}
              </Typography>
              <button 
                onClick={() => setSelectedContract(null)}
                style={{
                  border: 'none',
                  background: '#ff4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '0 24px' }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Aperçu" />
                <Tab label="Documents" />
                <Tab label="Associations" />
                <Tab label="SLA" />
              </Tabs>
            </div>

            <div style={{ padding: '24px', minHeight: '400px' }}>
              {activeTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Informations générales</Typography>
                    <Typography><strong>Client:</strong> {selectedContract.client?.name}</Typography>
                    <Typography>
                      <strong>Code Assuré:</strong>{' '}
                      <Box 
                        component="span" 
                        sx={{ 
                          bgcolor: '#fff3cd', 
                          color: '#856404',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 600,
                          border: '1px solid #ffc107'
                        }}
                      >
                        {selectedContract.codeAssure || 'N/A'}
                      </Box>
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <Typography><strong>Chef d'équipe:</strong> {selectedContract.teamLeader?.fullName || 'N/A'}</Typography>
                      {canManage && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedNewChef('');
                            setShowReassignDialog(true);
                          }}
                        >
                          Réaffecter
                        </Button>
                      )}
                    </Box>
                    <Typography><strong>Période:</strong> {new Date(selectedContract.startDate).toLocaleDateString()} - {new Date(selectedContract.endDate).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>SLA</Typography>
                    <Typography><strong>Délai de règlement:</strong> {selectedContract.delaiReglement} jours</Typography>
                    <Typography><strong>Délai de réclamation:</strong> {selectedContract.delaiReclamation} jours</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Seuils d'alerte</Typography>
                    <Typography><strong>Seuil d'escalade:</strong> {selectedContract.escalationThreshold} jours</Typography>
                  </Grid>
                </Grid>
              )}

              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>Documents du contrat</Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {selectedContract.documentPath && selectedContract.documentPath !== '' ? (
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography>Document PDF disponible</Typography>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={async () => {
                            try {
                              const blob = await downloadContractDocument(selectedContract.id);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `contract-${selectedContract.clientName}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              notify('Téléchargement réussi', 'success');
                            } catch (error) {
                              console.error('Download error:', error);
                              notify('Aucun document disponible pour ce contrat', 'warning');
                            }
                          }}
                        >
                          Télécharger
                        </Button>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">Aucun document disponible</Typography>
                    )}
                    
                    {canManage && (
                      <Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          component="label"
                        >
                          Téléverser un document
                          <input
                            type="file"
                            hidden
                            accept=".pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  await uploadContractDocument(selectedContract.id, file);
                                  notify('Document téléversé avec succès', 'success');
                                  // Reload contract data
                                  const updatedContract = await fetchContract(selectedContract.id);
                                  setSelectedContract(updatedContract);
                                } catch (error) {
                                  notify('Erreur lors du téléversement', 'error');
                                }
                              }
                            }}
                          />
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>Associations</Typography>
                  <Typography><strong>Bordereaux associés:</strong> 0</Typography>
                  <Typography><strong>Réclamations associées:</strong> 0</Typography>
                </Box>
              )}

              {activeTab === 3 && slaCompliance && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Conformité SLA
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">Conformes</Typography>
                          <Typography variant="h4" color="success.main">{slaCompliance.compliant}</Typography>
                          <Typography variant="caption">≤ 80% du délai</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">À risque</Typography>
                          <Typography variant="h4" color="warning.main">{slaCompliance.atRisk}</Typography>
                          <Typography variant="caption">80-100% du délai</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">En dépassement</Typography>
                          <Typography variant="h4" color="error.main">{slaCompliance.breach}</Typography>
                          <Typography variant="caption">&gt; 100% du délai</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">Taux de conformité</Typography>
                          <Typography variant="h4" color="primary.main">{slaCompliance.complianceRate.toFixed(1)}%</Typography>
                          <Typography variant="caption">Objectif: ≥ 90%</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
      
      {mainTab === 1 && (
        <ContractAssignment />
      )}

      {/* Reassign Chef Dialog */}
      <Dialog 
        open={showReassignDialog} 
        onClose={() => setShowReassignDialog(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ zIndex: 10001 }}
        disablePortal={false}
      >
        <DialogTitle>Réaffecter le contrat à un autre Chef d'équipe</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Chef actuel: {selectedContract?.teamLeader?.fullName || 'Aucun'}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Nouveau Chef d'équipe</InputLabel>
              <Select
                value={selectedNewChef}
                onChange={(e) => setSelectedNewChef(e.target.value)}
                label="Nouveau Chef d'équipe"
                MenuProps={{
                  style: { zIndex: 10002 }
                }}
              >
                {availableUsers
                  .filter(u => u.role === 'CHEF_EQUIPE' && u.id !== selectedContract?.teamLeader?.id)
                  .map(chef => (
                    <MenuItem key={chef.id} value={chef.id}>
                      {chef.fullName} ({chef.email})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {availableUsers.filter(u => u.role === 'CHEF_EQUIPE').length === 0 && (
              <Typography variant="body2" color="error" mt={1}>
                Aucun Chef d'équipe disponible
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReassignDialog(false)}>Annuler</Button>
          <Button 
            onClick={async () => {
              if (!selectedContract) {
                notify('Aucun contrat sélectionné', 'error');
                return;
              }
              if (!selectedNewChef) {
                notify('Veuillez sélectionner un chef d\'équipe', 'error');
                return;
              }
              try {
                await LocalAPI.post(`/contracts/${selectedContract.id}/reassign-chef`, { newChefId: selectedNewChef });
                notify('Chef d\'équipe réaffecté avec succès', 'success');
                const updated = await fetchContract(selectedContract.id);
                setSelectedContract(updated);
                loadContracts();
                setShowReassignDialog(false);
              } catch (error: any) {
                notify(error.response?.data?.message || 'Erreur lors de la réaffectation', 'error');
              }
            }}
            variant="contained"
          >
            Réaffecter
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ContractsPage;