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
  TablePagination,
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Autocomplete,
  TableContainer,
  Stack
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
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Groups as GroupsIcon
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
//import '../../styles/contracts.css';

// ─── Shared table cell styles ─────────────────────────────────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.8,
  px: 1.5,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

const ContractsPage: React.FC = () => {
  const { user } = useAuthContext();
  const { notify } = useNotification();

  // ── State (unchanged) ──────────────────────────────────────────────────────
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [filters, setFilters] = useState<ContractSearchFilters>({ status: 'all' });

  const [formData, setFormData] = useState<CreateContractRequest>({
    clientId: '',
    contractNumber: '',
    codeAssure: '',
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

  // ── Permissions (unchanged) ────────────────────────────────────────────────
  const canManage = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE'].includes(user?.role || '');
  const canDelete = ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user?.role || '');

  // ── Data loading (unchanged) ───────────────────────────────────────────────
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

  // ── Handlers (unchanged) ───────────────────────────────────────────────────
  const handleCreateContract = () => {
    setEditingContract(null);
    setFormData({
      clientId: '',
      contractNumber: '',
      codeAssure: '',
      treatmentDelay: 30,
      claimsReplyDelay: 48,
      paymentDelay: 30,
      warningThreshold: 25,
      criticalThreshold: 35,
      escalationChain: [],
      accountOwnerId: '',
      startDate: '',
      endDate: '',
      alertSettings: { emailNotifications: true, smsNotifications: false, escalationEnabled: true },
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
      codeAssure: contract.codeAssure || '',
      treatmentDelay: contract.delaiReglement,
      claimsReplyDelay: contract.delaiReclamation,
      paymentDelay: contract.delaiReglement,
      warningThreshold: contract.escalationThreshold,
      criticalThreshold: contract.escalationThreshold,
      escalationChain: [],
      accountOwnerId: contract.assignedManagerId,
      startDate: contract.startDate.split('T')[0],
      endDate: contract.endDate.split('T')[0],
      alertSettings: { emailNotifications: true, smsNotifications: false, escalationEnabled: true },
      notes: contract.signature || ''
    });
    setContractFile(null);
    setShowForm(true);
  };

  const handleSubmitContract = async () => {
    if (!formData.clientId) { notify('Veuillez sélectionner un client', 'error'); return; }
    if (!formData.contractNumber) { notify('Veuillez saisir un numéro de contrat', 'error'); return; }
    if (!formData.startDate) { notify('Veuillez saisir une date de début', 'error'); return; }
    if (!formData.endDate) { notify('Veuillez saisir une date de fin', 'error'); return; }

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
      if (selectedContract?.id === id) setSelectedContract(null);
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
      notify("Erreur lors de l'export", 'error');
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

  // ── Stat card helper ──────────────────────────────────────────────────────
  const StatCard = ({ label, value, accent }: { label: string; value: string | number; accent: string }) => (
    <Card elevation={0} sx={{
      border: '1px solid rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${accent}`,
      borderRadius: 2,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant="caption" sx={{
          fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 0.5, color: 'text.secondary', display: 'block',
        }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: accent, lineHeight: 1.3 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f4f7fb' }}>

      {/* ── Page Header ── */}
      <Box
        sx={{
          mb: 3, p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(30,58,95,0.18)',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5, color: '#ffffff' }}>
              📋 Module Contrats
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
              Gestion des contrats clients, SLA et affectations
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              sx={{
                color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 600,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Exporter
            </Button>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateContract}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                Nouveau Contrat
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {/* ── Main Tabs ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.10)', mb: 3, overflow: 'hidden' }}
      >
        <Box sx={{ borderBottom: '2px solid #e8edf5', bgcolor: '#fafbfc', px: 2 }}>
          <Tabs
            value={mainTab}
            onChange={(e, v) => setMainTab(v)}
            TabIndicatorProps={{ style: { backgroundColor: '#1e3a5f', height: 3, borderRadius: '3px 3px 0 0' } }}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600, fontSize: '0.82rem', textTransform: 'none',
                color: '#546e7a', minHeight: 48, px: 2.5,
                display: 'flex', flexDirection: 'row', gap: 1,
                '&.Mui-selected': { color: '#1e3a5f' },
              },
            }}
          >
            <Tab icon={<AssignmentIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Liste des Contrats" />
            <Tab icon={<GroupsIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Affectation aux Équipes" />
          </Tabs>
        </Box>

        {/* ── Tab 0: Contracts list ── */}
        {mainTab === 0 && (
          <Box sx={{ p: 3 }}>

            {/* ── Stat Cards ── */}
            {statistics && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Total" value={statistics.total} accent="#1e3a5f" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Actifs" value={statistics.active} accent="#2e7d32" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Expirés" value={statistics.expired} accent="#b71c1c" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Expirent bientôt" value={statistics.expiringSoon} accent="#e65100" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Avec documents" value={statistics.withDocuments} accent="#0d47a1" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard label="Couverture docs" value={`${statistics.documentCoverage.toFixed(1)}%`} accent="#6a1b9a" />
                </Grid>
              </Grid>
            )}

            {/* ── Filter Panel ── */}
            <Box sx={{
              p: 2, mb: 3,
              bgcolor: '#f0f4ff',
              border: '1px solid #d0dff5',
              borderRadius: 2,
            }}>
              <Typography variant="subtitle2" sx={{
                mb: 1.5, fontWeight: 700, color: '#1e3a5f',
                fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Filtres de Recherche
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Autocomplete
                    options={availableClients}
                    getOptionLabel={(option) => option.name || ''}
                    value={availableClients.find(c => c.id === filters.clientId) || null}
                    onChange={(e, newValue) => setFilters({ ...filters, clientId: newValue?.id || undefined })}
                    renderInput={(params) => (
                      <TextField {...params} label="Client" size="small" placeholder="Rechercher un client..." />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="Aucun client trouvé"
                    size="small"
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
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Avec document</InputLabel>
                    <Select
                      value={filters.hasDocument === undefined ? 'all' : filters.hasDocument.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters({ ...filters, hasDocument: value === 'all' ? undefined : value === 'true' });
                      }}
                      label="Avec document"
                    >
                      <MenuItem value="all">Tous</MenuItem>
                      <MenuItem value="true">Avec document</MenuItem>
                      <MenuItem value="false">Sans document</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => setFilters({ status: 'all' })}
                    sx={{ height: 40, fontWeight: 600 }}
                  >
                    Réinitialiser
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* ── Contracts Table Card ── */}
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
              <CardContent>
                <Box
                  display="flex" justifyContent="space-between" alignItems="center"
                  pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Contrats
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {contracts.length} contrat(s)
                  </Typography>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
                    <CircularProgress sx={{ color: '#1e3a5f' }} />
                    <Typography variant="body2" sx={{ ml: 2, color: '#546e7a' }}>Chargement...</Typography>
                  </Box>
                ) : contracts.length === 0 ? (
                  <Box sx={{
                    p: 5, textAlign: 'center',
                    bgcolor: '#f8faff', borderRadius: 2,
                    border: '1px dashed #c5d4e8',
                  }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Aucun contrat trouvé
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Modifiez les filtres ou créez un nouveau contrat
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{
                    borderRadius: 1.5,
                    border: '1px solid #dde3ef',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { height: 6, width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
                  }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center', width: 60 }}>Alerte SCAN</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Numéro</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Client</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Chef d'équipe</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>Période</TableCell>
                          <TableCell sx={HEAD_CELL_SX}>SLA</TableCell>
                          <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut</TableCell>
                          <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contracts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((contract, index) => {
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
                              onClick={() => handleViewContract(contract)}
                              sx={{
                                cursor: 'pointer',
                                backgroundColor: selectedContract?.id === contract.id
                                  ? '#e8f0fe'
                                  : index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                                '&:hover': { backgroundColor: '#e8f0fe' },
                                '&:last-child td': { borderBottom: 0 },
                              }}
                            >
                              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                                {hasScanIssues && scanIssue?.scanSLA ? (
                                  <Tooltip title={`${scanIssue.scanSLA.daysElapsed} jours écoulés — ${scanIssue.scanSLA.status}`}>
                                    <span style={{ fontSize: '18px', cursor: 'pointer' }}>
                                      {scanIssue.scanSLA.status === 'CRITICAL' ? '🔴' : '🟠'}
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <span style={{ fontSize: '16px', opacity: 0.3 }}>🟢</span>
                                )}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                {contract.clientName}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {contract.client?.name}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                                {contract.teamLeader?.fullName || (
                                  <Typography variant="caption" sx={{ color: '#90a4ae', fontStyle: 'italic' }}>Non affecté</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a', fontSize: '0.75rem' }}>
                                {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                                {' → '}
                                {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell sx={BODY_CELL_SX}>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }}>
                                  <Chip
                                    size="small"
                                    label={`R : ${contract.delaiReglement}j`}
                                    sx={{ fontSize: '0.68rem', bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 600 }}
                                  />
                                  <Chip
                                    size="small"
                                    label={`C : ${contract.delaiReclamation}j`}
                                    sx={{ fontSize: '0.68rem', bgcolor: '#fce4ec', color: '#880e4f', fontWeight: 600 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                                <Chip
                                  size="small"
                                  label={getStatusLabel(contract)}
                                  color={getStatusColor(contract)}
                                  icon={
                                    getStatusColor(contract) === 'success' ? <CheckIcon sx={{ fontSize: '0.9rem !important' }} /> :
                                    getStatusColor(contract) === 'warning' ? <WarningIcon sx={{ fontSize: '0.9rem !important' }} /> :
                                    <ErrorIcon sx={{ fontSize: '0.9rem !important' }} />
                                  }
                                  sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                                <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                                  <Tooltip title="Voir le contrat">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); handleViewContract(contract); }}
                                      sx={{ color: '#1e3a5f', '&:hover': { bgcolor: '#e8f0fe' }, p: 0.5 }}
                                    >
                                      <ViewIcon sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                  {canManage && (
                                    <Tooltip title="Modifier">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); handleEditContract(contract); }}
                                        sx={{ color: '#1565c0', '&:hover': { bgcolor: '#e3f2fd' }, p: 0.5 }}
                                      >
                                        <EditIcon sx={{ fontSize: '1rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canDelete && (
                                    <Tooltip title="Supprimer">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteContract(contract.id); }}
                                        sx={{ color: '#b71c1c', '&:hover': { bgcolor: '#fdecea' }, p: 0.5 }}
                                      >
                                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {contracts.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                    <TablePagination
                      component="div"
                      count={contracts.length}
                      page={page}
                      onPageChange={(e: any, newPage: number) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e: any) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[10, 20, 50, 100]}
                      labelRowsPerPage="Lignes par page:"
                      sx={{
                        '& .MuiTablePagination-selectLabel': { mb: 0 },
                        '& .MuiTablePagination-displayedRows': { mb: 0 },
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── Tab 1: Assignment ── */}
        {mainTab === 1 && (
          <Box sx={{ p: 3 }}>
            <ContractAssignment />
          </Box>
        )}
      </Paper>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTRACT FORM DIALOG — zero logic changes
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {editingContract ? '✏️ Modifier le contrat' : '➕ Nouveau contrat'}
          </Typography>
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

            {/* Code Assuré */}
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
              <Box
                component="label"
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  border: `2px dashed ${contractFile ? '#2e7d32' : '#1e3a5f'}`,
                  borderRadius: 1.5, p: 2, cursor: 'pointer',
                  bgcolor: contractFile ? '#e8f5e9' : '#f0f4ff',
                  color: contractFile ? '#2e7d32' : '#1e3a5f',
                  fontWeight: 600, fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 0.85 },
                }}
              >
                <UploadIcon />
                {contractFile ? `✅ ${contractFile.name}` : 'Télécharger le contrat PDF'}
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setShowForm(false)} variant="outlined">Annuler</Button>
          <Button
            onClick={handleSubmitContract}
            variant="contained"
            sx={{ fontWeight: 600, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' } }}
          >
            {editingContract ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTRACT DETAILS MODAL — zero logic changes, redesigned shell
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedContract && (
        <Box
          sx={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            bgcolor: 'rgba(0,0,0,0.65)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999, backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedContract(null); }}
        >
          <Box sx={{
            bgcolor: 'white',
            borderRadius: 2,
            width: { xs: '95vw', md: '75vw' },
            maxWidth: 900,
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          }}>
            {/* Modal header */}
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 3, py: 2,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)',
              color: '#fff',
              flexShrink: 0,
            }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedContract.clientName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  {selectedContract.client?.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={getStatusLabel(selectedContract)}
                  color={getStatusColor(selectedContract)}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
                <IconButton
                  onClick={() => setSelectedContract(null)}
                  size="small"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, ml: 0.5 }}
                >
                  ✕
                </IconButton>
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: '2px solid #e8edf5', bgcolor: '#fafbfc', px: 2, flexShrink: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                TabIndicatorProps={{ style: { backgroundColor: '#1e3a5f', height: 3 } }}
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600, fontSize: '0.80rem', textTransform: 'none',
                    color: '#546e7a', minHeight: 44,
                    '&.Mui-selected': { color: '#1e3a5f' },
                  },
                }}
              >
                <Tab label="Aperçu" />
                <Tab label="Documents" />
                <Tab label="Associations" />
                <Tab label="SLA" />
              </Tabs>
            </Box>

            {/* Tab content */}
            <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>

              {activeTab === 0 && (
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>
                        Informations générales
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>Client</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e3a5f' }}>{selectedContract.client?.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>Code Assuré</Typography>
                          <Box>
                            <Chip
                              label={selectedContract.codeAssure || 'N/A'}
                              size="small"
                              sx={{ bgcolor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', fontWeight: 700, fontFamily: 'monospace' }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>Chef d'équipe</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {selectedContract.teamLeader?.fullName || 'Non affecté'}
                            </Typography>
                            {canManage && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => { setSelectedNewChef(''); setShowReassignDialog(true); }}
                                sx={{ fontSize: '0.70rem', py: 0.2, px: 1, minWidth: 0, borderColor: '#1e3a5f', color: '#1e3a5f' }}
                              >
                                Réaffecter
                              </Button>
                            )}
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>Période</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#546e7a' }}>
                            {new Date(selectedContract.startDate).toLocaleDateString('fr-FR')}
                            {' → '}
                            {new Date(selectedContract.endDate).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>
                        SLA
                      </Typography>
                      <Typography variant="body2"><strong>Délai de règlement :</strong> {selectedContract.delaiReglement} jours</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Délai de réclamation :</strong> {selectedContract.delaiReclamation} jours</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>
                        Seuils d'alerte
                      </Typography>
                      <Typography variant="body2"><strong>Seuil d'escalade :</strong> {selectedContract.escalationThreshold} jours</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 2 }}>Documents du contrat</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedContract.documentPath && selectedContract.documentPath !== '' ? (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        p: 2, bgcolor: '#e8f5e9', borderRadius: 1.5, border: '1px solid #a5d6a7',
                      }}>
                        <Typography sx={{ fontWeight: 600, color: '#2e7d32' }}>✅ Document PDF disponible</Typography>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          variant="contained"
                          color="success"
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
                          sx={{ fontWeight: 600 }}
                        >
                          Télécharger
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{
                        p: 2, bgcolor: '#f8faff', borderRadius: 1.5,
                        border: '1px dashed #c5d4e8', textAlign: 'center',
                      }}>
                        <Typography color="text.secondary">Aucun document disponible</Typography>
                      </Box>
                    )}
                    {canManage && (
                      <Box
                        component="label"
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                          border: '2px dashed #1e3a5f', borderRadius: 1.5, p: 2,
                          cursor: 'pointer', bgcolor: '#f0f4ff', color: '#1e3a5f',
                          fontWeight: 600, fontSize: '0.85rem',
                          '&:hover': { opacity: 0.85 },
                        }}
                      >
                        <UploadIcon />
                        Téléverser un document PDF
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
                                const updatedContract = await fetchContract(selectedContract.id);
                                setSelectedContract(updatedContract);
                              } catch (error) {
                                notify('Erreur lors du téléversement', 'error');
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1.5 }}>Associations</Typography>
                  <Typography variant="body2"><strong>Bordereaux associés :</strong> 0</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Réclamations associées :</strong> 0</Typography>
                </Box>
              )}

              {activeTab === 3 && slaCompliance && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 2 }}>
                    Conformité SLA
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Conformes', value: slaCompliance.compliant, sub: '≤ 80% du délai', accent: '#2e7d32' },
                      { label: 'À risque', value: slaCompliance.atRisk, sub: '80-100% du délai', accent: '#e65100' },
                      { label: 'En dépassement', value: slaCompliance.breach, sub: '> 100% du délai', accent: '#b71c1c' },
                      { label: 'Taux de conformité', value: `${slaCompliance.complianceRate.toFixed(1)}%`, sub: 'Objectif : ≥ 90%', accent: '#1e3a5f' },
                    ].map(({ label, value, sub, accent }) => (
                      <Grid item xs={12} sm={6} md={3} key={label}>
                        <Box sx={{
                          p: 2, borderRadius: 2,
                          border: `1px solid ${accent}30`,
                          borderLeft: `4px solid ${accent}`,
                          bgcolor: `${accent}08`,
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            {label}
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: accent, lineHeight: 1.2 }}>{value}</Typography>
                          <Typography variant="caption" color="text.secondary">{sub}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REASSIGN DIALOG — zero logic changes
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showReassignDialog}
        onClose={() => setShowReassignDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 10001 }}
        disablePortal={false}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Réaffecter le contrat à un autre Chef d'équipe
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Chef actuel : <strong>{selectedContract?.teamLeader?.fullName || 'Aucun'}</strong>
              </Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Nouveau Chef d'équipe</InputLabel>
              <Select
                value={selectedNewChef}
                onChange={(e) => setSelectedNewChef(e.target.value)}
                label="Nouveau Chef d'équipe"
                MenuProps={{ style: { zIndex: 10002 } }}
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
              <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1.5 }}>
                Aucun Chef d'équipe disponible
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setShowReassignDialog(false)} variant="outlined">Annuler</Button>
          <Button
            onClick={async () => {
              if (!selectedContract) { notify('Aucun contrat sélectionné', 'error'); return; }
              if (!selectedNewChef) { notify("Veuillez sélectionner un chef d'équipe", 'error'); return; }
              try {
                await LocalAPI.post(`/contracts/${selectedContract.id}/reassign-chef`, { newChefId: selectedNewChef });
                notify("Chef d'équipe réaffecté avec succès", 'success');
                const updated = await fetchContract(selectedContract.id);
                setSelectedContract(updated);
                loadContracts();
                setShowReassignDialog(false);
              } catch (error: any) {
                notify(error.response?.data?.message || 'Erreur lors de la réaffectation', 'error');
              }
            }}
            variant="contained"
            sx={{ fontWeight: 600, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' } }}
          >
            Réaffecter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractsPage;