/**
 * FILE: D:\ARS\frontend\src\components\Sage\SageIntegrationTab.tsx
 *
 * SAGE API Integration Tab — Production Ready
 *
 * Features:
 *  • Live connection status banner
 *  • Config editor — SUPER_ADMIN can set URL/key/secrets from UI (no dev needed)
 *  • Stats cards
 *  • Paginated, filterable integration log table
 *  • Per-row: View TXT, Retry (FAILED), Delete (SUPER_ADMIN)
 *  • Single OV real-time integration
 *  • Batch integration (multi-select)
 *  • Webhook logs panel (inbound callbacks from SAGE)
 *  • Webhook info/instructions panel (URL to share with SAGE team)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon     from '@mui/icons-material/HourglassEmpty';
import WifiIcon               from '@mui/icons-material/Wifi';
import WifiOffIcon            from '@mui/icons-material/WifiOff';
import RefreshIcon            from '@mui/icons-material/Refresh';
import ReplayIcon             from '@mui/icons-material/Replay';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutline';
import VisibilityIcon         from '@mui/icons-material/Visibility';
import VisibilityOffIcon      from '@mui/icons-material/VisibilityOff';
import CloudUploadIcon        from '@mui/icons-material/CloudUpload';
import TuneIcon               from '@mui/icons-material/Tune';
import BarChartIcon           from '@mui/icons-material/BarChart';
import SettingsIcon           from '@mui/icons-material/Settings';
import SaveIcon               from '@mui/icons-material/Save';
import WebhookIcon            from '@mui/icons-material/Webhook';
import ContentCopyIcon        from '@mui/icons-material/ContentCopy';
import KeyIcon                from '@mui/icons-material/Key';
import LinkIcon               from '@mui/icons-material/Link';
import ExpandMoreIcon         from '@mui/icons-material/ExpandMore';
import ExpandLessIcon         from '@mui/icons-material/ExpandLess';
import ShieldIcon             from '@mui/icons-material/Shield';
import { useAuth } from '../../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:5000/api';

async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

interface SageStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
  lastIntegratedAt?: string;
  configured: boolean;
  pollingActive?: boolean;
  pollIntervalMinutes?: number;
}

interface SageConfig {
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
  timeout: number;
  retryAttempts: number;
  pollIntervalMinutes: number;
  configured: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  pollingActive: boolean;
}

interface ConnectionResult {
  success: boolean;
  configured: boolean;
  message: string;
  latencyMs?: number;
  sageVersion?: string;
}

interface IntegrationRecord {
  id: string;
  status: IntegrationStatus;
  sageTransactionId?: string;
  errorMessage?: string;
  txtContent?: string;
  fileName?: string;
  integratedAt: string;
  ordreVirement: {
    id: string;
    reference: string;
    montantTotal: number;
    clientName?: string;
    client?: { id: string; name: string };
  };
  integratedBy?: { id: string; fullName: string; email: string };
}

interface PaginatedIntegrations {
  data: IntegrationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AccountedOV {
  id: string;
  reference: string;
  montantTotal: number;
  clientName?: string;
  client?: { name: string };
  statutGlobal: string;
}

interface WebhookLog {
  id: string;
  receivedAt: string;
  eventType: string;
  sageTransactionId?: string;
  ordreVirementId?: string;
  signatureValid: boolean;
  processed: boolean;
  processingError?: string;
  sourceIp?: string;
}

interface ConfigForm {
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
  timeout: number;       // seconds
  retryAttempts: number;
  pollIntervalMin: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const StatusChip: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
  const map: Record<IntegrationStatus, { label: string; color: 'success' | 'error' | 'warning'; icon: React.ReactNode }> = {
    SUCCESS: { label: 'Succès',    color: 'success', icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
    FAILED:  { label: 'Échoué',   color: 'error',   icon: <ErrorOutlineIcon      sx={{ fontSize: 14 }} /> },
    PENDING: { label: 'En cours',  color: 'warning', icon: <HourglassEmptyIcon   sx={{ fontSize: 14 }} /> },
  };
  const { label, color, icon } = map[status] ?? map.PENDING;
  return (
    <Chip label={label} color={color} size="small" icon={icon as any}
      sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
  );
};

const StatCard: React.FC<{
  label: string; value: string | number; color: string; icon: React.ReactNode; subtitle?: string;
}> = ({ label, value, color, icon, subtitle }) => (
  <Card elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 2, height: '100%' }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${color}18`, color, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
          <Typography variant="caption" sx={{ color: '#78909c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          {subtitle && (
            <Typography variant="caption" display="block" sx={{ color: '#90a4ae', fontSize: '0.68rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const SageIntegrationTab: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── Core state ───────────────────────────────────────────────────────────
  const [stats,       setStats]       = useState<SageStats | null>(null);
  const [config,      setConfig]      = useState<SageConfig | null>(null);
  const [connResult,  setConnResult]  = useState<ConnectionResult | null>(null);
  const [testingConn, setTestingConn] = useState(false);
  const [reloading,   setReloading]   = useState(false);

  // Table state
  const [records,   setRecords]   = useState<IntegrationRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page,      setPage]      = useState(0);
  const [pageSize,  setPageSize]  = useState(20);
  const [loading,   setLoading]   = useState(false);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSearch,   setFilterSearch]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');

  // Batch integration
  const [accountedOVs,   setAccountedOVs]   = useState<AccountedOV[]>([]);
  const [selectedOVIds,  setSelectedOVIds]  = useState<Set<string>>(new Set());
  const [batchLoading,   setBatchLoading]   = useState(false);
  const [batchResult,    setBatchResult]    = useState<any | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState(false);

  // Detail / delete dialogs
  const [detailRecord,  setDetailRecord]  = useState<IntegrationRecord | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [retryingId,    setRetryingId]    = useState<string | null>(null);
  const [integratingId, setIntegratingId] = useState<string | null>(null);

  // ── Config editor state ──────────────────────────────────────────────────
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configForm, setConfigForm] = useState<ConfigForm>({
    apiUrl: '', apiKey: '', webhookSecret: '',
    timeout: 30, retryAttempts: 3, pollIntervalMin: 5,
  });
  const [savingConfig,       setSavingConfig]       = useState(false);
  const [showApiKey,         setShowApiKey]         = useState(false);
  const [showWebhookSecret,  setShowWebhookSecret]  = useState(false);
  const [clearApiKey,        setClearApiKey]        = useState(false);
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false);

  // ── Webhook panel state ──────────────────────────────────────────────────
  const [showWebhookPanel,  setShowWebhookPanel]  = useState(false);
  const [webhookLogs,       setWebhookLogs]       = useState<WebhookLog[]>([]);
  const [webhookLogsTotal,  setWebhookLogsTotal]  = useState(0);
  const [webhookLogsPage,   setWebhookLogsPage]   = useState(0);
  const [webhookLogsLoading,setWebhookLogsLoading]= useState(false);
  const [webhookInfo,       setWebhookInfo]       = useState<any>(null);
  const [showWebhookInfo,   setShowWebhookInfo]   = useState(false);
  const [copiedUrl,         setCopiedUrl]         = useState(false);

  // ── Banner ───────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; msg: string } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try { setStats(await apiFetch<SageStats>('/finance/sage/integrations/stats')); } catch {}
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const cfg = await apiFetch<SageConfig>('/finance/sage/config');
      setConfig(cfg);
      // Populate config form with current values
      setConfigForm({
        apiUrl:         cfg.apiUrl || '',
        apiKey:         '',  // never pre-fill secrets
        webhookSecret:  '',
        timeout:        Math.round((cfg.timeout || 30000) / 1000),
        retryAttempts:  cfg.retryAttempts || 3,
        pollIntervalMin: cfg.pollIntervalMinutes || 5,
      });
      setClearApiKey(false);
      setClearWebhookSecret(false);
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(page + 1),
        pageSize: String(pageSize),
        ...(filterStatus   ? { status:   filterStatus }   : {}),
        ...(filterSearch   ? { search:   filterSearch }   : {}),
        ...(filterDateFrom ? { dateFrom: filterDateFrom } : {}),
        ...(filterDateTo   ? { dateTo:   filterDateTo }   : {}),
      });
      const res = await apiFetch<PaginatedIntegrations>(`/finance/sage/integrations?${params}`);
      setRecords(res.data);
      setTotalRows(res.total);
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const fetchAccountedOVs = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/finance/ordres-virement?statutGlobal=COMPTABILISE');
      const ovs: AccountedOV[] = (res.ordresVirement ?? res ?? []).filter(
        (ov: any) => ov.statutGlobal === 'COMPTABILISE',
      );
      setAccountedOVs(ovs);
    } catch {}
  }, []);

  const fetchWebhookLogs = useCallback(async () => {
    if (!showWebhookPanel) return;
    setWebhookLogsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/finance/sage/webhook/logs?page=${webhookLogsPage + 1}&pageSize=15`,
      );
      setWebhookLogs(res.data ?? []);
      setWebhookLogsTotal(res.total ?? 0);
    } catch {}
    finally { setWebhookLogsLoading(false); }
  }, [showWebhookPanel, webhookLogsPage]);

  const fetchWebhookInfo = useCallback(async () => {
    try { setWebhookInfo(await apiFetch('/finance/sage/webhook/info')); } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchConfig();
    fetchRecords();
    fetchAccountedOVs();
    fetchWebhookInfo();
  }, []); // eslint-disable-line

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchWebhookLogs(); }, [fetchWebhookLogs]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions — connection
  // ─────────────────────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      setConnResult(await apiFetch<ConnectionResult>('/finance/sage/test-connection'));
    } catch (err: any) {
      setConnResult({ success: false, configured: false, message: err.message });
    } finally {
      setTestingConn(false);
    }
  };

  const handleReloadConfig = async () => {
    setReloading(true);
    try {
      await apiFetch('/finance/sage/config/reload', { method: 'POST' });
      await fetchConfig();
      await fetchStats();
      setBanner({ type: 'success', msg: 'Configuration SAGE rechargée depuis le fichier .env.' });
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setReloading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actions — config editor (save to DB)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const body: Record<string, any> = {
        apiUrl:         configForm.apiUrl.trim(),
        timeout:        configForm.timeout * 1000,   // convert s → ms
        retryAttempts:  configForm.retryAttempts,
        pollIntervalMin: configForm.pollIntervalMin,
      };

      // Secret fields: explicit null = clear, non-empty string = set, omitted = keep
      if (clearApiKey) {
        body.apiKey = null;
      } else if (configForm.apiKey.trim()) {
        body.apiKey = configForm.apiKey.trim();
      }
      // else: omit apiKey — service keeps existing value

      if (clearWebhookSecret) {
        body.webhookSecret = null;
      } else if (configForm.webhookSecret.trim()) {
        body.webhookSecret = configForm.webhookSecret.trim();
      }

      const result = await apiFetch<any>('/finance/sage/config', {
        method: 'PUT',
        body:   JSON.stringify(body),
      });

      setBanner({ type: result.configured ? 'success' : 'info', msg: result.message });
      setConfigForm(prev => ({ ...prev, apiKey: '', webhookSecret: '' }));
      setClearApiKey(false);
      setClearWebhookSecret(false);
      await fetchStats();
      await fetchConfig();
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setSavingConfig(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actions — integration operations
  // ─────────────────────────────────────────────────────────────────────────

  const handleRetry = async (integrationId: string) => {
    setRetryingId(integrationId);
    try {
      const res = await apiFetch<any>(`/finance/sage/integrations/${integrationId}/retry`, { method: 'POST' });
      setBanner({
        type: res.success ? 'success' : 'error',
        msg:  res.success
          ? `Nouvelle tentative réussie — Transaction ID: ${res.sageTransactionId}`
          : `Nouvelle tentative échouée: ${res.message}`,
      });
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/finance/sage/integrations/${deleteTarget}`, { method: 'DELETE' });
      setBanner({ type: 'success', msg: 'Enregistrement supprimé.' });
      setDeleteTarget(null);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleIntegrateSingle = async (ovId: string) => {
    setIntegratingId(ovId);
    try {
      const res = await apiFetch<any>(`/finance/sage/integrate/${ovId}`, {
        method: 'POST', body: JSON.stringify({}),
      });
      if (!res.configured) {
        setBanner({ type: 'error', msg: 'SAGE API URL non configurée. Utilisez le panneau de configuration ci-dessus.' });
      } else {
        setBanner({
          type: res.success ? 'success' : 'error',
          msg:  res.success
            ? `OV intégré avec succès — Transaction: ${res.sageTransactionId}`
            : `Intégration échouée: ${res.message}`,
        });
      }
      fetchRecords(); fetchStats(); fetchAccountedOVs();
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setIntegratingId(null);
    }
  };

  const handleBatchIntegrate = async () => {
    if (!selectedOVIds.size) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await apiFetch<any>('/finance/sage/integrate-batch', {
        method: 'POST', body: JSON.stringify({ ordreVirementIds: [...selectedOVIds] }),
      });
      setBatchResult(res);
      setSelectedOVIds(new Set());
      fetchRecords(); fetchStats(); fetchAccountedOVs();
    } catch (err: any) {
      setBanner({ type: 'error', msg: err.message });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFilterReset = () => {
    setFilterStatus(''); setFilterSearch('');
    setFilterDateFrom(''); setFilterDateTo(''); setPage(0);
  };

  const handleCopyWebhookUrl = () => {
    if (webhookInfo?.webhookUrl) {
      navigator.clipboard.writeText(webhookInfo.webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────

  const isConfigured = stats?.configured ?? false;

  const toggleOVSelection = (id: string) => {
    setSelectedOVIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOVIds.size === accountedOVs.length) setSelectedOVIds(new Set());
    else setSelectedOVIds(new Set(accountedOVs.map(o => o.id)));
  };

  const formatDate    = (iso: string) => new Date(iso).toLocaleString('fr-TN', { dateStyle: 'short', timeStyle: 'short' });
  const formatAmount  = (n: number)   => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(n);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const sectionHeader = (
    icon: React.ReactNode,
    title: string,
    badge?: React.ReactNode,
    expanded?: boolean,
    onToggle?: () => void,
    accentColor = '#6a1b9a',
  ) => (
    <Box
      onClick={onToggle}
      sx={{
        px: 2.5, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: onToggle ? 'pointer' : 'default',
        bgcolor: expanded ? `${accentColor}0a` : '#fafbfc',
        borderBottom: expanded ? `1px solid ${accentColor}22` : 'none',
        transition: 'background 0.15s',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ color: accentColor }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: accentColor }}>{title}</Typography>
        {badge}
      </Stack>
      {onToggle && (
        <Typography variant="body2" sx={{ color: accentColor, fontWeight: 600 }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 18, verticalAlign: 'middle' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, verticalAlign: 'middle' }} />}
        </Typography>
      )}
    </Box>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* ── Global banner ────────────────────────────────────────────────── */}
      {banner && (
        <Alert severity={banner.type} onClose={() => setBanner(null)} sx={{ borderRadius: 2 }}>
          {banner.msg}
        </Alert>
      )}

      {/* ── Connection status banner ─────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        p: 2.5, borderRadius: 2,
        border: `1px solid ${isConfigured ? '#c8e6c9' : '#ffe0b2'}`,
        bgcolor: isConfigured ? '#f1f8e9' : '#fff8e1',
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {isConfigured
              ? <WifiIcon sx={{ color: '#388e3c', fontSize: 28 }} />
              : <WifiOffIcon sx={{ color: '#e65100', fontSize: 28 }} />}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isConfigured ? '#1b5e20' : '#bf360c' }}>
                {isConfigured ? 'SAGE API configurée' : 'SAGE API non configurée'}
              </Typography>
              <Typography variant="body2" sx={{ color: isConfigured ? '#388e3c' : '#e65100' }}>
                {isConfigured
                  ? `URL: ${config?.apiUrl ?? '…'}  •  Timeout: ${Math.round((config?.timeout ?? 30000) / 1000)}s  •  Tentatives: ${config?.retryAttempts ?? 3}  •  Poll: ${config?.pollIntervalMinutes ?? 5}min`
                  : 'Configurez l\'URL SAGE dans le panneau ci-dessous ou via le fichier .env du serveur.'}
              </Typography>
              {connResult && (
                <Typography variant="caption" sx={{ color: connResult.success ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                  {connResult.success
                    ? `✓ Connecté (${connResult.latencyMs}ms)${connResult.sageVersion ? ` — v${connResult.sageVersion}` : ''}`
                    : `✗ ${connResult.message}`}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexShrink={0}>
            {isSuperAdmin && (
              <>
                <Button size="small" variant="outlined"
                  startIcon={reloading ? <CircularProgress size={14} /> : <RefreshIcon />}
                  onClick={handleReloadConfig} disabled={reloading}
                  sx={{ borderColor: '#8d6e63', color: '#5d4037', '&:hover': { bgcolor: '#efebe9' } }}>
                  Recharger .env
                </Button>
                <Button size="small" variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowConfigEditor(v => !v)}
                  sx={{ borderColor: '#7b1fa2', color: '#4a148c', '&:hover': { bgcolor: '#f3e5f5' } }}>
                  Configurer
                </Button>
              </>
            )}
            <Button size="small" variant="contained"
              startIcon={testingConn ? <CircularProgress size={14} color="inherit" /> : <WifiIcon />}
              onClick={handleTestConnection} disabled={testingConn}
              sx={{ bgcolor: isConfigured ? '#388e3c' : '#e65100', '&:hover': { bgcolor: isConfigured ? '#2e7d32' : '#bf360c' } }}>
              Tester connexion
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Config editor (SUPER_ADMIN only) ─────────────────────────────── */}
      {isSuperAdmin && (
        <Paper elevation={0} sx={{ border: '1px solid #e1bee7', borderRadius: 2, overflow: 'hidden' }}>
          {sectionHeader(
            <SettingsIcon />, 'Configuration SAGE API',
            <Chip label="SUPER ADMIN" size="small" sx={{ bgcolor: '#7b1fa2', color: '#fff', fontSize: '0.65rem', height: 18 }} />,
            showConfigEditor, () => setShowConfigEditor(v => !v), '#7b1fa2',
          )}

          <Collapse in={showConfigEditor}>
            <Box sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5, fontSize: '0.82rem' }}>
                Les valeurs saisies ici sont stockées en base de données et remplacent le fichier <code>.env</code>.
                Aucun redémarrage du serveur n'est nécessaire.
              </Alert>

              <Grid container spacing={2.5}>
                {/* API URL */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth size="small" label="URL de l'API SAGE *"
                    placeholder="https://votre-serveur-sage.com/api"
                    value={configForm.apiUrl}
                    onChange={e => setConfigForm(p => ({ ...p, apiUrl: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon sx={{ fontSize: 18, color: '#7b1fa2' }} /></InputAdornment> }}
                    helperText="URL de base fournie par l'équipe SAGE. Exemple : https://sage.monentreprise.tn/api"
                  />
                </Grid>

                {/* API Key */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth size="small"
                    label={`Clé API${config?.hasApiKey ? ' (actuellement définie)' : ''}`}
                    placeholder={config?.hasApiKey ? 'Laisser vide pour conserver la clé existante' : 'Entrez la clé API SAGE'}
                    type={showApiKey ? 'text' : 'password'}
                    value={clearApiKey ? '' : configForm.apiKey}
                    onChange={e => {
                      setClearApiKey(false);
                      setConfigForm(p => ({ ...p, apiKey: e.target.value }));
                    }}
                    disabled={clearApiKey}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><KeyIcon sx={{ fontSize: 18, color: '#546e7a' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => setShowApiKey(v => !v)} tabIndex={-1}>
                              {showApiKey ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                            {config?.hasApiKey && (
                              <Tooltip title={clearApiKey ? 'Annuler la suppression' : 'Supprimer la clé API'}>
                                <IconButton size="small" onClick={() => setClearApiKey(v => !v)}
                                  sx={{ color: clearApiKey ? '#e65100' : '#bdbdbd' }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    helperText={
                      clearApiKey
                        ? '⚠ La clé API sera supprimée à la sauvegarde'
                        : config?.hasApiKey
                          ? '✓ Clé API définie — laisser vide pour la conserver'
                          : 'Clé API si SAGE utilise X-API-Key (optionnel)'
                    }
                    FormHelperTextProps={{ sx: { color: clearApiKey ? '#e65100' : undefined } }}
                  />
                </Grid>

                {/* Webhook Secret */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth size="small"
                    label={`Secret Webhook${config?.hasWebhookSecret ? ' (actuellement défini)' : ''}`}
                    placeholder={config?.hasWebhookSecret ? 'Laisser vide pour conserver le secret existant' : 'Secret HMAC pour vérifier les callbacks'}
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={clearWebhookSecret ? '' : configForm.webhookSecret}
                    onChange={e => {
                      setClearWebhookSecret(false);
                      setConfigForm(p => ({ ...p, webhookSecret: e.target.value }));
                    }}
                    disabled={clearWebhookSecret}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><ShieldIcon sx={{ fontSize: 18, color: '#546e7a' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => setShowWebhookSecret(v => !v)} tabIndex={-1}>
                              {showWebhookSecret ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                            {config?.hasWebhookSecret && (
                              <Tooltip title={clearWebhookSecret ? 'Annuler la suppression' : 'Supprimer le secret'}>
                                <IconButton size="small" onClick={() => setClearWebhookSecret(v => !v)}
                                  sx={{ color: clearWebhookSecret ? '#e65100' : '#bdbdbd' }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    helperText={
                      clearWebhookSecret
                        ? '⚠ Le secret sera supprimé — les callbacks SAGE ne seront plus vérifiés'
                        : config?.hasWebhookSecret
                          ? '✓ Secret défini — HMAC-SHA256 activé'
                          : 'Secret partagé avec SAGE pour signer les webhooks (recommandé)'
                    }
                    FormHelperTextProps={{ sx: { color: clearWebhookSecret ? '#e65100' : undefined } }}
                  />
                </Grid>

                {/* Timeout */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" type="number" label="Timeout (secondes)"
                    value={configForm.timeout}
                    onChange={e => setConfigForm(p => ({ ...p, timeout: Math.max(5, parseInt(e.target.value) || 30) }))}
                    inputProps={{ min: 5, max: 300 }}
                    helperText="Délai d'attente HTTP (5–300 s)"
                  />
                </Grid>

                {/* Retry attempts */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" type="number" label="Tentatives max"
                    value={configForm.retryAttempts}
                    onChange={e => setConfigForm(p => ({ ...p, retryAttempts: Math.min(5, Math.max(1, parseInt(e.target.value) || 3)) }))}
                    inputProps={{ min: 1, max: 5 }}
                    helperText="Nombre de retries automatiques (1–5)"
                  />
                </Grid>

                {/* Poll interval */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" type="number" label="Intervalle de polling (min)"
                    value={configForm.pollIntervalMin}
                    onChange={e => setConfigForm(p => ({ ...p, pollIntervalMin: Math.max(1, parseInt(e.target.value) || 5) }))}
                    inputProps={{ min: 1, max: 60 }}
                    helperText="Fréquence de vérification des OVs en attente"
                  />
                </Grid>
              </Grid>

              <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
                <Button variant="text" size="small" onClick={() => { setShowConfigEditor(false); fetchConfig(); }}
                  sx={{ color: '#78909c' }}>
                  Annuler
                </Button>
                <Button
                  variant="contained" size="small"
                  startIcon={savingConfig ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#4a148c' } }}>
                  {savingConfig ? 'Enregistrement…' : 'Enregistrer la configuration'}
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      {stats && (
        <Grid container spacing={2}>
          {[
            {
              label: 'Total', value: stats.total, color: '#5c6bc0', icon: <BarChartIcon />,
              subtitle: stats.lastIntegratedAt ? `Dernier: ${formatDate(stats.lastIntegratedAt)}` : undefined,
            },
            { label: 'Succès',        value: stats.success,     color: '#388e3c', icon: <CheckCircleOutlineIcon /> },
            { label: 'Échoués',       value: stats.failed,      color: '#d32f2f', icon: <ErrorOutlineIcon /> },
            { label: 'En cours',      value: stats.pending,     color: '#f57c00', icon: <HourglassEmptyIcon /> },
            {
              label: 'Taux de succès',
              value: `${stats.successRate}%`,
              color: stats.successRate >= 80 ? '#388e3c' : stats.successRate >= 50 ? '#f57c00' : '#d32f2f',
              icon: <TuneIcon />,
              subtitle: stats.pollingActive ? `Poll actif (${stats.pollIntervalMinutes}min)` : 'Poll inactif',
            },
          ].map(card => (
            <Grid item xs={12} sm={6} md={2.4} key={card.label}>
              <StatCard {...card} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Batch integration panel ───────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 2, overflow: 'hidden' }}>
        {sectionHeader(
          <CloudUploadIcon />,
          `Intégration en lot — OVs comptabilisés (${accountedOVs.length} disponibles)`,
          selectedOVIds.size > 0
            ? <Chip label={`${selectedOVIds.size} sélectionné(s)`} size="small" color="secondary" />
            : undefined,
          showBatchPanel, () => setShowBatchPanel(v => !v), '#7b1fa2',
        )}

        <Collapse in={showBatchPanel}>
          <Box sx={{ p: 2 }}>
            {accountedOVs.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Aucun OV en statut COMPTABILISÉ. Les OVs doivent avoir leur fichier TXT généré avant l'intégration SAGE.
              </Alert>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 300, mb: 2, border: '1px solid #e8edf5', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { bgcolor: '#f8f4ff', fontWeight: 700, fontSize: '0.78rem' } }}>
                        <TableCell padding="checkbox">
                          <Checkbox size="small"
                            checked={selectedOVIds.size === accountedOVs.length && accountedOVs.length > 0}
                            indeterminate={selectedOVIds.size > 0 && selectedOVIds.size < accountedOVs.length}
                            onChange={toggleSelectAll} />
                        </TableCell>
                        <TableCell>Référence OV</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell align="right">Montant</TableCell>
                        <TableCell>Action rapide</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accountedOVs.map(ov => (
                        <TableRow key={ov.id} hover selected={selectedOVIds.has(ov.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox size="small" checked={selectedOVIds.has(ov.id)}
                              onChange={() => toggleOVSelection(ov.id)} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>
                            {ov.reference}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {ov.client?.name ?? ov.clientName ?? '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                            {formatAmount(ov.montantTotal)}
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" color="secondary"
                              startIcon={integratingId === ov.id ? <CircularProgress size={12} color="inherit" /> : <CloudUploadIcon sx={{ fontSize: 14 }} />}
                              disabled={!!integratingId}
                              onClick={() => handleIntegrateSingle(ov.id)}
                              sx={{ fontSize: '0.72rem', py: 0.3 }}>
                              Intégrer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {batchResult && (
                  <Alert
                    severity={batchResult.failureCount === 0 ? 'success' : batchResult.successCount === 0 ? 'error' : 'warning'}
                    sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setBatchResult(null)}>
                    <strong>Résultat du lot:</strong> {batchResult.successCount} succès / {batchResult.failureCount} échec(s) sur {batchResult.totalFiles} OV(s).
                    {batchResult.failureCount > 0 && (
                      <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                        {batchResult.results.filter((r: any) => !r.success).slice(0, 5).map((r: any) => (
                          <li key={r.ordreVirementId} style={{ fontSize: '0.78rem' }}>
                            {r.ordreVirementId}: {r.error}
                          </li>
                        ))}
                      </Box>
                    )}
                  </Alert>
                )}

                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                  <Button variant="text" size="small" onClick={() => setSelectedOVIds(new Set())}
                    disabled={!selectedOVIds.size} sx={{ color: '#78909c' }}>
                    Tout désélectionner
                  </Button>
                  <Button variant="contained" color="secondary" size="small"
                    startIcon={batchLoading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />}
                    disabled={!selectedOVIds.size || batchLoading || !isConfigured}
                    onClick={handleBatchIntegrate}
                    sx={{ bgcolor: '#6a1b9a', '&:hover': { bgcolor: '#4a148c' } }}>
                    Intégrer la sélection ({selectedOVIds.size})
                  </Button>
                </Stack>

                {!isConfigured && (
                  <Typography variant="caption" sx={{ color: '#e65100', display: 'block', mt: 1, textAlign: 'right' }}>
                    ⚠ L'intégration est désactivée — configurez l'URL SAGE ci-dessus.
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* ── Integration log table ─────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, bgcolor: '#fafbfc', borderBottom: '1px solid #e8edf5' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#37474f' }}>
              Journal des intégrations SAGE
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Statut</InputLabel>
                <Select value={filterStatus} label="Statut"
                  onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="SUCCESS">Succès</MenuItem>
                  <MenuItem value="FAILED">Échoué</MenuItem>
                  <MenuItem value="PENDING">En cours</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" placeholder="Référence / Transaction ID" value={filterSearch}
                onChange={e => { setFilterSearch(e.target.value); setPage(0); }} sx={{ minWidth: 220 }} />
              <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
                value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }} sx={{ width: 155 }} />
              <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
                value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }} sx={{ width: 155 }} />
              <Tooltip title="Réinitialiser les filtres">
                <IconButton size="small" onClick={handleFilterReset}><RefreshIcon /></IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f7fa', fontWeight: 700, fontSize: '0.78rem', color: '#546e7a' } }}>
                <TableCell>Référence OV</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Fichier TXT</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#6a1b9a' }} />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#90a4ae' }}>
                    Aucune intégration trouvée avec ces critères.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(rec => (
                  <TableRow key={rec.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                      {rec.ordreVirement?.reference ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {rec.ordreVirement?.client?.name ?? rec.ordreVirement?.clientName ?? '—'}
                    </TableCell>
                    <TableCell><StatusChip status={rec.status} /></TableCell>
                    <TableCell>
                      {rec.sageTransactionId
                        ? <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#37474f' }}>{rec.sageTransactionId}</Typography>
                        : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>—</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#546e7a' }}>{rec.fileName ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#546e7a', whiteSpace: 'nowrap' }}>
                      {formatDate(rec.integratedAt)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{rec.integratedBy?.fullName ?? 'Système'}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Voir les détails">
                          <IconButton size="small" onClick={() => setDetailRecord(rec)} sx={{ color: '#5c6bc0' }}>
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {rec.status === 'FAILED' && (
                          <Tooltip title="Réessayer">
                            <span>
                              <IconButton size="small" onClick={() => handleRetry(rec.id)}
                                disabled={retryingId === rec.id || !isConfigured}
                                sx={{ color: '#388e3c' }}>
                                {retryingId === rec.id
                                  ? <CircularProgress size={14} color="inherit" />
                                  : <ReplayIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {isSuperAdmin && rec.status !== 'SUCCESS' && (
                          <Tooltip title="Supprimer l'enregistrement">
                            <IconButton size="small" onClick={() => setDeleteTarget(rec.id)} sx={{ color: '#d32f2f' }}>
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div" count={totalRows} page={page} rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50, 100]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
        />
      </Paper>

      {/* ── Webhook panel ─────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 2, overflow: 'hidden' }}>
        {sectionHeader(
          <WebhookIcon />,
          `Webhooks SAGE → GED (callbacks entrants)`,
          <Chip label={`${webhookLogsTotal} reçus`} size="small"
            sx={{ bgcolor: '#1565c020', color: '#1565c0', fontSize: '0.7rem', height: 18 }} />,
          showWebhookPanel,
          () => { setShowWebhookPanel(v => !v); },
          '#1565c0',
        )}

        <Collapse in={showWebhookPanel}>
          <Box sx={{ p: 2 }}>

            {/* Webhook info / instructions */}
            {webhookInfo && (
              <Paper elevation={0} sx={{ mb: 2, p: 2, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 1.5 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1b5e20', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      URL à communiquer à l'équipe SAGE
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#2e7d32', wordBreak: 'break-all' }}>
                        {webhookInfo.webhookUrl}
                      </Typography>
                      <Tooltip title={copiedUrl ? 'Copié !' : 'Copier l\'URL'}>
                        <IconButton size="small" onClick={handleCopyWebhookUrl} sx={{ color: copiedUrl ? '#388e3c' : '#78909c' }}>
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#388e3c', display: 'block', mt: 0.5 }}>
                      Méthode: POST  •  Content-Type: application/json  •
                      Auth: {webhookInfo.authMethod ?? 'Non configurée'}  •
                      Secret: {webhookInfo.secretConfigured ? '✓ Configuré' : '⚠ Non défini (toute requête acceptée)'}
                    </Typography>
                  </Box>
                  <Button size="small" variant="text" onClick={() => setShowWebhookInfo(v => !v)}
                    sx={{ color: '#2e7d32', flexShrink: 0, fontSize: '0.72rem' }}>
                    {showWebhookInfo ? 'Masquer' : 'Voir détails'}
                  </Button>
                </Stack>

                <Collapse in={showWebhookInfo}>
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#37474f', textTransform: 'uppercase' }}>
                      Exemple de payload attendu
                    </Typography>
                    <Paper elevation={0} sx={{ p: 1.5, mt: 0.5, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', m: 0, color: '#263238', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(webhookInfo.expectedPayloadExample, null, 2)}
                      </Typography>
                    </Paper>
                    <Typography variant="caption" sx={{ color: '#546e7a', display: 'block', mt: 1 }}>
                      Événements supportés: {(webhookInfo.supportedEvents ?? []).join(' • ')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#546e7a', display: 'block' }}>
                      Signature: header <strong>X-Sage-Signature: sha256=&lt;hmac&gt;</strong> ou <strong>Authorization: Bearer &lt;secret&gt;</strong>
                    </Typography>
                  </Box>
                </Collapse>
              </Paper>
            )}

            {/* Webhook logs table */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#37474f' }}>
                Journal des callbacks reçus
              </Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={fetchWebhookLogs} sx={{ color: '#546e7a' }}>
                Actualiser
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #e8edf5', borderRadius: 1, maxHeight: 340 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#e3f2fd', fontWeight: 700, fontSize: '0.75rem', color: '#1565c0' } }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Événement</TableCell>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>OV ID</TableCell>
                    <TableCell>IP source</TableCell>
                    <TableCell align="center">Signature</TableCell>
                    <TableCell align="center">Traité</TableCell>
                    <TableCell>Erreur</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhookLogsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} sx={{ color: '#1565c0' }} />
                      </TableCell>
                    </TableRow>
                  ) : webhookLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#90a4ae', fontSize: '0.82rem' }}>
                        Aucun callback SAGE reçu pour l'instant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookLogs.map(log => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {formatDate(log.receivedAt)}
                        </TableCell>
                        <TableCell>
                          <Chip label={log.eventType} size="small" variant="outlined"
                            sx={{ fontSize: '0.68rem', height: 18, borderColor: '#1565c044', color: '#1565c0' }} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#37474f' }}>
                          {log.sageTransactionId ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#546e7a', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.ordreVirementId ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: '#78909c' }}>
                          {log.sourceIp ?? '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={log.signatureValid ? '✓ Valide' : '✗ Invalide'}
                            size="small"
                            color={log.signatureValid ? 'success' : 'error'}
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={log.processed ? '✓ Oui' : '✗ Non'}
                            size="small"
                            color={log.processed ? 'success' : 'warning'}
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: '#c62828', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Tooltip title={log.processingError ?? ''}>
                            <span>{log.processingError ?? '—'}</span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div" count={webhookLogsTotal} page={webhookLogsPage} rowsPerPage={15}
              rowsPerPageOptions={[15]}
              onPageChange={(_, p) => setWebhookLogsPage(p)}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{ borderTop: '1px solid #e8edf5' }}
            />
          </Box>
        </Collapse>
      </Paper>

      {/* ── Detail dialog ────────────────────────────────────────────────── */}
      <Dialog open={Boolean(detailRecord)} onClose={() => setDetailRecord(null)}
        maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #e8edf5', pb: 1.5 }}>
          Détails de l'intégration — {detailRecord?.ordreVirement?.reference}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {detailRecord && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {[
                  { label: 'Statut',          value: <StatusChip status={detailRecord.status} /> },
                  { label: 'Transaction SAGE', value: detailRecord.sageTransactionId ?? '—' },
                  { label: 'Nom du fichier',   value: detailRecord.fileName ?? '—' },
                  { label: 'Date',             value: formatDate(detailRecord.integratedAt) },
                  { label: 'Intégré par',      value: detailRecord.integratedBy?.fullName ?? 'Système' },
                  { label: 'Client',           value: detailRecord.ordreVirement?.client?.name ?? detailRecord.ordreVirement?.clientName ?? '—' },
                  { label: 'Montant',          value: formatAmount(detailRecord.ordreVirement?.montantTotal ?? 0) },
                ].map(({ label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography variant="caption" sx={{ color: '#78909c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {label}
                    </Typography>
                    <Box sx={{ mt: 0.3 }}>
                      {typeof value === 'string'
                        ? <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                        : value}
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {detailRecord.errorMessage && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 700, textTransform: 'uppercase' }}>
                      Message d'erreur
                    </Typography>
                    <Paper elevation={0} sx={{ p: 1.5, mt: 0.5, bgcolor: '#ffebee', borderRadius: 1, border: '1px solid #ffcdd2' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#b71c1c', whiteSpace: 'pre-wrap', fontSize: '0.78rem' }}>
                        {detailRecord.errorMessage}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              )}

              {detailRecord.txtContent && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#37474f', fontWeight: 700, textTransform: 'uppercase' }}>
                      Contenu TXT envoyé à SAGE
                    </Typography>
                    <Paper elevation={0} sx={{ p: 1.5, mt: 0.5, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0', maxHeight: 320, overflow: 'auto' }}>
                      <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#263238', m: 0, whiteSpace: 'pre' }}>
                        {detailRecord.txtContent}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e8edf5' }}>
          {detailRecord?.status === 'FAILED' && isConfigured && (
            <Button variant="contained" color="success" size="small"
              startIcon={retryingId === detailRecord.id ? <CircularProgress size={14} color="inherit" /> : <ReplayIcon />}
              disabled={retryingId === detailRecord.id}
              onClick={() => { handleRetry(detailRecord.id); setDetailRecord(null); }}>
              Réessayer
            </Button>
          )}
          <Button onClick={() => setDetailRecord(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous vraiment supprimer cet enregistrement d'intégration ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: '#546e7a' }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SageIntegrationTab;