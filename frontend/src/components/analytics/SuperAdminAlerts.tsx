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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Checkbox,
  FormControlLabel,
  Divider,
  Autocomplete
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
  CheckCircle,
  HourglassEmpty as HourglassEmptyIcon
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
  const [gestionnaireFilter, setGestionnaireFilter] = useState('');
  const [reassignDialog, setReassignDialog] = useState<{ open: boolean; bordereau: any | null; currentHandler: string }>({ open: false, bordereau: null, currentHandler: '' });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSuggestions, setReassignSuggestions] = useState<any>(null);
  const [loadingReassignSuggestions, setLoadingReassignSuggestions] = useState(false);
  const [notifyClientDialog, setNotifyClientDialog] = useState<{ open: boolean; bordereau: any | null; aiSolution: any | null; slaDays: number }>({ open: false, bordereau: null, aiSolution: null, slaDays: 0 });
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reassignPlanDialog, setReassignPlanDialog] = useState<{ open: boolean; recommendation: any | null }>({ open: false, recommendation: null });
  const [confirmationDialog, setConfirmationDialog] = useState<{ open: boolean; payload: any | null; summary: string; documentDetails?: any[] }>({ open: false, payload: null, summary: '' });
  const [splitAssignments, setSplitAssignments] = useState<Array<{ teamId: string; targetTeamName: string; count: number; selected: boolean }>>([]);
  const [documentPreview, setDocumentPreview] = useState<any[]>([]);
  const [loadingDocumentPreview, setLoadingDocumentPreview] = useState(false);
  const [manualReassignDialog, setManualReassignDialog] = useState<{ open: boolean; teamId: string; teamName: string }>({ open: false, teamId: '', teamName: '' });
  const [manualDocs, setManualDocs] = useState<any[]>([]);
  const [loadingManualDocs, setLoadingManualDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [manualTargetUser, setManualTargetUser] = useState('');
  const [manualReassignLoading, setManualReassignLoading] = useState(false);
  const [resolveConfirmDialog, setResolveConfirmDialog] = useState<{ open: boolean; alert: any | null }>({ open: false, alert: null });

  // Import alerts from Alert Module - use history for resolved
  const { data: alertsResponse, refetch: refetchAlerts } = useAlertsDashboard({});
  const alerts = alertsResponse || [];
  const resolveMutation = useResolveAlert();

  useEffect(() => {
    loadAlerts();
    loadAvailableUsers();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);
  
  const loadAvailableUsers = async () => {
    try {
      const response = await LocalAPI.get('/users');
      const users = response.data.filter((u: any) => 
        ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'].includes(u.role) &&
        u.role !== 'SUPER_ADMIN' &&
        u.role !== 'RESPONSABLE_DEPARTEMENT'
      );
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

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

  const fetchTeamAiSuggestions = async (alertOverride?: OverloadAlert | null) => {
    const alertToUse = alertOverride || selectedAlert;
    if (!alertToUse) return null;

    setLoadingSuggestions(true);
    try {
      const response = await LocalAPI.post('/super-admin/ai-suggestions', {
        teamId: alertToUse.team.id,
        teamName: alertToUse.team.fullName,
        workload: alertToUse.count,
        utilizationRate: teamWorkload.find(t => t.name === alertToUse.team.fullName)?.utilizationRate || 0
      });
      setAiSuggestions(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
      setAiSuggestions(null);
      return null;
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleTakeAction = async () => {
    setDetailsOpen(false);
    setActionDialogOpen(true);
    await fetchTeamAiSuggestions();
  };

  const handleViewDetails = (alert: OverloadAlert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };

  const getCriticalCount = () => overloadAlerts.filter(a => a.alert === 'red').length;
  const getWarningCount = () => overloadAlerts.filter(a => a.alert === 'orange').length;

  const handleReassignBordereau = async () => {
    if (!selectedUser || !reassignDialog.bordereau) return;
    
    setReassignLoading(true);
    try {
      await LocalAPI.post(`/bordereaux/${reassignDialog.bordereau.id}/reassign`, {
        newUserId: selectedUser
      });
      
      alert('✅ Bordereau réaffecté avec succès!');
      loadAlerts();
      setReassignDialog({ open: false, bordereau: null, currentHandler: '' });
      setSelectedUser('');
      
      // Close the alert detail dialog
      setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false });
    } catch (error) {
      console.error('Failed to reassign bordereau:', error);
      alert('❌ Erreur lors de la réaffectation');
    } finally {
      setReassignLoading(false);
    }
  };
  
  const handleNotifyClient = async () => {
    if (!notifyClientDialog.bordereau || !emailMessage.trim()) {
      alert('⚠️ Veuillez saisir un message');
      return;
    }
    
    setSendingEmail(true);
    try {
      await LocalAPI.post(`/bordereaux/${notifyClientDialog.bordereau.id}/notify-client`, {
        message: emailMessage,
        slaDays: notifyClientDialog.slaDays,
        aiSolution: notifyClientDialog.aiSolution
      });
      
      alert('✅ Notification envoyée au client avec succès!');
      setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 });
      setEmailMessage('');
      
      // Close the alert detail dialog
      setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false });
    } catch (error) {
      console.error('Failed to notify client:', error);
      alert('❌ Erreur lors de l\'envoi de la notification');
    } finally {
      setSendingEmail(false);
    }
  };
  
  // Auto-generate email message when dialog opens
  useEffect(() => {
    if (notifyClientDialog.open && notifyClientDialog.bordereau) {
      const client = notifyClientDialog.bordereau.contract?.client?.name || notifyClientDialog.bordereau.client?.name || 'Client';
      const reference = notifyClientDialog.bordereau.reference || notifyClientDialog.bordereau.id;
      const days = notifyClientDialog.slaDays;
      
      const autoMessage = `Cher ${client},\n\nNous vous informons que le traitement du bordereau ${reference} accuse un retard de ${days} jours.\n\nNous mettons en place les actions suivantes pour régulariser la situation :\n${notifyClientDialog.aiSolution?.actions?.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n') || '- Traitement prioritaire du dossier'}\n\nNous nous excusons pour ce désagrément et restons à votre disposition pour toute question.\n\nCordialement,\nÉquipe ARS`;
      
      setEmailMessage(autoMessage);
    }
  }, [notifyClientDialog.open]);

  const buildInitialSplitAssignments = (recommendation: any) => {
    const splitRecommendation = aiSuggestions?.recommendations?.find((r: any) => r.type === 'REASSIGNMENT_SPLIT');
    const splits = (splitRecommendation?.splits || recommendation?.splits || []).map((split: any, index: number) => ({
      teamId: split.targetTeamId,
      targetTeamName: split.target,
      count: split.count,
      selected: index === 0 || !!splitRecommendation
    }));

    if (splits.length === 0 && recommendation?.targetTeamId) {
      return [{
        teamId: recommendation.targetTeamId,
        targetTeamName: recommendation.target,
        count: recommendation.count || 1,
        selected: true
      }];
    }

    return splits;
  };

  const openReassignPlanDialog = async () => {
    console.log('🔵 [FRONTEND] openReassignPlanDialog called');
    let currentSuggestions = aiSuggestions;

    if (!currentSuggestions && !loadingSuggestions) {
      console.log('🔵 [FRONTEND] No suggestions loaded, fetching...');
      currentSuggestions = await fetchTeamAiSuggestions();
    }

    console.log('🔵 [FRONTEND] Current suggestions:', currentSuggestions);
    console.log('🔵 [FRONTEND] Recommendations:', currentSuggestions?.recommendations);
    console.log('🔵 [FRONTEND] Recommendation types:', currentSuggestions?.recommendations?.map((r: any) => r.type));

    if (!currentSuggestions?.recommendations?.length) {
      console.error('❌ [FRONTEND] No recommendations found');
      alert('⚠️ Impossible de charger les recommandations IA');
      return;
    }

    // Try REASSIGNMENT first
    let recommendation = currentSuggestions.recommendations.find((r: any) => r.type === 'REASSIGNMENT');
    console.log('🔵 [FRONTEND] REASSIGNMENT recommendation:', recommendation);
    
    // If not found, try REASSIGNMENT_SPLIT
    if (!recommendation || !recommendation.targetTeamId) {
      console.log('🔵 [FRONTEND] No REASSIGNMENT found, trying REASSIGNMENT_SPLIT...');
      const splitRec = currentSuggestions.recommendations.find((r: any) => r.type === 'REASSIGNMENT_SPLIT');
      
      if (splitRec && splitRec.splits?.length) {
        console.log('🔵 [FRONTEND] Found REASSIGNMENT_SPLIT with', splitRec.splits.length, 'splits');
        const splits = splitRec.splits.map((split: any, idx: number) => ({
          teamId: split.targetTeamId,
          targetTeamName: split.target,
          count: split.count,
          selected: idx === 0
        }));
        setSplitAssignments(splits);
        setReassignPlanDialog({ open: true, recommendation: splitRec });
        console.log('✅ [FRONTEND] Dialog opened with REASSIGNMENT_SPLIT');
        return;
      }
    }
    
    // Still no valid recommendation
    if (!recommendation || !recommendation.targetTeamId) {
      console.error('❌ [FRONTEND] No valid REASSIGNMENT or REASSIGNMENT_SPLIT recommendation');
      alert('⚠️ Aucune équipe cible éligible trouvée pour la réaffectation');
      return;
    }

    const initialSplits = buildInitialSplitAssignments(recommendation);
    console.log('🔵 [FRONTEND] Initial splits:', initialSplits);
    
    if (!initialSplits.length) {
      console.error('❌ [FRONTEND] No splits built');
      alert('⚠️ Aucune équipe disponible pour la réaffectation');
      return;
    }

    setSplitAssignments(initialSplits);
    setReassignPlanDialog({ open: true, recommendation });
    console.log('✅ [FRONTEND] Dialog opened successfully');
  };

  const handleSplitToggle = (teamId: string, checked: boolean) => {
    setSplitAssignments(prev => prev.map(split => {
      if (split.teamId !== teamId) return split;
      return { ...split, selected: checked };
    }));
  };

  const handleSplitCountChange = (teamId: string, value: string) => {
    const parsed = Math.max(0, parseInt(value || '0', 10) || 0);
    setSplitAssignments(prev => prev.map(split => (
      split.teamId === teamId ? { ...split, count: parsed } : split
    )));
  };

  const prepareReassignConfirmation = async (mode: 'single' | 'split') => {
    if (!selectedAlert) return;

    const recommendation = reassignPlanDialog.recommendation || aiSuggestions?.recommendations?.find((r: any) => r.type === 'REASSIGNMENT');
    if (!recommendation) {
      alert('⚠️ Aucune recommandation de réaffectation disponible');
      return;
    }

    let payload: any;
    let summary = '';
    let totalCount = 0;

    if (mode === 'single') {
      payload = {
        action: 'REASSIGN',
        sourceTeamId: selectedAlert.team.id,
        teamId: recommendation.targetTeamId,
        targetTeamName: recommendation.target,
        count: recommendation.count
      };
      totalCount = recommendation.count;
      summary = `Confirmer la réaffectation de ${recommendation.count} document(s) vers ${recommendation.target} ?`;
    } else {
      const selectedSplits = splitAssignments
        .filter(split => split.selected && split.count > 0)
        .map(split => ({
          teamId: split.teamId,
          targetTeamName: split.targetTeamName,
          count: split.count
        }));

      if (selectedSplits.length === 0) {
        alert('⚠️ Sélectionnez au moins une équipe cible avec un volume supérieur à 0');
        return;
      }

      payload = {
        action: 'REASSIGN',
        sourceTeamId: selectedAlert.team.id,
        splits: selectedSplits
      };
      totalCount = selectedSplits.reduce((sum: number, split: any) => sum + split.count, 0);
      summary = `Confirmer la réaffectation répartie de ${totalCount} document(s) vers ${selectedSplits.map((split: any) => `${split.targetTeamName} (${split.count})`).join(', ')} ?`;
    }

    // Fetch document details to show in confirmation
    try {
      setLoadingDocumentPreview(true);
      const response = await LocalAPI.post('/super-admin/get-documents-preview', {
        teamId: selectedAlert.team.id,
        count: totalCount
      });
      setDocumentPreview(response.data.documents || []);
      setConfirmationDialog({ open: true, payload, summary, documentDetails: response.data.documents || [] });
    } catch (error) {
      console.error('Failed to load document preview:', error);
      setConfirmationDialog({ open: true, payload, summary, documentDetails: [] });
    } finally {
      setLoadingDocumentPreview(false);
    }
  };

  const executeConfirmedReassignment = async () => {
    if (!confirmationDialog.payload) return;

    try {
      const response = await LocalAPI.post('/super-admin/execute-action', confirmationDialog.payload);
      setConfirmationDialog({ open: false, payload: null, summary: '' });
      setReassignPlanDialog({ open: false, recommendation: null });
      setActionDialogOpen(false);

      if (response.data.success) {
        const message = response.data.targets?.length > 1
          ? `✅ ${response.data.reassignedCount} document(s) réaffecté(s): ${response.data.targets.map((target: any) => `${target.name} (${target.count})`).join(', ')}`
          : `✅ ${response.data.reassignedCount} document(s) réaffecté(s) vers ${response.data.targetTeam?.name || response.data.targetTeam?.fullName || 'la cible recommandée'}`;
        alert(message);
        loadAlerts();
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to execute reassignment:', error);
      alert(`❌ ${error?.response?.data?.message || 'Erreur lors de la réaffectation'}`);
    }
  };

  const openManualReassignDialog = async (teamId: string, teamName: string) => {
    setManualReassignDialog({ open: true, teamId, teamName });
    setSelectedDocId('');
    setManualTargetUser('');
    setLoadingManualDocs(true);
    try {
      const response = await LocalAPI.post('/super-admin/get-documents-preview', { teamId, count: 50 });
      setManualDocs(response.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setManualDocs([]);
    } finally {
      setLoadingManualDocs(false);
    }
  };

  const handleManualReassign = async () => {
    if (!manualTargetUser) return;
    setManualReassignLoading(true);
    try {
      const response = await LocalAPI.post('/super-admin/execute-action', {
        action: 'REASSIGN',
        sourceTeamId: manualReassignDialog.teamId,
        splits: [{ teamId: manualTargetUser, count: 1 }]
      });
      if (response.data.success) {
        alert(`✅ Document réaffecté avec succès vers ${response.data.targetTeam?.name || manualTargetUser}`);
        setManualReassignDialog({ open: false, teamId: '', teamName: '' });
        loadAlerts();
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      alert(`❌ ${error?.response?.data?.message || 'Erreur lors de la réaffectation'}`);
    } finally {
      setManualReassignLoading(false);
    }
  };

  const handleResolveAlert = async (alert: any) => {
    try {
      await resolveMutation.mutateAsync(alert.bordereau.id);
      setResolveConfirmDialog({ open: false, alert: null });
      refetchAlerts();
      alert('✅ Alerte marquée comme résolue avec succès!');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('❌ Erreur lors de la résolution de l\'alerte');
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
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(alert)}
                        >
                          Détails
                        </Button>
                        {/* Réaffecter button commented out - full reassignment logic available in detail popup */}
                        {/* <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => openManualReassignDialog(alert.team.id, alert.team.fullName)}
                        >
                          Réaffecter
                        </Button> */}
                      </Box>
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
              <Autocomplete
                value={clientFilter}
                onChange={(event, newValue) => setClientFilter(newValue || '')}
                options={Array.from(new Set(activeAlerts.map((alert: any) => 
                  alert.bordereau.contract?.client?.name || alert.bordereau.client?.name || 'N/A'
                )) as Set<string>).sort()}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    placeholder="Tous les clients"
                    size="small"
                    sx={{ bgcolor: 'white' }}
                  />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Gestionnaire</Typography>
              <Autocomplete
                value={gestionnaireFilter}
                onChange={(event, newValue) => setGestionnaireFilter(newValue || '')}
                options={Array.from(new Set(activeAlerts.map((alert: any) => 
                  alert.bordereau.contract?.teamLeader?.fullName || 
                  alert.bordereau.currentHandler?.fullName || 
                  'Non assigné'
                )) as Set<string>).sort()}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    placeholder="Tous les gestionnaires"
                    size="small"
                    sx={{ bgcolor: 'white' }}
                  />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
              />
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
                  <TableCell>Types de Documents</TableCell>
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
                    
                    const gestionnaireNameFromAlert = alert.bordereau.contract?.teamLeader?.fullName || 
                                                       alert.bordereau.currentHandler?.fullName || 
                                                       'Non assigné';
                    const matchesGestionnaire = !gestionnaireFilter || gestionnaireNameFromAlert === gestionnaireFilter;
                    
                    const alertSeverity = alert.alertLevel || alert.severity || alert.level;
                    const matchesSeverity = !severityFilter || alertSeverity === severityFilter;
                    
                    return matchesClient && matchesGestionnaire && matchesSeverity;
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
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {(() => {
                          const docTypes = alert.bordereau.documents?.reduce((acc: any, doc: any) => {
                            const type = doc.type || 'Autre';
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                          }, {}) || {};
                          return Object.entries(docTypes).map(([type, count]) => (
                            <Chip 
                              key={type} 
                              label={`${type}: ${count}`} 
                              size="small" 
                              variant="outlined"
                            />
                          ));
                        })()}
                        {(!alert.bordereau.documents || alert.bordereau.documents.length === 0) && (
                          <Typography variant="caption" color="text.secondary">Aucun</Typography>
                        )}
                      </Box>
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
                      {alert.slaPhase === 'FINANCE' ? (
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                📊 Suivi SLA en Deux Phases
                              </Typography>
                              <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Phase 1: Gestionnaire</strong>
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ pl: 1, mb: 1 }}>
                                ✅ Complété en {alert.slaInfo?.gestionnaireSla?.daysSince || 0} jours
                                <br />
                                Seuil: {alert.slaInfo?.gestionnaireSla?.threshold || 0} jours
                                <br />
                                Statut: Traitement terminé
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Phase 2: Finance</strong>
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ pl: 1 }}>
                                {alert.alertLevel === 'red' ? '🔴' : alert.alertLevel === 'orange' ? '🟠' : '🟢'} En cours: {alert.daysSinceReception} jours
                                <br />
                                Seuil: {alert.slaThreshold} jours
                                <br />
                                Statut: {alert.alertLevel === 'red' ? 'Retard - Action requise' : alert.alertLevel === 'orange' ? 'À risque' : 'Dans les délais'}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="left"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                maxWidth: 350,
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                '& .MuiTooltip-arrow': {
                                  color: 'background.paper',
                                },
                              },
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip 
                              label={`${alert.daysSinceReception} / ${alert.slaThreshold}`}
                              color={alert.alertLevel === 'red' ? 'error' : alert.alertLevel === 'orange' ? 'warning' : 'success'}
                              size="small"
                            />
                            <Typography variant="caption" color="text.secondary">
                              (Finance)
                            </Typography>
                            <Info fontSize="small" color="info" sx={{ cursor: 'pointer' }} />
                          </Box>
                        </Tooltip>
                      ) : (
                        <Chip 
                          label={`${alert.daysSinceReception} / ${alert.slaThreshold}`}
                          color={alert.alertLevel === 'red' ? 'error' : alert.alertLevel === 'orange' ? 'warning' : 'success'}
                          size="small"
                        />
                      )}
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
                            onClick={() => setResolveConfirmDialog({ open: true, alert })}
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
              
              const gestionnaireNameFromAlert = alert.bordereau.contract?.teamLeader?.fullName || 
                                                 alert.bordereau.currentHandler?.fullName || 
                                                 'Non assigné';
              const matchesGestionnaire = !gestionnaireFilter || gestionnaireNameFromAlert === gestionnaireFilter;
              
              const alertSeverity = alert.alertLevel || alert.severity || alert.level;
              const matchesSeverity = !severityFilter || alertSeverity === severityFilter;
              
              return matchesClient && matchesGestionnaire && matchesSeverity;
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
          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              📊 Qu'est-ce qu'une alerte résolue ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Une alerte est marquée comme <strong>résolue</strong> lorsqu'un utilisateur <strong>prend une action concrète</strong> pour traiter le problème :
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                🔄 <strong>Réaffectation</strong> du bordereau à un autre gestionnaire
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                📧 <strong>Notification</strong> envoyée au client ou à l'équipe
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚡ <strong>Escalade</strong> vers le chef d'équipe ou responsable
                <Tooltip 
                  title={
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        🎯 Qu'est-ce que l'Escalade ?
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Escalade = Remonter un problème vers la hiérarchie supérieure</strong> quand il ne peut pas être résolu au niveau actuel.
                      </Typography>
                      
                      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1, mb: 0.5 }}>
                        📊 Hiérarchie d'Escalade:
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ pl: 1 }}>
                        1️⃣ Gestionnaire → 2️⃣ Chef d'Équipe → 3️⃣ Responsable Département → 4️⃣ Super Admin
                      </Typography>
                      
                      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1, mb: 0.5 }}>
                        🔥 Quand escalader ?
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ pl: 1 }}>
                        • Dépassement SLA critique (100%+)<br/>
                        • Gestionnaire surchargé<br/>
                        • Dossier bloqué (documents manquants)<br/>
                        • Réclamation client importante<br/>
                        • Retards répétés
                      </Typography>
                      
                      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1, mb: 0.5 }}>
                        ⚡ Que se passe-t-il ?
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ pl: 1 }}>
                        ✅ Notification au manager<br/>
                        ✅ Priorité augmentée<br/>
                        ✅ Visibilité management<br/>
                        ✅ Action requise<br/>
                        ✅ Traçabilité complète
                      </Typography>
                      
                      <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                        <Typography variant="caption">
                          💡 <strong>Exemple:</strong> Bordereau 74 jours en retard → Escalade au Chef → Chef réaffecte ou contacte client directement
                        </Typography>
                      </Alert>
                    </Box>
                  }
                  arrow
                  placement="right"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        maxWidth: 450,
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        boxShadow: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiTooltip-arrow': {
                          color: 'background.paper',
                        },
                      },
                    },
                  }}
                >
                  <IconButton size="small" color="info" sx={{ ml: 0.5 }}>
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                📝 <strong>Commentaire/Action</strong> documenté dans le système
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                ⚠️ <strong>Important:</strong> Résoudre une alerte ne clôture PAS le bordereau. 
                Le bordereau atteint le statut CLOTURE uniquement via le workflow Finance (après paiement).
              </Typography>
            </Alert>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Bordereau</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Niveau Initial</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Créé le</TableCell>
                  <TableCell>Résolu par</TableCell>
                  <TableCell>Résolu le</TableCell>
                  <TableCell>Temps de Résolution</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolvedAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Box sx={{ py: 4 }}>
                        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="body1" fontWeight={600} gutterBottom>
                          Aucune alerte résolue récemment
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Les alertes résolues apparaîtront ici avec leur historique complet
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  resolvedAlerts
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((alert: any) => {
                      // Calculate resolution time
                      const createdDate = new Date(alert.createdAt);
                      const resolvedDate = alert.resolvedAt ? new Date(alert.resolvedAt) : new Date();
                      const resolutionHours = Math.round((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
                      const resolutionDays = Math.floor(resolutionHours / 24);
                      const remainingHours = resolutionHours % 24;
                      
                      let resolutionTimeDisplay = '';
                      let resolutionColor = 'success.main';
                      
                      if (resolutionDays > 0) {
                        resolutionTimeDisplay = `${resolutionDays}j ${remainingHours}h`;
                        if (resolutionDays > 7) resolutionColor = 'error.main';
                        else if (resolutionDays > 3) resolutionColor = 'warning.main';
                      } else {
                        resolutionTimeDisplay = `${resolutionHours}h`;
                        if (resolutionHours > 48) resolutionColor = 'warning.main';
                      }
                      
                      return (
                      <TableRow key={alert.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {alert.bordereau?.contract?.client?.name || 
                             alert.bordereau?.client?.name || 
                             'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {alert.bordereau?.reference || alert.bordereauId || alert.bordereau?.id || '-'}
                          </Typography>
                          {alert.bordereau?.statut && (
                            <Chip 
                              label={alert.bordereau.statut} 
                              size="small" 
                              color="success"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {alert.alertType === 'SLA_RISK' ? '⏰ Risque SLA' :
                               alert.alertType === 'SLA_BREACH' ? '🚨 Dépassement SLA' :
                               alert.alertType === 'TEAM_OVERLOAD' ? '👥 Surcharge Équipe' :
                               alert.alertType || alert.reason || 'Alerte'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.reason || 'Alerte système'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alertLevelLabel(alert.alertLevel)}
                            size="small"
                            sx={{
                              bgcolor: alertLevelColor(alert.alertLevel),
                              color: '#fff'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 250 }}>
                            {alert.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <People fontSize="small" color="primary" />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {alert.user?.fullName || alert.resolvedBy || 'Système'}
                              </Typography>
                              {alert.user?.role && (
                                <Typography variant="caption" color="text.secondary">
                                  {alert.user.role}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {alert.resolvedAt 
                              ? new Date(alert.resolvedAt).toLocaleDateString('fr-FR')
                              : 'N/A'}
                          </Typography>
                          {alert.resolvedAt && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(alert.resolvedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <HourglassEmptyIcon fontSize="small" sx={{ color: resolutionColor }} />
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ color: resolutionColor }}>
                                {resolutionTimeDisplay}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {resolutionHours < 24 ? '🟢 Rapide' :
                                 resolutionHours < 72 ? '🟡 Normal' :
                                 resolutionHours < 168 ? '🟠 Long' : '🔴 Très long'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {resolvedAlerts.length > 0 && (
            <>
              <TablePagination
                component="div"
                count={resolvedAlerts.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                labelRowsPerPage="Lignes par page:"
              />
              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderTop: '1px solid #4caf50' }}>
                <Typography variant="subtitle2" fontWeight={600} color="success.dark" gutterBottom>
                  📈 Statistiques de Résolution
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {resolvedAlerts.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Résolues
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {(() => {
                          const avgHours = resolvedAlerts.reduce((sum: number, alert: any) => {
                            const created = new Date(alert.createdAt).getTime();
                            const resolved = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
                            return sum + ((resolved - created) / (1000 * 60 * 60));
                          }, 0) / (resolvedAlerts.length || 1);
                          return Math.round(avgHours) + 'h';
                        })()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Temps Moyen
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {(() => {
                          const fast = resolvedAlerts.filter((alert: any) => {
                            const created = new Date(alert.createdAt).getTime();
                            const resolved = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
                            const hours = (resolved - created) / (1000 * 60 * 60);
                            return hours < 24;
                          }).length;
                          return Math.round((fast / (resolvedAlerts.length || 1)) * 100) + '%';
                        })()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Résolues &lt;24h
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {(() => {
                          const slow = resolvedAlerts.filter((alert: any) => {
                            const created = new Date(alert.createdAt).getTime();
                            const resolved = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
                            const hours = (resolved - created) / (1000 * 60 * 60);
                            return hours > 168;
                          }).length;
                          return slow;
                        })()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Résolues &gt;7j
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </>
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
              
              {alertDetailDialog.aiSolution && alertDetailDialog.aiSolution.document_details && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📄 Documents du Bordereau
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Nombre:</strong> {alertDetailDialog.aiSolution.document_details.count} document(s)
                  </Typography>
                  {alertDetailDialog.aiSolution.document_details.types && alertDetailDialog.aiSolution.document_details.types.length > 0 && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>Types:</strong> {alertDetailDialog.aiSolution.document_details.types.join(', ')}
                    </Typography>
                  )}
                  
                  {alertDetailDialog.aiSolution.document_details.documents && alertDetailDialog.aiSolution.document_details.documents.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                        Liste détaillée:
                      </Typography>
                      <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'white', borderRadius: 1, p: 1 }}>
                        {alertDetailDialog.aiSolution.document_details.documents.map((doc: any, idx: number) => (
                          <Box 
                            key={doc.id} 
                            sx={{ 
                              p: 1, 
                              mb: 0.5, 
                              bgcolor: '#f5f5f5', 
                              borderRadius: 0.5,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" fontWeight={600}>
                                {idx + 1}. {doc.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Type: {doc.type}
                              </Typography>
                            </Box>
                            <Chip 
                              label={doc.status || 'N/A'} 
                              size="small" 
                              color={doc.status === 'TRAITE' ? 'success' : doc.status === 'EN_COURS' ? 'warning' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              
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
                    <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, mb: 2 }}>
                      {alertDetailDialog.aiSolution.actions?.map((action: string, idx: number) => (
                        <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                          {idx + 1}. {action}
                        </Typography>
                      ))}
                    </Box>
                    
                    {alertDetailDialog.aiSolution.priority && (
                      <Alert severity={alertDetailDialog.aiSolution.priority === 'URGENT' ? 'error' : 'warning'} sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Priorité: {alertDetailDialog.aiSolution.priority}
                        </Typography>
                        <Typography variant="caption">
                          {alertDetailDialog.aiSolution.reasoning}
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Quick Actions Section */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        🛠️ ACTIONS RAPIDES
                      </Typography>
                      <Stack spacing={1.5}>
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<People />}
                          onClick={async () => {
                            const bordereau = alertDetailDialog.alert.bordereau;
                            // The correct assigned user is in contract.teamLeader, NOT currentHandler
                            const currentHandler = bordereau.contract?.teamLeader?.fullName || 'Non assigné';
                            
                            setReassignDialog({
                              open: true,
                              bordereau: bordereau,
                              currentHandler: currentHandler
                            });
                            
                            // Load AI suggestions for reassignment
                            setLoadingReassignSuggestions(true);
                            try {
                              console.log('🤖 Loading AI suggestions for bordereau:', alertDetailDialog.alert.bordereau.id);
                              const response = await LocalAPI.post('/analytics/ai/reassign-suggestion', {
                                bordereau_id: alertDetailDialog.alert.bordereau.id || alertDetailDialog.alert.bordereau.reference,
                                current_handler_id: alertDetailDialog.alert.bordereau.currentHandler?.id || alertDetailDialog.alert.bordereau.assignedToUserId,
                                sla_days: getSLAStatus(alertDetailDialog.alert),
                                urgency: alertDetailDialog.alert.alertLevel === 'red' ? 'critical' : 'normal',
                                complexity: alertDetailDialog.alert.bordereau.nombreBS || 1
                              });
                              console.log('🤖 AI Suggestions Response:', response.data);
                              setReassignSuggestions(response.data);
                            } catch (error: any) {
                              console.error('❌ Failed to load reassign suggestions:', error);
                              console.error('Error details:', error.response?.data || error.message);
                              setReassignSuggestions(null);
                            } finally {
                              setLoadingReassignSuggestions(false);
                            }
                          }}
                          sx={{ justifyContent: 'flex-start', py: 1.5 }}
                        >
                          🔄 Réaffecter ce Bordereau
                        </Button>

                      </Stack>
                    </Box>
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
                    onClick={() => {
                      openReassignPlanDialog();
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
                        const currentTeamMember = teamWorkload.find(t => t.name === selectedAlert.team.fullName);
                        const response = await LocalAPI.post('/super-admin/execute-action', {
                          action: 'NOTIFY',
                          teamId: selectedAlert.team.id,
                          teamName: selectedAlert.team.fullName,
                          message: `Alerte: Votre équipe est surchargée (${currentTeamMember?.utilizationRate || 0}%)`
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
                      <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        • {suggestion}
                      </Typography>
                    ))}
                    {aiSuggestions.recommendations?.map((rec: any, idx: number) => (
                      <Box key={`rec-${idx}`} sx={{ mb: 1.5, p: 1.25, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" fontWeight={600}>
                          • {rec.action || rec.recommendation}
                        </Typography>
                        {rec.rationale && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {rec.rationale}
                          </Typography>
                        )}
                        {rec.type === 'REASSIGNMENT' && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Cible: {rec.target} ({rec.targetRole}) • Charge actuelle: {rec.targetUtilizationRate}% • Performance: {rec.targetPerformanceScore} • Projection source: ~{rec.projectedSourceRate}%
                          </Typography>
                        )}
                        {rec.type === 'CAPACITY_INCREASE' && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            +{rec.additionalCapacityUnits} doc/jour estimés • {rec.estimatedPeople} ressource(s) • Hausse: {rec.percentage}%
                          </Typography>
                        )}
                        {rec.type === 'PRIORITIZATION' && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {rec.overdueCount} en retard • {rec.urgentCount} à moins de 3 jours
                          </Typography>
                        )}
                        {rec.type === 'REASSIGNMENT_ALTERNATIVES' && rec.options?.length > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Alternatives: {rec.options.map((option: any) => `${option.name} (${option.role}, ${option.utilizationRate}%)`).join(' | ')}
                          </Typography>
                        )}
                      </Box>
                    ))}
                    {aiSuggestions.analysis && (
                      <Alert severity={aiSuggestions.analysis.status === 'CRITICAL' ? 'error' : 'info'} sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          Analyse: {aiSuggestions.analysis.totalDocuments} docs • {aiSuggestions.analysis.urgentDocuments} urgents • {aiSuggestions.analysis.overdueDocuments} en retard • {aiSuggestions.analysis.availableTeams} cible(s) éligible(s)
                        </Typography>
                        {aiSuggestions.analysis.bestTargetTeam && (
                          <Typography variant="caption" display="block">
                            Meilleure cible détectée: {aiSuggestions.analysis.bestTargetTeam.name} ({aiSuggestions.analysis.bestTargetTeam.role}) - {aiSuggestions.analysis.bestTargetTeam.utilizationRate}% de charge
                          </Typography>
                        )}
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Analyse IA indisponible.
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
            onClick={async () => {
              if (!selectedAlert) return;
              const currentTeamMember = teamWorkload.find(t => t.name === selectedAlert.team.fullName);
              setActionDialogOpen(false);
              try {
                const response = await LocalAPI.post('/super-admin/execute-action', {
                  action: 'NOTIFY',
                  teamId: selectedAlert.team.id,
                  teamName: selectedAlert.team.fullName,
                  message: `Alerte: Votre équipe est surchargée (${currentTeamMember?.utilizationRate || 0}%)`
                });
                alert(response.data.success ? `✅ ${response.data.message}` : `❌ ${response.data.message}`);
              } catch (error) {
                alert('❌ Erreur lors de l\'envoi de la notification');
              }
            }}
          >
            Notifier
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              openReassignPlanDialog();
            }}
          >
            Réaffecter Documents
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={reassignPlanDialog.open}
        onClose={() => setReassignPlanDialog({ open: false, recommendation: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Plan de Réaffectation Intelligent</DialogTitle>
        <DialogContent>
          {reassignPlanDialog.recommendation && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Cible principale recommandée:</strong> {reassignPlanDialog.recommendation.target} • {reassignPlanDialog.recommendation.targetUtilizationRate}% de charge • score {reassignPlanDialog.recommendation.targetPerformanceScore}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  {reassignPlanDialog.recommendation.rationale}
                </Typography>
              </Alert>

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Meilleures options de réaffectation
              </Typography>

              <Stack spacing={1.5}>
                {splitAssignments.map((split) => (
                  <Paper key={split.teamId} variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={split.selected}
                            onChange={(e) => handleSplitToggle(split.teamId, e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {split.targetTeamName}
                            </Typography>
                          </Box>
                        }
                      />
                      <TextField
                        type="number"
                        size="small"
                        label="Nb documents"
                        value={split.count}
                        onChange={(e) => handleSplitCountChange(split.teamId, e.target.value)}
                        disabled={!split.selected}
                        inputProps={{ min: 0 }}
                        sx={{ width: 140 }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Mode 1:</strong> tout envoyer à la meilleure cible recommandée.
                </Typography>
                <Typography variant="body2">
                  <strong>Mode 2:</strong> répartir les documents entre plusieurs équipes pour réduire plus vite la surcharge.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignPlanDialog({ open: false, recommendation: null })}>
            Annuler
          </Button>
          <Button variant="outlined" onClick={() => prepareReassignConfirmation('single')}>
            Affecter tout à la meilleure cible
          </Button>
          <Button variant="contained" onClick={() => prepareReassignConfirmation('split')}>
            Confirmer la répartition
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationDialog.open}
        onClose={() => setConfirmationDialog({ open: false, payload: null, summary: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Confirmation finale - Réaffectation de Documents</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>{confirmationDialog.summary}</Typography>
          </Alert>

          {loadingDocumentPreview ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Chargement des documents...</Typography>
            </Box>
          ) : confirmationDialog.documentDetails && confirmationDialog.documentDetails.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                📄 Documents à réaffecter ({confirmationDialog.documentDetails.length}):
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
                {confirmationDialog.documentDetails.map((doc: any, idx: number) => (
                  <Box 
                    key={doc.id} 
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      bgcolor: doc.isOverdue ? '#ffebee' : doc.isUrgent ? '#fff3e0' : '#f5f5f5',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: doc.isOverdue ? '#ef5350' : doc.isUrgent ? '#ff9800' : '#e0e0e0'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>
                          {idx + 1}. {doc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Type: {doc.type} • Bordereau: {doc.bordereauReference}
                        </Typography>
                      </Box>
                      <Box>
                        {doc.isOverdue ? (
                          <Chip label="En retard" color="error" size="small" />
                        ) : doc.isUrgent ? (
                          <Chip label="Urgent" color="warning" size="small" />
                        ) : (
                          <Chip label={`${doc.remainingDays}j restants`} color="success" size="small" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Paper>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  ℹ️ Ces documents seront réaffectés au niveau document (pas bordereau). Chaque document sera traité individuellement.
                </Typography>
              </Alert>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationDialog({ open: false, payload: null, summary: '' })}>
            Retour
          </Button>
          <Button variant="contained" color="error" onClick={executeConfirmedReassignment}>
            Confirmer et Exécuter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Reassign Dialog */}
      <Dialog open={manualReassignDialog.open} onClose={() => !manualReassignLoading && setManualReassignDialog({ open: false, teamId: '', teamName: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <People color="warning" />
            <Typography variant="h6">Réaffectation Manuelle — {manualReassignDialog.teamName}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sélectionnez un document à réaffecter et choisissez le nouveau responsable.
          </Alert>

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Document à réaffecter:</Typography>
          {loadingManualDocs ? (
            <Typography variant="body2" color="text.secondary">Chargement des documents...</Typography>
          ) : (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Document</InputLabel>
              <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} label="Document" disabled={manualReassignLoading}>
                <MenuItem value=""><em>-- Sélectionner un document --</em></MenuItem>
                {manualDocs.map((doc: any) => (
                  <MenuItem key={doc.id} value={doc.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{doc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.type} • Bordereau: {doc.bordereauReference} •{' '}
                        {doc.isOverdue ? '🔴 En retard' : doc.isUrgent ? '🟠 Urgent' : `🟢 ${doc.remainingDays}j restants`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Nouveau responsable:</Typography>
          <FormControl fullWidth>
            <InputLabel>Utilisateur cible</InputLabel>
            <Select value={manualTargetUser} onChange={(e) => setManualTargetUser(e.target.value)} label="Utilisateur cible" disabled={manualReassignLoading}>
              <MenuItem value=""><em>-- Sélectionner --</em></MenuItem>
              {availableUsers.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  <Box>
                    <Typography variant="body2">{user.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.role} — {user.email}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualReassignDialog({ open: false, teamId: '', teamName: '' })} disabled={manualReassignLoading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleManualReassign}
            disabled={!manualTargetUser || manualReassignLoading}
            startIcon={manualReassignLoading ? <HourglassEmptyIcon /> : <People />}
          >
            {manualReassignLoading ? 'Réaffectation...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Bordereau Dialog */}
      <Dialog open={reassignDialog.open} onClose={() => !reassignLoading && setReassignDialog({ open: false, bordereau: null, currentHandler: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <People />
            <Typography variant="h6">🔄 Réaffecter le Bordereau</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {reassignDialog.bordereau && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Bordereau:</strong> {reassignDialog.bordereau.reference || reassignDialog.bordereau.id}<br/>
                  <strong>Actuellement assigné à:</strong> {reassignDialog.currentHandler}
                </Typography>
              </Alert>
              
              {/* AI Suggestions Section */}
              {loadingReassignSuggestions ? (
                <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 1, mb: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    🤖 Analyse IA en cours...
                  </Typography>
                </Box>
              ) : reassignSuggestions?.suggestions ? (
                <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 1, border: '1px solid #2196f3', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🤖 Suggestions IA ({reassignSuggestions.suggestions.length})
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Algorithme: {reassignSuggestions.algorithm} - Confiance: {Math.round(reassignSuggestions.confidence * 100)}%
                  </Typography>
                  
                  {reassignSuggestions.suggestions?.map((suggestion: any, idx: number) => (
                    <Box 
                      key={idx}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: suggestion.is_recommended ? '#e8f5e9' : 'white', 
                        borderRadius: 1, 
                        mb: 1,
                        border: suggestion.is_recommended ? '2px solid #4caf50' : '1px solid #e0e0e0',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: suggestion.is_recommended ? '#c8e6c9' : '#f5f5f5' }
                      }}
                      onClick={() => setSelectedUser(suggestion.user_id)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={600}>
                            {suggestion.is_recommended && '⭐ '}{suggestion.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.role} - Charge: {suggestion.workload_percentage}% - Disponibilité: {suggestion.availability}
                          </Typography>
                        </Box>
                        {suggestion.is_recommended && (
                          <Chip label="Recommandé" color="success" size="small" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        💡 {suggestion.reasoning}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}
              
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Sélectionner le nouveau gestionnaire:
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Gestionnaire</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Gestionnaire"
                  disabled={reassignLoading}
                >
                  <MenuItem value="">
                    <em>-- Sélectionner --</em>
                  </MenuItem>
                  {availableUsers.map((user) => {
                    const suggestion = reassignSuggestions?.suggestions?.find((s: any) => s.user_id === user.id);
                    const isRecommended = suggestion?.is_recommended;
                    
                    return (
                    <MenuItem key={user.id} value={user.id}>
                      <Box sx={{ width: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">
                            {isRecommended && '⭐ '}{user.fullName}
                          </Typography>
                          {isRecommended && (
                            <Chip label="IA" color="success" size="small" sx={{ ml: 1 }} />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {user.role} - {user.email}
                        </Typography>
                        {suggestion && (
                          <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                            Charge: {suggestion.workload_percentage}% - {suggestion.reasoning}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              
              {selectedUser && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ⚠️ Confirmation requise
                  </Typography>
                  <Typography variant="caption">
                    Le bordereau sera réaffecté et une notification sera envoyée au nouveau gestionnaire.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialog({ open: false, bordereau: null, currentHandler: '' })} disabled={reassignLoading}>
            Annuler
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleReassignBordereau}
            disabled={!selectedUser || reassignLoading}
            startIcon={reassignLoading ? <HourglassEmptyIcon /> : <People />}
          >
            {reassignLoading ? 'Réaffectation...' : 'Confirmer la Réaffectation'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notify Client Dialog */}
      <Dialog open={notifyClientDialog.open} onClose={() => !sendingEmail && setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'info.main', color: 'white' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Notifications />
            <Typography variant="h6">📧 Notifier le Client</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {notifyClientDialog.bordereau && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Bordereau:</strong> {notifyClientDialog.bordereau.reference || notifyClientDialog.bordereau.id}<br/>
                  <strong>Client:</strong> {notifyClientDialog.bordereau.contract?.client?.name || notifyClientDialog.bordereau.client?.name || 'N/A'}<br/>
                  <strong>Retard:</strong> {notifyClientDialog.slaDays} jours
                </Typography>
              </Alert>
              
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Message au client:
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={10}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Saisir le message..."
                disabled={sendingEmail}
                sx={{ mb: 2 }}
              />
              
              <Alert severity="success" icon={<Info />}>
                <Typography variant="caption">
                  🤖 Message généré automatiquement par l'IA. Vous pouvez le modifier avant l'envoi.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 })} disabled={sendingEmail}>
            Annuler
          </Button>
          <Button 
            variant="contained" 
            color="info"
            onClick={handleNotifyClient}
            disabled={!emailMessage.trim() || sendingEmail}
            startIcon={sendingEmail ? <HourglassEmptyIcon /> : <Notifications />}
          >
            {sendingEmail ? 'Envoi...' : 'Envoyer la Notification'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Resolve Alert Confirmation Dialog */}
      <Dialog 
        open={resolveConfirmDialog.open} 
        onClose={() => setResolveConfirmDialog({ open: false, alert: null })} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle />
          <Typography variant="h6">Confirmer la Résolution</Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {resolveConfirmDialog.alert && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  ⚠️ Êtes-vous sûr de vouloir marquer cette alerte comme résolue ?
                </Typography>
              </Alert>
              
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  📄 Détails de l'Alerte
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Bordereau:</strong> {resolveConfirmDialog.alert.bordereau.reference || resolveConfirmDialog.alert.bordereau.id}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Client:</strong> {resolveConfirmDialog.alert.bordereau.contract?.client?.name || resolveConfirmDialog.alert.bordereau.client?.name || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Type:</strong> {resolveConfirmDialog.alert.reason === 'SLA breach' ? 'Dépassement SLA' : resolveConfirmDialog.alert.reason}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Niveau:</strong> <Chip 
                    label={alertLevelLabel(resolveConfirmDialog.alert.alertLevel)} 
                    size="small"
                    sx={{ bgcolor: alertLevelColor(resolveConfirmDialog.alert.alertLevel), color: 'white' }}
                  />
                </Typography>
                <Typography variant="body2">
                  <strong>Statut actuel:</strong> {resolveConfirmDialog.alert.bordereau.statut}
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #4caf50' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ✅ Ce que fait "Marquer Résolu"
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Archive l'alerte</strong> - L'alerte disparaît de la liste "Alertes Actives"
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Enregistre l'action</strong> - Votre nom et la date de résolution sont enregistrés
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Apparaît dans l'historique</strong> - L'alerte sera visible dans l'onglet "Alertes Résolues"
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Traçabilité complète</strong> - Temps de résolution et statistiques calculés automatiquement
                  </Typography>
                </Box>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 <strong>Important:</strong> Marquer une alerte comme résolue signifie que vous avez pris une action concrète (réaffectation, notification, escalade, etc.). Le bordereau lui-même reste dans son statut actuel jusqu'à ce qu'il soit traité complètement via le workflow normal.
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                <Typography variant="caption" color="text.secondary">
                  ⚠️ <strong>Rappel:</strong> Cette action ne peut pas être annulée. L'alerte restera dans l'historique mais ne pourra plus être réactivée.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setResolveConfirmDialog({ open: false, alert: null })}
            variant="outlined"
          >
            Annuler
          </Button>
          <Button 
            onClick={() => resolveConfirmDialog.alert && handleResolveAlert(resolveConfirmDialog.alert)}
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
          >
            Confirmer la Résolution
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAlerts;
