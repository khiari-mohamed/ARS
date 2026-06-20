import React, { useState, useEffect } from 'react';
import {
  Paper, Grid, Card, CardContent, Typography,
  LinearProgress, Chip, Box, CircularProgress,
} from '@mui/material';
import TrendingUpIcon      from '@mui/icons-material/TrendingUp';
import AssignmentIcon      from '@mui/icons-material/Assignment';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import ErrorIcon           from '@mui/icons-material/Error';
import NotificationsIcon   from '@mui/icons-material/Notifications';
import { LocalAPI } from '../../services/axios';

interface KPIData {
  slaCompliance: number;
  totalBordereaux: number;
  avgProcessingTime: number;
  rejectionRate: number;
  activeAlerts: number;
}

interface GlobalKPIHeaderProps {
  filters?: any;
  dateRange?: any;
}

const NAVY = '#1e3a5f';

const getSLAAccent  = (v: number) => v >= 90 ? '#4caf50' : v >= 80 ? '#ff9800' : '#f44336';
const getSLAMUI     = (v: number): 'success' | 'warning' | 'error' =>
  v >= 90 ? 'success' : v >= 80 ? 'warning' : 'error';
const getAlertAccent = (v: number) => v === 0 ? '#4caf50' : v <= 5 ? '#ff9800' : '#f44336';

const GlobalKPIHeader: React.FC<GlobalKPIHeaderProps> = ({ filters = {}, dateRange = {} }) => {
  const [kpis, setKpis]           = useState<KPIData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadKPIData = async () => {
    try {
      const params = {
        ...dateRange,
        clientId:  filters.clientId,
        slaStatus: filters.slaStatus,
      };

      const [kpiResponse, alertsResponse, slaResponse] = await Promise.all([
        LocalAPI.get('/analytics/kpis/daily',    { params }),
        LocalAPI.get('/analytics/alerts',         { params }),
        LocalAPI.get('/analytics/sla/dashboard',  { params }),
      ]);

      const kpiData   = kpiResponse.data;
      const alertData = alertsResponse.data;
      const slaData   = slaResponse.data;

      const totalBordereaux   = kpiData.totalCount     || 0;
      const processedCount    = kpiData.processedCount || 0;
      const enAttenteCount    = kpiData.enAttenteCount || 0;
      const avgProcessingTime = kpiData.avgDelay       || 0;
      const slaCompliance     = Math.round(slaData.overview?.complianceRate || 0);
      const rejectedCount     = Math.max(0, totalBordereaux - processedCount - enAttenteCount);
      const rejectionRate     = totalBordereaux > 0
        ? Math.round((rejectedCount / totalBordereaux) * 100) : 0;
      const criticalAlerts    = Array.isArray(alertData.critical) ? alertData.critical.length : 0;
      const warningAlerts     = Array.isArray(alertData.warning)  ? alertData.warning.length  : 0;
      const activeAlerts      = criticalAlerts + warningAlerts;

      setKpis({ slaCompliance, totalBordereaux, avgProcessingTime, rejectionRate, activeAlerts });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load KPI data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKPIData(); }, [filters, dateRange]);

  /* ── Loading State ── */
  if (loading || !kpis) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3,
          background: `linear-gradient(135deg, ${NAVY} 0%, #2d5484 100%)`,
          borderRadius: '12px',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={22} sx={{ color: 'rgba(255,255,255,0.75)' }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem' }}>
            Chargement des KPIs en temps réel…
          </Typography>
        </Box>
      </Paper>
    );
  }

  const systemStatus =
    kpis.slaCompliance >= 90 ? { label: 'Optimal',   color: '#4caf50', emoji: '🟢' } :
    kpis.slaCompliance >= 80 ? { label: 'Attention',  color: '#ff9800', emoji: '🟠' } :
                               { label: 'Critique',   color: '#f44336', emoji: '🔴' };

  const cards = [
    {
      title:    'Conformité SLA',
      value:    `${kpis.slaCompliance}%`,
      icon:     <TrendingUpIcon  sx={{ fontSize: 20 }} />,
      accent:   getSLAAccent(kpis.slaCompliance),
      progress: kpis.slaCompliance,
      progressColor: getSLAMUI(kpis.slaCompliance),
    },
    {
      title:  'Bordereaux',
      value:  kpis.totalBordereaux.toLocaleString('fr-FR'),
      icon:   <AssignmentIcon   sx={{ fontSize: 20 }} />,
      accent: '#2196f3',
    },
    {
      title:  'Temps Moyen',
      value:  `${Math.round(kpis.avgProcessingTime)}j`,
      icon:   <AccessTimeIcon   sx={{ fontSize: 20 }} />,
      accent: kpis.avgProcessingTime <= 3 ? '#4caf50' : '#ff9800',
    },
    {
      title:  'Taux de Rejet',
      value:  `${kpis.rejectionRate}%`,
      icon:   <ErrorIcon        sx={{ fontSize: 20 }} />,
      accent: kpis.rejectionRate <= 3 ? '#4caf50' : '#f44336',
    },
    {
      title:  'Alertes Actives',
      value:  kpis.activeAlerts.toString(),
      icon:   <NotificationsIcon sx={{ fontSize: 20 }} />,
      accent: getAlertAccent(kpis.activeAlerts),
      urgent: kpis.activeAlerts > 10,
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        mb: 3,
        background: `linear-gradient(135deg, ${NAVY} 0%, #2d5484 100%)`,
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Title Row ── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 2.5 }}
      >
        <Typography
          sx={{
            fontWeight: 800, color: '#fff',
            fontSize: { xs: '1rem', md: '1.1rem' },
            letterSpacing: '-0.01em',
          }}
        >
          Tableau de Bord Analytics — Vue d'ensemble
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
          Mise à jour :{' '}
          {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Typography>
      </Box>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2}>
        {cards.map((card, i) => (
          <Grid item xs={6} sm={4} md={12 / 5} key={i}>
            <Card
              elevation={0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.97)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.14)',
                borderLeft: `4px solid ${card.accent}`,
                height: '100%',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                  boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.5, md: 2 },
                  '&:last-child': { pb: { xs: 1.5, md: 2 } },
                }}
              >
                {/* Icon + Urgent badge */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
                  <Box
                    sx={{
                      width: 36, height: 36, borderRadius: '50%',
                      bgcolor: `${card.accent}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: card.accent, flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                  {card.urgent && (
                    <Chip
                      label="URGENT" color="error" size="small"
                      sx={{ fontSize: '0.62rem', height: 18, fontWeight: 800 }}
                    />
                  )}
                </Box>

                {/* Label */}
                <Typography
                  variant="caption"
                  sx={{
                    color: '#546e7a', fontSize: '0.68rem',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    display: 'block', mb: 0.5,
                  }}
                >
                  {card.title}
                </Typography>

                {/* Value */}
                <Typography
                  sx={{
                    fontWeight: 800, color: NAVY,
                    fontSize: { xs: '1.35rem', md: '1.6rem' },
                    lineHeight: 1.1,
                  }}
                >
                  {card.value}
                </Typography>

                {/* Optional progress bar */}
                {card.progress !== undefined && (
                  <LinearProgress
                    variant="determinate"
                    value={card.progress}
                    color={card.progressColor as any}
                    sx={{ mt: 1.25, height: 5, borderRadius: 3, bgcolor: `${card.accent}20` }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Status Bar ── */}
      <Box
        sx={{
          mt: 2.5, p: { xs: 1.5, md: 2 },
          bgcolor: 'rgba(255,255,255,0.08)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem' }}>
            {systemStatus.emoji} Système :{' '}
            <strong style={{ color: systemStatus.color }}>{systemStatus.label}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
            · Charge : {kpis.totalBordereaux > 1000 ? 'Élevée' : 'Normale'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
            · Alertes :{' '}
            <strong style={{ color: getAlertAccent(kpis.activeAlerts) }}>
              {kpis.activeAlerts === 0 ? 'Aucune' : `${kpis.activeAlerts} active(s)`}
            </strong>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default GlobalKPIHeader;