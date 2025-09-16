import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CloudSync,
  AutoFixHigh,
  Timeline,
  Notifications,
  Psychology,
  Send,
  TrendingUp,
  Assignment,
  Escalator,
  Visibility,
  Refresh,
  FilterList
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LocalAPI } from '../../services/axios';

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
      id={`tuniclaim-reclamations-tabpanel-${index}`}
      aria-labelledby={`tuniclaim-reclamations-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TuniclaimReclamationsPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reclamations, setReclamations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [selectedReclamation, setSelectedReclamation] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: string | null; reclamation: any }>({ 
    open: false, 
    type: null, 
    reclamation: null 
  });

  useEffect(() => {
    loadCentralizedReclamations();
    loadAnomalyDetection();
  }, []);

  const loadCentralizedReclamations = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/reclamations/tuniclaim/centralized');
      setReclamations(response.data.reclamations || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to load centralized reclamations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalyDetection = async () => {
    try {
      const response = await LocalAPI.get('/reclamations/tuniclaim/anomaly-detection?period=30d');
      setAnomalies(response.data);
    } catch (error) {
      console.error('Failed to load anomaly detection:', error);
    }
  };

  const handleClassifyReclamation = async (reclamationId: string) => {
    try {
      const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/classify`);
      if (response.data.success) {
        alert('✅ Classification automatique terminée');
        loadCentralizedReclamations();
      }
    } catch (error) {
      alert('❌ Erreur lors de la classification');
    }
  };

  const handleSetupNotifications = async (reclamationId: string) => {
    try {
      const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/setup-notifications`, {
        slaAlerts: true,
        escalationAlerts: true
      });
      if (response.data.success) {
        alert('✅ Notifications automatiques configurées');
      }
    } catch (error) {
      alert('❌ Erreur lors de la configuration des notifications');
    }
  };

  const handleGenerateAutoResponse = async (reclamationId: string) => {
    try {
      const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/auto-response`);
      if (response.data.success) {
        setActionDialog({
          open: true,
          type: 'auto-response',
          reclamation: { id: reclamationId, response: response.data.response }
        });
      }
    } catch (error) {
      alert('❌ Erreur lors de la génération de la réponse automatique');
    }
  };

  const handleEscalateReclamation = async (reclamationId: string, type: 'AUTO' | 'MANUAL' = 'AUTO') => {
    try {
      const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/escalate`, { type });
      if (response.data.success) {
        alert('✅ Réclamation escaladée avec succès');
        loadCentralizedReclamations();
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'escalade');
    }
  };

  const handleViewCompleteHistory = async (reclamationId: string) => {
    try {
      const response = await LocalAPI.get(`/reclamations/${reclamationId}/tuniclaim/complete-history`);
      setSelectedReclamation(response.data);
      setActionDialog({
        open: true,
        type: 'history',
        reclamation: response.data
      });
    } catch (error) {
      alert('❌ Erreur lors du chargement de l\'historique');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HAUTE': return 'error';
      case 'MOYENNE': return 'warning';
      case 'BASSE': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'ESCALATED': return 'error';
      default: return 'default';
    }
  };

  // Prepare chart data
  const chartData = anomalies?.patterns ? [
    { name: 'Financière', value: anomalies.patterns.byType.FINANCIERE || 0 },
    { name: 'Documentaire', value: anomalies.patterns.byType.DOCUMENTAIRE || 0 },
    { name: 'Délai', value: anomalies.patterns.byType.DELAI || 0 },
    { name: 'Autre', value: anomalies.patterns.byType.AUTRE || 0 }
  ] : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          MY TUNICLAIM - Gestion des Réclamations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Interface centralisée pour la gestion intelligente des réclamations avec IA
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assignment color="primary" />
                  <Box>
                    <Typography variant="h4" color="primary.main">
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Notifications color="info" />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {stats.open}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ouvertes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUp color="warning" />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {stats.inProgress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      En cours
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Psychology color="success" />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {stats.resolved}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Résolues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Escalator color="error" />
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {stats.highPriority}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Priorité haute
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Actions */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadCentralizedReclamations}
              disabled={loading}
            >
              Actualiser
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Psychology />}
              onClick={loadAnomalyDetection}
            >
              Analyser Anomalies
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Réclamations" icon={<Assignment />} />
          <Tab label="Analyse IA" icon={<Psychology />} />
          <Tab label="Notifications" icon={<Notifications />} />
          <Tab label="Escalades" icon={<Escalator />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Réclamations MY TUNICLAIM
            </Typography>
            {loading ? (
              <LinearProgress />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Sévérité</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reclamations.map((reclamation) => (
                      <TableRow key={reclamation.id}>
                        <TableCell>{reclamation.id.slice(-8)}</TableCell>
                        <TableCell>{reclamation.client?.name || 'N/A'}</TableCell>
                        <TableCell>{reclamation.type}</TableCell>
                        <TableCell>
                          <Chip
                            label={reclamation.severity}
                            color={getSeverityColor(reclamation.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={reclamation.status}
                            color={getStatusColor(reclamation.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(reclamation.createdAt)}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Classification IA">
                              <IconButton
                                size="small"
                                onClick={() => handleClassifyReclamation(reclamation.id)}
                              >
                                <AutoFixHigh />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Réponse automatique">
                              <IconButton
                                size="small"
                                onClick={() => handleGenerateAutoResponse(reclamation.id)}
                              >
                                <Send />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Historique complet">
                              <IconButton
                                size="small"
                                onClick={() => handleViewCompleteHistory(reclamation.id)}
                              >
                                <Timeline />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Escalader">
                              <IconButton
                                size="small"
                                onClick={() => handleEscalateReclamation(reclamation.id)}
                              >
                                <Escalator />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reclamations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary">
                            Aucune réclamation MY TUNICLAIM trouvée
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Répartition par type
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Anomalies détectées
                </Typography>
                {anomalies?.anomalies?.length > 0 ? (
                  <Box>
                    {anomalies.anomalies.map((anomaly: any, index: number) => (
                      <Alert key={index} severity="warning" sx={{ mb: 2 }}>
                        <strong>{anomaly.type}:</strong> {anomaly.client && `Client ${anomaly.client} - `}
                        {anomaly.count} occurrences (seuil: {anomaly.threshold})
                      </Alert>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    Aucune anomalie détectée
                  </Typography>
                )}
                
                {anomalies?.recommendations?.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Recommandations:
                    </Typography>
                    {anomalies.recommendations.map((rec: any, index: number) => (
                      <Alert key={index} severity="info" sx={{ mb: 1 }}>
                        {rec.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuration des notifications automatiques
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configurez les notifications automatiques pour les réclamations MY TUNICLAIM
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  <strong>Notifications SLA:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Alerte à 75% du délai SLA</li>
                    <li>Alerte de dépassement SLA</li>
                    <li>Escalade automatique après dépassement</li>
                  </ul>
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Alert severity="success">
                  <strong>Relances automatiques:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Relance client après 24h sans réponse</li>
                    <li>Relance équipe après 48h</li>
                    <li>Escalade manager après 72h</li>
                  </ul>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workflow d'escalade hiérarchique
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Gestion automatique des escalades selon les règles définies
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="warning">
                  <strong>Règles d'escalade automatique:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Réclamations haute priorité: escalade immédiate au chef d'équipe</li>
                    <li>Dépassement SLA: escalade automatique au responsable</li>
                    <li>Réclamations récurrentes: escalade au super admin</li>
                    <li>Anomalies détectées: notification immédiate</li>
                  </ul>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Action Dialogs */}
      <Dialog 
        open={actionDialog.open} 
        onClose={() => setActionDialog({ open: false, type: null, reclamation: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'auto-response' && 'Réponse automatique générée'}
          {actionDialog.type === 'history' && 'Historique complet'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.type === 'auto-response' && actionDialog.reclamation?.response && (
            <Box>
              <TextField
                fullWidth
                label="Sujet"
                value={actionDialog.reclamation.response.subject}
                margin="normal"
                InputProps={{ readOnly: true }}
              />
              <TextField
                fullWidth
                label="Corps du message"
                value={actionDialog.reclamation.response.body}
                margin="normal"
                multiline
                rows={4}
                InputProps={{ readOnly: true }}
              />
              <TextField
                fullWidth
                label="Email destinataire"
                value={actionDialog.reclamation.response.recipientEmail}
                margin="normal"
                InputProps={{ readOnly: true }}
              />
            </Box>
          )}
          
          {actionDialog.type === 'history' && actionDialog.reclamation?.timeline && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Timeline des événements
              </Typography>
              {actionDialog.reclamation.timeline.map((event: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary">
                    {event.event}
                  </Typography>
                  <Typography variant="body2">
                    {event.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(event.date)} - {event.user}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: null, reclamation: null })}>
            Fermer
          </Button>
          {actionDialog.type === 'auto-response' && (
            <Button variant="contained">
              Envoyer Réponse
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TuniclaimReclamationsPanel;