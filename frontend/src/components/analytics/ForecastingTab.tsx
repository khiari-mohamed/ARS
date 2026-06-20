import React, { useEffect, useState, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { LocalAPI } from '../../services/axios';
import {
  getAdvancedClustering,
  getSophisticatedAnomalyDetection,
  generateExecutiveReport,
} from '../../services/analyticsService';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannedVsActualEntry {
  period: string;
  planned: number;
  actual: number;
}

interface ForecastKpis {
  nextWeekForecast: number;
  nextMonthForecast: number;
  recommendedStaff: number;
  currentStaff: number;
  accuracy: number;
}

interface ForecastData {
  forecast: {
    nextWeek: number;
    nextMonth: number;
    recommendedStaff: number;
    currentStaff: number;
    accuracy: number;
  };
  plannedVsActual: PlannedVsActualEntry[];
  aiRecommendations: string[];
  resourcePlanning: unknown[];
  trends: unknown[];
}

interface AdvancedAnalytics {
  clustering: unknown;
  anomalies: unknown;
  criticalClusters: unknown[];
  highAnomalies: unknown[];
}

interface Props {
  filters: any;
  dateRange: any;
}

// ─── Design tokens (aligned with ARS design system) ──────────────────────────

const NAVY = '#1e3a5f';
const CARD_BORDER = '1px solid rgba(0,0,0,0.08)';
const CARD_HOVER_SHADOW = '0 4px 20px rgba(0,0,0,0.10)';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StaffingStatus {
  gap: number;
  recommended: number;
  current: number;
  weeklyForecast: number;
}

const StaffingCard: React.FC<StaffingStatus> = ({
  gap,
  recommended,
  current,
  weeklyForecast,
}) => {
  const isShortfall = gap > 0;
  const isSurplus = gap < 0;

  const bgColor = isShortfall
    ? 'error.main'
    : isSurplus
    ? 'success.main'
    : 'info.main';

  const headline = isShortfall
    ? 'Recrutement urgent'
    : isSurplus
    ? 'Sureffectif détecté'
    : 'Effectif optimal';

  const subline = isShortfall
    ? `${gap} gestionnaire(s) manquant(s)`
    : isSurplus
    ? `${Math.abs(gap)} gestionnaire(s) en excès`
    : 'Effectif adapté à la charge';

  const HeadlineIcon = isShortfall
    ? WarningIcon
    : isSurplus
    ? AssessmentIcon
    : CheckCircleOutlineIcon;

  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: bgColor,
        color: 'white',
        border: CARD_BORDER,
        borderRadius: 2,
        '&:hover': { boxShadow: CARD_HOVER_SHADOW },
        transition: 'box-shadow 0.2s',
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box display="flex" alignItems="flex-start" gap={1.5} sx={{ mb: 1 }}>
              <PeopleIcon sx={{ fontSize: 36, mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <HeadlineIcon sx={{ fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {headline}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.92 }}>
                  {subline}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Actuel&nbsp;: {current} gestionnaire(s) &nbsp;·&nbsp; Requis&nbsp;:{' '}
              {recommended} gestionnaire(s)
            </Typography>
            {recommended > 0 && (
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.75 }}>
                Charge prévue&nbsp;:{' '}
                {Math.round(weeklyForecast / recommended)} dossiers / gestionnaire
              </Typography>
            )}
          </Grid>

          {isShortfall && (
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.18)',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
                  +{gap}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Action requise
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ForecastingTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastKpis, setForecastKpis] = useState<ForecastKpis | null>(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [plannedLoading, setPlannedLoading] = useState(false);

  // Advanced analytics load is non-blocking — fires after core data is ready.
  const loadAdvancedAnalytics = useCallback(async () => {
    try {
      const [clusteringResponse, anomalyResponse] = await Promise.all([
        getAdvancedClustering().catch(() => ({ clusters: [] })),
        getSophisticatedAnomalyDetection().catch(() => ({ anomalies: [] })),
        generateExecutiveReport({ report_type: 'performance', time_period: '7d' }).catch(
          () => ({ executive_summary: null })
        ),
      ]);

      setAdvancedAnalytics({
        clustering: clusteringResponse,
        anomalies: anomalyResponse,
        criticalClusters:
          (clusteringResponse as { clusters?: { severity: string }[] }).clusters?.filter(
            (c) => c.severity === 'critical'
          ) ?? [],
        highAnomalies:
          (anomalyResponse as { anomalies?: { severity: string }[] }).anomalies?.filter(
            (a) => a.severity === 'high'
          ) ?? [],
      });
    } catch (err) {
      console.warn('Advanced analytics failed to load:', err);
    }
  }, []);

  const loadForecastData = useCallback(async () => {
    try {
      setLoading(true);

      const [forecastResponse, recommendationsResponse, currentStaffResponse] =
        await Promise.all([
          LocalAPI.get('/analytics/forecast'),
          LocalAPI.get('/analytics/recommendations'),
          LocalAPI.get('/analytics/current-staff'),
        ]);

      const forecastData = forecastResponse.data;
      const recommendationsData = recommendationsResponse.data;
      const currentStaff: number = currentStaffResponse.data.count ?? 0;

      const nextWeekForecast: number = forecastData.nextWeekForecast ?? 0;
      const nextMonthForecast: number = Math.round(nextWeekForecast * 4.3);
      const recommendedStaff: number = recommendationsData.neededStaff ?? 0;
      const accuracy: number =
        forecastData.modelPerformance?.accuracy ??
        100 - (forecastData.modelPerformance?.mape ?? 0);

      setForecastKpis({
        nextWeekForecast,
        nextMonthForecast,
        recommendedStaff,
        currentStaff,
        accuracy,
      });

      const [plannedVsActualResponse, aiRecommendationsResponse, resourcePlanningResponse] =
        await Promise.all([
          // Ensure the backend receives selected filters/date range so the chart updates
          LocalAPI.get('/analytics/planned-vs-actual', { params: { ...(filters ?? {}), ...(dateRange ?? {}) } }),
          // AI recommendations may also be scoped by filters
          LocalAPI.get('/analytics/ai-recommendations', { params: { ...(filters ?? {}) } }),
          LocalAPI.get('/analytics/resource-planning', { params: { ...(filters ?? {}), ...(dateRange ?? {}) } }),
        ]);

        

      setData({
        forecast: {
          nextWeek: nextWeekForecast,
          nextMonth: nextMonthForecast,
          recommendedStaff,
          currentStaff,
          accuracy,
        },
        plannedVsActual: plannedVsActualResponse.data ?? [],
        aiRecommendations: aiRecommendationsResponse.data.recommendations ?? [],
        resourcePlanning: resourcePlanningResponse.data ?? [],
        trends: forecastData.history ?? [],
      });

      loadAdvancedAnalytics();
    } catch (err) {
      console.error('Failed to load forecast data:', err);
      setData({
        forecast: {
          nextWeek: 0,
          nextMonth: 0,
          recommendedStaff: 0,
          currentStaff: 0,
          accuracy: 0,
        },
        plannedVsActual: [],
        aiRecommendations: [],
        resourcePlanning: [],
        trends: [],
      });
    } finally {
      setLoading(false);
    }
  }, [filters, dateRange, loadAdvancedAnalytics]);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  const fetchPlannedVsActual = useCallback(
    async (unfiltered = false) => {
      setPlannedLoading(true);
      
      try {
        const params = unfiltered ? {} : { ...(filters ?? {}), ...(dateRange ?? {}) };

        const res = await LocalAPI.get('/analytics/planned-vs-actual', { params });
        const planned = res.data ?? [];
        

        setData((prev) =>
          prev
            ? { ...prev, plannedVsActual: planned }
            : {
                forecast: {
                  nextWeek: 0,
                  nextMonth: 0,
                  recommendedStaff: 0,
                  currentStaff: 0,
                  accuracy: 0,
                },
                plannedVsActual: planned,
                aiRecommendations: [],
                resourcePlanning: [],
                trends: [],
              }
        );
      } catch (err) {
        console.error('Failed to refresh planned vs actual:', err);
      } finally {
        setPlannedLoading(false);
      }
    },
    [filters, dateRange]
  );

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
        gap={2}
      >
        <CircularProgress size={28} />
        <Typography variant="body1" color="text.secondary">
          Chargement des prévisions…
        </Typography>
      </Box>
    );
  }

  // ── Error / empty state ────────────────────────────────────────────────────

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="warning"
          action={
            <Button size="small" onClick={loadForecastData}>
              Réessayer
            </Button>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Initialisation du service de prévisions en cours
          </Typography>
          <Typography variant="body2">
            Les données ne sont pas encore disponibles. Veuillez réessayer dans quelques
            instants.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const staffingGap =
    (forecastKpis?.recommendedStaff ?? 0) - (forecastKpis?.currentStaff ?? 0);

  const recentPlannedVsActual = data.plannedVsActual.slice(-8);
  const displayPeriodsCount = recentPlannedVsActual.length > 0 ? recentPlannedVsActual.length : Math.min(8, data.plannedVsActual.length || 8);


  // Strip emoji prefixes from AI recommendation strings
  const cleanRecommendation = (rec: string): string =>
    rec.replace(/📊|💡|🟠|🚨|⚠️/g, '').trim();

  const recommendationSeverity = (
    rec: string
  ): 'error' | 'warning' | 'info' => {
    if (rec.includes('🚨') || rec.toLowerCase().includes('critique')) return 'error';
    if (rec.includes('⚠️') || rec.includes('🟠')) return 'warning';
    return 'info';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={3}>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      {forecastKpis && (
        <Grid item xs={12}>
          <Grid container spacing={2}>

            {/* Weekly forecast */}
            <Grid item xs={12} sm={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: NAVY,
                  color: 'white',
                  border: CARD_BORDER,
                  borderRadius: 2,
                  height: '100%',
                  '&:hover': { boxShadow: CARD_HOVER_SHADOW },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, lineHeight: 1, mb: 0.25 }}
                      >
                        {forecastKpis.nextWeekForecast}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
                        dossiers attendus cette semaine
                      </Typography>
                      <Chip
                        label={`Fiabilité ${Math.round(forecastKpis.accuracy)} %`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.15)',
                          color: 'white',
                          fontSize: '0.72rem',
                          height: 22,
                        }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                        ≈ {Math.round(forecastKpis.nextWeekForecast / 5)} dossiers / jour
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly forecast */}
            <Grid item xs={12} sm={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: 'warning.main',
                  color: 'white',
                  border: CARD_BORDER,
                  borderRadius: 2,
                  height: '100%',
                  '&:hover': { boxShadow: CARD_HOVER_SHADOW },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, lineHeight: 1, mb: 0.25 }}
                      >
                        {forecastKpis.nextMonthForecast}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
                        dossiers prévus ce mois
                      </Typography>
                      <Chip
                        label={`${Math.round(forecastKpis.nextMonthForecast / 4)} / semaine`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.15)',
                          color: 'white',
                          fontSize: '0.72rem',
                          height: 22,
                        }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                        Capacité actuelle&nbsp;: {forecastKpis.currentStaff} gestionnaire(s)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Staffing decision */}
            <Grid item xs={12}>
              <StaffingCard
                gap={staffingGap}
                recommended={data.forecast.recommendedStaff}
                current={forecastKpis.currentStaff}
                weeklyForecast={forecastKpis.nextWeekForecast}
              />
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* ── Advanced analytics badges (non-blocking) ────────────────────── */}
      {advancedAnalytics &&
        (advancedAnalytics.criticalClusters.length > 0 ||
          advancedAnalytics.highAnomalies.length > 0) && (
          <Grid item xs={12}>
            <Box display="flex" gap={1} flexWrap="wrap">
              {advancedAnalytics.criticalClusters.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${advancedAnalytics.criticalClusters.length} cluster(s) critique(s) détecté(s)`}
                  color="error"
                  variant="outlined"
                  size="small"
                />
              )}
              {advancedAnalytics.highAnomalies.length > 0 && (
                <Chip
                  icon={<AssessmentIcon />}
                  label={`${advancedAnalytics.highAnomalies.length} anomalie(s) haute sévérité`}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Grid>
        )}

      {/* ── Planned vs Actual chart ──────────────────────────────────────── */}
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: CARD_BORDER,
            borderRadius: 2,
            '&:hover': { boxShadow: CARD_HOVER_SHADOW },
            transition: 'box-shadow 0.2s',
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}
          >
            Évolution de la charge de travail
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Charge planifiée vs réalisée sur les {displayPeriodsCount} dernières périodes
          </Typography>

          {recentPlannedVsActual.length === 0 ? (
            <Box
              sx={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f4f7fb',
                borderRadius: 1,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune donnée disponible pour la période sélectionnée.
                </Typography>
                {(dateRange as any)?.fromDate || (dateRange as any)?.toDate ? (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Période demandée: {(dateRange as any)?.fromDate || '—'} → {(dateRange as any)?.toDate || '—'}
                  </Typography>
                ) : null}
                <Button
                  size="small"
                  onClick={() => fetchPlannedVsActual(true)}
                  sx={{ mt: 1 }}
                  disabled={plannedLoading}
                >
                  {plannedLoading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    'Afficher toutes les périodes'
                  )}
                </Button>
              </Box>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={recentPlannedVsActual}
                margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ef" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: '#546e7a' }}
                  label={{
                    value: 'Période',
                    position: 'insideBottom',
                    offset: -16,
                    fontSize: 12,
                    fill: '#546e7a',
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#546e7a' }}
                  label={{
                    value: 'Dossiers',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    fontSize: 12,
                    fill: '#546e7a',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e0e7ef',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`${value} dossiers`]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 20, fontSize: 13 }}
                  iconType="rect"
                />
                <Bar
                  dataKey="planned"
                  fill={NAVY}
                  name="Planifié"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="actual"
                  fill="#4caf50"
                  name="Réalisé"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Grid>

      {/* ── AI Recommendations ──────────────────────────────────────────── */}
      {data.aiRecommendations.length > 0 && (
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              border: CARD_BORDER,
              borderRadius: 2,
              bgcolor: '#f4f7fb',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
              <AutoAwesomeIcon sx={{ color: NAVY, fontSize: 26 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>
                Actions prioritaires recommandées
              </Typography>
            </Box>

            <Grid container spacing={1.5}>
              {data.aiRecommendations.slice(0, 3).map((rec, index) => {
                const severity = recommendationSeverity(rec);
                const clean = cleanRecommendation(rec);

                const IconComponent =
                  severity === 'error'
                    ? WarningIcon
                    : severity === 'warning'
                    ? AssessmentIcon
                    : TrendingUpIcon;

                return (
                  <Grid item xs={12} key={index}>
                    <Alert
                      severity={severity}
                      icon={<IconComponent fontSize="inherit" />}
                      sx={{
                        borderRadius: 1.5,
                        '& .MuiAlert-message': { width: '100%' },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {clean}
                      </Typography>
                    </Alert>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default ForecastingTab;