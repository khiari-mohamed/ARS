import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, Stack, Box, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';

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
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [historyDialog, setHistoryDialog] = useState<{open: boolean, adherentId: string | null, history: any[]}>({open: false, adherentId: null, history: []});
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    
    const data = adherents.map(a => ({
      'Matricule': a.matricule,
      'Société': a.society,
      'Nom': a.name,
      'Prénom': a.surname,
      'RIB': a.rib,
      'Code Assuré': a.codeAssure || '',
      'Numéro Contrat': a.numeroContrat || '',
      'Statut': a.status === 'active' ? 'ACTIF' : 'INACTIF'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhérents');
    XLSX.writeFile(workbook, `adherents_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const result = await response.json();
      alert(`Import réussi! ${result.imported || 0} adhérent(s) importé(s)`);
      setImportDialog(false);
      setImportFile(null);
      await loadAdherents();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box>
      {/* EXACT SPEC: TAB 5 - Adhérents */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Gestion de la Base Adhérents
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Tableau des Adhérents ({filteredAdherents.length})
            {selectedIds.length > 0 && ` - ${selectedIds.length} sélectionné(s)`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={async () => {
                  if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} adhérent(s) ?`)) {
                    let successCount = 0;
                    let errorCount = 0;
                    const errors: string[] = [];
                    
                    for (const id of selectedIds) {
                      try {
                        await handleDelete(id);
                        successCount++;
                      } catch (error: any) {
                        errorCount++;
                        errors.push(error.message || 'Erreur inconnue');
                      }
                    }
                    
                    setSelectedIds([]);
                    await loadAdherents();
                    
                    if (errorCount > 0) {
                      alert(`${successCount} supprimé(s), ${errorCount} échec(s)\n${errors[0]}`);
                    } else {
                      alert(`${successCount} adhérent(s) supprimé(s) avec succès!`);
                    }
                  }
                }}
              >
                Supprimer ({selectedIds.length})
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              size="large"
            >
              + Ajouter un adhérent
            </Button>
          </Box>
        </Grid>

      {/* Duplicate RIB Alert */}
      {duplicateRibCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          {duplicateRibCount} adhérent(s) avec des RIB dupliqués détecté(s). 
          Vérifiez les justifications nécessaires.
        </Alert>
      )}

      {/* EXACT SPEC: Recherche & Filtres */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          🔍 Recherche & Filtres
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Recherche"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            size="small"
            placeholder="Matricule, nom, prénom..."
            sx={{ minWidth: 250 }}
          />
          
          <TextField
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            placeholder="Filtrer par société"
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="active">🟢 Actif</MenuItem>
              <MenuItem value="inactive">⚫ Inactif</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            onClick={() => setFilters({society: '', status: '', search: ''})}
          >
            🔄 Appliquer
          </Button>
        </Stack>
      </Paper>

      {/* EXACT SPEC: Import massif section */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          📅 Import Massif
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Le fichier d'alimentation doit contenir les colonnes obligatoires :
        </Typography>
        <Typography variant="body2" component="div">
          • Matricule (unique par société)<br/>
          • Société<br/>
          • Nom et prénom<br/>
          • RIB (20 chiffres)<br/>
          • Code assuré (lié au champ ajouté dans la table Contrat)<br/>
          • Numéro de contrat
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setImportDialog(true)}
          >
            📁 Importer fichier
          </Button>
          <Button 
            variant="outlined"
            onClick={handleDownloadTemplate}
          >
            📋 Télécharger modèle
          </Button>
        </Box>
      </Alert>

      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length && filteredAdherents.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(a => a.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell><strong>Matricule (unique par société)</strong></TableCell>
              <TableCell><strong>Société</strong></TableCell>
              <TableCell><strong>Nom et Prénom</strong></TableCell>
              <TableCell><strong>RIB (20 chiffres)</strong></TableCell>
              <TableCell><strong>Code assuré</strong></TableCell>
              <TableCell><strong>Numéro de contrat</strong></TableCell>
              <TableCell><strong>Statut actif/inactif</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((adherent) => (
              <TableRow 
                key={adherent.id}
                sx={{ 
                  bgcolor: selectedIds.includes(adherent.id) ? 'action.selected' : adherent.duplicateRib ? 'warning.light' : 'inherit',
                  '&:hover': { bgcolor: adherent.duplicateRib ? 'warning.main' : 'action.hover' }
                }}
              >
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(adherent.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, adherent.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== adherent.id));
                      }
                    }}
                  />
                </TableCell>
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
                  <IconButton size="small" onClick={() => handleEdit(adherent)} title="Modifier">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={async () => {
                    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/${adherent.id}/rib-history`, {
                      headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
                    });
                    const history = await res.json();
                    setHistoryDialog({open: true, adherentId: adherent.id, history});
                  }} color="info" title="Historique RIB">
                    <HistoryIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(adherent.id)} color="error" title="Supprimer">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredAdherents.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[20]}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Box>

      </Paper>

      {/* EXACT SPEC: Formulaire Adhérent */}
      <Dialog open={dialog.open} onClose={() => setDialog({open: false, adherent: null})} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📝 {dialog.adherent ? 'Modifier' : 'Ajouter'} un Adhérent
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Modifiable en cas de mise à jour RIB ou ajout nouvel adhérent (traçabilité conservée)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Règles de gestion :</strong><br/>
            • Le matricule ne peut pas être dupliqué pour une même société<br/>
            • Le RIB est unique à un seul adhérent (sauf cas exceptionnels)<br/>
            • Si un RIB existe déjà → alerte<br/>
            • Si un matricule existe déjà dans la même société → rejet
          </Alert>
          <Grid container spacing={2.5} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Matricule"
                value={form.matricule}
                onChange={(e) => setForm({...form, matricule: e.target.value})}
                fullWidth
                required
                disabled={!!dialog.adherent}
                helperText={dialog.adherent ? "Le matricule ne peut pas être modifié" : "Unique dans chaque société"}
                placeholder="Ex: M001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Société de rattachement"
                value={form.society}
                onChange={(e) => setForm({...form, society: e.target.value})}
                fullWidth
                required
                placeholder="Via l'identifiant existant"
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
                label="RIB (compte bancaire personnel)"
                value={form.rib}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setForm({...form, rib: value});
                }}
                fullWidth
                required
                helperText={`${form.rib.length}/20 chiffres - Le RIB doit contenir exactement 20 chiffres`}
                inputProps={{ maxLength: 20, pattern: '[0-9]*' }}
                error={checkDuplicateRib(form.rib, dialog.adherent?.id) || (form.rib.length > 0 && form.rib.length !== 20)}
                placeholder="12345678901234567890"
              />
              {checkDuplicateRib(form.rib, dialog.adherent?.id) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  ⚠️ ALERTE: Ce RIB est déjà utilisé par un autre adhérent. Sauf cas exceptionnels (compte partagé, compte familial).
                </Alert>
              )}
              {form.rib.length > 0 && form.rib.length !== 20 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  ❌ Le RIB doit contenir exactement 20 chiffres.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Code assuré"
                value={form.codeAssure}
                onChange={(e) => setForm({...form, codeAssure: e.target.value})}
                fullWidth
                required
                helperText="Lié au champ ajouté dans la table Contrat"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Numéro de contrat"
                value={form.numeroContrat}
                onChange={(e) => setForm({...form, numeroContrat: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Statut actif/inactif (optionnel)</InputLabel>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({...form, status: e.target.value as 'active' | 'inactive'})}
                  label="Statut actif/inactif (optionnel)"
                >
                  <MenuItem value="active">🟢 Actif</MenuItem>
                  <MenuItem value="inactive">⚫ Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialog({open: false, adherent: null})} variant="outlined">
            ❌ Annuler
          </Button>
          <Button onClick={handleSave} variant="contained" size="large">
            {dialog.adherent ? '💾 Enregistrer' : '+ Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📁 Importer des Adhérents</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le fichier doit contenir les colonnes: Matricule, Société, Nom, Prénom, RIB, Code Assuré, Numéro Contrat, Statut
          </Alert>
          <Box
            sx={{
              border: '2px dashed #1976d2',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: '#f5f9ff',
              '&:hover': { borderColor: 'primary.dark', bgcolor: '#e3f2fd' }
            }}
            component="label"
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <Typography variant="h6" color="primary">
              {importFile ? importFile.name : 'Cliquez pour sélectionner un fichier'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Formats acceptés: .xlsx, .xls, .csv
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleImportFile} 
            variant="contained"
            disabled={!importFile || importing}
          >
            {importing ? 'Import en cours...' : 'Importer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onClose={() => setHistoryDialog({open: false, adherentId: null, history: []})} maxWidth="md" fullWidth>
        <DialogTitle>📜 Historique des modifications RIB</DialogTitle>
        <DialogContent>
          {historyDialog.history.length === 0 ? (
            <Alert severity="info">Aucune modification de RIB</Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Ancien RIB</strong></TableCell>
                  <TableCell><strong>Nouveau RIB</strong></TableCell>
                  <TableCell><strong>Modifié par</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyDialog.history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell sx={{fontFamily: 'monospace', color: 'error.main'}}>{h.oldRib}</TableCell>
                    <TableCell sx={{fontFamily: 'monospace', color: 'success.main'}}>{h.newRib}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{h.updatedBy?.fullName || 'Utilisateur inconnu'}</Typography>
                      <Typography variant="caption" color="textSecondary">{h.updatedBy?.role || ''}</Typography>
                    </TableCell>
                    <TableCell>{new Date(h.updatedAt).toLocaleString('fr-FR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog({open: false, adherentId: null, history: []})}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdherentsTab;