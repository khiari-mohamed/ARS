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
  MenuItem
} from '@mui/material';
import {
  Scanner,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Settings,
  PlayArrow,
  Stop,
  Visibility,
  AutoFixHigh, 
  TextFields
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
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
import { fetchScanStatus, fetchScanActivity, initializeScanners, processScanQueue, triggerPaperStreamImport, getDashboardStats, getScanQueue, getBordereauForScan, startScanning, validateScanning, completeScanWithWorkflow, checkScanOverload, getScanActivityChart, debugBordereaux } from '../services/scanService';
import { getBordereauForManualScan, uploadManualDocuments, finalizeScanProcess } from '../services/manualScanService';
import { useAuthContext } from '../contexts/AuthContext';
import ScanEntryForm from '../components/ScanEntryForm';
import { Add } from '@mui/icons-material';

const ScanDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [scanActivity, setScanActivity] = useState<any[]>([]);
  const [scanQueue, setScanQueue] = useState<any[]>([]);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [overloadStatus, setOverloadStatus] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [initializingScanner, setInitializingScanner] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [manualScanBordereaux, setManualScanBordereaux] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);
  const [documentStats, setDocumentStats] = useState<any>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<{type: string, label: string, icon: string} | null>(null);
  const [selectedProgressionType, setSelectedProgressionType] = useState<string | null>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadAvailableClients();
    const interval = setInterval(() => {
      // Don't refresh if scan history dialog is open to prevent data overwrite
      if (activeDialog !== 'scan-history') {
        loadDashboard();
      }
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [activeDialog]);

  const loadAvailableClients = async () => {
    try {
      const { LocalAPI } = await import('../services/axios');
      const response = await LocalAPI.get('/clients');
      setAvailableClients(response.data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      const [statusData, activityData, queueData, overloadData, chartData, manualScanData, allBordereaux, docStatsData] = await Promise.all([
        fetchScanStatus(),
        fetchScanActivity(),
        getScanQueue(),
        checkScanOverload(),
        getScanActivityChart(),
        getBordereauForManualScan(),
        // Get all bordereaux for progression cards
        import('../services/axios').then(({ LocalAPI }) => 
          LocalAPI.get('/bordereaux').then(res => res.data)
        ),
        // Get document statistics with status breakdown
        import('../services/axios').then(({ LocalAPI }) => 
          LocalAPI.get('/scan/document-stats-by-type').then(res => {
            const data = res.data;
            const statusBreakdown: Record<string, Record<string, number>> = {};
            
            Object.keys(data).forEach(type => {
              const typeData = data[type];
              statusBreakdown[type] = {
                UPLOADED: typeData.aScanner || 0,
                EN_COURS: typeData.enCours || 0,
                TRAITE: typeData.scanne || 0
              };
            });
            
            return { ...data, statusBreakdown };
          }).catch(() => ({ statusBreakdown: {} }))
        )
      ]);
      setScanStatus(statusData);
      setScanActivity(activityData);
      // Deduplicate: merge queueData and allBordereaux, removing duplicates by ID
      const combined = [...queueData, ...allBordereaux.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut))];
      const uniqueScanQueue = Array.from(new Map(combined.map((b: any) => [b.id, b])).values());
      setScanQueue(uniqueScanQueue);
      setOverloadStatus(overloadData);
      setChartData(chartData);
      setManualScanBordereaux(manualScanData);
      setDocumentStats(docStatsData);
    } catch (error) {
      console.error('Failed to load scan dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeScanner = async () => {
    setInitializingScanner(true);
    try {
      await initializeScanners();
      await loadDashboard();
    } catch (error) {
      console.error('Scanner initialization failed:', error);
    } finally {
      setInitializingScanner(false);
    }
  };

  const handleProcessQueue = async () => {
    setLoading(true);
    try {
      const result = await processScanQueue();
      console.log('Queue processing result:', result);
      
      // Show success message with details
      if (result.processedCount > 0) {
        alert(`✅ Traitement de la file terminé avec succès!\n\n📊 Résultats:\n• ${result.processedCount} bordereau(x) traité(s)\n• Statut: En cours de scan\n\n🔄 Le tableau va se rafraîchir automatiquement...`);
      } else {
        alert(`ℹ️ Traitement de la file terminé\n\n📊 Résultats:\n• Aucun nouveau bordereau à traiter\n• File d'attente vide ou déjà en cours\n\n✅ Système à jour`);
      }
      
      // Refresh dashboard after processing
      setTimeout(loadDashboard, 2000);
    } catch (error: any) {
      console.error('Queue processing failed:', error);
      alert(`❌ Erreur lors du traitement de la file\n\n🔍 Détails:\n${error.response?.data?.message || error.message || 'Erreur inconnue'}\n\n💡 Veuillez réessayer ou contacter l'administrateur`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaperStreamImport = async () => {
    setLoading(true);
    try {
      const result = await triggerPaperStreamImport();
      console.log('PaperStream import result:', result);
      
      // Show detailed import results
      if (result.importedCount > 0) {
        const filesList = result.files?.map((f: any) => `• ${f.fileName}`).join('\n') || '';
        alert(`✅ Import PaperStream terminé avec succès!\n\n📊 Résultats:\n• ${result.importedCount} fichier(s) importé(s)\n\n📄 Fichiers traités:\n${filesList}\n\n🔄 Actualisation du tableau...`);
      } else {
        alert(`ℹ️ Import PaperStream terminé\n\n📊 Résultats:\n• Aucun nouveau fichier détecté\n• Dossier d'entrée vide\n\n💡 Placez des fichiers dans le dossier 'paperstream-input' pour les traiter`);
      }
      
      // Refresh dashboard after import
      setTimeout(loadDashboard, 1000);
    } catch (error: any) {
      console.error('PaperStream import failed:', error);
      alert(`❌ Erreur lors de l'import PaperStream\n\n🔍 Détails:\n${error.response?.data?.message || error.message || 'Erreur inconnue'}\n\n💡 Vérifiez que le dossier 'paperstream-input' existe et est accessible`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = async (bordereauId: string) => {
    setProcessing(bordereauId);
    try {
      await startScanning(bordereauId);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to start scanning:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewBordereau = async (bordereauId: string) => {
    try {
      const bordereau = await getBordereauForScan(bordereauId);
      setSelectedBordereau(bordereau);
      setActiveDialog('bordereau-details');
    } catch (error) {
      console.error('Failed to load bordereau:', error);
    }
  };

  const handleValidateScanning = async (bordereauId: string) => {
    try {
      await completeScanWithWorkflow(bordereauId);
      setActiveDialog(null);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to validate scanning:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'success';
      case 'scanning': return 'info';
      case 'error': return 'error';
      case 'offline': return 'warning';
      default: return 'default';
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'SCAN_STARTED':
      case 'MANUAL_SCAN_STARTED':
      case 'SCAN_IN_PROGRESS': return <PlayArrow color="primary" />;
      case 'SCAN_COMPLETED':
      case 'MANUAL_SCAN_COMPLETED':
      case 'DOCUMENT_READY': return <CheckCircle color="success" />;
      case 'SCAN_ERROR': return <Error color="error" />;
      case 'OCR_PROCESSED':
      case 'OCR_COMPLETED': return <TextFields color="info" />;
      default: return <Scanner />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  const handleRejectedBordereauClick = async (bordereauId: string) => {
    try {
      const bordereau = await getBordereauForScan(bordereauId);
      setSelectedBordereau(bordereau);
      setActiveDialog('document-correction-details');
    } catch (error) {
      console.error('Failed to load rejected bordereau:', error);
      alert('❌ Erreur lors du chargement du bordereau rejeté. Veuillez réessayer.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Rejection Handler */}
      <ScanRejectionHandler onRejectedBordereauClick={handleRejectedBordereauClick} />
      
      {/* Returned Bordereau Handler */}
      <ReturnedBordereauHandler onCorrectionComplete={loadDashboard} />
      
      {/* Header */}
      <Box mb={3}>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={{ xs: 2, sm: 0 }}
        >
          <Typography 
            variant="h4"
            fontWeight={600}
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem' },
              lineHeight: 1.2
            }}
          >
            SCAN Service Dashboard
          </Typography>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            gap={{ xs: 1, sm: 2 }}
            width={{ xs: '100%', sm: 'auto' }}
            sx={{ flexWrap: { sm: 'wrap', md: 'nowrap' } }}
          >

            <Button
              variant="outlined"
              startIcon={<Scanner />}
              onClick={() => setActiveDialog('scanner')}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Scanner
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoFixHigh />}
              onClick={() => setActiveDialog('quality')}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Qualité
            </Button>
            <Button
              variant="outlined"
              startIcon={<TextFields />}
              onClick={() => setActiveDialog('ocr')}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              OCR
            </Button>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleProcessQueue}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Traiter File
            </Button>
            <Button
              variant="outlined"
              startIcon={<Scanner />}
              onClick={handlePaperStreamImport}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Import
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => setShowEntryForm(true)}
              sx={{ 
                minWidth: { xs: 'auto', sm: 140 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              + Nouvelle Entrée
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Status Alerts */}
      {overloadStatus?.overloaded && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            🚨 SCAN Service Surchargé!
          </Typography>
          <Typography variant="body2">
            {overloadStatus.totalWorkload} éléments en file d'attente (seuil: {overloadStatus.threshold})
            {overloadStatus.slaAtRisk > 0 && ` - ${overloadStatus.slaAtRisk} bordereaux à risque SLA`}
          </Typography>
        </Alert>
      )}
      
      {scanStatus?.errorCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {scanStatus.errorCount} document(s) en erreur nécessitent une attention
        </Alert>
      )}

      {/* NEW BORDEREAU PROGRESS MANAGEMENT SECTION */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Gestion Progression Bordereaux
            <Chip label="NOUVEAU" color="primary" size="small" />
          </Typography>
          
          {/* Progress KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Card 
                sx={{ 
                  bgcolor: 'orange.50', 
                  border: '1px solid', 
                  borderColor: 'orange.200',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onClick={() => {
                  setSelectedProgressionType('A_SCANNER');
                  setActiveDialog('progression-popup');
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="orange.main" fontWeight="bold">
                    {scanQueue.filter(b => b.statut === 'A_SCANNER').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Non scannés
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card 
                sx={{ 
                  bgcolor: 'blue.50', 
                  border: '1px solid', 
                  borderColor: 'blue.200',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onClick={() => {
                  setSelectedProgressionType('SCAN_EN_COURS');
                  setActiveDialog('progression-popup');
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="blue.main" fontWeight="bold">
                    {scanQueue.filter(b => b.statut === 'SCAN_EN_COURS').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scan en cours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card 
                sx={{ 
                  bgcolor: 'green.50', 
                  border: '1px solid', 
                  borderColor: 'green.200'
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="green.main" fontWeight="bold">
                    {scanQueue.filter((b: any) => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Scan finalisés
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      disabled={loadingHistory}
                      onClick={async () => {
                        setLoadingHistory(true);
                        try {
                          const { LocalAPI } = await import('../services/axios');
                          // Load ALL bordereaux for complete history
                          const allBordereauxRes = await LocalAPI.get('/bordereaux');
                          const allBordereaux = Array.isArray(allBordereauxRes.data) ? allBordereauxRes.data : allBordereauxRes.data.items || [];
                          // Pre-load enhanced history data AND documents before opening dialog
                          const historyPromises = allBordereaux
                            .map(async (b: any) => {
                              try {
                                const [historyRes, detailsRes] = await Promise.all([
                                  LocalAPI.get(`/scan/bordereau/${b.id}/history`).catch(() => ({ data: null })),
                                  LocalAPI.get(`/bordereaux/${b.id}`, { params: { include: 'documents' } })
                                ]);
                                console.log(`Loaded ${b.reference}: ${detailsRes.data.documents?.length || 0} documents`);
                                return { ...b, enhancedHistory: historyRes.data, documents: detailsRes.data.documents || [] };
                              } catch (err) {
                                console.error(`Error loading ${b.reference}:`, err);
                                return { ...b, enhancedHistory: null, documents: [] };
                              }
                            });
                          const enhancedBordereaux = await Promise.all(historyPromises);
                          console.log('Total bordereaux loaded:', enhancedBordereaux.length);
                          setHistoryData(enhancedBordereaux);
                          setActiveDialog('scan-history');
                        } catch (error) {
                          console.error('Failed to load enhanced history:', error);
                          alert('❌ Erreur lors du chargement de l\'historique');
                        } finally {
                          setLoadingHistory(false);
                        }
                      }}
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {loadingHistory ? '⏳ Chargement...' : '📜 Historique'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card sx={{ bgcolor: 'purple.50', border: '1px solid', borderColor: 'purple.200' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="purple.main" fontWeight="bold">
                    {scanQueue.length > 0 ? Math.round(
                      (scanQueue.filter((b: any) => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length / 
                       scanQueue.filter((b: any) => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut)).length) * 100
                    ) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Progression moyenne
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* NEW DOCUMENT TYPES STATISTICS SECTION */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📋 Statistiques par Type de Document
            <Chip label="NOUVEAU" color="secondary" size="small" />
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { type: 'BULLETIN_SOIN', label: 'Bulletins de Soins', icon: '🏥', color: '#10b981' },
              { type: 'COMPLEMENT_INFORMATION', label: 'Compléments Info', icon: '📋', color: '#3b82f6' },
              { type: 'ADHESION', label: 'Adhésions', icon: '👥', color: '#8b5cf6' },
              { type: 'RECLAMATION', label: 'Réclamations', icon: '⚠️', color: '#f59e0b' },
              { type: 'CONTRAT_AVENANT', label: 'Contrats/Avenants', icon: '📄', color: '#6b7280' },
              { type: 'DEMANDE_RESILIATION', label: 'Demandes Résiliation', icon: '❌', color: '#ef4444' },
              { type: 'CONVENTION_TIERS_PAYANT', label: 'Conventions Tiers', icon: '🤝', color: '#06b6d4' }
            ].map((docType, index) => {
              const typeData = documentStats?.[docType.type];
              const count = typeof typeData === 'object' ? typeData.total || 0 : 0;
              const statusData = documentStats?.statusBreakdown?.[docType.type] || {};
              const uploaded = typeData?.aScanner || statusData.UPLOADED || 0;
              const enCours = typeData?.enCours || statusData.EN_COURS || 0;
              const traite = typeData?.scanne || statusData.TRAITE || 0;
              const progression = typeData?.progression || (count > 0 ? Math.round(((enCours + traite) / count) * 100) : 0);
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    minHeight: '220px',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.15)'
                    }
                  }}>
                    <CardContent sx={{ py: 2, px: 2 }}>
                      {/* Header */}
                      <Box textAlign="center" mb={2}>
                        <Typography sx={{ fontSize: '2rem', mb: 1 }}>{docType.icon}</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: docType.color, mb: 0.5 }}>
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {docType.label}
                        </Typography>
                      </Box>
                      
                      {/* Status Details */}
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <span>📤 À scanner:</span>
                          <Typography component="span" fontWeight="bold" color="warning.main">{uploaded}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <span>⚡ En cours:</span>
                          <Typography component="span" fontWeight="bold" color="primary.main">{enCours}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <span>✅ Scannés:</span>
                          <Typography component="span" fontWeight="bold" color="success.main">{traite}</Typography>
                        </Box>
                        
                        {/* Progress Bar */}
                        <Box>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <span>Progression:</span>
                            <Typography component="span" fontWeight="bold">{progression}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={progression} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: progression >= 80 ? 'success.main' : progression >= 50 ? 'warning.main' : 'error.main'
                              }
                            }} 
                          />
                        </Box>
                      </Box>
                      
                      {/* Action Button */}
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedDocumentType({
                            type: docType.type,
                            label: docType.label,
                            icon: docType.icon
                          })}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          📋 Voir Documents
                        </Button>
                      </Box>
                      
                      {['CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'].includes(docType.type) && (
                        <Chip 
                          label="No SLA" 
                          size="small" 
                          sx={{ 
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontSize: '0.65rem', 
                            bgcolor: '#fbbf24', 
                            color: 'white' 
                          }} 
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} mb={4} sx={{ mx: { xs: -2, sm: 0 }, width: { xs: 'calc(100% + 16px)', sm: '100%' } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Scanners Disponibles
                  </Typography>
                  <Typography variant="h4" component="div">
                    {scanStatus?.scannersAvailable || 0}
                  </Typography>
                </Box>
                <Scanner color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    File d'Attente
                  </Typography>
                  <Typography variant="h4" component="div">
                    {scanStatus?.processingQueue || 0}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Traités Aujourd'hui
                  </Typography>
                  <Typography variant="h4" component="div">
                    {scanStatus?.processedToday || 0}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Erreurs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {scanStatus?.errorCount || 0}
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mx: { xs: -2, sm: 0 }, width: { xs: 'calc(100% + 16px)', sm: '100%' } }}>
        {/* Folder Monitor */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Surveillance des Dossiers
            </Typography>
            <FolderMonitor onFileProcessed={loadDashboard} />
          </Paper>
        </Grid>

        {/* Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                📈 Activité de Scan (24h)
              </Typography>
              <Chip 
                label={`${chartData.reduce((sum, item) => sum + item.count, 0)} activités`}
                color="primary"
                size="small"
              />
            </Box>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getHours()}h`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    label={{ value: 'Activités', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.toLocaleDateString()} à ${date.getHours()}h`;
                    }}
                    formatter={(value: any) => [`${value} activité(s)`, 'Nombre']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1976d2" 
                    strokeWidth={3}
                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                height={300}
                bgcolor="grey.50"
                borderRadius={1}
              >
                <Typography color="text.secondary">
                  📊 Aucune activité de scan dans les dernières 24h
                </Typography>
              </Box>
            )}
            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Dernière mise à jour: {new Date().toLocaleTimeString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pic d'activité: {chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 0} activités/h
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* BORDEREAU SCAN MANAGEMENT - With Manual Scan Buttons as Required */}
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                🔧 Gestion Scan Bordereaux
              </Typography>
              <Box display="flex" gap={1}>
                <Chip 
                  label={`${scanQueue.filter(b => b.statut === 'A_SCANNER').length} à scanner`}
                  color="warning"
                  size="small"
                />
                <Chip 
                  label={`${scanQueue.filter(b => b.statut === 'SCAN_EN_COURS').length} en cours`}
                  color="info"
                  size="small"
                />
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SLA</TableCell>
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions Scan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanQueue.filter(b => b.statut === 'A_SCANNER' || b.statut === 'SCAN_EN_COURS').map((bordereau: any) => {
                    // Calculate SLA status
                    const now = new Date();
                    const reception = new Date(bordereau.dateReception);
                    const daysElapsed = Math.floor((now.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24));
                    const slaIcon = daysElapsed >= 5 ? '🔴' : daysElapsed >= 2 ? '🟠' : '🟢';
                    const slaStatus = daysElapsed >= 5 ? 'CRITICAL' : daysElapsed >= 2 ? 'WARNING' : 'OK';
                    
                    return (
                      <TableRow key={bordereau.id}>
                        <TableCell>
                          <Tooltip title={`${daysElapsed} jours écoulés - ${slaStatus}`}>
                            <span style={{ fontSize: '20px', cursor: 'pointer' }}>
                              {slaIcon}
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {bordereau.reference}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(bordereau.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {bordereau.client?.name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              bordereau.statut === 'A_SCANNER' ? 'À scanner' :
                              bordereau.statut === 'SCAN_EN_COURS' ? 'Scan en cours' :
                              bordereau.statut === 'SCANNE' ? 'Scanné' : bordereau.statut
                            }
                            color={
                              bordereau.statut === 'A_SCANNER' ? 'warning' :
                              bordereau.statut === 'SCAN_EN_COURS' ? 'info' :
                              bordereau.statut === 'SCANNE' ? 'success' : 'default'
                            }
                            size="small"
                          />
                          {bordereau.statut === 'SCAN_EN_COURS' && (
                            <Chip
                              label="Scan Multiple Possible"
                              color="info"
                              size="small"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {/* Manual Scan buttons for À scanner AND En cours de Scan statuses */}
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              startIcon={<Scanner />}
                              onClick={async () => {
                                // NEW: Validate multiple scan capability before opening dialog
                                if (bordereau.statut === 'SCAN_EN_COURS') {
                                  try {
                                    const { validateMultipleScanWorkflow } = await import('../services/scanService');
                                    const validation = await validateMultipleScanWorkflow(bordereau.id);
                                    
                                    if (!validation.canScanMultiple) {
                                      // Show error in Material-UI dialog instead of alert
                                      const errorDialog = document.createElement('div');
                                      errorDialog.innerHTML = `
                                        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                                          <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                                            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                              <span style="font-size: 24px; margin-right: 8px;">❌</span>
                                              <h3 style="margin: 0; color: #d32f2f;">Scan multiple non autorisé</h3>
                                            </div>
                                            <p style="margin: 8px 0; color: #666;">📊 Scans actuels: ${validation.currentScanCount}/${validation.maxScansAllowed}</p>
                                            <p style="margin: 8px 0; color: #666;">💡 ${validation.message}</p>
                                            <button onclick="this.parentElement.parentElement.remove()" style="background: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 16px;">Fermer</button>
                                          </div>
                                        </div>
                                      `;
                                      document.body.appendChild(errorDialog);
                                      return;
                                    }
                                    
                                    // Show success in Material-UI dialog instead of alert
                                    const successDialog = document.createElement('div');
                                    successDialog.innerHTML = `
                                      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                                        <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                                          <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                            <span style="font-size: 24px; margin-right: 8px;">✅</span>
                                            <h3 style="margin: 0; color: #2e7d32;">Scan supplémentaire autorisé</h3>
                                          </div>
                                          <p style="margin: 8px 0; color: #666;">📊 Scan #${validation.currentScanCount + 1}/${validation.maxScansAllowed}</p>
                                          <p style="margin: 8px 0; color: #666;">🔄 Vous pouvez ajouter des documents</p>
                                          <button onclick="this.parentElement.parentElement.remove()" style="background: #2e7d32; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 16px;">Continuer</button>
                                        </div>
                                      </div>
                                    `;
                                    document.body.appendChild(successDialog);
                                  } catch (error) {
                                    console.warn('Validation failed, proceeding with scan:', error);
                                  }
                                }
                                
                                setSelectedBordereau(bordereau);
                                setActiveDialog('manual-scan-direct');
                              }}
                              sx={{ 
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' },
                                px: { xs: 1, sm: 2 }
                              }}
                            >
                              📄 Scan Manuel
                              {bordereau.statut === 'SCAN_EN_COURS' && ' (Supplémentaire)'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewBordereau(bordereau.id)}
                              sx={{ 
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' },
                                px: { xs: 1, sm: 2 }
                              }}
                            >
                              Voir
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {scanQueue.filter(b => b.statut === 'A_SCANNER' || b.statut === 'SCAN_EN_COURS').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography 
                          color="text.secondary" 
                          sx={{ 
                            py: { xs: 2, sm: 4 },
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          Aucun bordereau nécessitant un scan manuel
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <Dialog 
        open={activeDialog === 'scanner'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Contrôle Scanner</DialogTitle>
        <DialogContent>
          <ScannerControl onScanComplete={loadDashboard} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={activeDialog === 'quality'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Validation Qualité</DialogTitle>
        <DialogContent>
          <QualityValidator />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={activeDialog === 'ocr'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Interface de Correction OCR</DialogTitle>
        <DialogContent>
          <OCRCorrectionInterface />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Manual Scan Dialog */}
      <Dialog 
        open={activeDialog === 'manual-scan'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          🖨️ Numérisation Manuelle
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <ManualScanInterface />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Direct Manual Scan Dialog for specific bordereau */}
      <Dialog 
        open={activeDialog === 'manual-scan-direct'} 
        onClose={() => {
          setActiveDialog(null);
          setSelectedBordereau(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📄 Scan Manuel - {selectedBordereau?.reference}
          {selectedBordereau?.statut === 'SCAN_EN_COURS' && (
            <Chip label="Scan supplémentaire" color="info" size="small" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
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
        <DialogActions>
          <Button onClick={() => {
            setActiveDialog(null);
            setSelectedBordereau(null);
          }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Bordereau Details Dialog */}
      <Dialog 
        open={activeDialog === 'bordereau-details'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Détails Bordereau - {selectedBordereau?.reference}
        </DialogTitle>
        <DialogContent>
          {selectedBordereau && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informations Client</Typography>
                <Typography><strong>Client:</strong> {selectedBordereau.client?.name}</Typography>
                <Typography><strong>Référence Contrat:</strong> {selectedBordereau.contract?.clientName || 'Non assigné'}</Typography>
                <Typography><strong>Type de Bordereau:</strong> {selectedBordereau.type || 'BULLETIN_SOIN'}</Typography>
                <Typography><strong>Délai Règlement:</strong> {selectedBordereau.contract?.delaiReglement || selectedBordereau.delaiReglement} jours</Typography>
                <Typography><strong>Chargé de Compte:</strong> {
                  selectedBordereau.contract?.teamLeader?.fullName || 
                  selectedBordereau.contract?.assignedManager?.fullName || 
                  selectedBordereau.client?.gestionnaires?.find((g: any) => g.role === 'CHEF_EQUIPE')?.fullName || 
                  'Non assigné'
                }</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Documents ({selectedBordereau.documents?.length || 0})</Typography>
                {selectedBordereau.documents && selectedBordereau.documents.length > 0 ? (
                  selectedBordereau.documents.map((doc: any) => (
                    <Box key={doc.id} display="flex" alignItems="center" gap={1} mb={1}>
                      <Chip label={doc.type} size="small" />
                      <Typography variant="body2">{doc.name}</Typography>
                      <Chip label={doc.status} color={doc.status === 'SCANNE' ? 'success' : doc.status === 'TRAITE' ? 'info' : 'default'} size="small" />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Aucun document scanné</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Historique</Typography>
                {selectedBordereau.traitementHistory && selectedBordereau.traitementHistory.length > 0 ? (
                  selectedBordereau.traitementHistory.map((history: any, index: number) => (
                    <Typography key={index} variant="body2">
                      {new Date(history.createdAt).toLocaleString()} - {history.action}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Aucun historique disponible</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {/* Edit button for SCAN team and Super Admin */}
          {(['SCAN_TEAM', 'SUPER_ADMIN'].includes(user?.role || '')) && (
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => setActiveDialog('edit-bordereau-details')}
            >
              Modifier
            </Button>
          )}
          {selectedBordereau?.statut === 'SCAN_EN_COURS' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => handleValidateScanning(selectedBordereau.id)}
            >
              Valider Scan
            </Button>
          )}
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bordereau Details Dialog */}
      <Dialog 
        open={activeDialog === 'edit-bordereau-details'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Modifier Bordereau - {selectedBordereau?.reference}
        </DialogTitle>
        <DialogContent>
          {selectedBordereau && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Référence BO"
                  value={selectedBordereau.reference}
                  onChange={(e) => setSelectedBordereau({...selectedBordereau, reference: e.target.value})}
                  helperText="Modifiable en cas d'erreur du Bureau d'Ordre"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Type de Bordereau</InputLabel>
                  <Select
                    value={selectedBordereau.type || 'BULLETIN_SOIN'}
                    onChange={(e) => setSelectedBordereau({...selectedBordereau, type: e.target.value})}
                    label="Type de Bordereau"
                  >
                    <MenuItem value="BULLETIN_SOIN">Bulletin de Soins</MenuItem>
                    <MenuItem value="COMPLEMENT_INFORMATION">Complément d'Information</MenuItem>
                    <MenuItem value="ADHESION">Adhésion</MenuItem>
                    <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                    <MenuItem value="CONTRAT_AVENANT">Contrat/Avenant</MenuItem>
                    <MenuItem value="DEMANDE_RESILIATION">Demande de Résiliation</MenuItem>
                    <MenuItem value="CONVENTION_TIERS_PAYANT">Convention Tiers Payant</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Client</InputLabel>
                  <Select
                    value={selectedBordereau.clientId}
                    onChange={(e) => setSelectedBordereau({...selectedBordereau, clientId: e.target.value})}
                    label="Client"
                  >
                    {availableClients.map(client => (
                      <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Modifiable en cas d'erreur du Bureau d'Ordre
                  </Typography>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date de Réception"
                  value={selectedBordereau.dateReception ? new Date(selectedBordereau.dateReception).toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedBordereau({...selectedBordereau, dateReception: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  helperText="Modifiable en cas d'erreur du Bureau d'Ordre"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog('bordereau-details')}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              try {
                const { LocalAPI } = await import('../services/axios');
                await LocalAPI.patch(`/scan/bordereau/${selectedBordereau.id}/modify`, {
                  reference: selectedBordereau.reference,
                  clientId: selectedBordereau.clientId,
                  dateReception: selectedBordereau.dateReception
                });
                
                // Refresh bordereau data
                const updatedBordereau = await getBordereauForScan(selectedBordereau.id);
                setSelectedBordereau(updatedBordereau);
                setActiveDialog('bordereau-details');
                
                alert('✅ Bordereau modifié avec succès');
                await loadDashboard();
              } catch (error: any) {
                console.error('Update failed:', error);
                alert(`❌ Erreur lors de la modification: ${error.response?.data?.message || error.message}`);
              }
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Type Modal */}
      <DocumentTypeModal
        open={!!selectedDocumentType}
        onClose={() => setSelectedDocumentType(null)}
        documentType={selectedDocumentType?.type || ''}
        documentTypeLabel={selectedDocumentType?.label || ''}
        documentTypeIcon={selectedDocumentType?.icon || ''}
      />

      {/* Scan History Dialog - ENHANCED with comprehensive details */}
      <Dialog 
        open={activeDialog === 'scan-history'} 
        onClose={() => setActiveDialog(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          📜 Historique Complet des Scans
          <Chip 
            label={`${historyData.length} bordereaux (tous statuts)`}
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Date Scan</TableCell>
                  <TableCell>Scanné Par</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Durée Scan</TableCell>
                  <TableCell>Statut Actuel</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData
                  .sort((a: any, b: any) => new Date(b.dateFinScan || b.updatedAt || b.createdAt).getTime() - new Date(a.dateFinScan || a.updatedAt || a.createdAt).getTime())
                  .map((bordereau: any) => {
                    const history = bordereau.enhancedHistory;
                    const scanUser = history?.timeline?.find((t: any) => t.action === 'SCAN_COMPLETED')?.user || history?.summary?.scanUser;
                    const scanDuration = history?.summary?.totalDuration;
                    const docCount = bordereau.documents?.length || history?.summary?.documentsScanned || 0;
                    
                    return (
                      <TableRow key={bordereau.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {bordereau.reference}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {bordereau.client?.name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {scanUser?.fullName || scanUser?.username || 'N/A'}
                          </Typography>
                          {scanUser?.role && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {scanUser.role}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={`${docCount} doc(s)`} size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {scanDuration ? `${Math.round(scanDuration)} min` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bordereau.statut}
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Voir détails complets">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => handleViewBordereau(bordereau.id)}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Voir
                              </Button>
                            </Tooltip>
                            {history && (
                              <Tooltip title="Timeline détaillée">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSelectedBordereau(bordereau);
                                    setActiveDialog('detailed-history');
                                  }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                }
                {historyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {loadingHistory ? 'Chargement...' : 'Aucun bordereau scanné dans l\'historique'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Detailed History Timeline Dialog */}
      <Dialog 
        open={activeDialog === 'detailed-history'} 
        onClose={() => {
          setActiveDialog('scan-history');
          setSelectedBordereau(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📋 Timeline Détaillée - {selectedBordereau?.reference}
        </DialogTitle>
        <DialogContent>
          {selectedBordereau?.enhancedHistory && (
            <Box>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>Résumé</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Documents scannés: {selectedBordereau.enhancedHistory.summary?.documentsScanned || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Durée totale: {selectedBordereau.enhancedHistory.summary?.totalDuration ? `${Math.round(selectedBordereau.enhancedHistory.summary.totalDuration)} min` : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Statut SLA: {selectedBordereau.enhancedHistory.summary?.slaStatus || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Impact SLA: {selectedBordereau.enhancedHistory.summary?.slaImpact || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>Timeline des Actions</Typography>
              {selectedBordereau.enhancedHistory.timeline?.map((event: any, index: number) => (
                <Paper key={index} sx={{ p: 2, mb: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="bold">{event.action}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                      {event.user && (
                        <Typography variant="caption" display="block" color="primary">
                          Par: {event.user.fullName || event.user.username} ({event.user.role})
                        </Typography>
                      )}
                      {event.details && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {event.details}
                        </Typography>
                      )}
                      {event.duration && (
                        <Chip label={`${Math.round(event.duration)} min`} size="small" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                    {getActivityIcon(event.action)}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setActiveDialog('scan-history');
            setSelectedBordereau(null);
          }}>Retour</Button>
        </DialogActions>
      </Dialog>

      {/* Document Corrections Dialog - REMOVED: Now handled by ReturnedBordereauHandler component */}

      {/* Document Correction Details Dialog - EXACT SPECIFICATION */}
      <Dialog 
        open={activeDialog === 'document-correction-details'} 
        onClose={() => {
          setActiveDialog(null);
          setSelectedBordereau(null);
          setSelectedDocumentType(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#fff3e0', color: '#e65100', borderBottom: '2px solid #ff9800' }}>
          🔄 Correction Documents - {selectedBordereau?.reference}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bordereau rejeté par le chef d'équipe - Correction requise
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedBordereau && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#e65100', mb: 2 }}>
                Documents de ce bordereau:
              </Typography>
              
              {selectedBordereau.documents && selectedBordereau.documents.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  {/* Nested Document Display as per specification */}
                  <Paper sx={{ p: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                    {selectedBordereau.documents.map((doc: any, index: number) => (
                      <Box key={doc.id} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        py: 1.5,
                        px: 2,
                        mb: index < selectedBordereau.documents.length - 1 ? 1 : 0,
                        bgcolor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 1
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>
                            {doc.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={doc.type} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Chip 
                              label={doc.status} 
                              size="small" 
                              color={doc.status === 'SCANNE' ? 'success' : 'warning'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<AutoFixHigh />}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
                            input.onchange = async (e: any) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('documentName', doc.name);
                                  
                                  const { LocalAPI } = await import('../services/axios');
                                  await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/replace-document`, formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                  });
                                  
                                  alert('✅ Document remplacé avec succès');
                                  // Reload bordereau details
                                  const updatedBordereau = await import('../services/scanService').then(({ getBordereauForScan }) => 
                                    getBordereauForScan(selectedBordereau.id)
                                  );
                                  setSelectedBordereau(updatedBordereau);
                                  await loadDashboard();
                                } catch (error: any) {
                                  alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
                                }
                              }
                            };
                            input.click();
                          }}
                          sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                        >
                          Remplacer
                        </Button>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  ⚠️ Aucun document trouvé pour ce bordereau
                </Alert>
              )}
              
              {/* Add Missing Document Section - EXACT SPECIFICATION */}
              <Paper sx={{ p: 3, bgcolor: '#e8f5e8', border: '2px solid #4caf50' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                  ➕ Ajouter un document manquant
                </Typography>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={selectedDocumentType?.type || ''}
                        onChange={(e) => setSelectedDocumentType({ 
                          type: e.target.value, 
                          label: e.target.value, 
                          icon: '📄' 
                        })}
                        label="Type de document"
                      >
                        <MenuItem value="BULLETIN_SOIN">📋 Bulletin de Soins</MenuItem>
                        <MenuItem value="COMPLEMENT_INFORMATION">📄 Complément Info</MenuItem>
                        <MenuItem value="ADHESION">👥 Adhésion</MenuItem>
                        <MenuItem value="RECLAMATION">⚠️ Réclamation</MenuItem>
                        <MenuItem value="CONTRAT_AVENANT">📜 Contrat/Avenant</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      disabled={!selectedDocumentType?.type}
                      onClick={() => {
                        if (!selectedDocumentType?.type) {
                          alert('⚠️ Veuillez sélectionner un type de document');
                          return;
                        }
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              formData.append('documentType', selectedDocumentType.type);
                              
                              const { LocalAPI } = await import('../services/axios');
                              await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/add-missing-document`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              
                              alert('✅ Document manquant ajouté avec succès');
                              // Reload bordereau details
                              const updatedBordereau = await import('../services/scanService').then(({ getBordereauForScan }) => 
                                getBordereauForScan(selectedBordereau.id)
                              );
                              setSelectedBordereau(updatedBordereau);
                              await loadDashboard();
                              setSelectedDocumentType(null);
                            } catch (error: any) {
                              alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
                            }
                          }
                        };
                        input.click();
                      }}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      ➕ Sélectionner et Ajouter
                    </Button>
                  </Grid>
                  {selectedDocumentType?.type && (
                    <Grid item xs={12}>
                      <Alert severity="success" sx={{ mt: 1 }}>
                        ✓ Type sélectionné: <strong>{selectedDocumentType.type}</strong> - Cliquez sur "Sélectionner et Ajouter" pour choisir le fichier
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <Button 
            onClick={() => {
              setActiveDialog(null);
              setSelectedBordereau(null);
              setSelectedDocumentType(null);
            }}
            color="inherit"
          >
            Fermer
          </Button>
          <Button 
            onClick={async () => {
              if (selectedBordereau) {
                try {
                  // Mark corrections as complete and reset documentStatus
                  const { LocalAPI } = await import('../services/axios');
                  await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/complete-corrections`);
                  
                  alert('✅ Corrections terminées - Le bordereau est prêt pour re-scan');
                  setActiveDialog(null);
                  setSelectedBordereau(null);
                  setSelectedDocumentType(null);
                  await loadDashboard();
                } catch (error: any) {
                  alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
                }
              }
            }}
            variant="contained"
            color="success"
          >
            ✅ Corrections Terminées
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progression Popup Dialog */}
      <Dialog 
        open={activeDialog === 'progression-popup'} 
        onClose={() => {
          setActiveDialog(null);
          setSelectedProgressionType(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedProgressionType === 'A_SCANNER' && '📤 Bordereaux Non Scannés'}
          {selectedProgressionType === 'SCAN_EN_COURS' && '⚡ Bordereaux Scan en Cours'}
          {selectedProgressionType === 'SCANNE' && '✅ Bordereaux Scan Finalisés'}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions Scan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanQueue
                  .filter(b => {
                    if (selectedProgressionType === 'A_SCANNER') return b.statut === 'A_SCANNER';
                    if (selectedProgressionType === 'SCAN_EN_COURS') return b.statut === 'SCAN_EN_COURS';
                    if (selectedProgressionType === 'SCANNE') return ['SCANNE', 'A_AFFECTER'].includes(b.statut);
                    return false;
                  })
                  .map((bordereau: any) => (
                    <TableRow key={bordereau.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {bordereau.reference}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(bordereau.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bordereau.client?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            bordereau.statut === 'A_SCANNER' ? 'À scanner' :
                            bordereau.statut === 'SCAN_EN_COURS' ? 'Scan en cours' : 'Scanné'
                          }
                          color={
                            bordereau.statut === 'A_SCANNER' ? 'warning' :
                            bordereau.statut === 'SCAN_EN_COURS' ? 'info' : 'success'
                          }
                          size="small"
                        />
                        {bordereau.statut === 'SCAN_EN_COURS' && (
                          <Chip
                            label="Scan Multiple Possible"
                            color="info"
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {/* Manual Scan buttons for À scanner AND En cours de Scan statuses */}
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<Scanner />}
                            onClick={() => {
                              setSelectedBordereau(bordereau);
                              setActiveDialog('manual-scan-direct');
                            }}
                            sx={{ 
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              minWidth: { xs: 'auto', sm: 'auto' },
                              px: { xs: 1, sm: 2 }
                            }}
                          >
                            📄 Scan Manuel
                            {bordereau.statut === 'SCAN_EN_COURS' && ' (Supplémentaire)'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewBordereau(bordereau.id)}
                            sx={{ 
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              minWidth: { xs: 'auto', sm: 'auto' },
                              px: { xs: 1, sm: 2 }
                            }}
                          >
                            Voir
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                }
                {scanQueue.filter(b => {
                  if (selectedProgressionType === 'A_SCANNER') return b.statut === 'A_SCANNER';
                  if (selectedProgressionType === 'SCAN_EN_COURS') return b.statut === 'SCAN_EN_COURS';
                  if (selectedProgressionType === 'SCANNE') return ['SCANNE', 'A_AFFECTER'].includes(b.statut);
                  return false;
                }).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        Aucun bordereau dans cette catégorie
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setActiveDialog(null);
            setSelectedProgressionType(null);
          }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* SCAN Entry Form */}
      <ScanEntryForm
        open={showEntryForm}
        onClose={() => setShowEntryForm(false)}
        onSuccess={() => {
          setShowEntryForm(false);
          loadDashboard();
        }}
      />
    </Box>
  );
};

export default ScanDashboard;