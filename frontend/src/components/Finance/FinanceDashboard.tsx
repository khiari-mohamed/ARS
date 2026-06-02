import React, { useState, useEffect } from 'react';
import financeService from '../../services/financeService';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Error,
  FilterList,
  Refresh
} from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalOrdres: number;
  ordresEnCours: number;
  ordresExecutes: number;
  ordresRejetes: number;
  montantTotal: number;
  demandesRecuperation: number;
  montantsRecuperes: number;
}

interface RecentOrdre {
  id: string;
  reference: string;
  etatVirement: string;
  montantTotal: number;
  dateCreation: string;
  bordereau?: { client?: { name: string } };
  donneurOrdre?: { nom: string };
}

// ─── Status helper (design only, no logic change) ─────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  EXECUTE:              { label: 'Exécuté',            bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  VIREMENT_DEPOSE:      { label: 'Virement déposé',    bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  REJETE:               { label: 'Rejeté',             bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
  VIREMENT_NON_VALIDE:  { label: 'Non valide',         bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
  EN_COURS:             { label: 'En cours',           bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  PENDING:              { label: 'En attente',         bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  EN_COURS_VALIDATION:  { label: 'En validation',      bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
};

function getStatusStyle(statut: string) {
  return STATUS_MAP[statut] ?? { label: statut, bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' };
}

// Format mode de récupération from database format to human-readable
function formatModeRecuperation(mode: string | null): string {
  if (!mode) return '—';
  const MODE_MAP: Record<string, string> = {
    'FEUILLE_CAISSE': 'Feuille de caisse',
    'VIREMENT': 'Virement',
    'CHEQUE': 'Chèque',
    'ESPECES': 'Espèces',
    'AUTRE': 'Autre',
  };
  return MODE_MAP[mode] || mode;
}

// ─── Shared cell sx ───────────────────────────────────────────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.2,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.7,
  px: 1.2,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
const FinanceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    compagnie: '',
    client: '',
    referenceBordereau: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentOrdersFilters, setRecentOrdersFilters] = useState({
    compagnie: '',
    client: '',
    referenceBordereau: '',
    dateFrom: '',
    dateTo: '',
    montant: '',
    modeRecuperation: '',
    nomDonneur: '',
    numeroContrat: '',
  });
  const [showRecentOrdersFilters, setShowRecentOrdersFilters] = useState(false);
  const [showAllRecentOrders, setShowAllRecentOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [documentViewer, setDocumentViewer] = useState<{
    open: boolean; url: string; title: string; type: 'pdf' | 'txt' | 'excel';
  }>({ open: false, url: '', title: '', type: 'pdf' });
  const [excelPreviewData, setExcelPreviewData] = useState<any>(null);

  // ── Data loading (unchanged) ────────────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (filters.compagnie)          queryParams.append('compagnie', filters.compagnie);
      if (filters.client)             queryParams.append('client', filters.client);
      if (filters.referenceBordereau) queryParams.append('referenceBordereau', filters.referenceBordereau);
      if (filters.dateFrom)           queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo)             queryParams.append('dateTo', filters.dateTo);
      const data = await financeService.getFinanceDashboard(queryParams.toString());
      setDashboard(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      setDashboard({
        stats: {
          totalOrdres: 0, ordresEnCours: 0, ordresExecutes: 0, ordresRejetes: 0,
          montantTotal: 0, demandesRecuperation: 0, montantsRecuperes: 0,
        },
        ordresVirement: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  const handleRecentOrdersFilterChange = (field: string, value: string) => {
    setRecentOrdersFilters(prev => ({ ...prev, [field]: value }));
  };
  const applyFilters  = () => loadDashboard();
  const clearFilters  = () => {
    setFilters({ compagnie: '', client: '', referenceBordereau: '', dateFrom: '', dateTo: '' });
    setTimeout(() => loadDashboard(), 100);
  };
  const clearRecentOrdersFilters = () => {
    setRecentOrdersFilters({ compagnie: '', client: '', referenceBordereau: '', dateFrom: '', dateTo: '', montant: '', modeRecuperation: '', nomDonneur: '', numeroContrat: '' });
    setCurrentPage(1);
  };

  React.useEffect(() => { setCurrentPage(1); }, [
    recentOrdersFilters.compagnie, recentOrdersFilters.client,
    recentOrdersFilters.referenceBordereau, recentOrdersFilters.dateFrom,
    recentOrdersFilters.dateTo, recentOrdersFilters.montant,
    recentOrdersFilters.modeRecuperation, recentOrdersFilters.nomDonneur,
    recentOrdersFilters.numeroContrat,
  ]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { fetchClients } = await import('../../services/clientService');
        const data = await fetchClients();
        setClients(data);
      } catch (error) { console.error('Failed to load clients:', error); }
    };
    loadClients();
    loadDashboard();
  }, []);

  // ── Filtering helpers (unchanged logic) ────────────────────────────────────
  const applyRecentFilters = (list: any[]) => {
    let filtered = list;
    if (recentOrdersFilters.compagnie)
      filtered = filtered.filter((o: any) => o.compagnieAssurance?.toLowerCase().includes(recentOrdersFilters.compagnie.toLowerCase()));
    if (recentOrdersFilters.client)
      filtered = filtered.filter((o: any) => o.client?.toLowerCase().includes(recentOrdersFilters.client.toLowerCase()));
    if (recentOrdersFilters.referenceBordereau)
      filtered = filtered.filter((o: any) => o.referenceBordereau?.toLowerCase().includes(recentOrdersFilters.referenceBordereau.toLowerCase()));
    if (recentOrdersFilters.dateFrom)
      filtered = filtered.filter((o: any) => new Date(o.dateCreation) >= new Date(recentOrdersFilters.dateFrom));
    if (recentOrdersFilters.dateTo)
      filtered = filtered.filter((o: any) => new Date(o.dateCreation) <= new Date(recentOrdersFilters.dateTo));
    if (recentOrdersFilters.montant) {
      const searchAmount = parseFloat(recentOrdersFilters.montant);
      filtered = filtered.filter((o: any) =>
        o.montant?.toString().includes(recentOrdersFilters.montant) ||
        Math.abs((o.montant || 0) - searchAmount) < 0.01
      );
    }
    if (recentOrdersFilters.modeRecuperation)
      filtered = filtered.filter((o: any) => o.modeRecuperation?.toLowerCase().includes(recentOrdersFilters.modeRecuperation.toLowerCase()));
    if (recentOrdersFilters.nomDonneur)
      filtered = filtered.filter((o: any) => o.nomDonneur?.toLowerCase().includes(recentOrdersFilters.nomDonneur.toLowerCase()));
    if (recentOrdersFilters.numeroContrat)
      filtered = filtered.filter((o: any) => o.numeroContrat?.toLowerCase().includes(recentOrdersFilters.numeroContrat.toLowerCase()));
    return filtered;
  };

  const getFilteredStats = () => {
    const filtered = applyRecentFilters(ordresVirement || []);
    const totalOrdres        = filtered.length;
    const ordresEnCours      = filtered.filter((o: any) => ['EN_COURS', 'PENDING'].includes(o.statut)).length;
    const ordresExecutes     = filtered.filter((o: any) => ['EXECUTE', 'VIREMENT_DEPOSE'].includes(o.statut)).length;
    const ordresRejetes      = filtered.filter((o: any) => ['REJETE', 'VIREMENT_NON_VALIDE'].includes(o.statut)).length;
    const montantTotal       = filtered.reduce((sum: number, o: any) => sum + (o.montant || 0), 0);
    const demandesRecuperation = filtered.filter((o: any) => o.demandeRecuperation).length;
    const montantsRecuperes  = filtered.filter((o: any) => o.montantRecupere).length;
    return { totalOrdres, ordresEnCours, ordresExecutes, ordresRejetes, montantTotal, demandesRecuperation, montantsRecuperes };
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement du tableau de bord...</Typography>
      </Box>
    );
  }
  if (error && !dashboard) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button variant="outlined" onClick={loadDashboard} sx={{ mt: 1 }}>Réessayer</Button>
      </Alert>
    );
  }

  const ordresVirement = dashboard?.ordresVirement || [];
  const stats: DashboardStats = dashboard?.ordresVirement ? getFilteredStats() : {
    totalOrdres: 0, ordresEnCours: 0, ordresExecutes: 0, ordresRejetes: 0,
    montantTotal: 0, demandesRecuperation: 0, montantsRecuperes: 0,
  };

  // ── Stats cards ────────────────────────────────────────────────────────────
  const STAT_CARDS = [
    { label: 'Total Ordres',  value: stats.totalOrdres,   color: '#1e3a5f', accent: '#2196f3', icon: <Assignment />,   textColor: 'primary'          },
    { label: 'En Cours',      value: stats.ordresEnCours,  color: '#0d5c6b', accent: '#00bcd4', icon: <TrendingUp />,   textColor: 'info.main'        },
    { label: 'Exécutés',      value: stats.ordresExecutes, color: '#1b5e20', accent: '#4caf50', icon: <CheckCircle />,  textColor: 'success.main'     },
    { label: 'Rejetés',       value: stats.ordresRejetes,  color: '#7f0000', accent: '#f44336', icon: <Error />,        textColor: 'error.main'       },
    {
      label: 'Montant Total',
      value: `${(stats.montantTotal || 0).toLocaleString('fr-TN')} TND`,
      color: '#3e1f6d', accent: '#9c27b0', icon: <AccountBalance />, textColor: 'secondary.main',
      isAmount: true,
    },
  ];

  const renderStatsCards = () => (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {STAT_CARDS.map((card) => (
        <Grid item xs={12} sm={6} md={2.4} key={card.label}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${card.accent}`,
              borderRadius: 2,
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
            }}
          >
            <CardContent sx={{ pb: '12px !important' }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box>
                  <Typography
                    color="text.secondary"
                    gutterBottom
                    variant="caption"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant={card.isAmount ? 'h6' : 'h4'}
                    sx={{ color: card.accent, fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {card.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${card.accent}18`,
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.accent,
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ── Recent orders ──────────────────────────────────────────────────────────
  const getFilteredRecentOrders = () => {
    let filtered = applyRecentFilters(ordresVirement || []);
    filtered = filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.dateExecution || a.dateCreation).getTime();
      const dateB = new Date(b.dateExecution || b.dateCreation).getTime();
      return dateB - dateA;
    });
    if (showAllRecentOrders) return filtered;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalFilteredCount = () => applyRecentFilters(ordresVirement || []).length;
  const getTotalPages = () => Math.ceil(getTotalFilteredCount() / itemsPerPage);

  const isFiltered = !!(
    recentOrdersFilters.compagnie || recentOrdersFilters.client ||
    recentOrdersFilters.referenceBordereau || recentOrdersFilters.dateFrom ||
    recentOrdersFilters.dateTo || recentOrdersFilters.montant ||
    recentOrdersFilters.modeRecuperation || recentOrdersFilters.nomDonneur ||
    recentOrdersFilters.numeroContrat
  );

  const renderRecentOrdres = () => {
    const filteredOrders = getFilteredRecentOrders();

    return (
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.10)', borderRadius: 2 }}
      >
        <CardContent>
          {/* ── Card header ── */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            pb={1.5}
            sx={{ borderBottom: '2px solid #e8edf5' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                Ordres de Virement Récents
              </Typography>
              {user?.role === 'CHEF_EQUIPE' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                  Affichage limité aux ordres de votre équipe
                </Typography>
              )}
              {user?.role === 'GESTIONNAIRE_SENIOR' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                  Affichage limité à vos clients uniquement
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button
                variant={showRecentOrdersFilters ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                size="small"
                onClick={() => setShowRecentOrdersFilters(!showRecentOrdersFilters)}
                sx={{ fontSize: '0.78rem' }}
              >
                Filtres
              </Button>
              <Button
                variant={showAllRecentOrders ? 'contained' : 'outlined'}
                size="small"
                onClick={() => { setShowAllRecentOrders(!showAllRecentOrders); setCurrentPage(1); }}
                sx={{ fontSize: '0.78rem' }}
              >
                {showAllRecentOrders ? 'Réduire' : 'Afficher tout'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Assignment />}
                sx={{ fontSize: '0.78rem', borderColor: '#2e7d32', color: '#2e7d32' }}
                onClick={async () => {
                  try {
                    const { financeService } = await import('../../services/financeService');
                    await financeService.exportDashboardExcel({
                      compagnie: recentOrdersFilters.compagnie,
                      client: recentOrdersFilters.client,
                      dateFrom: recentOrdersFilters.dateFrom,
                      dateTo: recentOrdersFilters.dateTo,
                    });
                  } catch (error) {
                    console.error('Export failed:', error);
                    alert("Erreur lors de l'export Excel");
                  }
                }}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={loadDashboard}
                sx={{ fontSize: '0.78rem' }}
              >
                Actualiser
              </Button>
            </Box>
          </Box>

          {/* ── Filter panel ── */}
          {showRecentOrdersFilters && (
            <Paper
              elevation={0}
              sx={{
                p: 2, mb: 2,
                bgcolor: '#f0f4ff',
                border: '1px solid #d0dff5',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Filtres — Compagnie / Client / Référence Bordereau / Période / Montant
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} md={2.2}>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name}
                    value={clients.find(c => c.name === recentOrdersFilters.compagnie) || null}
                    onChange={(_, newValue) => handleRecentOrdersFilterChange('compagnie', newValue?.name || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Compagnie d'assurance" placeholder="Tapez pour rechercher…" size="small" />
                    )}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                    noOptionsText="Aucun client trouvé"
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2.2}>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name}
                    value={clients.find(c => c.name === recentOrdersFilters.client) || null}
                    onChange={(_, newValue) => handleRecentOrdersFilterChange('client', newValue?.name || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Client" placeholder="Tapez pour rechercher…" size="small" />
                    )}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                    noOptionsText="Aucun client trouvé"
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth label="Référence Bordereau"
                    value={recentOrdersFilters.referenceBordereau}
                    onChange={(e) => handleRecentOrdersFilterChange('referenceBordereau', e.target.value)}
                    size="small" placeholder="Ex: BORD-2024-001"
                  />
                </Grid>
                <Grid item xs={12} md={1.8}>
                  <TextField
                    fullWidth label="Période — Début" type="date"
                    value={recentOrdersFilters.dateFrom}
                    onChange={(e) => handleRecentOrdersFilterChange('dateFrom', e.target.value)}
                    InputLabelProps={{ shrink: true }} size="small"
                  />
                </Grid>
                <Grid item xs={12} md={1.8}>
                  <TextField
                    fullWidth label="Période — Fin" type="date"
                    value={recentOrdersFilters.dateTo}
                    onChange={(e) => handleRecentOrdersFilterChange('dateTo', e.target.value)}
                    InputLabelProps={{ shrink: true }} size="small"
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <TextField
                    fullWidth label="Montant (TND)" type="number"
                    value={recentOrdersFilters.montant}
                    onChange={(e) => handleRecentOrdersFilterChange('montant', e.target.value)}
                    size="small" placeholder="Ex: 5000"
                    inputProps={{ min: 0, step: 0.001 }}
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <Button variant="outlined" onClick={clearRecentOrdersFilters} size="small" fullWidth>
                    Réinitialiser
                  </Button>
                </Grid>
              </Grid>
              <Grid container spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={2.5}>
                  <Autocomplete
                    options={Array.from(new Set(ordresVirement.map((o: any) => o.modeRecuperation).filter(Boolean))) as string[]}
                    getOptionLabel={(option) => formatModeRecuperation(option as string)}
                    value={recentOrdersFilters.modeRecuperation || null}
                    onChange={(_, newValue) => handleRecentOrdersFilterChange('modeRecuperation', (newValue as string) || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Mode de récupération" placeholder="Tapez pour rechercher…" size="small" />
                    )}
                    noOptionsText="Aucun mode trouvé"
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={Array.from(new Set(ordresVirement.map((o: any) => o.nomDonneur).filter(Boolean))) as string[]}
                    getOptionLabel={(option) => option as string}
                    value={recentOrdersFilters.nomDonneur || null}
                    onChange={(_, newValue) => handleRecentOrdersFilterChange('nomDonneur', (newValue as string) || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Nom du donneur" placeholder="Tapez pour rechercher…" size="small" />
                    )}
                    noOptionsText="Aucun donneur trouvé"
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={Array.from(new Set(ordresVirement.map((o: any) => o.numeroContrat).filter(Boolean))) as string[]}
                    getOptionLabel={(option) => option as string}
                    value={recentOrdersFilters.numeroContrat || null}
                    onChange={(_, newValue) => handleRecentOrdersFilterChange('numeroContrat', (newValue as string) || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Numéro de contrat" placeholder="Tapez pour rechercher…" size="small" />
                    )}
                    noOptionsText="Aucun contrat trouvé"
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* ── Table ── */}
          {filteredOrders.length > 0 ? (
            <TableContainer
              sx={{
                borderRadius: 1.5,
                border: '1px solid #dde3ef',
                maxHeight: 580,
                overflow: 'auto',
                '&::-webkit-scrollbar': { height: 6, width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={HEAD_CELL_SX}>Réf. OV</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Réf. Bordereau</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Compagnie d'Assurance</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Client / Société</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Bordereau</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Date Exécution</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 160 }}>Motif / Observations</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Mode Récupération</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Nom Donneur</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>N° Contrat</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Dem. Récup.</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Mnt Récupéré</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 220 }}>Documents</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredOrders.map((ordre: any, index: number) => {
                    const isEven = index % 2 === 0;
                    const rowBg  = isEven ? '#ffffff' : '#f4f7fb';
                    const st     = getStatusStyle(ordre.statut);

                    return (
                      <TableRow
                        key={ordre.id || index}
                        sx={{
                          backgroundColor: rowBg,
                          '&:hover': { backgroundColor: '#e8f0fe' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        {/* Référence OV */}
                        <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                          {ordre.reference}
                        </TableCell>

                        {/* Référence Bordereau */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#37474f' }}>
                          {ordre.referenceBordereau || '—'}
                        </TableCell>

                        {/* Compagnie */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap' }}>
                          {ordre.compagnieAssurance || ordre.client || '—'}
                        </TableCell>

                        {/* Client */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap' }}>
                          {ordre.client}
                        </TableCell>

                        {/* Bordereau */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.77rem', color: '#546e7a' }}>
                          {ordre.bordereau}
                        </TableCell>

                        {/* Montant */}
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                          {ordre.montant?.toLocaleString('fr-TN')} <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                        </TableCell>

                        {/* Statut */}
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              px: 1,
                              py: 0.3,
                              borderRadius: 1,
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              backgroundColor: st.bg,
                              color: st.color,
                              border: `1px solid ${st.border}`,
                            }}
                          >
                            {st.label}
                          </Box>
                        </TableCell>

                        {/* Date Exécution */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {ordre.dateExecution
                            ? new Date(ordre.dateExecution).toLocaleDateString('fr-FR')
                            : '—'}
                        </TableCell>

                        {/* Motif */}
                        <TableCell sx={{ ...BODY_CELL_SX, maxWidth: 200 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: '0.78rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#546e7a' }}
                          >
                            {ordre.motifObservation || '—'}
                          </Typography>
                        </TableCell>

                        {/* Mode Récupération */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {formatModeRecuperation(ordre.modeRecuperation)}
                        </TableCell>

                        {/* Nom Donneur */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {ordre.nomDonneur || '—'}
                        </TableCell>

                        {/* Numéro Contrat */}
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                          {ordre.numeroContrat || '—'}
                        </TableCell>

                        {/* Demande Récupération */}
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {ordre.demandeRecuperation ? (
                            <Box>
                              <Box sx={{
                                display: 'inline-flex', px: 0.8, py: 0.2, borderRadius: 1,
                                fontSize: '0.70rem', fontWeight: 700,
                                bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80',
                              }}>Oui</Box>
                              {ordre.dateDemandeRecuperation && (
                                <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.2 }}>
                                  {new Date(ordre.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{
                              display: 'inline-flex', px: 0.8, py: 0.2, borderRadius: 1,
                              fontSize: '0.70rem', color: '#90a4ae', border: '1px solid #cfd8dc',
                            }}>Non</Box>
                          )}
                        </TableCell>

                        {/* Montant Récupéré */}
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {ordre.montantRecupere ? (
                            <Box>
                              <Box sx={{
                                display: 'inline-flex', px: 0.8, py: 0.2, borderRadius: 1,
                                fontSize: '0.70rem', fontWeight: 700,
                                bgcolor: '#e6f4ed', color: '#1b6b3a', border: '1px solid #a5d6a7',
                              }}>Oui</Box>
                              {ordre.dateMontantRecupere && (
                                <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.2 }}>
                                  {new Date(ordre.dateMontantRecupere).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{
                              display: 'inline-flex', px: 0.8, py: 0.2, borderRadius: 1,
                              fontSize: '0.70rem', color: '#90a4ae', border: '1px solid #cfd8dc',
                            }}>Non</Box>
                          )}
                        </TableCell>

                        {/* Documents */}
                        <TableCell sx={{ ...BODY_CELL_SX }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }}>
                            <Button
                              size="small" variant="outlined"
                              sx={{
                                fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0,
                                whiteSpace: 'nowrap', borderColor: '#1e3a5f', color: '#1e3a5f',
                                '&:hover': { bgcolor: '#1e3a5f', color: '#fff' },
                              }}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}/pdf`, { responseType: 'blob' });
                                  const blob = new Blob([response.data], { type: 'application/pdf' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  setDocumentViewer({ open: true, url: blobUrl, title: `PDF OV - ${ordre.reference}`, type: 'pdf' });
                                } catch (error) {
                                  console.error('Error loading PDF:', error);
                                  alert('Erreur lors du chargement du PDF');
                                }
                              }}
                            >
                              PDF OV
                            </Button>

                            <Button
                              size="small" variant="outlined"
                              sx={{
                                fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0,
                                whiteSpace: 'nowrap', borderColor: '#546e7a', color: '#546e7a',
                                '&:hover': { bgcolor: '#546e7a', color: '#fff' },
                              }}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}/txt`, { responseType: 'blob' });
                                  const blob = new Blob([response.data], { type: 'text/plain' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  setDocumentViewer({ open: true, url: blobUrl, title: `TXT - ${ordre.reference}`, type: 'txt' });
                                } catch (error) {
                                  console.error('Error loading TXT:', error);
                                  alert('Erreur lors du chargement du TXT');
                                }
                              }}
                            >
                              TXT
                            </Button>

                            <Button
                              size="small" variant="outlined" color="secondary"
                              sx={{
                                fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                '&:hover': { bgcolor: 'secondary.main', color: '#fff' },
                              }}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const ovResponse = await LocalAPI.get(`/finance/ordres-virement/${ordre.id}`);
                                  const ov = ovResponse.data;
                                  if (!ov.bordereauId) { alert('Aucun bordereau lié à cet OV'); return; }
                                  const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${ov.bordereauId}`);
                                  const ovDocuments = response.data;
                                  const pdfDoc = ovDocuments.find((doc: any) => doc.type === 'BORDEREAU_PDF');
                                  if (pdfDoc) {
                                    const docResponse = await LocalAPI.get(
                                      `/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`,
                                      { responseType: 'blob' }
                                    );
                                    const blob = new Blob([docResponse.data], { type: 'application/pdf' });
                                    const blobUrl = URL.createObjectURL(blob);
                                    setDocumentViewer({ open: true, url: blobUrl, title: `PDF Bordereau - ${pdfDoc.name}`, type: 'pdf' });
                                  } else {
                                    alert('Aucun PDF uploadé trouvé');
                                  }
                                } catch (error: any) {
                                  console.error('Error loading bordereau PDF:', error);
                                  alert(`Erreur: ${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
                                }
                              }}
                            >
                              Bordereau
                            </Button>

                            <Button
                              size="small" variant="outlined" color="success"
                              sx={{
                                fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                '&:hover': { bgcolor: 'success.main', color: '#fff' },
                              }}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(
                                    `/finance/ordres-virement/${ordre.id}/export-excel`,
                                    { responseType: 'blob' }
                                  );
                                  const blob = new Blob([response.data], {
                                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                  });
                                  const blobUrl = URL.createObjectURL(blob);
                                  const XLSX = await import('xlsx');
                                  const arrayBuffer = await blob.arrayBuffer();
                                  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                                  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                                  setExcelPreviewData({ data: jsonData, reference: ordre.reference });
                                  setDocumentViewer({ open: true, url: blobUrl, title: `Détails OV - ${ordre.reference}`, type: 'excel' });
                                } catch (error) {
                                  console.error('Error loading Excel:', error);
                                  alert("Erreur lors du chargement de l'Excel");
                                }
                              }}
                            >
                              Excel
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                p: 5, textAlign: 'center',
                bgcolor: '#f8faff', borderRadius: 2,
                border: '1px dashed #c5d4e8',
              }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isFiltered
                  ? 'Aucun ordre de virement trouvé avec ces filtres'
                  : 'Aucun ordre de virement récent'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isFiltered
                  ? 'Essayez de modifier les critères de recherche'
                  : 'Les ordres de virement apparaîtront ici une fois créés'}
              </Typography>
            </Box>
          )}

          {/* ── Pagination ── */}
          {filteredOrders.length > 0 && (
            <Box
              sx={{
                mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                p: 1, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #e0e7ef',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {showAllRecentOrders
                  ? `Affichage de tous les ${filteredOrders.length} ordres`
                  : `Affichage de ${Math.min(itemsPerPage, filteredOrders.length)} sur ${getTotalFilteredCount()} ordres — Page ${currentPage} / ${getTotalPages()}`
                }
                {isFiltered && ' (filtrés)'}
              </Typography>

              {!showAllRecentOrders && getTotalPages() > 1 && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    size="small" variant="outlined"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    ‹ Précédent
                  </Button>
                  <Typography variant="caption" sx={{ mx: 1, fontWeight: 600, color: '#1e3a5f' }}>
                    {currentPage} / {getTotalPages()}
                  </Typography>
                  <Button
                    size="small" variant="outlined"
                    disabled={currentPage === getTotalPages()}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Suivant ›
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f', letterSpacing: -0.5 }}>
            Tableau de Bord Finance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Vue d'ensemble des ordres de virement
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Attention :</strong> {error}
        </Alert>
      )}

      {/* Rejected Orders Alert */}
      {stats.ordresRejetes > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention :</strong> {stats.ordresRejetes} ordre(s) de virement rejeté(s)
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Recent Orders */}
      {renderRecentOrdres()}

      {/* Recovery Stats */}
      {dashboard?.stats && (
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '4px solid #f59e0b',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem', fontWeight: 700, mb: 0.5 }}>
                  Demandes de Récupération
                </Typography>
                <Typography variant="h4" sx={{ color: '#d97706', fontWeight: 700 }}>
                  {stats.demandesRecuperation || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ordres avec demande de récupération
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '4px solid #22c55e',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem', fontWeight: 700, mb: 0.5 }}>
                  Montants Récupérés
                </Typography>
                <Typography variant="h4" sx={{ color: '#16a34a', fontWeight: 700 }}>
                  {stats.montantsRecuperes || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ordres avec montant récupéré
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Document Viewer Dialog */}
      <Dialog
        open={documentViewer.open}
        onClose={() => setDocumentViewer({ open: false, url: '', title: '', type: 'pdf' })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh', borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {documentViewer.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {documentViewer.type === 'txt' && documentViewer.url && (
              <Button variant="contained" size="small"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = documentViewer.url;
                  link.download = documentViewer.title.replace('TXT - ', '') + '.txt';
                  link.click();
                }}
              >Télécharger</Button>
            )}
            {documentViewer.type === 'excel' && documentViewer.url && (
              <Button variant="contained" color="success" size="small"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = documentViewer.url;
                  link.download = documentViewer.title.replace('Détails OV - ', 'Details_OV_') + '_' + new Date().toISOString().split('T')[0] + '.xlsx';
                  link.click();
                }}
              >📥 Télécharger Excel</Button>
            )}
            <Button onClick={() => setDocumentViewer({ open: false, url: '', title: '', type: 'pdf' })} size="small" variant="outlined">
              Fermer
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, height: '100%' }}>
          {documentViewer.url ? (
            documentViewer.type === 'pdf' ? (
              <iframe
                src={documentViewer.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={documentViewer.title}
              />
            ) : documentViewer.type === 'excel' ? (
              <Box sx={{ p: 3, height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5' }}>
                {excelPreviewData?.data ? (
                  <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: 1, overflow: 'hidden' }}>
                    <TableContainer>
                      <Table size="small" sx={{ minWidth: 650 }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#2c3e50' }}>
                            {excelPreviewData.data[0]?.map((header: any, index: number) => (
                              <TableCell
                                key={index}
                                sx={{
                                  color: '#ffffff !important',
                                  fontWeight: 'bold',
                                  fontSize: '0.85rem',
                                  borderRight: index < excelPreviewData.data[0].length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                  py: 2,
                                  backgroundColor: '#2c3e50 !important',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {excelPreviewData.data.slice(1).map((row: any[], rowIndex: number) => {
                            const isLastRow = rowIndex === excelPreviewData.data.length - 2;
                            return (
                              <TableRow
                                key={rowIndex}
                                sx={{
                                  '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' },
                                  '&:hover': { bgcolor: isLastRow ? '#E7E6E6' : '#f0f0f0' },
                                  bgcolor: isLastRow ? '#E7E6E6' : 'inherit',
                                  fontWeight: isLastRow ? 'bold' : 'normal',
                                }}
                              >
                                {row.map((cell: any, cellIndex: number) => (
                                  <TableCell
                                    key={cellIndex}
                                    sx={{
                                      fontWeight: isLastRow ? 'bold' : 'normal',
                                      fontFamily: cellIndex === 9 ? 'monospace' : 'inherit',
                                      fontSize: '0.875rem',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {cell !== undefined && cell !== null ? String(cell) : ''}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ p: 2, textAlign: 'center', borderTop: '2px solid #ddd', bgcolor: '#fafafa' }}>
                      <Button
                        variant="contained" color="success" size="large"
                        startIcon={<span>📥</span>}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = documentViewer.url;
                          link.download = `Details_OV_${excelPreviewData.reference}_${new Date().toISOString().split('T')[0]}.xlsx`;
                          link.click();
                        }}
                        sx={{ px: 4, py: 1.5 }}
                      >
                        Télécharger le Fichier Excel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Chargement des données...</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ p: 2, height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5' }}>
                <iframe
                  src={documentViewer.url}
                  style={{ width: '100%', height: '100%', border: '1px solid #ddd', backgroundColor: 'white', fontFamily: 'monospace', fontSize: '14px' }}
                  title={documentViewer.title}
                />
              </Box>
            )
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '18px', color: '#666' }}>
              Chargement du document...
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinanceDashboard;