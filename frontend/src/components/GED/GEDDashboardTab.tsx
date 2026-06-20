// src/components/GED/GEDDashboardTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DescriptionIcon from '@mui/icons-material/Description';
import ScannerIcon from '@mui/icons-material/Scanner';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';
import { LocalAPI } from '../../services/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalDocs: number;
  inProgress: number;
  overdue: number;
  slaCompliance: number; // number, not string
}

interface SlaSlice {
  name: string;
  value: number;
  color: string;
}

interface RecentDoc {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  status: string;
  batchId?: string;
  operatorId?: string;
  ingestStatus?: string;
}

interface PaperStreamStatus {
  status: string;
  watcherActive: boolean;
  totalProcessed: number;
  totalQuarantined: number;
  successRate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLA_THRESHOLD_H = 48;
const WARNING_THRESHOLD_H = 36;

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'primary' | 'success' | 'error' }> = {
  ENREGISTRE: { label: 'Enregistré', color: 'default' },
  SCANNE: { label: 'Scanné', color: 'info' },
  AFFECTE: { label: 'Affecté', color: 'warning' },
  EN_COURS: { label: 'En cours', color: 'primary' },
  TRAITE: { label: 'Traité', color: 'success' },
  RETOURNE: { label: 'Retourné', color: 'error' },
};

const AUTHORIZED_PS_ROLES = ['SUPER_ADMIN', 'SCAN_TEAM', 'CHEF_EQUIPE'];

// ─── Styles ───────────────────────────────────────────────────────────────────

const KPI_CARDS = [
  {
    key: 'totalDocs' as const,
    label: 'Total Documents',
    sub: 'dans le système',
    icon: DescriptionIcon,
    accent: '#2196f3',
    bg: '#e3f2fd',
  },
  {
    key: 'inProgress' as const,
    label: 'En cours',
    sub: 'en traitement',
    icon: AssignmentIcon,
    accent: '#00bcd4',
    bg: '#e0f7fa',
  },
  {
    key: 'overdue' as const,
    label: 'En retard',
    sub: 'SLA dépassé',
    icon: ScannerIcon,
    accent: '#f44336',
    bg: '#fdecea',
  },
];

const sx = {
  kpiCard: (accent: string, bg: string) => ({
    border: '1px solid rgba(0,0,0,0.08)',
    borderLeft: `4px solid ${accent}`,
    borderRadius: 2,
    boxShadow: 'none',
    transition: 'box-shadow 0.2s',
    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
  }),
  iconCircle: (bg: string, accent: string) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  kpiValue: (color: string) => ({
    fontWeight: 800,
    fontSize: '2rem',
    color,
    lineHeight: 1.1,
    mt: 1,
  }),
  kpiSub: {
    color: '#546e7a',
    fontSize: '0.75rem',
    mt: 0.25,
  },
  sectionCard: {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 2,
    boxShadow: 'none',
    p: 2.5,
  },
  sectionTitle: {
    fontWeight: 700,
    color: '#1e3a5f',
    fontSize: '0.85rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    mb: 2,
  },
  tableHeader: {
    background: '#264165',
    '& .MuiTableCell-head': {
      color: '#fff',
      fontWeight: 700,
      fontSize: '0.70rem',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      borderRight: '1px solid rgba(255,255,255,0.12)',
      '&:last-child': { borderRight: 'none' },
      py: 1.25,
    },
  },
  tableRow: (idx: number) => ({
    background: idx % 2 === 0 ? '#f4f7fb' : '#fff',
    '&:hover': { background: '#e8f0fe' },
    '& .MuiTableCell-body': {
      fontSize: '0.81rem',
      borderRight: '1px solid #e0e7ef',
      '&:last-child': { borderRight: 'none' },
      py: 1,
    },
  }),
  psMetricLabel: {
    color: '#546e7a',
    fontSize: '0.70rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    fontWeight: 600,
    mb: 0.25,
  },
  psMetricValue: (color?: string) => ({
    fontWeight: 700,
    fontSize: '1.35rem',
    color: color ?? '#1e3a5f',
    lineHeight: 1,
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusChip = (status: string) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const GEDDashboardTab: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slaData, setSlaData] = useState<SlaSlice[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [paperStreamStatus, setPaperStreamStatus] = useState<PaperStreamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docsResponse = await LocalAPI.get('/documents/search');
      const docs: any[] = Array.isArray(docsResponse.data) ? docsResponse.data : [];

      // ── PaperStream stats ────────────────────────────────────────────────
      const paperStreamDocs = docs.filter((d) => d.batchId);
      const psProcessed = paperStreamDocs.length;
      const psQuarantined = paperStreamDocs.filter((d) => d.ingestStatus === 'QUARANTINED').length;
      const psSuccess = psProcessed - psQuarantined;
      const psSuccessRate = psProcessed > 0 ? (psSuccess / psProcessed) * 100 : 0;

      let psStatus: PaperStreamStatus = {
        status: psProcessed > 0 ? 'active' : 'inactive',
        watcherActive: psProcessed > 0,
        totalProcessed: psProcessed,
        totalQuarantined: psQuarantined,
        successRate: psSuccessRate,
      };

      if (AUTHORIZED_PS_ROLES.includes(user?.role ?? '')) {
        try {
          const psResponse = await LocalAPI.get('/documents/paperstream/status');
          psStatus = { ...psResponse.data, ...psStatus };
        } catch {
          // non-fatal — calculated stats are sufficient fallback
        }
      }

      // ── SLA calculation ──────────────────────────────────────────────────
      const now = Date.now();
      let onTime = 0, atRisk = 0, overdue = 0;

      docs.forEach((doc) => {
        const hours = (now - new Date(doc.uploadedAt).getTime()) / 3_600_000;
        if (doc.status === 'TRAITE' || doc.status === 'SCANNE') {
          onTime++;
        } else if (hours > SLA_THRESHOLD_H) {
          overdue++;
        } else if (hours > WARNING_THRESHOLD_H) {
          atRisk++;
        } else {
          onTime++;
        }
      });

      const totalDocs = docs.length;
      const inProgress = docs.filter((d) => d.status === 'EN_COURS' || d.status === 'UPLOADED').length;
      // Fix: keep as number for LinearProgress compatibility
      const slaCompliance = totalDocs > 0 ? (onTime / totalDocs) * 100 : 0;

      setStats({ totalDocs, inProgress, overdue, slaCompliance });

      setSlaData([
        { name: 'À temps',  value: totalDocs > 0 ? Math.round((onTime  / totalDocs) * 100) : 0, color: '#4caf50' },
        { name: 'À risque', value: totalDocs > 0 ? Math.round((atRisk  / totalDocs) * 100) : 0, color: '#ff9800' },
        { name: 'En retard',value: totalDocs > 0 ? Math.round((overdue / totalDocs) * 100) : 0, color: '#f44336' },
      ]);

      setRecentDocs(
        docs.slice(0, 5).map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
          status: doc.status ?? 'UPLOADED',
          batchId: doc.batchId,
          operatorId: doc.operatorId,
          ingestStatus: doc.ingestStatus,
        })),
      );

      setPaperStreamStatus(psStatus);
    } catch {
      setError('Impossible de charger les données du tableau de bord.');
      setStats({ totalDocs: 0, inProgress: 0, overdue: 0, slaCompliance: 0 });
      setSlaData([]);
      setRecentDocs([]);
      setPaperStreamStatus({ status: 'inactive', watcherActive: false, totalProcessed: 0, totalQuarantined: 0, successRate: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.role]); // fix: include user.role so effect re-runs if auth changes

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300} gap={2}>
        <CircularProgress size={36} sx={{ color: '#1e3a5f' }} />
        <Typography sx={{ color: '#546e7a', fontSize: '0.85rem' }}>
          Chargement des données GED…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        sx={{
          background: '#fdecea',
          border: '1px solid #ef9a9a',
          borderLeft: '4px solid #f44336',
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography sx={{ color: '#b71c1c', fontWeight: 600, fontSize: '0.88rem' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  if (!stats) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map(({ key, label, sub, icon: Icon, accent, bg }) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card sx={sx.kpiCard(accent, bg)}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box sx={sx.iconCircle(bg, accent)}>
                    <Icon sx={{ color: accent, fontSize: 22 }} />
                  </Box>
                  <Typography
                    sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8 }}
                  >
                    {label}
                  </Typography>
                </Box>
                <Typography sx={sx.kpiValue(accent)}>
                  {stats[key]}
                </Typography>
                <Typography sx={sx.kpiSub}>{sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* SLA Compliance card — special with progress bar */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={sx.kpiCard('#4caf50', '#e6f4ed')}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={sx.iconCircle('#e6f4ed', '#4caf50')}>
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 22 }} />
                </Box>
                <Typography
                  sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8 }}
                >
                  SLA Compliance
                </Typography>
              </Box>
              <Typography sx={sx.kpiValue('#4caf50')}>
                {stats.slaCompliance.toFixed(1)}%
              </Typography>
              {/* Fix: value is now a number */}
              <LinearProgress
                variant="determinate"
                value={Math.min(stats.slaCompliance, 100)}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  background: '#a5d6a7',
                  '& .MuiLinearProgress-bar': { background: '#1b6b3a' },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* SLA Distribution Donut */}
        <Grid item xs={12} md={6}>
          <Card sx={sx.sectionCard}>
            <Typography sx={sx.sectionTitle}>Répartition SLA</Typography>
            <Divider sx={{ mb: 2, borderColor: '#e0e7ef' }} />
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={slaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {slaData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, '']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e0e7ef',
                    fontSize: '0.78rem',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
              {slaData.map((item) => (
                <Box key={item.name} display="flex" alignItems="center" gap={0.75}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.78rem', color: '#546e7a' }}>
                    {item.name}:{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                      {item.value}%
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>

        {/* PaperStream Status */}
        <Grid item xs={12} md={6}>
          <Card sx={sx.sectionCard}>
            <Box display="flex" alignItems="center" gap={1} mb={0}>
              <ScannerIcon
                sx={{
                  color: paperStreamStatus?.watcherActive ? '#1b6b3a' : '#b71c1c',
                  fontSize: 20,
                }}
              />
              <Typography sx={sx.sectionTitle} mb={0}>
                Intégration PaperStream
              </Typography>
              <Box ml="auto">
                <Chip
                  label={paperStreamStatus?.watcherActive ? 'Actif' : 'Inactif'}
                  color={paperStreamStatus?.watcherActive ? 'success' : 'error'}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                />
              </Box>
            </Box>
            <Divider sx={{ my: 2, borderColor: '#e0e7ef' }} />
            <Grid container spacing={2}>
              {[
                {
                  label: 'Taux de succès',
                  value: `${paperStreamStatus?.successRate?.toFixed(1) ?? 0}%`,
                  color: '#1b6b3a',
                },
                {
                  label: 'Lots traités',
                  value: paperStreamStatus?.totalProcessed ?? 0,
                  color: '#1e3a5f',
                },
                {
                  label: 'Quarantaine',
                  // Fix: was comparing possibly-null with > 0 for color prop
                  value: paperStreamStatus?.totalQuarantined ?? 0,
                  color: (paperStreamStatus?.totalQuarantined ?? 0) > 0 ? '#b71c1c' : '#1e3a5f',
                },
                {
                  label: 'Statut système',
                  value: paperStreamStatus?.status ?? '-',
                  color: '#546e7a',
                },
              ].map(({ label, value, color }) => (
                <Grid item xs={6} key={label}>
                  <Box
                    sx={{
                      background: '#f4f7fb',
                      border: '1px solid #e0e7ef',
                      borderRadius: 1.5,
                      p: 1.5,
                    }}
                  >
                    <Typography sx={sx.psMetricLabel}>{label}</Typography>
                    <Typography sx={sx.psMetricValue(color)}>{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* ── Recent Documents Table ───────────────────────────────────────── */}
      <Card sx={sx.sectionCard}>
        <Typography sx={sx.sectionTitle}>Documents Récents</Typography>
        <Divider sx={{ mb: 0, borderColor: '#e0e7ef' }} />
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 680 }}>
            <TableHead sx={sx.tableHeader}>
              <TableRow>
                {['Nom', 'Type', 'Date Upload', 'Statut', 'PaperStream'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#546e7a', fontSize: '0.82rem' }}>
                    Aucun document récent
                  </TableCell>
                </TableRow>
              ) : (
                recentDocs.map((doc, idx) => (
                  <TableRow key={doc.id} sx={sx.tableRow(idx)}>
                    <TableCell sx={{ fontWeight: 500, color: '#1e3a5f', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#546e7a',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {doc.type}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#546e7a', fontSize: '0.78rem' }}>
                      {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{getStatusChip(doc.status)}</TableCell>
                    <TableCell>
                      {doc.batchId ? (
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          <Chip
                            label={`Lot: ${doc.batchId}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.68rem', borderColor: '#90caf9', color: '#0d47a1' }}
                          />
                          {doc.operatorId && (
                            <Chip
                              label={`Op: ${doc.operatorId}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.68rem', borderColor: '#cfd8dc', color: '#546e7a' }}
                            />
                          )}
                          {doc.ingestStatus && (
                            <Chip
                              label={doc.ingestStatus}
                              size="small"
                              color={doc.ingestStatus === 'INGESTED' ? 'success' : 'default'}
                              sx={{ fontSize: '0.68rem' }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#cfd8dc', fontSize: '0.78rem' }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
};

export default GEDDashboardTab;