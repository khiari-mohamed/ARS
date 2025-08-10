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
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  History,
  Science,
  Code,
  Preview,
  Save,
  Undo
} from '@mui/icons-material';
import { getEmailTemplates, createTemplate, updateTemplate, getTemplateVersions, createABTest, getABTests, renderTemplate } from '../../services/gecService';

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
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedTemplateManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [abTests, setAbTests] = useState<any[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [versionDialog, setVersionDialog] = useState(false);
  const [abTestDialog, setAbTestDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVersions, setTemplateVersions] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    category: '',
    variables: [],
    tags: [],
    isActive: true
  });
  const [newABTest, setNewABTest] = useState({
    name: '',
    templateA: '',
    templateB: '',
    trafficSplit: 50,
    startDate: '',
    endDate: '',
    metrics: {
      openRate: true,
      clickRate: true,
      responseRate: false,
      conversionRate: false
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, abTestsData] = await Promise.all([
        getEmailTemplates(),
        getABTests()
      ]);
      setTemplates(templatesData);
      setAbTests(abTestsData);
    } catch (error) {
      console.error('Failed to load template data:', error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplate({
        ...newTemplate,
        createdBy: 'current_user'
      });
      await loadData();
      setTemplateDialog(false);
      setNewTemplate({
        name: '',
        subject: '',
        body: '',
        category: '',
        variables: [],
        tags: [],
        isActive: true
      });
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables,
      tags: template.tags,
      isActive: template.isActive
    });
    setTemplateDialog(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await updateTemplate(editingTemplate.id, newTemplate, 'current_user');
      await loadData();
      setTemplateDialog(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleViewVersions = async (template: any) => {
    try {
      const versions = await getTemplateVersions(template.id);
      setSelectedTemplate(template);
      setTemplateVersions(versions);
      setVersionDialog(true);
    } catch (error) {
      console.error('Failed to load template versions:', error);
    }
  };

  const handlePreviewTemplate = async (template: any) => {
    try {
      const mockVariables: Record<string, any> = {};
      template.variables.forEach((variable: any) => {
        switch (variable.type) {
          case 'text':
            mockVariables[variable.name] = variable.defaultValue || `[${variable.name}]`;
            break;
          case 'number':
            mockVariables[variable.name] = variable.defaultValue || 123;
            break;
          case 'date':
            mockVariables[variable.name] = new Date().toLocaleDateString();
            break;
          case 'list':
            mockVariables[variable.name] = ['Item 1', 'Item 2', 'Item 3'];
            break;
          default:
            mockVariables[variable.name] = `[${variable.name}]`;
        }
      });

      const rendered = await renderTemplate(template.id, mockVariables);
      setPreviewData(rendered);
      setPreviewDialog(true);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  };

  const handleCreateABTest = async () => {
    try {
      await createABTest(newABTest);
      await loadData();
      setAbTestDialog(false);
      setNewABTest({
        name: '',
        templateA: '',
        templateB: '',
        trafficSplit: 50,
        startDate: '',
        endDate: '',
        metrics: {
          openRate: true,
          clickRate: true,
          responseRate: false,
          conversionRate: false
        }
      });
    } catch (error) {
      console.error('Failed to create A/B test:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'ACCUSE_RECEPTION': 'primary',
      'DEMANDE_PIECES': 'warning',
      'NOTIFICATION': 'info',
      'RELANCE': 'error',
      'REPONSE_RECLAMATION': 'success'
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  const getABTestStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'completed': return 'info';
      case 'draft': return 'default';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Gestion Avancée des Modèles
      </Typography>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Modèles
              </Typography>
              <Typography variant="h4" component="div">
                {templates.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Modèles Actifs
              </Typography>
              <Typography variant="h4" component="div">
                {templates.filter(t => t.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Tests A/B Actifs
              </Typography>
              <Typography variant="h4" component="div">
                {abTests.filter(t => t.status === 'running').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Catégories
              </Typography>
              <Typography variant="h4" component="div">
                {new Set(templates.map(t => t.category)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="template tabs">
            <Tab label="Modèles" />
            <Tab label="Tests A/B" />
            <Tab label="Éditeur Visuel" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Templates Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Modèles d'Email ({templates.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setTemplateDialog(true)}
            >
              Nouveau Modèle
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Dernière Modification</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {template.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.category}
                        color={getCategoryColor(template.category) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>v{template.version}</TableCell>
                    <TableCell>
                      <Chip
                        label={template.isActive ? 'Actif' : 'Inactif'}
                        color={template.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewTemplate(template)}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleViewVersions(template)}
                        >
                          <History />
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
          {/* A/B Tests Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Tests A/B ({abTests.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Science />}
              onClick={() => setAbTestDialog(true)}
            >
              Nouveau Test A/B
            </Button>
          </Box>

          <List>
            {abTests.map((test) => (
              <ListItem
                key={test.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemIcon>
                  <Science color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {test.name}
                      </Typography>
                      <Chip
                        label={test.status}
                        color={getABTestStatusColor(test.status) as any}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Modèle A: {test.templateA} | Modèle B: {test.templateB}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Répartition: {test.trafficSplit}% / {100 - test.trafficSplit}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(test.startDate).toLocaleDateString()} - {new Date(test.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" gap={1}>
                  <Button size="small" startIcon={<Visibility />}>
                    Résultats
                  </Button>
                  <Button size="small" startIcon={<Edit />}>
                    Modifier
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Visual Editor Tab */}
          <Alert severity="info" sx={{ mb: 3 }}>
            L'éditeur visuel permet de créer et modifier des modèles avec une interface WYSIWYG.
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Éditeur de Contenu
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={10}
                    placeholder="Contenu HTML du modèle..."
                    sx={{ mb: 2 }}
                  />
                  <Box display="flex" gap={2}>
                    <Button variant="contained" startIcon={<Save />}>
                      Sauvegarder
                    </Button>
                    <Button variant="outlined" startIcon={<Preview />}>
                      Aperçu
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Variables Disponibles
                  </Typography>
                  <List dense>
                    {['clientName', 'reference', 'montant', 'dateSoin', 'delaiTraitement'].map((variable) => (
                      <ListItem key={variable}>
                        <ListItemIcon>
                          <Code />
                        </ListItemIcon>
                        <ListItemText
                          primary={`{{${variable}}}`}
                          secondary={`Variable: ${variable}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Modifier le Modèle' : 'Nouveau Modèle'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom du modèle"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={newTemplate.category}
                  label="Catégorie"
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="ACCUSE_RECEPTION">Accusé de Réception</MenuItem>
                  <MenuItem value="DEMANDE_PIECES">Demande de Pièces</MenuItem>
                  <MenuItem value="NOTIFICATION">Notification</MenuItem>
                  <MenuItem value="RELANCE">Relance</MenuItem>
                  <MenuItem value="REPONSE_RECLAMATION">Réponse Réclamation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Objet"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Corps du message"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Contenu HTML du modèle..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newTemplate.isActive}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Modèle actif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!newTemplate.name || !newTemplate.subject}
          >
            {editingTemplate ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Versions Dialog */}
      <Dialog open={versionDialog} onClose={() => setVersionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Historique des Versions - {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <List>
            {templateVersions.map((version) => (
              <ListItem
                key={version.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        Version {version.version}
                      </Typography>
                      {version.isActive && (
                        <Chip label="Actuelle" color="primary" size="small" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {version.changes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Par {version.createdBy} le {new Date(version.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" gap={1}>
                  <Button size="small" startIcon={<Visibility />}>
                    Voir
                  </Button>
                  {!version.isActive && (
                    <Button size="small" startIcon={<Undo />}>
                      Restaurer
                    </Button>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* A/B Test Dialog */}
      <Dialog open={abTestDialog} onClose={() => setAbTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Test A/B</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du test"
                value={newABTest.name}
                onChange={(e) => setNewABTest(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Modèle A</InputLabel>
                <Select
                  value={newABTest.templateA}
                  label="Modèle A"
                  onChange={(e) => setNewABTest(prev => ({ ...prev, templateA: e.target.value }))}
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Modèle B</InputLabel>
                <Select
                  value={newABTest.templateB}
                  label="Modèle B"
                  onChange={(e) => setNewABTest(prev => ({ ...prev, templateB: e.target.value }))}
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Répartition du trafic (%)"
                type="number"
                value={newABTest.trafficSplit}
                onChange={(e) => setNewABTest(prev => ({ ...prev, trafficSplit: parseInt(e.target.value) }))}
                inputProps={{ min: 10, max: 90 }}
                helperText="Pourcentage pour le modèle A (le reste ira au modèle B)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de début"
                type="date"
                value={newABTest.startDate}
                onChange={(e) => setNewABTest(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de fin"
                type="date"
                value={newABTest.endDate}
                onChange={(e) => setNewABTest(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbTestDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCreateABTest}
            disabled={!newABTest.name || !newABTest.templateA || !newABTest.templateB}
          >
            Créer Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Aperçu du Modèle</DialogTitle>
        <DialogContent>
          {previewData && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Objet: {previewData.subject}
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'background.paper'
                }}
                dangerouslySetInnerHTML={{ __html: previewData.body }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedTemplateManager;