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
  DialogActions
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
import { fetchScanStatus, fetchScanActivity, initializeScanners, processScanQueue, triggerPaperStreamImport, getDashboardStats, getScanQueue, getBordereauForScan, startScanning, validateScanning, checkScanOverload, getScanActivityChart, debugBordereaux } from '../services/scanService';
import { getBordereauForManualScan, uploadManualDocuments, finalizeScanProcess } from '../services/manualScanService';

const ScanDashboard: React.FC = () => {
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

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
      setScanQueue([...queueData, ...allBordereaux.filter((b: any) => ['SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut))]);
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
      await validateScanning(bordereauId);
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

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
            {/* <Button
              variant="contained"
              startIcon={<Settings />}
              onClick={handleInitializeScanner}
              disabled={initializingScanner}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              {initializingScanner ? 'Init...' : 'Initialiser'}
            </Button> */}
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
            {/* COMMENTED OUT: SCAN MANUEL button as per requirements */}
            {/* <Button
              variant="contained"
              color="secondary"
              startIcon={<Scanner />}
              onClick={() => setActiveDialog('manual-scan')}
              sx={{ 
                minWidth: { xs: 'auto', sm: 140 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              📄 Scan Manuel
            </Button> */}
            {/* <Button
              variant="outlined"
              color="secondary"
              onClick={async () => {
                try {
                  const debug = await debugBordereaux();
                  console.log('Debug bordereaux:', debug);
                  alert(`📊 Debug Info:\n\n📋 Total bordereaux: ${debug.totalCount}\n\n📈 Status counts:\n${debug.statusCounts.map((s: any) => `• ${s.statut}: ${s._count.id}`).join('\n')}\n\n🔍 Check console for detailed info`);
                } catch (error) {
                  console.error('Debug failed:', error);
                }
              }}
              sx={{ 
                minWidth: { xs: 'auto', sm: 100 },
                fontSize: '0.75rem',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              🔍 Debug
            </Button> */}
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

      {/* COMMENTED OUT: Redundant scan corbeille - Use main File d'Attente SCAN table instead */}
      {/* <Box sx={{ mb: 4 }}>
        <ScanCorbeille />
      </Box> */}

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
                  borderColor: 'green.200',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onClick={() => {
                  setSelectedProgressionType('SCANNE');
                  setActiveDialog('progression-popup');
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="green.main" fontWeight="bold">
                    {scanQueue.filter((b: any) => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scan finalisés
                  </Typography>
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
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions Scan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanQueue.filter(b => b.statut === 'A_SCANNER' || b.statut === 'SCAN_EN_COURS').map((bordereau: any) => {
                    return (
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

        {/* COMMENTED OUT: File d'Attente SCAN Table - REDUNDANT as per company requirements */}
        {/* REDUNDANT TABLE - COMMENTED OUT
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                📋 File d'Attente SCAN ({scanQueue.length})
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
                <Chip 
                  label={`${scanQueue.filter((b: any) => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length} finalisés`}
                  color="success"
                  size="small"
                />
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Scan Status</TableCell>
                    <TableCell>Documents</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanQueue.map((bordereau: any) => {
                    return (
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
                            label={bordereau.type || 'GENERAL'} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bordereau.statut}
                            color={
                              bordereau.statut === 'A_SCANNER' ? 'warning' :
                              bordereau.statut === 'SCAN_EN_COURS' ? 'info' :
                              ['SCANNE', 'A_AFFECTER'].includes(bordereau.statut) ? 'success' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bordereau.scanStatus || 'NON_SCANNE'}
                            color={
                              bordereau.scanStatus === 'NON_SCANNE' ? 'default' :
                              bordereau.scanStatus === 'SCAN_EN_COURS' ? 'info' :
                              bordereau.scanStatus === 'SCAN_FINALISE' ? 'success' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {bordereau.documents?.length || 0} doc(s)
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {(bordereau.statut === 'A_SCANNER' || bordereau.statut === 'SCAN_EN_COURS') && (
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
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<PlayArrow />}
                              onClick={() => handleStartScanning(bordereau.id)}
                              disabled={processing === bordereau.id || autoAssigning === bordereau.id}
                              sx={{ 
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' },
                                px: { xs: 1, sm: 2 }
                              }}
                            >
                              Scanner
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
                            {(!bordereau.scanStatus || bordereau.scanStatus === 'NON_SCANNE') && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={async () => {
                                  try {
                                    const { LocalAPI } = await import('../services/axios');
                                    await LocalAPI.put(`/bordereaux/${bordereau.id}/scan-status`, {
                                      scanStatus: 'SCAN_EN_COURS'
                                    });
                                    await loadDashboard();
                                  } catch (error) {
                                    console.error('Failed to start scan:', error);
                                  }
                                }}
                                sx={{ 
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  minWidth: { xs: 'auto', sm: 'auto' },
                                  px: { xs: 1, sm: 2 }
                                }}
                              >
                                🖨️ Démarrer
                              </Button>
                            )}
                            {bordereau.scanStatus === 'SCAN_EN_COURS' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={async () => {
                                  try {
                                    const { LocalAPI } = await import('../services/axios');
                                    await LocalAPI.put(`/bordereaux/${bordereau.id}/scan-status`, {
                                      scanStatus: 'SCAN_FINALISE'
                                    });
                                    await loadDashboard();
                                  } catch (error) {
                                    console.error('Failed to finalize scan:', error);
                                  }
                                }}
                                sx={{ 
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  minWidth: { xs: 'auto', sm: 'auto' },
                                  px: { xs: 1, sm: 2 }
                                }}
                              >
                                ✅ Finaliser
                              </Button>
                            )}
                            {bordereau.scanStatus === 'SCAN_FINALISE' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                disabled={autoAssigning === bordereau.id}
                                onClick={async () => {
                                  setAutoAssigning(bordereau.id);
                                  try {
                                    const { LocalAPI } = await import('../services/axios');
                                    const response = await LocalAPI.post(`/bordereaux/${bordereau.id}/auto-assign`);
                                    
                                    if (response.data.success) {
                                      alert(`✅ Bordereau auto-assigné avec succès!\n\n👤 Assigné à: ${response.data.assignedTo}\n🔧 Méthode: ${response.data.method || 'AI'}\n\n🔄 Actualisation du tableau...`);
                                      await loadDashboard();
                                    } else {
                                      alert(`❌ Échec de l'auto-assignation\n\n🔍 Erreur: ${response.data.error || 'Erreur inconnue'}\n\n💡 Veuillez réessayer ou assigner manuellement`);
                                    }
                                  } catch (error: any) {
                                    console.error('Auto-assign failed:', error);
                                    const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'auto-assignation';
                                    alert(`❌ Erreur d'auto-assignation\n\n🔍 Détails: ${errorMessage}\n\n💡 Vérifiez qu'il y a des gestionnaires disponibles`);
                                  } finally {
                                    setAutoAssigning(null);
                                  }
                                }}
                                sx={{ 
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  minWidth: { xs: 'auto', sm: 'auto' },
                                  px: { xs: 1, sm: 2 }
                                }}
                              >
                                {autoAssigning === bordereau.id ? '⏳ Assignation...' : '🤖 Auto-assigner'}
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {scanQueue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography 
                          color="text.secondary" 
                          sx={{ 
                            py: { xs: 2, sm: 4 },
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          Aucun bordereau en attente de scan
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid> */}

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
                <Typography><strong>Délai Règlement:</strong> {selectedBordereau.contract?.delaiReglement || selectedBordereau.delaiReglement} jours</Typography>
                <Typography><strong>Chargé de Compte:</strong> {selectedBordereau.client?.gestionnaires?.find((g: any) => g.role === 'CHEF_EQUIPE')?.fullName || 'Non assigné'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Documents ({selectedBordereau.documents?.length || 0})</Typography>
                {selectedBordereau.documents?.map((doc: any) => (
                  <Box key={doc.id} display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip label={doc.type} size="small" />
                    <Typography variant="body2">{doc.name}</Typography>
                    <Chip label={doc.status} color={doc.status === 'TRAITE' ? 'success' : 'default'} size="small" />
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Historique</Typography>
                {selectedBordereau.traitementHistory?.map((history: any, index: number) => (
                  <Typography key={index} variant="body2">
                    {new Date(history.createdAt).toLocaleString()} - {history.action}
                  </Typography>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
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

      {/* Document Type Modal */}
      <DocumentTypeModal
        open={!!selectedDocumentType}
        onClose={() => setSelectedDocumentType(null)}
        documentType={selectedDocumentType?.type || ''}
        documentTypeLabel={selectedDocumentType?.label || ''}
        documentTypeIcon={selectedDocumentType?.icon || ''}
      />

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
    </Box>
  );
};

export default ScanDashboard;