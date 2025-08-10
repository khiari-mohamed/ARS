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
  const [rules, setRules] = useState<any[]>([]);
  const [activeEscalations, setActiveEscalations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRules([
        {
          id: 'rule_sla_breach',
          name: 'SLA Breach Escalation',
          alertType: 'SLA_BREACH',
          severity: 'high',
          escalationPath: [
            { level: 1, delayMinutes: 15, recipients: ['SUPERVISOR'] },
            { level: 2, delayMinutes: 60, recipients: ['MANAGER'] },
            { level: 3, delayMinutes: 180, recipients: ['DIRECTOR'] }
          ],
          active: true
        }
      ]);
      setActiveEscalations([
        {
          id: 'escalation_001',
          alertId: 'alert_001',
          currentLevel: 1,
          startedAt: new Date(Date.now() - 30 * 60 * 1000)
        }
      ]);
      setMetrics({
        totalEscalations: 45,
        successRate: 84.4,
        avgEscalationTime: 2.3
      });
    } catch (error) {
      console.error('Failed to load escalation data:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await loadData();
      setRuleDialog(false);
      setNewRule({
        name: '',
        alertType: '',
        severity: '',
        escalationPath: [],
        active: true
      });
      setActiveStep(0);
    } catch (error) {
      console.error('Failed to create escalation rule:', error);
    }
  };

  const addEscalationStep = () => {
    setNewRule(prev => ({
      ...prev,
      escalationPath: [
        ...prev.escalationPath,
        {
          level: prev.escalationPath.length + 1,
          delayMinutes: 15,
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
                    {rules.map((rule) => (
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
                        <TableCell>{rule.escalationPath.length} niveaux</TableCell>
                        <TableCell>
                          <Chip
                            label={rule.active ? 'Actif' : 'Inactif'}
                            color={rule.active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton size="small">
                              <Edit />
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
                {activeEscalations.map((escalation) => (
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

      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="md" fullWidth>
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
                    disabled={newRule.escalationPath.length === 0}
                    sx={{ mr: 1 }}
                  >
                    Créer la Règle
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
          <Button onClick={() => setRuleDialog(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscalationRulesManager;