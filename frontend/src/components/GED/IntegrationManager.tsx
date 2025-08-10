import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material';
import {
  Add,
  Sync,
  Settings,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Webhook,
  Api,
  Cloud,
  Storage
} from '@mui/icons-material';
import { fetchIntegrationConnectors, testConnector, syncConnector, fetchWebhookSubscriptions, getIntegrationStats } from '../../services/gedService';

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
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const IntegrationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [testingConnector, setTestingConnector] = useState<string | null>(null);
  const [syncingConnector, setSyncingConnector] = useState<string | null>(null);
  const [newConnector, setNewConnector] = useState({
    name: '',
    type: 'rest',
    config: {},
    active: true
  });
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [],
    secret: '',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [connectorsData, webhooksData, statsData] = await Promise.all([
        fetchIntegrationConnectors(),
        fetchWebhookSubscriptions(),
        getIntegrationStats()
      ]);
      setConnectors(connectorsData);
      setWebhooks(webhooksData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load integration data:', error);
    }
  };

  const handleTestConnector = async (connectorId: string) => {
    setTestingConnector(connectorId);
    try {
      const result = await testConnector(connectorId);
      alert(result.success ? 'Test réussi!' : `Test échoué: ${result.message}`);
    } catch (error) {
      alert('Erreur lors du test');
    } finally {
      setTestingConnector(null);
    }
  };

  const handleSyncConnector = async (connectorId: string) => {
    setSyncingConnector(connectorId);
    try {
      const result = await syncConnector(connectorId);
      alert(`Synchronisation terminée: ${result.documentsProcessed} documents traités`);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la synchronisation');
    } finally {
      setSyncingConnector(null);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle color="success" />;
      case 'disconnected': return <Warning color="action" />;
      case 'error': return <Error color="error" />;
      default: return <Warning color="action" />;
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'rest': return <Api />;
      case 'ftp': return <Storage />;
      case 'email': return <Cloud />;
      default: return <Cloud />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Gestion des Intégrations
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Connecteurs Actifs
              </Typography>
              <Typography variant="h4" component="div">
                {connectors.filter(c => c.active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Syncs (24h)
              </Typography>
              <Typography variant="h4" component="div">
                {stats?.totalSyncs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Documents Traités
              </Typography>
              <Typography variant="h4" component="div">
                {stats?.documentsProcessed || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Taux de Succès
              </Typography>
              <Typography variant="h4" component="div">
                {stats ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="integration tabs">
            <Tab label="Connecteurs" />
            <Tab label="Webhooks" />
            <Tab label="APIs" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Connectors Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Connecteurs Tiers
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setConnectorDialogOpen(true)}
            >
              Nouveau Connecteur
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Dernière Sync</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectors.map((connector) => (
                  <TableRow key={connector.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getConnectorIcon(connector.type)}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {connector.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={connector.type.toUpperCase()} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(connector.status)}
                        <Chip
                          label={connector.status}
                          color={getStatusColor(connector.status) as any}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {connector.lastSync 
                        ? new Date(connector.lastSync).toLocaleString()
                        : 'Jamais'
                      }
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleTestConnector(connector.id)}
                          disabled={testingConnector === connector.id}
                        >
                          {testingConnector === connector.id ? (
                            <LinearProgress sx={{ width: 20 }} />
                          ) : (
                            <CheckCircle />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleSyncConnector(connector.id)}
                          disabled={syncingConnector === connector.id || !connector.active}
                        >
                          {syncingConnector === connector.id ? (
                            <LinearProgress sx={{ width: 20 }} />
                          ) : (
                            <Sync />
                          )}
                        </IconButton>
                        <IconButton size="small">
                          <Settings />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Webhooks Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Notifications Webhook
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setWebhookDialogOpen(true)}
            >
              Nouveau Webhook
            </Button>
          </Box>

          <List>
            {webhooks.map((webhook) => (
              <ListItem
                key={webhook.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemIcon>
                  <Webhook color={webhook.active ? 'primary' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary={webhook.url}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Événements: {webhook.events.join(', ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tentatives max: {webhook.retryPolicy.maxRetries} | 
                        Multiplicateur: {webhook.retryPolicy.backoffMultiplier}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={webhook.active ? 'Actif' : 'Inactif'}
                    color={webhook.active ? 'success' : 'default'}
                    size="small"
                  />
                  <IconButton size="small">
                    <Settings />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Delete />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* APIs Tab */}
          <Typography variant="h6" gutterBottom>
            Points d'Accès API
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Les APIs permettent aux systèmes tiers d'accéder aux documents et workflows.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API REST Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Accès complet aux documents avec authentification par token
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip label="GET /api/v1/documents" size="small" />
                    <Chip label="POST /api/v1/documents" size="small" />
                    <Chip label="PUT /api/v1/documents/{id}" size="small" />
                  </Box>
                  <Button variant="outlined" size="small">
                    Voir Documentation
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Recherche
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Recherche avancée dans les documents avec filtres
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip label="POST /api/v1/search" size="small" />
                    <Chip label="GET /api/v1/search/suggestions" size="small" />
                  </Box>
                  <Button variant="outlined" size="small">
                    Voir Documentation
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    API Workflows
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Gestion des workflows et tâches d'approbation
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip label="POST /api/v1/workflows/start" size="small" />
                    <Chip label="PUT /api/v1/workflows/{id}/complete" size="small" />
                  </Box>
                  <Button variant="outlined" size="small">
                    Voir Documentation
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Clés API
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Gestion des clés d'authentification pour les intégrations
                  </Typography>
                  <Button variant="contained" size="small">
                    Générer Nouvelle Clé
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create Connector Dialog */}
      <Dialog open={connectorDialogOpen} onClose={() => setConnectorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Connecteur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du connecteur"
                value={newConnector.name}
                onChange={(e) => setNewConnector(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newConnector.type}
                  label="Type"
                  onChange={(e) => setNewConnector(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="rest">REST API</MenuItem>
                  <MenuItem value="ftp">FTP</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="webhook">Webhook</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newConnector.active}
                    onChange={(e) => setNewConnector(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Connecteur actif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectorDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!newConnector.name}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onClose={() => setWebhookDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Webhook</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL du webhook"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Secret (optionnel)"
                value={newWebhook.secret}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="Clé secrète pour la signature"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newWebhook.active}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Webhook actif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!newWebhook.url}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationManager;