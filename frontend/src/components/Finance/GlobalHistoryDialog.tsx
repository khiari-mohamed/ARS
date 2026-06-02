import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  Send as SendIcon,
  Block as BlockIcon,
  Description as DescriptionIcon,
  AccountBalance as AccountBalanceIcon,
  Verified as VerifiedIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalHistoryEntry {
  id: string;
  virementId: string;
  virementReference: string;
  action: string;
  previousState?: string;
  newState?: string;
  comment?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface GlobalHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── Action Labels & Icons ────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'CREATION': { label: 'Création du virement', icon: <AddIcon />, color: '#2196f3' },
  'VALIDATION': { label: 'Validation', icon: <CheckCircleIcon />, color: '#4caf50' },
  'AUTORISATION': { label: 'Autorisation', icon: <VerifiedIcon />, color: '#9c27b0' },
  'EXECUTION': { label: 'Exécution', icon: <AccountBalanceIcon />, color: '#4caf50' },
  'REJET': { label: 'Rejet', icon: <CancelIcon />, color: '#f44336' },
  'MODIFICATION': { label: 'Modification', icon: <EditIcon />, color: '#ff9800' },
  'ANNULATION': { label: 'Annulation', icon: <BlockIcon />, color: '#f44336' },
  'REINJECTION': { label: 'Réinjection', icon: <ReplayIcon />, color: '#ff9800' },
  'EXPORT': { label: 'Export', icon: <SendIcon />, color: '#00bcd4' },
  'GENERATION_OV': { label: 'Génération OV', icon: <DescriptionIcon />, color: '#3f51b5' },
  'GENERATION_VIR': { label: 'Génération VIR', icon: <DescriptionIcon />, color: '#3f51b5' },
  'DEMANDE_RECUPERATION': { label: 'Demande de récupération', icon: <SendIcon />, color: '#ff9800' },
  'MONTANT_RECUPERE': { label: 'Montant récupéré', icon: <CheckCircleIcon />, color: '#4caf50' },
  'CHANGEMENT_STATUT': { label: 'Changement de statut', icon: <EditIcon />, color: '#607d8b' },
  'CORRECTION': { label: 'Correction', icon: <EditIcon />, color: '#ff5722' },
  'RELANCE_TRAITEMENT': { label: 'Relance du traitement', icon: <ReplayIcon />, color: '#9c27b0' },
};

const ROLE_LABELS: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'FINANCE': 'Service Financier',
  'CHEF_EQUIPE': 'Chef d\'Équipe',
  'GESTIONNAIRE_SENIOR': 'Gestionnaire Senior',
  'GESTIONNAIRE': 'Gestionnaire',
  'RESPONSABLE': 'Responsable',
};

