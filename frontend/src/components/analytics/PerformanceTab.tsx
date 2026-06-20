import React, { useEffect, useState } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, Box, CircularProgress,
  Card, CardContent, Popover, TextField, Button,
} from '@mui/material';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { LocalAPI } from '../../services/axios';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import SpeedIcon         from '@mui/icons-material/Speed';
import AssessmentIcon    from '@mui/icons-material/Assessment';
import WarningIcon       from '@mui/icons-material/Warning';
import InfoOutlinedIcon  from '@mui/icons-material/InfoOutlined';

interface Props {
  filters: any;
  dateRange: any;
}

const NAVY = '#1e3a5f';

const getSLAAccent = (v: number) => v >= 90 ? '#4caf50' : v >= 80 ? '#ff9800' : '#f44336';

const PerformanceTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData]                         = useState<any>(null);
  const [loading, setLoading]                   = useState(true);
  const [performanceKpis, setPerformanceKpis]   = useState<any>(null);
  const [gestionnaireFilter, setGestionnaireFilter] = useState('');
  const [gestDateRange, setGestDateRange]       = useState({ fromDate: '', toDate: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ fromDate: '', toDate: '' });
  const [anchorEl, setAnchorEl]                 = useState<HTMLElement | null>(null);
  const [selectedGest, setSelectedGest]         = useState<any>(null);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);

      const gestParams: any = {};
      if (appliedDateRange.fromDate)      gestParams.fromDate             = appliedDateRange.fromDate;
      if (appliedDateRange.toDate)        gestParams.toDate               = appliedDateRange.toDate;
      if (filters.gestionnaireId)         gestParams.gestionnaireId       = filters.gestionnaireId;
      if (filters.gestionnaireSeniorId)   gestParams.gestionnaireSeniorId = filters.gestionnaireSeniorId;
      if (filters.chefEquipeId)           gestParams.chefEquipeId         = filters.chefEquipeId;
      if (filters.clientId)               gestParams.clientId             = filters.clientId;

      const apiParams: any = { ...dateRange };
      if (filters.clientId)               apiParams.clientId              = filters.clientId;
      if (filters.slaStatus)              apiParams.slaStatus             = filters.slaStatus;
      if (filters.gestionnaireId)         apiParams.gestionnaireId        = filters.gestionnaireId;
      if (filters.gestionnaireSeniorId)   apiParams.gestionnaireSeniorId  = filters.gestionnaireSeniorId;
      if (filters.chefEquipeId)           apiParams.chefEquipeId          = filters.chefEquipeId;

      const [
        performanceResponse,
        slaResponse,
        kpiResponse,
        gestionnairesDailyResponse,
        alertsResponse,
      ] = await Promise.all([
        LocalAPI.get('/analytics/performance/by-user',              { params: apiParams }),
        LocalAPI.get('/analytics/sla-compliance-by-user',           { params: apiParams }),
        LocalAPI.get('/analytics/kpis/daily',                       { params: apiParams }),
        LocalAPI.get('/analytics/gestionnaires/daily-performance',   { params: gestParams }),
        LocalAPI.get('/analytics/alerts',                            { params: apiParams }),
      ]);

      const performanceData = performanceResponse.data;
      const slaData         = slaResponse.data;
      const kpiData         = kpiResponse.data;
      const alertData       = alertsResponse.data;

      const totalProcessed = performanceData.processedByUser?.reduce(
        (sum: number, user: any) => sum + (user._count?.id || 0), 0,
      ) || 0;

      const totalUsersResponse = await LocalAPI.get('/users/count-active');
      const totalUsers = totalUsersResponse.data.count || 0;

      const activeUsersWithData = slaData.filter((u: any) => u.userName && u.total > 0);
      const avgSlaCompliance    = activeUsersWithData.length > 0
        ? Math.round(
            activeUsersWithData.reduce((s: number, u: any) => s + (u.complianceRate || 0), 0)
            / activeUsersWithData.length,
          )
        : 0;
      const avgProcessingTime = kpiData.avgDelay      || 0;
      const enAttenteCount    = kpiData.enAttenteCount || 0;

      setPerformanceKpis({ totalProcessed, avgSlaCompliance, totalUsers, avgProcessingTime, enAttenteCount });

      const deptPerformanceResponse = await LocalAPI.get('/analytics/performance/by-department', { params: apiParams });
      const departmentPerformance   = deptPerformanceResponse.data || [];

      const volumeTrend = kpiData.bsPerDay?.map((day: any) => ({
        date:   new Date(day.createdAt).toLocaleDateString('fr-FR'),
        volume: day._count?.id || 0,
      })) || [];

      const slaCompliant = alertData.ok?.length       || 0;
      const slaAtRisk    = alertData.warning?.length  || 0;
      const slaOverdue   = alertData.critical?.length || 0;

      const slaDistribution = [
        { name: 'À temps',   value: slaCompliant, color: '#4caf50' },
        { name: 'À risque',  value: slaAtRisk,    color: '#ff9800' },
        { name: 'En retard', value: slaOverdue,   color: '#f44336' },
      ];

      const teamRanking = slaData
        .filter((u: any) => u.userName && u.total > 0)
        .slice(0, 5)
        .map((u: any) => ({
          name:      u.userName,
          processed: u.total,
          slaRate:   Math.round(u.complianceRate),
        }));

      setData({
        departmentPerformance,
        teamRanking,
        userPerformance:              slaData.slice(0, 10),
        gestionnairesDailyPerformance: gestionnairesDailyResponse.data,
        volumeTrend,
        slaDistribution,
      });
    } catch (error) {
      console.error('Failed to load performance data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPerformanceData(); }, [filters, dateRange, appliedDateRange]);

  const handleApplyDateFilter = () => setAppliedDateRange(gestDateRange);
  const handlePopoverOpen = (e: React.MouseEvent<HTMLElement>, gest: any) => {
    setAnchorEl(e.currentTarget);
    setSelectedGest(gest);
  };
  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedGest(null);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400} gap={2}>
        <CircularProgress size={30} />
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Chargement des données de performance…
        </Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography color="text.secondary">Aucune donnée de performance disponible</Typography>
      </Box>
    );
  }

  /* ── KPI card definitions ── */
  const kpiCards = performanceKpis ? [
    {
      label:  'Total Traités',
      value:  performanceKpis.totalProcessed.toLocaleString('fr-FR'),
      icon:   <AssessmentIcon sx={{ fontSize: 20 }} />,
      accent: '#2196f3',
    },
    {
      label:  'SLA Moyen',
      value:  `${performanceKpis.avgSlaCompliance}%`,
      icon:   <TrendingUpIcon sx={{ fontSize: 20 }} />,
      accent: getSLAAccent(performanceKpis.avgSlaCompliance),
    },
    {
      label:  'Temps Moyen',
      value:  `${performanceKpis.avgProcessingTime.toFixed(1)}j`,
      icon:   <SpeedIcon sx={{ fontSize: 20 }} />,
      accent: '#00bcd4',
    },
    {
      label:  'En Attente',
      value:  performanceKpis.enAttenteCount.toLocaleString('fr-FR'),
      icon:   <WarningIcon sx={{ fontSize: 20 }} />,
      accent: '#ff9800',
      sub:    'EN_ATTENTE · A_SCANNER · SCAN_EN_COURS · A_AFFECTER · ASSIGNE',
    },
  ] : [];

  const TABLE_HEADERS = ['Gestionnaire', 'Total Documents', 'Traités', 'Dernières 24h', 'Progression'];

  return (
    <Grid container spacing={3}>

      {/* ─────────────── KPI Cards ─────────────── */}
      {performanceKpis && (
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {kpiCards.map((card, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderLeft: `4px solid ${card.accent}`,
                    borderRadius: '10px',
                    height: '100%',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <CardContent
                    sx={{ p: { xs: 1.75, md: 2.5 }, '&:last-child': { pb: { xs: 1.75, md: 2.5 } } }}
                  >
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: '50%',
                        bgcolor: `${card.accent}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: card.accent, mb: 1.5,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#546e7a', fontSize: '0.68rem',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        display: 'block', mb: 0.5,
                      }}
                    >
                      {card.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800, color: NAVY,
                        fontSize: { xs: '1.4rem', md: '1.75rem' },
                        lineHeight: 1.1,
                      }}
                    >
                      {card.value}
                    </Typography>
                    {card.sub && (
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', fontSize: '0.62rem', lineHeight: 1.35, display: 'block', mt: 0.75 }}
                      >
                        {card.sub}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}

      {/* ─────────────── Volume Trend ─────────────── */}
      <Grid item xs={12} md={8}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            height: '100%',
          }}
        >
          <Typography
            sx={{ fontWeight: 700, color: NAVY, mb: 2.5, fontSize: '0.95rem' }}
          >
            Volume de Traitement
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.volumeTrend} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ef" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#546e7a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#546e7a' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e0e7ef', fontSize: 12 }}
                labelStyle={{ color: NAVY, fontWeight: 700 }}
              />
              <Line
                type="monotone" dataKey="volume" stroke="#2196f3"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2196f3', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* ─────────────── SLA Distribution ─────────────── */}
      <Grid item xs={12} md={4}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            height: '100%',
          }}
        >
          <Typography sx={{ fontWeight: 700, color: NAVY, mb: 2.5, fontSize: '0.95rem' }}>
            Répartition SLA
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.slaDistribution}
                cx="50%" cy="45%"
                innerRadius={58} outerRadius={92}
                dataKey="value"
                paddingAngle={3}
              >
                {data.slaDistribution.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e0e7ef', fontSize: 12 }}
              />
              <Legend
                iconType="circle" iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* ─────────────── Gestionnaire Daily Table ─────────────── */}
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {/* Section header + filter panel */}
          <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Typography sx={{ fontWeight: 700, color: NAVY, mb: 2, fontSize: '0.95rem' }}>
              Performance Quotidienne des Gestionnaires
            </Typography>

            <Box
              sx={{
                display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end',
                bgcolor: '#f0f4ff', p: 2, borderRadius: '8px',
                border: '1px solid #d0dff5',
              }}
            >
              <TextField
                label="Rechercher"
                placeholder="Nom du gestionnaire…"
                size="small"
                value={gestionnaireFilter}
                onChange={(e) => setGestionnaireFilter(e.target.value)}
                sx={{
                  flex: 1, minWidth: 180,
                  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '6px', fontSize: '0.85rem' },
                }}
              />
              <TextField
                label="Date début"
                type="date"
                size="small"
                value={gestDateRange.fromDate}
                onChange={(e) => setGestDateRange({ ...gestDateRange, fromDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: 155,
                  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '6px', fontSize: '0.85rem' },
                }}
              />
              <TextField
                label="Date fin"
                type="date"
                size="small"
                value={gestDateRange.toDate}
                onChange={(e) => setGestDateRange({ ...gestDateRange, toDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: 155,
                  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '6px', fontSize: '0.85rem' },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleApplyDateFilter}
                sx={{
                  bgcolor: NAVY, color: '#fff', fontWeight: 600,
                  px: 2.5, borderRadius: '6px',
                  textTransform: 'none', fontSize: '0.85rem',
                  '&:hover': { bgcolor: '#2d5484' },
                }}
              >
                Appliquer
              </Button>
            </Box>
          </Box>

          {/* Table */}
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {TABLE_HEADERS.map((label, i) => (
                    <TableCell
                      key={label}
                      align={i === 0 ? 'left' : 'right'}
                      sx={{
                        bgcolor: NAVY,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.70rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        py: 1.5,
                        whiteSpace: 'nowrap',
                        borderRight: i < TABLE_HEADERS.length - 1
                          ? '1px solid rgba(255,255,255,0.12)' : 'none',
                        ...(i === 4 ? { minWidth: 180 } : {}),
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.gestionnairesDailyPerformance
                  ?.filter((gest: any) =>
                    gest.name.toLowerCase().includes(gestionnaireFilter.toLowerCase()),
                  )
                  .map((gest: any, rowIdx: number) => {
                    const completionRate = gest.documentsProcessed > 0
                      ? (gest.documentsTraites / gest.documentsProcessed) * 100
                      : 0;
                    const barColor =
                      completionRate >= 80 ? '#4caf50' :
                      completionRate >= 50 ? '#ff9800' : '#f44336';

                    return (
                      <TableRow
                        key={gest.id}
                        sx={{
                          bgcolor: rowIdx % 2 === 0 ? '#f4f7fb' : '#ffffff',
                          '&:hover': { bgcolor: '#e8f0fe' },
                          '& td': {
                            fontSize: '0.81rem',
                            borderRight: '1px solid #e0e7ef',
                            py: 1.25,
                            '&:last-child': { borderRight: 'none' },
                          },
                        }}
                      >
                        {/* Name */}
                        <TableCell>
                          <Typography sx={{ fontSize: '0.81rem', fontWeight: 600, color: NAVY }}>
                            {gest.name}
                          </Typography>
                        </TableCell>

                        {/* Total */}
                        <TableCell align="right">
                          {gest.documentsProcessed.toLocaleString('fr-FR')}
                        </TableCell>

                        {/* Traités */}
                        <TableCell align="right">
                          <Typography sx={{ fontSize: '0.81rem', fontWeight: 700, color: '#f44336' }}>
                            {(gest.documentsTraites || 0).toLocaleString('fr-FR')}
                          </Typography>
                        </TableCell>

                        {/* Last 24h */}
                        <TableCell align="right">
                          <Chip
                            label={gest.documentsLast24h}
                            size="small"
                            sx={{
                              bgcolor: gest.documentsLast24h > 0 ? '#e6f4ed' : '#f4f7fb',
                              color:   gest.documentsLast24h > 0 ? '#1b6b3a' : '#546e7a',
                              border:  `1px solid ${gest.documentsLast24h > 0 ? '#a5d6a7' : '#cfd8dc'}`,
                              fontWeight: 700, fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>

                        {/* Progress bar */}
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box
                              sx={{
                                flex: 1, bgcolor: '#e0e7ef',
                                borderRadius: '4px', height: 7, overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${Math.min(completionRate, 100)}%`,
                                  bgcolor: barColor,
                                  borderRadius: '4px',
                                  height: '100%',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                minWidth: 36, fontWeight: 700,
                                color: barColor, fontSize: '0.78rem',
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                              onClick={(e) => handlePopoverOpen(e, gest)}
                            >
                              {Math.round(completionRate)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* ─────────────── Formula Popover ─────────────── */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'center' }}
        PaperProps={{
          sx: {
            borderRadius: '10px',
            border: '1px solid #e0e7ef',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        {selectedGest && (
          <Box sx={{ p: 2.5, minWidth: 280 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 18, color: '#2196f3' }} />
              <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.88rem' }}>
                Calcul de Progression
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1.5, color: '#546e7a' }}>
              <strong style={{ color: NAVY }}>{selectedGest.name}</strong>
            </Typography>
            <Box
              sx={{
                bgcolor: '#f4f7fb', p: 1.75,
                borderRadius: '6px', border: '1px solid #e0e7ef',
                fontFamily: 'monospace',
              }}
            >
              <Typography variant="body2" sx={{ color: '#546e7a', mb: 0.75, fontSize: '0.82rem' }}>
                Progression = (Traités / Total) × 100
              </Typography>
              <Typography variant="body2" sx={{ color: '#2196f3', mb: 0.5, fontSize: '0.82rem' }}>
                = ({selectedGest.documentsTraites} / {selectedGest.documentsProcessed}) × 100
              </Typography>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.92rem' }}>
                ={' '}
                {selectedGest.documentsProcessed > 0
                  ? Math.round((selectedGest.documentsTraites / selectedGest.documentsProcessed) * 100)
                  : 0}%
              </Typography>
            </Box>
          </Box>
        )}
      </Popover>
    </Grid>
  );
};

export default PerformanceTab;