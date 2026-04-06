import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, Stack, Box, TablePagination, Autocomplete, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface Adherent {
  id: string;
  matricule: string;
  name: string;
  surname: string;
  society: string;
  rib: string;
  codeAssure?: string;
  numeroContrat?: string;
  assurance?: string;
  status: 'active' | 'inactive';
  duplicateRib?: boolean;
}

import { useAuth } from '../../contexts/AuthContext';

const AdherentsTab: React.FC = () => {
  const { user } = useAuth();
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
    assurance: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [historyDialog, setHistoryDialog] = useState<{open: boolean, adherentId: string | null, history: any[]}>({open: false, adherentId: null, history: []});
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uniqueSocieties, setUniqueSocieties] = useState<Array<{name: string, count: number}>>([]);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, count: number}>({open: false, count: 0});
  const [showTips, setShowTips] = useState(false);
  const [duplicateRibDialog, setDuplicateRibDialog] = useState<{open: boolean, data: any}>({open: false, data: null});

  useEffect(() => {
    loadAdherents();
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  useEffect(() => {
    // Calculate unique societies with counts
    const societyMap = new Map<string, number>();
    adherents.forEach(adherent => {
      const count = societyMap.get(adherent.society) || 0;
      societyMap.set(adherent.society, count + 1);
    });
    
    const societies = Array.from(societyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
    
    setUniqueSocieties(societies);
  }, [adherents]);

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
        assurance: member.assurance || '',
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
      if (filters.search === '__DUPLICATE_RIB__') {
        filtered = filtered.filter(a => a.duplicateRib);
      } else {
        filtered = filtered.filter(a => 
          a.matricule.includes(filters.search) ||
          a.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          a.surname.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
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
      assurance: '',
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
      assurance: adherent.assurance || '',
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
        assurance: form.assurance,
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
          
          if (errorData.message && errorData.message.includes('already exists for adherent')) {
            const match = errorData.message.match(/RIB (.+) already exists for adherent (.+) \(Matricule: (.+), Société: (.+)\)/);
            if (match) {
              const [, rib, existingName, existingMatricule, existingSociete] = match;
              setDuplicateRibDialog({
                open: true,
                data: { rib, existingName, existingMatricule, existingSociete, newName: `${form.name} ${form.surname}`, newMatricule: form.matricule, newSociete: form.society }
              });
              return;
            }
          }
          
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
          
          if (errorData.message && errorData.message.includes('already exists for adherent')) {
            const match = errorData.message.match(/RIB (.+) already exists for adherent (.+) \(Matricule: (.+), Société: (.+)\)/);
            if (match) {
              const [, rib, existingName, existingMatricule, existingSociete] = match;
              setDuplicateRibDialog({
                open: true,
                data: { rib, existingName, existingMatricule, existingSociete, newName: `${form.name} ${form.surname}`, newMatricule: form.matricule, newSociete: form.society }
              });
              return;
            }
          }
          
          throw new Error(errorData.message || 'Failed to create adherent');
        }
      }
      
      setDialog({open: false, adherent: null});
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
    
    // FIXED: Create EMPTY template with ONLY headers (no data rows at all)
    const headers = [
      'Matricule',
      'Société',
      'Nom',
      'Prénom',
      'RIB',
      'Code Assuré',
      'Numéro Contrat',
      'Assurance',
      'Statut'
    ];
    
    // Create worksheet with only headers
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhérents');
    XLSX.writeFile(workbook, `template_adherents_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      
      const result = await response.json();
      
      if (!response.ok) {
        const errorMsg = result.message || 'Import failed';
        alert(`❌ ERREUR D'IMPORT\n\n${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Build detailed message
      const imported = result.imported || 0;
      const blocked = result.blocked || 0;
      const skipped = result.skipped || 0;
      const total = result.total || 0;
      
      console.log('📊 Import result:', { imported, blocked, skipped, total, result });
      
      // Show result in dialog instead of alert
      setDuplicateRibDialog({
        open: true,
        data: {
          isBulkImport: true,
          imported,
          blocked,
          skipped,
          total,
          otherErrors: skipped - blocked
        }
      });
      setImportDialog(false);
      setImportFile(null);
      await loadAdherents();
    } catch (error) {
      console.error('Import failed:', error);
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
                onClick={() => setDeleteDialog({open: true, count: selectedIds.length})}
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
      
      {/* Role-specific filter message */}
      {(user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR') && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Affichage limité à vos clients uniquement
        </Alert>
      )}

      {/* EXACT SPEC: Recherche & Filtres */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          🔍 Recherche & Filtres
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <TextField
            label="Recherche"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            size="small"
            placeholder="Matricule, nom, prénom..."
            sx={{ minWidth: 250 }}
          />
          
          <Autocomplete
            options={uniqueSocieties}
            getOptionLabel={(option) => `${option.name} (${option.count})`}
            value={uniqueSocieties.find(s => s.name === filters.society) || null}
            onChange={(event, newValue) => {
              setFilters({...filters, society: newValue?.name || ''});
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Société"
                placeholder="Tapez pour rechercher..."
                size="small"
              />
            )}
            isOptionEqualToValue={(option, value) => option.name === value.name}
            noOptionsText="Aucune société trouvée"
            size="small"
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
            🔄 Réinitialiser
          </Button>
        </Stack>
        
        {/* Quick Filter Buttons - Dynamic */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ alignSelf: 'center', mr: 1, fontWeight: 600 }}>
            Filtres rapides:
          </Typography>
          
          {/* RIB Dupliqués Filter - PRIORITY */}
          {duplicateRibCount > 0 && (
            <Button 
              size="small" 
              variant={filters.search === '__DUPLICATE_RIB__' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => {
                if (filters.search === '__DUPLICATE_RIB__') {
                  setFilters({...filters, search: ''});
                } else {
                  setFilters({...filters, search: '__DUPLICATE_RIB__'});
                }
              }}
              sx={{ textTransform: 'none', fontWeight: 600 }}
              startIcon={<WarningIcon />}
            >
              ⚠️ RIB Dupliqués ({duplicateRibCount})
            </Button>
          )}
          
          {uniqueSocieties.map((society) => (
            <Button 
              key={society.name}
              size="small" 
              variant={filters.society === society.name ? 'contained' : 'outlined'}
              onClick={() => setFilters({...filters, society: society.name})}
              sx={{ textTransform: 'none' }}
            >
              {society.name} ({society.count})
            </Button>
          ))}
          {uniqueSocieties.length === 0 && (
            <Typography variant="caption" color="textSecondary">
              Aucune société disponible
            </Typography>
          )}
        </Box>
      </Paper>

      {/* EXACT SPEC: Import massif section */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          📅 Import Massif
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          ⚠️ <strong>IMPORTANT:</strong> Le fichier Excel doit respecter EXACTEMENT la structure suivante (ordre et noms des colonnes) :
        </Typography>
        <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
          1. Matricule<br/>
          2. Société<br/>
          3. Nom<br/>
          4. Prénom<br/>
          5. RIB<br/>
          6. Code Assuré<br/>
          7. Numéro Contrat<br/>
          8. Assurance<br/>
          9. Statut
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 600 }}>
          ❌ Toute modification de cette structure entraînera le rejet du fichier.
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
              <TableCell><strong>Assurance</strong></TableCell>
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
                <TableCell>{adherent.assurance || '-'}</TableCell>
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
                  }} color="info" title="Historique des modifications">
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
          {/* Collapsible Tips Section */}
          <Box sx={{ mb: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="info"
              startIcon={showTips ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowTips(!showTips)}
              sx={{ 
                mb: showTips ? 2 : 0,
                textTransform: 'none',
                justifyContent: 'space-between',
                borderStyle: 'dashed',
                py: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {showTips ? '👆 Masquer les conseils et informations importantes' : '👉 Afficher les conseils et informations importantes (recommandé)'}
                </Typography>
              </Box>
            </Button>
            
            <Collapse in={showTips}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info">
                  <strong>Règles de gestion :</strong><br/>
                  • Le matricule ne peut pas être dupliqué pour une même société<br/>
                  • Le RIB est unique à un seul adhérent (sauf cas exceptionnels)<br/>
                  • Si un RIB existe déjà → alerte<br/>
                  • Si un matricule existe déjà dans la même société → rejet
                </Alert>
                
                <Alert severity="success" icon="✨">
                  <strong>💡 Remplissage automatique intelligent :</strong><br/>
                  Lorsque vous sélectionnez une <strong>Société de rattachement</strong>, le système remplit automatiquement :<br/>
                  • ✅ <strong>Assurance</strong> → Récupérée depuis la fiche client<br/>
                  • ✅ <strong>Code assuré</strong> → Récupéré depuis le contrat actif<br/>
                  • ❌ <strong>Numéro de contrat</strong> → À saisir manuellement (chaque adhérent a son propre numéro)<br/>
                </Alert>
                
                <Alert severity="error" icon="🚨" sx={{ bgcolor: '#ffebee', border: '2px solid #d32f2f' }}>
                  <strong>🚨 IMPORTANT - Structure des champs Nom et Prénom :</strong><br/>
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                    Les champs <strong>"Nom"</strong> et <strong>"Prénom"</strong> sont séparés pour des raisons critiques :
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                    <strong>❌ Pourquoi ne PAS les combiner en un seul champ :</strong><br/>
                    • <strong>Système bancaire</strong> → Les fichiers de virement utilisent un format strict (Nom + Prénom séparés). Toute modification peut causer des rejets de paiement<br/>
                    • <strong>8,304 adhérents</strong> → Migration complexe et irréversible de toutes les données existantes<br/>
                    • <strong>Fichiers Excel</strong> → Tous les modèles d'import deviennent invalides, nécessitant une mise à jour complète<br/>
                    • <strong>Historique</strong> → Perte de la traçabilité des modifications individuelles de nom ou prénom<br/>
                    • <strong>Tri et recherche</strong> → Impossible de trier par nom de famille ou rechercher séparément<br/>
                    • <strong>10+ fichiers système</strong> → Modifications majeures dans les modules Finance, Workflow, Reporting
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1, fontWeight: 600, color: '#d32f2f' }}>
                    ⚠️ Conséquence : Risque élevé d'erreurs de paiement, perte de données, et interruption du système bancaire.
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic', color: '#666' }}>
                    💡 La séparation Nom/Prénom est une norme bancaire et garantit la qualité et l'intégrité des données.
                  </Typography>
                </Alert>
                
                <Alert severity="warning" icon="⚠️" sx={{ bgcolor: '#fff3cd', border: '2px solid #ff9800' }}>
                  <strong>⚠️ ATTENTION - TRÈS IMPORTANT :</strong><br/>
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                    <strong style={{ color: '#d32f2f' }}>🚨 NE MODIFIEZ PAS les champs "Assurance" et "Code assuré" après le remplissage automatique !</strong>
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                    <strong>Pourquoi ?</strong><br/>
                    • Modifier <strong>"Assurance"</strong> → L'adhérent sera rattaché à la mauvaise compagnie<br/>
                    • Modifier <strong>"Code assuré"</strong> → Les remboursements iront au mauvais dossier<br/>
                    • Conséquence : <strong style={{ color: '#d32f2f' }}>❌ Erreurs de traitement, retards de paiement, réclamations</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1, fontWeight: 600, color: '#e65100' }}>
                    ✅ Règle simple : Les champs remplis automatiquement sont corrects. Ne les modifiez jamais.
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic', color: '#666' }}>
                    💡 Si vous pensez qu'une information automatique est incorrecte, ne la modifiez pas ici. Contactez votre responsable pour corriger la fiche client ou le contrat.
                  </Typography>
                </Alert>
              </Box>
            </Collapse>
          </Box>
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
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name}
                value={clients.find(c => c.name === form.society) || null}
                onChange={async (event, newValue) => {
                  console.log('🔍 Client selected:', newValue);
                  setForm({...form, society: newValue?.name || ''});
                  
                  // AUTO-FILL: Fetch client data when selected
                  if (newValue?.id) {
                    try {
                      console.log('📡 Fetching autofill data for client ID:', newValue.id);
                      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/clients/${newValue.id}/autofill-data`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        console.log('✅ Autofill data received:', result);
                        console.log('📊 Data to fill:', {
                          assurance: result.data.assurance,
                          codeAssure: result.data.codeAssure,
                          numeroContrat: result.data.numeroContrat
                        });
                        
                        // Auto-fill fields (user can still edit them)
                        setForm(prev => {
                          const newForm = {
                            ...prev,
                            assurance: result.data.assurance || prev.assurance,
                            codeAssure: result.data.codeAssure || prev.codeAssure
                            // numeroContrat is NOT auto-filled (per-adherent field)
                          };
                          console.log('📝 Form updated:', newForm);
                          return newForm;
                        });
                      } else {
                        const errorText = await response.text();
                        console.error('❌ Failed to fetch autofill data:', response.status, errorText);
                      }
                    } catch (error) {
                      console.error('❌ Error fetching autofill data:', error);
                    }
                  } else {
                    console.log('⚠️ No client ID available');
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Société de rattachement *"
                    required
                    placeholder="Tapez pour rechercher..."
                    helperText="Via l'identifiant existant"
                  />
                )}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                noOptionsText="Aucune société trouvée"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                fullWidth
                required
                helperText="Nom de famille (requis pour le système bancaire)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                value={form.surname}
                onChange={(e) => setForm({...form, surname: e.target.value})}
                fullWidth
                required
                helperText="Prénom (requis pour le système bancaire)"
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
              <TextField
                label="Assurance"
                value={form.assurance}
                onChange={(e) => setForm({...form, assurance: e.target.value})}
                fullWidth
                placeholder="Ex: PGH & FILIALES"
                helperText="Nom de la compagnie d'assurance"
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
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>⚠️ STRUCTURE OBLIGATOIRE:</strong><br/>
            Le fichier doit contenir EXACTEMENT ces colonnes dans cet ordre:<br/>
            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mt: 1 }}>
              Matricule | Société | Nom | Prénom | RIB | Code Assuré | Numéro Contrat | Assurance | Statut
            </Typography>
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
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <Typography variant="h6" color="primary">
              {importFile ? importFile.name : 'Cliquez pour sélectionner un fichier'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Formats acceptés: .xlsx, .xls
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
        <DialogTitle>📜 Historique des modifications</DialogTitle>
        <DialogContent>
          {historyDialog.history.length === 0 ? (
            <Alert severity="info">Aucune modification</Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Champ</strong></TableCell>
                  <TableCell><strong>Ancienne valeur</strong></TableCell>
                  <TableCell><strong>Nouvelle valeur</strong></TableCell>
                  <TableCell><strong>Modifié par</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyDialog.history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Chip 
                        label={h.field || 'RIB'} 
                        size="small" 
                        color={h.field === 'rib' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{fontFamily: h.field === 'rib' ? 'monospace' : 'inherit', color: 'error.main'}}>
                      {h.oldValue || h.oldRib || '-'}
                    </TableCell>
                    <TableCell sx={{fontFamily: h.field === 'rib' ? 'monospace' : 'inherit', color: 'success.main'}}>
                      {h.newValue || h.newRib || '-'}
                    </TableCell>
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

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({open: false, count: 0})}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Confirmation de suppression
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>⚠️ Attention :</strong> Cette action est irréversible!
          </Alert>
          <Typography variant="body1">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.count} adhérent(s)</strong> ?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Toutes les données associées seront définitivement supprimées.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialog({open: false, count: 0})} 
            variant="outlined"
            size="large"
          >
            ❌ Annuler
          </Button>
          <Button 
            onClick={async () => {
              setDeleteDialog({open: false, count: 0});
              
              let successCount = 0;
              let errorCount = 0;
              const errors: string[] = [];
              
              for (const id of selectedIds) {
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
                alert(`✅ ${successCount} adhérent(s) supprimé(s) avec succès!`);
              }
            }}
            variant="contained"
            color="error"
            size="large"
            startIcon={<DeleteIcon />}
          >
            🗑️ Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate RIB Dialog */}
      <Dialog 
        open={duplicateRibDialog.open} 
        onClose={() => setDuplicateRibDialog({open: false, data: null})}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: duplicateRibDialog.data?.isBulkImport ? 'info.light' : 'warning.light' }}>
          {duplicateRibDialog.data?.isBulkImport ? (
            <InfoIcon color="info" fontSize="large" />
          ) : (
            <WarningIcon color="warning" fontSize="large" />
          )}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {duplicateRibDialog.data?.isBulkImport ? '📊 Résultat de l\'Import' : '🚨 RIB Dupliqué Détecté'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {duplicateRibDialog.data?.isBulkImport ? (
            <Box>
              {/* Bulk Import Result */}
              {duplicateRibDialog.data.imported > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ✅ {duplicateRibDialog.data.imported} adhérent(s) importé(s) avec succès
                  </Typography>
                </Alert>
              )}
              
              {duplicateRibDialog.data.imported === 0 && duplicateRibDialog.data.total > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ℹ️ Aucun adhérent importé
                  </Typography>
                  <Typography variant="body2">
                    Tous les adhérents ont été rejetés (RIB dupliqués ou autres erreurs).
                  </Typography>
                </Alert>
              )}
              
              {duplicateRibDialog.data.blocked > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    ❌ {duplicateRibDialog.data.blocked} adhérent(s) bloqué(s) (RIB dupliqués)
                  </Typography>
                  <Typography variant="body2">
                    Ces adhérents ont été bloqués car leurs RIBs sont déjà utilisés par d'autres adhérents.
                  </Typography>
                </Alert>
              )}
              
              {duplicateRibDialog.data.otherErrors > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ {duplicateRibDialog.data.otherErrors} autre(s) erreur(s)
                  </Typography>
                  <Typography variant="body2">
                    Matricule dupliqué, client introuvable, RIB invalide, etc.
                  </Typography>
                </Alert>
              )}
              
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>📊 Résumé:</Typography>
                <Typography variant="body2">• Total traité: {duplicateRibDialog.data.total} ligne(s)</Typography>
                <Typography variant="body2" color="success.main">• Importés: {duplicateRibDialog.data.imported}</Typography>
                <Typography variant="body2" color="warning.main">• Bloqués (RIB dupliqués): {duplicateRibDialog.data.blocked}</Typography>
                <Typography variant="body2" color="error.main">• Autres erreurs: {duplicateRibDialog.data.otherErrors}</Typography>
              </Paper>
              
              {duplicateRibDialog.data.blocked > 0 && (
                <Alert severity="info">
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    🔔 Notification envoyée
                  </Typography>
                  <Typography variant="body2">
                    Une notification a été automatiquement envoyée au <strong>SUPER_ADMIN</strong> et <strong>RESPONSABLE_DEPARTEMENT</strong> pour approbation.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    💡 <strong>Cas possibles:</strong> Compte conjoint (mari/femme), compte familial, compte partagé.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Box>
              {/* Single Entry Duplicate */}
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ Cette opération a été bloquée
                </Typography>
                <Typography variant="body2">
                  Le RIB que vous tentez d'ajouter est déjà utilisé par un autre adhérent.
                </Typography>
              </Alert>

              {duplicateRibDialog.data && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    📋 Détails du conflit:
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff3cd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>RIB en conflit:</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'error.main' }}>
                      {duplicateRibDialog.data.rib}
                    </Typography>
                  </Paper>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8d7da' }}>
                        <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>❌ ADHÉRENT EXISTANT</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Nom:</strong> {duplicateRibDialog.data.existingName}</Typography>
                        <Typography variant="body2"><strong>Matricule:</strong> {duplicateRibDialog.data.existingMatricule}</Typography>
                        <Typography variant="body2"><strong>Société:</strong> {duplicateRibDialog.data.existingSociete}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#d1ecf1' }}>
                        <Typography variant="caption" color="info" sx={{ fontWeight: 600 }}>🆕 NOUVEL ADHÉRENT (Bloqué)</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Nom:</strong> {duplicateRibDialog.data.newName}</Typography>
                        <Typography variant="body2"><strong>Matricule:</strong> {duplicateRibDialog.data.newMatricule}</Typography>
                        <Typography variant="body2"><strong>Société:</strong> {duplicateRibDialog.data.newSociete}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      🔔 Notification envoyée
                    </Typography>
                    <Typography variant="body2">
                      Une notification a été automatiquement envoyée au <strong>SUPER_ADMIN</strong> et <strong>RESPONSABLE_DEPARTEMENT</strong> pour approbation.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      💡 <strong>Cas possibles:</strong> Compte conjoint (mari/femme), compte familial, compte partagé.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDuplicateRibDialog({open: false, data: null})} 
            variant="contained"
            size="large"
          >
            ✅ J'ai compris
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdherentsTab;