import React, { useState } from 'react';
import { useReclamations } from '../../hooks/useReclamations';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { FilterPanel } from './FilterPanel';
import { Pagination } from './Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Reclamation, ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI, AIAPI } from '../../services/axios';
import { ExportButtons } from './ExportButtons';
import { ReclamationAlerts } from './ReclamationAlerts';
import { SkeletonTable } from './SkeletonTable';
import SlaCountdown from './SlaCountdown';
import RealTimeAlerts from './RealTimeAlerts';
import ChefCorbeille from './ChefCorbeille';
import GestionnaireCorbeille from './GestionnaireCorbeille';
import BOReclamationForm from './BOReclamationForm';
import CreateReclamationModal from './CreateReclamationModal';
import ExcelImportModal from './ExcelImportModal';
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
  Snackbar,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Assignment,
  Description,
  Assessment,
  FileDownload,
  Close,
  Save,
  Email,
  Print,
  ListAlt,
  Add,
  UploadFile,
} from '@mui/icons-material';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Design tokens ────────────────────────────────────────────────────────────

const navy = '#1e3a5f';
const navyLight = '#f0f4ff';
const borderColor = '#e0e7ef';
const rowOdd = '#f4f7fb';
const rowHover = '#e8f0fe';

const tableHeaderSx = {
  backgroundColor: navy,
  '& .MuiTableCell-head': {
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.70rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderRight: `1px solid rgba(255,255,255,0.12)`,
    '&:last-child': { borderRight: 'none' },
    py: 1.5,
    px: 2,
    whiteSpace: 'nowrap',
  },
};

const tableBodyRowSx = (idx: number) => ({
  backgroundColor: idx % 2 === 0 ? '#ffffff' : rowOdd,
  '&:hover': { backgroundColor: rowHover },
  '& .MuiTableCell-body': {
    fontSize: '0.81rem',
    borderRight: `1px solid ${borderColor}`,
    '&:last-child': { borderRight: 'none' },
    py: 1,
    px: 2,
  },
});

const cardSx = {
  border: `1px solid ${borderColor}`,
  borderRadius: 2,
  boxShadow: 'none',
  transition: 'box-shadow 0.2s',
  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
};

const sectionHeaderSx = {
  fontWeight: 800,
  color: navy,
  fontSize: { xs: '1.25rem', md: '1.5rem' },
};

const labelSx = {
  variant: 'caption' as const,
  sx: {
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontWeight: 700,
    color: '#546e7a',
    fontSize: '0.68rem',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };
type User = { id: string; fullName: string; role?: UserRole };

// ─── Data fetchers ────────────────────────────────────────────────────────────

const fetchClients = async (): Promise<Client[]> => {
  const { data } = await LocalAPI.get<Client[]>('/clients');
  return data;
};

const fetchUsers = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [createReclamationOpen, setCreateReclamationOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState<{
    status: ReclamationStatus;
    description: string;
    assignedToId: string;
    conformite: string;
  }>({ status: 'OPEN', description: '', assignedToId: '', conformite: '' });

  const [assignForm, setAssignForm] = useState<{ assignedToId: string; comment: string }>({ assignedToId: '', comment: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<{ type: string; name: string; content: string } | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery<Client[]>(['clients'], fetchClients);
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>(['users'], fetchUsers);
  const { data, isLoading, error } = useReclamations({
    ...filters,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const types: string[] = React.useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      const uniqueTypes = [...new Set(data.map((r) => r.type).filter(Boolean))];
      return uniqueTypes.length > 0 ? uniqueTypes : ['REMBOURSEMENT', 'SERVICE', 'DELAI_TRAITEMENT', 'Autre'];
    }
    return ['REMBOURSEMENT', 'SERVICE', 'DELAI_TRAITEMENT', 'Autre'];
  }, [data]);

  const canAssign =
    user && (user.role === 'CHEF_EQUIPE' || user.role === 'SUPER_ADMIN' || user.role === 'CLIENT_SERVICE');

  // ── Mutations ──────────────────────────────────────────────────────────────

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
      onError: (err: any) => {
        setSnackbar({ open: true, message: `Erreur: ${err.response?.data?.message || err.message}`, severity: 'error' });
      },
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
      onError: (err: any) => {
        setSnackbar({ open: true, message: `Erreur: ${err.response?.data?.message || err.message}`, severity: 'error' });
      },
    }
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleView = (reclamation: Reclamation) => setViewDialog({ open: true, reclamation });

  const handleEdit = (reclamation: Reclamation) => {
    setEditForm({
      status: reclamation.status,
      description: reclamation.description,
      assignedToId: reclamation.assignedToId || '',
      conformite: reclamation.conformite || '',
    });
    setEditDialog({ open: true, reclamation });
  };

  const handleAssign = (reclamation: Reclamation) => {
    setAssignForm({ assignedToId: reclamation.assignedToId || '', comment: '' });
    setAssignDialog({ open: true, reclamation });
  };

  const handleEditSubmit = () => {
    if (editDialog.reclamation) {
      updateReclamationMutation.mutate({ id: editDialog.reclamation.id, data: editForm });
    }
  };

  const handleAssignSubmit = () => {
    if (assignDialog.reclamation && assignForm.assignedToId) {
      assignReclamationMutation.mutate({ id: assignDialog.reclamation.id, assignedToId: assignForm.assignedToId });
    }
  };

  const handleGec = (reclamation: Reclamation) => {
    setSelectedTemplate(null);
    setGeneratedDocument('');
    setGecDialog({ open: true, reclamation });
  };

  const handleTemplateSelect = (type: string, _name: string) => {
    const rec = gecDialog.reclamation;
    if (!rec) return;

    const templates: Record<string, { type: string; name: string; content: string }> = {
      EMAIL: {
        type: 'EMAIL',
        name: 'Email de confirmation',
        content: `Bonjour,\n\nNous accusons réception de votre réclamation concernant ${rec.type}.\n\nVotre dossier est en cours de traitement par nos équipes.\n\nNous vous tiendrons informé de l'avancement.\n\nCordialement,\nService Client ARS`,
      },
      LETTER: {
        type: 'LETTER',
        name: 'Lettre de relance',
        content: `Madame, Monsieur,\n\nNous vous informons que votre réclamation du ${new Date(rec.createdAt || '').toLocaleDateString('fr-FR')} nécessite votre attention.\n\nObjet: ${rec.type}\nDescription: ${rec.description}\n\nVeuillez nous contacter dans les plus brefs délais.\n\nCordialement,\nL'équipe ARS`,
      },
      NOTICE: {
        type: 'NOTICE',
        name: 'Avis de clôture',
        content: `AVIS DE CLÔTURE\n\nRéclamation N°: ${rec.id}\nClient: ${rec.client?.name}\nDate: ${new Date().toLocaleDateString('fr-FR')}\n\nNous vous informons que votre réclamation a été traitée et clôturée.\n\nRésolution: ${rec.description}\n\nSi vous avez des questions, n'hésitez pas à nous contacter.\n\nCordialement,\nL'équipe ARS`,
      },
    };

    const template = templates[type];
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
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors de la génération', severity: 'error' });
    }
  };

  const handleCorrelation = async () => {
    setCorrelationLoading(true);
    setCorrelationError(null);
    try {
      const validComplaints = Array.isArray(data) ? data.filter((c) => c && c.id) : [];
      if (!validComplaints.length) {
        setCorrelation({ correlations: [] });
        return;
      }
      localStorage.removeItem('ai_token');
      const payload = {
        complaints: validComplaints.map((c) => ({
          id: c.id,
          type: c.type,
          description: c.description,
          severity: c.severity,
        })),
      };
      const response = await AIAPI.post('/correlation', payload);
      setCorrelation(response.data);
    } catch (e: any) {
      setCorrelationError(e.response?.data?.message || e.message || "Erreur lors de l'analyse IA");
    } finally {
      setCorrelationLoading(false);
    }
  };

  // ── Early returns ──────────────────────────────────────────────────────────

  if (clientsLoading || usersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress size={32} sx={{ color: navy }} />
        <Typography variant="h6" color="text.secondary">
          Chargement des données…
        </Typography>
      </Box>
    );
  }

  if (clientsError || usersError) {
    return (
      <Alert severity="error" sx={{ m: 3, borderRadius: 2 }}>
        Erreur lors du chargement des utilisateurs ou clients.
      </Alert>
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
        <Typography variant="h4" gutterBottom sx={sectionHeaderSx}>
          Bureau d'Ordre — Réclamations
        </Typography>
        <BOReclamationForm onSuccess={() => window.location.reload()} />
        <RealTimeAlerts />
      </Container>
    );
  }

  const recCount = Array.isArray(data) ? data.length : 0;

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>

      {/* ── Page Header ── */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: `${navy}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ListAlt sx={{ color: navy, fontSize: 22 }} />
            </Box>
            <Typography sx={sectionHeaderSx}>Liste des Réclamations</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 7 }}>
            Gérez et consultez toutes les réclamations avec des outils d'analyse avancés
          </Typography>
        </Box>

        {(user?.role === 'SUPER_ADMIN' || user?.role === 'CHEF_EQUIPE') && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setCreateReclamationOpen(true)}
              sx={{
                backgroundColor: navy,
                '&:hover': { backgroundColor: '#15294a' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            >
              Créer
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFile />}
              onClick={() => setExcelImportOpen(true)}
              sx={{
                borderColor: navy,
                color: navy,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                '&:hover': { backgroundColor: navyLight, borderColor: navy },
              }}
            >
              Import Excel
            </Button>
          </Box>
        )}
      </Box>

      {/* ── Real-time Alerts ── */}
      <Box sx={{ mb: 2 }}>
        <RealTimeAlerts />
      </Box>

      {/* ── Alerts Card ── */}
      <Card sx={{ ...cardSx, mb: 2, borderLeft: `4px solid #f59e0b` }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Assessment sx={{ color: '#e65100', fontSize: 20 }} />
            <Typography variant="caption" sx={labelSx.sx}>
              Alertes & Notifications
            </Typography>
          </Box>
          <ReclamationAlerts />
        </CardContent>
      </Card>

      {/* ── Filters Card ── */}
      <Card
        sx={{
          ...cardSx,
          mb: 2,
          backgroundColor: navyLight,
          border: `1px solid #d0dff5`,
          borderLeft: `4px solid ${navy}`,
        }}
      >
        <CardContent sx={{ py: 2 }}>
          <Typography variant="caption" sx={{ ...labelSx.sx, display: 'block', mb: 1.5 }}>
            Filtres & Actions
          </Typography>

          <FilterPanel filters={filters} onChange={handleFilterChange} clients={clients} users={users} types={types} />

          <Divider sx={{ my: 2, borderColor }} />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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

      {/* ── Data Table Card ── */}
      <Card sx={{ ...cardSx, borderLeft: `4px solid #2196f3` }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <Typography variant="caption" sx={labelSx.sx}>
              Réclamations
            </Typography>
            <Chip
              label={`${recCount} résultat${recCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                backgroundColor: navyLight,
                color: navy,
                fontWeight: 700,
                fontSize: '0.70rem',
                height: 22,
              }}
            />
          </Box>

          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <SkeletonTable rows={8} cols={8} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2, borderRadius: 1.5 }}>
              Erreur: {String(error)}
            </Alert>
          ) : (
            <>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 0,
                  overflowX: 'auto',
                  maxHeight: '60vh',
                  // custom scrollbar using design tokens
                  '&::-webkit-scrollbar': { height: 8, width: 8 },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: '#cfd8dc', borderRadius: 6 },
                }}
              >
                <Table
                  size="small"
                  sx={{ minWidth: 900, borderCollapse: 'separate', tableLayout: 'fixed' }}
                >
                  <TableHead
                    sx={{
                      ...tableHeaderSx,
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <TableRow>
                      {['Client', 'Type', 'Typologie', 'N° Dossier', 'Contrat', 'Gravité', 'Date', 'SLA', 'Statut', 'Actions'].map(
                        (col, idx) => (
                          <TableCell
                            key={col}
                            sx={
                              // Hide some columns on small screens to improve readability
                              (idx === 2 || idx === 3 || idx === 4 || idx === 7)
                                ? { display: { xs: 'none', md: 'table-cell' } }
                                : undefined
                            }
                          >
                            {col}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(data) && data.length > 0 ? (
                      data.map((rec: Reclamation, idx: number) => (
                        <TableRow key={rec.id} sx={{ ...tableBodyRowSx(idx), '& .MuiTableCell-root': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color={navy} noWrap>
                              {rec.client?.name || clients.find((c) => c.id === rec.clientId)?.name || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={rec.type}
                              size="small"
                              sx={{
                                backgroundColor: navyLight,
                                color: navy,
                                border: `1px solid #d0dff5`,
                                fontWeight: 600,
                                fontSize: '0.70rem',
                                height: 20,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
                              {rec.typologie || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {rec.description?.match(/Numéro Dossier: ([^\n]+)/)?.[1] || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {rec.description?.match(/Contrat: ([^\n]+)/)?.[1] || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <PriorityBadge severity={rec.severity} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <SlaCountdown createdAt={rec.createdAt} slaDays={7} status={rec.status} clientName={rec.client?.name} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={rec.status} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.25 }}>
                              <Tooltip title="Voir détails" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleView(rec)}
                                  sx={{ color: navy, '&:hover': { backgroundColor: navyLight } }}
                                >
                                  <Visibility sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {user &&
                                (user.role === 'CHEF_EQUIPE' ||
                                  user.role === 'SUPER_ADMIN' ||
                                  (user.role === 'GESTIONNAIRE' && rec.createdById === user.id)) && (
                                  <Tooltip title="Éditer" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEdit(rec)}
                                      disabled={updateReclamationMutation.isLoading}
                                      sx={{ color: '#e65100', '&:hover': { backgroundColor: '#fff8e1' } }}
                                    >
                                      <Edit sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}

                              {canAssign && (
                                <Tooltip title="Assigner" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleAssign(rec)}
                                    disabled={assignReclamationMutation.isLoading}
                                    sx={{ color: '#6a1b9a', '&:hover': { backgroundColor: '#f3e5f5' } }}
                                  >
                                    <Assignment sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Tooltip title="GEC — Génération de correspondance" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleGec(rec)}
                                  sx={{ color: '#1b6b3a', '&:hover': { backgroundColor: '#e6f4ed' } }}
                                >
                                  <Description sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
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

              {Array.isArray(data) && data.length >= PAGE_SIZE && (
                <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'center' }}>
                  <Pagination page={page} pageSize={PAGE_SIZE} total={data.length} onPageChange={setPage} />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── View Dialog ── */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, reclamation: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${borderColor}` } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#f4f7fb',
            borderBottom: `1px solid ${borderColor}`,
            py: 1.5,
            px: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: navy, fontSize: '1rem' }}>
            Détails de la Réclamation
          </Typography>
          <IconButton size="small" onClick={() => setViewDialog({ open: false, reclamation: null })} sx={{ color: '#546e7a' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {viewDialog.reclamation && (
            <Box sx={{ p: 2.5 }}>
              <Grid container spacing={2}>
                {[
                  { label: 'ID', value: viewDialog.reclamation.id },
                  {
                    label: 'Client',
                    value:
                      viewDialog.reclamation.client?.name ||
                      clients.find((c) => c.id === viewDialog.reclamation?.clientId)?.name ||
                      'Client inconnu',
                  },
                ].map(({ label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography variant="caption" sx={labelSx.sx}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 500 }}>
                      {value}
                    </Typography>
                  </Grid>
                ))}

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Type
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={viewDialog.reclamation.type}
                      size="small"
                      sx={{ backgroundColor: navyLight, color: navy, fontWeight: 600, fontSize: '0.72rem' }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Gravité
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <PriorityBadge severity={viewDialog.reclamation.severity} />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Statut
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusBadge status={viewDialog.reclamation.status} />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Date de création
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {new Date(viewDialog.reclamation.createdAt).toLocaleString('fr-FR')}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Typologie
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {viewDialog.reclamation.typologie ? (
                      <Chip label={viewDialog.reclamation.typologie} size="small" color="info" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Non spécifiée</Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Conformité
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {viewDialog.reclamation.conformite ? (
                      <Chip
                        label={viewDialog.reclamation.conformite}
                        size="small"
                        color={viewDialog.reclamation.conformite === 'Fondé' ? 'success' : 'error'}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Non définie</Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Description
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      p: 1.5,
                      backgroundColor: '#f4f7fb',
                      borderRadius: 1.5,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {viewDialog.reclamation.description}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={labelSx.sx}>
                    Assigné à
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {users.find((u) => u.id === viewDialog.reclamation?.assignedToId)?.fullName || 'Non assigné'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, reclamation: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${borderColor}` } }}
      >
        <DialogTitle sx={{ backgroundColor: '#f4f7fb', borderBottom: `1px solid ${borderColor}`, py: 1.5, px: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: navy, fontSize: '1rem' }}>
            Modifier la Réclamation
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, px: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
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
              <FormControl fullWidth size="small">
                <InputLabel>Assigné à</InputLabel>
                <Select
                  value={editForm.assignedToId}
                  onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}
                  label="Assigné à"
                >
                  <MenuItem value="">Non assigné</MenuItem>
                  {users
                    .filter((u) => ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE'].includes(u.role || ''))
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.fullName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            {(user?.role === 'GESTIONNAIRE' || user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN') && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Conformité</InputLabel>
                  <Select
                    value={editForm.conformite}
                    onChange={(e) => setEditForm({ ...editForm, conformite: e.target.value })}
                    label="Conformité"
                  >
                    <MenuItem value="">Non définie</MenuItem>
                    <MenuItem value="Fondé">Fondé</MenuItem>
                    <MenuItem value="Non fondé">Non fondé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                label="Description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${borderColor}`, gap: 1 }}>
          <Button
            onClick={() => setEditDialog({ open: false, reclamation: null })}
            size="small"
            sx={{ textTransform: 'none', color: '#546e7a' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            size="small"
            startIcon={<Save fontSize="small" />}
            disabled={updateReclamationMutation.isLoading}
            sx={{
              backgroundColor: navy,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#15294a' },
            }}
          >
            {updateReclamationMutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, reclamation: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${borderColor}` } }}
      >
        <DialogTitle sx={{ backgroundColor: '#f4f7fb', borderBottom: `1px solid ${borderColor}`, py: 1.5, px: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: navy, fontSize: '1rem' }}>
            Assigner la Réclamation
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, px: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Assigner à</InputLabel>
                <Select
                  value={assignForm.assignedToId}
                  onChange={(e) => setAssignForm({ ...assignForm, assignedToId: e.target.value })}
                  label="Assigner à"
                >
                  {users
                    .filter((u) => ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE'].includes(u.role || ''))
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.fullName}{' '}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({u.role})
                        </Typography>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Commentaire (optionnel)"
                value={assignForm.comment}
                onChange={(e) => setAssignForm({ ...assignForm, comment: e.target.value })}
                placeholder="Ajoutez un commentaire sur cette assignation…"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${borderColor}`, gap: 1 }}>
          <Button
            onClick={() => setAssignDialog({ open: false, reclamation: null })}
            size="small"
            sx={{ textTransform: 'none', color: '#546e7a' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            size="small"
            startIcon={<Assignment fontSize="small" />}
            disabled={assignReclamationMutation.isLoading || !assignForm.assignedToId}
            sx={{
              backgroundColor: navy,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#15294a' },
            }}
          >
            {assignReclamationMutation.isLoading ? 'Assignation…' : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── GEC Dialog ── */}
      <Dialog
        open={gecDialog.open}
        onClose={() => setGecDialog({ open: false, reclamation: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${borderColor}`, maxHeight: '90vh' } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#f4f7fb',
            borderBottom: `1px solid ${borderColor}`,
            py: 1.5,
            px: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: navy, fontSize: '1rem' }}>
            Génération de Correspondance (GEC)
          </Typography>
          <IconButton size="small" onClick={() => setGecDialog({ open: false, reclamation: null })} sx={{ color: '#546e7a' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          {gecDialog.reclamation && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                Génération de correspondance pour la réclamation{' '}
                <strong>{gecDialog.reclamation.id.substring(0, 8)}…</strong>
              </Alert>

              <Grid container spacing={2}>
                {/* Info card */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <CardContent>
                      <Typography variant="caption" sx={{ ...labelSx.sx, display: 'block', mb: 1.5 }}>
                        Informations Réclamation
                      </Typography>
                      {[
                        ['Client', gecDialog.reclamation.client?.name || 'Client inconnu'],
                        ['Type', gecDialog.reclamation.type],
                        ['Gravité', gecDialog.reclamation.severity],
                        ['Statut', gecDialog.reclamation.status],
                      ].map(([k, v]) => (
                        <Box key={k} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                            {k}:
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {v}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f4f7fb', borderRadius: 1.5, border: `1px solid ${borderColor}` }}
                      >
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {gecDialog.reclamation.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Templates card */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <CardContent>
                      <Typography variant="caption" sx={{ ...labelSx.sx, display: 'block', mb: 1.5 }}>
                        Modèles Disponibles
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[
                          { type: 'EMAIL', label: 'Email de confirmation', icon: <Email fontSize="small" /> },
                          { type: 'LETTER', label: 'Lettre de relance', icon: <Description fontSize="small" /> },
                          { type: 'NOTICE', label: 'Avis de clôture', icon: <Print fontSize="small" /> },
                        ].map(({ type, label, icon }) => {
                          const selected = selectedTemplate?.type === type;
                          return (
                            <Button
                              key={type}
                              variant={selected ? 'contained' : 'outlined'}
                              startIcon={icon}
                              fullWidth
                              size="small"
                              onClick={() => handleTemplateSelect(type, label)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                justifyContent: 'flex-start',
                                borderRadius: 1.5,
                                ...(selected
                                  ? { backgroundColor: navy, '&:hover': { backgroundColor: '#15294a' } }
                                  : { borderColor: navy, color: navy, '&:hover': { backgroundColor: navyLight } }),
                              }}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Preview */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography variant="caption" sx={labelSx.sx}>
                          Aperçu du Document
                        </Typography>
                        {selectedTemplate && (
                          <Chip
                            label={selectedTemplate.name}
                            size="small"
                            sx={{ backgroundColor: navyLight, color: navy, fontWeight: 600, fontSize: '0.70rem', height: 20 }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: '#f4f7fb',
                          borderRadius: 1.5,
                          border: `1px solid ${borderColor}`,
                          minHeight: 180,
                          maxHeight: 280,
                          overflow: 'auto',
                          '&::-webkit-scrollbar': { width: 5 },
                          '&::-webkit-scrollbar-thumb': { backgroundColor: '#cfd8dc', borderRadius: 3 },
                        }}
                      >
                        {generatedDocument ? (
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.80rem', lineHeight: 1.7 }}
                          >
                            {generatedDocument}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ pt: 6 }}>
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
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${borderColor}`, gap: 1 }}>
          <Button
            onClick={() => setGecDialog({ open: false, reclamation: null })}
            size="small"
            sx={{ textTransform: 'none', color: '#546e7a' }}
          >
            Fermer
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownload fontSize="small" />}
            onClick={handleGenerateDocument}
            disabled={!selectedTemplate}
            sx={{
              backgroundColor: '#1b6b3a',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#145230' },
            }}
          >
            Générer Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modals ── */}
      <CreateReclamationModal
        open={createReclamationOpen}
        onClose={() => setCreateReclamationOpen(false)}
        onReclamationCreated={() => {
          setCreateReclamationOpen(false);
          queryClient.invalidateQueries(['reclamations']);
        }}
      />

      <ExcelImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        onImportComplete={() => {
          setExcelImportOpen(false);
          queryClient.invalidateQueries(['reclamations']);
        }}
      />

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};