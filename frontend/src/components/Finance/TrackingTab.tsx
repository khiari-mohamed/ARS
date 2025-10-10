import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Box, CircularProgress, Card, CardContent, Alert, Checkbox
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../contexts/AuthContext';

interface BordereauTraite {
  id: string;
  clientSociete: string;
  referenceOV: string;
  referenceBordereau: string;
  montantBordereau: number;
  dateFinalisationBordereau?: string;
  dateInjection: string;
  statutVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE';
  dateTraitementVirement?: string;
  motifObservation?: string;
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
}

const TrackingTab: React.FC = () => {
  const [bordereauxTraites, setBordereauxTraites] = useState<BordereauTraite[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BordereauTraite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);

  const handleSelectBordereau = (id: string) => {
    setSelectedBordereaux(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = filteredRecords.filter(r => !r.referenceOV).map(r => r.id);
    setSelectedBordereaux(prev => 
      prev.length === selectableIds.length ? [] : selectableIds
    );
  };
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    donneurOrdre: '',
    dateFrom: '',
    dateTo: ''
  });
  const [editDialog, setEditDialog] = useState<{open: boolean, record: BordereauTraite | null}>({
    open: false, record: null
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    statutVirement: '',
    dateTraitementVirement: '',
    motifObservation: '',
    demandeRecuperation: false,
    dateDemandeRecuperation: '',
    montantRecupere: false,
    dateMontantRecupere: ''
  });
  const { user } = useAuth();
  const [createForm, setCreateForm] = useState({
    reference: '',
    clientName: '',
    donneurOrdreId: '',
    montantTotal: 0,
    nombreAdherents: 0
  });

  const loadBordereauxTraites = async () => {
    setLoading(true);
    try {
      const financeService = await import('../../services/financeService');
      const data = await financeService.financeService.getBordereauxTraites();
      setBordereauxTraites(data);
    } catch (error) {
      console.error('Failed to load bordereaux traités:', error);
      setBordereauxTraites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBordereauxTraites();
  }, []);

  useEffect(() => {
    let filtered = bordereauxTraites;
    
    if (filters.society) {
      filtered = filtered.filter(r => r.clientSociete.toLowerCase().includes(filters.society.toLowerCase()));
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.statutVirement === filters.status);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.dateInjection >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(r => r.dateInjection <= filters.dateTo);
    }
    
    setFilteredRecords(filtered);
  }, [bordereauxTraites, filters]);

  // EXACT SPEC: Statuts de virement
  const getStatusChip = (status: string) => {
    const statusLabels = {
      'NON_EXECUTE': 'Virement non exécuté',
      'EN_COURS_EXECUTION': 'Virement en cours d\'exécution',
      'EXECUTE_PARTIELLEMENT': 'Virement exécuté partiellement',
      'REJETE': 'Virement rejeté',
      'BLOQUE': 'Virement bloqué',
      'EXECUTE': 'Virement exécuté'
    };

    const statusColors = {
      'NON_EXECUTE': 'default',
      'EN_COURS_EXECUTION': 'info',
      'EXECUTE_PARTIELLEMENT': 'warning',
      'REJETE': 'error',
      'BLOQUE': 'error',
      'EXECUTE': 'success'
    };

    const statusIcons = {
      'NON_EXECUTE': '⏳',
      'EN_COURS_EXECUTION': '🔄',
      'EXECUTE_PARTIELLEMENT': '⚠️',
      'REJETE': '❌',
      'BLOQUE': '⏸️',
      'EXECUTE': '✅'
    };

    return (
      <Chip 
        label={`${statusIcons[status as keyof typeof statusIcons] || ''} ${statusLabels[status as keyof typeof statusLabels] || status}`}
        color={statusColors[status as keyof typeof statusColors] as any || 'default'}
        size="small"
      />
    );
  };

  const handleEditClick = (record: BordereauTraite) => {
    setEditForm({
      statutVirement: record.statutVirement,
      dateTraitementVirement: record.dateTraitementVirement || '',
      motifObservation: record.motifObservation || '',
      demandeRecuperation: record.demandeRecuperation || false,
      dateDemandeRecuperation: record.dateDemandeRecuperation || '',
      montantRecupere: record.montantRecupere || false,
      dateMontantRecupere: record.dateMontantRecupere || ''
    });
    setEditDialog({open: true, record});
  };

  const handleReinject = async (recordId: string) => {
    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.reinjectOV(recordId);
      await loadBordereauxTraites();
      alert('Réinjection effectuée avec succès');
    } catch (error) {
      console.error('Failed to reinject OV:', error);
      alert('Erreur lors de la réinjection');
    }
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record) return;
    
    try {
      const financeService = await import('../../services/financeService');
      
      // If record has OV reference, update OV directly
      if (editDialog.record.referenceOV) {
        await financeService.financeService.updateOVStatus(editDialog.record.id, {
          etatVirement: editForm.statutVirement as any,
          motifObservation: editForm.motifObservation,
          demandeRecuperation: editForm.demandeRecuperation,
          dateDemandeRecuperation: editForm.demandeRecuperation ? editForm.dateDemandeRecuperation : undefined,
          montantRecupere: editForm.montantRecupere,
          dateMontantRecupere: editForm.montantRecupere ? editForm.dateMontantRecupere : undefined
        });
      } else {
        // Otherwise update bordereau traite
        await financeService.financeService.updateBordereauTraite(editDialog.record.id, {
          statutVirement: editForm.statutVirement,
          dateTraitementVirement: editForm.dateTraitementVirement,
          motifObservation: editForm.motifObservation,
          demandeRecuperation: editForm.demandeRecuperation,
          dateDemandeRecuperation: editForm.demandeRecuperation ? editForm.dateDemandeRecuperation : undefined,
          montantRecupere: editForm.montantRecupere,
          dateMontantRecupere: editForm.montantRecupere ? editForm.dateMontantRecupere : undefined
        });
      }
      
      await loadBordereauxTraites();
      setEditDialog({open: false, record: null});
      alert('Statut mis à jour avec succès!');
    } catch (error) {
      console.error('Failed to update record:', error);
      alert('Erreur lors de la mise à jour du statut: ' + (error as any).message);
    }
  };

  const handleCreateManualEntry = async () => {
    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.createManualOV({
        reference: createForm.reference,
        clientData: { name: createForm.clientName },
        donneurOrdreId: createForm.donneurOrdreId || 'default',
        montantTotal: createForm.montantTotal,
        nombreAdherents: createForm.nombreAdherents
      });
      
      await loadBordereauxTraites();
      setCreateDialog(false);
      setCreateForm({
        reference: '',
        clientName: '',
        donneurOrdreId: '',
        montantTotal: 0,
        nombreAdherents: 0
      });
    } catch (error) {
      console.error('Failed to create manual entry:', error);
      alert('Erreur lors de la création de l\'entrée manuelle');
    }
  };

  const canModifyStatus = () => {
    return user?.role === 'FINANCE' || user?.role === 'SUPER_ADMIN' || user?.role === 'CHEF_EQUIPE';
  };
  
  const canReinject = () => {
    return user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN';
  };

  return (
    <Box>
      {/* EXACT SPEC: Possibilité de créer une nouvelle entrée qui n'est pas liée à un bordereau */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Suivi & Statut
        </Typography>
        <Stack direction="row" spacing={2}>
          {selectedBordereaux.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => {
                // Store selected bordereaux in sessionStorage
                sessionStorage.setItem('selectedBordereaux', JSON.stringify(selectedBordereaux));
                // Force reload to Finance module with tab parameter
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('tab', '2');
                window.location.href = currentUrl.toString();
              }}
            >
              🏦 Créer OV ({selectedBordereaux.length})
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            + Nouvelle Entrée
          </Button>
        </Stack>
      </Box>

      {/* EXACT SPEC: Filtres pour recherche */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filtres de Recherche</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadBordereauxTraites}
            disabled={loading}
            size="small"
            variant="outlined"
          >
            Actualiser
          </Button>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            label="Société"
            value={filters.society}
            onChange={(e) => setFilters({...filters, society: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut Virement</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut Virement"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
              <MenuItem value="EN_COURS_EXECUTION">En Cours d'Exécution</MenuItem>
              <MenuItem value="EXECUTE_PARTIELLEMENT">Exécuté Partiellement</MenuItem>
              <MenuItem value="REJETE">Rejeté</MenuItem>
              <MenuItem value="BLOQUE">Bloqué</MenuItem>
              <MenuItem value="EXECUTE">Exécuté</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Date Début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Date Fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          
          <Button 
            variant="outlined" 
            onClick={() => setFilters({society: '', status: '', donneurOrdre: '', dateFrom: '', dateTo: ''})}
            size="small"
          >
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {/* EXACT SPEC: Bloc récapitulatif des bordereaux en état Traité */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Bloc récapitulatif des bordereaux en état Traité
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Affichage de {filteredRecords.length} bordereau(x) traité(s)
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedBordereaux.length > 0 && selectedBordereaux.length < filteredRecords.filter(r => !r.referenceOV).length}
                      checked={filteredRecords.filter(r => !r.referenceOV).length > 0 && selectedBordereaux.length === filteredRecords.filter(r => !r.referenceOV).length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Client / Société</strong></TableCell>
                  <TableCell><strong>Référence OV</strong></TableCell>
                  <TableCell><strong>Référence bordereau</strong></TableCell>
                  <TableCell><strong>Montant du bordereau</strong></TableCell>
                  <TableCell><strong>Date de finalisation du bordereau (statut Traité)</strong></TableCell>
                  <TableCell><strong>Date d'injection</strong></TableCell>
                  <TableCell><strong>Statut de virement</strong></TableCell>
                  <TableCell><strong>Date de traitement du virement</strong></TableCell>
                  <TableCell><strong>Motif / Observation</strong></TableCell>
                  <TableCell><strong>Demande de récupération</strong></TableCell>
                  <TableCell><strong>Montant récupéré</strong></TableCell>
                  <TableCell><strong>Actions par rôle</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell padding="checkbox">
                      {!record.referenceOV && (
                        <Checkbox
                          checked={selectedBordereaux.includes(record.id)}
                          onChange={() => handleSelectBordereau(record.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{record.clientSociete}</TableCell>
                    <TableCell>{record.referenceOV}</TableCell>
                    <TableCell>{record.referenceBordereau}</TableCell>
                    <TableCell>{record.montantBordereau.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      {record.dateFinalisationBordereau 
                        ? new Date(record.dateFinalisationBordereau).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {record.dateInjection && record.dateInjection !== '1970-01-01T00:00:00.000Z' 
                        ? new Date(record.dateInjection).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusChip(record.statutVirement)}</TableCell>
                    <TableCell>
                      {record.dateTraitementVirement
                        ? new Date(record.dateTraitementVirement).toLocaleDateString('fr-FR') 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.motifObservation || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.demandeRecuperation ? (
                        <Box>
                          <Chip label="Oui" color="warning" size="small" />
                          {record.dateDemandeRecuperation && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {record.montantRecupere ? (
                        <Box>
                          <Chip label="Oui" color="success" size="small" />
                          {record.dateMontantRecupere && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateMontantRecupere).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {canModifyStatus() && (
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(record)}
                          >
                            Modifier
                          </Button>
                        )}
                        {canReinject() && record.statutVirement === 'REJETE' && (
                          <Button
                            size="small"
                            color="warning"
                            onClick={() => handleReinject(record.id)}
                          >
                            Réinjecter
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* EXACT SPEC: Edit Dialog with role-based actions */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({open: false, record: null})} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Modifier - {editDialog.record?.referenceOV}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Bordereau: {editDialog.record?.referenceBordereau}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* EXACT SPEC: Service Financier peut modifier le statut de virement */}
            <FormControl fullWidth>
              <InputLabel>Statut de virement</InputLabel>
              <Select
                value={editForm.statutVirement}
                onChange={(e) => setEditForm({...editForm, statutVirement: e.target.value})}
                label="Statut de virement"
                disabled={!canModifyStatus()}
              >
                <MenuItem value="NON_EXECUTE">⏳ Virement non exécuté</MenuItem>
                <MenuItem value="EN_COURS_EXECUTION">🔄 Virement en cours d'exécution</MenuItem>
                <MenuItem value="EXECUTE_PARTIELLEMENT">⚠️ Virement exécuté partiellement</MenuItem>
                <MenuItem value="REJETE">❌ Virement rejeté</MenuItem>
                <MenuItem value="BLOQUE">⏸️ Virement bloqué</MenuItem>
                <MenuItem value="EXECUTE">✅ Virement exécuté</MenuItem>
              </Select>
              {!canModifyStatus() && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Seul le Service Financier peut modifier le statut
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Date de traitement du virement"
              type="date"
              value={editForm.dateTraitementVirement}
              onChange={(e) => setEditForm({...editForm, dateTraitementVirement: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            {/* EXACT SPEC: Motif / Observation - champ libre service financier */}
            {canModifyStatus() && (
              <>
                <TextField
                  label="Motif / Observation (champ libre)"
                  multiline
                  rows={3}
                  value={editForm.motifObservation}
                  onChange={(e) => setEditForm({...editForm, motifObservation: e.target.value})}
                  fullWidth
                  helperText="Champ libre - service financier, si virement bloqué"
                  placeholder="Saisir le motif ou observation..."
                />
                
                {/* EXACT SPEC: Demande de récupération : Oui / Non → si Oui, afficher la date */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Demande de récupération</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.demandeRecuperation ? 'contained' : 'outlined'}
                      color={editForm.demandeRecuperation ? 'warning' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({...editForm, demandeRecuperation: !editForm.demandeRecuperation})}
                    >
                      {editForm.demandeRecuperation ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.demandeRecuperation && (
                      <TextField
                        label="Date de la demande"
                        type="date"
                        value={editForm.dateDemandeRecuperation}
                        onChange={(e) => setEditForm({...editForm, dateDemandeRecuperation: e.target.value})}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        required
                      />
                    )}
                  </Box>
                </Box>
                
                {/* EXACT SPEC: Montant récupéré : Oui / Non → si Oui, afficher la date de récupération */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Montant récupéré</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.montantRecupere ? 'contained' : 'outlined'}
                      color={editForm.montantRecupere ? 'success' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({...editForm, montantRecupere: !editForm.montantRecupere})}
                    >
                      {editForm.montantRecupere ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.montantRecupere && (
                      <TextField
                        label="Date de récupération"
                        type="date"
                        value={editForm.dateMontantRecupere}
                        onChange={(e) => setEditForm({...editForm, dateMontantRecupere: e.target.value})}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        required
                      />
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, record: null})}>
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={!canModifyStatus()}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* EXACT SPEC: Créer nouvelle entrée (non liée à un bordereau) */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Créer une nouvelle entrée
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Cette entrée n'est pas liée à un bordereau
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Création manuelle d'un ordre de virement sans bordereau associé
          </Alert>
          <Stack spacing={2.5}>
            <TextField
              label="Référence OV"
              value={createForm.reference}
              onChange={(e) => setCreateForm({...createForm, reference: e.target.value})}
              fullWidth
              required
              placeholder="Ex: OV-MANUAL-001"
              helperText="Référence unique de l'ordre de virement"
            />
            
            <TextField
              label="Client / Société"
              value={createForm.clientName}
              onChange={(e) => setCreateForm({...createForm, clientName: e.target.value})}
              fullWidth
              required
              placeholder="Nom de la société ou client"
            />
            
            <TextField
              label="Montant total (TND)"
              type="number"
              value={createForm.montantTotal}
              onChange={(e) => setCreateForm({...createForm, montantTotal: parseFloat(e.target.value) || 0})}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            <TextField
              label="Nombre d'adhérents"
              type="number"
              value={createForm.nombreAdherents}
              onChange={(e) => setCreateForm({...createForm, nombreAdherents: parseInt(e.target.value) || 0})}
              fullWidth
              required
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCreateDialog(false)} variant="outlined">
            Annuler
          </Button>
          <Button 
            onClick={handleCreateManualEntry} 
            variant="contained"
            disabled={!createForm.reference || !createForm.clientName || createForm.montantTotal <= 0}
            startIcon={<AddIcon />}
          >
            Créer l'entrée
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrackingTab;