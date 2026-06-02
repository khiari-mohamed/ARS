import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, TextField,
  InputAdornment, IconButton, CircularProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  Grid, TablePagination
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart, Legend, Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ─── Shared cell styles ───────────────────────────────────────────────────────
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

// ─── Code journal color palette ───────────────────────────────────────────────
const JOURNAL_COLORS: Record<string, string> = {
  ATT411: '#6A1B9A',
  BTK580: '#1565C0',
  BTK134: '#2E7D32',
  DEFAULT: '#546e7a',
};
const journalColor = (code: string) => JOURNAL_COLORS[code] ?? JOURNAL_COLORS.DEFAULT;

// ─── Type ─────────────────────────────────────────────────────────────────────
interface SageGeneration {
  id: string;
  ordreVirementId: string;
  type: string;            // "REMBOURSEMENT" | "TPA"
  codeJournal: string;
  filePath: string | null;
  generatedAt: string;
  generatedById: string;
  ordreVirement?: {
    reference: string;
    montantTotal: number;
    clientName?: string | null;
    statutGlobal?: string; // NEW: Global workflow status
  };
  // Backend selects { fullName } from User — matches Prisma User.fullName field
  generatedBy?: {
    fullName: string;
  };
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: '#1e3a5f', color: '#fff',
      px: 1.5, py: 1, borderRadius: 1.5,
      boxShadow: '0 4px 16px rgba(30,58,95,0.25)',
      fontSize: '0.78rem', minWidth: 120,
    }}>
      {label && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#ce93d8', fontWeight: 700 }}>
          {label}
        </Typography>
      )}
      {payload.map((p: any, i: number) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.2 }}>
          <span style={{ color: p.color || '#ce93d8' }}>{p.name}</span>
          <strong>{p.value}</strong>
        </Box>
      ))}
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const HistoryTab: React.FC = () => {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<SageGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean; content: string; filename: string;
  }>({ open: false, content: '', filename: '' });

  // Helper functions for statutGlobal display
  const getStatutGlobalLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'VALIDE_INTERNE': 'Validé interne',
      'VALIDE_RECOUVREMENT': 'Validé recouvrement',
      'BLOQUE_RECOUVREMENT': 'Bloqué recouvrement',
      'COMPTABILISE': 'Comptabilisé',
      'INTEGRE_SAGE': 'Intégré dans Sage',
    };
    return labels[status] || status;
  };

  const getStatutGlobalColor = (status: string): 'default' | 'info' | 'success' | 'error' | 'primary' => {
    const colors: Record<string, 'default' | 'info' | 'success' | 'error' | 'primary'> = {
      'EN_ATTENTE': 'default',
      'VALIDE_INTERNE': 'info',
      'VALIDE_RECOUVREMENT': 'success',
      'BLOQUE_RECOUVREMENT': 'error',
      'COMPTABILISE': 'primary',
      'INTEGRE_SAGE': 'success',
    };
    return colors[status] || 'default';
  };

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/sage-txt-generations/all`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGenerations(data);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (generationId: string, filename: string | null) => {
    setDownloading(generationId);
    try {
      const res = await fetch(
        `${API}/finance/sage-txt-generations/${generationId}/download`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const safeFilename = filename || `SAGE_${generationId}.TXT`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erreur téléchargement: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (generationId: string, filename: string | null) => {
    try {
      const res = await fetch(
        `${API}/finance/sage-txt-generations/${generationId}/download`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      setPreviewDialog({ open: true, content, filename: filename || generationId });
    } catch (err: any) {
      alert(`Erreur aperçu: ${err.message}`);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredGenerations = useMemo(() => {
    if (!searchTerm.trim()) return generations;
    const q = searchTerm.trim().toLowerCase();
    return generations.filter(g =>
      g.ordreVirement?.reference?.toLowerCase().includes(q) ||
      g.codeJournal?.toLowerCase().includes(q) ||
      g.ordreVirement?.clientName?.toLowerCase().includes(q) ||
      g.generatedBy?.fullName?.toLowerCase().includes(q)
    );
  }, [generations, searchTerm]);

  const pagedGenerations = filteredGenerations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ── Chart data (derived, never mutates state) ──────────────────────────────
  const chartData = useMemo(() => {
    // 1. Generations per code journal
    const journalMap: Record<string, number> = {};
    generations.forEach(g => {
      journalMap[g.codeJournal] = (journalMap[g.codeJournal] || 0) + 1;
    });
    const byJournal = Object.entries(journalMap)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Generations per day — last 14 days
    const byDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      byDay[d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })] = 0;
    }
    generations.forEach(g => {
      const label = new Date(g.generatedAt)
        .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (label in byDay) byDay[label]++;
    });
    const byDayArr = Object.entries(byDay).map(([date, count]) => ({ date, count }));

    // 3. Stats
    const totalAmount = generations.reduce(
      (sum, g) => sum + (g.ordreVirement?.montantTotal ?? 0), 0
    );
    const uniqueJournals = Object.keys(journalMap).length;
    const uniqueOVs = new Set(generations.map(g => g.ordreVirementId)).size;

    return { byJournal, byDayArr, totalAmount, uniqueJournals, uniqueOVs };
  }, [generations]);

  // ── Stat card ──────────────────────────────────────────────────────────────
  const StatCard = ({
    label, value, accent,
  }: { label: string; value: string | number; accent: string }) => (
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
    <Box>

      {/* ── Page Sub-header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 3, borderBottom: '2px solid #e8edf5' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon fontSize="small" /> Historique des Générations Sage
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredGenerations.length} génération(s) enregistrée(s) — Aperçu et re-téléchargement des fichiers TXT
          </Typography>
        </Box>
        <Button
          startIcon={loading ? <CircularProgress size={14} sx={{ color: '#6A1B9A' }} /> : <RefreshIcon />}
          variant="outlined"
          onClick={loadHistory}
          disabled={loading}
          sx={{ fontWeight: 600, borderColor: '#6A1B9A', color: '#6A1B9A', '&:hover': { borderColor: '#4A148C', bgcolor: 'rgba(106,27,154,0.04)' } }}
        >
          Actualiser
        </Button>
      </Box>

      {/* ── Stat Cards ── */}
      {!loading && generations.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <StatCard label="Total générations" value={generations.length} accent="#6A1B9A" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard label="Ordres couverts" value={chartData.uniqueOVs} accent="#1565C0" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Montant total (TND)"
              value={chartData.totalAmount.toLocaleString('fr-TN', { maximumFractionDigits: 3 })}
              accent="#2E7D32"
            />
          </Grid>
        </Grid>
      )}

      {/* ── Charts ── */}
      {!loading && generations.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>

          {/* Bar — by code journal */}
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Générations par Code Journal
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Répartition des fichiers TXT générés
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.byJournal} barSize={32} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                    <XAxis
                      dataKey="code"
                      tick={{ fontSize: 11, fill: '#546e7a', fontWeight: 600 }}
                      axisLine={{ stroke: '#e0e7ef' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#546e7a' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Générations" radius={[4, 4, 0, 0]}>
                      {chartData.byJournal.map((entry, index) => (
                        <Cell key={index} fill={journalColor(entry.code)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {chartData.byJournal.map(entry => (
                    <Box key={entry.code} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: journalColor(entry.code), flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#37474f' }}>
                        {entry.code}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#90a4ae' }}>
                        ({entry.count})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Area — over last 14 days */}
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Activité — 14 Derniers Jours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Volume quotidien de générations
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData.byDayArr} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6A1B9A" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6A1B9A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#546e7a' }}
                      axisLine={{ stroke: '#e0e7ef' }}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#546e7a' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Générations"
                      stroke="#6A1B9A"
                      strokeWidth={2.5}
                      fill="url(#sageGradient)"
                      dot={{ r: 4, fill: '#6A1B9A', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}

      {/* ── Search ── */}
      <Box
        sx={{
          p: 1.5, mb: 2,
          bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher par référence OV, code journal, client, utilisateur..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#6A1B9A', fontSize: '1.1rem' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* ── Table ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
          <CircularProgress sx={{ color: '#6A1B9A' }} />
          <Typography variant="body2" sx={{ ml: 2, color: '#546e7a' }}>Chargement de l'historique...</Typography>
        </Box>
      ) : filteredGenerations.length === 0 ? (
        <Box sx={{
          p: 5, textAlign: 'center',
          bgcolor: '#f8faff', borderRadius: 2,
          border: '1px dashed #c5d4e8',
        }}>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
            {searchTerm ? 'Aucun résultat trouvé' : 'Aucune génération Sage enregistrée'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {searchTerm ? 'Modifiez votre recherche' : 'Les fichiers générés apparaîtront ici'}
          </Typography>
        </Box>
      ) : (
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" pb={1.5} mb={2} sx={{ borderBottom: '2px solid #e8edf5' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                Journal des Fichiers Générés
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {filteredGenerations.length} entrée(s)
                {filteredGenerations.length !== generations.length && ` (filtrées sur ${generations.length})`}
              </Typography>
            </Box>

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
                    <TableCell sx={HEAD_CELL_SX}>Date &amp; Heure</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Référence OV</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Client</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Code Journal</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Type</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Statut Global</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Généré par</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Fichier</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedGenerations.map((gen, index) => (
                    <TableRow
                      key={gen.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                        '&:hover': { backgroundColor: '#ede7f6' },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      {/* Date & Heure */}
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.75rem', color: '#546e7a' }}>
                        {new Date(gen.generatedAt).toLocaleString('fr-FR')}
                      </TableCell>

                      {/* Référence OV */}
                      <TableCell sx={BODY_CELL_SX}>
                        <Chip
                          label={gen.ordreVirement?.reference || 'N/A'}
                          size="small"
                          sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 700, fontSize: '0.70rem', fontFamily: 'monospace' }}
                        />
                      </TableCell>

                      {/* Client */}
                      <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, whiteSpace: 'nowrap', color: '#1e3a5f' }}>
                        {gen.ordreVirement?.clientName || '—'}
                      </TableCell>

                      {/* Code Journal */}
                      <TableCell sx={BODY_CELL_SX}>
                        <Chip
                          label={gen.codeJournal}
                          size="small"
                          sx={{
                            bgcolor: `${journalColor(gen.codeJournal)}18`,
                            color: journalColor(gen.codeJournal),
                            border: `1px solid ${journalColor(gen.codeJournal)}40`,
                            fontWeight: 700,
                            fontSize: '0.70rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={BODY_CELL_SX}>
                        {gen.type ? (
                          <Chip
                            label={gen.type}
                            size="small"
                            sx={{
                              fontSize: '0.70rem', fontWeight: 700,
                              bgcolor: gen.type === 'TPA' ? '#e3f2fd' : '#e8f5e9',
                              color: gen.type === 'TPA' ? '#0d47a1' : '#1b5e20',
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>

                      {/* Montant */}
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, color: '#1b5e20', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {gen.ordreVirement?.montantTotal != null
                          ? gen.ordreVirement.montantTotal.toFixed(3)
                          : '—'}
                        {' '}
                        <span style={{ fontSize: '0.70rem', color: '#78909c' }}>TND</span>
                      </TableCell>

                      {/* Statut Global */}
                      <TableCell sx={BODY_CELL_SX}>
                        {gen.ordreVirement?.statutGlobal ? (
                          <Chip
                            label={getStatutGlobalLabel(gen.ordreVirement.statutGlobal)}
                            color={getStatutGlobalColor(gen.ordreVirement.statutGlobal) as any}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>

                      {/* Généré par */}
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#37474f', fontSize: '0.78rem' }}>
                        {gen.generatedBy?.fullName || '—'}
                      </TableCell>

                      {/* Fichier */}
                      <TableCell sx={BODY_CELL_SX}>
                        <Tooltip title={gen.filePath || 'N/A'} placement="top">
                          <Typography variant="body2" sx={{
                            fontSize: '0.70rem', fontFamily: 'monospace', color: '#546e7a',
                            maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {gen.filePath || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Aperçu du contenu TXT">
                            <IconButton
                              size="small"
                              onClick={() => handlePreview(gen.id, gen.filePath)}
                              sx={{ color: '#0d47a1', '&:hover': { bgcolor: '#e3f2fd' }, p: 0.5 }}
                            >
                              <VisibilityIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Télécharger le fichier TXT">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(gen.id, gen.filePath)}
                                disabled={downloading === gen.id}
                                sx={{ color: '#6A1B9A', '&:hover': { bgcolor: '#f3e5f5' }, p: 0.5 }}
                              >
                                {downloading === gen.id
                                  ? <CircularProgress size={14} sx={{ color: '#6A1B9A' }} />
                                  : <DownloadIcon sx={{ fontSize: '1rem' }} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{
              mt: 1.5, bgcolor: '#f4f7fb', borderRadius: 1.5,
              border: '1px solid #e0e7ef', display: 'flex', justifyContent: 'flex-end',
            }}>
              <TablePagination
                component="div"
                count={filteredGenerations.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelRowsPerPage="Lignes par page :"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Preview Dialog ── */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, content: '', filename: '' })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon fontSize="small" />
            Aperçu TXT
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'monospace' }}>
            {previewDialog.filename}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: '#0d1117', p: 2.5,
              borderRadius: 0,
              maxHeight: 520,
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: '#161b22' },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#30363d', borderRadius: 3 },
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.72rem',
                color: '#a8d8a8',
                whiteSpace: 'pre',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {previewDialog.content || '(Fichier vide)'}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setPreviewDialog({ open: false, content: '', filename: '' })}
            sx={{ fontWeight: 600 }}
          >
            Fermer
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Find the generation by filename to get its id
              const gen = generations.find(g => g.filePath === previewDialog.filename);
              if (gen) handleDownload(gen.id, gen.filePath);
            }}
            sx={{ fontWeight: 600, bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}
          >
            Télécharger
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default HistoryTab;