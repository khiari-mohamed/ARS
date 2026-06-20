import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  List,
  ListItem,
  TablePagination,
  ListItemText,
} from '@mui/material';
import {
  Add,
  FilterList,
  Visibility,
  CalendarToday,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import BOEntryForm from '../components/BOEntryForm';
import { BOCorbeille } from '../components/Workflow/BOCorbeille';
import DocumentUploadPortal from '../components/DocumentUploadPortal';
import { fetchBODashboard } from '../services/boService';

// ── Design tokens (match design system) ─────────────────────────────────────
const NAV_BG   = '#1e3a5f';
const NAV_TEXT = '#ffffff';
const ACCENT   = '#2196f3';
const ROW_ODD  = '#f4f7fb';
const ROW_EVEN = '#ffffff';
const ROW_HOV  = '#e8f0fe';
const BORDER   = '#e0e7ef';

const PIE_COLORS = ['#2196f3', '#00bcd4', '#4caf50', '#f44336', '#9c27b0', '#ff9800'];

const STATUS_MAP: Record<string, { bg: string; text: string; border: string; label: string }> = {
  EN_ATTENTE:   { bg: '#fff8e1', text: '#e65100', border: '#ffcc80', label: 'En Attente' },
  EN_COURS:     { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', label: 'En Cours' },
  TRAITE:       { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7', label: 'Traité' },
  CLOTURE:      { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7', label: 'Clôturé' },
  EN_DIFFICULTE:{ bg: '#fdecea', text: '#b71c1c', border: '#ef9a9a', label: 'En Difficulté' },
  A_SCANNER:    { bg: '#fff8e1', text: '#e65100', border: '#ffcc80', label: 'À Scanner' },
  SCAN_EN_COURS:{ bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', label: 'Scan en Cours' },
  ASSIGNE:      { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', label: 'Assigné' },
};

const StatusChip: React.FC<{ statut: string }> = ({ statut }) => {
  const s = STATUS_MAP[statut] ?? { bg: '#f4f7fb', text: '#546e7a', border: '#cfd8dc', label: statut };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.25,
        borderRadius: '8px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        bgcolor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </Box>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: number | string;
  accent?: string;
  icon: React.ReactNode;
}> = ({ label, value, accent = ACCENT, icon }) => (
  <Card
    elevation={0}
    sx={{
      border: '1px solid rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${accent}`,
      transition: 'box-shadow .2s',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
    }}
  >
    <CardContent sx={{ p: '20px !important' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography
            variant="caption"
            sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
          >
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: NAV_BG, mt: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: '50%',
            bgcolor: `${accent}17`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Main Component ───────────────────────────────────────────────────────────
const BODashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [activeDialog, setActiveDialog]   = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const [filters, setFilters] = useState({
    clientId: '', chefEquipeId: '', dateFrom: '', dateTo: '', statut: '',
  });
  const [clients, setClients]           = useState<any[]>([]);
  const [chefEquipes, setChefEquipes]   = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);

  // Chart-specific state (keep chart filtering scoped so other dashboard widgets aren't affected)
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '365d' | 'custom'>('7d');
  const [chartDateFrom, setChartDateFrom] = useState<string>('');
  const [chartDateTo, setChartDateTo] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartRecentEntries, setChartRecentEntries] = useState<any[]>([]);
  const [statusDetailsOpen, setStatusDetailsOpen] = useState(false);
  const [statusDetailsStatus, setStatusDetailsStatus] = useState<string | null>(null);
  const [statusDetailsEntries, setStatusDetailsEntries] = useState<any[]>([]);
  const [activityPage, setActivityPage] = useState(0);
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(20);
  const [statusPage, setStatusPage] = useState(0);
  const [statusRowsPerPage, setStatusRowsPerPage] = useState(20);

  useEffect(() => {
    loadDashboard();
    loadFilterData();
  }, []);

  useEffect(() => {
    if (dashboardData) applyFilters();
  }, [filters]);

  // Load chart data independently so we don't overwrite other dashboard sections
  useEffect(() => {
    const loadChart = async () => {
      try {
        // compute params based on selected range
        const params: any = {};
        const to = new Date();

        if (chartRange === 'custom') {
          if (chartDateFrom && chartDateTo) {
            params.dateFrom = chartDateFrom;
            params.dateTo = chartDateTo;
          } else {
            // nothing to load until both dates provided
            return;
          }
        } else {
          const now = new Date();
          let from = new Date();
          switch (chartRange) {
            case '7d':
              from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              break;
            case '365d':
              from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
              break;
          }
          // API expects YYYY-MM-DD (same format as the filter inputs)
          const fmt = (d: Date) => d.toISOString().split('T')[0];
          params.dateFrom = fmt(from);
          params.dateTo = fmt(now);
        }

        const data = await fetchBODashboard(params);
        setChartData(data?.statusCounts || data?.documentTypes || []);
        setChartRecentEntries(data?.recentEntries || []);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      }
    };

    loadChart();
  }, [chartRange, chartDateFrom, chartDateTo]);

  const openStatusDetails = (statut: string) => {
    const entries = (chartRecentEntries?.length ? chartRecentEntries : (dashboardData?.recentEntries || [])).filter((r: any) => r.statut === statut);
    setStatusDetailsEntries(entries);
    setStatusDetailsStatus(statut);
    setStatusDetailsOpen(true);
    setStatusPage(0);
  };

  useEffect(() => {
    // Reset activity pagination when the filtered list changes
    setActivityPage(0);
  }, [filteredEntries]);

  const loadDashboard = async (filterParams?: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBODashboard(filterParams);
      setDashboardData(data);
      setFilteredEntries(data?.recentEntries || []);
    } catch (err: any) {
      console.error('Failed to load BO dashboard:', err);
      setError('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterData = async () => {
    try {
      const { LocalAPI } = await import('../services/axios');
      const [clientsRes, chefsRes] = await Promise.all([
        LocalAPI.get('/clients'),
        LocalAPI.get('/users?role=CHEF_EQUIPE'),
      ]);
      setClients(clientsRes.data || []);
      setChefEquipes(chefsRes.data || []);
    } catch (err) {
      console.error('Failed to load filter data:', err);
    }
  };

  const applyFilters = () => {
    const active: Record<string, string> = {};
    if (filters.clientId)    active.clientId    = filters.clientId;
    if (filters.chefEquipeId) active.chefEquipeId = filters.chefEquipeId;
    if (filters.dateFrom)    active.dateFrom    = filters.dateFrom;
    if (filters.dateTo)      active.dateTo      = filters.dateTo;
    if (filters.statut)      active.statut      = filters.statut;

    if (Object.keys(active).length > 0) {
      loadDashboard(active);
    } else if (dashboardData && !filteredEntries.length) {
      loadDashboard();
    }
  };

  const resetFilters = () => {
    setFilters({ clientId: '', chefEquipeId: '', dateFrom: '', dateTo: '', statut: '' });
    loadDashboard();
  };

  const hasActiveFilters =
    !!(filters.clientId || filters.chefEquipeId || filters.dateFrom || filters.dateTo || filters.statut);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <LinearProgress sx={{ width: '40%', borderRadius: 4, height: 6 }} />
        <Typography variant="body2" sx={{ color: '#546e7a' }}>Chargement du tableau de bord…</Typography>
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <Typography variant="h6" sx={{ color: '#b71c1c' }}>{error}</Typography>
        <Button variant="contained" onClick={() => loadDashboard()} sx={{ bgcolor: NAV_BG }}>
          Réessayer
        </Button>
      </Box>
    );
  }

  const pieData = chartData?.length ? chartData : (dashboardData?.statusCounts || dashboardData?.documentTypes || []);
  const chartRangeLabel = chartRange === '7d' ? '7 derniers jours' : chartRange === '30d' ? '30 derniers jours' : chartRange === '365d' ? "1 an" : (chartDateFrom && chartDateTo ? `${chartDateFrom} → ${chartDateTo}` : 'Période personnalisée');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f4f7fb', minHeight: '100vh' }}>

      {/* ── Page Header ── */}
      <Box mb={3}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: NAV_BG, fontSize: { xs: '1.4rem', sm: '1.8rem' }, lineHeight: 1.2 }}
        >
          Bureau d'Ordre
        </Typography>
        <Typography variant="body2" sx={{ color: '#546e7a', mt: 0.5 }}>
          Tableau de bord — suivi des entrées et de l'activité
        </Typography>
      </Box>

      {/* ── BOCorbeille ── */}
      <Box sx={{ mb: 4 }}>
        <BOCorbeille onOpenEntryDialog={() => setActiveDialog('entry')} />
      </Box>

      {/* ── Stat Card ── */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Entrées Aujourd'hui"
            value={dashboardData?.todayEntries ?? 0}
            accent={ACCENT}
            icon={<Add sx={{ fontSize: 22 }} />}
          />
        </Grid>
      </Grid>

      {/* ── Charts + Table row ── */}
      <Grid container spacing={3}>

        {/* Pie chart */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{ p: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, height: '100%' }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG, mb: 2 }}>
              Répartition par Statut
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="chart-range-label">Période</InputLabel>
                <Select
                  labelId="chart-range-label"
                  value={chartRange}
                  label="Période"
                  onChange={(e) => setChartRange(e.target.value as any)}
                >
                  <MenuItem value="7d">7 jours</MenuItem>
                  <MenuItem value="30d">30 jours</MenuItem>
                  <MenuItem value="365d">1 an</MenuItem>
                  <MenuItem value="custom">Personnalisé</MenuItem>
                </Select>
              </FormControl>

              {chartRange === 'custom' && (
                <>
                  <TextField
                    size="small"
                    type="date"
                    label="Depuis"
                    value={chartDateFrom}
                    onChange={(e) => setChartDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Jusqu'à"
                    value={chartDateTo}
                    onChange={(e) => setChartDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      // effect will pick up chartDateFrom/chartDateTo changes
                      if (!chartDateFrom || !chartDateTo) return;
                      // noop — state change already handled by inputs
                    }}
                    sx={{ bgcolor: NAV_BG, '&:hover': { bgcolor: '#16304f' }, ml: 1 }}
                  >
                    Appliquer
                  </Button>
                </>
              )}

              <Box sx={{ ml: 'auto' }}>
                <Typography variant="caption" sx={{ color: '#546e7a' }}>{chartRangeLabel}</Typography>
              </Box>
            </Box>

            {(!pieData || pieData.length === 0) ? (
              <Box display="flex" alignItems="center" justifyContent="center" sx={{ height: { xs: 260, sm: 300 } }}>
                <Typography variant="body2" sx={{ color: '#546e7a' }}>
                  Aucune entrée dans les 7 derniers jours.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ height: { xs: 260, sm: 300 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius="72%"
                      dataKey="_count.id"
                      strokeWidth={2}
                      stroke="#ffffff"
                    >
                      {pieData.map((_: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, _: any, props: any) => [
                        `${value} entrée(s)`,
                        STATUS_MAP[props.payload.statut]?.label ?? props.payload.statut,
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: `1px solid ${BORDER}`,
                        fontSize: '0.8rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {pieData.map((entry: any, i: number) => (
                <Box
                  key={entry.statut}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.4,
                    bgcolor: `${PIE_COLORS[i % PIE_COLORS.length]}18`,
                    border: `1px solid ${PIE_COLORS[i % PIE_COLORS.length]}55`,
                    borderRadius: '8px',
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <Typography variant="caption" fontWeight={600} sx={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                    {STATUS_MAP[entry.statut]?.label ?? entry.statut}: {entry._count?.id ?? 0}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 2, borderTop: '1px solid rgba(0,0,0,0.06)', pt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: NAV_BG, mb: 1 }}>
                Détails
              </Typography>

              {(!pieData || pieData.length === 0) ? (
                <Typography variant="body2" sx={{ color: '#546e7a' }}>Aucun détail disponible.</Typography>
              ) : (
                <Stack spacing={1}>
                  {(() => {
                    const total = pieData.reduce((s: number, p: any) => s + (p._count?.id || 0), 0);
                    return pieData.map((entry: any, i: number) => {
                      const count = entry._count?.id || 0;
                      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
                      const entries = (chartRecentEntries?.length ? chartRecentEntries : (dashboardData?.recentEntries || [])).filter((r: any) => r.statut === entry.statut);
                      const samples = entries.slice(0, 3);

                      return (
                        <Box key={entry.statut}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{STATUS_MAP[entry.statut]?.label ?? entry.statut}</Typography>
                            </Box>

                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="caption" sx={{ color: NAV_BG, fontWeight: 700 }}>{count}</Typography>
                              <Typography variant="caption" sx={{ color: '#546e7a' }}>{pct}%</Typography>
                              <Button size="small" variant="text" onClick={() => openStatusDetails(entry.statut)} sx={{ textTransform: 'none' }}>
                                Voir ({entries.length})
                              </Button>
                            </Box>
                          </Box>

                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            {samples.length > 0 ? samples.map((s: any) => (
                              <Tooltip key={s.id} title={`${s.reference} — ${s.client?.name ?? ''} — ${new Date(s.dateReception).toLocaleDateString('fr-FR')}`}>
                                <Chip label={s.reference} size="small" sx={{ border: '1px solid rgba(0,0,0,0.06)' }} />
                              </Tooltip>
                            )) : (
                              <Typography variant="caption" sx={{ color: '#9e9e9e' }}>Aucun échantillon</Typography>
                            )}
                          </Box>

                          <Box sx={{ mt: 1 }}>
                            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 2 }} />
                          </Box>

                          <Divider sx={{ mt: 1 }} />
                        </Box>
                      );
                    });
                  })()}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Activity table */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}
          >
            {/* Table header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG }}>
                  Activité récente
                </Typography>
                {hasActiveFilters && (
                  <Typography variant="caption" sx={{ color: '#546e7a' }}>
                    {filteredEntries.length} résultat(s) filtré(s)
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setActiveDialog('filters')}
                size="small"
                sx={{
                  borderColor: NAV_BG, color: NAV_BG, fontSize: '0.78rem',
                  '&:hover': { bgcolor: NAV_BG, color: '#fff' },
                }}
              >
                Filtres {hasActiveFilters && `(actifs)`}
              </Button>
            </Box>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
                {filters.clientId && (
                  <Chip
                    label={`Client: ${clients.find(c => c.id === filters.clientId)?.name ?? 'Inconnu'}`}
                    size="small"
                    onDelete={() => setFilters(p => ({ ...p, clientId: '' }))}
                    sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9' }}
                  />
                )}
                {filters.chefEquipeId && (
                  <Chip
                    label={`Chef: ${chefEquipes.find(c => c.id === filters.chefEquipeId)?.fullName ?? 'Inconnu'}`}
                    size="small"
                    onDelete={() => setFilters(p => ({ ...p, chefEquipeId: '' }))}
                    sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9' }}
                  />
                )}
                {filters.dateFrom && (
                  <Chip
                    label={`Depuis: ${filters.dateFrom}`}
                    size="small"
                    onDelete={() => setFilters(p => ({ ...p, dateFrom: '' }))}
                    sx={{ bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80' }}
                  />
                )}
                {filters.dateTo && (
                  <Chip
                    label={`Jusqu'à: ${filters.dateTo}`}
                    size="small"
                    onDelete={() => setFilters(p => ({ ...p, dateTo: '' }))}
                    sx={{ bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80' }}
                  />
                )}
                {filters.statut && (
                  <Chip
                    label={`Statut: ${STATUS_MAP[filters.statut]?.label ?? filters.statut}`}
                    size="small"
                    onDelete={() => setFilters(p => ({ ...p, statut: '' }))}
                    sx={{ bgcolor: '#f4f7fb', color: '#546e7a', border: `1px solid ${BORDER}` }}
                  />
                )}
                <Button size="small" onClick={resetFilters} sx={{ color: '#546e7a', fontSize: '0.75rem' }}>
                  Tout effacer
                </Button>
              </Box>
            )}

            {/* Table */}
            <TableContainer
              sx={{
                overflowX: 'auto',
                borderRadius: 1.5,
                border: `1px solid ${BORDER}`,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cfd8dc', borderRadius: 3 },
              }}
            >
                <Table sx={{ minWidth: 550 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'transparent' }}>
                    {['Référence', 'Client', 'Date Réception', 'Nb Docs', 'Statut', ''].map(col => (
                      <TableCell
                        key={col}
                        sx={{
                          color: NAV_BG,
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          py: 1.25,
                          borderRight: col !== '' ? `1px solid ${BORDER}` : 'none',
                          whiteSpace: 'nowrap',
                          bgcolor: 'transparent',
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const activityStart = activityPage * activityRowsPerPage;
                    const activityDisplayed = filteredEntries.slice(activityStart, activityStart + activityRowsPerPage);
                    return activityDisplayed.map((entry: any, idx: number) => {
                      const overallIdx = activityStart + idx;
                      return (
                        <TableRow
                          key={entry.id}
                          sx={{
                            bgcolor: overallIdx % 2 === 0 ? ROW_EVEN : ROW_ODD,
                            '&:hover': { bgcolor: ROW_HOV },
                            transition: 'background-color .15s',
                          }}
                        >
                          <TableCell sx={{ fontSize: '0.81rem', fontWeight: 600, color: NAV_BG, borderRight: `1px solid ${BORDER}` }}>
                            {entry.reference}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.81rem', borderRight: `1px solid ${BORDER}` }}>
                            {entry.client?.name}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.81rem', whiteSpace: 'nowrap', borderRight: `1px solid ${BORDER}` }}>
                            {new Date(entry.dateReception).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.81rem', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>
                            {entry.nombreBS}
                          </TableCell>
                          <TableCell sx={{ borderRight: `1px solid ${BORDER}` }}>
                            <StatusChip statut={entry.statut} />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Tooltip title="Voir les détails">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedEntry(entry)}
                                sx={{
                                  color: ACCENT,
                                  '&:hover': { bgcolor: `${ACCENT}14` },
                                }}
                              >
                                <Visibility sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}

                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}>
                        <Typography variant="body2" sx={{ color: '#546e7a' }}>
                          {hasActiveFilters
                            ? 'Aucun résultat pour les filtres sélectionnés.'
                            : 'Aucune entrée récente.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <TablePagination
                  component="div"
                  count={filteredEntries.length}
                  page={activityPage}
                  onPageChange={(e, newPage) => setActivityPage(newPage)}
                  rowsPerPage={activityRowsPerPage}
                  onRowsPerPageChange={(e) => { setActivityRowsPerPage(parseInt((e.target as HTMLInputElement).value, 10)); setActivityPage(0); }}
                  rowsPerPageOptions={[20, 50, 100]}
                  labelRowsPerPage="Lignes par page"
                />
              </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Dialogs ── */}

      {/* New Entry */}
      <BOEntryForm
        open={activeDialog === 'entry'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          setTimeout(() => loadDashboard(), 500);
        }}
      />

      {/* Upload */}
      <DocumentUploadPortal
        open={activeDialog === 'upload'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          setTimeout(() => loadDashboard(), 500);
        }}
      />

      {/* Filters Dialog */}
      <Dialog
        open={activeDialog === 'filters'}
        onClose={() => setActiveDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#f4f7fb', borderBottom: `1px solid ${BORDER}`,
            fontWeight: 700, color: NAV_BG, fontSize: '1rem',
          }}
        >
          Filtres d'activité
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(o) => o.name}
                value={clients.find(c => c.id === filters.clientId) || null}
                onChange={(_, v) => setFilters(p => ({ ...p, clientId: v?.id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} label="Client" size="small" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={chefEquipes}
                getOptionLabel={(o) => o.fullName}
                value={chefEquipes.find(c => c.id === filters.chefEquipeId) || null}
                onChange={(_, v) => setFilters(p => ({ ...p, chefEquipeId: v?.id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} label="Chef d'Équipe" size="small" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" label="Date de début"
                value={filters.dateFrom}
                onChange={(e) => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" label="Date de fin"
                value={filters.dateTo}
                onChange={(e) => setFilters(p => ({ ...p, dateTo: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.statut}
                  label="Statut"
                  onChange={(e) => setFilters(p => ({ ...p, statut: e.target.value }))}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
                  <MenuItem value="A_SCANNER">À Scanner</MenuItem>
                  <MenuItem value="SCAN_EN_COURS">Scan en Cours</MenuItem>
                  <MenuItem value="ASSIGNE">Assigné</MenuItem>
                  <MenuItem value="EN_COURS">En Cours</MenuItem>
                  <MenuItem value="TRAITE">Traité</MenuItem>
                  <MenuItem value="CLOTURE">Clôturé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
          <Button onClick={resetFilters} sx={{ color: '#546e7a', fontSize: '0.8rem' }}>
            Réinitialiser
          </Button>
          <Button
            onClick={() => setActiveDialog(null)}
            variant="contained"
            sx={{ bgcolor: NAV_BG, '&:hover': { bgcolor: '#16304f' }, fontSize: '0.8rem' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#f4f7fb', borderBottom: `1px solid ${BORDER}`,
            fontWeight: 700, color: NAV_BG, fontSize: '1rem',
          }}
        >
          Détails de l'entrée
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedEntry && (
            <Grid container spacing={2.5}>
              {[
                { label: 'Référence',           value: selectedEntry.reference },
                { label: 'Client',              value: selectedEntry.client?.name },
                { label: 'Date Réception',      value: new Date(selectedEntry.dateReception).toLocaleDateString('fr-FR') },
                { label: 'Nombre de Documents', value: selectedEntry.nombreBS },
                { label: 'Délai Règlement',     value: `${selectedEntry.delaiReglement} jours` },
              ].map(({ label, value }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {label}
                  </Typography>
                  <Typography variant="body1" sx={{ color: NAV_BG, fontWeight: 500, mt: 0.25 }}>
                    {value}
                  </Typography>
                </Grid>
              ))}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Statut
                </Typography>
                <Box mt={0.5}>
                  <StatusChip statut={selectedEntry.statut} />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
          <Button
            onClick={() => setSelectedEntry(null)}
            variant="contained"
            sx={{ bgcolor: NAV_BG, '&:hover': { bgcolor: '#16304f' }, fontSize: '0.8rem' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Details Dialog (per-status full list) */}
      <Dialog
        open={statusDetailsOpen}
        onClose={() => setStatusDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#f4f7fb', borderBottom: `1px solid ${BORDER}`,
            fontWeight: 700, color: NAV_BG, fontSize: '1rem',
          }}
        >
          {statusDetailsStatus ? `${STATUS_MAP[statusDetailsStatus]?.label ?? statusDetailsStatus} — Détails` : 'Détails'}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {statusDetailsEntries.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#546e7a' }}>Aucun élément pour ce statut.</Typography>
          ) : (
            <>
              <List>
                {statusDetailsEntries.slice(statusPage * statusRowsPerPage, statusPage * statusRowsPerPage + statusRowsPerPage).map((e: any) => (
                  <ListItem key={e.id} divider secondaryAction={<StatusChip statut={e.statut} />}>
                    <ListItemText
                      primary={e.reference}
                      secondary={`${e.client?.name ?? ''} — ${new Date(e.dateReception).toLocaleDateString('fr-FR')}`}
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <TablePagination
                  component="div"
                  count={statusDetailsEntries.length}
                  page={statusPage}
                  onPageChange={(e, newPage) => setStatusPage(newPage)}
                  rowsPerPage={statusRowsPerPage}
                  onRowsPerPageChange={(e) => { setStatusRowsPerPage(parseInt((e.target as HTMLInputElement).value, 10)); setStatusPage(0); }}
                  rowsPerPageOptions={[20, 50, 100]}
                  labelRowsPerPage="Lignes par page"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
          <Button onClick={() => setStatusDetailsOpen(false)} variant="contained" sx={{ bgcolor: NAV_BG, '&:hover': { bgcolor: '#16304f' } }}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BODashboard;