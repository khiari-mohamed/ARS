import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Fab,
  Tooltip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  FileCopy,
  MoreVert,
  Description,
  Save,
  Cancel,
  Email,
  Print
} from '@mui/icons-material';

interface GecTemplate {
  id: string;
  name: string;
  content: string;
  type: 'EMAIL' | 'LETTER' | 'NOTICE';
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  usageCount?: number;
}

interface TemplateFormData {
  name: string;
  content: string;
  type: 'EMAIL' | 'LETTER' | 'NOTICE';
  category: string;
  isActive: boolean;
}

const fetchTemplates = async (): Promise<GecTemplate[]> => {
  const { data } = await LocalAPI.get<GecTemplate[]>('/gec/templates');
  return data;
};

const createTemplate = async (template: Omit<GecTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<GecTemplate> => {
  const { data } = await LocalAPI.post<GecTemplate>('/gec/templates', template);
  return data;
};

const updateTemplate = async (template: GecTemplate): Promise<GecTemplate> => {
  const { data } = await LocalAPI.put<GecTemplate>(`/gec/templates/${template.id}`, template);
  return data;
};

const deleteTemplate = async (id: string): Promise<void> => {
  await LocalAPI.delete(`/gec/templates/${id}`);
};

const duplicateTemplate = async (id: string): Promise<GecTemplate> => {
  const { data } = await LocalAPI.post<GecTemplate>(`/gec/templates/${id}/duplicate`);
  return data;
};

export const GecTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GecTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<GecTemplate | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTemplate, setMenuTemplate] = useState<GecTemplate | null>(null);
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    type: 'EMAIL',
    category: '',
    isActive: true
  });

  const { data: templates = [], isLoading, error } = useQuery<GecTemplate[]>(
    ['gec-templates'],
    fetchTemplates,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const createMutation = useMutation(createTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['gec-templates']);
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation(updateTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['gec-templates']);
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation(deleteTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['gec-templates']);
    },
  });

  const duplicateMutation = useMutation(duplicateTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(['gec-templates']);
    },
  });

  const handleOpenDialog = (template?: GecTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        content: template.content,
        type: template.type,
        category: template.category,
        isActive: template.isActive
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        content: '',
        type: 'EMAIL',
        category: '',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      content: '',
      type: 'EMAIL',
      category: '',
      isActive: true
    });
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({
        ...editingTemplate,
        ...formData,
        updatedAt: new Date().toISOString()
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (template: GecTemplate) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${template.name}" ?`)) {
      deleteMutation.mutate(template.id);
    }
    handleCloseMenu();
  };

  const handlePreview = (template: GecTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialog(true);
    handleCloseMenu();
  };

  const handleDuplicate = (template: GecTemplate) => {
    duplicateMutation.mutate(template.id);
    handleCloseMenu();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, template: GecTemplate) => {
    setAnchorEl(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuTemplate(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Email fontSize="small" />;
      case 'LETTER': return <Description fontSize="small" />;
      case 'NOTICE': return <Print fontSize="small" />;
      default: return <Description fontSize="small" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EMAIL': return 'primary';
      case 'LETTER': return 'secondary';
      case 'NOTICE': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des modèles...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: 2 }}>
      <>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Description sx={{ mr: 1, color: 'primary.main' }} />
            Modèles GEC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez vos modèles de correspondance pour la génération automatique de documents
          </Typography>
        </Box>
        <Tooltip title="Créer un nouveau modèle">
          <Fab
            color="primary"
            size="medium"
            onClick={() => handleOpenDialog()}
          >
            <Add />
          </Fab>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">{templates.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Modèles</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {templates.filter(t => t.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Actifs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {templates.filter(t => t.type === 'EMAIL').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Emails</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">
                {templates.filter(t => t.type === 'LETTER').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Lettres</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erreur lors du chargement des modèles. Données de démonstration affichées.
        </Alert>
      )}

      {/* Templates Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Liste des Modèles ({templates.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Catégorie</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Utilisations</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Modifié</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {template.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.content.substring(0, 50)}...
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getTypeIcon(template.type)}
                          label={template.type}
                          size="small"
                          color={getTypeColor(template.type) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={template.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.isActive ? 'Actif' : 'Inactif'}
                          size="small"
                          color={template.isActive ? 'success' : 'default'}
                          variant={template.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {template.usageCount || 0} fois
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, template)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Aucun modèle trouvé
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Créez votre premier modèle GEC en cliquant sur le bouton +
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => menuTemplate && handlePreview(menuTemplate)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          Prévisualiser
        </MenuItem>
        <MenuItem onClick={() => menuTemplate && handleOpenDialog(menuTemplate)}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Modifier
        </MenuItem>
        <MenuItem onClick={() => menuTemplate && handleDuplicate(menuTemplate)}>
          <FileCopy fontSize="small" sx={{ mr: 1 }} />
          Dupliquer
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => menuTemplate && handleDelete(menuTemplate)}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Modifier le modèle' : 'Créer un nouveau modèle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom du modèle"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  required
                >
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="LETTER">Lettre</MenuItem>
                  <MenuItem value="NOTICE">Avis</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Catégorie"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Statut"
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                >
                  <MenuItem value="active">Actif</MenuItem>
                  <MenuItem value="inactive">Inactif</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Contenu du modèle"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Saisissez le contenu de votre modèle..."
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<Save />}
            disabled={!formData.name || !formData.content || createMutation.isLoading || updateMutation.isLoading}
          >
            {editingTemplate ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Prévisualisation - {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedTemplate?.content}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
      </>
    </Box>
  );
};