import React, { useEffect, useState } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, Button, Box, CircularProgress,
  Card, CardContent, Alert, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
} from '@mui/material';
import { LocalAPI } from '../../services/axios';
import WarningIcon     from '@mui/icons-material/Warning';
import ErrorIcon       from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon  from '@mui/icons-material/Assignment';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';

const NAVY = '#1e3a5f';

interface Props {
  filters: any;
  dateRange: any;
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const formatDocumentType = (type: string): string =>
  type
    .split('_')
    .map((word, index) => {
      if (index === 0 && word === 'BULLETIN') return 'BS';
      if (word === 'SOIN')        return '';
      if (word === 'COMPLEMENT')  return 'Complément';
      if (word === 'INFORMATION') return 'Info';
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ')
    .trim() || type;

const getSLAStatusChip = (daysRemaining: number) => {
  if (daysRemaining < 0)  return (
    <Chip label="En retard"  size="small"
      sx={{ bgcolor: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a', fontWeight: 700, fontSize: '0.72rem' }} />
  );
  if (daysRemaining === 0) return (
    <Chip label="Critique"   size="small"
      sx={{ bgcolor: '#fdecea', color: '#b71c1c', border: '1px solid #ef9a9a', fontWeight: 700, fontSize: '0.72rem' }} />
  );
  if (daysRemaining <= 1)  return (
    <Chip label="À risque"   size="small"
      sx={{ bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80', fontWeight: 700, fontSize: '0.72rem' }} />
  );
  return (
    <Chip label="À temps"    size="small"
      sx={{ bgcolor: '#e6f4ed', color: '#1b6b3a', border: '1px solid #a5d6a7', fontWeight: 700, fontSize: '0.72rem' }} />
  );
};

const rowBg = (alertLevel: string, idx: number) =>
  alertLevel === 'critical' ? '#fdecea' :
  alertLevel === 'warning'  ? '#fff8e1' :
  idx % 2 === 0             ? '#f4f7fb' : '#ffffff';

/* ─────────────────────────────────────────
   Component
───────────────────────────────────────── */
const SLARiskTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [slaKpis, setSlaKpis]   = useState<any>(null);
  const [page, setPage]         = useState(0);
  const [rowsPerPage]           = useState(10);

  const [reassignmentDialog, setReassignmentDialog] = useState<{
    open: boolean; bordereau: any; aiResponse: any;
  }>({ open: false, bordereau: null, aiResponse: null });

  const [snackbar, setSnackbar] = useState<{
    open: boolean; message: string; severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnack = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  /* ── Data loading ── */
  const loadSLARiskData = async () => {
    try {
      setLoading(true);

      const filterParams = {
        ...dateRange,
        clientId:             filters.clientId,
        gestionnaireId:       filters.gestionnaireId,
        gestionnaireSeniorId: filters.gestionnaireSeniorId,
        chefEquipeId:         filters.chefEquipeId,
        slaStatus:            filters.slaStatus,
      };

      const [slaResponse, alertsResponse, capacityResponse] = await Promise.all([
        LocalAPI.get('/analytics/sla/dashboard', { params: filterParams }),
        LocalAPI.get('/analytics/alerts',         { params: filterParams }),
        LocalAPI.get('/analytics/sla/capacity',   { params: filterParams }),
      ]);

      const slaData      = slaResponse.data;
      const capacityData = capacityResponse.data;

      const atRiskCount    = slaData.overview?.atRisk       || 0;
      const criticalCount  = slaData.overview?.breached     || 0;
      const complianceRate = slaData.overview?.complianceRate || 0;
      const totalAtRisk    = atRiskCount + criticalCount;

      setSlaKpis({ totalAtRisk, criticalCount, warningCount: atRiskCount, complianceRate });

      const atRiskBordereaux = slaData.alerts || [];

      const workloadDistribution = capacityData.map((user: any) => ({
        team:           user.userName,
        workload:       user.activeBordereaux,
        capacity:       user.dailyCapacity * 7,
        risk:           user.capacityStatus === 'overloaded'   ? 'high'   :
                        user.capacityStatus === 'at_capacity'  ? 'medium' : 'low',
        recommendation: user.recommendation,
      }));

      setData({
        atRiskBordereaux,
        workloadDistribution,
        slaBreaches: slaData.breaches     || [],
        predictions: slaData.predictions  || [],
      });
    } catch (error) {
      console.error('Failed to load SLA risk data:', error);
      setData(null);
      setSlaKpis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSLARiskData(); }, [filters, dateRange]);

  /* ── AI actions ── */
  const handleReallocate = async (bordereauId: string, item: any) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject({ message: 'Timeout' }), 30000),
      );
      const apiPromise = LocalAPI.post('/analytics/ai/reassignment', {
        bordereauId,
        reason: 'SLA_RISK',
      });
      const response = await Promise.race([apiPromise, timeoutPromise]) as any;
      setReassignmentDialog({ open: true, bordereau: item, aiResponse: response.data });
    } catch (error) {
      console.error('AI reassignment failed:', error);
      showSnack('La réaffectation IA a échoué. Le service IA est peut-être indisponible.', 'error');
    }
  };

  const handleConfirmReassignment = async () => {
    try {
      await LocalAPI.post(`/bordereaux/${reassignmentDialog.bordereau.bordereauId}/reassign`, {
        newUserId: reassignmentDialog.aiResponse.recommended_agent?.agent_id,
        comment:   'Réaffectation IA pour optimisation SLA',
      });
      setReassignmentDialog({ open: false, bordereau: null, aiResponse: null });
      loadSLARiskData();
      showSnack('Réaffectation effectuée avec succès.', 'success');
    } catch (error) {
      console.error('Reassignment execution failed:', error);
      showSnack('Erreur lors de la réaffectation.', 'error');
    }
  };

  /* ── States ── */
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400} gap={2}>
        <CircularProgress size={30} />
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Chargement des données SLA…
        </Typography>
      </Box>
    );
  }

  if (!data || !slaKpis) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400} px={2}>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Aucune donnée SLA disponible. Vérifiez que des bordereaux sont présents dans le système.
        </Typography>
      </Box>
    );
  }

  /* ── KPI card definitions ── */
  const kpiCards = [
    {
      label:  'Critiques',
      value:  slaKpis.criticalCount,
      icon:   <ErrorIcon sx={{ fontSize: 20 }} />,
      accent: '#f44336',
    },
    {
      label:  'À Risque',
      value:  slaKpis.warningCount,
      icon:   <WarningIcon sx={{ fontSize: 20 }} />,
      accent: '#ff9800',
    },
    {
      label:  'Total à Risque',
      value:  slaKpis.totalAtRisk,
      icon:   <AssignmentIcon sx={{ fontSize: 20 }} />,
      accent: '#2196f3',
    },
    {
      label:  'Conformité SLA',
      value:  `${Math.round(slaKpis.complianceRate)}%`,
      icon:   <CheckCircleIcon sx={{ fontSize: 20 }} />,
      accent: slaKpis.complianceRate >= 90 ? '#4caf50' : slaKpis.complianceRate >= 80 ? '#ff9800' : '#f44336',
    },
  ];

  const TABLE_HEADERS = [
    'Référence', 'Client', 'Type', 'Nb Documents',
    'Assigné à', 'Statut SLA', 'Délai', 'Action',
  ];

  return (
    <Grid container spacing={3}>

      {/* ─────────────── KPI Cards ─────────────── */}
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
                      fontWeight: 800, color: card.accent,
                      fontSize: { xs: '1.5rem', md: '1.85rem' },
                      lineHeight: 1.1,
                    }}
                  >
                    {card.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ─────────────── Critical alert banner ─────────────── */}
      {slaKpis.criticalCount > 0 && (
        <Grid item xs={12}>
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            sx={{
              borderRadius: '10px',
              border: '1px solid #ef9a9a',
              bgcolor: '#fdecea',
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#b71c1c', mb: 0.25 }}>
              Alerte Critique SLA
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#c62828' }}>
              {slaKpis.criticalCount} bordereau(x) en dépassement de SLA nécessite(nt) une action immédiate.
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ─────────────── At-risk table ─────────────── */}
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <Box
            sx={{
              px: { xs: 2, md: 3 }, py: 2,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 32, height: 32, borderRadius: '50%',
                bgcolor: '#fff8e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <WarningIcon sx={{ fontSize: 17, color: '#ff9800' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>
              Bordereaux à Risque SLA
            </Typography>
            <Chip
              label={data.atRiskBordereaux.length}
              size="small"
              sx={{
                bgcolor: '#fff8e1', color: '#e65100',
                border: '1px solid #ffcc80', fontWeight: 700,
                fontSize: '0.72rem', ml: 'auto',
              }}
            />
          </Box>

          <TableContainer>
            <Table stickyHeader sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  {TABLE_HEADERS.map((h, i) => (
                    <TableCell
                      key={h}
                      sx={{
                        bgcolor: NAVY, color: '#fff',
                        fontWeight: 700, fontSize: '0.70rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        py: 1.5, whiteSpace: 'nowrap',
                        borderRight: i < TABLE_HEADERS.length - 1
                          ? '1px solid rgba(255,255,255,0.12)' : 'none',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.atRiskBordereaux
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((item: any, rowIdx: number) => {
                    const daysRemaining = item.slaThreshold - item.daysSinceReception;
                    const isOverdue     = item.daysOverdue > 0;
                    return (
                      <TableRow
                        key={rowIdx}
                        sx={{
                          bgcolor: rowBg(item.alertLevel, rowIdx),
                          '&:hover': { bgcolor: '#e8f0fe' },
                          '& td': {
                            fontSize: '0.81rem',
                            borderRight: '1px solid #e0e7ef',
                            py: 1.5,
                            '&:last-child': { borderRight: 'none' },
                          },
                        }}
                      >
                        {/* Reference */}
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.81rem' }}>
                            {item.reference}
                          </Typography>
                        </TableCell>

                        {/* Client */}
                        <TableCell sx={{ color: '#546e7a' }}>
                          {item.clientName || 'Client non défini'}
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          {item.documentsByType && Object.keys(item.documentsByType).length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {Object.keys(item.documentsByType).map((type) => (
                                <Chip
                                  key={type}
                                  label={formatDocumentType(type)}
                                  size="small"
                                  sx={{
                                    bgcolor: '#e3f2fd', color: '#0d47a1',
                                    border: '1px solid #90caf9',
                                    fontSize: '0.68rem', fontWeight: 600,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Chip
                              label={formatDocumentType(item.type || 'BULLETIN_SOIN')}
                              size="small"
                              sx={{
                                bgcolor: '#e3f2fd', color: '#0d47a1',
                                border: '1px solid #90caf9',
                                fontSize: '0.68rem', fontWeight: 600,
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Nb Documents */}
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.81rem', mb: 0.5 }}>
                            {item.nombreDocuments || 0} doc(s)
                          </Typography>
                          {item.documentsByType && Object.keys(item.documentsByType).length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {Object.entries(item.documentsByType).map(([type, count]: [string, any]) => (
                                <Chip
                                  key={type}
                                  label={`${formatDocumentType(type)}: ${count}`}
                                  size="small"
                                  sx={{
                                    bgcolor: '#f4f7fb', color: '#546e7a',
                                    border: '1px solid #cfd8dc', fontSize: '0.65rem',
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                              Aucun document lié
                            </Typography>
                          )}
                        </TableCell>

                        {/* Assigned to */}
                        <TableCell sx={{ color: item.assignedTo ? NAVY : '#b0bec5', fontStyle: item.assignedTo ? 'normal' : 'italic' }}>
                          {item.assignedTo || 'Non assigné'}
                        </TableCell>

                        {/* SLA Status */}
                        <TableCell>
                          {getSLAStatusChip(daysRemaining)}
                        </TableCell>

                        {/* Delay */}
                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: '0.81rem', fontWeight: 600,
                              color: isOverdue ? '#b71c1c' :
                                     item.daysSinceReception >= item.slaThreshold * 0.8 ? '#e65100' : '#1b6b3a',
                            }}
                          >
                            {isOverdue
                              ? `${item.daysOverdue} j. de retard`
                              : item.daysSinceReception >= item.slaThreshold
                                ? "Échéance aujourd'hui"
                                : `${Math.max(0, daysRemaining)} j. restant(s)`}
                          </Typography>
                        </TableCell>

                        {/* Action */}
                        <TableCell>
                          <Button
                            variant={isOverdue ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleReallocate(item.bordereauId, item)}
                            sx={isOverdue ? {
                              bgcolor: '#f44336', color: '#fff', fontWeight: 700,
                              fontSize: '0.75rem', borderRadius: '6px', textTransform: 'none',
                              border: 'none',
                              '&:hover': { bgcolor: '#d32f2f' },
                            } : {
                              color: NAVY, borderColor: NAVY, fontWeight: 700,
                              fontSize: '0.75rem', borderRadius: '6px', textTransform: 'none',
                              '&:hover': { bgcolor: NAVY, color: '#fff' },
                            }}
                          >
                            {isOverdue ? 'Urgent' : 'Réallouer'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={data.atRiskBordereaux.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10]}
            labelRowsPerPage="Lignes par page :"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
            sx={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
              '& .MuiTablePagination-toolbar': { px: { xs: 1, md: 2 } },
              '& .MuiTablePagination-displayedRows': { fontSize: '0.82rem', color: '#546e7a' },
              '& .MuiTablePagination-selectLabel':   { fontSize: '0.82rem', color: '#546e7a' },
            }}
          />
        </Paper>
      </Grid>

      {/* ─────────────── AI Reassignment Dialog ─────────────── */}
      <Dialog
        open={reassignmentDialog.open}
        onClose={() => setReassignmentDialog({ open: false, bordereau: null, aiResponse: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px', overflow: 'hidden' },
        }}
      >
        {/* Dialog title */}
        <DialogTitle
          sx={{
            bgcolor: '#f4f7fb',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            py: 2, px: 3,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: '#e3f2fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SmartToyOutlinedIcon sx={{ fontSize: 19, color: '#1565c0' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>
            Confirmation de Réaffectation IA
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {reassignmentDialog.aiResponse && (
            <Box sx={{ px: 3, py: 2.5 }}>

              {/* Info rows */}
              {[
                { label: 'Bordereau',          value: reassignmentDialog.bordereau?.reference },
                { label: 'Actuellement assigné', value: reassignmentDialog.bordereau?.assignedTo || 'Non assigné' },
                {
                  label: 'Recommandation IA',
                  value: `Réaffecter à ${reassignmentDialog.aiResponse.recommended_agent?.agent_name || 'Agent non disponible'}`,
                  highlight: true,
                },
                {
                  label: 'Raison',
                  value: reassignmentDialog.aiResponse.reasoning?.[0]
                      || reassignmentDialog.aiResponse.reassignment_reason
                      || 'Optimisation de la charge de travail',
                  muted: true,
                },
              ].map(({ label, value, highlight, muted }, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', flexWrap: 'wrap', gap: 0.5,
                    py: 1.25,
                    borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#546e7a', fontSize: '0.72rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      minWidth: 140, pt: 0.2,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: highlight ? 700 : 500,
                      color:  highlight ? NAVY : muted ? '#546e7a' : NAVY,
                      fontSize: '0.85rem', flex: 1,
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}

              {/* Confidence + Workload badges */}
              <Box
                sx={{
                  mt: 2, p: 1.75,
                  bgcolor: '#f4f7fb', borderRadius: '8px',
                  border: '1px solid #e0e7ef',
                  display: 'flex', flexWrap: 'wrap', gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <Chip
                  label={`Confiance IA : ${reassignmentDialog.aiResponse.recommended_agent?.confidence === 'high' ? '85 %' : '70 %'}`}
                  size="small"
                  sx={{
                    bgcolor: '#e6f4ed', color: '#1b6b3a',
                    border: '1px solid #a5d6a7', fontWeight: 700, fontSize: '0.75rem',
                  }}
                />
                <Chip
                  label={`Charge actuelle : ${reassignmentDialog.aiResponse.recommended_agent?.current_workload || 0} bordereau(x)`}
                  size="small"
                  sx={{
                    bgcolor: '#fff8e1', color: '#e65100',
                    border: '1px solid #ffcc80', fontWeight: 700, fontSize: '0.75rem',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.25 }}>
                  ℹ️ Ce bordereau s'ajoutera à la charge actuelle après réaffectation.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3, py: 2,
            borderTop: '1px solid rgba(0,0,0,0.07)',
            bgcolor: '#f4f7fb',
            gap: 1,
          }}
        >
          <Button
            onClick={() => setReassignmentDialog({ open: false, bordereau: null, aiResponse: null })}
            sx={{
              color: '#546e7a', borderColor: '#cfd8dc',
              border: '1px solid #cfd8dc', borderRadius: '6px',
              textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
              '&:hover': { bgcolor: '#e0e7ef' },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirmReassignment}
            variant="contained"
            sx={{
              bgcolor: NAVY, color: '#fff', fontWeight: 700,
              borderRadius: '6px', textTransform: 'none', fontSize: '0.85rem',
              px: 2.5,
              '&:hover': { bgcolor: '#2d5484' },
            }}
          >
            Confirmer la Réaffectation
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────────────── Snackbar ─────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ borderRadius: '8px', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default SLARiskTab;