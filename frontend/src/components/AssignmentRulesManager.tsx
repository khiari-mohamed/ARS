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
  PlayArrow,
  Pause,
  Visibility
} from '@mui/icons-material';
import { fetchAssignmentRules, createAssignmentRule, updateAssignmentRule, deleteAssignmentRule } from '../services/teamLeaderService';

interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: any[];
  actions: any[];
  active: boolean;
}

const AssignmentRulesManager: React.FC = () => {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priority: 50,
    conditions: [{ field: '', operator: '', value: '' }],
    actions: [{ type: '', target: '', value: '' }],
    active: true
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await fetchAssignmentRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to load assignment rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      priority: 50,
      conditions: [{ field: '', operator: '', value: '' }],
      actions: [{ type: '', target: '', value: '' }],
      active: true
    });
    setDialogOpen(true);
  };

  const handleEditRule = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
      active: rule.active
    });
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await updateAssignmentRule(editingRule.id, formData);
      } else {
        await createAssignmentRule(formData);
      }
      await loadRules();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      try {
        await deleteAssignmentRule(ruleId);
        await loadRules();
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    try {
      await updateAssignmentRule(ruleId, { active });
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: '', value: '' }]
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: '', target: '', value: '' }]
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'error';
    if (priority >= 50) return 'warning';
    return 'info';
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Règles d'Affectation Automatique
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateRule}
        >
          Nouvelle Règle
        </Button>
      </Box>

      {/* Rules Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Règles Actives
              </Typography>
              <Typography variant="h4" component="div">
                {rules.filter(r => r.active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Règles
              </Typography>
              <Typography variant="h4" component="div">
                {rules.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Priorité Moyenne
              </Typography>
              <Typography variant="h4" component="div">
                {rules.length > 0 ? Math.round(rules.reduce((sum, r) => sum + r.priority, 0) / rules.length) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Règles Skill-Based
              </Typography>
              <Typography variant="h4" component="div">
                {rules.filter(r => r.actions.some(a => a.target === 'skill')).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rules Table */}
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Priorité</TableCell>
              <TableCell>Conditions</TableCell>
              <TableCell>Actions</TableCell>
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
                <TableCell>
                  <Chip
                    label={rule.priority}
                    color={getPriorityColor(rule.priority) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {rule.conditions.length} condition(s)
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {rule.actions.length} action(s)
                  </Typography>
                </TableCell>
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
                      onClick={() => handleToggleRule(rule.id, !rule.active)}
                      color={rule.active ? 'warning' : 'success'}
                    >
                      {rule.active ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRule(rule.id)}
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

      {/* Rule Editor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule ? 'Modifier la Règle' : 'Nouvelle Règle d\'Affectation'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Nom de la règle"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Priorité"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>

            {/* Conditions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Conditions
              </Typography>
              {formData.conditions.map((condition, index) => (
                <Box key={index} display="flex" gap={2} mb={2} alignItems="center">
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Champ</InputLabel>
                    <Select
                      value={condition.field}
                      label="Champ"
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                    >
                      <MenuItem value="nombreBS">Nombre BS</MenuItem>
                      <MenuItem value="delaiReglement">Délai Règlement</MenuItem>
                      <MenuItem value="client.complexity">Complexité Client</MenuItem>
                      <MenuItem value="statut">Statut</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Opérateur</InputLabel>
                    <Select
                      value={condition.operator}
                      label="Opérateur"
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    >
                      <MenuItem value=">">&gt;</MenuItem>
                      <MenuItem value="<">&lt;</MenuItem>
                      <MenuItem value="=">=</MenuItem>
                      <MenuItem value="!=">!=</MenuItem>
                      <MenuItem value="contains">Contient</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Valeur"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  />
                  <IconButton onClick={() => removeCondition(index)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<Add />} onClick={addCondition}>
                Ajouter Condition
              </Button>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              {formData.actions.map((action, index) => (
                <Box key={index} display="flex" gap={2} mb={2} alignItems="center">
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={action.type}
                      label="Type"
                      onChange={(e) => updateAction(index, 'type', e.target.value)}
                    >
                      <MenuItem value="assign">Affecter</MenuItem>
                      <MenuItem value="priority">Priorité</MenuItem>
                      <MenuItem value="escalate">Escalader</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Cible</InputLabel>
                    <Select
                      value={action.target}
                      label="Cible"
                      onChange={(e) => updateAction(index, 'target', e.target.value)}
                    >
                      <MenuItem value="skill">Compétence</MenuItem>
                      <MenuItem value="user">Utilisateur</MenuItem>
                      <MenuItem value="team">Équipe</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Valeur"
                    value={action.value}
                    onChange={(e) => updateAction(index, 'value', e.target.value)}
                  />
                  <IconButton onClick={() => removeAction(index)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<Add />} onClick={addAction}>
                Ajouter Action
              </Button>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Règle active"
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            Les règles avec une priorité plus élevée sont évaluées en premier. 
            Les conditions doivent toutes être vraies pour déclencher les actions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {editingRule ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignmentRulesManager;