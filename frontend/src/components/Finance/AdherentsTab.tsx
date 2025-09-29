import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, Stack, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';

interface Adherent {
  id: string;
  matricule: string;
  name: string;
  surname: string;
  society: string;
  rib: string;
  codeAssure?: string;
  numeroContrat?: string;
  status: 'active' | 'inactive';
  duplicateRib?: boolean;
}

const AdherentsTab: React.FC = () => {
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [filteredAdherents, setFilteredAdherents] = useState<Adherent[]>([]);
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    search: ''
  });
  const [dialog, setDialog] = useState<{open: boolean, adherent: Adherent | null}>({
    open: false, adherent: null
  });
  const [form, setForm] = useState({
    matricule: '',
    name: '',
    surname: '',
    society: '',
    rib: '',
    codeAssure: '',
    numeroContrat: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    loadAdherents();
  }, []);

  const loadAdherents = async () => {
    try {
      // Try multiple data sources to get all members
      let data = [];
      
      try {
        // First try with empty search to get all members
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('Loaded from adherents endpoint:', data.length, 'items');
        }
      } catch (error) {
        console.log('Adherents endpoint failed, trying alternative');
      }
      
      // If no data from adherents endpoint, try direct database query
      if (data.length === 0) {
        try {
          // Try different endpoint variations
          const altResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents?clientId=`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (altResponse.ok) {
            data = await altResponse.json();
            console.log('Loaded from alternative endpoint:', data.length, 'items');
          }
        } catch (error) {
          console.log('Alternative endpoint also failed');
        }
      }
      
      // Transform backend data to frontend format
      const transformedData = data.map((member: any, index: number) => ({
        id: member.id || `member-${index + 1}`,
        matricule: member.matricule || member.cin || `M${String(index + 1).padStart(3, '0')}`,
        name: member.nom || member.name?.split(' ')[0] || `Membre ${index + 1}`,
        surname: member.prenom || member.name?.split(' ').slice(1).join(' ') || 'Test',
        society: member.client?.name || member.society?.name || 'ARS TUNISIE',
        rib: member.rib || `RIB${String(index + 1).padStart(17, '0')}`,
        codeAssure: member.codeAssure || '',
        numeroContrat: member.numeroContrat || '',
        status: member.statut === 'ACTIF' || member.status === 'active' ? 'active' : 'inactive',
        duplicateRib: false
      }));
      
      console.log('Transformed data:', transformedData.length, 'adherents');
      
      // Check for duplicate RIBs
      const ribCounts = new Map();
      transformedData.forEach((adherent: Adherent) => {
        ribCounts.set(adherent.rib, (ribCounts.get(adherent.rib) || 0) + 1);
      });
      
      transformedData.forEach((adherent: Adherent) => {
        adherent.duplicateRib = ribCounts.get(adherent.rib) > 1;
      });
      
      setAdherents(transformedData);
    } catch (error) {
      console.error('Failed to load adherents:', error);
      setAdherents([]);
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = adherents;
    
    if (filters.society) {
      filtered = filtered.filter(a => a.society.toLowerCase().includes(filters.society.toLowerCase()));
    }
    
    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    
    if (filters.search) {
      filtered = filtered.filter(a => 
        a.matricule.includes(filters.search) ||
        a.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        a.surname.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    setFilteredAdherents(filtered);
  }, [adherents, filters]);

  const handleAdd = () => {
    setForm({
      matricule: '',
      name: '',
      surname: '',
      society: '',
      rib: '',
      codeAssure: '',
      numeroContrat: '',
      status: 'active'
    });
    setDialog({open: true, adherent: null});
  };

  const handleEdit = (adherent: Adherent) => {
    setForm({
      matricule: adherent.matricule,
      name: adherent.name,
      surname: adherent.surname,
      society: adherent.society,
      rib: adherent.rib,
      codeAssure: adherent.codeAssure || '',
      numeroContrat: adherent.numeroContrat || '',
      status: adherent.status
    });
    setDialog({open: true, adherent});
  };

  const checkDuplicateRib = (rib: string, excludeId?: string) => {
    return adherents.some(a => a.rib === rib && a.id !== excludeId);
  };

  const handleSave = async () => {
    try {
      // Validate RIB
      if (form.rib.length !== 20 || !/^\d{20}$/.test(form.rib)) {
        alert('Le RIB doit contenir exactement 20 chiffres');
        return;
      }

      const adherentData = {
        matricule: form.matricule,
        nom: form.name,
        prenom: form.surname,
        clientId: form.society,
        rib: form.rib,
        codeAssure: form.codeAssure,
        numeroContrat: form.numeroContrat,
        statut: form.status === 'active' ? 'ACTIF' : 'INACTIF'
      };
      
      if (dialog.adherent) {
        // Update existing
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/${dialog.adherent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(adherentData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update adherent');
        }
      } else {
        // Add new
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(adherentData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create adherent');
        }
      }
      
      setDialog({open: false, adherent: null});
      // Reload data from backend
      await loadAdherents();
    } catch (error) {
      console.error('Failed to save adherent:', error);
      alert('Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet adhérent ?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete adherent');
        }
        
        // Reload data from backend
        await loadAdherents();
      } catch (error) {
        console.error('Failed to delete adherent:', error);
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

  const duplicateRibCount = adherents.filter(a => a.duplicateRib).length;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          Adhérents ({filteredAdherents.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Ajouter Adhérent
        </Button>
      </Grid>

      {/* Duplicate RIB Alert */}
      {duplicateRibCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          {duplicateRibCount} adhérent(s) avec des RIB dupliqués détecté(s). 
          Vérifiez les justifications nécessaires.
        </Alert>
      )}

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Recherche"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            size="small"
            placeholder="Matricule, nom, prénom..."
            sx={{ minWidth: 200 }}
          />
          
          <TextField
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="inactive">Inactif</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            onClick={() => setFilters({society: '', status: '', search: ''})}
          >
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Matricule</TableCell>
              <TableCell>Société</TableCell>
              <TableCell>Nom et Prénom</TableCell>
              <TableCell>RIB (20 chiffres)</TableCell>
              <TableCell>Code Assuré</TableCell>
              <TableCell>Numéro de Contrat</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdherents.map((adherent) => (
              <TableRow 
                key={adherent.id}
                sx={{ 
                  bgcolor: adherent.duplicateRib ? 'warning.light' : 'inherit',
                  '&:hover': { bgcolor: adherent.duplicateRib ? 'warning.main' : 'action.hover' }
                }}
              >
                <TableCell>
                  <Typography variant="subtitle2">{adherent.matricule}</Typography>
                  {adherent.duplicateRib && (
                    <Chip label="RIB Dupliqué" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>{adherent.society}</TableCell>
                <TableCell>{adherent.name} {adherent.surname}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {adherent.rib}
                  </Typography>
                  {adherent.rib.length !== 20 && (
                    <Chip label="RIB Invalide" color="error" size="small" />
                  )}
                </TableCell>
                <TableCell>{adherent.codeAssure || '-'}</TableCell>
                <TableCell>{adherent.numeroContrat || '-'}</TableCell>
                <TableCell>{getStatusChip(adherent.status)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(adherent)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(adherent.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({open: false, adherent: null})} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.adherent ? 'Modifier' : 'Ajouter'} Adhérent
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Matricule"
                value={form.matricule}
                onChange={(e) => setForm({...form, matricule: e.target.value})}
                fullWidth
                required
                disabled={!!dialog.adherent}
                helperText={dialog.adherent ? "Matricule cannot be changed" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Société"
                value={form.society}
                onChange={(e) => setForm({...form, society: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                value={form.surname}
                onChange={(e) => setForm({...form, surname: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="RIB (20 chiffres)"
                value={form.rib}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Only digits
                  setForm({...form, rib: value});
                }}
                fullWidth
                required
                helperText={`${form.rib.length}/20 chiffres`}
                inputProps={{ maxLength: 20, pattern: '[0-9]*' }}
                error={checkDuplicateRib(form.rib, dialog.adherent?.id) || (form.rib.length > 0 && form.rib.length !== 20)}
              />
              {checkDuplicateRib(form.rib, dialog.adherent?.id) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Ce RIB est déjà utilisé par un autre adhérent. Une justification sera requise.
                </Alert>
              )}
              {form.rib.length > 0 && form.rib.length !== 20 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Le RIB doit contenir exactement 20 chiffres.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Code Assuré"
                value={form.codeAssure}
                onChange={(e) => setForm({...form, codeAssure: e.target.value})}
                fullWidth
                required
                helperText="Doit correspondre au champ dans la table Contrat"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Numéro de Contrat"
                value={form.numeroContrat}
                onChange={(e) => setForm({...form, numeroContrat: e.target.value})}
                fullWidth
                required
                helperText="Référence du contrat associé"
              />
            </Grid>
            <Grid item xs={12}>
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
          <Button onClick={() => setDialog({open: false, adherent: null})}>
            Annuler
          </Button>
          <Button onClick={handleSave} variant="contained">
            {dialog.adherent ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdherentsTab;