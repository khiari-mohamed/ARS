import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          Donneurs d'Ordre ({donneurs.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Ajouter Donneur d'Ordre
        </Button>
      </Grid>

      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Banque</TableCell>
              <TableCell>RIB</TableCell>
              <TableCell>Format TXT</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donneurs.map((donneur) => (
              <TableRow key={donneur.id}>
                <TableCell>
                  <Typography variant="subtitle2">{donneur.name}</Typography>
                </TableCell>
                <TableCell>{donneur.bank}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {donneur.rib}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={donneur.txtFormat} variant="outlined" size="small" />
                </TableCell>
                <TableCell>{getStatusChip(donneur.status)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(donneur)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(donneur.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({open: false, donneur: null})} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.donneur ? 'Modifier' : 'Ajouter'} Donneur d'Ordre
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nom"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Banque"
                value={form.bank}
                onChange={(e) => setForm({...form, bank: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="RIB"
                value={form.rib}
                onChange={(e) => setForm({...form, rib: e.target.value})}
                fullWidth
                required
                helperText="20 caractères pour le RIB"
                inputProps={{ maxLength: 20 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Format TXT</InputLabel>
                <Select
                  value={form.txtFormat}
                  onChange={(e) => setForm({...form, txtFormat: e.target.value})}
                  label="Format TXT"
                >
                  <MenuItem value="SWIFT">SWIFT</MenuItem>
                  <MenuItem value="SEPA">SEPA</MenuItem>
                  <MenuItem value="CUSTOM">Personnalisé</MenuItem>
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
                  <MenuItem value="active">Actif</MenuItem>
                  <MenuItem value="inactive">Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({open: false, donneur: null})}>
            Annuler
          </Button>
          <Button onClick={handleSave} variant="contained">
            {dialog.donneur ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DonneursTab;