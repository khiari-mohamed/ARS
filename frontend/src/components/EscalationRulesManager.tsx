import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Person,
  Email,
  Sms,
  Notifications
} from '@mui/icons-material';

const EscalationRulesManager: React.FC = () => {
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    alertType: '',
    severity: '',
    escalationPath: [] as Array<{
      level: number;
      delayMinutes: number;
      recipients: string[];
      stopOnAcknowledge: boolean;
    }>,
    active: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();

  // Fetch escalation rules
  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/escalation/rules');
      return response.data;
    }
  });

  // Fetch active escalations
  const { data: activeEscalations = [] } = useQuery({
    queryKey: ['active-escalations'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/escalation/active');
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch escalation metrics
  const { data: metrics } = useQuery({
    queryKey: ['escalation-metrics'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/escalation/metrics');
      return response.data;
    }
  });

  // Create escalation rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const response = await LocalAPI.post('/alerts/escalation/rules', ruleData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setSnackbar({ open: true, message: 'Règle créée avec succès', severity: 'success' });
      setRuleDialog(false);
      setNewRule({
        name: '',
        alertType: '',
        severity: '',
        escalationPath: [],
        active: true
      });
      setActiveStep(0);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Erreur lors de la création', severity: 'error' });
    }
  });

  // Delete escalation rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await LocalAPI.delete(`/alerts/escalation/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setSnackbar({ open: true, message: 'Règle supprimée avec succès', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
    }
  });

  // Toggle rule status mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, active }: { ruleId: string; active: boolean }) => {
      await LocalAPI.patch(`/alerts/escalation/rules/${ruleId}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setSnackbar({ open: true, message: 'Statut mis à jour', severity: 'success' });
    }
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ ruleId, ruleData }: { ruleId: string; ruleData: any }) => {
      await LocalAPI.patch(`/alerts/escalation/rules/${ruleId}`, ruleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setSnackbar({ open: true, message: 'Règle mise à jour avec succès', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Erreur lors de la mise à jour', severity: 'error' });
    }
  });

  const handleCreateRule = async () => {
    createRuleMutation.mutate(newRule);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  const handleToggleRule = (ruleId: string, currentStatus: boolean) => {
    toggleRuleMutation.mutate({ ruleId, active: !currentStatus });
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      alertType: rule.alertType,
      severity: rule.severity,
      escalationPath: Array.isArray(rule.escalationPath) ? rule.escalationPath : [],
      active: rule.active
    });
    setEditDialog(true);
    setActiveStep(0);
  };

  const handleUpdateRule = () => {
    if (editingRule) {
      updateRuleMutation.mutate({ 
        ruleId: editingRule.id, 
        ruleData: newRule 
      });
      setEditDialog(false);
      setEditingRule(null);
      setNewRule({
        name: '',
        alertType: '',
        severity: '',
        escalationPath: [],
        active: true
      });
      setActiveStep(0);
    }
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      alertType: '',
      severity: '',
      escalationPath: [],
      active: true
    });
    setActiveStep(0);
    setEditingRule(null);
  };

  const addEscalationStep = () => {
    setNewRule(prev => ({
      ...prev,
      escalationPath: [
        ...prev.escalationPath,
        {
          level: prev.escalationPath.length + 1,
          delayMinutes: 30,
          recipients: [],
          stopOnAcknowledge: false
        }
      ]
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Moteur de Règles d'Escalade
      </Typography>

      {metrics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Escalades Totales
                </Typography>
                <Typography variant="h4" component="div">
                  {metrics.totalEscalations}
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
                  {metrics.successRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Temps Moyen
                </Typography>
                <Typography variant="h4" component="div">
                  {metrics.avgEscalationTime.toFixed(1)}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Escalades Actives
                </Typography>
                <Typography variant="h4" component="div">
                  {activeEscalations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Règles d'Escalade ({rules.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setRuleDialog(true)}
                >
                  Nouvelle Règle
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Type d'Alerte</TableCell>
                      <TableCell>Sévérité</TableCell>
                      <TableCell>Niveaux</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {rule.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{rule.alertType}</TableCell>
                        <TableCell>
                          <Chip
                            label={rule.severity}
                            color={getSeverityColor(rule.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{Array.isArray(rule.escalationPath) ? rule.escalationPath.length : 0} niveaux</TableCell>
                        <TableCell>
                          <Chip
                            label={rule.active ? 'Actif' : 'Inactif'}
                            color={rule.active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton 
                              size="small"
                              onClick={() => handleEditRule(rule)}
                              color="primary"
                              title="Modifier"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteRule(rule.id)}
                              disabled={deleteRuleMutation.isLoading}
                              title="Supprimer"
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Escalades en Cours
              </Typography>
              
              <List>
                {activeEscalations.map((escalation: any) => (
                  <ListItem key={escalation.id}>
                    <ListItemIcon>
                      <PlayArrow color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Niveau ${escalation.currentLevel + 1}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Alerte: {escalation.alertId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Démarré: {new Date(escalation.startedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>

              {activeEscalations.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  Aucune escalade en cours
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Rule Dialog */}
      <Dialog open={ruleDialog} onClose={() => { setRuleDialog(false); resetForm(); }} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle Règle d'Escalade</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Configuration de Base</StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nom de la règle"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type d'Alerte</InputLabel>
                      <Select
                        value={newRule.alertType}
                        label="Type d'Alerte"
                        onChange={(e) => setNewRule(prev => ({ ...prev, alertType: e.target.value }))}
                      >
                        <MenuItem value="SLA_BREACH">Dépassement SLA</MenuItem>
                        <MenuItem value="SYSTEM_DOWN">Système Indisponible</MenuItem>
                        <MenuItem value="HIGH_VOLUME">Volume Élevé</MenuItem>
                        <MenuItem value="PROCESSING_DELAY">Retard de Traitement</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Sévérité</InputLabel>
                      <Select
                        value={newRule.severity}
                        label="Sévérité"
                        onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value }))}
                      >
                        <MenuItem value="low">Basse</MenuItem>
                        <MenuItem value="medium">Moyenne</MenuItem>
                        <MenuItem value="high">Haute</MenuItem>
                        <MenuItem value="critical">Critique</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newRule.active}
                          onChange={(e) => setNewRule(prev => ({ ...prev, active: e.target.checked }))}
                        />
                      }
                      label="Règle active"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mb: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!newRule.name || !newRule.alertType || !newRule.severity}
                  >
                    Continuer
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Chemin d'Escalade</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addEscalationStep}
                    sx={{ mb: 2 }}
                  >
                    Ajouter un Niveau
                  </Button>

                  {newRule.escalationPath.map((step: any, index: number) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Niveau {step.level}
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Délai (minutes)"
                            type="number"
                            value={step.delayMinutes}
                            onChange={(e) => {
                              const newPath = [...newRule.escalationPath];
                              newPath[index].delayMinutes = parseInt(e.target.value);
                              setNewRule(prev => ({ ...prev, escalationPath: newPath }));
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={step.stopOnAcknowledge}
                                onChange={(e) => {
                                  const newPath = [...newRule.escalationPath];
                                  newPath[index].stopOnAcknowledge = e.target.checked;
                                  setNewRule(prev => ({ ...prev, escalationPath: newPath }));
                                }}
                              />
                            }
                            label="Arrêter si acquitté"
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  ))}
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleCreateRule}
                    disabled={newRule.escalationPath.length === 0 || createRuleMutation.isLoading}
                    sx={{ mr: 1 }}
                  >
                    {createRuleMutation.isLoading ? 'Création...' : 'Créer la Règle'}
                  </Button>
                  <Button onClick={() => setActiveStep(0)}>
                    Retour
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRuleDialog(false); resetForm(); }}>Annuler</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={editDialog} onClose={() => { setEditDialog(false); resetForm(); }} maxWidth="md" fullWidth>
        <DialogTitle>Modifier la Règle d'Escalade</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Configuration de Base</StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nom de la règle"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type d'Alerte</InputLabel>
                      <Select
                        value={newRule.alertType}
                        label="Type d'Alerte"
                        onChange={(e) => setNewRule(prev => ({ ...prev, alertType: e.target.value }))}
                      >
                        <MenuItem value="SLA_BREACH">Dépassement SLA</MenuItem>
                        <MenuItem value="SYSTEM_DOWN">Système Indisponible</MenuItem>
                        <MenuItem value="HIGH_VOLUME">Volume Élevé</MenuItem>
                        <MenuItem value="PROCESSING_DELAY">Retard de Traitement</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Sévérité</InputLabel>
                      <Select
                        value={newRule.severity}
                        label="Sévérité"
                        onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value }))}
                      >
                        <MenuItem value="low">Basse</MenuItem>
                        <MenuItem value="medium">Moyenne</MenuItem>
                        <MenuItem value="high">Haute</MenuItem>
                        <MenuItem value="critical">Critique</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newRule.active}
                          onChange={(e) => setNewRule(prev => ({ ...prev, active: e.target.checked }))}
                        />
                      }
                      label="Règle active"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mb: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!newRule.name || !newRule.alertType || !newRule.severity}
                  >
                    Continuer
                  </Button>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Chemin d'Escalade</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addEscalationStep}
                    sx={{ mb: 2 }}
                  >
                    Ajouter un Niveau
                  </Button>

                  {newRule.escalationPath.map((step: any, index: number) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Niveau {step.level}
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Délai (minutes)"
                            type="number"
                            value={step.delayMinutes}
                            onChange={(e) => {
                              const newPath = [...newRule.escalationPath];
                              newPath[index].delayMinutes = parseInt(e.target.value);
                              setNewRule(prev => ({ ...prev, escalationPath: newPath }));
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={step.stopOnAcknowledge}
                                onChange={(e) => {
                                  const newPath = [...newRule.escalationPath];
                                  newPath[index].stopOnAcknowledge = e.target.checked;
                                  setNewRule(prev => ({ ...prev, escalationPath: newPath }));
                                }}
                              />
                            }
                            label="Arrêter si acquitté"
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  ))}
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleUpdateRule}
                    disabled={newRule.escalationPath.length === 0 || updateRuleMutation.isLoading}
                    sx={{ mr: 1 }}
                  >
                    {updateRuleMutation.isLoading ? 'Mise à jour...' : 'Mettre à Jour'}
                  </Button>
                  <Button onClick={() => setActiveStep(0)}>
                    Retour
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialog(false); resetForm(); }}>Annuler</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <div>
        {snackbar.open && (
          <div style={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            zIndex: 1000
          }}>
            {snackbar.message}
            <button 
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              style={{ marginLeft: 10, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </Box>
  );
};

export default EscalationRulesManager;