import React from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
  AccessTime,
} from '@mui/icons-material';
import 'chart.js/auto';

import { useReclamationStats } from '../../hooks/useReclamationStats';
import { useReclamationTrend } from '../../hooks/useReclamationTrend';
import { useReclamationAlerts } from '../../hooks/useReclamationAlerts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeverityBucket {
  severity: string;
  _count: { id: number };
}

interface TypeBucket {
  type: string;
  _count: { id: number };
}

interface ReclamationStats {
  total: number;
  resolved: number;
  open: number;
  avgResolution?: number;
  byType?: TypeBucket[];
  bySeverity?: SeverityBucket[];
}

interface TrendEntry {
  date: string;
  count: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY = '#1e3a5f';
const CARD_BORDER = '1px solid rgba(0,0,0,0.08)';
const CARD_HOVER_SHADOW = '0 4px 20px rgba(0,0,0,0.10)';

const CHART_COLORS = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
const SEVERITY_COLORS: Record<string, string> = {
  faible: '#4CAF50',
  moyenne: '#FF9800',
  critique: '#F44336',
  default: '#9E9E9E',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeSeverityLabel = (raw: string): string => {
  const s = raw?.toLowerCase() ?? '';
  if (['low', 'faible', 'basse'].includes(s)) return 'Faible';
  if (['medium', 'moyenne', 'moyen'].includes(s)) return 'Moyenne';
  if (['high', 'haute', 'critical', 'critique'].includes(s)) return 'Critique';
  return raw || 'Non spécifié';
};

const severityColor = (label: string): string => {
  const key = label.toLowerCase();
  return SEVERITY_COLORS[key] ?? SEVERITY_COLORS.default;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  subtitle?: string;
  badge?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, subtitle, badge }) => (
  <Card
    elevation={0}
    sx={{
      border: CARD_BORDER,
      borderLeft: `4px solid`,
      borderLeftColor: `${color}.main`,
      borderRadius: 2,
      height: '100%',
      '&:hover': { boxShadow: CARD_HOVER_SHADOW },
      transition: 'box-shadow 0.2s',
    }}
  >
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Box flex={1} minWidth={0}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              fontWeight: 600,
              display: 'block',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: `${color}.main`, lineHeight: 1, mb: 0.5 }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {badge && (
            <Chip
              label={badge}
              size="small"
              color={color}
              variant="outlined"
              sx={{ mt: 1, fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
        <Box
          sx={{
            position: 'relative',
            width: 44,
            height: 44,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: `${color}.main`,
              opacity: 0.09,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: `${color}.main`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const LoadingSkeleton: React.FC = () => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <Card elevation={0} sx={{ border: CARD_BORDER, borderRadius: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={44} sx={{ my: 0.5 }} />
            <Skeleton variant="text" width="80%" height={16} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

interface EmptyChartProps {
  primary: string;
  secondary?: string;
}

const EmptyChart: React.FC<EmptyChartProps> = ({ primary, secondary }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    gap={0.5}
    sx={{ bgcolor: '#f4f7fb', borderRadius: 1 }}
  >
    <Typography variant="body2" color="text.secondary">
      {primary}
    </Typography>
    {secondary && (
      <Typography variant="caption" color="text.secondary">
        {secondary}
      </Typography>
    )}
  </Box>
);

// ─── Chart options ────────────────────────────────────────────────────────────

const PIE_OPTIONS = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: { legend: { position: 'bottom' as const } },
} as const;

const BAR_OPTIONS = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
} as const;

const LINE_OPTIONS = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: { legend: { position: 'bottom' as const } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
} as const;

// ─── Main component ───────────────────────────────────────────────────────────

export const ReclamationDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useReclamationStats() as {
    data: ReclamationStats | undefined;
    isLoading: boolean;
    error: unknown;
  };
  const { data: trendData, isLoading: trendLoading } = useReclamationTrend() as {
    data: TrendEntry[] | undefined;
    isLoading: boolean;
  };
  const { data: slaBreaches } = useReclamationAlerts() as {
    data: unknown[] | undefined;
  };

  // ── Trend chart data ───────────────────────────────────────────────────────

  const chartTrendData = React.useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [
          {
            label: 'Réclamations reçues',
            data: [0],
            fill: false,
            borderColor: '#36A2EB',
            backgroundColor: '#36A2EB',
            tension: 0.3,
          },
        ],
      };
    }

    const sorted = [...trendData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sorted.map((d) =>
        new Date(d.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Réclamations reçues',
          data: sorted.map((d) => d.count),
          fill: false,
          borderColor: NAVY,
          backgroundColor: NAVY,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [trendData]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingSkeleton />
        <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
          <CircularProgress size={28} />
        </Box>
      </Box>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }} icon={<ErrorIcon />}>
        <Typography variant="body2">
          Erreur lors du chargement des statistiques&nbsp;:{' '}
          {error instanceof Error ? error.message : 'Erreur inconnue'}
        </Typography>
      </Alert>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            Aucune donnée de réclamation disponible pour le moment.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ── Derived metrics ────────────────────────────────────────────────────────

  const slaCompliance =
    stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0';
  const slaComplianceNum = parseFloat(slaCompliance);

  const avgResolutionDays = stats.avgResolution
    ? (stats.avgResolution / (24 * 60 * 60 * 1000)).toFixed(1)
    : '0';

  const urgentCount =
    stats.bySeverity?.find(
      (s) => ['critical', 'critique', 'high', 'haute'].includes(s.severity?.toLowerCase() ?? '')
    )?._count?.id ?? 0;

  const inProgress = Math.max(0, stats.total - stats.resolved - stats.open);

  // ── Chart datasets ─────────────────────────────────────────────────────────

  const hasTypeData = (stats.byType?.length ?? 0) > 0;
  const hasSeverityData = (stats.bySeverity?.length ?? 0) > 0;

  const typeChartData = hasTypeData
    ? {
        labels: stats.byType!.map((t) => t.type || 'Non spécifié'),
        datasets: [
          {
            label: 'Réclamations par type',
            data: stats.byType!.map((t) => t._count?.id ?? 0),
            backgroundColor: CHART_COLORS,
            borderWidth: 1,
          },
        ],
      }
    : null;

  const severityLabels = (stats.bySeverity ?? []).map((s) =>
    normalizeSeverityLabel(s.severity)
  );

  const severityChartData = hasSeverityData
    ? {
        labels: severityLabels,
        datasets: [
          {
            label: 'Réclamations par gravité',
            data: stats.bySeverity!.map((s) => s._count?.id ?? 0),
            backgroundColor: severityLabels.map(severityColor),
            borderWidth: 1,
          },
        ],
      }
    : null;

  const statusChartData = {
    labels: ['Ouvertes', 'En cours', 'Résolues'],
    datasets: [
      {
        label: 'Statut des réclamations',
        data: [stats.open ?? 0, inProgress, stats.resolved ?? 0],
        backgroundColor: ['#FF9800', '#2196F3', '#4CAF50'],
        borderWidth: 1,
      },
    ],
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total ce mois"
            value={stats.total ?? 0}
            icon={<TrendingUp fontSize="large" />}
            color="primary"
            subtitle="Réclamations reçues"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Conformité SLA"
            value={`${slaCompliance} %`}
            icon={<CheckCircle fontSize="large" />}
            color={
              slaComplianceNum >= 95
                ? 'success'
                : slaComplianceNum >= 80
                ? 'warning'
                : 'error'
            }
            subtitle="Objectif : 95 %"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Temps moyen"
            value={`${avgResolutionDays} j`}
            icon={<Schedule fontSize="large" />}
            color="info"
            subtitle="Résolution moyenne"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Urgentes"
            value={urgentCount}
            icon={<Warning fontSize="large" />}
            color={urgentCount > 5 ? 'error' : urgentCount > 0 ? 'warning' : 'success'}
            subtitle="Réclamations critiques"
          />
        </Grid>
      </Grid>

      {/* ── Dynamic alerts ───────────────────────────────────────────────── */}
      {(slaBreaches?.length ?? 0) > 0 && (
        <Alert severity="error" icon={<AccessTime />}>
          <strong>SLA dépassé&nbsp;:</strong>{' '}
          {slaBreaches!.length} réclamation
          {slaBreaches!.length > 1 ? 's ont' : ' a'} dépassé leur délai de traitement.
        </Alert>
      )}

      {urgentCount > 0 && (
        <Alert severity={urgentCount > 5 ? 'error' : 'warning'}>
          <strong>{urgentCount > 5 ? 'Urgent :' : 'Attention :'}</strong>{' '}
          {urgentCount} réclamation{urgentCount > 1 ? 's' : ''} critique
          {urgentCount > 1 ? 's' : ''} nécessite{urgentCount > 1 ? 'nt' : ''} une
          attention immédiate.
        </Alert>
      )}

      {slaComplianceNum < 95 && (
        <Alert severity={slaComplianceNum < 80 ? 'error' : 'warning'}>
          <strong>SLA {slaComplianceNum < 80 ? 'critique' : 'en danger'} :</strong>{' '}
          La conformité SLA est de {slaCompliance} %,{' '}
          {slaComplianceNum < 80 ? 'bien en dessous' : 'en dessous'} de l'objectif de
          95 %.
        </Alert>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Type breakdown */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: CARD_BORDER, borderRadius: 2, '&:hover': { boxShadow: CARD_HOVER_SHADOW }, transition: 'box-shadow 0.2s' }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>
                Répartition par type
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                {hasTypeData && typeChartData ? (
                  <Pie data={typeChartData} options={PIE_OPTIONS} />
                ) : (
                  <EmptyChart
                    primary="Aucune donnée de type disponible"
                    secondary="Les données apparaîtront après la création de réclamations"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Severity breakdown */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: CARD_BORDER, borderRadius: 2, '&:hover': { boxShadow: CARD_HOVER_SHADOW }, transition: 'box-shadow 0.2s' }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>
                Répartition par gravité
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                {hasSeverityData && severityChartData ? (
                  <Pie data={severityChartData} options={PIE_OPTIONS} />
                ) : (
                  <EmptyChart
                    primary="Aucune donnée de gravité disponible"
                    secondary="Les données apparaîtront après la création de réclamations"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status bar chart */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: CARD_BORDER, borderRadius: 2, '&:hover': { boxShadow: CARD_HOVER_SHADOW }, transition: 'box-shadow 0.2s' }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>
                Statut des réclamations
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Bar data={statusChartData} options={BAR_OPTIONS} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend line chart */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: CARD_BORDER, borderRadius: 2, '&:hover': { boxShadow: CARD_HOVER_SHADOW }, transition: 'box-shadow 0.2s' }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>
                Tendance des réclamations
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                {trendLoading ? (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    gap={1.5}
                  >
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Chargement des tendances…
                    </Typography>
                  </Box>
                ) : trendData && trendData.length > 0 ? (
                  <Line data={chartTrendData} options={LINE_OPTIONS} />
                ) : (
                  <EmptyChart
                    primary="Aucune donnée de tendance disponible"
                    secondary="Vérifiez que le serveur est démarré"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReclamationDashboard;