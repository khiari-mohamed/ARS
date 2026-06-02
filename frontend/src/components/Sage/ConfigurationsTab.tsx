import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox, Chip, CircularProgress, Card,
  CardContent, Stack, TablePagination, Grid, FormControl, InputLabel, Select,
  MenuItem, Collapse, InputAdornment
} from '@mui/material';
import { Edit, Delete, Add, Warning, FilterList, FilterListOff } from '@mui/icons-material';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const token = () => localStorage.getItem('token');
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });

// ─── Shared cell styles ───────────────────────────────────────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.8,
  px: 1.5,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

interface DonneurOrdre {
  id: string;
  nom: string;
  codeJournal: string;
  compteTresorerie: string;
  compteGeneralTiers: string;
}

interface Client {
  id: string;
  name: string;
  compteAuxiliaireSage: string;
  modeRecuperation: string;
}

interface CompagnieAssurance {
  id: string;
  nom: string;
  compteGeneralSage: string;
}

// ─── Delete dialog state shape ────────────────────────────────────────────────
interface DeleteDialogState {
  open: boolean;
  // 'single' = one row delete button; 'bulk' = bulk delete button
  mode: 'single' | 'bulk';
  // for single deletes
  itemId: string | null;
  itemLabel: string;
  // 'donneur' — the only entity that can actually be deleted
  entity: 'donneur' | 'client' | 'compagnie';
}

