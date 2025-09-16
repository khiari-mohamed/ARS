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
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete
} from '@mui/icons-material';

const MultiBankFormatManager: React.FC = () => {
  const [formats, setFormats] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{open: boolean, format: any | null}>({
    open: false, format: null
  });
  const [editForm, setEditForm] = useState({
    nom: '',
    banque: '',
    rib: '',
    structureTxt: 'SWIFT',
    statut: 'ACTIF'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get real donneurs from API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load donneurs');
      }
      
      const donneurs = await response.json();
      console.log('Loaded donneurs:', donneurs);
      
      const formatsData = donneurs.map((donneur: any) => ({
        id: donneur.id,
        name: donneur.nom || 'Format Bancaire',
        bankCode: donneur.banque || 'BANK',
        country: 'TN',
        formatType: donneur.structureTxt || 'SWIFT',
        active: donneur.statut === 'ACTIF',
        fields: [
          { name: 'reference', type: 'string', required: true, maxLength: 35, description: 'Référence' },
          { name: 'amount', type: 'amount', required: true, description: 'Montant' },
          { name: 'rib', type: 'string', required: true, maxLength: 20, description: 'RIB' }
        ],
        validation: {
          ibanValidation: true,
          bicValidation: false,
          amountValidation: true,
          dateValidation: true
        }
      }));
      
      setFormats(formatsData);
      
      const activeCount = formatsData.filter((f: any) => f.active).length;
      const formatTypes = [...new Set(formatsData.map((f: any) => f.formatType))];
      
      const byTypeStats: Record<string, number> = {};
      (formatTypes as string[]).forEach((type: string) => {
        byTypeStats[type] = formatsData.filter((f: any) => f.formatType === type).length;
      });
      
      setStatistics({
        totalFormats: formatsData.length,
        activeFormats: activeCount,
        byType: byTypeStats,
        byCountry: { 'TN': formatsData.length }
      });
    } catch (error) {
      console.error('Failed to load bank formats:', error);
      setFormats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormat = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nom: 'Nouveau Format',
          banque: 'Nouvelle Banque',
          rib: `${Date.now().toString().slice(-20)}`,
          structureTxt: 'SWIFT',
          statut: 'ACTIF'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create format');
      }
      
      await loadData();
      alert('Format créé avec succès!');
    } catch (error) {
      console.error('Failed to create format:', error);
      alert('Erreur lors de la création du format: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleDeleteFormat = async (formatId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce format ?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre/${formatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete format');
      }
      
      await loadData();
      alert('Format supprimé avec succès!');
    } catch (error) {
      console.error('Failed to delete format:', error);
      alert('Erreur lors de la suppression du format: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleEditFormat = (format: any) => {
    setEditForm({
      nom: format.name,
      banque: format.bankCode,
      rib: format.id, // Use ID as RIB placeholder
      structureTxt: format.formatType,
      statut: format.active ? 'ACTIF' : 'INACTIF'
    });
    setEditDialog({open: true, format});
  };

  const handleSaveEdit = async () => {
    if (!editDialog.format) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre/${editDialog.format.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update format');
      }
      
      setEditDialog({open: false, format: null});
      await loadData();
      alert('Format modifié avec succès!');
    } catch (error) {
      console.error('Failed to update format:', error);
      alert('Erreur lors de la modification: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const getFormatTypeColor = (type: string) => {
    return type === 'SWIFT' ? 'secondary' : 'default';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestion des Formats Bancaires Multi-Banques
      </Typography>

      {/* Statistics */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Formats
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.totalFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Formats Actifs
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.activeFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Types Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byType).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pays Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byCountry).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bank Formats Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Formats Bancaires ({formats.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateFormat}
            >
              Nouveau Format
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Format</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Champs</TableCell>
                  <TableCell>Validation</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formats.map((format) => (
                  <TableRow key={format.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {format.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.bankCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.formatType}
                        color={getFormatTypeColor(format.formatType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{format.country}</TableCell>
                    <TableCell>{format.fields.length} champs</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {format.validation.ibanValidation && (
                          <Chip label="IBAN" size="small" variant="outlined" />
                        )}
                        {format.validation.bicValidation && (
                          <Chip label="BIC" size="small" variant="outlined" />
                        )}
                        {format.validation.amountValidation && (
                          <Chip label="Amount" size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.active ? 'Actif' : 'Inactif'}
                        color={format.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small"
                          title="Modifier"
                          onClick={() => handleEditFormat(format)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteFormat(format.id)}
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({open: false, format: null})} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier Format Bancaire</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nom"
                value={editForm.nom}
                onChange={(e) => setEditForm({...editForm, nom: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Banque"
                value={editForm.banque}
                onChange={(e) => setEditForm({...editForm, banque: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Format TXT</InputLabel>
                <Select
                  value={editForm.structureTxt}
                  onChange={(e) => setEditForm({...editForm, structureTxt: e.target.value})}
                  label="Format TXT"
                >
                  <MenuItem value="SWIFT">SWIFT</MenuItem>
                  <MenuItem value="SEPA">SEPA</MenuItem>
                  <MenuItem value="STRUCTURE_1">Structure 1</MenuItem>
                  <MenuItem value="STRUCTURE_2">Structure 2</MenuItem>
                  <MenuItem value="STRUCTURE_3">Structure 3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={editForm.statut}
                  onChange={(e) => setEditForm({...editForm, statut: e.target.value})}
                  label="Statut"
                >
                  <MenuItem value="ACTIF">Actif</MenuItem>
                  <MenuItem value="INACTIF">Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, format: null})}>
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiBankFormatManager;