import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, LinearProgress
} from '@mui/material';
import {
  Scanner as ScannerIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { paperStreamService } from '../../services/paperStreamService';
import { PaperStreamStatus, PaperStreamBatch, QuarantinedBatch, PaperStreamAnalytics, PaperStreamConfig } from '../../types/paperstream';
import { useAuth } from '../../contexts/AuthContext';

const PaperStreamDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<PaperStreamStatus | null>(null);
  const [batches, setBatches] = useState<PaperStreamBatch[]>([]);
  const [quarantinedBatches, setQuarantinedBatches] = useState<QuarantinedBatch[]>([]);
  const [analytics, setAnalytics] = useState<PaperStreamAnalytics | null>(null);
  const [config, setConfig] = useState<PaperStreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('7d');
  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusData, batchesData, quarantineData, analyticsData] = await Promise.all([
        paperStreamService.getStatus(),
        paperStreamService.getBatches({ limit: 50 }),
        paperStreamService.getQuarantinedBatches(),
        paperStreamService.getAnalytics(analyticsPeriod)
      ]);
      
      setStatus(statusData);
      setBatches(batchesData);
      setQuarantinedBatches(quarantineData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load PaperStream data');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const configData = await paperStreamService.getConfig();
      setConfig(configData);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadConfig();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [analyticsPeriod]);

  const handleRetryBatch = async (batchId: string) => {
    try {
      await paperStreamService.retryQuarantinedBatch(batchId);
      loadData(); // Refresh data
    } catch (err) {
      console.error('Failed to retry batch:', err);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/export`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'paperstream',
          format: format === 'excel' ? 'xlsx' : format,
          reportData: { analytics, batches, quarantinedBatches }
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `paperstream_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getIngestStatusChip = (status: string) => {
    const config = {
      'PENDING': { label: 'En attente', color: 'warning' },
      'INGESTED': { label: 'Ingéré', color: 'success' },
      'ERROR': { label: 'Erreur', color: 'error' },
      'QUARANTINED': { label: 'Quarantaine', color: 'error' }
    };
    const { label, color } = config[status as keyof typeof config] || { label: status, color: 'default' };
    return <Chip label={label} color={color as any} size="small" />;
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Status Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <ScannerIcon color={status?.watcherActive ? 'success' : 'error'} sx={{ mr: 1 }} />
              <Typography variant="h6">Statut Watcher</Typography>
            </Box>
            <Chip 
              label={status?.watcherActive ? 'Actif' : 'Inactif'} 
              color={status?.watcherActive ? 'success' : 'error'}
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Dernière activité: {status?.lastProcessed ? new Date(status.lastProcessed).toLocaleString() : 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Traités</Typography>
            </Box>
            <Typography variant="h3" color="success.main">
              {status?.totalProcessed || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              lots traités
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <ErrorIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">Quarantaine</Typography>
            </Box>
            <Typography variant="h3" color="error.main">
              {status?.totalQuarantined || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              lots en quarantaine
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Taux de Succès</Typography>
            </Box>
            <Typography variant="h3" color="success.main">
              {status?.successRate?.toFixed(1) || 0}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={status?.successRate || 0} 
              color="success"
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Analytics Chart */}
      {analytics && (
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Tendance de Traitement ({analyticsPeriod})</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.processingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="batches" stroke="#2196f3" name="Lots" />
                <Line type="monotone" dataKey="documents" stroke="#4caf50" name="Documents" />
                <Line type="monotone" dataKey="errors" stroke="#f44336" name="Erreurs" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}

      {/* Error Breakdown */}
      {analytics && (
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Répartition des Erreurs</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.errorBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="type"
                >
                  {analytics.errorBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f44336', '#ff9800', '#ffeb3b', '#9c27b0'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderBatchesTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Lots Traités Récents</Typography>
      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 800 }}>
        <TableHead>
          <TableRow>
            <TableCell>Lot ID</TableCell>
            <TableCell>Opérateur</TableCell>
            <TableCell>Scanner</TableCell>
            <TableCell>Documents</TableCell>
            <TableCell>Pages</TableCell>
            <TableCell>Bordereau</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.batchId}>
              <TableCell>{batch.batchId}</TableCell>
              <TableCell>{batch.operatorId}</TableCell>
              <TableCell>{batch.scannerModel}</TableCell>
              <TableCell>{batch.documents.length}</TableCell>
              <TableCell>{batch.totalPages}</TableCell>
              <TableCell>{batch.bordereauRef || '-'}</TableCell>
              <TableCell>{batch.clientName || '-'}</TableCell>
              <TableCell>{getIngestStatusChip(batch.ingestStatus)}</TableCell>
              <TableCell>{new Date(batch.ingestTimestamp).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </Box>
    </Paper>
  );

  const renderQuarantineTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Lots en Quarantaine</Typography>
      {quarantinedBatches.length === 0 ? (
        <Alert severity="success">Aucun lot en quarantaine</Alert>
      ) : (
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
            <TableRow>
              <TableCell>Lot ID</TableCell>
              <TableCell>Type d'Erreur</TableCell>
              <TableCell>Détails</TableCell>
              <TableCell>Date Quarantaine</TableCell>
              <TableCell>Tentatives</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
            </TableHead>
            <TableBody>
            {quarantinedBatches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.batchId}</TableCell>
                <TableCell>
                  <Chip 
                    label={batch.errorType.replace('_', ' ')} 
                    color="error" 
                    size="small" 
                  />
                </TableCell>
                <TableCell>{batch.errorDetails}</TableCell>
                <TableCell>{new Date(batch.quarantineTimestamp).toLocaleString()}</TableCell>
                <TableCell>{batch.retryCount}</TableCell>
                <TableCell>
                  {batch.canRetry && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => handleRetryBatch(batch.batchId)}
                    >
                      Réessayer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );

  const renderConfigTab = () => (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Configuration PaperStream</Typography>
        {user?.role === 'SUPER_ADMIN' && (
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Modifier
          </Button>
        )}
      </Box>
      
      {config && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Dossiers</Typography>
            <Typography variant="body2">Entrée: {config.inputFolder}</Typography>
            <Typography variant="body2">Traités: {config.processedFolder}</Typography>
            <Typography variant="body2">Quarantaine: {config.quarantineFolder}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Paramètres</Typography>
            <Typography variant="body2">Intervalle surveillance: {config.watchInterval}ms</Typography>
            <Typography variant="body2">Timeout lot: {config.batchTimeout}ms</Typography>
            <Typography variant="body2">Taille max fichier: {(config.maxFileSize / 1024 / 1024).toFixed(1)}MB</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Formats Supportés</Typography>
            <Box>
              {config.supportedFormats.map(format => (
                <Chip key={format} label={format} size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Scanners</Typography>
            <Box>
              {config.scannerModels.map(scanner => (
                <Chip key={scanner} label={scanner} size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={loadData} sx={{ ml: 2 }}>Réessayer</Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4">PaperStream Integration</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={analyticsPeriod}
              onChange={(e) => setAnalyticsPeriod(e.target.value as '7d' | '30d')}
            >
              <MenuItem value="7d">7 jours</MenuItem>
              <MenuItem value="30d">30 jours</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
          >
            Actualiser
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => handleExport('excel')}
          >
            Exporter
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Vue d'ensemble" />
          <Tab label="Lots Traités" />
          <Tab label="Quarantaine" />
          <Tab label="Configuration" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderBatchesTab()}
        {activeTab === 2 && renderQuarantineTab()}
        {activeTab === 3 && renderConfigTab()}
      </Box>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Modifier Configuration PaperStream</DialogTitle>
        <DialogContent>
          {config && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dossier d'entrée"
                  value={config.inputFolder}
                  onChange={(e) => setConfig({...config, inputFolder: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dossier traités"
                  value={config.processedFolder}
                  onChange={(e) => setConfig({...config, processedFolder: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Intervalle surveillance (ms)"
                  value={config.watchInterval}
                  onChange={(e) => setConfig({...config, watchInterval: parseInt(e.target.value)})}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout lot (ms)"
                  value={config.batchTimeout}
                  onChange={(e) => setConfig({...config, batchTimeout: parseInt(e.target.value)})}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              try {
                await paperStreamService.updateConfig(config!);
                setConfigDialogOpen(false);
                loadConfig();
              } catch (err) {
                console.error('Failed to update config:', err);
              }
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaperStreamDashboard;
