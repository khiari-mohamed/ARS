import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

interface DonneurOrdre {
  id: string;
  name: string;
  bank: string;
  rib: string;
  txtFormat: string;
  status: 'active' | 'inactive';
}

const DonneursTab: React.FC = () => {
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [dialog, setDialog] = useState<{open: boolean, donneur: DonneurOrdre | null}>({
    open: false, donneur: null
  });
  const [form, setForm] = useState({
    name: '',
    bank: '',
    rib: '',
    txtFormat: 'SWIFT',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    loadDonneurs();
  }, []);

  const loadDonneurs = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Transform backend data to frontend format
      const transformedData = data.map((donneur: any) => ({
        id: donneur.id,
        name: donneur.nom || 'ARS Compte Principal',
        bank: donneur.banque || 'ARS TUNISIE',
        rib: donneur.rib || '08001000123456789012',
        txtFormat: donneur.structureTxt || 'SWIFT',
        status: donneur.statut === 'ACTIF' ? 'active' : 'inactive'
      }));
      
      setDonneurs(transformedData);
    } catch (error) {
      console.error('Failed to load donneurs:', error);
      setDonneurs([]);
    }
  };

  const handleAdd = () => {
    setForm({
      name: '',
      bank: '',
      rib: '',
      txtFormat: 'SWIFT',
      status: 'active'
    });
    setDialog({open: true, donneur: null});
  };

  const handleEdit = (donneur: DonneurOrdre) => {
    setForm({
      name: donneur.name,
      bank: donneur.bank,
      rib: donneur.rib,
      txtFormat: donneur.txtFormat,
      status: donneur.status
    });
    setDialog({open: true, donneur});
  };

  const handleSave = async () => {
    try {
      const donneurData = {
        nom: form.name,
        banque: form.bank,
        rib: form.rib,
        structureTxt: form.txtFormat,
        statut: form.status === 'active' ? 'ACTIF' : 'INACTIF'
      };
      
      if (dialog.donneur) {
        // Update existing
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre/${dialog.donneur.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(donneurData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update donneur');
        }
      } else {
        // Add new
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(donneurData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create donneur');
        }
      }
      
      setDialog({open: false, donneur: null});
      // Reload data from backend
      await loadDonneurs();
    } catch (error) {
      console.error('Failed to save donneur:', error);
      alert('Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce donneur d\'ordre ?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/donneurs-ordre/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete donneur');
        }
        
        // Reload data from backend
        await loadDonneurs();
      } catch (error) {
        console.error('Failed to delete donneur:', error);
        alert('Erreur lors de la suppression: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      }
    }
  };

  const getStatusChip = (status: string) => {
    return (
      <Chip 
        label={status === 'active' ? 'Actif' : 'Inactif'}
        color={status === 'active' ? 'success' : 'default'}
        size="small"
      />
    );
  };

  return (
    <Box>
      {/* EXACT SPEC: TAB 4 - Donneur d'ordre */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Gestion des Donneurs d'Ordre
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Liste des Donneurs ({donneurs.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            size="large"
          >
            + Ajouter un Donneur
          </Button>
        </Grid>

      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Nom du Donneur</strong></TableCell>
              <TableCell><strong>Banque</strong></TableCell>
              <TableCell><strong>RIB (20 chiffres)</strong></TableCell>
              <TableCell><strong>Structure fichier TXT associée</strong></TableCell>
              <TableCell><strong>Statut actif/inactif</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donneurs.map((donneur) => (
              <TableRow key={donneur.id} hover>
                <TableCell>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {donneur.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{donneur.bank}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 0.5, borderRadius: 1 }}>
                    {donneur.rib}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`Structure: ${donneur.txtFormat}`} 
                    color="primary" 
                    variant="outlined" 
                    size="small" 
                  />
                </TableCell>
                <TableCell>{getStatusChip(donneur.status)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(donneur)}
                      variant="outlined"
                    >
                      Modifier
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(donneur.id)}
                      color="error"
                      variant="outlined"
                    >
                      Supprimer
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      </Paper>

      {/* EXACT SPEC: Formulaire Ajout/Modification */}
      <Dialog open={dialog.open} onClose={() => setDialog({open: false, donneur: null})} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {dialog.donneur ? 'Modifier' : 'Ajouter'} un Donneur d'Ordre
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Chaque donneur d'ordre est défini par un nom, un RIB, une banque, une structure de fichier TXT associée et un statut actif/inactif.
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  label="Nom du Donneur"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  fullWidth
                  required
                  placeholder="Ex: AMEN GROUP"
                  helperText="Le nom de l'émetteur"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Banque"
                  value={form.bank}
                  onChange={(e) => setForm({...form, bank: e.target.value})}
                  fullWidth
                  required
                  placeholder="Ex: BNP Paribas"
                  helperText="La banque associée"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="RIB (20 chiffres)"
                  value={form.rib}
                  onChange={(e) => setForm({...form, rib: e.target.value})}
                  fullWidth
                  required
                  helperText="Le RIB utilisé pour l'émission - exactement 20 chiffres"
                  inputProps={{ maxLength: 20, pattern: '[0-9]*' }}
                  placeholder="12345678901234567890"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Structure fichier TXT associée</InputLabel>
                  <Select
                    value={form.txtFormat}
                    onChange={(e) => setForm({...form, txtFormat: e.target.value})}
                    label="Structure fichier TXT associée"
                  >
                    <MenuItem value="Structure 1">Structure 1 (Donneur 1)</MenuItem>
                    <MenuItem value="Structure 2">Structure 2 (Donneur 2)</MenuItem>
                    <MenuItem value="Structure 3">Structure 3 (Donneur 3)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({...form, status: e.target.value as 'active' | 'inactive'})}
                    label="Statut"
                  >
                    <MenuItem value="active">🟢 Actif</MenuItem>
                    <MenuItem value="inactive">⚫ Inactif</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialog({open: false, donneur: null})} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleSave} variant="contained" size="large">
            {dialog.donneur ? '💾 Enregistrer' : '+ Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DonneursTab;