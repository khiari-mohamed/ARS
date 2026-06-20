// src/components/analytics/SuperAdminAlerts.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Autocomplete,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Warning,
  Notifications,
  People,
  Assignment,
  Refresh,
  Info,
  Visibility,
  CheckCircle,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';
import { getWorkloadPredictions } from '../../services/superAdminService';
import { useAlertsDashboard, useResolveAlert, useAlertHistory } from '../../hooks/useAlertsQuery';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverloadAlert {
  team: { id: string; fullName: string; role: string };
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

interface SnackState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const designSx = {
  root: { p: { xs: 2, md: 3 } },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 2,
    mb: 3,
  },

  pageTitle: {
    fontWeight: 800,
    color: '#1e3a5f',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    fontSize: { xs: '1.3rem', md: '1.6rem' },
  },

  sectionCard: {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 2,
    boxShadow: 'none',
    mb: 2,
    overflow: 'hidden',
  },

  sectionTitle: {
    fontWeight: 700,
    color: '#1e3a5f',
    fontSize: '0.78rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },

  tabBar: {
    borderBottom: '2px solid #e0e7ef',
    px: 2,
    '& .MuiTab-root': {
      fontWeight: 600,
      fontSize: '0.78rem',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: '#546e7a',
      minHeight: 48,
      '&.Mui-selected': { color: '#1e3a5f' },
    },
    '& .MuiTabs-indicator': {
      background: 'linear-gradient(90deg, #1e3a5f, #b71c1c)',
      height: 3,
      borderRadius: '3px 3px 0 0',
    },
  },

  tableHeader: {
    background: '#1e3a5f',
    '& .MuiTableCell-head': {
      color: '#fff',
      fontWeight: 700,
      fontSize: '0.70rem',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      borderRight: '1px solid rgba(255,255,255,0.12)',
      '&:last-child': { borderRight: 'none' },
      py: 1.25,
      whiteSpace: 'nowrap' as const,
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

  kpiBox: (bg: string, color: string) => ({
    textAlign: 'center' as const,
    p: 2,
    bgcolor: bg,
    borderRadius: 2,
    border: `1px solid ${color}22`,
  }),

  filterPanel: {
    p: 2,
    background: '#f0f4ff',
    borderBottom: '1px solid #d0dff5',
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap' as const,
    alignItems: 'flex-end',
  },

  inputSx: {
    '& .MuiOutlinedInput-root': {
      background: '#fff',
      '&:hover fieldset': { borderColor: '#2563a8' },
      '&.Mui-focused fieldset': { borderColor: '#1e3a5f' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1e3a5f' },
  },

  dialogTitleNavy: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)',
    color: '#fff',
    py: 2,
    px: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },

  dialogTitleSuccess: {
    background: 'linear-gradient(135deg, #1b6b3a 0%, #2e7d32 100%)',
    color: '#fff',
    py: 2,
    px: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },

  dialogTitleInfo: {
    background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
    color: '#fff',
    py: 2,
    px: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },

  dialogActions: {
    px: 3,
    py: 2,
    borderTop: '1px solid #e0e7ef',
    gap: 1,
  },

  metricBox: {
    background: '#f4f7fb',
    border: '1px solid #e0e7ef',
    borderRadius: 1.5,
    p: 1.5,
    textAlign: 'center' as const,
  },

  metricLabel: {
    color: '#546e7a',
    fontSize: '0.68rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    fontWeight: 600,
    mb: 0.25,
  },

  metricValue: (color?: string) => ({
    fontWeight: 800,
    fontSize: '1.35rem',
    color: color ?? '#1e3a5f',
    lineHeight: 1,
  }),

  resolvedInfoBox: {
    p: 2,
    background: '#f4f7fb',
    borderBottom: '1px solid #e0e7ef',
  },

  statsFooter: {
    p: 2,
    background: '#e6f4ed',
    borderTop: '1px solid #a5d6a7',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Fix: separate page states per tab to avoid cross-tab pagination confusion
  const [pageTab1, setPageTab1] = useState(0);
  const [pageTab2, setPageTab2] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [alertDetailDialog, setAlertDetailDialog] = useState<{
    open: boolean; alert: any | null; aiSolution: any | null; loadingAI: boolean;
  }>({ open: false, alert: null, aiSolution: null, loadingAI: false });

  const [clientFilter, setClientFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [gestionnaireFilter, setGestionnaireFilter] = useState('');

  const [reassignDialog, setReassignDialog] = useState<{
    open: boolean; bordereau: any | null; currentHandler: string;
  }>({ open: false, bordereau: null, currentHandler: '' });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSuggestions, setReassignSuggestions] = useState<any>(null);
  const [loadingReassignSuggestions, setLoadingReassignSuggestions] = useState(false);

  const [notifyClientDialog, setNotifyClientDialog] = useState<{
    open: boolean; bordereau: any | null; aiSolution: any | null; slaDays: number;
  }>({ open: false, bordereau: null, aiSolution: null, slaDays: 0 });
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [reassignPlanDialog, setReassignPlanDialog] = useState<{
    open: boolean; recommendation: any | null;
  }>({ open: false, recommendation: null });

  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean; payload: any | null; summary: string; documentDetails?: any[];
  }>({ open: false, payload: null, summary: '' });

  const [splitAssignments, setSplitAssignments] = useState<
    Array<{ teamId: string; targetTeamName: string; count: number; selected: boolean }>
  >([]);
  const [documentPreview, setDocumentPreview] = useState<any[]>([]);
  const [loadingDocumentPreview, setLoadingDocumentPreview] = useState(false);

  const [manualReassignDialog, setManualReassignDialog] = useState<{
    open: boolean; teamId: string; teamName: string;
  }>({ open: false, teamId: '', teamName: '' });
  const [manualDocs, setManualDocs] = useState<any[]>([]);
  const [loadingManualDocs, setLoadingManualDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [manualTargetUser, setManualTargetUser] = useState('');
  const [manualReassignLoading, setManualReassignLoading] = useState(false);

  const [resolveConfirmDialog, setResolveConfirmDialog] = useState<{
    open: boolean; alert: any | null;
  }>({ open: false, alert: null });

  // Fix: replace all alert() calls with a snackbar to avoid name collisions
  // and improve UX
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });
  const showSnack = useCallback((message: string, severity: SnackState['severity'] = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  // ── React Query hooks ─────────────────────────────────────────────────────

  const { data: alertsResponse, refetch: refetchAlerts } = useAlertsDashboard({});
  const alerts = alertsResponse || [];
  const resolveMutation = useResolveAlert();
  const { data: historyData } = useAlertHistory({ resolved: true });
  const resolvedFromHistory = historyData || [];

  const activeAlerts = alerts;
  const resolvedAlerts = resolvedFromHistory;

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadAvailableUsers = useCallback(async () => {
    try {
      const response = await LocalAPI.get('/users');
      const users = response.data.filter(
        (u: any) =>
          ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'].includes(u.role) &&
          u.role !== 'SUPER_ADMIN' &&
          u.role !== 'RESPONSABLE_DEPARTEMENT',
      );
      setAvailableUsers(users);
    } catch {
      // non-critical
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await LocalAPI.get('/super-admin/team-alerts');
      const alertsData = response.data;

      const teamResponse = await LocalAPI.get('/super-admin/team-workload');
      setTeamWorkload(teamResponse.data);

      const overloadData = alertsData.alerts
        .filter((a: any) => a.type === 'TEAM_OVERLOAD' || a.type === 'TEAM_BUSY')
        .map((a: any) => ({
          team: { id: a.teamId, fullName: a.teamName, role: '' },
          count: a.workload || 0,
          alert: a.level === 'CRITICAL' ? 'red' : 'orange',
          reason: a.message,
        }));

      setOverloadAlerts(overloadData);

      try {
        const predictions = await getWorkloadPredictions();
        setDelayPredictions({
          forecast: predictions.forecast || [],
          trend_direction: predictions.trend || 'stable',
          recommendations: predictions.recommendations || [],
          ai_confidence: predictions.confidence || 0,
          next_week_prediction: predictions.nextWeek || 0,
        });
      } catch {
        setDelayPredictions(null);
      }

      refetchAlerts();
    } catch {
      // non-critical — UI stays with existing data
    } finally {
      setLoading(false);
    }
  }, [refetchAlerts]);

  useEffect(() => {
    loadAlerts();
    loadAvailableUsers();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [loadAlerts, loadAvailableUsers]);

  // Auto-generate email message when notify dialog opens
  useEffect(() => {
    if (!notifyClientDialog.open || !notifyClientDialog.bordereau) return;
    const client =
      notifyClientDialog.bordereau.contract?.client?.name ||
      notifyClientDialog.bordereau.client?.name ||
      'Client';
    const reference =
      notifyClientDialog.bordereau.reference || notifyClientDialog.bordereau.id;
    const days = notifyClientDialog.slaDays;
    const actions =
      notifyClientDialog.aiSolution?.actions
        ?.map((a: string, i: number) => `${i + 1}. ${a}`)
        .join('\n') || '- Traitement prioritaire du dossier';

    setEmailMessage(
      `Cher ${client},\n\nNous vous informons que le traitement du bordereau ${reference} accuse un retard de ${days} jours.\n\nNous mettons en place les actions suivantes pour régulariser la situation :\n${actions}\n\nNous nous excusons pour ce désagrément et restons à votre disposition pour toute question.\n\nCordialement,\nÉquipe ARS`,
    );
  }, [notifyClientDialog.open, notifyClientDialog.bordereau, notifyClientDialog.slaDays, notifyClientDialog.aiSolution]);

  // ── Derived / memos ───────────────────────────────────────────────────────

  const filteredActiveAlerts = useMemo(
    () =>
      activeAlerts.filter((a: any) => {
        const clientName =
          a.bordereau.contract?.client?.name || a.bordereau.client?.name || 'N/A';
        const gName =
          a.bordereau.contract?.teamLeader?.fullName ||
          a.bordereau.currentHandler?.fullName ||
          'Non assigné';
        const sev = a.alertLevel || a.severity || a.level;
        return (
          (!clientFilter || clientName === clientFilter) &&
          (!gestionnaireFilter || gName === gestionnaireFilter) &&
          (!severityFilter || sev === severityFilter)
        );
      }),
    [activeAlerts, clientFilter, gestionnaireFilter, severityFilter],
  );

  const getCriticalCount = () => overloadAlerts.filter((a) => a.alert === 'red').length;
  const getWarningCount = () => overloadAlerts.filter((a) => a.alert === 'orange').length;

  const getSLAStatus = (alert: any) => {
    const ms =
      alert.bordereau.dateReception
        ? Date.now() - new Date(alert.bordereau.dateReception).getTime()
        : 0;
    return Math.round(ms / 86_400_000);
  };

  // ── AI helpers ────────────────────────────────────────────────────────────

  const fetchTeamAiSuggestions = async (alertOverride?: OverloadAlert | null) => {
    const alertToUse = alertOverride || selectedAlert;
    if (!alertToUse) return null;
    setLoadingSuggestions(true);
    try {
      const response = await LocalAPI.post('/super-admin/ai-suggestions', {
        teamId: alertToUse.team.id,
        teamName: alertToUse.team.fullName,
        workload: alertToUse.count,
        utilizationRate:
          teamWorkload.find((t) => t.name === alertToUse.team.fullName)?.utilizationRate || 0,
      });
      setAiSuggestions(response.data);
      return response.data;
    } catch {
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

  // ── Reassign bordereau ────────────────────────────────────────────────────

  const handleReassignBordereau = async () => {
    if (!selectedUser || !reassignDialog.bordereau) return;
    setReassignLoading(true);
    try {
      await LocalAPI.post(`/bordereaux/${reassignDialog.bordereau.id}/reassign`, {
        newUserId: selectedUser,
      });
      showSnack('Bordereau réaffecté avec succès');
      loadAlerts();
      setReassignDialog({ open: false, bordereau: null, currentHandler: '' });
      setSelectedUser('');
      setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false });
    } catch {
      showSnack('Erreur lors de la réaffectation', 'error');
    } finally {
      setReassignLoading(false);
    }
  };

  // ── Notify client ─────────────────────────────────────────────────────────

  const handleNotifyClient = async () => {
    if (!notifyClientDialog.bordereau || !emailMessage.trim()) {
      showSnack('Veuillez saisir un message', 'warning');
      return;
    }
    setSendingEmail(true);
    try {
      await LocalAPI.post(
        `/bordereaux/${notifyClientDialog.bordereau.id}/notify-client`,
        {
          message: emailMessage,
          slaDays: notifyClientDialog.slaDays,
          aiSolution: notifyClientDialog.aiSolution,
        },
      );
      showSnack('Notification envoyée au client avec succès');
      setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 });
      setEmailMessage('');
      setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false });
    } catch {
      showSnack("Erreur lors de l'envoi de la notification", 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Reassign plan ─────────────────────────────────────────────────────────

  const buildInitialSplitAssignments = (recommendation: any) => {
    const splitRec = aiSuggestions?.recommendations?.find(
      (r: any) => r.type === 'REASSIGNMENT_SPLIT',
    );
    const splits = (splitRec?.splits || recommendation?.splits || []).map(
      (split: any, index: number) => ({
        teamId: split.targetTeamId,
        targetTeamName: split.target,
        count: split.count,
        selected: index === 0 || !!splitRec,
      }),
    );
    if (splits.length === 0 && recommendation?.targetTeamId) {
      return [
        {
          teamId: recommendation.targetTeamId,
          targetTeamName: recommendation.target,
          count: recommendation.count || 1,
          selected: true,
        },
      ];
    }
    return splits;
  };

  const openReassignPlanDialog = async () => {
    let currentSuggestions = aiSuggestions;
    if (!currentSuggestions && !loadingSuggestions) {
      currentSuggestions = await fetchTeamAiSuggestions();
    }

    if (!currentSuggestions?.recommendations?.length) {
      showSnack('Impossible de charger les recommandations IA', 'warning');
      return;
    }

    let recommendation = currentSuggestions.recommendations.find(
      (r: any) => r.type === 'REASSIGNMENT',
    );

    if (!recommendation || !recommendation.targetTeamId) {
      const splitRec = currentSuggestions.recommendations.find(
        (r: any) => r.type === 'REASSIGNMENT_SPLIT',
      );
      if (splitRec?.splits?.length) {
        const splits = splitRec.splits.map((split: any, idx: number) => ({
          teamId: split.targetTeamId,
          targetTeamName: split.target,
          count: split.count,
          selected: idx === 0,
        }));
        setSplitAssignments(splits);
        setReassignPlanDialog({ open: true, recommendation: splitRec });
        return;
      }
    }

    if (!recommendation || !recommendation.targetTeamId) {
      showSnack('Aucune équipe cible éligible trouvée pour la réaffectation', 'warning');
      return;
    }

    const initialSplits = buildInitialSplitAssignments(recommendation);
    if (!initialSplits.length) {
      showSnack('Aucune équipe disponible pour la réaffectation', 'warning');
      return;
    }

    setSplitAssignments(initialSplits);
    setReassignPlanDialog({ open: true, recommendation });
  };

  const handleSplitToggle = (teamId: string, checked: boolean) => {
    setSplitAssignments((prev) =>
      prev.map((s) => (s.teamId !== teamId ? s : { ...s, selected: checked })),
    );
  };

  const handleSplitCountChange = (teamId: string, value: string) => {
    const parsed = Math.max(0, parseInt(value || '0', 10) || 0);
    setSplitAssignments((prev) =>
      prev.map((s) => (s.teamId === teamId ? { ...s, count: parsed } : s)),
    );
  };

  const prepareReassignConfirmation = async (mode: 'single' | 'split') => {
    if (!selectedAlert) return;

    const recommendation =
      reassignPlanDialog.recommendation ||
      aiSuggestions?.recommendations?.find((r: any) => r.type === 'REASSIGNMENT');

    if (!recommendation) {
      showSnack('Aucune recommandation de réaffectation disponible', 'warning');
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
        count: recommendation.count,
      };
      totalCount = recommendation.count;
      summary = `Confirmer la réaffectation de ${recommendation.count} document(s) vers ${recommendation.target} ?`;
    } else {
      const selectedSplits = splitAssignments
        .filter((s) => s.selected && s.count > 0)
        .map((s) => ({ teamId: s.teamId, targetTeamName: s.targetTeamName, count: s.count }));

      if (selectedSplits.length === 0) {
        showSnack('Sélectionnez au moins une équipe cible avec un volume supérieur à 0', 'warning');
        return;
      }

      payload = { action: 'REASSIGN', sourceTeamId: selectedAlert.team.id, splits: selectedSplits };
      totalCount = selectedSplits.reduce((sum, s) => sum + s.count, 0);
      summary = `Confirmer la réaffectation répartie de ${totalCount} document(s) vers ${selectedSplits.map((s) => `${s.targetTeamName} (${s.count})`).join(', ')} ?`;
    }

    try {
      setLoadingDocumentPreview(true);
      const response = await LocalAPI.post('/super-admin/get-documents-preview', {
        teamId: selectedAlert.team.id,
        count: totalCount,
      });
      setDocumentPreview(response.data.documents || []);
      setConfirmationDialog({ open: true, payload, summary, documentDetails: response.data.documents || [] });
    } catch {
      setConfirmationDialog({ open: true, payload, summary, documentDetails: [] });
    } finally {
      setLoadingDocumentPreview(false);
    }
  };

  const executeConfirmedReassignment = async () => {
    if (!confirmationDialog.payload) return;
    try {
      const response = await LocalAPI.post(
        '/super-admin/execute-action',
        confirmationDialog.payload,
      );
      setConfirmationDialog({ open: false, payload: null, summary: '' });
      setReassignPlanDialog({ open: false, recommendation: null });
      setActionDialogOpen(false);

      if (response.data.success) {
        const msg =
          response.data.targets?.length > 1
            ? `${response.data.reassignedCount} document(s) réaffecté(s): ${response.data.targets.map((t: any) => `${t.name} (${t.count})`).join(', ')}`
            : `${response.data.reassignedCount} document(s) réaffecté(s) vers ${response.data.targetTeam?.name || response.data.targetTeam?.fullName || 'la cible recommandée'}`;
        showSnack(msg);
        loadAlerts();
      } else {
        showSnack(response.data.message, 'error');
      }
    } catch (error: any) {
      showSnack(error?.response?.data?.message || 'Erreur lors de la réaffectation', 'error');
    }
  };

  // ── Manual reassign ───────────────────────────────────────────────────────

  const openManualReassignDialog = async (teamId: string, teamName: string) => {
    setManualReassignDialog({ open: true, teamId, teamName });
    setSelectedDocId('');
    setManualTargetUser('');
    setLoadingManualDocs(true);
    try {
      const response = await LocalAPI.post('/super-admin/get-documents-preview', {
        teamId,
        count: 50,
      });
      setManualDocs(response.data.documents || []);
    } catch {
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
        splits: [{ teamId: manualTargetUser, count: 1 }],
      });
      if (response.data.success) {
        showSnack(
          `Document réaffecté avec succès vers ${response.data.targetTeam?.name || manualTargetUser}`,
        );
        setManualReassignDialog({ open: false, teamId: '', teamName: '' });
        loadAlerts();
      } else {
        showSnack(response.data.message, 'error');
      }
    } catch (error: any) {
      showSnack(error?.response?.data?.message || 'Erreur lors de la réaffectation', 'error');
    } finally {
      setManualReassignLoading(false);
    }
  };

  // ── Resolve alert ─────────────────────────────────────────────────────────

  // Fix: renamed parameter from `alert` to `alertItem` to avoid shadowing
  // the global `window.alert` (which is not used anymore) and the local `snack` helper
  const handleResolveAlert = async (alertItem: any) => {
    try {
      await resolveMutation.mutateAsync(alertItem.bordereau.id);
      setResolveConfirmDialog({ open: false, alert: null });
      refetchAlerts();
      showSnack('Alerte marquée comme résolue avec succès');
    } catch {
      showSnack("Erreur lors de la résolution de l'alerte", 'error');
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderOverloadCard = () => (
    <Card sx={designSx.sectionCard}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: '#fdecea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <People sx={{ color: '#b71c1c', fontSize: 20 }} />
            </Box>
            <Typography sx={designSx.sectionTitle}>Surcharge des Équipes</Typography>
          </Box>
          <IconButton
            onClick={loadAlerts}
            disabled={loading}
            size="small"
            sx={{ border: '1px solid #e0e7ef', '&:hover': { background: '#f0f4ff' } }}
          >
            {loading ? <CircularProgress size={16} /> : <Refresh sx={{ fontSize: 18, color: '#1e3a5f' }} />}
          </IconButton>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { count: getCriticalCount(), label: 'Surchargés', sub: 'Équipes ≥90% capacité', bg: '#fdecea', color: '#b71c1c', emoji: '🔴' },
            { count: getWarningCount(), label: 'Occupés', sub: 'Équipes 70–89% capacité', bg: '#fff8e1', color: '#e65100', emoji: '🟠' },
            { count: Math.max(0, (teamWorkload?.length || 0) - overloadAlerts.length), label: 'Normaux', sub: '<70% capacité', bg: '#e6f4ed', color: '#1b6b3a', emoji: '🟢' },
          ].map(({ count, label, sub, bg, color, emoji }) => (
            <Grid item xs={12} sm={4} key={label}>
              <Box sx={designSx.kpiBox(bg, color)}>
                <Typography sx={{ fontWeight: 800, fontSize: '2rem', color, lineHeight: 1 }}>{count}</Typography>
                <Typography sx={{ fontWeight: 700, color, fontSize: '0.80rem', mt: 0.5 }}>{emoji} {label}</Typography>
                <Typography sx={{ color: '#546e7a', fontSize: '0.70rem', mt: 0.25 }}>{sub}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {overloadAlerts.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead sx={designSx.tableHeader}>
                <TableRow>
                  {['Équipe/Gestionnaire', 'Rôle', 'Charge', 'Niveau', 'Actions'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {overloadAlerts.map((oa, index) => {
                  const teamMember = teamWorkload.find((t) => t.name === oa.team.fullName);
                  const actualRole = teamMember?.role || oa.team.role;
                  const capacity = teamMember?.capacity || 0;
                  const requiredPerDay = teamMember?.requiredPerDay || 0;
                  return (
                    <TableRow key={index} sx={designSx.tableRow(index)}>
                      <TableCell sx={{ fontWeight: 600, color: '#1e3a5f' }}>{oa.team.fullName}</TableCell>
                      <TableCell sx={{ color: '#546e7a' }}>{actualRole}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.81rem', color: '#1e3a5f' }}>
                          {requiredPerDay} docs/jour requis
                        </Typography>
                        <Typography sx={{ color: '#546e7a', fontSize: '0.72rem' }}>
                          ({oa.count} docs total, capacité: {capacity}/jour)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={oa.alert === 'red' ? 'Critique' : 'Élevé'}
                          size="small"
                          sx={{
                            background: oa.alert === 'red' ? '#fdecea' : '#fff8e1',
                            color: oa.alert === 'red' ? '#b71c1c' : '#e65100',
                            border: `1px solid ${oa.alert === 'red' ? '#ef9a9a' : '#ffcc80'}`,
                            fontWeight: 700,
                            fontSize: '0.70rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(oa)}
                          sx={{
                            borderColor: '#d0dff5',
                            color: '#1e3a5f',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            '&:hover': { borderColor: '#1e3a5f', background: '#f0f4ff' },
                          }}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300} gap={2}>
        <CircularProgress size={36} sx={{ color: '#1e3a5f' }} />
        <Typography sx={{ color: '#546e7a', fontSize: '0.85rem' }}>Chargement des alertes…</Typography>
      </Box>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <Box sx={designSx.root}>
      {/* Header */}
      <Box sx={designSx.pageHeader}>
        <Typography sx={designSx.pageTitle}>
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', background: '#fdecea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warning sx={{ color: '#b71c1c', fontSize: 22 }} />
          </Box>
          Alertes Équipes
        </Typography>
        <Chip
          label="Règles: ≥90% Critique | 70–89% Avertissement"
          size="small"
          sx={{ background: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', fontWeight: 600, fontSize: '0.70rem' }}
        />
      </Box>

      <Alert
        severity="info"
        sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.80rem', border: '1px solid #90caf9', borderLeft: '4px solid #0d47a1' }}
      >
        <strong>Types d'alertes surveillées:</strong> Surcharge équipe (≥90%), Équipe occupée (70–89%),
        Files d'attente critiques, Dépassements SLA, Gestionnaires sans chef d'équipe
      </Alert>

      {/* Tab bar */}
      <Paper sx={{ mb: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPageTab1(0); setPageTab2(0); }} sx={designSx.tabBar} variant="scrollable" scrollButtons="auto">
          <Tab label={`Surcharge Équipes (${overloadAlerts.length})`} />
          <Tab label={`Alertes Actives (${activeAlerts.length})`} />
          <Tab label={`Alertes Résolues (${resolvedAlerts.length})`} />
        </Tabs>
      </Paper>

      {/* Tab 0: Team Overload */}
      {activeTab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {overloadAlerts.length === 0 ? (
              <Alert severity="success" sx={{ borderRadius: 1.5, border: '1px solid #a5d6a7', borderLeft: '4px solid #1b6b3a' }}>
                ✅ Aucune surcharge détectée — Toutes les équipes fonctionnent normalement
              </Alert>
            ) : (
              renderOverloadCard()
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Active Alerts */}
      {activeTab === 1 && (
        <Paper sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
          {/* Filters */}
          <Box sx={designSx.filterPanel}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={designSx.metricLabel}>Client / Société</Typography>
              <Autocomplete
                value={clientFilter}
                onChange={(_, v) => { setClientFilter(v || ''); setPageTab1(0); }}
                options={Array.from(new Set(activeAlerts.map((a: any) =>
                  a.bordereau.contract?.client?.name || a.bordereau.client?.name || 'N/A',
                ))).sort() as string[]}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Tous les clients" size="small" sx={designSx.inputSx} />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
                noOptionsText="Aucun client"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={designSx.metricLabel}>Gestionnaire</Typography>
              <Autocomplete
                value={gestionnaireFilter}
                onChange={(_, v) => { setGestionnaireFilter(v || ''); setPageTab1(0); }}
                options={Array.from(new Set(activeAlerts.map((a: any) =>
                  a.bordereau.contract?.teamLeader?.fullName ||
                  a.bordereau.currentHandler?.fullName ||
                  'Non assigné',
                ))).sort() as string[]}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Tous les gestionnaires" size="small" sx={designSx.inputSx} />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
                noOptionsText="Aucun gestionnaire"
              />
            </Box>
            <Box sx={{ minWidth: 160 }}>
              <Typography sx={designSx.metricLabel}>Urgence</Typography>
              <FormControl fullWidth size="small" sx={designSx.inputSx}>
                <Select
                  value={severityFilter}
                  onChange={(e) => { setSeverityFilter(e.target.value); setPageTab1(0); }}
                  displayEmpty
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="red">Critique</MenuItem>
                  <MenuItem value="orange">Avertissement</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={designSx.tableHeader}>
                <TableRow>
                  {['ID', 'Client / Société', 'Type', 'Types de Documents', 'Urgence', 'Statut', 'Assigné à', 'Créé le', 'SLA (jours)', 'Actions'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActiveAlerts
                  .slice(pageTab1 * rowsPerPage, pageTab1 * rowsPerPage + rowsPerPage)
                  .map((alert: any, idx: number) => (
                    <TableRow key={alert.bordereau.id} sx={designSx.tableRow(idx)}>
                      <TableCell sx={{ fontWeight: 600, color: '#1e3a5f' }}>
                        {alert.bordereau.reference || alert.bordereau.id}
                      </TableCell>
                      <TableCell>
                        {alert.bordereau.contract?.client?.name || alert.bordereau.client?.name || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: '#546e7a' }}>
                        {alert.reason === 'SLA breach' ? 'Dépassement SLA' :
                         alert.reason === 'Risk of delay' ? 'Risque de retard' : alert.reason}
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
                                sx={{ fontSize: '0.68rem', borderColor: '#d0dff5', color: '#1e3a5f' }}
                              />
                            ));
                          })()}
                          {(!alert.bordereau.documents || alert.bordereau.documents.length === 0) && (
                            <Typography sx={{ color: '#cfd8dc', fontSize: '0.78rem' }}>Aucun</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alertLevelLabel(alert.alertLevel)}
                          size="small"
                          sx={{ backgroundColor: alertLevelColor(alert.alertLevel), color: '#fff', fontWeight: 700, fontSize: '0.70rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alert.bordereau.statut}
                          color={alert.bordereau.statut === 'CLOTURE' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.70rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#546e7a' }}>
                        {alert.bordereau.contract?.teamLeader?.fullName ||
                          alert.bordereau.currentHandler?.fullName || 'Non assigné'}
                      </TableCell>
                      <TableCell sx={{ color: '#546e7a', whiteSpace: 'nowrap' }}>
                        {new Date(alert.bordereau.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {alert.slaPhase === 'FINANCE' ? (
                          <Tooltip
                            arrow
                            placement="left"
                            componentsProps={{ tooltip: { sx: { maxWidth: 350, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}
                            title={
                              <Box sx={{ p: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>📊 Suivi SLA en Deux Phases</Typography>
                                <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
                                <Typography variant="body2" sx={{ mb: 1 }}><strong>Phase 1: Gestionnaire</strong></Typography>
                                <Typography variant="caption" display="block" sx={{ pl: 1, mb: 1 }}>
                                  ✅ Complété en {alert.slaInfo?.gestionnaireSla?.daysSince || 0} jours<br />
                                  Seuil: {alert.slaInfo?.gestionnaireSla?.threshold || 0} jours<br />
                                  Statut: Traitement terminé
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}><strong>Phase 2: Finance</strong></Typography>
                                <Typography variant="caption" display="block" sx={{ pl: 1 }}>
                                  {alert.alertLevel === 'red' ? '🔴' : alert.alertLevel === 'orange' ? '🟠' : '🟢'} En cours: {alert.daysSinceReception} jours<br />
                                  Seuil: {alert.slaThreshold} jours<br />
                                  Statut: {alert.alertLevel === 'red' ? 'Retard - Action requise' : alert.alertLevel === 'orange' ? 'À risque' : 'Dans les délais'}
                                </Typography>
                              </Box>
                            }
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Chip
                                label={`${alert.daysSinceReception} / ${alert.slaThreshold}`}
                                color={alert.alertLevel === 'red' ? 'error' : alert.alertLevel === 'orange' ? 'warning' : 'success'}
                                size="small"
                                sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                              />
                              <Typography sx={{ color: '#546e7a', fontSize: '0.68rem' }}>(Finance)</Typography>
                              <Info sx={{ fontSize: 14, color: '#0d47a1', cursor: 'pointer' }} />
                            </Box>
                          </Tooltip>
                        ) : (
                          <Chip
                            label={`${alert.daysSinceReception} / ${alert.slaThreshold}`}
                            color={alert.alertLevel === 'red' ? 'error' : alert.alertLevel === 'orange' ? 'warning' : 'success'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Voir détails">
                            <IconButton
                              size="small"
                              sx={{ border: '1px solid #d0dff5', '&:hover': { background: '#f0f4ff' } }}
                              onClick={async () => {
                                setAlertDetailDialog({ open: true, alert, aiSolution: null, loadingAI: true });
                                try {
                                  const timeoutPromise = new Promise<never>((_, reject) =>
                                    setTimeout(() => reject({ message: 'Timeout' }), 30000),
                                  );
                                  const apiPromise = LocalAPI.post('/analytics/ai/alert-solution', {
                                    bordereau: alert.bordereau,
                                    alertLevel: alert.alertLevel,
                                    reason: alert.reason,
                                    slaDays: getSLAStatus(alert),
                                  });
                                  const response = await Promise.race([apiPromise, timeoutPromise]) as any;
                                  setAlertDetailDialog((prev) => ({ ...prev, aiSolution: response.data, loadingAI: false }));
                                } catch {
                                  setAlertDetailDialog((prev) => ({ ...prev, aiSolution: null, loadingAI: false }));
                                }
                              }}
                            >
                              <Visibility sx={{ fontSize: 16, color: '#1e3a5f' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Marquer résolu">
                            <IconButton
                              size="small"
                              sx={{ border: '1px solid #a5d6a7', '&:hover': { background: '#e6f4ed' } }}
                              onClick={() => setResolveConfirmDialog({ open: true, alert })}
                            >
                              <CheckCircle sx={{ fontSize: 16, color: '#1b6b3a' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={filteredActiveAlerts.length}
            page={pageTab1}
            onPageChange={(_, p) => setPageTab1(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPageTab1(0); }}
            labelRowsPerPage="Lignes par page:"
          />
        </Paper>
      )}

      {/* Tab 2: Resolved Alerts */}
      {activeTab === 2 && (
        <Paper sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, boxShadow: 'none', overflow: 'hidden' }}>
          <Box sx={designSx.resolvedInfoBox}>
            <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>Qu'est-ce qu'une alerte résolue ?</Typography>
            <Typography sx={{ color: '#546e7a', fontSize: '0.80rem', mb: 1 }}>
              Une alerte est marquée comme <strong>résolue</strong> lorsqu'un utilisateur <strong>prend une action concrète</strong> pour traiter le problème :
            </Typography>
            <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 3 }}>
              {[
                '🔄 Réaffectation du bordereau à un autre gestionnaire',
                '📧 Notification envoyée au client ou à l\'équipe',
                '📝 Commentaire/Action documenté dans le système',
              ].map((item) => (
                <Typography key={item} component="li" sx={{ color: '#546e7a', fontSize: '0.80rem', mb: 0.5 }}>
                  {item}
                </Typography>
              ))}
              <Typography component="li" sx={{ color: '#546e7a', fontSize: '0.80rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⚡ Escalade vers le chef d'équipe ou responsable
                <Tooltip
                  arrow
                  placement="right"
                  componentsProps={{ tooltip: { sx: { maxWidth: 450, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}
                  title={
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>🎯 Qu'est-ce que l'Escalade ?</Typography>
                      <Typography variant="body2" paragraph><strong>Escalade = Remonter un problème vers la hiérarchie supérieure</strong> quand il ne peut pas être résolu au niveau actuel.</Typography>
                      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1, mb: 0.5 }}>📊 Hiérarchie d'Escalade:</Typography>
                      <Typography variant="caption" display="block" sx={{ pl: 1 }}>1️⃣ Gestionnaire → 2️⃣ Chef d'Équipe → 3️⃣ Responsable Département → 4️⃣ Super Admin</Typography>
                      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1, mb: 0.5 }}>🔥 Quand escalader ?</Typography>
                      <Typography variant="caption" display="block" sx={{ pl: 1 }}>• Dépassement SLA critique (100%+)<br />• Gestionnaire surchargé<br />• Dossier bloqué<br />• Réclamation client importante</Typography>
                      <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                        <Typography variant="caption">💡 <strong>Exemple:</strong> Bordereau 74 jours en retard → Escalade au Chef → Chef réaffecte ou contacte client directement</Typography>
                      </Alert>
                    </Box>
                  }
                >
                  <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}><Info sx={{ fontSize: 14, color: '#0d47a1' }} /></IconButton>
                </Tooltip>
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
              ⚠️ <strong>Important:</strong> Résoudre une alerte ne clôture PAS le bordereau. Le bordereau atteint le statut CLOTURE uniquement via le workflow Finance.
            </Alert>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={designSx.tableHeader}>
                <TableRow>
                  {['Client', 'Bordereau', 'Type', 'Niveau Initial', 'Message', 'Créé le', 'Résolu par', 'Résolu le', 'Temps de Résolution'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {resolvedAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                        <CheckCircle sx={{ fontSize: 44, color: '#a5d6a7' }} />
                        <Typography sx={{ fontWeight: 700, color: '#1b6b3a', fontSize: '0.88rem' }}>Aucune alerte résolue récemment</Typography>
                        <Typography sx={{ color: '#546e7a', fontSize: '0.78rem' }}>Les alertes résolues apparaîtront ici avec leur historique complet</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  resolvedAlerts
                    .slice(pageTab2 * rowsPerPage, pageTab2 * rowsPerPage + rowsPerPage)
                    .map((alert: any, idx: number) => {
                      const createdDate = new Date(alert.createdAt).getTime();
                      const resolvedDate = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
                      const resolutionHours = Math.round((resolvedDate - createdDate) / 3_600_000);
                      const resolutionDays = Math.floor(resolutionHours / 24);
                      const remainingHours = resolutionHours % 24;
                      const resolutionTimeDisplay = resolutionDays > 0 ? `${resolutionDays}j ${remainingHours}h` : `${resolutionHours}h`;
                      const resolutionColor =
                        resolutionDays > 7 ? '#b71c1c' : resolutionDays > 3 ? '#e65100' : resolutionHours > 48 ? '#e65100' : '#1b6b3a';

                      return (
                        <TableRow key={alert.id} sx={designSx.tableRow(idx)}>
                          <TableCell sx={{ fontWeight: 600, color: '#1e3a5f' }}>
                            {alert.bordereau?.contract?.client?.name || alert.bordereau?.client?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.81rem', color: '#1e3a5f' }}>
                              {alert.bordereau?.reference || alert.bordereauId || alert.bordereau?.id || '—'}
                            </Typography>
                            {alert.bordereau?.statut && (
                              <Chip label={alert.bordereau.statut} size="small" color="success" sx={{ mt: 0.5, fontWeight: 600, fontSize: '0.68rem' }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.81rem', color: '#1e3a5f' }}>
                              {alert.alertType === 'SLA_RISK' ? '⏰ Risque SLA' :
                               alert.alertType === 'SLA_BREACH' ? '🚨 Dépassement SLA' :
                               alert.alertType === 'TEAM_OVERLOAD' ? '👥 Surcharge Équipe' :
                               alert.alertType || alert.reason || 'Alerte'}
                            </Typography>
                            <Typography sx={{ color: '#546e7a', fontSize: '0.72rem' }}>{alert.reason || 'Alerte système'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={alertLevelLabel(alert.alertLevel)}
                              size="small"
                              sx={{ bgcolor: alertLevelColor(alert.alertLevel), color: '#fff', fontWeight: 700, fontSize: '0.70rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Typography sx={{ fontSize: '0.80rem', color: '#546e7a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {alert.message}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontSize: '0.80rem', color: '#1e3a5f' }}>
                              {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                            <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>
                              {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <People sx={{ fontSize: 14, color: '#0d47a1' }} />
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.80rem', color: '#1e3a5f' }}>
                                  {alert.user?.fullName || alert.resolvedBy || 'Système'}
                                </Typography>
                                {alert.user?.role && (
                                  <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>{alert.user.role}</Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {alert.resolvedAt ? (
                              <>
                                <Typography sx={{ fontSize: '0.80rem', color: '#1e3a5f' }}>
                                  {new Date(alert.resolvedAt).toLocaleDateString('fr-FR')}
                                </Typography>
                                <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>
                                  {new Date(alert.resolvedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </>
                            ) : <Typography sx={{ color: '#cfd8dc', fontSize: '0.78rem' }}>N/A</Typography>}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <HourglassEmptyIcon sx={{ fontSize: 16, color: resolutionColor }} />
                              <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.81rem', color: resolutionColor }}>
                                  {resolutionTimeDisplay}
                                </Typography>
                                <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>
                                  {resolutionHours < 24 ? '🟢 Rapide' : resolutionHours < 72 ? '🟡 Normal' : resolutionHours < 168 ? '🟠 Long' : '🔴 Très long'}
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
          </Box>

          {resolvedAlerts.length > 0 && (
            <>
              <TablePagination
                component="div"
                count={resolvedAlerts.length}
                page={pageTab2}
                onPageChange={(_, p) => setPageTab2(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPageTab2(0); }}
                labelRowsPerPage="Lignes par page:"
              />
              <Box sx={designSx.statsFooter}>
                <Typography sx={{ ...designSx.sectionTitle, color: '#1b6b3a', mb: 1.5 }}>📈 Statistiques de Résolution</Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'Total Résolues', value: resolvedAlerts.length, color: '#1b6b3a' },
                    {
                      label: 'Temps Moyen',
                      value: `${Math.round(resolvedAlerts.reduce((sum: number, a: any) => {
                        const created = new Date(a.createdAt).getTime();
                        const resolved = a.resolvedAt ? new Date(a.resolvedAt).getTime() : Date.now();
                        return sum + (resolved - created) / 3_600_000;
                      }, 0) / (resolvedAlerts.length || 1))}h`,
                      color: '#0d47a1',
                    },
                    {
                      label: 'Résolues <24h',
                      value: `${Math.round((resolvedAlerts.filter((a: any) => {
                        const h = (Date.now() - new Date(a.createdAt).getTime()) / 3_600_000;
                        return h < 24;
                      }).length / (resolvedAlerts.length || 1)) * 100)}%`,
                      color: '#1b6b3a',
                    },
                    {
                      label: 'Résolues >7j',
                      value: resolvedAlerts.filter((a: any) => {
                        const h = (Date.now() - new Date(a.createdAt).getTime()) / 3_600_000;
                        return h > 168;
                      }).length,
                      color: '#e65100',
                    },
                  ].map(({ label, value, color }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <Box textAlign="center">
                        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color }}>{value}</Typography>
                        <Typography sx={designSx.metricLabel}>{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          )}
        </Paper>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDetailDialog.open}
        onClose={() => setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle sx={designSx.dialogTitleNavy}>
          <Visibility sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Détails de l'alerte</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {alertDetailDialog.alert && (
            <Box>
              {[
                ['Référence', alertDetailDialog.alert.bordereau.reference || alertDetailDialog.alert.bordereau.id],
                ['Raison', alertDetailDialog.alert.reason],
                ['Niveau', alertLevelLabel(alertDetailDialog.alert.alertLevel)],
                ['Client', alertDetailDialog.alert.bordereau.contract?.client?.name || alertDetailDialog.alert.bordereau.client?.name || 'N/A'],
                ['Date réception', alertDetailDialog.alert.bordereau.dateReception ? new Date(alertDetailDialog.alert.bordereau.dateReception).toLocaleDateString('fr-FR') : 'N/A'],
                ['Statut', alertDetailDialog.alert.bordereau.statut],
                ['SLA dépassé', `${getSLAStatus(alertDetailDialog.alert)} jours`],
              ].map(([label, value]) => (
                <Box key={label} display="flex" gap={1} mb={0.75}>
                  <Typography sx={{ fontWeight: 700, color: '#546e7a', fontSize: '0.80rem', minWidth: 120 }}>{label}:</Typography>
                  <Typography sx={{ color: '#1e3a5f', fontSize: '0.80rem' }}>{value}</Typography>
                </Box>
              ))}

              {alertDetailDialog.aiSolution?.document_details && (
                <Box sx={{ mt: 2, p: 2, background: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9', borderLeft: '4px solid #0d47a1' }}>
                  <Typography sx={{ fontWeight: 700, color: '#0d47a1', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
                    📄 Documents du Bordereau
                  </Typography>
                  <Typography sx={{ fontSize: '0.80rem', color: '#1e3a5f', mb: 0.5 }}>
                    <strong>Nombre:</strong> {alertDetailDialog.aiSolution.document_details.count} document(s)
                  </Typography>
                  {alertDetailDialog.aiSolution.document_details.types?.length > 0 && (
                    <Typography sx={{ fontSize: '0.80rem', color: '#1e3a5f', mb: 1 }}>
                      <strong>Types:</strong> {alertDetailDialog.aiSolution.document_details.types.join(', ')}
                    </Typography>
                  )}
                  {alertDetailDialog.aiSolution.document_details.documents?.length > 0 && (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1 }}>
                      {alertDetailDialog.aiSolution.document_details.documents.map((doc: any, idx: number) => (
                        <Box
                          key={doc.id}
                          sx={{ p: 1, mb: 0.5, background: '#fff', borderRadius: 1, border: '1px solid #e0e7ef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#1e3a5f' }}>{idx + 1}. {doc.name}</Typography>
                            <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>Type: {doc.type}</Typography>
                          </Box>
                          <Chip
                            label={doc.status || 'N/A'}
                            size="small"
                            color={doc.status === 'TRAITE' ? 'success' : doc.status === 'EN_COURS' ? 'warning' : 'default'}
                            sx={{ fontSize: '0.68rem', fontWeight: 700 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 3, p: 2, background: '#f0f4ff', borderRadius: 2, border: '1px solid #d0dff5' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Assignment sx={{ color: '#1e3a5f', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem' }}>🤖 Solution IA Personnalisée</Typography>
                </Box>
                {alertDetailDialog.loadingAI ? (
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <CircularProgress size={18} sx={{ color: '#1e3a5f' }} />
                    <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Analyse en cours…</Typography>
                  </Box>
                ) : alertDetailDialog.aiSolution ? (
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
                      🎯 Cause Identifiée
                    </Typography>
                    <Box sx={{ background: '#fff', p: 1.5, borderRadius: 1, mb: 2, border: '1px solid #e0e7ef' }}>
                      <Typography sx={{ fontSize: '0.80rem', color: '#546e7a' }}>
                        {alertDetailDialog.aiSolution.rootCause || 'Analyse en cours…'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
                      ✅ Actions Recommandées
                    </Typography>
                    <Box sx={{ background: '#fff', p: 1.5, borderRadius: 1, mb: 2, border: '1px solid #e0e7ef' }}>
                      {alertDetailDialog.aiSolution.actions?.map((action: string, idx: number) => (
                        <Typography key={idx} sx={{ fontSize: '0.80rem', color: '#546e7a', mb: 0.5 }}>
                          {idx + 1}. {action}
                        </Typography>
                      ))}
                    </Box>
                    {alertDetailDialog.aiSolution.priority && (
                      <Alert severity={alertDetailDialog.aiSolution.priority === 'URGENT' ? 'error' : 'warning'} sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.80rem' }}>Priorité: {alertDetailDialog.aiSolution.priority}</Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>{alertDetailDialog.aiSolution.reasoning}</Typography>
                      </Alert>
                    )}
                    <Box sx={{ p: 2, background: '#fff8e1', borderRadius: 2, border: '1px solid #ffcc80' }}>
                      <Typography sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                        🛠️ Actions Rapides
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<People />}
                        sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)', color: '#fff', fontWeight: 700, justifyContent: 'flex-start', py: 1.25, '&:hover': { background: 'linear-gradient(135deg, #163050 0%, #1d4f8c 100%)' } }}
                        onClick={async () => {
                          const bordereau = alertDetailDialog.alert.bordereau;
                          const currentHandler = bordereau.contract?.teamLeader?.fullName || 'Non assigné';
                          setReassignDialog({ open: true, bordereau, currentHandler });
                          setLoadingReassignSuggestions(true);
                          try {
                            const response = await LocalAPI.post('/analytics/ai/reassign-suggestion', {
                              bordereau_id: alertDetailDialog.alert.bordereau.id || alertDetailDialog.alert.bordereau.reference,
                              current_handler_id: alertDetailDialog.alert.bordereau.currentHandler?.id || alertDetailDialog.alert.bordereau.assignedToUserId,
                              sla_days: getSLAStatus(alertDetailDialog.alert),
                              urgency: alertDetailDialog.alert.alertLevel === 'red' ? 'critical' : 'normal',
                              complexity: alertDetailDialog.alert.bordereau.nombreBS || 1,
                            });
                            setReassignSuggestions(response.data);
                          } catch {
                            setReassignSuggestions(null);
                          } finally {
                            setLoadingReassignSuggestions(false);
                          }
                        }}
                      >
                        🔄 Réaffecter ce Bordereau
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>
                    Impossible de générer une solution IA pour le moment.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button
            onClick={() => setAlertDetailDialog({ open: false, alert: null, aiSolution: null, loadingAI: false })}
            variant="outlined"
            size="small"
            sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog (team overload) */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleNavy}>
          <Warning sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Détails de la Surcharge</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {selectedAlert && (() => {
            const teamMember = teamWorkload.find((t) => t.name === selectedAlert.team.fullName);
            const capacity = teamMember?.capacity || 0;
            const requiredPerDay = teamMember?.requiredPerDay || 0;
            const utilizationRate = teamMember?.utilizationRate || 0;
            return (
              <Box>
                <Grid container spacing={2} mb={2}>
                  {[
                    { label: 'Équipe', value: selectedAlert.team.fullName },
                    { label: 'Rôle', value: teamMember?.role || 'N/A' },
                  ].map(({ label, value }) => (
                    <Grid item xs={6} key={label}>
                      <Box sx={designSx.metricBox}>
                        <Typography sx={designSx.metricLabel}>{label}</Typography>
                        <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', mt: 0.25 }}>{value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ background: '#f4f7fb', border: '1px solid #e0e7ef', borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography sx={{ ...designSx.sectionTitle, mb: 1.5 }}>📊 Analyse de Charge</Typography>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Documents Total', value: selectedAlert.count, color: '#2196f3' },
                      { label: 'Requis/Jour', value: requiredPerDay.toFixed(1), color: '#0d47a1' },
                      { label: 'Capacité/Jour', value: capacity, color: '#1b6b3a' },
                    ].map(({ label, value, color }) => (
                      <Grid item xs={4} key={label}>
                        <Box sx={designSx.metricBox}>
                          <Typography sx={designSx.metricLabel}>{label}</Typography>
                          <Typography sx={designSx.metricValue(color)}>{value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Box sx={{ background: selectedAlert.alert === 'red' ? '#fdecea' : '#fff8e1', border: `1px solid ${selectedAlert.alert === 'red' ? '#ef9a9a' : '#ffcc80'}`, borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography sx={{ ...designSx.sectionTitle, mb: 1, color: selectedAlert.alert === 'red' ? '#b71c1c' : '#e65100' }}>⚠️ Taux d'Utilisation</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography sx={{ fontWeight: 800, fontSize: '2.25rem', color: selectedAlert.alert === 'red' ? '#b71c1c' : '#e65100', lineHeight: 1 }}>
                      {utilizationRate}%
                    </Typography>
                    <Box>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.78rem' }}>
                        Formule: ({requiredPerDay.toFixed(1)} / {capacity}) × 100
                      </Typography>
                      <Typography sx={{ color: '#90a4ae', fontSize: '0.70rem' }}>
                        Σ(1/jours restants) pour chaque document
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ background: '#f4f7fb', border: '1px solid #e0e7ef', borderRadius: 1.5, p: 2, mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: '#546e7a', fontSize: '0.72rem', mb: 0.5 }}>Raison:</Typography>
                  <Typography sx={{ color: '#1e3a5f', fontSize: '0.80rem' }}>{selectedAlert.reason}</Typography>
                </Box>

                <Alert severity={selectedAlert.alert === 'red' ? 'error' : 'warning'} sx={{ borderRadius: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.80rem' }}>
                    {selectedAlert.alert === 'red' ? '🚨 Action immédiate requise — Risque de dépassement SLA' : '⚠️ Surveillance recommandée — Charge élevée détectée'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                    {selectedAlert.alert === 'red'
                      ? 'Cette équipe ne peut pas terminer tous les documents dans les délais contractuels. Réaffectation urgente nécessaire.'
                      : 'Cette équipe approche de sa capacité maximale. Surveiller de près pour éviter une surcharge.'}
                  </Typography>
                </Alert>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setDetailsOpen(false)} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Fermer</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleTakeAction}
            sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)', color: '#fff', fontWeight: 700 }}
          >
            Prendre des mesures
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleNavy}>
          <Assignment sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Actions Disponibles</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {selectedAlert && (() => {
            const teamMember = teamWorkload.find((t) => t.name === selectedAlert.team.fullName);
            return (
              <Box>
                <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: '0.80rem' }}>
                    <strong>Équipe concernée:</strong> {selectedAlert.team.fullName} ({teamMember?.utilizationRate}% d'utilisation)
                  </Typography>
                </Alert>

                <Typography sx={{ ...designSx.sectionTitle, mb: 2 }}>🛠️ Actions Recommandées</Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      icon: <People sx={{ color: '#2196f3', fontSize: 36 }} />,
                      title: 'Réaffecter des Documents',
                      sub: 'Transférer des documents vers des équipes moins chargées',
                      bg: '#e3f2fd',
                      onClick: openReassignPlanDialog,
                    },
                    {
                      icon: <Assignment sx={{ color: '#1b6b3a', fontSize: 36 }} />,
                      title: 'Augmenter la Capacité',
                      sub: 'Ajouter des membres à l\'équipe ou augmenter les heures',
                      bg: '#e6f4ed',
                      onClick: async () => {
                        setActionDialogOpen(false);
                        try {
                          const capacityRec = aiSuggestions?.recommendations?.find((r: any) => r.type === 'CAPACITY_INCREASE');
                          if (capacityRec) {
                            const response = await LocalAPI.post('/super-admin/execute-action', {
                              action: 'INCREASE_CAPACITY',
                              teamId: selectedAlert.team.id,
                              percentage: capacityRec.percentage,
                            });
                            if (response.data.success) {
                              showSnack(`Capacité augmentée: ${response.data.oldCapacity} → ${response.data.newCapacity} docs/jour`);
                              loadAlerts();
                            } else {
                              showSnack(response.data.message, 'error');
                            }
                          } else {
                            showSnack("Impossible d'augmenter la capacité", 'warning');
                          }
                        } catch {
                          showSnack("Erreur lors de l'augmentation de capacité", 'error');
                        }
                      },
                    },
                    {
                      icon: <Notifications sx={{ color: '#0d47a1', fontSize: 36 }} />,
                      title: "Notifier le Chef d'Équipe",
                      sub: "Envoyer une alerte au responsable de l'équipe",
                      bg: '#e3f2fd',
                      onClick: async () => {
                        setActionDialogOpen(false);
                        try {
                          const currentTeamMember = teamWorkload.find((t) => t.name === selectedAlert.team.fullName);
                          const response = await LocalAPI.post('/super-admin/execute-action', {
                            action: 'NOTIFY',
                            teamId: selectedAlert.team.id,
                            teamName: selectedAlert.team.fullName,
                            message: `Alerte: Votre équipe est surchargée (${currentTeamMember?.utilizationRate || 0}%)`,
                          });
                          if (response.data.success) {
                            showSnack(`Notification envoyée: ${response.data.recipient || selectedAlert.team.fullName}`);
                          } else {
                            showSnack(response.data.message, 'error');
                          }
                        } catch {
                          showSnack("Erreur lors de l'envoi de la notification", 'error');
                        }
                      },
                    },
                  ].map(({ icon, title, sub, bg, onClick }) => (
                    <Grid item xs={12} md={6} key={title}>
                      <Card
                        variant="outlined"
                        sx={{ p: 2, cursor: 'pointer', border: '1px solid #e0e7ef', borderRadius: 2, '&:hover': { background: bg, borderColor: '#1e3a5f' }, transition: 'all 0.15s' }}
                        onClick={onClick}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          {icon}
                          <Box flex={1}>
                            <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem' }}>{title}</Typography>
                            <Typography sx={{ color: '#546e7a', fontSize: '0.75rem', mt: 0.25 }}>{sub}</Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 3, p: 2, background: '#f4f7fb', border: '1px solid #e0e7ef', borderRadius: 2 }}>
                  <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>💡 Suggestions IA</Typography>
                  {loadingSuggestions ? (
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <CircularProgress size={16} sx={{ color: '#1e3a5f' }} />
                      <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Analyse en cours…</Typography>
                    </Box>
                  ) : aiSuggestions ? (
                    <Box>
                      {aiSuggestions.suggestions?.map((s: string, idx: number) => (
                        <Typography key={idx} sx={{ color: '#546e7a', fontSize: '0.80rem', mb: 0.75 }}>• {s}</Typography>
                      ))}
                      {aiSuggestions.recommendations?.map((rec: any, idx: number) => (
                        <Box key={`rec-${idx}`} sx={{ mb: 1.5, p: 1.25, background: '#fff', borderRadius: 1.5, border: '1px solid #e0e7ef' }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.80rem' }}>• {rec.action || rec.recommendation}</Typography>
                          {rec.rationale && <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5 }}>{rec.rationale}</Typography>}
                          {rec.type === 'REASSIGNMENT' && (
                            <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5 }}>
                              Cible: {rec.target} ({rec.targetRole}) • Charge: {rec.targetUtilizationRate}% • Score: {rec.targetPerformanceScore} • Projection source: ~{rec.projectedSourceRate}%
                            </Typography>
                          )}
                          {rec.type === 'CAPACITY_INCREASE' && (
                            <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5 }}>
                              +{rec.additionalCapacityUnits} doc/jour • {rec.estimatedPeople} ressource(s) • Hausse: {rec.percentage}%
                            </Typography>
                          )}
                          {rec.type === 'PRIORITIZATION' && (
                            <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5 }}>
                              {rec.overdueCount} en retard • {rec.urgentCount} à moins de 3 jours
                            </Typography>
                          )}
                          {rec.type === 'REASSIGNMENT_ALTERNATIVES' && rec.options?.length > 0 && (
                            <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5 }}>
                              Alternatives: {rec.options.map((o: any) => `${o.name} (${o.role}, ${o.utilizationRate}%)`).join(' | ')}
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {aiSuggestions.analysis && (
                        <Alert severity={aiSuggestions.analysis.status === 'CRITICAL' ? 'error' : 'info'} sx={{ mt: 1, borderRadius: 1.5, fontSize: '0.75rem' }}>
                          Analyse: {aiSuggestions.analysis.totalDocuments} docs • {aiSuggestions.analysis.urgentDocuments} urgents • {aiSuggestions.analysis.overdueDocuments} en retard • {aiSuggestions.analysis.availableTeams} cible(s)
                          {aiSuggestions.analysis.bestTargetTeam && (
                            <span> • Meilleure cible: {aiSuggestions.analysis.bestTargetTeam.name} ({aiSuggestions.analysis.bestTargetTeam.utilizationRate}%)</span>
                          )}
                        </Alert>
                      )}
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Analyse IA indisponible.</Typography>
                  )}
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setActionDialogOpen(false)} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ borderColor: '#0d47a1', color: '#0d47a1', fontWeight: 600, '&:hover': { background: '#e3f2fd' } }}
            onClick={async () => {
              if (!selectedAlert) return;
              const currentTeamMember = teamWorkload.find((t) => t.name === selectedAlert.team.fullName);
              setActionDialogOpen(false);
              try {
                const response = await LocalAPI.post('/super-admin/execute-action', {
                  action: 'NOTIFY',
                  teamId: selectedAlert.team.id,
                  teamName: selectedAlert.team.fullName,
                  message: `Alerte: Votre équipe est surchargée (${currentTeamMember?.utilizationRate || 0}%)`,
                });
                showSnack(response.data.success ? response.data.message : response.data.message, response.data.success ? 'success' : 'error');
              } catch {
                showSnack("Erreur lors de l'envoi de la notification", 'error');
              }
            }}
          >
            Notifier
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={openReassignPlanDialog}
            sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)', color: '#fff', fontWeight: 700 }}
          >
            Réaffecter Documents
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Plan Dialog */}
      <Dialog open={reassignPlanDialog.open} onClose={() => setReassignPlanDialog({ open: false, recommendation: null })} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleNavy}>
          <People sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Plan de Réaffectation Intelligent</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {reassignPlanDialog.recommendation && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.80rem' }}>
                  Cible principale recommandée: {reassignPlanDialog.recommendation.target} • {reassignPlanDialog.recommendation.targetUtilizationRate}% de charge • score {reassignPlanDialog.recommendation.targetPerformanceScore}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>{reassignPlanDialog.recommendation.rationale}</Typography>
              </Alert>

              <Typography sx={{ ...designSx.sectionTitle, mb: 1.5 }}>Meilleures options de réaffectation</Typography>
              <Stack spacing={1.5}>
                {splitAssignments.map((split) => (
                  <Paper key={split.teamId} variant="outlined" sx={{ p: 2, border: '1px solid #e0e7ef', borderRadius: 1.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={split.selected}
                            onChange={(e) => handleSplitToggle(split.teamId, e.target.checked)}
                            sx={{ color: '#1e3a5f', '&.Mui-checked': { color: '#1e3a5f' } }}
                          />
                        }
                        label={<Typography sx={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.82rem' }}>{split.targetTeamName}</Typography>}
                      />
                      <TextField
                        type="number"
                        size="small"
                        label="Nb documents"
                        value={split.count}
                        onChange={(e) => handleSplitCountChange(split.teamId, e.target.value)}
                        disabled={!split.selected}
                        inputProps={{ min: 0 }}
                        sx={{ width: 140, ...designSx.inputSx }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Stack>

              <Divider sx={{ my: 2, borderColor: '#e0e7ef' }} />
              <Alert severity="success" sx={{ borderRadius: 1.5, fontSize: '0.78rem' }}>
                <strong>Mode 1:</strong> tout envoyer à la meilleure cible recommandée.<br />
                <strong>Mode 2:</strong> répartir les documents entre plusieurs équipes pour réduire plus vite la surcharge.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setReassignPlanDialog({ open: false, recommendation: null })} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button variant="outlined" size="small" onClick={() => prepareReassignConfirmation('single')} sx={{ borderColor: '#1e3a5f', color: '#1e3a5f', fontWeight: 600 }}>Affecter tout à la meilleure cible</Button>
          <Button variant="contained" size="small" onClick={() => prepareReassignConfirmation('split')} sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)', color: '#fff', fontWeight: 700 }}>Confirmer la répartition</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.open} onClose={() => setConfirmationDialog({ open: false, payload: null, summary: '' })} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #b71c1c 0%, #e53935 100%)', color: '#fff', py: 2, px: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Confirmation finale — Réaffectation de Documents</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{confirmationDialog.summary}</Typography>
          </Alert>
          {loadingDocumentPreview ? (
            <Box display="flex" alignItems="center" gap={1.5} py={2}>
              <CircularProgress size={20} sx={{ color: '#1e3a5f' }} />
              <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Chargement des documents…</Typography>
            </Box>
          ) : confirmationDialog.documentDetails && confirmationDialog.documentDetails.length > 0 ? (
            <Box>
              <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>📄 Documents à réaffecter ({confirmationDialog.documentDetails.length})</Typography>
              <Paper variant="outlined" sx={{ maxHeight: 280, overflow: 'auto', p: 1, border: '1px solid #e0e7ef', borderRadius: 1.5 }}>
                {confirmationDialog.documentDetails.map((doc: any, idx: number) => (
                  <Box
                    key={doc.id}
                    sx={{ p: 1.25, mb: 0.75, background: doc.isOverdue ? '#fdecea' : doc.isUrgent ? '#fff8e1' : '#f4f7fb', borderRadius: 1, border: `1px solid ${doc.isOverdue ? '#ef9a9a' : doc.isUrgent ? '#ffcc80' : '#e0e7ef'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box flex={1}>
                      <Typography sx={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.80rem' }}>{idx + 1}. {doc.name}</Typography>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>Type: {doc.type} • Bordereau: {doc.bordereauReference}</Typography>
                    </Box>
                    <Chip
                      label={doc.isOverdue ? 'En retard' : doc.isUrgent ? 'Urgent' : `${doc.remainingDays}j restants`}
                      color={doc.isOverdue ? 'error' : doc.isUrgent ? 'warning' : 'success'}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                    />
                  </Box>
                ))}
              </Paper>
              <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5, fontSize: '0.75rem' }}>
                ℹ️ Ces documents seront réaffectés au niveau document (pas bordereau). Chaque document sera traité individuellement.
              </Alert>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setConfirmationDialog({ open: false, payload: null, summary: '' })} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Retour</Button>
          <Button
            variant="contained"
            size="small"
            onClick={executeConfirmedReassignment}
            sx={{ background: 'linear-gradient(135deg, #b71c1c 0%, #e53935 100%)', color: '#fff', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg, #8b1010 0%, #c62828 100%)' } }}
          >
            Confirmer et Exécuter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Reassign Dialog */}
      <Dialog open={manualReassignDialog.open} onClose={() => !manualReassignLoading && setManualReassignDialog({ open: false, teamId: '', teamName: '' })} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)', color: '#fff', py: 2, px: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <People sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Réaffectation Manuelle — {manualReassignDialog.teamName}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Sélectionnez un document à réaffecter et choisissez le nouveau responsable.</Alert>
          <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>Document à réaffecter</Typography>
          {loadingManualDocs ? (
            <Box display="flex" alignItems="center" gap={1.5} py={2}>
              <CircularProgress size={18} sx={{ color: '#1e3a5f' }} />
              <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Chargement des documents…</Typography>
            </Box>
          ) : (
            <FormControl fullWidth size="small" sx={{ ...designSx.inputSx, mb: 3 }}>
              <InputLabel>Document</InputLabel>
              <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} label="Document" disabled={manualReassignLoading}>
                <MenuItem value=""><em>— Sélectionner un document —</em></MenuItem>
                {manualDocs.map((doc: any) => (
                  <MenuItem key={doc.id} value={doc.id}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.80rem', color: '#1e3a5f' }}>{doc.name}</Typography>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>
                        {doc.type} • Bordereau: {doc.bordereauReference} • {doc.isOverdue ? '🔴 En retard' : doc.isUrgent ? '🟠 Urgent' : `🟢 ${doc.remainingDays}j restants`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>Nouveau responsable</Typography>
          <FormControl fullWidth size="small" sx={designSx.inputSx}>
            <InputLabel>Utilisateur cible</InputLabel>
            <Select value={manualTargetUser} onChange={(e) => setManualTargetUser(e.target.value)} label="Utilisateur cible" disabled={manualReassignLoading}>
              <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
              {availableUsers.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.80rem', color: '#1e3a5f' }}>{user.fullName}</Typography>
                  <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>{user.role} — {user.email}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setManualReassignDialog({ open: false, teamId: '', teamName: '' })} disabled={manualReassignLoading} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleManualReassign}
            disabled={!manualTargetUser || manualReassignLoading}
            startIcon={manualReassignLoading ? <CircularProgress size={14} color="inherit" /> : <People />}
            sx={{ background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)', color: '#fff', fontWeight: 700 }}
          >
            {manualReassignLoading ? 'Réaffectation…' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Bordereau Dialog */}
      <Dialog open={reassignDialog.open} onClose={() => !reassignLoading && setReassignDialog({ open: false, bordereau: null, currentHandler: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleNavy}>
          <People sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">🔄 Réaffecter le Bordereau</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {reassignDialog.bordereau && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                <Typography sx={{ fontSize: '0.80rem' }}>
                  <strong>Bordereau:</strong> {reassignDialog.bordereau.reference || reassignDialog.bordereau.id}<br />
                  <strong>Actuellement assigné à:</strong> {reassignDialog.currentHandler}
                </Typography>
              </Alert>

              {loadingReassignSuggestions ? (
                <Box sx={{ p: 2, background: '#f0f4ff', borderRadius: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CircularProgress size={16} sx={{ color: '#1e3a5f' }} />
                  <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>🤖 Analyse IA en cours…</Typography>
                </Box>
              ) : reassignSuggestions?.suggestions ? (
                <Box sx={{ p: 2, background: '#f0f4ff', borderRadius: 1.5, border: '1px solid #d0dff5', mb: 2 }}>
                  <Typography sx={{ ...designSx.sectionTitle, mb: 0.5 }}>🤖 Suggestions IA ({reassignSuggestions.suggestions.length})</Typography>
                  <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mb: 1.5 }}>
                    Algorithme: {reassignSuggestions.algorithm} — Confiance: {Math.round(reassignSuggestions.confidence * 100)}%
                  </Typography>
                  {reassignSuggestions.suggestions.map((s: any, idx: number) => (
                    <Box
                      key={idx}
                      onClick={() => setSelectedUser(s.user_id)}
                      sx={{ p: 1.5, background: s.is_recommended ? '#e6f4ed' : '#fff', borderRadius: 1.5, mb: 1, border: s.is_recommended ? '2px solid #a5d6a7' : '1px solid #e0e7ef', cursor: 'pointer', '&:hover': { background: s.is_recommended ? '#d4eeda' : '#f4f7fb' } }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.80rem' }}>
                          {s.is_recommended && '⭐ '}{s.name}
                        </Typography>
                        {s.is_recommended && <Chip label="Recommandé" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />}
                      </Box>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.72rem' }}>
                        {s.role} — Charge: {s.workload_percentage}% — Disponibilité: {s.availability}
                      </Typography>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.70rem', mt: 0.5 }}>💡 {s.reasoning}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}

              <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>Sélectionner le nouveau gestionnaire</Typography>
              <FormControl fullWidth size="small" sx={{ ...designSx.inputSx, mb: 2 }}>
                <InputLabel>Gestionnaire</InputLabel>
                <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} label="Gestionnaire" disabled={reassignLoading}>
                  <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
                  {availableUsers.map((user) => {
                    const suggestion = reassignSuggestions?.suggestions?.find((s: any) => s.user_id === user.id);
                    return (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ width: '100%' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 600, fontSize: '0.80rem', color: '#1e3a5f' }}>
                              {suggestion?.is_recommended && '⭐ '}{user.fullName}
                            </Typography>
                            {suggestion?.is_recommended && <Chip label="IA" color="success" size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18 }} />}
                          </Box>
                          <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>{user.role} — {user.email}</Typography>
                          {suggestion && (
                            <Typography sx={{ color: '#1b6b3a', fontSize: '0.68rem', mt: 0.25 }}>
                              Charge: {suggestion.workload_percentage}% — {suggestion.reasoning}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {selectedUser && (
                <Alert severity="warning" sx={{ borderRadius: 1.5, fontSize: '0.78rem' }}>
                  <strong>⚠️ Confirmation requise</strong><br />
                  Le bordereau sera réaffecté et une notification sera envoyée au nouveau gestionnaire.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setReassignDialog({ open: false, bordereau: null, currentHandler: '' })} disabled={reassignLoading} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleReassignBordereau}
            disabled={!selectedUser || reassignLoading}
            startIcon={reassignLoading ? <CircularProgress size={14} color="inherit" /> : <People />}
            sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)', color: '#fff', fontWeight: 700 }}
          >
            {reassignLoading ? 'Réaffectation…' : 'Confirmer la Réaffectation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notify Client Dialog */}
      <Dialog open={notifyClientDialog.open} onClose={() => !sendingEmail && setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 })} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleInfo}>
          <Notifications sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">📧 Notifier le Client</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {notifyClientDialog.bordereau && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.80rem' }}>
                <strong>Bordereau:</strong> {notifyClientDialog.bordereau.reference || notifyClientDialog.bordereau.id}<br />
                <strong>Client:</strong> {notifyClientDialog.bordereau.contract?.client?.name || notifyClientDialog.bordereau.client?.name || 'N/A'}<br />
                <strong>Retard:</strong> {notifyClientDialog.slaDays} jours
              </Alert>
              <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>Message au client</Typography>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Saisir le message…"
                disabled={sendingEmail}
                sx={{ mb: 2, ...designSx.inputSx }}
              />
              <Alert severity="success" icon={<Info />} sx={{ borderRadius: 1.5, fontSize: '0.75rem' }}>
                🤖 Message généré automatiquement par l'IA. Vous pouvez le modifier avant l'envoi.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setNotifyClientDialog({ open: false, bordereau: null, aiSolution: null, slaDays: 0 })} disabled={sendingEmail} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleNotifyClient}
            disabled={!emailMessage.trim() || sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={14} color="inherit" /> : <Notifications />}
            sx={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)', color: '#fff', fontWeight: 700 }}
          >
            {sendingEmail ? 'Envoi…' : 'Envoyer la Notification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Confirm Dialog */}
      <Dialog open={resolveConfirmDialog.open} onClose={() => setResolveConfirmDialog({ open: false, alert: null })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
        <DialogTitle sx={designSx.dialogTitleSuccess}>
          <CheckCircle sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">Confirmer la Résolution</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {resolveConfirmDialog.alert && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.80rem' }}>
                <strong>⚠️ Êtes-vous sûr de vouloir marquer cette alerte comme résolue ?</strong>
              </Alert>
              <Box sx={{ p: 2, background: '#f4f7fb', border: '1px solid #e0e7ef', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ ...designSx.sectionTitle, mb: 1 }}>📄 Détails de l'Alerte</Typography>
                {[
                  ['Bordereau', resolveConfirmDialog.alert.bordereau.reference || resolveConfirmDialog.alert.bordereau.id],
                  ['Client', resolveConfirmDialog.alert.bordereau.contract?.client?.name || resolveConfirmDialog.alert.bordereau.client?.name || 'N/A'],
                  ['Type', resolveConfirmDialog.alert.reason === 'SLA breach' ? 'Dépassement SLA' : resolveConfirmDialog.alert.reason],
                  ['Statut actuel', resolveConfirmDialog.alert.bordereau.statut],
                ].map(([label, value]) => (
                  <Box key={label} display="flex" gap={1} mb={0.5}>
                    <Typography sx={{ fontWeight: 700, color: '#546e7a', fontSize: '0.78rem', minWidth: 110 }}>{label}:</Typography>
                    <Typography sx={{ color: '#1e3a5f', fontSize: '0.78rem' }}>{value}</Typography>
                  </Box>
                ))}
                <Box display="flex" gap={1} mt={0.5}>
                  <Typography sx={{ fontWeight: 700, color: '#546e7a', fontSize: '0.78rem', minWidth: 110 }}>Niveau:</Typography>
                  <Chip
                    label={alertLevelLabel(resolveConfirmDialog.alert.alertLevel)}
                    size="small"
                    sx={{ bgcolor: alertLevelColor(resolveConfirmDialog.alert.alertLevel), color: '#fff', fontWeight: 700, fontSize: '0.68rem' }}
                  />
                </Box>
              </Box>
              <Box sx={{ p: 2, background: '#e6f4ed', border: '1px solid #a5d6a7', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#1b6b3a', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>✅ Ce que fait "Marquer Résolu"</Typography>
                {[
                  ['Archive l\'alerte', 'Disparaît de la liste "Alertes Actives"'],
                  ['Enregistre l\'action', 'Votre nom et la date de résolution sont enregistrés'],
                  ['Apparaît dans l\'historique', 'Visible dans l\'onglet "Alertes Résolues"'],
                  ['Traçabilité complète', 'Temps de résolution et statistiques calculés automatiquement'],
                ].map(([title, detail]) => (
                  <Box key={title} display="flex" gap={0.75} mb={0.75}>
                    <Typography sx={{ color: '#1b6b3a', fontSize: '0.78rem' }}>•</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#1b6b3a' }}><strong>{title}</strong> — {detail}</Typography>
                  </Box>
                ))}
              </Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.75rem' }}>
                💡 <strong>Important:</strong> Marquer une alerte comme résolue signifie que vous avez pris une action concrète. Le bordereau reste dans son statut actuel jusqu'à traitement complet via le workflow normal.
              </Alert>
              <Box sx={{ p: 1.5, background: '#fff8e1', border: '1px solid #ffcc80', borderRadius: 1.5 }}>
                <Typography sx={{ color: '#e65100', fontSize: '0.72rem' }}>
                  ⚠️ <strong>Rappel:</strong> Cette action ne peut pas être annulée. L'alerte restera dans l'historique mais ne pourra plus être réactivée.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={designSx.dialogActions}>
          <Button onClick={() => setResolveConfirmDialog({ open: false, alert: null })} variant="outlined" size="small" sx={{ color: '#546e7a', borderColor: '#cfd8dc' }}>Annuler</Button>
          <Button
            onClick={() => resolveConfirmDialog.alert && handleResolveAlert(resolveConfirmDialog.alert)}
            variant="contained"
            size="small"
            startIcon={<CheckCircle />}
            sx={{ background: 'linear-gradient(135deg, #1b6b3a 0%, #2e7d32 100%)', color: '#fff', fontWeight: 700 }}
          >
            Confirmer la Résolution
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar — replaces all alert() calls */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.82rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SuperAdminAlerts;