// ─── Component ────────────────────────────────────────────────────────────────
const GlobalHistoryDialog: React.FC<GlobalHistoryDialogProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<GlobalHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<GlobalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    role: '',
    virementReference: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (open) {
      loadGlobalHistory();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [history, filters]);

  const loadGlobalHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { LocalAPI } = await import('../../services/axios');
      
      // Get all OVs first
      const ovsResponse = await LocalAPI.get('/finance/ordres-virement');
      const ovs = ovsResponse.data;
      
      // Fetch history for each OV
      const allHistory: GlobalHistoryEntry[] = [];
      
      for (const ov of ovs) {
        try {
          const historyResponse = await LocalAPI.get(`/finance/ordres-virement/${ov.id}/history`);
          const ovHistory = historyResponse.data.map((entry: any) => ({
            ...entry,
            virementId: ov.id,
            virementReference: ov.reference
          }));
          allHistory.push(...ovHistory);
        } catch (err) {
          console.warn(`Failed to load history for OV ${ov.reference}:`, err);
        }
      }
      
      // Sort by date (most recent first)
      allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setHistory(allHistory);
    } catch (err: any) {
      console.error('Failed to load global history:', err);
      setError(err?.response?.data?.message || 'Erreur lors du chargement de l\'historique global');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }

    if (filters.user) {
      filtered = filtered.filter(entry => 
        entry.user.name.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(entry => entry.user.role === filters.role);
    }

    if (filters.virementReference) {
      filtered = filtered.filter(entry => 
        entry.virementReference.toLowerCase().includes(filters.virementReference.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(entry => 
        new Date(entry.createdAt) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => 
        new Date(entry.createdAt) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    setFilteredHistory(filtered);
    setPage(0);
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { 
      label: action, 
      icon: <EditIcon />, 
      color: '#757575' 
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Référence OV', 'Action', 'Intervenant', 'Rôle', 'Ancien Statut', 'Nouveau Statut', 'Commentaire'],
      ...filteredHistory.map(entry => [
        formatDate(entry.createdAt),
        entry.virementReference,
        getActionConfig(entry.action).label,
        entry.user.name,
        ROLE_LABELS[entry.user.role] || entry.user.role,
        entry.previousState || '',
        entry.newState || '',
        entry.comment || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Historique_Global_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          borderBottom: '2px solid #e0e7ef',
          bgcolor: '#f4f7fb',
          pb: 2
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon sx={{ color: '#1e3a5f' }} />
            Historique Global des Virements
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Traçabilité complète de toutes les actions sur tous les virements
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#fafbfc' }}>
        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListIcon sx={{ color: '#1e3a5f' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              Filtres de Recherche
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                label="Action"
              >
                <MenuItem value="">Toutes</MenuItem>
                {Object.keys(ACTION_CONFIG).map(action => (
                  <MenuItem key={action} value={action}>
                    {ACTION_CONFIG[action].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Référence OV"
              value={filters.virementReference}
              onChange={(e) => setFilters({ ...filters, virementReference: e.target.value })}
              size="small"
              sx={{ minWidth: 180 }}
            />

            <TextField
              label="Intervenant"
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              size="small"
              sx={{ minWidth: 180 }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Rôle</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                label="Rôle"
              >
                <MenuItem value="">Tous</MenuItem>
                {Object.keys(ROLE_LABELS).map(role => (
                  <MenuItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Date Début"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Date Fin"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="outlined"
              onClick={() => setFilters({ action: '', user: '', role: '', virementReference: '', dateFrom: '', dateTo: '' })}
              size="small"
            >
              Réinitialiser
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Chargement de l'historique global...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : filteredHistory.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: '#f8faff',
              borderRadius: 2,
              border: '1px dashed #c5d4e8',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Aucun historique disponible
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {filters.action || filters.user || filters.role || filters.virementReference || filters.dateFrom || filters.dateTo
                ? 'Aucun résultat ne correspond aux filtres sélectionnés'
                : 'Les actions effectuées sur les virements apparaîtront ici'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {filteredHistory.length} entrée(s) trouvée(s)
              </Typography>
            </Box>

            <TableContainer
              sx={{
                borderRadius: 1.5,
                border: '1px solid #dde3ef',
                overflow: 'auto',
                maxHeight: 500,
                '&::-webkit-scrollbar': { height: 6, width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Date & Heure
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Référence OV
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Action
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Intervenant
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Rôle
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Ancien Statut
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Nouveau Statut
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      Commentaire
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((entry, index) => {
                    const config = getActionConfig(entry.action);
                    return (
                      <TableRow
                        key={entry.id}
                        sx={{
                          bgcolor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                          '&:hover': { bgcolor: '#e8f0fe' }
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e3a5f', fontFamily: 'monospace' }}>
                          {entry.virementReference}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={config.icon as React.ReactElement}
                            label={config.label}
                            size="small"
                            sx={{
                              bgcolor: `${config.color}20`,
                              color: config.color,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              borderLeft: `3px solid ${config.color}`
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {entry.user.name}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ROLE_LABELS[entry.user.role] || entry.user.role}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#f44336' }}>
                          {entry.previousState || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#4caf50' }}>
                          {entry.newState || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200 }}>
                          {entry.comment || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredHistory.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              sx={{ mt: 2 }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e0e7ef',
          bgcolor: '#fafbfc',
          gap: 1
        }}
      >
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
        {!loading && !error && filteredHistory.length > 0 && (
          <Button
            variant="contained"
            onClick={exportToCSV}
          >
            📥 Exporter CSV
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GlobalHistoryDialog;