const ConfigurationsTab: React.FC = () => {
  const [subTab, setSubTab] = useState(0);
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [compagnies, setCompagnies] = useState<CompagnieAssurance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // ── Pagination (clients only) ──────────────────────────────────────────────
  const [clientPage, setClientPage] = useState(0);
  const [clientRowsPerPage, setClientRowsPerPage] = useState(20);

  // ── Filters ────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Donneurs d'Ordre filters
  const [nomDonneur, setNomDonneur] = useState('');
  const [codeJournal, setCodeJournal] = useState('');
  const [compteTresorerie, setCompteTresorerie] = useState('');
  const [compteGeneralTiers, setCompteGeneralTiers] = useState('');
  
  // Clients filters
  const [nomClient, setNomClient] = useState('');
  const [compteAuxiliaireSage, setCompteAuxiliaireSage] = useState('');
  const [modeRecuperation, setModeRecuperation] = useState('');
  
  // Compagnies Assurance filters
  const [nomCompagnie, setNomCompagnie] = useState('');
  const [compteGeneralSage, setCompteGeneralSage] = useState('');

  // ── Custom delete dialog ───────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    mode: 'single',
    itemId: null,
    itemLabel: '',
    entity: 'donneur',
  });

  const resetAdvancedFilters = () => {
    setNomDonneur('');
    setCodeJournal('');
    setCompteTresorerie('');
    setCompteGeneralTiers('');
    setNomClient('');
    setCompteAuxiliaireSage('');
    setModeRecuperation('');
    setNomCompagnie('');
    setCompteGeneralSage('');
    setClientPage(0);
  };

  const hasAdvancedFilters = !!(
    nomDonneur || codeJournal || compteTresorerie || compteGeneralTiers ||
    nomClient || compteAuxiliaireSage || modeRecuperation ||
    nomCompagnie || compteGeneralSage
  );

  // Apply filters to data
  const applyFilters = (data: any[]) => {
    let result = data;

    if (subTab === 0) {
      // Donneurs d'Ordre filters
      if (nomDonneur.trim()) {
        result = result.filter(item => 
          item.nom?.toLowerCase().includes(nomDonneur.trim().toLowerCase())
        );
      }
      if (codeJournal.trim()) {
        result = result.filter(item => 
          item.codeJournal?.toLowerCase().includes(codeJournal.trim().toLowerCase())
        );
      }
      if (compteTresorerie.trim()) {
        result = result.filter(item => 
          item.compteTresorerie?.toLowerCase().includes(compteTresorerie.trim().toLowerCase())
        );
      }
      if (compteGeneralTiers.trim()) {
        result = result.filter(item => 
          item.compteGeneralTiers?.toLowerCase().includes(compteGeneralTiers.trim().toLowerCase())
        );
      }
    } else if (subTab === 1) {
      // Clients filters
      if (nomClient.trim()) {
        result = result.filter(item => 
          item.name?.toLowerCase().includes(nomClient.trim().toLowerCase())
        );
      }
      if (compteAuxiliaireSage.trim()) {
        result = result.filter(item => 
          item.compteAuxiliaireSage?.toLowerCase().includes(compteAuxiliaireSage.trim().toLowerCase())
        );
      }
      if (modeRecuperation.trim()) {
        result = result.filter(item => 
          item.modeRecuperation?.toLowerCase().includes(modeRecuperation.trim().toLowerCase())
        );
      }
    } else if (subTab === 2) {
      // Compagnies Assurance filters
      if (nomCompagnie.trim()) {
        result = result.filter(item => 
          item.nom?.toLowerCase().includes(nomCompagnie.trim().toLowerCase())
        );
      }
      if (compteGeneralSage.trim()) {
        result = result.filter(item => 
          item.compteGeneralSage?.toLowerCase().includes(compteGeneralSage.trim().toLowerCase())
        );
      }
    }

    return result;
  };

  const filteredDonneurs = applyFilters(donneurs);
  const filteredClients = applyFilters(clients);
  const filteredCompagnies = applyFilters(compagnies);

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 0) {
        const res = await fetch(`${API}/finance/donneurs-ordre`, { headers: headers() });
        setDonneurs(await res.json());
      } else if (subTab === 1) {
        const res = await fetch(`${API}/clients`, { headers: headers() });
        const data = await res.json();
        setClients(data);
      } else {
        const res = await fetch(`${API}/finance/compagnies-assurance`, { headers: headers() });
        setCompagnies(await res.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  // ── Delete dialog openers ──────────────────────────────────────────────────
  const openSingleDelete = (entity: DeleteDialogState['entity'], id: string, label: string) => {
    setDeleteDialog({ open: true, mode: 'single', itemId: id, itemLabel: label, entity });
  };

  const openBulkDelete = () => {
    const entity: DeleteDialogState['entity'] =
      subTab === 0 ? 'donneur' : subTab === 1 ? 'client' : 'compagnie';
    setDeleteDialog({ open: true, mode: 'bulk', itemId: null, itemLabel: '', entity });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  // ── Confirmed delete handler ───────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    closeDeleteDialog();

    if (deleteDialog.entity === 'client' || deleteDialog.entity === 'compagnie') {
      // These entities cannot be deleted — nothing to do (dialog already showed the message)
      return;
    }

    // Only donneurs can actually be deleted
    try {
      if (deleteDialog.mode === 'single' && deleteDialog.itemId) {
        await fetch(`${API}/finance/donneurs-ordre/${deleteDialog.itemId}`, {
          method: 'DELETE',
          headers: headers(),
        });
      } else if (deleteDialog.mode === 'bulk') {
        for (const id of selected) {
          await fetch(`${API}/finance/donneurs-ordre/${id}`, {
            method: 'DELETE',
            headers: headers(),
          });
        }
        setSelected([]);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (subTab === 0) {
        const url = editItem.id
          ? `${API}/finance/donneurs-ordre/${editItem.id}`
          : `${API}/finance/donneurs-ordre`;
        await fetch(url, {
          method: editItem.id ? 'PUT' : 'POST',
          headers: headers(),
          body: JSON.stringify(editItem),
        });
      } else if (subTab === 1) {
        await fetch(`${API}/finance/clients/${editItem.id}/sage-config`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ compteAuxiliaireSage: editItem.compteAuxiliaireSage }),
        });
      } else {
        await fetch(`${API}/finance/compagnies-assurance/${editItem.id}/sage-config`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ compteGeneralSage: editItem.compteGeneralSage }),
        });
      }
      setEditDialog(false);
      setEditItem(null);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const subTabLabels = ["Donneurs d'Ordre", 'Clients', 'Compagnies Assurance'];

  // ── Table renderers ────────────────────────────────────────────────────────

  const renderDonneursTable = () => (
    <TableContainer
      sx={{
        borderRadius: 1.5,
        border: '1px solid #dde3ef',
        '&::-webkit-scrollbar': { height: 6, width: 6 },
        '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
              <Checkbox
                sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                checked={selected.length === filteredDonneurs.length && filteredDonneurs.length > 0}
                onChange={(e) => setSelected(e.target.checked ? filteredDonneurs.map(d => d.id) : [])}
              />
            </TableCell>
            <TableCell sx={HEAD_CELL_SX}>Nom</TableCell>
            <TableCell sx={HEAD_CELL_SX}>Code Journal</TableCell>
            <TableCell sx={HEAD_CELL_SX}>Compte Trésorerie</TableCell>
            <TableCell sx={HEAD_CELL_SX}>Compte Général Tiers</TableCell>
            <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredDonneurs.map((d, index) => (
            <TableRow
              key={d.id}
              sx={{
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                '&:hover': { backgroundColor: '#e8f0fe' },
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                <Checkbox
                  size="small"
                  checked={selected.includes(d.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, d.id] : selected.filter(id => id !== d.id))}
                />
              </TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f' }}>{d.nom}</TableCell>
              <TableCell sx={BODY_CELL_SX}>
                <Chip label={d.codeJournal} size="small" sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 700, fontFamily: 'monospace' }} />
              </TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, fontFamily: 'monospace', color: '#37474f' }}>{d.compteTresorerie}</TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, fontFamily: 'monospace', color: '#37474f' }}>{d.compteGeneralTiers}</TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                  <IconButton size="small" onClick={() => { setEditItem(d); setEditDialog(true); }}
                    sx={{ color: '#1e3a5f', '&:hover': { bgcolor: '#e8f0fe' }, p: 0.5 }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small"
                    onClick={() => openSingleDelete('donneur', d.id, d.nom)}
                    sx={{ color: '#b71c1c', '&:hover': { bgcolor: '#fdecea' }, p: 0.5 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderClientsTable = () => (
    <>
      <TableContainer
        sx={{
          borderRadius: 1.5,
          border: '1px solid #dde3ef',
          '&::-webkit-scrollbar': { height: 6, width: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
                <Checkbox
                  sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                  checked={selected.length === filteredClients.length && filteredClients.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? filteredClients.map(c => c.id) : [])}
                />
              </TableCell>
              <TableCell sx={HEAD_CELL_SX}>Nom</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Compte Auxiliaire Sage</TableCell>
              <TableCell sx={HEAD_CELL_SX}>Mode Récupération</TableCell>
              <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClients
              .slice(clientPage * clientRowsPerPage, clientPage * clientRowsPerPage + clientRowsPerPage)
              .map((c, index) => (
                <TableRow
                  key={c.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                    '&:hover': { backgroundColor: '#e8f0fe' },
                    '&:last-child td': { borderBottom: 0 },
                  }}
                >
                  <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                    <Checkbox
                      size="small"
                      checked={selected.includes(c.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))}
                    />
                  </TableCell>
                  <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f' }}>{c.name}</TableCell>
                  <TableCell sx={BODY_CELL_SX}>
                    <Chip label={c.compteAuxiliaireSage} size="small" color="primary" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ ...BODY_CELL_SX, color: '#546e7a' }}>{c.modeRecuperation}</TableCell>
                  <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => { setEditItem(c); setEditDialog(true); }}
                        sx={{ color: '#1e3a5f', '&:hover': { bgcolor: '#e8f0fe' }, p: 0.5 }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small"
                        onClick={() => openSingleDelete('client', c.id, c.name)}
                        sx={{ color: '#b71c1c', '&:hover': { bgcolor: '#fdecea' }, p: 0.5 }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          mt: 1.5,
          bgcolor: '#f4f7fb',
          borderRadius: 1.5,
          border: '1px solid #e0e7ef',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <TablePagination
          component="div"
          count={filteredClients.length}
          page={clientPage}
          onPageChange={(_, newPage) => setClientPage(newPage)}
          rowsPerPage={clientRowsPerPage}
          onRowsPerPageChange={(e) => {
            setClientRowsPerPage(parseInt(e.target.value, 10));
            setClientPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Box>
    </>
  );

  const renderCompagniesTable = () => (
    <TableContainer
      sx={{
        borderRadius: 1.5,
        border: '1px solid #dde3ef',
        '&::-webkit-scrollbar': { height: 6, width: 6 },
        '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
              <Checkbox
                sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                checked={selected.length === filteredCompagnies.length && filteredCompagnies.length > 0}
                onChange={(e) => setSelected(e.target.checked ? filteredCompagnies.map(c => c.id) : [])}
              />
            </TableCell>
            <TableCell sx={HEAD_CELL_SX}>Nom</TableCell>
            <TableCell sx={HEAD_CELL_SX}>Compte Général Sage</TableCell>
            <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredCompagnies.map((c, index) => (
            <TableRow
              key={c.id}
              sx={{
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                '&:hover': { backgroundColor: '#e8f0fe' },
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                <Checkbox
                  size="small"
                  checked={selected.includes(c.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))}
                />
              </TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f' }}>{c.nom}</TableCell>
              <TableCell sx={BODY_CELL_SX}>
                <Chip label={c.compteGeneralSage} size="small" color="secondary" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </TableCell>
              <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                  <IconButton size="small" onClick={() => { setEditItem(c); setEditDialog(true); }}
                    sx={{ color: '#1e3a5f', '&:hover': { bgcolor: '#e8f0fe' }, p: 0.5 }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small"
                    onClick={() => openSingleDelete('compagnie', c.id, c.nom)}
                    sx={{ color: '#b71c1c', '&:hover': { bgcolor: '#fdecea' }, p: 0.5 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ── Derived delete dialog content ──────────────────────────────────────────
  const isNonDeletable = deleteDialog.entity === 'client' || deleteDialog.entity === 'compagnie';

  const deleteDialogTitle = isNonDeletable
    ? 'Suppression impossible'
    : deleteDialog.mode === 'bulk'
    ? `Supprimer ${selected.length} élément(s)`
    : `Supprimer — ${deleteDialog.itemLabel}`;

  const deleteDialogBody = isNonDeletable
    ? deleteDialog.entity === 'client'
      ? 'Les clients ne peuvent pas être supprimés. Vous pouvez uniquement modifier leur configuration Sage.'
      : 'Les compagnies d\'assurance ne peuvent pas être supprimées. Vous pouvez uniquement modifier leur compte Sage.'
    : deleteDialog.mode === 'bulk'
    ? `Êtes-vous sûr de vouloir supprimer les ${selected.length} élément(s) sélectionné(s) ? Cette action est irréversible.`
    : `Êtes-vous sûr de vouloir supprimer "${deleteDialog.itemLabel}" ? Cette action est irréversible.`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Filter Panel (same as Recouvrement tab) ── */}
      <Box
        sx={{
          p: 2, mb: 2,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Filtres & Actions
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {hasAdvancedFilters && (
              <Chip
                label={`${[
                  nomDonneur, codeJournal, compteTresorerie, compteGeneralTiers,
                  nomClient, compteAuxiliaireSage, modeRecuperation,
                  nomCompagnie, compteGeneralSage
                ].filter(Boolean).length} filtre(s) actif(s)`}
                size="small"
                color="primary"
                onDelete={resetAdvancedFilters}
                sx={{ fontWeight: 600, fontSize: '0.70rem' }}
              />
            )}
            <Button
              size="small"
              variant={showAdvanced ? 'contained' : 'outlined'}
              startIcon={showAdvanced ? <FilterListOff /> : <FilterList />}
              onClick={() => setShowAdvanced(v => !v)}
              sx={{
                fontWeight: 600, fontSize: '0.75rem',
                ...(showAdvanced ? { bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' } } : {}),
              }}
            >
              {showAdvanced ? 'Masquer' : 'Filtres avancés'}
            </Button>
          </Stack>
        </Box>

        {/* ── Basic filters ── */}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={resetAdvancedFilters}
              disabled={!hasAdvancedFilters}
              sx={{ fontWeight: 600 }}
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>

        {/* ── Advanced filters (collapsible) ── */}
        <Collapse in={showAdvanced}>
          <Box
            sx={{
              mt: 2, pt: 2,
              borderTop: '1px solid #d0dff5',
            }}
          >
            <Grid container spacing={1.5}>
              {/* Donneurs d'Ordre filters */}
              {subTab === 0 && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nom"
                      value={nomDonneur}
                      onChange={(e) => { setNomDonneur(e.target.value); setClientPage(0); }}
                      placeholder="Nom du donneur..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Code Journal"
                      value={codeJournal}
                      onChange={(e) => { setCodeJournal(e.target.value); setClientPage(0); }}
                      placeholder="Ex: ATT411, BTK580..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Compte Trésorerie"
                      value={compteTresorerie}
                      onChange={(e) => { setCompteTresorerie(e.target.value); setClientPage(0); }}
                      placeholder="Ex: 53220900..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Compte Général Tiers"
                      value={compteGeneralTiers}
                      onChange={(e) => { setCompteGeneralTiers(e.target.value); setClientPage(0); }}
                      placeholder="Ex: 41100007..."
                    />
                  </Grid>
                </>
              )}

              {/* Clients filters */}
              {subTab === 1 && (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nom de client"
                      value={nomClient}
                      onChange={(e) => { setNomClient(e.target.value); setClientPage(0); }}
                      placeholder="Nom du client..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Compte Auxiliaire Sage"
                      value={compteAuxiliaireSage}
                      onChange={(e) => { setCompteAuxiliaireSage(e.target.value); setClientPage(0); }}
                      placeholder="Ex: 41105500..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Mode Récupération"
                      value={modeRecuperation}
                      onChange={(e) => { setModeRecuperation(e.target.value); setClientPage(0); }}
                      placeholder="Ex: FEUILLE_CAISSE..."
                    />
                  </Grid>
                </>
              )}

              {/* Compagnies Assurance filters */}
              {subTab === 2 && (
                <>
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nom Compagnies Assurance"
                      value={nomCompagnie}
                      onChange={(e) => { setNomCompagnie(e.target.value); setClientPage(0); }}
                      placeholder="Nom de la compagnie..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Compte Général Sage"
                      value={compteGeneralSage}
                      onChange={(e) => { setCompteGeneralSage(e.target.value); setClientPage(0); }}
                      placeholder="Ex: 41100001..."
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Box>
      {/* ── Sub-tab header + actions ── */}
      <Box
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          pb: 2, mb: 2, borderBottom: '2px solid #e8edf5',
        }}
      >
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setSelected([]); }}
          TabIndicatorProps={{ style: { backgroundColor: '#6A1B9A', height: 3 } }}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.80rem',
              textTransform: 'none',
              color: '#546e7a',
              minHeight: 40,
              px: 2,
              '&.Mui-selected': { color: '#6A1B9A' },
            },
          }}
        >
          {subTabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>

        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => { setEditItem({}); setEditDialog(true); }}
            sx={{ fontWeight: 600, bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}
          >
            Ajouter
          </Button>
          {selected.length > 0 && (
            <Button
              startIcon={<Delete />}
              variant="outlined"
              color="error"
              onClick={openBulkDelete}
              sx={{ fontWeight: 600 }}
            >
              Supprimer ({selected.length})
            </Button>
          )}
        </Stack>
      </Box>

      {/* ── Table Card ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
          <CircularProgress sx={{ color: '#6A1B9A' }} />
        </Box>
      ) : (
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box
              sx={{
                px: 2.5, py: 1.5,
                borderBottom: '1px solid #e8edf5',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 0.5 }}>
                {subTabLabels[subTab]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subTab === 0 ? filteredDonneurs.length : subTab === 1 ? filteredClients.length : filteredCompagnies.length} entrée(s)
                {subTab === 0 && filteredDonneurs.length !== donneurs.length && ` (filtrés sur ${donneurs.length})`}
                {subTab === 1 && filteredClients.length !== clients.length && ` (filtrés sur ${clients.length})`}
                {subTab === 2 && filteredCompagnies.length !== compagnies.length && ` (filtrés sur ${compagnies.length})`}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              {subTab === 0 && renderDonneursTable()}
              {subTab === 1 && renderClientsTable()}
              {subTab === 2 && renderCompagniesTable()}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {editItem?.id ? 'Modifier' : 'Ajouter'} — {subTabLabels[subTab]}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {subTab === 0 && editItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField fullWidth label="Nom" value={editItem.nom || ''} onChange={(e) => setEditItem({ ...editItem, nom: e.target.value })} />
              <TextField fullWidth label="Code Journal" value={editItem.codeJournal || ''} onChange={(e) => setEditItem({ ...editItem, codeJournal: e.target.value })} />
              <TextField fullWidth label="Compte Trésorerie" value={editItem.compteTresorerie || ''} onChange={(e) => setEditItem({ ...editItem, compteTresorerie: e.target.value })} />
              <TextField fullWidth label="Compte Général Tiers" value={editItem.compteGeneralTiers || ''} onChange={(e) => setEditItem({ ...editItem, compteGeneralTiers: e.target.value })} />
            </Box>
          )}
          {subTab === 1 && editItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField fullWidth label="Nom" value={editItem.name || ''} disabled sx={{ bgcolor: '#f5f5f5' }} />
              <TextField fullWidth label="Compte Auxiliaire Sage" value={editItem.compteAuxiliaireSage || ''} onChange={(e) => setEditItem({ ...editItem, compteAuxiliaireSage: e.target.value })} />
              <TextField fullWidth label="Mode Récupération" value={editItem.modeRecuperation || ''} disabled sx={{ bgcolor: '#f5f5f5' }} />
            </Box>
          )}
          {subTab === 2 && editItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField fullWidth label="Nom" value={editItem.nom || ''} disabled sx={{ bgcolor: '#f5f5f5' }} />
              <TextField fullWidth label="Compte Général Sage" value={editItem.compteGeneralSage || ''} onChange={(e) => setEditItem({ ...editItem, compteGeneralSage: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setEditDialog(false)} variant="outlined">Annuler</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' }, fontWeight: 600 }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            borderBottom: '1px solid #e0e7ef',
            bgcolor: isNonDeletable ? '#f4f7fb' : '#fff8e1',
          }}
        >
          <Warning sx={{ color: isNonDeletable ? '#546e7a' : '#f57f17', fontSize: '1.6rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {deleteDialogTitle}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              mt: 2, p: 2,
              bgcolor: isNonDeletable ? '#f4f7fb' : '#fff8e1',
              border: `1px solid ${isNonDeletable ? '#dde3ef' : '#ffe082'}`,
              borderRadius: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: '#37474f', lineHeight: 1.7 }}>
              {deleteDialogBody}
            </Typography>
          </Box>

          {!isNonDeletable && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic' }}>
              Cette action ne peut pas être annulée.
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={closeDeleteDialog} variant="outlined" sx={{ fontWeight: 600 }}>
            {isNonDeletable ? 'Fermer' : 'Annuler'}
          </Button>
          {!isNonDeletable && (
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              startIcon={<Delete />}
              sx={{ fontWeight: 600 }}
            >
              Supprimer définitivement
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfigurationsTab;