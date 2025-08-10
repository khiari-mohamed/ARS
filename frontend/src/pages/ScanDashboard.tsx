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
import { fetchScanStatus, fetchScanActivity, initializeScanners } from '../services/scanService';

const ScanDashboard: React.FC = () => {
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [scanActivity, setScanActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [initializingScanner, setInitializingScanner] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [statusData, activityData] = await Promise.all([
        fetchScanStatus(),
        fetchScanActivity()
      ]);
      setScanStatus(statusData);
      setScanActivity(activityData);
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
      case 'SCAN_JOB_STARTED': return <PlayArrow color="primary" />;
      case 'DOCUMENT_READY': return <CheckCircle color="success" />;
      case 'SCAN_ERROR': return <Error color="error" />;
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          SCAN Service Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={handleInitializeScanner}
            disabled={initializingScanner}
            sx={{ minWidth: 140 }}
          >
            {initializingScanner ? 'Initialisation...' : 'Initialiser'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Scanner />}
            onClick={() => setActiveDialog('scanner')}
            sx={{ minWidth: 140 }}
          >
            Contrôle Scanner
          </Button>
          <Button
            variant="outlined"
            startIcon={< AutoFixHigh />}
            onClick={() => setActiveDialog('quality')}
            sx={{ minWidth: 140 }}
          >
            Validation Qualité
          </Button>
          <Button
            variant="outlined"
            startIcon={<TextFields />}
            onClick={() => setActiveDialog('ocr')}
            sx={{ minWidth: 140 }}
          >
            Correction OCR
          </Button>
        </Box>
      </Box>

      {/* Status Alert */}
      {scanStatus?.errorCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {scanStatus.errorCount} document(s) en erreur nécessitent une attention
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
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

      <Grid container spacing={3}>
        {/* Folder Monitor */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Surveillance des Dossiers
            </Typography>
            <FolderMonitor onFileProcessed={loadDashboard} />
          </Paper>
        </Grid>

        {/* Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Activité de Scan (24h)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scanActivity.slice(-24)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <RechartsTooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Activité Récente
              </Typography>
              <IconButton onClick={loadDashboard}>
                <Refresh />
              </IconButton>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Heure</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Détails</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanActivity.slice(0, 10).map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getActivityIcon(activity.action)}
                          {activity.action.replace('_', ' ')}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {activity.details?.fileName || activity.details?.scannerId || '--'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={activity.details?.status || 'Completed'}
                          color={getStatusColor(activity.details?.status || 'ready') as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Voir Détails">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {scanActivity.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          Aucune activité récente
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
    </Box>
  );
};

export default ScanDashboard;