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
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Timer,
  Warning,
  Error,
  CheckCircle
} from '@mui/icons-material';
import { fetchSLAConfigurations, createSLAConfiguration, updateSLAConfiguration, deleteSLAConfiguration } from '../services/superAdminService';

interface SLAConfiguration {
  id: string;
  name: string;
  clientId?: string;
  documentType: string;
  thresholds: {
    warning: number;
    critical: number;
    breach: number;
  };
  active: boolean;
}

const SLAConfigurationInterface: React.FC = () => {
  const [slaConfigs, setSlaConfigs] = useState<SLAConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SLAConfiguration | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    documentType: 'BS',
    thresholds: {
      warning: 5,
      critical: 7,
      breach: 10
    },
    active: true
  });

  useEffect(() => {
    loadSLAConfigurations();
  }, []);

  const loadSLAConfigurations = async () => {
    try {
      const data = await fetchSLAConfigurations();
      setSlaConfigs(data);
    } catch (error) {
      console.error('Failed to load SLA configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      clientId: '',
      documentType: 'BS',
      thresholds: {
        warning: 5,
        critical: 7,
        breach: 10
      },
      active: true
    });
    setDialogOpen(true);
  };

  const handleEditConfig = (config: SLAConfiguration) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      clientId: config.clientId || '',
      documentType: config.documentType,
      thresholds: config.thresholds,
      active: config.active
    });
    setDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      if (editingConfig) {
        await updateSLAConfiguration(editingConfig.id, formData);
      } else {
        await createSLAConfiguration(formData);
      }
      await loadSLAConfigurations();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save SLA configuration:', error);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration SLA ?')) {
      try {
        await deleteSLAConfiguration(configId);
        await loadSLAConfigurations();
      } catch (error) {
        console.error('Failed to delete SLA configuration:', error);
      }
    }
  };

  const updateThreshold = (type: 'warning' | 'critical' | 'breach', value: number) => {
    setFormData(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [type]: value
      }
    }));
  };

  const getThresholdColor = (type: string) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'breach': return 'error';
      default: return 'default';
    }
  };

  const validateThresholds = () => {
    const { warning, critical, breach } = formData.thresholds;
    return warning < critical && critical < breach;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Configuration des SLA
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateConfig}
        >
          Nouvelle Configuration SLA
        </Button>
      </Box>

      {/* SLA Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Configurations Actives
                  </Typography>
                  <Typography variant="h4" component="div">
                    {slaConfigs.filter(c => c.active).length}
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
                    Total Configurations
                  </Typography>
                  <Typography variant="h4" component="div">
                    {slaConfigs.length}
                  </Typography>
                </Box>
                <Timer color="primary" sx={{ fontSize: 40 }} />
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
                    SLA Moyen Alerte
                  </Typography>
                  <Typography variant="h4" component="div">
                    {slaConfigs.length > 0 ? 
                      Math.round(slaConfigs.reduce((sum, c) => sum + c.thresholds.warning, 0) / slaConfigs.length) 
                      : 0}j
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
                    SLA Moyen Critique
                  </Typography>
                  <Typography variant="h4" component="div">
                    {slaConfigs.length > 0 ? 
                      Math.round(slaConfigs.reduce((sum, c) => sum + c.thresholds.critical, 0) / slaConfigs.length) 
                      : 0}j
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SLA Configurations Table */}
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Type Document</TableCell>
              <TableCell>Client</TableCell>
              <TableCell align="center">Alerte (j)</TableCell>
              <TableCell align="center">Critique (j)</TableCell>
              <TableCell align="center">Dépassement (j)</TableCell>
              <TableCell align="center">Statut</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slaConfigs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {config.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={config.documentType} size="small" />
                </TableCell>
                <TableCell>
                  {config.clientId ? (
                    <Chip label={config.clientId} color="primary" size="small" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Tous clients
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={config.thresholds.warning}
                    color="warning"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={config.thresholds.critical}
                    color="error"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={config.thresholds.breach}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={config.active ? 'Actif' : 'Inactif'}
                    color={config.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditConfig(config)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteConfig(config.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Configuration Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Modifier Configuration SLA' : 'Nouvelle Configuration SLA'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom de la configuration"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de document</InputLabel>
                <Select
                  value={formData.documentType}
                  label="Type de document"
                  onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                >
                  <MenuItem value="BS">Bulletin de Soin</MenuItem>
                  <MenuItem value="BS_URGENT">BS Urgent</MenuItem>
                  <MenuItem value="CONTRAT">Contrat</MenuItem>
                  <MenuItem value="FACTURE">Facture</MenuItem>
                  <MenuItem value="ALL">Tous types</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID Client spécifique (optionnel)"
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Laisser vide pour tous les clients"
              />
            </Grid>

            {/* Thresholds Configuration */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Seuils SLA (en jours)
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Seuil d'alerte"
                type="number"
                value={formData.thresholds.warning}
                onChange={(e) => updateThreshold('warning', parseInt(e.target.value))}
                inputProps={{ min: 1 }}
                helperText="Première alerte"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Seuil critique"
                type="number"
                value={formData.thresholds.critical}
                onChange={(e) => updateThreshold('critical', parseInt(e.target.value))}
                inputProps={{ min: 1 }}
                helperText="Escalade critique"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Seuil de dépassement"
                type="number"
                value={formData.thresholds.breach}
                onChange={(e) => updateThreshold('breach', parseInt(e.target.value))}
                inputProps={{ min: 1 }}
                helperText="Dépassement SLA"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Configuration active"
              />
            </Grid>
          </Grid>

          {!validateThresholds() && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Les seuils doivent être dans l'ordre croissant : Alerte &lt; Critique &lt; Dépassement
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Fonctionnement des seuils :</strong><br/>
              • <strong>Alerte</strong> : Notification préventive<br/>
              • <strong>Critique</strong> : Escalade vers le management<br/>
              • <strong>Dépassement</strong> : Violation officielle du SLA
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained"
            disabled={!formData.name || !validateThresholds()}
          >
            {editingConfig ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SLAConfigurationInterface;