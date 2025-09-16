import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Sync,
  CloudDownload,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Settings,
  History,
  Send,
  Visibility,
  Assessment,
  Timeline
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { LocalAPI } from '../services/axios';

interface SyncStatus {
  lastSync: string | null;
  lastResult: { imported: number; errors: number } | null;
  isHealthy: boolean | null;
  logs: Array<{
    date: string;
    imported: number;
    errors: number;
    details?: string;
  }>;
  error?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tuniclaim-tabpanel-${index}`}
      aria-labelledby={`tuniclaim-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TuniclaimManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [pushDialog, setPushDialog] = useState<{ open: boolean; type: 'status' | 'payment' | null }>({ open: false, type: null });
  const [pushData, setPushData] = useState({ bordereauId: '', data: '' });

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/integrations/tuniclaim/status');
      setStatus(response.data);
    } catch (error: any) {
      console.error('Status fetch error:', error);
      setStatus({
        lastSync: null,
        lastResult: null,
        isHealthy: false,
        logs: [],
        error: error.message || 'Erreur de connexion'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await LocalAPI.post('/integrations/tuniclaim/sync');
      const result = response.data;
      
      if (result.success) {
        if (result.errors > 0) {
          alert(`⚠️ ${result.message}`);
        } else {
          alert(`✅ ${result.message}`);
        }
      } else {
        alert(`❌ ${result.message}`);
      }
      
      setTimeout(() => fetchStatus(), 1000);
    } catch (error: any) {
      console.error('Sync error:', error);
      alert('❌ Erreur lors de la synchronisation avec MY TUNICLAIM');
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await LocalAPI.get('/integrations/tuniclaim/test-connection');
      if (response.data.success) {
        alert('✅ Connexion MY TUNICLAIM réussie');
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      alert('❌ Erreur de connexion MY TUNICLAIM');
    } finally {
      setTestingConnection(false);
    }
  };

  const handlePushUpdate = async () => {
    if (!pushData.bordereauId || !pushData.data) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(pushData.data);
      } catch {
        parsedData = { message: pushData.data };
      }

      const endpoint = pushDialog.type === 'status' ? 'push-status' : 'push-payment';
      const response = await LocalAPI.post(`/integrations/tuniclaim/${endpoint}`, {
        bordereauId: pushData.bordereauId,
        [pushDialog.type === 'status' ? 'statusData' : 'paymentData']: parsedData
      });

      if (response.data.success) {
        alert('✅ Mise à jour envoyée avec succès');
        setPushDialog({ open: false, type: null });
        setPushData({ bordereauId: '', data: '' });
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      alert('❌ Erreur lors de l\'envoi de la mise à jour');
    }
  };

  const getHealthStatus = () => {
    if (status?.error) {
      return { color: 'error', text: 'Erreur de connexion', icon: <Error /> };
    }
    if (status?.isHealthy === null) {
      return { color: 'info', text: 'Aucune synchronisation', icon: <Info /> };
    }
    if (status?.isHealthy === false) {
      return { color: 'warning', text: 'Dernière sync avec erreurs', icon: <Warning /> };
    }
    return { color: 'success', text: 'Fonctionnel', icon: <CheckCircle /> };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const healthStatus = getHealthStatus();

  // Prepare chart data
  const chartData = status?.logs?.slice(0, 10).reverse().map((log, index) => ({
    sync: `Sync ${index + 1}`,
    imported: log.imported,
    errors: log.errors,
    date: formatDate(log.date)
  })) || [];

  if (loading && !status) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          MY TUNICLAIM Integration
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={healthStatus.icon}
            label={healthStatus.text}
            color={healthStatus.color as any}
            variant="outlined"
          />
          {status?.lastSync && (
            <Typography variant="body2" color="text.secondary">
              Dernière sync: {formatDate(status.lastSync)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Connection Error Alert */}
      {status?.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Erreur de connexion MY TUNICLAIM:</strong> {status.error}
        </Alert>
      )}

      {/* Main Actions */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<Sync />}
              onClick={handleSync}
              disabled={syncing || !!status?.error}
              sx={{ minWidth: 200 }}
            >
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={testConnection}
              disabled={testingConnection}
            >
              {testingConnection ? 'Test...' : 'Tester Connexion'}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchStatus}
              disabled={loading}
            >
              Actualiser
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics Cards */}
      {status?.lastResult && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircle color="success" />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {status.lastResult.imported}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bordereaux importés
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Error color="error" />
                  <Box>
                    <Typography variant="h4" color={status.lastResult.errors > 0 ? 'error.main' : 'success.main'}>
                      {status.lastResult.errors}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Erreurs
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assessment color="primary" />
                  <Box>
                    <Typography variant="h4" color="primary.main">
                      {status.lastResult.imported + status.lastResult.errors > 0 
                        ? Math.round((status.lastResult.imported / (status.lastResult.imported + status.lastResult.errors)) * 100)
                        : 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taux de succès
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Timeline color="info" />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {status.logs?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Synchronisations
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Historique" icon={<History />} />
          <Tab label="Graphiques" icon={<Assessment />} />
          <Tab label="Actions" icon={<Send />} />
          <Tab label="Configuration" icon={<Settings />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historique des synchronisations
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Importés</TableCell>
                    <TableCell align="right">Erreurs</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Détails</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {status?.logs?.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(log.date)}</TableCell>
                      <TableCell align="right">
                        <Chip label={log.imported} color="success" size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={log.errors} 
                          color={log.errors > 0 ? 'error' : 'success'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={log.errors > 0 ? <Warning /> : <CheckCircle />}
                          label={log.errors > 0 ? 'Avec erreurs' : 'Succès'}
                          color={log.errors > 0 ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {log.details && (
                          <Tooltip title={log.details}>
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!status?.logs || status.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          Aucun historique disponible
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Évolution des synchronisations
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sync" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="imported" fill="#4caf50" name="Importés" />
                      <Bar dataKey="errors" fill="#f44336" name="Erreurs" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Envoyer mise à jour de statut
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Envoyer une mise à jour de statut vers MY TUNICLAIM pour un bordereau spécifique.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Send />}
                  onClick={() => setPushDialog({ open: true, type: 'status' })}
                  fullWidth
                >
                  Envoyer Statut
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Envoyer mise à jour de paiement
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Envoyer une confirmation de paiement vers MY TUNICLAIM pour un bordereau.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Send />}
                  onClick={() => setPushDialog({ open: true, type: 'payment' })}
                  fullWidth
                >
                  Envoyer Paiement
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuration MY TUNICLAIM
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  URL de l'API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  https://ars.dh-ss.com/login
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Synchronisation automatique
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toutes les heures
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  <strong>Fonctionnalités MY TUNICLAIM:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Synchronisation automatique des bordereaux et BS</li>
                    <li>Détection des doublons et mise à jour intelligente</li>
                    <li>Notifications par email en cas d'erreur</li>
                    <li>Push des mises à jour de statut et paiement</li>
                    <li>Gestion centralisée des réclamations</li>
                    <li>Classification automatique via IA</li>
                    <li>Historique et traçabilité complète</li>
                  </ul>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Push Update Dialog */}
      <Dialog open={pushDialog.open} onClose={() => setPushDialog({ open: false, type: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Envoyer mise à jour {pushDialog.type === 'status' ? 'de statut' : 'de paiement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="ID Bordereau"
              value={pushData.bordereauId}
              onChange={(e) => setPushData({ ...pushData, bordereauId: e.target.value })}
              margin="normal"
              placeholder="Entrez l'ID du bordereau"
            />
            <TextField
              fullWidth
              label={`Données ${pushDialog.type === 'status' ? 'de statut' : 'de paiement'}`}
              value={pushData.data}
              onChange={(e) => setPushData({ ...pushData, data: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              placeholder={pushDialog.type === 'status' 
                ? '{"status": "TRAITE", "processedAt": "2024-01-15T10:30:00Z"}'
                : '{"amount": 1500.00, "paidAt": "2024-01-15T10:30:00Z", "reference": "PAY123"}'
              }
              helperText="Format JSON ou texte simple"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushDialog({ open: false, type: null })}>
            Annuler
          </Button>
          <Button onClick={handlePushUpdate} variant="contained">
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TuniclaimManager;