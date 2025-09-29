import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, Alert,
  Tabs, Tab, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Add, Edit, Delete, Settings, Warning, Error, CheckCircle,
  Schedule, Notifications, Email, Sms
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface SlaThresholds {
  delaiTraitement: number;
  delaiVirement: number;
  delaiReclamation: number;
  seuilAlerte: number;
  seuilCritique: number;
}

interface SlaAlerts {
  emailEnabled: boolean;
  smsEnabled: boolean;
  notificationEnabled: boolean;
  escalationEnabled: boolean;
  escalationDelai: number;
}

interface SlaConfig {
  id: string;
  clientId?: string;
  moduleType: 'GLOBAL' | 'BORDEREAU' | 'VIREMENT' | 'RECLAMATION';
  seuils: SlaThresholds;
  alertes: SlaAlerts;
  active: boolean;
  client?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

const SlaConfigurationTab: React.FC = () => {
  const [configs, setConfigs] = useState<SlaConfig[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [configDialog, setConfigDialog] = useState<{
    open: boolean;
    config?: SlaConfig;
    isEdit: boolean;
  }>({ open: false, isEdit: false });
  const [formData, setFormData] = useState<{
    clientId: string;
    moduleType: string;
    seuils: SlaThresholds;
    alertes: SlaAlerts;
    active: boolean;
  }>({
    clientId: '',
    moduleType: 'GLOBAL',
    seuils: {
      delaiTraitement: 72,
      delaiVirement: 48,
      delaiReclamation: 24,
      seuilAlerte: 70,
      seuilCritique: 90
    },
    alertes: {
      emailEnabled: true,
      smsEnabled: false,
      notificationEnabled: true,
      escalationEnabled: true,
      escalationDelai: 4
    },
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configsRes, clientsRes, alertsRes] = await Promise.all([
        LocalAPI.get('/finance/sla/configurations'),
        LocalAPI.get('/clients'),
        LocalAPI.get('/finance/sla/alerts')
      ]);
      
      setConfigs(configsRes.data);
      setClients(clientsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données SLA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = () => {
    setFormData({
      clientId: '',
      moduleType: 'GLOBAL',
      seuils: {
        delaiTraitement: 72,
        delaiVirement: 48,
        delaiReclamation: 24,
        seuilAlerte: 70,
        seuilCritique: 90
      },
      alertes: {
        emailEnabled: true,
        smsEnabled: false,
        notificationEnabled: true,
        escalationEnabled: true,
        escalationDelai: 4
      },
      active: true
    });
    setConfigDialog({ open: true, isEdit: false });
  };

  const handleEditConfig = (config: SlaConfig) => {
    setFormData({
      clientId: config.clientId || '',
      moduleType: config.moduleType,
      seuils: config.seuils,
      alertes: config.alertes,
      active: config.active
    });
    setConfigDialog({ open: true, config, isEdit: true });
  };

  const handleSaveConfig = async () => {
    try {
      const payload = {
        ...formData,
        clientId: formData.clientId || undefined
      };

      if (configDialog.isEdit && configDialog.config) {
        await LocalAPI.put(`/finance/sla/configurations/${configDialog.config.id}`, payload);
      } else {
        await LocalAPI.post('/finance/sla/configurations', payload);
      }

      setConfigDialog({ open: false, isEdit: false });
      loadData();
    } catch (error: any) {
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration SLA ?')) {
      try {
        await LocalAPI.delete(`/finance/sla/configurations/${id}`);
        loadData();
      } catch (error: any) {
        alert('Erreur: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      await LocalAPI.post('/finance/sla/initialize');
      alert('Configurations par défaut initialisées avec succès');
      loadData();
    } catch (error: any) {
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const getModuleTypeLabel = (type: string) => {
    const labels = {
      'GLOBAL': 'Global',
      'BORDEREAU': 'Bordereau',
      'VIREMENT': 'Virement',
      'RECLAMATION': 'Réclamation'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'OK': return 'success';
      case 'ALERTE': return 'warning';
      case 'CRITIQUE': return 'error';
      case 'DEPASSEMENT': return 'error';
      default: return 'default';
    }
  };

  const renderConfigurationsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Configurations SLA</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={handleInitializeDefaults}
          >
            Initialiser par défaut
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateConfig}
          >
            Nouvelle Configuration
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Configurations Globales */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Configurations Globales</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell>Délai Traitement</TableCell>
                  <TableCell>Délai Virement</TableCell>
                  <TableCell>Seuil Alerte</TableCell>
                  <TableCell>Seuil Critique</TableCell>
                  <TableCell>Alertes</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.filter(c => !c.clientId).map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Chip 
                        label={getModuleTypeLabel(config.moduleType)} 
                        color="primary" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{config.seuils.delaiTraitement}h</TableCell>
                    <TableCell>{config.seuils.delaiVirement}h</TableCell>
                    <TableCell>{config.seuils.seuilAlerte}%</TableCell>
                    <TableCell>{config.seuils.seuilCritique}%</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {config.alertes.emailEnabled && <Email fontSize="small" color="primary" />}
                        {config.alertes.smsEnabled && <Sms fontSize="small" color="primary" />}
                        {config.alertes.notificationEnabled && <Notifications fontSize="small" color="primary" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={config.active ? 'Actif' : 'Inactif'} 
                        color={config.active ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEditConfig(config)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteConfig(config.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Configurations par Client */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Configurations par Client</Typography>
            {configs.filter(c => c.clientId).length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Module</TableCell>
                    <TableCell>Délai Traitement</TableCell>
                    <TableCell>Délai Virement</TableCell>
                    <TableCell>Seuil Alerte</TableCell>
                    <TableCell>Seuil Critique</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs.filter(c => c.clientId).map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>{config.client?.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getModuleTypeLabel(config.moduleType)} 
                          color="secondary" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{config.seuils.delaiTraitement}h</TableCell>
                      <TableCell>{config.seuils.delaiVirement}h</TableCell>
                      <TableCell>{config.seuils.seuilAlerte}%</TableCell>
                      <TableCell>{config.seuils.seuilCritique}%</TableCell>
                      <TableCell>
                        <Chip 
                          label={config.active ? 'Actif' : 'Inactif'} 
                          color={config.active ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditConfig(config)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteConfig(config.id)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="info">
                Aucune configuration spécifique par client. Les configurations globales s'appliquent.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderAlertsTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Alertes SLA en Temps Réel</Typography>
      
      {alerts.length > 0 ? (
        <Grid container spacing={2}>
          {alerts.map((alert, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card 
                sx={{ 
                  borderLeft: 4, 
                  borderColor: alert.level === 'DEPASSEMENT' ? 'error.main' : 
                              alert.level === 'CRITIQUE' ? 'error.main' : 
                              'warning.main'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" color={getAlertLevelColor(alert.level) + '.main'}>
                        {alert.level === 'DEPASSEMENT' ? 'SLA Dépassé' : 
                         alert.level === 'CRITIQUE' ? 'SLA Critique' : 'SLA Alerte'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {alert.type === 'BORDEREAU_SLA' ? 'Bordereau' : 'Virement'}: {alert.reference}
                      </Typography>
                      <Typography variant="body2">
                        Client: {alert.client}
                      </Typography>
                      <Typography variant="body2">
                        Progression: {alert.pourcentage}%
                      </Typography>
                      {alert.heuresRestantes > 0 ? (
                        <Typography variant="body2" color="warning.main">
                          Temps restant: {Math.round(alert.heuresRestantes)}h
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error.main">
                          Dépassement: {Math.abs(Math.round(alert.heuresRestantes))}h
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      {alert.level === 'DEPASSEMENT' ? <Error color="error" /> :
                       alert.level === 'CRITIQUE' ? <Warning color="error" /> :
                       <Schedule color="warning" />}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="success" icon={<CheckCircle />}>
          Aucune alerte SLA active. Tous les processus respectent les délais configurés.
        </Alert>
      )}
    </Box>
  );

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Configuration SLA (Service Level Agreement)
        </Typography>
        
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
          <Tab label="Configurations" />
          <Tab label={`Alertes (${alerts.length})`} />
        </Tabs>

        {selectedTab === 0 && renderConfigurationsTab()}
        {selectedTab === 1 && renderAlertsTab()}
      </Paper>

      {/* Dialog de Configuration */}
      <Dialog 
        open={configDialog.open} 
        onClose={() => setConfigDialog({ open: false, isEdit: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {configDialog.isEdit ? 'Modifier' : 'Créer'} Configuration SLA
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  label="Client"
                >
                  <MenuItem value="">Global (tous les clients)</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Module</InputLabel>
                <Select
                  value={formData.moduleType}
                  onChange={(e) => setFormData({ ...formData, moduleType: e.target.value })}
                  label="Module"
                >
                  <MenuItem value="GLOBAL">Global</MenuItem>
                  <MenuItem value="BORDEREAU">Bordereau</MenuItem>
                  <MenuItem value="VIREMENT">Virement</MenuItem>
                  <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle2">Seuils de Délais (en heures)</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Délai Traitement"
                value={formData.seuils.delaiTraitement}
                onChange={(e) => setFormData({
                  ...formData,
                  seuils: { ...formData.seuils, delaiTraitement: parseInt(e.target.value) }
                })}
                helperText="Délai maximum pour traiter un dossier"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Délai Virement"
                value={formData.seuils.delaiVirement}
                onChange={(e) => setFormData({
                  ...formData,
                  seuils: { ...formData.seuils, delaiVirement: parseInt(e.target.value) }
                })}
                helperText="Délai maximum pour exécuter un virement"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Délai Réclamation"
                value={formData.seuils.delaiReclamation}
                onChange={(e) => setFormData({
                  ...formData,
                  seuils: { ...formData.seuils, delaiReclamation: parseInt(e.target.value) }
                })}
                helperText="Délai maximum pour traiter une réclamation"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Seuil Alerte (%)"
                value={formData.seuils.seuilAlerte}
                onChange={(e) => setFormData({
                  ...formData,
                  seuils: { ...formData.seuils, seuilAlerte: parseInt(e.target.value) }
                })}
                helperText="% du délai pour déclencher une alerte"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Seuil Critique (%)"
                value={formData.seuils.seuilCritique}
                onChange={(e) => setFormData({
                  ...formData,
                  seuils: { ...formData.seuils, seuilCritique: parseInt(e.target.value) }
                })}
                helperText="% du délai pour déclencher une alerte critique"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle2">Configuration des Alertes</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.alertes.emailEnabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      alertes: { ...formData.alertes, emailEnabled: e.target.checked }
                    })}
                  />
                }
                label="Alertes Email"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.alertes.smsEnabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      alertes: { ...formData.alertes, smsEnabled: e.target.checked }
                    })}
                  />
                }
                label="Alertes SMS"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.alertes.notificationEnabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      alertes: { ...formData.alertes, notificationEnabled: e.target.checked }
                    })}
                  />
                }
                label="Notifications Système"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.alertes.escalationEnabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      alertes: { ...formData.alertes, escalationEnabled: e.target.checked }
                    })}
                  />
                }
                label="Escalade Automatique"
              />
            </Grid>

            {formData.alertes.escalationEnabled && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Délai Escalade (heures)"
                  value={formData.alertes.escalationDelai}
                  onChange={(e) => setFormData({
                    ...formData,
                    alertes: { ...formData.alertes, escalationDelai: parseInt(e.target.value) }
                  })}
                  helperText="Heures après dépassement pour escalader"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                }
                label="Configuration Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog({ open: false, isEdit: false })}>
            Annuler
          </Button>
          <Button onClick={handleSaveConfig} variant="contained">
            {configDialog.isEdit ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SlaConfigurationTab;