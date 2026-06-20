import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Scanner,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  PlayArrow,
  Visibility,
  AutoFixHigh,
  TextFields,
  Add,
  History,
  QueuePlayNext,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import ScannerControl from '../components/ScannerControl';
import QualityValidator from '../components/QualityValidator';
import OCRCorrectionInterface from '../components/OCRCorrectionInterface';
import FolderMonitor from '../components/FolderMonitor';
import { ScanCorbeille } from '../components/Workflow/ScanCorbeille';
import ManualScanInterface from '../components/Workflow/ManualScanInterface';
import DirectManualScanInterface from '../components/DirectManualScanInterface';
import DocumentTypeModal from '../components/DocumentTypeModal';
import ScanRejectionHandler from '../components/Workflow/ScanRejectionHandler';
import ReturnedBordereauHandler from '../components/Workflow/ReturnedBordereauHandler';
import {
  fetchScanStatus,
  fetchScanActivity,
  initializeScanners,
  processScanQueue,
  triggerPaperStreamImport,
  getDashboardStats,
  getScanQueue,
  getBordereauForScan,
  startScanning,
  validateScanning,
  completeScanWithWorkflow,
  checkScanOverload,
  getScanActivityChart,
  debugBordereaux,
} from '../services/scanService';
import { getBordereauForManualScan, uploadManualDocuments, finalizeScanProcess } from '../services/manualScanService';
import { useAuthContext } from '../contexts/AuthContext';
import ScanEntryForm from '../components/ScanEntryForm';

// ── Design tokens (consistent with the system) ───────────────────────────────
const NAV_BG    = '#1e3a5f';
const NAV_TEXT  = '#ffffff';
const BORDER    = '#e0e7ef';
const ROW_ODD   = '#f4f7fb';
const ROW_EVEN  = '#ffffff';
const ROW_HOV   = '#e8f0fe';

// Status tokens: [bg, text, border, label]
const SCAN_STATUS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A_SCANNER:    { bg: '#fff8e1', text: '#e65100', border: '#ffcc80', label: 'À Scanner' },
  SCAN_EN_COURS:{ bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', label: 'Scan en Cours' },
  SCANNE:       { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7', label: 'Scanné' },
  A_AFFECTER:   { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7', label: 'À Affecter' },
  TRAITE:       { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7', label: 'Traité' },
  EN_COURS:     { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', label: 'En Cours' },
  EN_ATTENTE:   { bg: '#fff8e1', text: '#e65100', border: '#ffcc80', label: 'En Attente' },
  EN_DIFFICULTE:{ bg: '#fdecea', text: '#b71c1c', border: '#ef9a9a', label: 'En Difficulté' },
};

// Document type config
const DOC_TYPES = [
  { type: 'BULLETIN_SOIN',           label: 'Bulletins de Soins',       icon: '🏥', color: '#10b981' },
  { type: 'COMPLEMENT_INFORMATION',  label: 'Compléments Info',          icon: '📋', color: '#3b82f6' },
  { type: 'ADHESION',                label: 'Adhésions',                 icon: '👥', color: '#8b5cf6' },
  { type: 'RECLAMATION',             label: 'Réclamations',              icon: '⚠️', color: '#f59e0b' },
  { type: 'CONTRAT_AVENANT',         label: 'Contrats/Avenants',         icon: '📄', color: '#6b7280' },
  { type: 'DEMANDE_RESILIATION',     label: 'Demandes Résiliation',      icon: '❌', color: '#ef4444' },
  { type: 'CONVENTION_TIERS_PAYANT', label: 'Conventions Tiers',         icon: '🤝', color: '#06b6d4' },
];

const NO_SLA_TYPES = ['CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'];

// ── Shared sub-components ────────────────────────────────────────────────────

/** Inline status pill matching the 3-color design system */
const StatusPill: React.FC<{ statut: string }> = ({ statut }) => {
  const s = SCAN_STATUS[statut] ?? { bg: '#f4f7fb', text: '#546e7a', border: BORDER, label: statut };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25, py: 0.25,
        borderRadius: '8px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        bgcolor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </Box>
  );
};

/** Stat card with left accent border + icon circle */
const StatCard: React.FC<{
  label: string;
  value: number | string;
  accent: string;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, accent, icon, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      border: '1px solid rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${accent}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow .2s, transform .2s',
      '&:hover': onClick
        ? { boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transform: 'translateY(-2px)' }
        : { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    }}
  >
    <CardContent sx={{ p: '20px !important' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography
            variant="caption"
            sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
          >
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: NAV_BG, mt: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: '50%',
            bgcolor: `${accent}17`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/** Standard dialog title bar with navy background */
const NavyDialogTitle: React.FC<{ children: React.ReactNode; chip?: React.ReactNode }> = ({ children, chip }) => (
  <DialogTitle
    sx={{
      bgcolor: NAV_BG, color: NAV_TEXT,
      fontWeight: 700, fontSize: '0.95rem',
      display: 'flex', alignItems: 'center', gap: 1,
    }}
  >
    {children}
    {chip}
  </DialogTitle>
);

/** Table header cell */
const TH: React.FC<{ children: React.ReactNode; last?: boolean }> = ({ children, last }) => (
  <TableCell
    sx={{
      bgcolor: NAV_BG,
      color: NAV_TEXT,
      fontSize: '0.70rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      py: 1.25,
      whiteSpace: 'nowrap',
      borderRight: last ? 'none' : '1px solid rgba(255,255,255,0.10)',
    }}
  >
    {children}
  </TableCell>
);

/** Zebra-striped data row */
const TR: React.FC<{ idx: number; children: React.ReactNode }> = ({ idx, children }) => (
  <TableRow
    sx={{
      bgcolor: idx % 2 === 0 ? ROW_EVEN : ROW_ODD,
      '&:hover': { bgcolor: ROW_HOV },
      transition: 'background-color .15s',
    }}
  >
    {children}
  </TableRow>
);

/** Standard data cell */
const TD: React.FC<{ children: React.ReactNode; last?: boolean; center?: boolean }> = ({ children, last, center }) => (
  <TableCell
    sx={{
      fontSize: '0.81rem',
      borderRight: last ? 'none' : `1px solid ${BORDER}`,
      textAlign: center ? 'center' : 'left',
    }}
  >
    {children}
  </TableCell>
);

/** Shared styled scrollable TableContainer */
const StyledTableContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TableContainer
    sx={{
      overflowX: 'auto',
      borderRadius: 1.5,
      border: `1px solid ${BORDER}`,
      '&::-webkit-scrollbar': { height: 6 },
      '&::-webkit-scrollbar-thumb': { bgcolor: '#cfd8dc', borderRadius: 3 },
    }}
  >
    {children}
  </TableContainer>
);

/** SLA dot indicator */
const SlaDot: React.FC<{ dateReception: string }> = ({ dateReception }) => {
  const daysElapsed = Math.floor(
    (Date.now() - new Date(dateReception).getTime()) / 86400000
  );
  const color   = daysElapsed >= 5 ? '#b71c1c' : daysElapsed >= 2 ? '#e65100' : '#1b6b3a';
  const bgcolor = daysElapsed >= 5 ? '#fdecea' : daysElapsed >= 2 ? '#fff8e1' : '#e6f4ed';
  const label   = daysElapsed >= 5 ? 'CRITIQUE' : daysElapsed >= 2 ? 'ATTENTION' : 'OK';

  return (
    <Tooltip title={`${daysElapsed} j écoulés — SLA ${label}`}>
      <Box
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          px: 1, py: 0.25, borderRadius: '8px', bgcolor, cursor: 'default',
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color }}>{daysElapsed}j</Typography>
      </Box>
    </Tooltip>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const ScanDashboard: React.FC = () => {
  const { user } = useAuthContext();

  const [scanStatus, setScanStatus]             = useState<any>(null);
  const [scanActivity, setScanActivity]         = useState<any[]>([]);
  const [scanQueue, setScanQueue]               = useState<any[]>([]);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [overloadStatus, setOverloadStatus]     = useState<any>(null);
  const [chartData, setChartData]               = useState<any[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [activeDialog, setActiveDialog]         = useState<string | null>(null);
  const [initializingScanner, setInitializingScanner] = useState(false);
  const [processing, setProcessing]             = useState<string | null>(null);
  const [manualScanBordereaux, setManualScanBordereaux] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles]     = useState(false);
  const [selectedFiles, setSelectedFiles]       = useState<File[]>([]);
  const [autoAssigning, setAutoAssigning]       = useState<string | null>(null);
  const [documentStats, setDocumentStats]       = useState<any>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<{ type: string; label: string; icon: string } | null>(null);
  const [selectedProgressionType, setSelectedProgressionType] = useState<string | null>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);
  const [historyData, setHistoryData]           = useState<any[]>([]);
  const [showEntryForm, setShowEntryForm]       = useState(false);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDashboard();
    loadAvailableClients();
    const interval = setInterval(() => {
      if (activeDialog !== 'scan-history') loadDashboard();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeDialog]);

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadAvailableClients = async () => {
    try {
      const { LocalAPI } = await import('../services/axios');
      const res = await LocalAPI.get('/clients');
      setAvailableClients(res.data || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadDashboard = async () => {
    try {
      const [
        statusData, activityData, queueData, overloadData,
        chartDataRes, manualScanData, allBordereaux, docStatsData,
      ] = await Promise.all([
        fetchScanStatus(),
        fetchScanActivity(),
        getScanQueue(),
        checkScanOverload(),
        getScanActivityChart(),
        getBordereauForManualScan(),
        import('../services/axios').then(({ LocalAPI }) =>
          LocalAPI.get('/bordereaux').then(r => r.data)
        ),
        import('../services/axios').then(({ LocalAPI }) =>
          LocalAPI.get('/scan/document-stats-by-type').then(r => {
            const data = r.data;
            const statusBreakdown: Record<string, Record<string, number>> = {};
            Object.keys(data).forEach(type => {
              const d = data[type];
              statusBreakdown[type] = {
                UPLOADED: d.aScanner || 0,
                EN_COURS: d.enCours  || 0,
                TRAITE:   d.scanne   || 0,
              };
            });
            return { ...data, statusBreakdown };
          }).catch(() => ({ statusBreakdown: {} }))
        ),
      ]);

      setScanStatus(statusData);
      setScanActivity(activityData);

      // Deduplicate scan queue
      const relevant = (allBordereaux || []).filter((b: any) =>
        ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut)
      );
      const combined = [...queueData, ...relevant];
      const unique = Array.from(new Map(combined.map((b: any) => [b.id, b])).values());
      setScanQueue(unique);

      setOverloadStatus(overloadData);
      setChartData(chartDataRes);
      setManualScanBordereaux(manualScanData);
      setDocumentStats(docStatsData);
    } catch (err) {
      console.error('Failed to load scan dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInitializeScanner = async () => {
    setInitializingScanner(true);
    try {
      await initializeScanners();
      await loadDashboard();
    } catch (err) {
      console.error('Scanner initialization failed:', err);
    } finally {
      setInitializingScanner(false);
    }
  };

  const handleProcessQueue = async () => {
    setLoading(true);
    try {
      const result = await processScanQueue();
      if (result.processedCount > 0) {
        alert(`✅ Traitement de la file terminé avec succès!\n\n📊 Résultats:\n• ${result.processedCount} bordereau(x) traité(s)\n• Statut: En cours de scan\n\n🔄 Le tableau va se rafraîchir automatiquement...`);
      } else {
        alert(`ℹ️ Traitement de la file terminé\n\n📊 Résultats:\n• Aucun nouveau bordereau à traiter\n• File d'attente vide ou déjà en cours\n\n✅ Système à jour`);
      }
      setTimeout(loadDashboard, 2000);
    } catch (err: any) {
      console.error('Queue processing failed:', err);
      alert(`❌ Erreur lors du traitement de la file\n\n🔍 Détails:\n${err.response?.data?.message || err.message || 'Erreur inconnue'}\n\n💡 Veuillez réessayer ou contacter l'administrateur`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaperStreamImport = async () => {
    setLoading(true);
    try {
      const result = await triggerPaperStreamImport();
      if (result.importedCount > 0) {
        const filesList = result.files?.map((f: any) => `• ${f.fileName}`).join('\n') || '';
        alert(`✅ Import PaperStream terminé avec succès!\n\n📊 Résultats:\n• ${result.importedCount} fichier(s) importé(s)\n\n📄 Fichiers traités:\n${filesList}\n\n🔄 Actualisation du tableau...`);
      } else {
        alert(`ℹ️ Import PaperStream terminé\n\n📊 Résultats:\n• Aucun nouveau fichier détecté\n• Dossier d'entrée vide\n\n💡 Placez des fichiers dans le dossier 'paperstream-input' pour les traiter`);
      }
      setTimeout(loadDashboard, 1000);
    } catch (err: any) {
      console.error('PaperStream import failed:', err);
      alert(`❌ Erreur lors de l'import PaperStream\n\n🔍 Détails:\n${err.response?.data?.message || err.message || 'Erreur inconnue'}\n\n💡 Vérifiez que le dossier 'paperstream-input' existe et est accessible`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = async (bordereauId: string) => {
    setProcessing(bordereauId);
    try {
      await startScanning(bordereauId);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to start scanning:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewBordereau = async (bordereauId: string) => {
    try {
      const bordereau = await getBordereauForScan(bordereauId);
      setSelectedBordereau(bordereau);
      setActiveDialog('bordereau-details');
    } catch (err) {
      console.error('Failed to load bordereau:', err);
    }
  };

  const handleValidateScanning = async (bordereauId: string) => {
    try {
      await completeScanWithWorkflow(bordereauId);
      setActiveDialog(null);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to validate scanning:', err);
    }
  };

  const handleRejectedBordereauClick = async (bordereauId: string) => {
    try {
      const bordereau = await getBordereauForScan(bordereauId);
      setSelectedBordereau(bordereau);
      setActiveDialog('document-correction-details');
    } catch (err) {
      console.error('Failed to load rejected bordereau:', err);
      alert('❌ Erreur lors du chargement du bordereau rejeté. Veuillez réessayer.');
    }
  };

  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { LocalAPI } = await import('../services/axios');
      const allBordereauxRes = await LocalAPI.get('/bordereaux');
      const allBordereaux = Array.isArray(allBordereauxRes.data)
        ? allBordereauxRes.data
        : allBordereauxRes.data.items || [];

      const enhanced = await Promise.all(
        allBordereaux.map(async (b: any) => {
          try {
            const [historyRes, detailsRes] = await Promise.all([
              LocalAPI.get(`/scan/bordereau/${b.id}/history`).catch(() => ({ data: null })),
              LocalAPI.get(`/bordereaux/${b.id}`, { params: { include: 'documents' } }),
            ]);
            return { ...b, enhancedHistory: historyRes.data, documents: detailsRes.data.documents || [] };
          } catch (err) {
            console.error(`Error loading ${b.reference}:`, err);
            return { ...b, enhancedHistory: null, documents: [] };
          }
        })
      );
      setHistoryData(enhanced);
      setActiveDialog('scan-history');
    } catch (err) {
      console.error('Failed to load enhanced history:', err);
      alert("❌ Erreur lors du chargement de l'historique");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'SCAN_STARTED':
      case 'MANUAL_SCAN_STARTED':
      case 'SCAN_IN_PROGRESS':   return <PlayArrow sx={{ color: '#2196f3' }} />;
      case 'SCAN_COMPLETED':
      case 'MANUAL_SCAN_COMPLETED':
      case 'DOCUMENT_READY':     return <CheckCircle sx={{ color: '#1b6b3a' }} />;
      case 'SCAN_ERROR':         return <ErrorIcon sx={{ color: '#b71c1c' }} />;
      case 'OCR_PROCESSED':
      case 'OCR_COMPLETED':      return <TextFields sx={{ color: '#0d47a1' }} />;
      default:                   return <Scanner sx={{ color: '#546e7a' }} />;
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const queueToScan    = scanQueue.filter(b => b.statut === 'A_SCANNER');
  const queueInScan    = scanQueue.filter(b => b.statut === 'SCAN_EN_COURS');
  const queueDone      = scanQueue.filter(b => ['SCANNE', 'A_AFFECTER'].includes(b.statut));
  const queueActive    = scanQueue.filter(b => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut));
  const avgProgression = queueActive.length > 0
    ? Math.round((queueDone.length / queueActive.length) * 100)
    : 0;

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <LinearProgress sx={{ width: '40%', borderRadius: 4, height: 6 }} />
        <Typography variant="body2" sx={{ color: '#546e7a' }}>
          Chargement du service SCAN…
        </Typography>
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f4f7fb', minHeight: '100vh' }}>

      {/* Workflow handlers (no UI, logic only) */}
      <ScanRejectionHandler onRejectedBordereauClick={handleRejectedBordereauClick} />
      <ReturnedBordereauHandler onCorrectionComplete={loadDashboard} />

      {/* ── Page header ── */}
      <Box mb={3}>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ color: NAV_BG, fontSize: { xs: '1.4rem', sm: '1.8rem' }, lineHeight: 1.2 }}
            >
              Service SCAN
            </Typography>
            <Typography variant="body2" sx={{ color: '#546e7a', mt: 0.5 }}>
              Tableau de bord — numérisation et gestion des bordereaux
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box
            display="flex"
            flexWrap="wrap"
            gap={1}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {[
              { label: 'Scanner',       icon: <Scanner sx={{ fontSize: 16 }} />,        dialog: 'scanner',  variant: 'outlined' as const },
              { label: 'Qualité',       icon: <AutoFixHigh sx={{ fontSize: 16 }} />,   dialog: 'quality',  variant: 'outlined' as const },
              { label: 'OCR',           icon: <TextFields sx={{ fontSize: 16 }} />,    dialog: 'ocr',      variant: 'outlined' as const },
            ].map(({ label, icon, dialog, variant }) => (
              <Button
                key={label}
                variant={variant}
                startIcon={icon}
                size="small"
                onClick={() => setActiveDialog(dialog)}
                sx={{
                  fontSize: '0.78rem',
                  borderColor: NAV_BG,
                  color: NAV_BG,
                  '&:hover': { bgcolor: NAV_BG, color: '#fff' },
                  flex: { xs: '1 1 auto', sm: '0 0 auto' },
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="contained"
              startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
              size="small"
              onClick={handleProcessQueue}
              sx={{
                fontSize: '0.78rem',
                bgcolor: '#1b6b3a',
                '&:hover': { bgcolor: '#145530' },
                flex: { xs: '1 1 auto', sm: '0 0 auto' },
              }}
            >
              Traiter File
            </Button>
            <Button
              variant="outlined"
              startIcon={<Scanner sx={{ fontSize: 16 }} />}
              size="small"
              onClick={handlePaperStreamImport}
              sx={{
                fontSize: '0.78rem',
                borderColor: NAV_BG,
                color: NAV_BG,
                '&:hover': { bgcolor: NAV_BG, color: '#fff' },
                flex: { xs: '1 1 auto', sm: '0 0 auto' },
              }}
            >
              Import PaperStream
            </Button>
            <Button
              variant="contained"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              size="small"
              onClick={() => setShowEntryForm(true)}
              sx={{
                fontSize: '0.78rem',
                bgcolor: NAV_BG,
                '&:hover': { bgcolor: '#16304f' },
                flex: { xs: '1 1 auto', sm: '0 0 auto' },
              }}
            >
              Nouvelle Entrée
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Status alerts ── */}
      {overloadStatus?.overloaded && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Service SCAN surchargé
          </Typography>
          <Typography variant="body2">
            {overloadStatus.totalWorkload} éléments en file (seuil&nbsp;: {overloadStatus.threshold})
            {overloadStatus.slaAtRisk > 0 && ` — ${overloadStatus.slaAtRisk} bordereau(x) à risque SLA`}
          </Typography>
        </Alert>
      )}
      {(scanStatus?.errorCount ?? 0) > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {scanStatus.errorCount} document(s) en erreur nécessitent une attention
        </Alert>
      )}

      {/* ── Progression KPIs ── */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG }}>
            Progression des Bordereaux
          </Typography>
          <Box
            sx={{
              px: 1.25, py: 0.25,
              bgcolor: '#e3f2fd', color: '#0d47a1',
              border: '1px solid #90caf9',
              borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
            }}
          >
            TEMPS RÉEL
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Non scannés"
              value={queueToScan.length}
              accent="#e65100"
              icon={<Warning sx={{ fontSize: 22 }} />}
              onClick={() => { setSelectedProgressionType('A_SCANNER'); setActiveDialog('progression-popup'); }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Scan en cours"
              value={queueInScan.length}
              accent="#2196f3"
              icon={<Scanner sx={{ fontSize: 22 }} />}
              onClick={() => { setSelectedProgressionType('SCAN_EN_COURS'); setActiveDialog('progression-popup'); }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '4px solid #1b6b3a',
                transition: 'box-shadow .2s',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
              }}
            >
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box flex={1}>
                    <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      Scans finalisés
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: NAV_BG, mt: 0.5, lineHeight: 1, mb: 1.5 }}>
                      {queueDone.length}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<History sx={{ fontSize: 14 }} />}
                      disabled={loadingHistory}
                      onClick={handleLoadHistory}
                      sx={{
                        fontSize: '0.72rem',
                        borderColor: '#1b6b3a',
                        color: '#1b6b3a',
                        '&:hover': { bgcolor: '#1b6b3a', color: '#fff' },
                      }}
                    >
                      {loadingHistory ? 'Chargement…' : 'Historique'}
                    </Button>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#1b6b3a17', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1b6b3a' }}>
                    <CheckCircle sx={{ fontSize: 22 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '4px solid #9c27b0',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                transition: 'box-shadow .2s',
              }}
            >
              <CardContent sx={{ p: '20px !important' }}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Progression moyenne
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: NAV_BG, mt: 0.5, mb: 1, lineHeight: 1 }}>
                  {avgProgression}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={avgProgression}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: '#e9d5ff',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: avgProgression >= 80 ? '#1b6b3a' : avgProgression >= 50 ? '#e65100' : '#b71c1c',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Document type statistics ── */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG }}>
            Statistiques par Type de Document
          </Typography>
          <Box sx={{ px: 1.25, py: 0.25, bgcolor: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            NOUVEAU
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          {DOC_TYPES.map((docType) => {
            const typeData  = documentStats?.[docType.type];
            const count     = typeof typeData === 'object' ? typeData.total || 0 : 0;
            const sb        = documentStats?.statusBreakdown?.[docType.type] || {};
            const uploaded  = typeData?.aScanner  || sb.UPLOADED || 0;
            const enCours   = typeData?.enCours   || sb.EN_COURS || 0;
            const traite    = typeData?.scanne    || sb.TRAITE   || 0;
            const progression = typeData?.progression
              || (count > 0 ? Math.round(((enCours + traite) / count) * 100) : 0);
            const noSla = NO_SLA_TYPES.includes(docType.type);

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={docType.type}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${BORDER}`,
                    borderTop: `3px solid ${docType.color}`,
                    borderRadius: 2,
                    position: 'relative',
                    minHeight: 220,
                    transition: 'box-shadow .2s, transform .2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px -8px rgba(0,0,0,0.15)' },
                  }}
                >
                  {noSla && (
                    <Box
                      sx={{
                        position: 'absolute', top: 8, right: 8,
                        px: 0.75, py: 0.2,
                        bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80',
                        borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}
                    >
                      No SLA
                    </Box>
                  )}
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Box textAlign="center" mb={1.5}>
                      <Typography sx={{ fontSize: '1.8rem', mb: 0.5 }}>{docType.icon}</Typography>
                      <Typography variant="h4" fontWeight={800} sx={{ color: docType.color, lineHeight: 1 }}>
                        {count}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#546e7a', fontSize: '0.78rem' }}>
                        {docType.label}
                      </Typography>
                    </Box>

                    <Box sx={{ fontSize: '0.75rem', color: '#546e7a', mb: 1.5 }}>
                      {[
                        { label: 'À scanner', value: uploaded, color: '#e65100' },
                        { label: 'En cours',  value: enCours,  color: '#0d47a1' },
                        { label: 'Scannés',   value: traite,   color: '#1b6b3a' },
                      ].map(({ label, value, color }) => (
                        <Box key={label} display="flex" justifyContent="space-between" mb={0.4}>
                          <Typography variant="caption" sx={{ color: '#546e7a' }}>{label}</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color }}>{value}</Typography>
                        </Box>
                      ))}

                      <Box mt={1}>
                        <Box display="flex" justifyContent="space-between" mb={0.4}>
                          <Typography variant="caption" sx={{ color: '#546e7a' }}>Progression</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: NAV_BG }}>{progression}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progression}
                          sx={{
                            height: 5, borderRadius: 3,
                            bgcolor: '#e0e7ef',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: progression >= 80 ? '#1b6b3a' : progression >= 50 ? '#e65100' : '#b71c1c',
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedDocumentType({ type: docType.type, label: docType.label, icon: docType.icon })}
                      sx={{
                        fontSize: '0.7rem',
                        borderColor: docType.color,
                        color: docType.color,
                        '&:hover': { bgcolor: docType.color, color: '#fff' },
                        width: '100%',
                      }}
                    >
                      Voir Documents
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* ── KPI cards ── */}
      <Grid container spacing={2.5} mb={3}>
        {[
          { label: 'Scanners Disponibles', value: scanStatus?.scannersAvailable ?? 0, accent: '#2196f3',  icon: <Scanner sx={{ fontSize: 22 }} /> },
          { label: "File d'Attente",       value: scanStatus?.processingQueue    ?? 0, accent: '#e65100', icon: <Warning sx={{ fontSize: 22 }} /> },
          { label: "Traités Aujourd'hui",  value: scanStatus?.processedToday     ?? 0, accent: '#1b6b3a', icon: <CheckCircle sx={{ fontSize: 22 }} /> },
          { label: 'Erreurs',              value: scanStatus?.errorCount         ?? 0, accent: '#b71c1c', icon: <ErrorIcon sx={{ fontSize: 22 }} /> },
        ].map(({ label, value, accent, icon }) => (
          <Grid item xs={12} sm={6} md={3} key={label}>
            <StatCard label={label} value={value} accent={accent} icon={icon} />
          </Grid>
        ))}
      </Grid>

      {/* ── Folder monitor + Chart ── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG, mb: 2 }}>
              Surveillance des Dossiers
            </Typography>
            <FolderMonitor onFileProcessed={loadDashboard} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG }}>
                Activité de Scan
              </Typography>
              <Box
                sx={{
                  px: 1.25, py: 0.25,
                  bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9',
                  borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                }}
              >
                {chartData.reduce((s, d) => s + d.count, 0)} activités / 24h
              </Box>
            </Box>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v) => `${new Date(v).getHours()}h`}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11, fill: '#546e7a' }}
                  />
                  <YAxis
                    label={{ value: 'Activités', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#546e7a' }}
                    tick={{ fontSize: 11, fill: '#546e7a' }}
                  />
                  <RechartsTooltip
                    labelFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.toLocaleDateString('fr-FR')} à ${d.getHours()}h`;
                    }}
                    formatter={(v: any) => [`${v} activité(s)`, 'Nombre']}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.8rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={NAV_BG}
                    strokeWidth={2.5}
                    dot={{ fill: NAV_BG, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: NAV_BG, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box
                display="flex" alignItems="center" justifyContent="center"
                height={280} bgcolor={ROW_ODD} borderRadius={1.5}
              >
                <Typography variant="body2" sx={{ color: '#546e7a' }}>
                  Aucune activité dans les dernières 24h
                </Typography>
              </Box>
            )}

            <Box mt={1.5} display="flex" justifyContent="space-between">
              <Typography variant="caption" sx={{ color: '#546e7a' }}>
                Mise à jour : {new Date().toLocaleTimeString('fr-FR')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#546e7a' }}>
                Pic : {chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 0} activités/h
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Scan management table ── */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG }}>
            Gestion Scan Bordereaux
          </Typography>
          <Box display="flex" gap={1}>
            <Box component="span" sx={{ px: 1.25, py: 0.25, bgcolor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
              {queueToScan.length} à scanner
            </Box>
            <Box component="span" sx={{ px: 1.25, py: 0.25, bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
              {queueInScan.length} en cours
            </Box>
          </Box>
        </Box>

        <StyledTableContainer>
          <Table sx={{ minWidth: 620 }} size="small">
            <TableHead>
              <TableRow>
                <TH>SLA</TH>
                <TH>Référence</TH>
                <TH>Client</TH>
                <TH>Statut</TH>
                <TH last>Actions</TH>
              </TableRow>
            </TableHead>
            <TableBody>
              {scanQueue
                .filter(b => b.statut === 'A_SCANNER' || b.statut === 'SCAN_EN_COURS')
                .map((bordereau: any, idx: number) => (
                  <TR key={bordereau.id} idx={idx}>
                    <TD>
                      <SlaDot dateReception={bordereau.dateReception} />
                    </TD>
                    <TD>
                      <Typography variant="body2" fontWeight={700} sx={{ color: NAV_BG }}>
                        {bordereau.reference}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#546e7a' }}>
                        {new Date(bordereau.createdAt).toLocaleDateString('fr-FR')}
                      </Typography>
                    </TD>
                    <TD>
                      <Typography variant="body2">{bordereau.client?.name || 'N/A'}</Typography>
                    </TD>
                    <TD>
                      <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
                        <StatusPill statut={bordereau.statut} />
                        {bordereau.statut === 'SCAN_EN_COURS' && (
                          <Box
                            component="span"
                            sx={{
                              px: 1, py: 0.2, borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700,
                              bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9',
                            }}
                          >
                            Scan Multiple
                          </Box>
                        )}
                      </Box>
                    </TD>
                    <TD last>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Scanner sx={{ fontSize: 14 }} />}
                          onClick={async () => {
                            if (bordereau.statut === 'SCAN_EN_COURS') {
                              try {
                                const { validateMultipleScanWorkflow } = await import('../services/scanService');
                                const validation = await validateMultipleScanWorkflow(bordereau.id);
                                if (!validation.canScanMultiple) {
                                  const el = document.createElement('div');
                                  el.innerHTML = `
                                    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                                      <div style="background:#fff;padding:24px;border-radius:8px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
                                        <h3 style="margin:0 0 12px;color:#b71c1c;">Scan multiple non autorisé</h3>
                                        <p style="margin:8px 0;color:#666;">Scans actuels : ${validation.currentScanCount}/${validation.maxScansAllowed}</p>
                                        <p style="margin:8px 0;color:#666;">${validation.message}</p>
                                        <button onclick="this.closest('div[style]').remove()" style="background:#b71c1c;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:12px;">Fermer</button>
                                      </div>
                                    </div>`;
                                  document.body.appendChild(el);
                                  return;
                                }
                                const el2 = document.createElement('div');
                                el2.innerHTML = `
                                  <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                                    <div style="background:#fff;padding:24px;border-radius:8px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
                                      <h3 style="margin:0 0 12px;color:#1b6b3a;">Scan supplémentaire autorisé</h3>
                                      <p style="margin:8px 0;color:#666;">Scan #${validation.currentScanCount + 1}/${validation.maxScansAllowed}</p>
                                      <p style="margin:8px 0;color:#666;">Vous pouvez ajouter des documents</p>
                                      <button onclick="this.closest('div[style]').remove()" style="background:#1b6b3a;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:12px;">Continuer</button>
                                    </div>
                                  </div>`;
                                document.body.appendChild(el2);
                              } catch (err) {
                                console.warn('Validation failed, proceeding:', err);
                              }
                            }
                            setSelectedBordereau(bordereau);
                            setActiveDialog('manual-scan-direct');
                          }}
                          sx={{
                            fontSize: '0.72rem',
                            bgcolor: '#8b5cf6',
                            '&:hover': { bgcolor: '#7c3aed' },
                          }}
                        >
                          Scan Manuel
                          {bordereau.statut === 'SCAN_EN_COURS' && ' +'}
                        </Button>
                        <Tooltip title="Voir les détails">
                          <IconButton
                            size="small"
                            onClick={() => handleViewBordereau(bordereau.id)}
                            sx={{ color: '#2196f3', '&:hover': { bgcolor: '#e3f2fd' } }}
                          >
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TD>
                  </TR>
                ))}

              {scanQueue.filter(b => b.statut === 'A_SCANNER' || b.statut === 'SCAN_EN_COURS').length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body2" sx={{ color: '#546e7a' }}>
                      Aucun bordereau en attente de scan
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </Paper>

      {/* ════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════ */}

      {/* Scanner control */}
      <Dialog open={activeDialog === 'scanner'} onClose={() => setActiveDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <NavyDialogTitle>Contrôle Scanner</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}><ScannerControl onScanComplete={loadDashboard} /></DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Quality */}
      <Dialog open={activeDialog === 'quality'} onClose={() => setActiveDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <NavyDialogTitle>Validation Qualité</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}><QualityValidator /></DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* OCR */}
      <Dialog open={activeDialog === 'ocr'} onClose={() => setActiveDialog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <NavyDialogTitle>Correction OCR</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}><OCRCorrectionInterface /></DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Manual scan (generic) */}
      <Dialog open={activeDialog === 'manual-scan'} onClose={() => setActiveDialog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2, height: '90vh' } }}>
        <NavyDialogTitle>Numérisation Manuelle</NavyDialogTitle>
        <DialogContent sx={{ p: 0 }}><ManualScanInterface /></DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Direct manual scan for a specific bordereau */}
      <Dialog
        open={activeDialog === 'manual-scan-direct'}
        onClose={() => { setActiveDialog(null); setSelectedBordereau(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle
          chip={
            selectedBordereau?.statut === 'SCAN_EN_COURS'
              ? <Box component="span" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>Scan supplémentaire</Box>
              : undefined
          }
        >
          Scan Manuel — {selectedBordereau?.reference}
        </NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedBordereau && (
            <DirectManualScanInterface
              bordereau={selectedBordereau}
              onComplete={() => {
                setActiveDialog(null);
                setSelectedBordereau(null);
                loadDashboard();
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => { setActiveDialog(null); setSelectedBordereau(null); }} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Bordereau details */}
      <Dialog
        open={activeDialog === 'bordereau-details'}
        onClose={() => setActiveDialog(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle>Détails Bordereau — {selectedBordereau?.reference}</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedBordereau && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Informations Client
                </Typography>
                {[
                  { label: 'Client',             value: selectedBordereau.client?.name },
                  { label: 'Référence Contrat',  value: selectedBordereau.contract?.clientName || 'Non assigné' },
                  { label: 'Type de Bordereau',  value: selectedBordereau.type || 'BULLETIN_SOIN' },
                  { label: 'Délai Règlement',    value: `${selectedBordereau.contract?.delaiReglement || selectedBordereau.delaiReglement} jours` },
                  {
                    label: 'Chargé de Compte',
                    value: selectedBordereau.contract?.teamLeader?.fullName
                      || selectedBordereau.contract?.assignedManager?.fullName
                      || selectedBordereau.client?.gestionnaires?.find((g: any) => g.role === 'CHEF_EQUIPE')?.fullName
                      || 'Non assigné',
                  },
                ].map(({ label, value }) => (
                  <Box key={label} mt={1.5}>
                    <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: NAV_BG, fontWeight: 500 }}>{value}</Typography>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Documents ({selectedBordereau.documents?.length || 0})
                </Typography>
                {selectedBordereau.documents?.length > 0
                  ? selectedBordereau.documents.map((doc: any) => (
                    <Box key={doc.id} display="flex" alignItems="center" gap={1} mt={1.5}>
                      <StatusPill statut={doc.status} />
                      <Typography variant="body2" sx={{ flex: 1, color: NAV_BG }}>{doc.name}</Typography>
                      <Box component="span" sx={{ px: 1, py: 0.2, bgcolor: '#f4f7fb', color: '#546e7a', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600 }}>{doc.type}</Box>
                    </Box>
                  ))
                  : <Typography variant="body2" sx={{ color: '#546e7a', mt: 1 }}>Aucun document scanné</Typography>
                }
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Historique
                </Typography>
                {selectedBordereau.traitementHistory?.length > 0
                  ? selectedBordereau.traitementHistory.map((h: any, i: number) => (
                    <Box key={i} display="flex" gap={1.5} alignItems="flex-start" mt={1.5}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: NAV_BG, mt: 0.6, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: NAV_BG }}>{h.action}</Typography>
                        <Typography variant="caption" sx={{ color: '#546e7a' }}>{new Date(h.createdAt).toLocaleString('fr-FR')}</Typography>
                      </Box>
                    </Box>
                  ))
                  : <Typography variant="body2" sx={{ color: '#546e7a', mt: 1 }}>Aucun historique disponible</Typography>
                }
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          {['SCAN_TEAM', 'SUPER_ADMIN'].includes(user?.role || '') && (
            <Button variant="outlined" onClick={() => setActiveDialog('edit-bordereau-details')} sx={{ borderColor: NAV_BG, color: NAV_BG, '&:hover': { bgcolor: NAV_BG, color: '#fff' } }}>
              Modifier
            </Button>
          )}
          {selectedBordereau?.statut === 'SCAN_EN_COURS' && (
            <Button variant="contained" onClick={() => handleValidateScanning(selectedBordereau.id)} sx={{ bgcolor: '#1b6b3a', '&:hover': { bgcolor: '#145530' } }}>
              Valider Scan
            </Button>
          )}
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Edit bordereau */}
      <Dialog
        open={activeDialog === 'edit-bordereau-details'}
        onClose={() => setActiveDialog(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle>Modifier Bordereau — {selectedBordereau?.reference}</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedBordereau && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small"
                  label="Référence BO"
                  value={selectedBordereau.reference}
                  onChange={(e) => setSelectedBordereau({ ...selectedBordereau, reference: e.target.value })}
                  helperText="Modifiable en cas d'erreur du Bureau d'Ordre"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type de Bordereau</InputLabel>
                  <Select
                    value={selectedBordereau.type || 'BULLETIN_SOIN'}
                    label="Type de Bordereau"
                    onChange={(e) => setSelectedBordereau({ ...selectedBordereau, type: e.target.value })}
                  >
                    {DOC_TYPES.map(d => (
                      <MenuItem key={d.type} value={d.type}>{d.icon} {d.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Client</InputLabel>
                  <Select
                    value={selectedBordereau.clientId || ''}
                    label="Client"
                    onChange={(e) => setSelectedBordereau({ ...selectedBordereau, clientId: e.target.value })}
                  >
                    {availableClients.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" sx={{ color: '#546e7a', mt: 0.5, px: 1.75 }}>
                    Modifiable en cas d'erreur du Bureau d'Ordre
                  </Typography>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" type="date"
                  label="Date de Réception"
                  value={selectedBordereau.dateReception ? new Date(selectedBordereau.dateReception).toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedBordereau({ ...selectedBordereau, dateReception: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Modifiable en cas d'erreur du Bureau d'Ordre"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog('bordereau-details')} sx={{ color: '#546e7a' }}>Annuler</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: NAV_BG, '&:hover': { bgcolor: '#16304f' } }}
            onClick={async () => {
              try {
                const { LocalAPI } = await import('../services/axios');
                await LocalAPI.patch(`/scan/bordereau/${selectedBordereau.id}/modify`, {
                  reference: selectedBordereau.reference,
                  clientId: selectedBordereau.clientId,
                  dateReception: selectedBordereau.dateReception,
                });
                const updated = await getBordereauForScan(selectedBordereau.id);
                setSelectedBordereau(updated);
                setActiveDialog('bordereau-details');
                alert('✅ Bordereau modifié avec succès');
                await loadDashboard();
              } catch (err: any) {
                console.error('Update failed:', err);
                alert(`❌ Erreur lors de la modification: ${err.response?.data?.message || err.message}`);
              }
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document type modal */}
      <DocumentTypeModal
        open={!!selectedDocumentType}
        onClose={() => setSelectedDocumentType(null)}
        documentType={selectedDocumentType?.type || ''}
        documentTypeLabel={selectedDocumentType?.label || ''}
        documentTypeIcon={selectedDocumentType?.icon || ''}
      />

      {/* Scan history */}
      <Dialog
        open={activeDialog === 'scan-history'}
        onClose={() => setActiveDialog(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle
          chip={
            <Box component="span" sx={{ ml: 1, px: 1.25, py: 0.25, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
              {historyData.length} bordereaux
            </Box>
          }
        >
          Historique Complet des Scans
        </NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important', p: 0 }}>
          <StyledTableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TH>Référence</TH>
                  <TH>Client</TH>
                  <TH>Date Scan</TH>
                  <TH>Scanné Par</TH>
                  <TH>Documents</TH>
                  <TH>Durée</TH>
                  <TH>Statut</TH>
                  <TH last>Actions</TH>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...historyData]
                  .sort((a, b) =>
                    new Date(b.dateFinScan || b.updatedAt || b.createdAt).getTime() -
                    new Date(a.dateFinScan || a.updatedAt || a.createdAt).getTime()
                  )
                  .map((bordereau: any, idx: number) => {
                    const history  = bordereau.enhancedHistory;
                    const scanUser = history?.timeline?.find((t: any) => t.action === 'SCAN_COMPLETED')?.user || history?.summary?.scanUser;
                    const duration = history?.summary?.totalDuration;
                    const docCount = bordereau.documents?.length || history?.summary?.documentsScanned || 0;
                    return (
                      <TR key={bordereau.id} idx={idx}>
                        <TD>
                          <Typography variant="body2" fontWeight={700} sx={{ color: NAV_BG }}>{bordereau.reference}</Typography>
                        </TD>
                        <TD><Typography variant="body2">{bordereau.client?.name || 'N/A'}</Typography></TD>
                        <TD>
                          <Typography variant="body2">
                            {bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleString('fr-FR') : 'N/A'}
                          </Typography>
                        </TD>
                        <TD>
                          <Typography variant="body2">{scanUser?.fullName || scanUser?.username || 'N/A'}</Typography>
                          {scanUser?.role && (
                            <Typography variant="caption" sx={{ color: '#546e7a' }}>{scanUser.role}</Typography>
                          )}
                        </TD>
                        <TD center>
                          <Box component="span" sx={{ px: 1.25, py: 0.25, bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {docCount} doc(s)
                          </Box>
                        </TD>
                        <TD>
                          <Typography variant="body2">{duration ? `${Math.round(duration)} min` : 'N/A'}</Typography>
                        </TD>
                        <TD><StatusPill statut={bordereau.statut} /></TD>
                        <TD last>
                          <Box display="flex" gap={0.75}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility sx={{ fontSize: 14 }} />}
                              onClick={() => handleViewBordereau(bordereau.id)}
                              sx={{ fontSize: '0.7rem', borderColor: NAV_BG, color: NAV_BG, '&:hover': { bgcolor: NAV_BG, color: '#fff' } }}
                            >
                              Voir
                            </Button>
                            {history && (
                              <Tooltip title="Timeline détaillée">
                                <IconButton
                                  size="small"
                                  onClick={() => { setSelectedBordereau(bordereau); setActiveDialog('detailed-history'); }}
                                  sx={{ color: '#2196f3', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  <History sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TD>
                      </TR>
                    );
                  })
                }
                {historyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" sx={{ color: '#546e7a' }}>
                        {loadingHistory ? 'Chargement…' : "Aucun bordereau dans l'historique"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => setActiveDialog(null)} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Detailed timeline */}
      <Dialog
        open={activeDialog === 'detailed-history'}
        onClose={() => { setActiveDialog('scan-history'); setSelectedBordereau(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle>Timeline — {selectedBordereau?.reference}</NavyDialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedBordereau?.enhancedHistory && (
            <Box>
              <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, bgcolor: ROW_ODD, border: `1px solid ${BORDER}`, borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Résumé
                </Typography>
                <Grid container spacing={2} mt={0.5}>
                  {[
                    { label: 'Documents scannés', value: selectedBordereau.enhancedHistory.summary?.documentsScanned ?? 0 },
                    { label: 'Durée totale', value: selectedBordereau.enhancedHistory.summary?.totalDuration ? `${Math.round(selectedBordereau.enhancedHistory.summary.totalDuration)} min` : 'N/A' },
                    { label: 'Statut SLA', value: selectedBordereau.enhancedHistory.summary?.slaStatus || 'N/A' },
                    { label: 'Impact SLA', value: selectedBordereau.enhancedHistory.summary?.slaImpact || 'N/A' },
                  ].map(({ label, value }) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 600 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color: NAV_BG, fontWeight: 600 }}>{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Timeline des Actions
              </Typography>
              <Box mt={1.5}>
                {selectedBordereau.enhancedHistory.timeline?.map((event: any, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex', gap: 2, alignItems: 'flex-start',
                      pl: 2, py: 1.5, mb: 1,
                      borderLeft: `3px solid ${NAV_BG}`,
                      bgcolor: ROW_ODD, borderRadius: '0 8px 8px 0',
                    }}
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: NAV_BG }}>{event.action}</Typography>
                      <Typography variant="caption" sx={{ color: '#546e7a' }}>
                        {new Date(event.timestamp).toLocaleString('fr-FR')}
                      </Typography>
                      {event.user && (
                        <Typography variant="caption" display="block" sx={{ color: '#2196f3' }}>
                          Par : {event.user.fullName || event.user.username} ({event.user.role})
                        </Typography>
                      )}
                      {event.details && (
                        <Typography variant="caption" display="block" sx={{ color: '#546e7a', mt: 0.5 }}>
                          {event.details}
                        </Typography>
                      )}
                      {event.duration && (
                        <Box component="span" sx={{ display: 'inline-block', mt: 0.5, px: 1, py: 0.2, bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>
                          {Math.round(event.duration)} min
                        </Box>
                      )}
                    </Box>
                    {getActivityIcon(event.action)}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => { setActiveDialog('scan-history'); setSelectedBordereau(null); }} sx={{ color: '#546e7a' }}>
            Retour à l'historique
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document correction details */}
      <Dialog
        open={activeDialog === 'document-correction-details'}
        onClose={() => { setActiveDialog(null); setSelectedBordereau(null); setSelectedDocumentType(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#fff8e1',
            color: '#e65100',
            borderBottom: '2px solid #ffcc80',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          Correction Documents — {selectedBordereau?.reference}
          <Typography variant="body2" sx={{ color: '#546e7a', mt: 0.5, fontWeight: 400 }}>
            Bordereau rejeté par le chef d'équipe — correction requise
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedBordereau && (
            <Box>
              {selectedBordereau.documents?.length > 0 ? (
                <Box mb={3}>
                  <Typography variant="caption" sx={{ color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Documents ({selectedBordereau.documents.length})
                  </Typography>
                  <Paper elevation={0} sx={{ mt: 1.5, border: `1px solid ${BORDER}`, borderRadius: 1.5, overflow: 'hidden' }}>
                    {selectedBordereau.documents.map((doc: any, index: number) => (
                      <Box
                        key={doc.id}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          py: 1.5, px: 2,
                          borderBottom: index < selectedBordereau.documents.length - 1 ? `1px solid ${BORDER}` : 'none',
                          bgcolor: index % 2 === 0 ? ROW_EVEN : ROW_ODD,
                        }}
                      >
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: NAV_BG }}>{doc.name}</Typography>
                          <Box display="flex" gap={0.75} mt={0.5}>
                            <StatusPill statut={doc.status} />
                            <Box component="span" sx={{ px: 1, py: 0.2, bgcolor: '#f4f7fb', color: '#546e7a', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600 }}>{doc.type}</Box>
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AutoFixHigh sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
                            input.onchange = async (e: any) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('documentName', doc.name);
                                const { LocalAPI } = await import('../services/axios');
                                await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/replace-document`, formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                alert('✅ Document remplacé avec succès');
                                const updated = await getBordereauForScan(selectedBordereau.id);
                                setSelectedBordereau(updated);
                                await loadDashboard();
                              } catch (err: any) {
                                alert(`❌ Erreur: ${err.response?.data?.message || err.message}`);
                              }
                            };
                            input.click();
                          }}
                          sx={{ fontSize: '0.72rem', bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' }, ml: 1 }}
                        >
                          Remplacer
                        </Button>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
                  Aucun document trouvé pour ce bordereau
                </Alert>
              )}

              {/* Add missing document */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#e6f4ed', border: '1px solid #a5d6a7', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#1b6b3a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Ajouter un document manquant
                </Typography>
                <Grid container spacing={2} alignItems="center" mt={0.5}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={selectedDocumentType?.type || ''}
                        label="Type de document"
                        onChange={(e) => setSelectedDocumentType({ type: e.target.value, label: e.target.value, icon: '📄' })}
                      >
                        {DOC_TYPES.slice(0, 5).map(d => (
                          <MenuItem key={d.type} value={d.type}>{d.icon} {d.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!selectedDocumentType?.type}
                      onClick={() => {
                        if (!selectedDocumentType?.type) { alert('⚠️ Veuillez sélectionner un type de document'); return; }
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('documentType', selectedDocumentType.type);
                            const { LocalAPI } = await import('../services/axios');
                            await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/add-missing-document`, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            alert('✅ Document ajouté avec succès');
                            const updated = await getBordereauForScan(selectedBordereau.id);
                            setSelectedBordereau(updated);
                            await loadDashboard();
                            setSelectedDocumentType(null);
                          } catch (err: any) {
                            alert(`❌ Erreur: ${err.response?.data?.message || err.message}`);
                          }
                        };
                        input.click();
                      }}
                      sx={{ bgcolor: '#1b6b3a', '&:hover': { bgcolor: '#145530' }, '&:disabled': { bgcolor: '#a5d6a7' } }}
                    >
                      Sélectionner et Ajouter
                    </Button>
                  </Grid>
                  {selectedDocumentType?.type && (
                    <Grid item xs={12}>
                      <Alert severity="success" sx={{ borderRadius: 1.5, fontSize: '0.82rem' }}>
                        Type sélectionné : <strong>{selectedDocumentType.type}</strong> — cliquez sur "Sélectionner et Ajouter" pour choisir le fichier
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: ROW_ODD, borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button
            onClick={() => { setActiveDialog(null); setSelectedBordereau(null); setSelectedDocumentType(null); }}
            sx={{ color: '#546e7a' }}
          >
            Fermer
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#1b6b3a', '&:hover': { bgcolor: '#145530' } }}
            onClick={async () => {
              if (!selectedBordereau) return;
              try {
                const { LocalAPI } = await import('../services/axios');
                await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/complete-corrections`);
                alert('✅ Corrections terminées — Le bordereau est prêt pour re-scan');
                setActiveDialog(null);
                setSelectedBordereau(null);
                setSelectedDocumentType(null);
                await loadDashboard();
              } catch (err: any) {
                alert(`❌ Erreur: ${err.response?.data?.message || err.message}`);
              }
            }}
          >
            Corrections Terminées
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progression popup */}
      <Dialog
        open={activeDialog === 'progression-popup'}
        onClose={() => { setActiveDialog(null); setSelectedProgressionType(null); }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <NavyDialogTitle>
          {selectedProgressionType === 'A_SCANNER'    && 'Bordereaux Non Scannés'}
          {selectedProgressionType === 'SCAN_EN_COURS' && 'Bordereaux Scan en Cours'}
          {selectedProgressionType === 'SCANNE'        && 'Scans Finalisés'}
        </NavyDialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <StyledTableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TH>Référence</TH>
                  <TH>Client</TH>
                  <TH>Statut</TH>
                  <TH last>Actions</TH>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanQueue
                  .filter(b => {
                    if (selectedProgressionType === 'A_SCANNER')    return b.statut === 'A_SCANNER';
                    if (selectedProgressionType === 'SCAN_EN_COURS') return b.statut === 'SCAN_EN_COURS';
                    if (selectedProgressionType === 'SCANNE')        return ['SCANNE', 'A_AFFECTER'].includes(b.statut);
                    return false;
                  })
                  .map((bordereau: any, idx: number) => (
                    <TR key={bordereau.id} idx={idx}>
                      <TD>
                        <Typography variant="body2" fontWeight={700} sx={{ color: NAV_BG }}>{bordereau.reference}</Typography>
                        <Typography variant="caption" sx={{ color: '#546e7a' }}>{new Date(bordereau.createdAt).toLocaleDateString('fr-FR')}</Typography>
                      </TD>
                      <TD><Typography variant="body2">{bordereau.client?.name || 'N/A'}</Typography></TD>
                      <TD>
                        <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
                          <StatusPill statut={bordereau.statut} />
                          {bordereau.statut === 'SCAN_EN_COURS' && (
                            <Box component="span" sx={{ px: 1, py: 0.2, bgcolor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
                              Scan Multiple
                            </Box>
                          )}
                        </Box>
                      </TD>
                      <TD last>
                        <Box display="flex" gap={0.75}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Scanner sx={{ fontSize: 14 }} />}
                            onClick={() => { setSelectedBordereau(bordereau); setActiveDialog('manual-scan-direct'); }}
                            sx={{ fontSize: '0.72rem', bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
                          >
                            Scan Manuel{bordereau.statut === 'SCAN_EN_COURS' && ' +'}
                          </Button>
                          <Tooltip title="Voir les détails">
                            <IconButton size="small" onClick={() => handleViewBordereau(bordereau.id)} sx={{ color: '#2196f3', '&:hover': { bgcolor: '#e3f2fd' } }}>
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TD>
                    </TR>
                  ))
                }
                {scanQueue.filter(b => {
                  if (selectedProgressionType === 'A_SCANNER')    return b.statut === 'A_SCANNER';
                  if (selectedProgressionType === 'SCAN_EN_COURS') return b.statut === 'SCAN_EN_COURS';
                  if (selectedProgressionType === 'SCANNE')        return ['SCANNE', 'A_AFFECTER'].includes(b.statut);
                  return false;
                }).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" sx={{ color: '#546e7a' }}>Aucun bordereau dans cette catégorie</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2 }}>
          <Button onClick={() => { setActiveDialog(null); setSelectedProgressionType(null); }} sx={{ color: '#546e7a' }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Entry form */}
      <ScanEntryForm
        open={showEntryForm}
        onClose={() => setShowEntryForm(false)}
        onSuccess={() => { setShowEntryForm(false); loadDashboard(); }}
      />
    </Box>
  );
};

export default ScanDashboard;