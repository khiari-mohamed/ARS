import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, Stack, Box, TablePagination, Autocomplete, Collapse,
  Card, CardContent, TableContainer
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

// ─── Shared table cell styles (mirrors dashboard design) ──────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.2,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.7,
  px: 1.2,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
const AdherentsTab: React.FC = () => {
  const { user } = useAuth();
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [filteredAdherents, setFilteredAdherents] = useState<Adherent[]>([]);
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    search: ''
  });
  const [dialog, setDialog] = useState<{ open: boolean, adherent: Adherent | null }>({
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
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean, adherentId: string | null, history: any[] }>({ open: false, adherentId: null, history: [] });
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [bulkDeleteBySocietyDialog, setBulkDeleteBySocietyDialog] = useState<{ open: boolean, society: string | null }>({ open: false, society: null });
  const [uniqueSocieties, setUniqueSocieties] = useState<Array<{ name: string, count: number }>>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, count: number }>({ open: false, count: 0 });
  const [showTips, setShowTips] = useState(false);
  const [duplicateRibDialog, setDuplicateRibDialog] = useState<{ open: boolean, data: any }>({ open: false, data: null });

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
      .sort((a, b) => b.count - a.count);

    setUniqueSocieties(societies);
  }, [adherents]);

  const loadAdherents = async () => {
    try {
      let data = [];

      try {
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

      if (data.length === 0) {
        try {
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
    setDialog({ open: true, adherent: null });
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
    setDialog({ open: true, adherent });
  };

  const checkDuplicateRib = (rib: string, excludeId?: string) => {
    return adherents.some(a => a.rib === rib && a.id !== excludeId);
  };

  const handleSave = async () => {
    try {
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

      setDialog({ open: false, adherent: null });
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

      const imported = result.imported || 0;
      const blocked = result.blocked || 0;
      const skipped = result.skipped || 0;
      const total = result.total || 0;

      console.log('📊 Import result:', { imported, blocked, skipped, total, result });

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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f', letterSpacing: -0.5 }}>
            Gestion de la Base Adhérents
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Adhérents ({filteredAdherents.length})
            {selectedIds.length > 0 && ` — ${selectedIds.length} sélectionné(s)`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog({ open: true, count: selectedIds.length })}
                sx={{ fontWeight: 600 }}
              >
                Supprimer ({selectedIds.length})
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setSelectedIds([]);
                  setSelectAllMode(false);
                }}
                sx={{ fontWeight: 600 }}
              >
                Désélectionner tout
              </Button>
            </>
          )}
          {filteredAdherents.length > 0 && (
            <Button
              variant={selectAllMode ? "contained" : "outlined"}
              color="primary"
              onClick={() => {
                if (selectAllMode) {
                  setSelectedIds([]);
                  setSelectAllMode(false);
                } else {
                  setSelectedIds(filteredAdherents.map(a => a.id));
                  setSelectAllMode(true);
                }
              }}
              sx={{ fontWeight: 600 }}
            >
              {selectAllMode ? `✓ Tous sélectionnés (${filteredAdherents.length})` : `Sélectionner tous (${filteredAdherents.length})`}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ fontWeight: 600 }}
          >
            + Ajouter un adhérent
          </Button>
        </Stack>
      </Box>

      {/* ── Alerts ── */}
      {duplicateRibCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }} icon={<WarningIcon />}>
          {duplicateRibCount} adhérent(s) avec des RIB dupliqués détecté(s). Vérifiez les justifications nécessaires.
        </Alert>
      )}

      {(user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR') && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Affichage limité à vos clients uniquement
        </Alert>
      )}

      {/* ── Filter Panel ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 3,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          🔍 Recherche &amp; Filtres
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <TextField
            label="Recherche"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            size="small"
            placeholder="Matricule, nom, prénom..."
            sx={{ minWidth: 250 }}
          />

          <Autocomplete
            options={uniqueSocieties}
            getOptionLabel={(option) => `${option.name} (${option.count})`}
            value={uniqueSocieties.find(s => s.name === filters.society) || null}
            onChange={(event, newValue) => {
              setFilters({ ...filters, society: newValue?.name || '' });
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
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="active">🟢 Actif</MenuItem>
              <MenuItem value="inactive">⚫ Inactif</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => setFilters({ society: '', status: '', search: '' })}
            size="small"
            sx={{ alignSelf: 'center' }}
          >
            🔄 Réinitialiser
          </Button>
        </Stack>

        {/* Quick Filter Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e3a5f', mr: 0.5 }}>
            Filtres rapides :
          </Typography>

          {duplicateRibCount > 0 && (
            <Button
              size="small"
              variant={filters.search === '__DUPLICATE_RIB__' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => {
                if (filters.search === '__DUPLICATE_RIB__') {
                  setFilters({ ...filters, search: '' });
                } else {
                  setFilters({ ...filters, search: '__DUPLICATE_RIB__' });
                }
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
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
              onClick={() => setFilters({ ...filters, society: society.name })}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              endIcon={
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBulkDeleteBySocietyDialog({ open: true, society: society.name });
                  }}
                  sx={{ p: 0, ml: 0.5, color: 'error.main', '&:hover': { bgcolor: 'error.light' } }}
                  title={`Supprimer tous les adhérents de ${society.name}`}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              }
            >
              {society.name} ({society.count})
            </Button>
          ))}
          {uniqueSocieties.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Aucune société disponible
            </Typography>
          )}
        </Box>
      </Paper>

      {/* ── Import massif section ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid #d0dff5',
          borderLeft: '4px solid #2196f3',
          borderRadius: 2,
          bgcolor: '#f0f9ff',
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1 }}>
            📅 Import Massif
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            ⚠️ <strong>IMPORTANT :</strong> Le fichier Excel doit respecter EXACTEMENT la structure suivante (ordre et noms des colonnes) :
          </Typography>
          <Box sx={{ fontFamily: 'monospace', bgcolor: '#ffffff', border: '1px solid #d0dff5', borderRadius: 1, p: 1.5, mb: 1.5, fontSize: '0.82rem', color: '#37474f' }}>
            1. Matricule &nbsp; 2. Société &nbsp; 3. Nom &nbsp; 4. Prénom &nbsp; 5. RIB &nbsp; 6. Code Assuré &nbsp; 7. Numéro Contrat &nbsp; 8. Assurance &nbsp; 9. Statut
          </Box>
          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600, mb: 2 }}>
            ❌ Toute modification de cette structure entraînera le rejet du fichier.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setImportDialog(true)}
              sx={{ fontWeight: 600 }}
            >
              📁 Importer fichier
            </Button>
            <Button
              variant="outlined"
              onClick={handleDownloadTemplate}
              sx={{ fontWeight: 600 }}
            >
              📋 Télécharger modèle
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Main Table Card ── */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.10)',
          borderRadius: 2,
        }}
      >
        <CardContent>
          {/* Card header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            pb={1.5}
            sx={{ borderBottom: '2px solid #e8edf5' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              Tableau des Adhérents
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {filteredAdherents.length} adhérent(s) affiché(s)
            </Typography>
          </Box>

          <TableContainer
            sx={{
              borderRadius: 1.5,
              border: '1px solid #dde3ef',
              overflow: 'auto',
              '&::-webkit-scrollbar': { height: 6, width: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: '#fff', cursor: 'pointer' }}
                      checked={
                        selectAllMode ||
                        (selectedIds.length === filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length &&
                        filteredAdherents.length > 0)
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const currentPageIds = filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(a => a.id);
                          setSelectedIds([...new Set([...selectedIds, ...currentPageIds])]);
                        } else {
                          const currentPageIds = filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(a => a.id);
                          setSelectedIds(selectedIds.filter(id => !currentPageIds.includes(id)));
                          setSelectAllMode(false);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Matricule</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Société</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Nom et Prénom</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>RIB (20 chiffres)</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Code assuré</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>N° Contrat</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Assurance</TableCell>
                  <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut</TableCell>
                  <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAdherents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((adherent, index) => (
                  <TableRow
                    key={adherent.id}
                    sx={{
                      backgroundColor: selectedIds.includes(adherent.id)
                        ? '#e3f2fd'
                        : adherent.duplicateRib
                        ? '#fff8e1'
                        : index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                      '&:hover': {
                        backgroundColor: adherent.duplicateRib ? '#fff3cd' : '#e8f0fe',
                      },
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                      <input
                        type="checkbox"
                        style={{ accentColor: '#1e3a5f', cursor: 'pointer' }}
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
                    <TableCell sx={BODY_CELL_SX}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace' }}>
                        {adherent.matricule}
                      </Typography>
                      {adherent.duplicateRib && (
                        <Chip label="RIB Dupliqué" color="warning" size="small" sx={{ mt: 0.3 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                      {adherent.society}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap' }}>
                      {adherent.name} {adherent.surname}
                    </TableCell>
                    <TableCell sx={BODY_CELL_SX}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#37474f' }}>
                        {adherent.rib}
                      </Typography>
                      {adherent.rib.length !== 20 && (
                        <Chip label="RIB Invalide" color="error" size="small" sx={{ mt: 0.3 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, color: '#546e7a', fontSize: '0.78rem' }}>
                      {adherent.codeAssure || '—'}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, color: '#546e7a', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {adherent.numeroContrat || '—'}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, color: '#546e7a', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {adherent.assurance || '—'}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                      {getStatusChip(adherent.status)}
                    </TableCell>
                    <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(adherent)}
                          title="Modifier"
                          sx={{
                            color: '#1e3a5f',
                            '&:hover': { bgcolor: '#e8f0fe' },
                            p: 0.5,
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/${adherent.id}/rib-history`, {
                              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            });
                            const history = await res.json();
                            setHistoryDialog({ open: true, adherentId: adherent.id, history });
                          }}
                          color="info"
                          title="Historique des modifications"
                          sx={{ '&:hover': { bgcolor: '#e3f2fd' }, p: 0.5 }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(adherent.id)}
                          color="error"
                          title="Supprimer"
                          sx={{ '&:hover': { bgcolor: '#fdecea' }, p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box
            sx={{
              mt: 1.5, display: 'flex', justifyContent: 'flex-end',
              bgcolor: '#f4f7fb', borderRadius: 1.5,
              border: '1px solid #e0e7ef',
            }}
          >
            <TablePagination
              component="div"
              count={filteredAdherents.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[20]}
              labelRowsPerPage="Lignes par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </Box>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS — zero logic changes
      ══════════════════════════════════════════════════════════════════════ */}

      {/* EXACT SPEC: Formulaire Adhérent */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, adherent: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            📝 {dialog.adherent ? 'Modifier' : 'Ajouter'} un Adhérent
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Modifiable en cas de mise à jour RIB ou ajout nouvel adhérent (traçabilité conservée)
          </Typography>
        </DialogTitle>
        <DialogContent>
          {/* Collapsible Tips Section */}
          <Box sx={{ mb: 2, mt: 2 }}>
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
                py: 1.5,
                borderRadius: 1.5,
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
                  <strong>Règles de gestion :</strong><br />
                  • Le matricule ne peut pas être dupliqué pour une même société<br />
                  • Le RIB est unique à un seul adhérent (sauf cas exceptionnels)<br />
                  • Si un RIB existe déjà → alerte<br />
                  • Si un matricule existe déjà dans la même société → rejet
                </Alert>

                <Alert severity="success" icon="✨">
                  <strong>💡 Remplissage automatique intelligent :</strong><br />
                  Lorsque vous sélectionnez une <strong>Société de rattachement</strong>, le système remplit automatiquement :<br />
                  • ✅ <strong>Assurance</strong> → Récupérée depuis la fiche client<br />
                  • ✅ <strong>Code assuré</strong> → Récupéré depuis le contrat actif<br />
                  • ❌ <strong>Numéro de contrat</strong> → À saisir manuellement (chaque adhérent a son propre numéro)
                </Alert>

                <Alert severity="error" icon="🚨" sx={{ bgcolor: '#ffebee', border: '2px solid #d32f2f' }}>
                  <strong>🚨 IMPORTANT - Structure des champs Nom et Prénom :</strong><br />
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                    Les champs <strong>"Nom"</strong> et <strong>"Prénom"</strong> sont séparés pour des raisons critiques :
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                    <strong>❌ Pourquoi ne PAS les combiner en un seul champ :</strong><br />
                    • <strong>Système bancaire</strong> → Les fichiers de virement utilisent un format strict (Nom + Prénom séparés). Toute modification peut causer des rejets de paiement<br />
                    • <strong>8,304 adhérents</strong> → Migration complexe et irréversible de toutes les données existantes<br />
                    • <strong>Fichiers Excel</strong> → Tous les modèles d'import deviennent invalides, nécessitant une mise à jour complète<br />
                    • <strong>Historique</strong> → Perte de la traçabilité des modifications individuelles de nom ou prénom<br />
                    • <strong>Tri et recherche</strong> → Impossible de trier par nom de famille ou rechercher séparément<br />
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
                  <strong>⚠️ ATTENTION - TRÈS IMPORTANT :</strong><br />
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                    <strong style={{ color: '#d32f2f' }}>🚨 NE MODIFIEZ PAS les champs "Assurance" et "Code assuré" après le remplissage automatique !</strong>
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                    <strong>Pourquoi ?</strong><br />
                    • Modifier <strong>"Assurance"</strong> → L'adhérent sera rattaché à la mauvaise compagnie<br />
                    • Modifier <strong>"Code assuré"</strong> → Les remboursements iront au mauvais dossier<br />
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

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Matricule"
                value={form.matricule}
                onChange={(e) => setForm({ ...form, matricule: e.target.value })}
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
                  setForm({ ...form, society: newValue?.name || '' });

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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                required
                helperText="Nom de famille (requis pour le système bancaire)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                value={form.surname}
                onChange={(e) => setForm({ ...form, surname: e.target.value })}
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
                  setForm({ ...form, rib: value });
                }}
                fullWidth
                required
                helperText={`${form.rib.length}/20 chiffres - Le RIB doit contenir exactement 20 chiffres`}
                inputProps={{ maxLength: 20, pattern: '[0-9]*' }}
                error={checkDuplicateRib(form.rib, dialog.adherent?.id) || (form.rib.length > 0 && form.rib.length !== 20)}
                placeholder="12345678901234567890"
              />
              {checkDuplicateRib(form.rib, dialog.adherent?.id) && (
                <Alert severity="warning" sx={{ mt: 1, borderRadius: 1 }}>
                  ⚠️ ALERTE : Ce RIB est déjà utilisé par un autre adhérent. Sauf cas exceptionnels (compte partagé, compte familial).
                </Alert>
              )}
              {form.rib.length > 0 && form.rib.length !== 20 && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 1 }}>
                  ❌ Le RIB doit contenir exactement 20 chiffres.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Code assuré"
                value={form.codeAssure}
                onChange={(e) => setForm({ ...form, codeAssure: e.target.value })}
                fullWidth
                required
                helperText="Lié au champ ajouté dans la table Contrat"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Numéro de contrat"
                value={form.numeroContrat}
                onChange={(e) => setForm({ ...form, numeroContrat: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Assurance"
                value={form.assurance}
                onChange={(e) => setForm({ ...form, assurance: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                  label="Statut actif/inactif (optionnel)"
                >
                  <MenuItem value="active">🟢 Actif</MenuItem>
                  <MenuItem value="inactive">⚫ Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setDialog({ open: false, adherent: null })} variant="outlined">
            ❌ Annuler
          </Button>
          <Button onClick={handleSave} variant="contained" size="large">
            {dialog.adherent ? '💾 Enregistrer' : '+ Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>📁 Importer des Adhérents</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2, borderRadius: 1.5 }}>
            <strong>⚠️ STRUCTURE OBLIGATOIRE :</strong><br />
            Le fichier doit contenir EXACTEMENT ces colonnes dans cet ordre :<br />
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
            <Typography variant="caption" color="text.secondary">
              Formats acceptés : .xlsx, .xls
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setImportDialog(false)} variant="outlined">Annuler</Button>
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
      <Dialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, adherentId: null, history: [] })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>📜 Historique des modifications</Typography>
        </DialogTitle>
        <DialogContent>
          {historyDialog.history.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>Aucune modification</Alert>
          ) : (
            <TableContainer sx={{ mt: 2, borderRadius: 1.5, border: '1px solid #dde3ef' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={HEAD_CELL_SX}>Champ</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Ancienne valeur</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Nouvelle valeur</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Modifié par</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyDialog.history.map((h: any, index: number) => (
                    <TableRow
                      key={h.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={BODY_CELL_SX}>
                        <Chip
                          label={h.field || 'RIB'}
                          size="small"
                          color={h.field === 'rib' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, fontFamily: h.field === 'rib' ? 'monospace' : 'inherit', color: 'error.main' }}>
                        {h.oldValue || h.oldRib || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, fontFamily: h.field === 'rib' ? 'monospace' : 'inherit', color: 'success.main' }}>
                        {h.newValue || h.newRib || '—'}
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{h.updatedBy?.fullName || 'Utilisateur inconnu'}</Typography>
                        <Typography variant="caption" color="text.secondary">{h.updatedBy?.role || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                        {new Date(h.updatedAt).toLocaleString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc' }}>
          <Button onClick={() => setHistoryDialog({ open: false, adherentId: null, history: [] })} variant="outlined">Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, count: 0 })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e0e7ef', bgcolor: '#fff8e1' }}>
          <WarningIcon color="error" fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Confirmation de suppression
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2, borderRadius: 1.5 }}>
            <strong>⚠️ Attention :</strong> Cette action est irréversible !
          </Alert>
          <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
            <Typography variant="body1">
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.count} adhérent(s)</strong> ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Toutes les données associées seront définitivement supprimées.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, count: 0 })}
            variant="outlined"
            size="large"
          >
            ❌ Annuler
          </Button>
          <Button
            onClick={async () => {
              setDeleteDialog({ open: false, count: 0 });

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
        onClose={() => setDuplicateRibDialog({ open: false, data: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: duplicateRibDialog.data?.isBulkImport ? '#e3f2fd' : '#fff8e1',
            borderBottom: '1px solid #e0e7ef',
          }}
        >
          {duplicateRibDialog.data?.isBulkImport ? (
            <InfoIcon color="info" fontSize="large" />
          ) : (
            <WarningIcon color="warning" fontSize="large" />
          )}
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {duplicateRibDialog.data?.isBulkImport ? "📊 Résultat de l'Import" : '🚨 RIB Dupliqué Détecté'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {duplicateRibDialog.data?.isBulkImport ? (
            <Box>
              {duplicateRibDialog.data.imported > 0 && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ✅ {duplicateRibDialog.data.imported} adhérent(s) importé(s) avec succès
                  </Typography>
                </Alert>
              )}

              {duplicateRibDialog.data.imported === 0 && duplicateRibDialog.data.total > 0 && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ℹ️ Aucun adhérent importé
                  </Typography>
                  <Typography variant="body2">
                    Tous les adhérents ont été rejetés (RIB dupliqués ou autres erreurs).
                  </Typography>
                </Alert>
              )}

              {duplicateRibDialog.data.blocked > 0 && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    ❌ {duplicateRibDialog.data.blocked} adhérent(s) bloqué(s) (RIB dupliqués)
                  </Typography>
                  <Typography variant="body2">
                    Ces adhérents ont été bloqués car leurs RIBs sont déjà utilisés par d'autres adhérents.
                  </Typography>
                </Alert>
              )}

              {duplicateRibDialog.data.otherErrors > 0 && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ {duplicateRibDialog.data.otherErrors} autre(s) erreur(s)
                  </Typography>
                  <Typography variant="body2">
                    Matricule dupliqué, client introuvable, RIB invalide, etc.
                  </Typography>
                </Alert>
              )}

              <Box sx={{ p: 2, mb: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1e3a5f' }}>📊 Résumé :</Typography>
                <Typography variant="body2">• Total traité : {duplicateRibDialog.data.total} ligne(s)</Typography>
                <Typography variant="body2" color="success.main">• Importés : {duplicateRibDialog.data.imported}</Typography>
                <Typography variant="body2" color="warning.main">• Bloqués (RIB dupliqués) : {duplicateRibDialog.data.blocked}</Typography>
                <Typography variant="body2" color="error.main">• Autres erreurs : {duplicateRibDialog.data.otherErrors}</Typography>
              </Box>

              {duplicateRibDialog.data.blocked > 0 && (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    🔔 Notification envoyée
                  </Typography>
                  <Typography variant="body2">
                    Une notification a été automatiquement envoyée au <strong>SUPER_ADMIN</strong> et <strong>RESPONSABLE_DEPARTEMENT</strong> pour approbation.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    💡 <strong>Cas possibles :</strong> Compte conjoint (mari/femme), compte familial, compte partagé.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Box>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ Cette opération a été bloquée
                </Typography>
                <Typography variant="body2">
                  Le RIB que vous tentez d'ajouter est déjà utilisé par un autre adhérent.
                </Typography>
              </Alert>

              {duplicateRibDialog.data && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#1e3a5f' }}>
                    📋 Détails du conflit :
                  </Typography>

                  <Box sx={{ p: 2, mb: 2, bgcolor: '#fff8e1', borderRadius: 1.5, border: '1px solid #ffcc80' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>RIB en conflit :</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'error.main' }}>
                      {duplicateRibDialog.data.rib}
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#fdecea', borderRadius: 1.5, border: '1px solid #ef9a9a', height: '100%' }}>
                        <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>❌ ADHÉRENT EXISTANT</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Nom :</strong> {duplicateRibDialog.data.existingName}</Typography>
                        <Typography variant="body2"><strong>Matricule :</strong> {duplicateRibDialog.data.existingMatricule}</Typography>
                        <Typography variant="body2"><strong>Société :</strong> {duplicateRibDialog.data.existingSociete}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1.5, border: '1px solid #90caf9', height: '100%' }}>
                        <Typography variant="caption" color="info" sx={{ fontWeight: 700 }}>🆕 NOUVEL ADHÉRENT (Bloqué)</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Nom :</strong> {duplicateRibDialog.data.newName}</Typography>
                        <Typography variant="body2"><strong>Matricule :</strong> {duplicateRibDialog.data.newMatricule}</Typography>
                        <Typography variant="body2"><strong>Société :</strong> {duplicateRibDialog.data.newSociete}</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 3, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      🔔 Notification envoyée
                    </Typography>
                    <Typography variant="body2">
                      Une notification a été automatiquement envoyée au <strong>SUPER_ADMIN</strong> et <strong>RESPONSABLE_DEPARTEMENT</strong> pour approbation.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      💡 <strong>Cas possibles :</strong> Compte conjoint (mari/femme), compte familial, compte partagé.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc' }}>
          <Button
            onClick={() => setDuplicateRibDialog({ open: false, data: null })}
            variant="contained"
            size="large"
          >
            ✅ J'ai compris
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete by Society Dialog */}
      <Dialog
        open={bulkDeleteBySocietyDialog.open}
        onClose={() => setBulkDeleteBySocietyDialog({ open: false, society: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e0e7ef', bgcolor: '#fff3cd' }}>
          <WarningIcon color="error" fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Suppression massive par société
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2, mt: 2, borderRadius: 1.5 }}>
            <strong>🚨 ATTENTION - ACTION CRITIQUE :</strong> Cette opération est irréversible !
          </Alert>
          <Box sx={{ p: 2, bgcolor: '#fff8e1', borderRadius: 1.5, border: '2px solid #ff9800', mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#e65100' }}>
              Vous êtes sur le point de supprimer TOUS les adhérents de :
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#d32f2f', mb: 1 }}>
              📌 {bulkDeleteBySocietyDialog.society}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#d32f2f' }}>
              {uniqueSocieties.find(s => s.name === bulkDeleteBySocietyDialog.society)?.count || 0} adhérent(s)
            </Typography>
          </Box>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ⚠️ Cette action va :
            </Typography>
            <Typography variant="body2" component="div">
              • Supprimer définitivement tous les adhérents de cette société<br />
              • Supprimer tous leurs RIB et données associées<br />
              • Supprimer l'historique des modifications<br />
              • Cette opération ne peut PAS être annulée
            </Typography>
          </Alert>
          <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1e3a5f' }}>
              Pour confirmer, tapez le nom exact de la société :
            </Typography>
            <TextField
              fullWidth
              placeholder={bulkDeleteBySocietyDialog.society || ''}
              id="confirm-society-name"
              autoComplete="off"
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button
            onClick={() => setBulkDeleteBySocietyDialog({ open: false, society: null })}
            variant="outlined"
            size="large"
          >
            ❌ Annuler
          </Button>
          <Button
            onClick={async () => {
              const inputElement = document.getElementById('confirm-society-name') as HTMLInputElement;
              const confirmedName = inputElement?.value || '';

              if (confirmedName !== bulkDeleteBySocietyDialog.society) {
                alert('❌ Le nom de la société ne correspond pas. Suppression annulée.');
                return;
              }

              const societyToDelete = bulkDeleteBySocietyDialog.society;
              const adherentsToDelete = adherents.filter(a => a.society === societyToDelete);
              const totalToDelete = adherentsToDelete.length;

              if (totalToDelete === 0) {
                alert('Aucun adhérent trouvé pour cette société.');
                setBulkDeleteBySocietyDialog({ open: false, society: null });
                return;
              }

              if (!window.confirm(`🚨 DERNIÈRE CONFIRMATION\n\nVous allez supprimer ${totalToDelete} adhérent(s) de "${societyToDelete}".\n\nCette action est IRRÉVERSIBLE.\n\nContinuer ?`)) {
                return;
              }

              setBulkDeleteBySocietyDialog({ open: false, society: null });

              let successCount = 0;
              let errorCount = 0;
              const errors: string[] = [];

              const startTime = Date.now();
              console.log(`🗑️ Starting bulk delete: ${totalToDelete} adherents from ${societyToDelete}`);

              for (const adherent of adherentsToDelete) {
                try {
                  const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/adherents/${adherent.id}`, {
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

                  if (successCount % 50 === 0) {
                    console.log(`⏳ Progress: ${successCount}/${totalToDelete} deleted...`);
                  }
                } catch (error: any) {
                  errorCount++;
                  errors.push(`${adherent.matricule}: ${error.message || 'Erreur inconnue'}`);
                  console.error(`❌ Failed to delete ${adherent.matricule}:`, error);
                }
              }

              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`✅ Bulk delete completed in ${elapsed}s: ${successCount} success, ${errorCount} errors`);

              await loadAdherents();

              if (errorCount > 0) {
                alert(`⚠️ Suppression terminée en ${elapsed}s\n\n✅ ${successCount} supprimé(s)\n❌ ${errorCount} échec(s)\n\nPremière erreur: ${errors[0]}`);
              } else {
                alert(`✅ Suppression réussie !\n\n${successCount} adhérent(s) de "${societyToDelete}" supprimé(s) en ${elapsed}s`);
              }
            }}
            variant="contained"
            color="error"
            size="large"
            startIcon={<DeleteIcon />}
          >
            🗑️ SUPPRIMER DÉFINITIVEMENT
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdherentsTab;