import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TablePagination,
  Tooltip
} from '@mui/material';
import {
  Warning,
  Error,
  Notifications,
  People,
  Assignment,
  Refresh,
  Info,
  Visibility,
  CheckCircle
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';
import { getWorkloadPredictions } from '../../services/superAdminService';
import { useAlertsDashboard, useResolveAlert, useAlertHistory } from '../../hooks/useAlertsQuery';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

interface OverloadAlert {
  team: {
    id: string;
    fullName: string;
    role: string;
  };
  count: number;
  alert: 'red' | 'orange';
  reason: string;
}

interface DelayPrediction {
  forecast: any[];
  trend_direction: string;
  recommendations: any[];
  ai_confidence: number;
  next_week_prediction: number;
}

const SuperAdminAlerts: React.FC = () => {
  const [overloadAlerts, setOverloadAlerts] = useState<OverloadAlert[]>([]);
  const [delayPredictions, setDelayPredictions] = useState<DelayPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<OverloadAlert | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [alertDetailDialog, setAlertDetailDialog] = useState<{ open: boolean; alert: any | null; aiSolution: any | null; loadingAI: boolean }>({ open: false, alert: null, aiSolution: null, loadingAI: false });
  const [clientFilter, setClientFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Import alerts from Alert Module - use history for resolved
  const { data: alertsResponse, refetch: refetchAlerts } = useAlertsDashboard({});
  const alerts = alertsResponse || [];
  const resolveMutation = useResolveAlert();

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      // Use the new team-alerts endpoint
      const response = await LocalAPI.get('/super-admin/team-alerts');
      const alertsData = response.data;

      console.log('🚨 Team Alerts:', alertsData);

      // Get team workload for display
      const teamResponse = await LocalAPI.get('/super-admin/team-workload');
      setTeamWorkload(teamResponse.data);

      // Transform alerts to overload format
      const overloadData = alertsData.alerts
        .filter((alert: any) => alert.type === 'TEAM_OVERLOAD' || alert.type === 'TEAM_BUSY')
        .map((alert: any) => ({
          team: {
            id: alert.teamId,
            fullName: alert.teamName,
            role: '' // Will be filled from teamWorkload
          },
          count: alert.workload || 0,
          alert: alert.level === 'CRITICAL' ? 'red' : 'orange',
          reason: alert.message
        }));

      setOverloadAlerts(overloadData);
      
      // Get real workload predictions from API
      try {
        const predictions = await getWorkloadPredictions();
        setDelayPredictions({
          forecast: predictions.forecast || [],
          trend_direction: predictions.trend || 'stable',
          recommendations: predictions.recommendations || [],
          ai_confidence: predictions.confidence || 0,
          next_week_prediction: predictions.nextWeek || 0
        });
      } catch (error) {
        console.error('Failed to load predictions:', error);
        setDelayPredictions(null);
      }
      
      // Refetch alerts from Alert Module
      refetchAlerts();
    } catch (error) {
      console.error('Failed to load super admin alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAction = async () => {
    setDetailsOpen(false);
    setActionDialogOpen(true);
    
    // Load AI suggestions for this specific team
    if (selectedAlert) {
      setLoadingSuggestions(true);
      try {
        const response = await LocalAPI.post('/super-admin/ai-suggestions', {
          teamId: selectedAlert.team.id,
          teamName: selectedAlert.team.fullName,
          workload: selectedAlert.count,
          utilizationRate: teamWorkload.find(t => t.name === selectedAlert.team.fullName)?.utilizationRate || 0
        });
        setAiSuggestions(response.data);
      } catch (error) {
        console.error('Failed to load AI suggestions:', error);
        setAiSuggestions(null);
      } finally {
        setLoadingSuggestions(false);
      }
    }
  };

  const handleViewDetails = (alert: OverloadAlert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };

  const getCriticalCount = () => overloadAlerts.filter(a => a.alert === 'red').length;
  const getWarningCount = () => overloadAlerts.filter(a => a.alert === 'orange').length;

  const handleResolveAlert = async (alert: any) => {
    try {
      await resolveMutation.mutateAsync(alert.bordereau.id);
      refetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSLAStatus = (alert: any) => {
    const daysSince = alert.bordereau.dateReception 
      ? (new Date().getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    return Math.round(daysSince);
  };

  const { data: historyData } = useAlertHistory({ resolved: true });
  const resolvedFromHistory = historyData || [];

  const activeAlerts = alerts;
  const resolvedAlerts = resolvedFromHistory;

  const renderOverloadCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <People color="error" />
            Surcharge des Équipes
          </Typography>
          <IconButton onClick={loadAlerts} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
              <Typography variant="h3" color="error.main">
                {getCriticalCount()}
              </Typography>
              <Typography variant="body2" color="error.dark" fontWeight={600}>
                🔴 Surchargés
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes ≥90% capacité
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
              <Typography variant="h3" color="warning.main">
                {getWarningCount()}
              </Typography>
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                🟠 Occupés
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes 70-89% capacité
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
              <Typography variant="h3" color="success.main">
                {Math.max(0, (teamWorkload?.length || 0) - overloadAlerts.length)}
              </Typography>
              <Typography variant="body2" color="success.dark" fontWeight={600}>
                🟢 Normaux
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes &lt;70% capacité
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {overloadAlerts.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Équipe/Gestionnaire</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Charge</TableCell>
                  <TableCell>Niveau</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overloadAlerts.map((alert, index) => {
                  // Find the actual user data from teamWorkload to get correct role and utilization
                  const teamMember = teamWorkload.find(t => t.name === alert.team.fullName);
                  const actualRole = teamMember?.role || alert.team.role;
                  const capacity = teamMember?.capacity || 0;
                  const requiredPerDay = teamMember?.requiredPerDay || 0;
                  
                  return (
                  <TableRow key={index}>
                    <TableCell>{alert.team.fullName}</TableCell>
                    <TableCell>{actualRole}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {requiredPerDay} docs/jour requis
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({alert.count} docs total, capacité: {capacity}/jour)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.alert === 'red' ? 'Critique' : 'Élevé'}
                        color={alert.alert === 'red' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewDetails(alert)}
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderPredictionsCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <Assignment color="info" />
          Prédictions IA
        </Typography>

        {delayPredictions && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={1}>
                <Typography variant="h4" color="primary.main">
                  {delayPredictions.next_week_prediction}
                </Typography>
                <Typography variant="body2">
                  Dossiers prévus (7j)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={1}>
                <Typography variant="h4" color="info.main">
                  {Math.round(delayPredictions.ai_confidence * 100)}%
                </Typography>
                <Typography variant="body2">
                  Confiance IA
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {delayPredictions?.recommendations && delayPredictions.recommendations.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" mb={1}>
              Recommandations IA:
            </Typography>
            {delayPredictions.recommendations.slice(0, 3).map((rec: any, index: number) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {rec.message || rec.reasoning || rec.action || rec.recommendation || JSON.stringify(rec)}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <Typography>Chargement des alertes...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" display="flex" alignItems="center" gap={1}>
          <Warning color="error" />
          Alertes Équipes
        </Typography>
        <Chip 
          label="Règles: ≥90% Critique | 70-89% Avertissement" 
          color="info" 
          variant="outlined"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Types d'alertes surveillées:</strong> Surcharge équipe (≥90%), Équipe occupée (70-89%), 
          Files d'attente critiques, Dépassements SLA, Gestionnaires sans chef d'équipe
        </Typography>
      </Alert>

      {/* Tabs for different alert views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`Surcharge Équipes (${overloadAlerts.length})`} />
          <Tab label={`Alertes Actives (${activeAlerts.length})`} />
          <Tab label={`Alertes Résolues (${resolvedAlerts.length})`} />
        </Tabs>
      </Paper>

      {overloadAlerts.length === 0 && activeTab === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body1">
            ✅ Aucune surcharge détectée - Toutes les équipes fonctionnent normalement
          </Typography>
        </Alert>
      )}

      {/* Tab 0: Team Overload */}
      {activeTab === 0 && (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {renderOverloadCard()}
        </Grid>
        {/* AI Predictions - COMMENTED OUT (Client request: merged into alerts, not needed separately) */}
        {false && (
        <Grid item xs={12} md={4}>
          {renderPredictionsCard()}
        </Grid>
        )}
      </Grid>
      )}

      {/* Tab 1: Active Alerts Table */}
      {activeTab === 1 && (
        <Paper>
          {/* Filters */}
          <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Client/Société</Typography>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Tous les clients</option>
                {Array.from(new Set(activeAlerts.map((alert: any) => 
                  alert.bordereau.contract?.client?.name || alert.bordereau.client?.name || 'N/A'
                )) as Set<string>).sort().map((client) => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Urgence</Typography>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Tous</option>
                <option value="red">Critique</option>
                <option value="orange">Avertissement</option>
              </select>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Client/Société</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Urgence</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Assigné à</TableCell>
                  <TableCell>Créé le</TableCell>
                  <TableCell>SLA (jours)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeAlerts
                  .filter((alert: any) => {
                    const clientName = alert.bordereau.contract?.client?.name || alert.bordereau.client?.name || 'N/A';
                    const matchesClient = !clientFilter || clientName === clientFilter;
                    const alertSeverity = alert.alertLevel || alert.severity || alert.level;
                    const matchesSeverity = !severityFilter || alertSeverity === severityFilter;
                    return matchesClient && matchesSeverity;
                  })
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((alert: any) => (
                  <TableRow key={alert.bordereau.id}>
                    <TableCell>{alert.bordereau.reference || alert.bordereau.id}</TableCell>
                    <TableCell>
                      {alert.bordereau.contract?.client?.name || 
                       alert.bordereau.client?.name || 
                       'N/A'}
                    </TableCell>
                    <TableCell>
                      {alert.reason === 'SLA breach' ? 'Dépassement SLA' : 
                       alert.reason === 'Risk of delay' ? 'Risque de retard' : 
                       alert.reason}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alertLevelLabel(alert.alertLevel)}
                        sx={{
                          backgroundColor: alertLevelColor(alert.alertLevel),
                          color: '#fff',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.bordereau.statut} 
                        color={alert.bordereau.statut === 'CLOTURE' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      {alert.bordereau.contract?.teamLeader?.fullName || 
                       alert.bordereau.currentHandler?.fullName || 
                       'Non assigné'}
                    </TableCell>
                    <TableCell>
                      {new Date(alert.bordereau.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getSLAStatus(alert)}
                        color={getSLAStatus(alert) > 7 ? 'error' : getSLAStatus(alert) > 5 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Voir détails">
                          <IconButton 
                            size="small"
                            onClick={async () => {
                              setAlertDetailDialog({ open: true, alert, aiSolution: null, loadingAI: true });
                              try {
                                const timeoutPromise = new Promise<never>((_, reject) => 
                                  setTimeout(() => reject({ message: 'Timeout' }), 30000)
                                );
                                const apiPromise = LocalAPI.post('/analytics/ai/alert-solution', {
                                  bordereau: alert.bordereau,
                                  alertLevel: alert.alertLevel,
                                  reason: alert.reason,
                                  slaDays: getSLAStatus(alert)
                                });
                                const response = await Promise.race([apiPromise, timeoutPromise]) as any;
                                setAlertDetailDialog(prev => ({ ...prev, aiSolution: response.data, loadingAI: false }));
                              } catch (error) {
                                console.error('AI solution error:', error);
                                setAlertDetailDialog(prev => ({ 
                                  ...prev, 
                                  aiSolution: null, 
                                  loadingAI: false 
                                }));
                              }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Marquer résolu">
                          <IconButton 
                            size="small"
                            color="success"
                            onClick={() => handleResolveAlert(alert)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={activeAlerts.filter((alert: any) => {
              const clientName = alert.bordereau.contract?.client?.name || alert.bordereau.client?.name || 'N/A';
              const matchesClient = !clientFilter || clientName === clientFilter;
              const alertSeverity = alert.alertLevel || alert.severity || alert.level;
              const matchesSeverity = !severityFilter || alertSeverity === severityFilter;
              return matchesClient && matchesSeverity;
            }).length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            labelRowsPerPage="Lignes par page:"
          />
        </Paper>
      )}

      {/* Tab 2: Resolved Alerts Table */}
      {activeTab === 2 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Bordereau</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Niveau</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Résolu par</TableCell>
                  <TableCell>Résolu le</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolvedAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Aucune alerte résolue
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  resolvedAlerts
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        {alert.bordereau?.contract?.client?.name || 
                         alert.bordereau?.client?.name || 
                         'N/A'}
                      </TableCell>
                      <TableCell>{alert.bordereau?.reference || alert.bordereauId || alert.bordereau?.id || '-'}</TableCell>
                      <TableCell>{alert.alertType || alert.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={alertLevelLabel(alert.alertLevel)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {alert.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {alert.user?.fullName || alert.userId || 'Système'}
                      </TableCell>
                      <TableCell>
                        {alert.resolvedAt 
                          ? new Date(alert.resolvedAt).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {resolvedAlerts.length > 0 && (
            <TablePagination
              component="div"
              count={resolvedAlerts.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              labelRowsPerPage="Lignes par page:"
            />
          )}
        </Paper>
      )}

      {/* Alert Detail Dialog */}
      <Dialog open={alertDetailDialog.open} onClose={() => setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false })} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'alerte</DialogTitle>
        <DialogContent>
          {alertDetailDialog.alert && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Référence:</strong> {alertDetailDialog.alert.bordereau.reference || alertDetailDialog.alert.bordereau.id}</Typography>
              <Typography><strong>Raison:</strong> {alertDetailDialog.alert.reason}</Typography>
              <Typography><strong>Niveau:</strong> {alertLevelLabel(alertDetailDialog.alert.alertLevel)}</Typography>
              <Typography><strong>Client:</strong> {alertDetailDialog.alert.bordereau.contract?.client?.name || alertDetailDialog.alert.bordereau.client?.name || 'N/A'}</Typography>
              <Typography><strong>Date réception:</strong> {alertDetailDialog.alert.bordereau.dateReception ? new Date(alertDetailDialog.alert.bordereau.dateReception).toLocaleDateString() : 'N/A'}</Typography>
              <Typography><strong>Statut:</strong> {alertDetailDialog.alert.bordereau.statut}</Typography>
              <Typography><strong>SLA dépassé:</strong> {getSLAStatus(alertDetailDialog.alert)} jours</Typography>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f7ff', borderRadius: 1, border: '1px solid #2196f3' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment color="primary" />
                  🤖 Solution IA Personnalisée
                </Typography>
                {alertDetailDialog.loadingAI ? (
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary">Analyse en cours...</Typography>
                  </Box>
                ) : alertDetailDialog.aiSolution ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      🎯 Cause Identifiée:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                      {alertDetailDialog.aiSolution.rootCause || 'Analyse en cours...'}
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      ✅ Actions Recommandées:
                    </Typography>
                    <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                      {alertDetailDialog.aiSolution.actions?.map((action: string, idx: number) => (
                        <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                          {idx + 1}. {action}
                        </Typography>
                      ))}
                    </Box>
                    
                    {alertDetailDialog.aiSolution.priority && (
                      <Alert severity={alertDetailDialog.aiSolution.priority === 'URGENT' ? 'error' : 'warning'} sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Priorité: {alertDetailDialog.aiSolution.priority}
                        </Typography>
                        <Typography variant="caption">
                          {alertDetailDialog.aiSolution.reasoning}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Impossible de générer une solution IA pour le moment.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false })}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="error" />
            <Typography variant="h6">Détails de la Surcharge</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (() => {
            const teamMember = teamWorkload.find(t => t.name === selectedAlert.team.fullName);
            const capacity = teamMember?.capacity || 0;
            const requiredPerDay = teamMember?.requiredPerDay || 0;
            const utilizationRate = teamMember?.utilizationRate || 0;
            
            return (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Équipe</Typography>
                    <Typography variant="h6">{selectedAlert.team.fullName}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Rôle</Typography>
                    <Typography variant="h6">{teamMember?.role || 'N/A'}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  📊 Analyse de Charge (Basée sur le Temps)
                </Typography>
                <Grid container spacing={2} mt={1}>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1.5} bgcolor="white" borderRadius={1}>
                      <Typography variant="h5" color="primary.main">{selectedAlert.count}</Typography>
                      <Typography variant="caption">Documents Total</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1.5} bgcolor="white" borderRadius={1}>
                      <Typography variant="h5" color="info.main">{requiredPerDay.toFixed(1)}</Typography>
                      <Typography variant="caption">Requis/Jour</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1.5} bgcolor="white" borderRadius={1}>
                      <Typography variant="h5" color="success.main">{capacity}</Typography>
                      <Typography variant="caption">Capacité/Jour</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ bgcolor: selectedAlert.alert === 'red' ? '#ffebee' : '#fff3e0', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  ⚠️ Taux d'Utilisation
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h3" color={selectedAlert.alert === 'red' ? 'error.main' : 'warning.main'}>
                    {utilizationRate}%
                  </Typography>
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary">
                      Formule: ({requiredPerDay.toFixed(1)} / {capacity}) × 100
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Σ(1/jours restants) pour chaque document
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="body2" mb={2} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <strong>Raison:</strong> {selectedAlert.reason}
              </Typography>
              
              <Alert severity={selectedAlert.alert === 'red' ? 'error' : 'warning'}>
                <Typography variant="body2" fontWeight={600}>
                  {selectedAlert.alert === 'red' 
                    ? '🚨 Action immédiate requise - Risque de dépassement SLA'
                    : '⚠️ Surveillance recommandée - Charge élevée détectée'
                  }
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  {selectedAlert.alert === 'red'
                    ? 'Cette équipe ne peut pas terminer tous les documents dans les délais contractuels. Réaffectation urgente nécessaire.'
                    : 'Cette équipe approche de sa capacité maximale. Surveiller de près pour éviter une surcharge.'
                  }
                </Typography>
              </Alert>
            </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Fermer
          </Button>
          <Button variant="contained" color="primary" onClick={handleTakeAction}>
            Prendre des mesures
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment color="primary" />
            <Typography variant="h6">Actions Disponibles</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (() => {
            const teamMember = teamWorkload.find(t => t.name === selectedAlert.team.fullName);
            
            return (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Équipe concernée:</strong> {selectedAlert.team.fullName} ({teamMember?.utilizationRate}% d'utilisation)
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom>
                🛠️ Actions Recommandées
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={async () => {
                      setActionDialogOpen(false);
                      try {
                        const reassignRec = aiSuggestions?.recommendations?.find((r: any) => r.type === 'REASSIGNMENT');
                        if (reassignRec) {
                          await LocalAPI.post('/super-admin/execute-action', {
                            action: 'REASSIGN',
                            sourceTeamId: selectedAlert.team.id,
                            targetTeamName: reassignRec.target,
                            count: reassignRec.count
                          });
                          alert(`✅ ${reassignRec.count} documents réaffectés vers ${reassignRec.target}`);
                          loadAlerts();
                        } else {
                          alert('⚠️ Aucune équipe disponible pour la réaffectation');
                        }
                      } catch (error) {
                        alert('❌ Erreur lors de la réaffectation');
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <People color="primary" sx={{ fontSize: 40 }} />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Réaffecter des Documents
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Transférer des documents vers des équipes moins chargées
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={async () => {
                      setActionDialogOpen(false);
                      try {
                        const capacityRec = aiSuggestions?.recommendations?.find((r: any) => r.type === 'CAPACITY_INCREASE');
                        if (capacityRec) {
                          const response = await LocalAPI.post('/super-admin/execute-action', {
                            action: 'INCREASE_CAPACITY',
                            teamId: selectedAlert.team.id,
                            percentage: capacityRec.percentage
                          });
                          
                          if (response.data.success) {
                            alert(`✅ Capacité augmentée: ${response.data.oldCapacity} → ${response.data.newCapacity} docs/jour`);
                            loadAlerts();
                          } else {
                            alert(`❌ ${response.data.message}`);
                          }
                        } else {
                          alert('⚠️ Impossible d\'augmenter la capacité');
                        }
                      } catch (error) {
                        alert('❌ Erreur lors de l\'augmentation de capacité');
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Assignment color="success" sx={{ fontSize: 40 }} />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Augmenter la Capacité
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ajouter des membres à l'équipe ou augmenter les heures
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={async () => {
                      setActionDialogOpen(false);
                      try {
                        const priorityRec = aiSuggestions?.recommendations?.find((r: any) => r.type === 'PRIORITIZATION');
                        if (priorityRec) {
                          await LocalAPI.post('/super-admin/execute-action', {
                            action: 'PRIORITIZE',
                            teamId: selectedAlert.team.id,
                            urgentCount: priorityRec.urgentCount,
                            overdueCount: priorityRec.overdueCount
                          });
                          alert(`✅ ${priorityRec.urgentCount + priorityRec.overdueCount} documents prioritaires marqués`);
                          loadAlerts();
                        } else {
                          alert('⚠️ Aucun document urgent à prioriser');
                        }
                      } catch (error) {
                        alert('❌ Erreur lors de la priorisation');
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Warning color="warning" sx={{ fontSize: 40 }} />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Prioriser les Urgents
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Traiter d'abord les documents avec délais courts
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={async () => {
                      setActionDialogOpen(false);
                      try {
                        const response = await LocalAPI.post('/super-admin/execute-action', {
                          action: 'NOTIFY',
                          teamId: selectedAlert.team.id,
                          teamName: selectedAlert.team.fullName,
                          message: `Alerte: Votre équipe est surchargée (${teamMember?.utilizationRate}%)`
                        });
                        
                        if (response.data.success) {
                          alert(`✅ Notification envoyée au chef d'équipe: ${response.data.recipient || selectedAlert.team.fullName}`);
                        } else {
                          alert(`❌ ${response.data.message}`);
                        }
                      } catch (error) {
                        alert('❌ Erreur lors de l\'envoi de la notification');
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Notifications color="info" sx={{ fontSize: 40 }} />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Notifier le Chef d'Équipe
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Envoyer une alerte au responsable de l'équipe
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  💡 Suggestions IA
                </Typography>
                {loadingSuggestions ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">Analyse en cours...</Typography>
                  </Box>
                ) : aiSuggestions ? (
                  <Box>
                    {aiSuggestions.suggestions?.map((suggestion: string, idx: number) => (
                      <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • {suggestion}
                      </Typography>
                    ))}
                    {aiSuggestions.recommendations?.map((rec: any, idx: number) => (
                      <Typography key={`rec-${idx}`} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • {rec.message || rec.action || rec.recommendation}
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    • Réaffecter {Math.ceil(selectedAlert.count * 0.3)} documents vers des équipes disponibles<br/>
                    • Augmenter temporairement la capacité de {Math.ceil((teamMember?.utilizationRate || 100) - 90)}%<br/>
                    • Prioriser les {Math.ceil(selectedAlert.count * 0.2)} documents les plus urgents
                  </Typography>
                )}
              </Box>
            </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            Annuler
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setActionDialogOpen(false);
              alert('📧 Notification envoyée au chef d\'\u00e9quipe');
            }}
          >
            Notifier
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setActionDialogOpen(false);
              alert('✅ Redirection vers l\'affectation des documents...');
              // TODO: Navigate to document assignment page
            }}
          >
            Réaffecter Documents
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAlerts;