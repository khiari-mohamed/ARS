// D:\ARS\frontend\src\components\reclamations\OutlookEmailMonitoring.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip,
  Alert, Button, List, ListItem, ListItemText,
  ListItemIcon, Divider, CircularProgress, Paper,
} from '@mui/material';
import {
  Email, CheckCircle, ErrorOutline, Schedule,
  Business, Refresh, Assignment, FiberManualRecord,
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = '#1e3a5f';
const BORDER      = 'rgba(0,0,0,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailMonitoringStatus {
  isActive: boolean;
  lastCheck: string;
  monitoredEmails: string[];
  recentReclamations: {
    id: string;
    fromEmail: string;
    companyName: string;
    assignedTo: string;
    createdAt: string;
  }[];
  stats: {
    totalProcessed: number;
    todayProcessed: number;
    successRate: number;
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;       // left-border + icon colour
  iconBg: string;       // icon circle background
  icon: React.ReactElement;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, accent, iconBg, icon }) => (
  <Card
    elevation={0}
    sx={{
      border: `1px solid ${BORDER}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 2,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
    }}
  >
    <CardContent sx={{ p: '20px !important' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: '#546e7a',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              fontSize: '0.68rem',
              display: 'block',
              mb: 0.8,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: NAVY, lineHeight: 1 }}
          >
            {value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 44, height: 44,
            borderRadius: '50%',
            bgcolor: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { color: accent, fontSize: 22 } } as any)}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ─── Main component ───────────────────────────────────────────────────────────
const OutlookEmailMonitoring: React.FC = () => {
  const [status, setStatus] = useState<EmailMonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringStatus();
    const interval = setInterval(fetchMonitoringStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringStatus = async () => {
    try {
      const { data } = await LocalAPI.get('/reclamations/outlook/status');
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      await LocalAPI.post('/reclamations/outlook/check');
      await fetchMonitoringStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la vérification manuelle');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading && !status) {
    return (
      <Box
        display="flex" flexDirection="column"
        alignItems="center" justifyContent="center"
        minHeight={220} gap={2}
      >
        <CircularProgress size={36} sx={{ color: NAVY }} />
        <Typography variant="body2" color="text.secondary">
          Chargement du statut de surveillance…
        </Typography>
      </Box>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error && !status) {
    return (
      <Alert
        severity="error"
        sx={{ borderRadius: 2, border: '1px solid #ef9a9a' }}
        action={
          <Button size="small" onClick={fetchMonitoringStatus}>
            Réessayer
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const isActive = status?.isActive ?? false;
  const lastCheck = status?.lastCheck
    ? new Date(status.lastCheck).toLocaleString('fr-FR')
    : '—';

  return (
    <Box>
      {/* ── Section header ────────────────────────────────────────────────── */}
      <Box
        display="flex"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={1.5}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1.2}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: 'rgba(33,150,243,0.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Email sx={{ color: '#2196f3', fontSize: 19 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
              Surveillance Emails Outlook
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Détection automatique des réclamations entrantes
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <Refresh />}
          onClick={handleManualCheck}
          disabled={loading}
          sx={{
            borderColor: NAVY,
            color: NAVY,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.80rem',
            px: 2,
            '&:hover': { bgcolor: NAVY, color: '#fff' },
          }}
        >
          {loading ? 'Vérification…' : 'Vérifier maintenant'}
        </Button>
      </Box>

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${isActive ? '#a5d6a7' : '#ffcc80'}`,
          bgcolor: isActive ? '#e6f4ed' : '#fff8e1',
          borderLeft: `4px solid ${isActive ? '#1b6b3a' : '#e65100'}`,
        }}
      >
        <FiberManualRecord
          sx={{
            color: isActive ? '#1b6b3a' : '#e65100',
            fontSize: 12,
            animation: isActive ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.35 },
            },
          }}
        />
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: isActive ? '#1b6b3a' : '#e65100' }}
          >
            Surveillance {isActive ? 'Active' : 'Inactive'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dernière vérification&nbsp;: {lastCheck}
          </Typography>
        </Box>
      </Paper>

      {/* ── Error inline (after first load) ──────────────────────────────── */}
      {error && status && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Total Traités"
            value={status?.stats.totalProcessed ?? 0}
            accent="#2196f3"
            iconBg="rgba(33,150,243,0.09)"
            icon={<Email />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Aujourd'hui"
            value={status?.stats.todayProcessed ?? 0}
            accent="#00bcd4"
            iconBg="rgba(0,188,212,0.09)"
            icon={<Schedule />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Taux de Succès"
            value={`${status?.stats.successRate ?? 0}%`}
            accent="#4caf50"
            iconBg="rgba(76,175,80,0.09)"
            icon={<CheckCircle />}
          />
        </Grid>
      </Grid>

      {/* ── Detail cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5}>

        {/* Monitored email addresses */}
        <Grid item xs={12} md={5}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              height: '100%',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: '20px !important' }}>
              {/* Section title */}
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                mb={2}
                pb={1.5}
                sx={{ borderBottom: `1px solid #e0e7ef` }}
              >
                <Email sx={{ color: NAVY, fontSize: 18 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                  Emails Surveillés
                </Typography>
                <Chip
                  label={status?.monitoredEmails.length ?? 0}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: 'rgba(30,58,95,0.08)',
                    color: NAVY,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 20,
                  }}
                />
              </Box>

              {status?.monitoredEmails && status.monitoredEmails.length > 0 ? (
                <List dense disablePadding>
                  {status.monitoredEmails.map((email, index) => (
                    <ListItem
                      key={index}
                      disablePadding
                      sx={{
                        py: 1,
                        px: 1.5,
                        borderRadius: 1.5,
                        mb: 0.5,
                        bgcolor: index % 2 === 0 ? '#f4f7fb' : '#fff',
                        '&:hover': { bgcolor: '#e8f0fe' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ color: '#1b6b3a', fontSize: 16 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500, color: NAVY, fontSize: '0.81rem' }}>
                            {email}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Surveillance active
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={3}>
                  <Email sx={{ color: '#cfd8dc', fontSize: 36, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Aucun email configuré
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent reclamations from email */}
        <Grid item xs={12} md={7}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              height: '100%',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: '20px !important' }}>
              {/* Section title */}
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                mb={2}
                pb={1.5}
                sx={{ borderBottom: `1px solid #e0e7ef` }}
              >
                <Assignment sx={{ color: NAVY, fontSize: 18 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                  Réclamations Récentes via Email
                </Typography>
                <Chip
                  label={status?.recentReclamations.length ?? 0}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: 'rgba(30,58,95,0.08)',
                    color: NAVY,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 20,
                  }}
                />
              </Box>

              {status?.recentReclamations && status.recentReclamations.length > 0 ? (
                <List dense disablePadding>
                  {status.recentReclamations.map((rec, index) => (
                    <React.Fragment key={rec.id}>
                      <ListItem
                        disablePadding
                        sx={{
                          py: 1.2,
                          px: 1.5,
                          borderRadius: 1.5,
                          bgcolor: index % 2 === 0 ? '#f4f7fb' : '#fff',
                          '&:hover': { bgcolor: '#e8f0fe' },
                          alignItems: 'flex-start',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34, mt: 0.5 }}>
                          <Box
                            sx={{
                              width: 28, height: 28, borderRadius: '50%',
                              bgcolor: 'rgba(30,58,95,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Business sx={{ color: NAVY, fontSize: 14 }} />
                          </Box>
                        </ListItemIcon>

                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: NAVY, fontSize: '0.82rem', mb: 0.3 }}
                            >
                              {rec.companyName}
                            </Typography>
                          }
                          secondary={
                            <Box display="flex" flexDirection="column" gap={0.2}>
                              <Typography variant="caption" color="text.secondary">
                                De&nbsp;: {rec.fromEmail}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Assigné à&nbsp;: {rec.assignedTo}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#546e7a' }}>
                                {new Date(rec.createdAt).toLocaleString('fr-FR')}
                              </Typography>
                            </Box>
                          }
                        />

                        <Chip
                          label="EMAIL"
                          size="small"
                          sx={{
                            alignSelf: 'center',
                            ml: 1,
                            bgcolor: '#e3f2fd',
                            color: '#0d47a1',
                            border: '1px solid #90caf9',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            height: 20,
                            borderRadius: 1,
                          }}
                        />
                      </ListItem>

                      {index < (status?.recentReclamations.length ?? 0) - 1 && (
                        <Divider sx={{ my: 0.3, borderColor: '#e0e7ef' }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={5}>
                  <Assignment sx={{ color: '#cfd8dc', fontSize: 40, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Aucune réclamation reçue par email récemment
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OutlookEmailMonitoring;