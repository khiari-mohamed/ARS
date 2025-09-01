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
// Removed mock service imports

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
    variables: []
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
  const [editingABTest, setEditingABTest] = useState<any>(null);
  const [resultsDialog, setResultsDialog] = useState(false);
  const [selectedABTest, setSelectedABTest] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('📄 Loading template data...');
    try {
      const token = localStorage.getItem('token');
      
      // Load templates
      const templatesResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        console.log('📄 Templates loaded:', templatesData);
        setTemplates(templatesData);
      }
      
      // Load A/B tests
      const abTestsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (abTestsResponse.ok) {
        const abTestsData = await abTestsResponse.json();
        console.log('🧪 A/B tests loaded:', abTestsData);
        setAbTests(abTestsData);
      } else {
        console.error('Failed to load A/B tests:', abTestsResponse.status);
        setAbTests([]);
      }
    } catch (error) {
      console.error('Failed to load template data:', error);
    }
  };

  const handleCreateTemplate = async () => {
    console.log('➕ Creating template:', newTemplate);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });
      
      if (response.ok) {
        console.log('✅ Template created successfully');
        await loadData();
        setTemplateDialog(false);
        setNewTemplate({
          name: '',
          subject: '',
          body: '',
          variables: []
        });
      } else {
        console.error('Failed to create template:', response.status);
      }
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
      variables: template.variables || []
    });
    setTemplateDialog(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    console.log('✏️ Updating template:', editingTemplate.id, newTemplate);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });
      
      if (response.ok) {
        console.log('✅ Template updated successfully');
        await loadData();
        setTemplateDialog(false);
        setEditingTemplate(null);
      } else {
        console.error('Failed to update template:', response.status);
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleViewVersions = async (template: any) => {
    console.log('📅 Loading versions for template:', template.id);
    try {
      // For now, show current version only since version history is not implemented in backend
      const currentVersion = [
        {
          id: template.id,
          version: template.version || 1,
          changes: 'Version actuelle',
          createdBy: 'Système',
          createdAt: template.updatedAt || template.createdAt,
          isActive: true
        }
      ];
      
      setSelectedTemplate(template);
      setTemplateVersions(currentVersion);
      setVersionDialog(true);
    } catch (error) {
      console.error('Failed to load template versions:', error);
    }
  };

  const handlePreviewTemplate = async (template: any) => {
    console.log('👁️ Previewing template:', template.id);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${template.id}/render`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const rendered = await response.json();
        console.log('✅ Template rendered successfully');
        setPreviewData(rendered);
        setPreviewDialog(true);
      } else {
        console.error('Failed to render template:', response.status);
        // Show raw template without variables
        setPreviewData({
          subject: template.subject,
          body: template.body
        });
        setPreviewDialog(true);
      }
    } catch (error) {
      console.error('Failed to preview template:', error);
      // Show raw template without variables
      setPreviewData({
        subject: template.subject,
        body: template.body
      });
      setPreviewDialog(true);
    }
  };

  const handleCreateABTest = async () => {
    console.log('🧪 Creating A/B test:', newABTest);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newABTest)
      });
      
      if (response.ok) {
        console.log('✅ A/B test created successfully');
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
      } else {
        console.error('Failed to create A/B test:', response.status);
        alert('Erreur lors de la création du test A/B');
      }
    } catch (error) {
      console.error('Failed to create A/B test:', error);
      alert('Erreur lors de la création du test A/B');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) return;
    
    console.log('🗑️ Deleting template:', templateId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Template deleted successfully');
        await loadData();
      } else {
        console.error('Failed to delete template:', response.status);
        alert('Erreur lors de la suppression du modèle');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Erreur lors de la suppression du modèle');
    }
  };

  const handleViewABTestResults = async (test: any) => {
    console.log('📈 Viewing A/B test results:', test.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests/${test.id}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const results = await response.json();
        console.log('📈 A/B test results loaded:', results);
        setSelectedABTest({ ...test, results });
      } else {
        console.error('Failed to load A/B test results:', response.status);
        setSelectedABTest(test);
      }
    } catch (error) {
      console.error('Failed to load A/B test results:', error);
      setSelectedABTest(test);
    }
    setResultsDialog(true);
  };

  const handleEditABTest = (test: any) => {
    console.log('✏️ Editing A/B test:', test.id);
    setEditingABTest(test);
    setNewABTest({
      name: test.name,
      templateA: test.templateA,
      templateB: test.templateB,
      trafficSplit: test.trafficSplit,
      startDate: test.startDate,
      endDate: test.endDate,
      metrics: test.metrics || {
        openRate: true,
        clickRate: true,
        responseRate: false,
        conversionRate: false
      }
    });
    setAbTestDialog(true);
  };

  const handleUpdateABTest = async () => {
    if (!editingABTest) return;
    
    console.log('✏️ Updating A/B test:', editingABTest.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests/${editingABTest.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newABTest)
      });
      
      if (response.ok) {
        console.log('✅ A/B test updated successfully');
        await loadData();
        setAbTestDialog(false);
        setEditingABTest(null);
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
      } else {
        console.error('Failed to update A/B test:', response.status);
        alert('Erreur lors de la modification du test A/B');
      }
    } catch (error) {
      console.error('Failed to update A/B test:', error);
      alert('Erreur lors de la modification du test A/B');
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
                {templates.length}
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
                Variables
              </Typography>
              <Typography variant="h4" component="div">
                {templates.reduce((acc, t) => acc + (t.variables?.length || 0), 0)}
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
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteTemplate(template.id)}
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
                  <Button 
                    size="small" 
                    startIcon={<Visibility />}
                    onClick={() => handleViewABTestResults(test)}
                  >
                    Résultats
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<Edit />}
                    onClick={() => handleEditABTest(test)}
                  >
                    Modifier
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
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

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.body}
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
        <DialogTitle>{editingABTest ? 'Modifier Test A/B' : 'Nouveau Test A/B'}</DialogTitle>
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
            onClick={editingABTest ? handleUpdateABTest : handleCreateABTest}
            disabled={!newABTest.name || !newABTest.templateA || !newABTest.templateB}
          >
            {editingABTest ? 'Modifier Test' : 'Créer Test'}
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

      {/* A/B Test Results Dialog */}
      <Dialog open={resultsDialog} onClose={() => setResultsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Résultats du Test A/B - {selectedABTest?.name}
        </DialogTitle>
        <DialogContent>
          {selectedABTest && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Modèle A
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedABTest.templateA}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Taux d'ouverture:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateA?.openRate || 0}%
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Taux de clic:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateA?.clickRate || 0}%
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Conversions:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateA?.conversions || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Modèle B
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedABTest.templateB}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Taux d'ouverture:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateB?.openRate || 0}%
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Taux de clic:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateB?.clickRate || 0}%
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Conversions:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedABTest.results?.templateB?.conversions || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Gagnant:</strong> {selectedABTest.results?.winner ? `Le modèle ${selectedABTest.results.winner} performe mieux` : 'Données insuffisantes pour déterminer un gagnant'}
                    {selectedABTest.results?.confidence && ` avec ${selectedABTest.results.confidence}% de confiance`}.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialog(false)}>Fermer</Button>
          <Button variant="contained" color="primary">
            Appliquer le Gagnant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedTemplateManager;