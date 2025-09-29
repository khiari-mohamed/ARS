import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Box, CircularProgress, Card, CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

interface OVRecord {
  id: string;
  reference: string;
  society: string;
  dateInjected: string;
  dateExecuted?: string;
  status: 'NON_EXECUTE' | 'EN_COURS' | 'PARTIELLEMENT_EXECUTE' | 'REJETE' | 'EXECUTE';
  delay: number;
  observations: string;
  donneurOrdre: string;
  totalAmount: number;
  dateTraitement?: string;
  motifObservation?: string;
  demandeRecuperation?: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere?: boolean;
  dateMontantRecupere?: string;
}

const TrackingTab: React.FC = () => {
  const [records, setRecords] = useState<OVRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<OVRecord[]>([]);
  const [bordereauxTraites, setBordereauxTraites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTraites, setLoadingTraites] = useState(true);
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    donneurOrdre: '',
    dateFrom: '',
    dateTo: ''
  });
  const [editDialog, setEditDialog] = useState<{open: boolean, record: OVRecord | null}>({
    open: false, record: null
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    dateExecuted: '',
    observations: '',
    motifObservation: '',
    demandeRecuperation: false,
    dateDemandeRecuperation: '',
    montantRecupere: false,
    dateMontantRecupere: ''
  });
  const [userRole, setUserRole] = useState<string>('FINANCE'); // Get from auth context
  const [createForm, setCreateForm] = useState({
    reference: '',
    clientData: { name: '', society: '' },
    donneurOrdreId: '',
    montantTotal: 0,
    nombreAdherents: 0
  });

  const loadRecords = async () => {
    console.log('🔄 Loading OV tracking records...');
    setLoading(true);
    try {
      const { getOVTracking } = await import('../../services/financeService');
      console.log('📞 Calling getOVTracking...');
      const data = await getOVTracking({});
      console.log('📊 Received data:', data);
      setRecords(data);
    } catch (error) {
      console.error('❌ Failed to load OV tracking:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBordereauxTraites = async () => {
    setLoadingTraites(true);
    try {
      const financeService = await import('../../services/financeService');
      const data = await financeService.financeService.getBordereauxTraites();
      setBordereauxTraites(data);
    } catch (error) {
      console.error('Failed to load bordereaux traités:', error);
      setBordereauxTraites([]);
    } finally {
      setLoadingTraites(false);
    }
  };

  useEffect(() => {
    loadRecords();
    loadBordereauxTraites();
  }, []);

  useEffect(() => {
    let filtered = records;
    
    if (filters.society) {
      filtered = filtered.filter(r => r.society.toLowerCase().includes(filters.society.toLowerCase()));
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.donneurOrdre) {
      filtered = filtered.filter(r => r.donneurOrdre.toLowerCase().includes(filters.donneurOrdre.toLowerCase()));
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.dateInjected >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(r => r.dateInjected <= filters.dateTo);
    }
    
    setFilteredRecords(filtered);
  }, [records, filters]);

  const getStatusChip = (status: string, delay: number) => {
    const getSLAColor = () => {
      if (delay <= 1) return 'success';
      if (delay <= 2) return 'warning';
      return 'error';
    };

    const statusLabels = {
      'NON_EXECUTE': 'Non Exécuté',
      'EN_COURS': 'En Cours',
      'PARTIELLEMENT_EXECUTE': 'Partiellement Exécuté',
      'REJETE': 'Rejeté',
      'EXECUTE': 'Exécuté'
    };

    const statusColors = {
      'NON_EXECUTE': 'default',
      'EN_COURS': 'info',
      'PARTIELLEMENT_EXECUTE': 'warning',
      'REJETE': 'error',
      'EXECUTE': 'success'
    };

    return (
      <Box>
        <Chip 
          label={statusLabels[status as keyof typeof statusLabels]} 
          color={statusColors[status as keyof typeof statusColors] as any}
          size="small"
          sx={{ mb: 0.5 }}
        />
        <br />
        <Chip 
          label={delay <= 1 ? '🟢 À temps' : delay <= 2 ? '🟠 À risque' : '🔴 En retard'}
          color={getSLAColor() as any}
          size="small"
          variant="outlined"
        />
      </Box>
    );
  };

  const handleEditClick = (record: OVRecord) => {
    setEditForm({
      status: record.status,
      dateExecuted: record.dateExecuted || '',
      observations: record.observations || '',
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
      await loadRecords();
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
      
      // Update status
      await financeService.updateOVStatus(editDialog.record.id, {
        status: editForm.status,
        dateExecuted: editForm.dateExecuted,
        observations: editForm.observations
      });
      
      // Update recovery info if user is Finance or Super Admin
      if (userRole === 'FINANCE' || userRole === 'SUPER_ADMIN') {
        await financeService.financeService.updateRecoveryInfo(editDialog.record.id, {
          demandeRecuperation: editForm.demandeRecuperation,
          dateDemandeRecuperation: editForm.demandeRecuperation ? editForm.dateDemandeRecuperation : null,
          montantRecupere: editForm.montantRecupere,
          dateMontantRecupere: editForm.montantRecupere ? editForm.dateMontantRecupere : null,
          motifObservation: editForm.motifObservation
        });
      }
      
      // Reload data to get updated records
      await loadRecords();
      setEditDialog({open: false, record: null});
    } catch (error) {
      console.error('Failed to update record:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleCreateManualEntry = async () => {
    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.createManualOV(createForm);
      
      // Reload data
      await loadRecords();
      setCreateDialog(false);
      setCreateForm({
        reference: '',
        clientData: { name: '', society: '' },
        donneurOrdreId: '',
        montantTotal: 0,
        nombreAdherents: 0
      });
    } catch (error) {
      console.error('Failed to create manual entry:', error);
      alert('Erreur lors de la création de l\'entrée manuelle');
    }
  };

  const calculateDelay = (dateInjected: string, dateExecuted?: string) => {
    const injected = new Date(dateInjected);
    const executed = dateExecuted ? new Date(dateExecuted) : new Date();
    return Math.ceil((executed.getTime() - injected.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Box>
      {/* Create Manual Entry Button */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
        >
          Créer une nouvelle entrée
        </Button>
      </Box>

      {/* Bordereaux Traités Summary Block */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Récapitulatif des bordereaux en état Traité
          </Typography>
          {loadingTraites ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client / Société</TableCell>
                    <TableCell>Référence OV</TableCell>
                    <TableCell>Référence bordereau</TableCell>
                    <TableCell>Montant du bordereau</TableCell>
                    <TableCell>Date de finalisation du bordereau</TableCell>
                    <TableCell>Date d'injection</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bordereauxTraites.map((bordereau: any) => (
                    <TableRow key={bordereau.id}>
                      <TableCell>{bordereau.clientSociete}</TableCell>
                      <TableCell>{bordereau.referenceOV}</TableCell>
                      <TableCell>{bordereau.referenceBordereau}</TableCell>
                      <TableCell>{bordereau.montantBordereau.toLocaleString('fr-TN')} TND</TableCell>
                      <TableCell>
                        {bordereau.dateFinalisationBordereau 
                          ? new Date(bordereau.dateFinalisationBordereau).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(bordereau.dateInjection).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bordereauxTraites.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Aucun bordereau en état Traité
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Filtres</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => { loadRecords(); loadBordereauxTraites(); }}
            disabled={loading || loadingTraites}
            size="small"
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
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
              <MenuItem value="EN_COURS">En Cours</MenuItem>
              <MenuItem value="PARTIELLEMENT_EXECUTE">Partiellement Exécuté</MenuItem>
              <MenuItem value="REJETE">Rejeté</MenuItem>
              <MenuItem value="EXECUTE">Exécuté</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Donneur d'Ordre"
            value={filters.donneurOrdre}
            onChange={(e) => setFilters({...filters, donneurOrdre: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />

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

      {/* Records Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Suivi des Virements ({filteredRecords.length})
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Référence OV</TableCell>
                  <TableCell>Société</TableCell>
                  <TableCell>Date Injection</TableCell>
                  <TableCell>Statut Virement</TableCell>
                  <TableCell>Date de traitement</TableCell>
                  <TableCell>Motif/Observation</TableCell>
                  <TableCell>Demande Récupération</TableCell>
                  <TableCell>Montant Récupéré</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.reference}</TableCell>
                    <TableCell>{record.society || '-'}</TableCell>
                    <TableCell>
                      {record.dateInjected && !isNaN(new Date(record.dateInjected).getTime()) 
                        ? new Date(record.dateInjected).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusChip(record.status, record.delay)}</TableCell>
                    <TableCell>
                      {record.dateTraitement && !isNaN(new Date(record.dateTraitement).getTime())
                        ? new Date(record.dateTraitement).toLocaleDateString('fr-FR') 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {record.motifObservation || record.observations || '-'}
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
                        {(userRole === 'FINANCE' || userRole === 'SUPER_ADMIN') && (
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(record)}
                          >
                            Modifier
                          </Button>
                        )}
                        {(userRole === 'CHEF_EQUIPE' || userRole === 'SUPER_ADMIN') && record.status === 'REJETE' && (
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({open: false, record: null})} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le Statut - {editDialog.record?.reference}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                label="Statut"
              >
                <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
                <MenuItem value="EN_COURS">En Cours</MenuItem>
                <MenuItem value="PARTIELLEMENT_EXECUTE">Partiellement Exécuté</MenuItem>
                <MenuItem value="REJETE">Rejeté</MenuItem>
                <MenuItem value="EXECUTE">Exécuté</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Date d'Exécution"
              type="date"
              value={editForm.dateExecuted}
              onChange={(e) => setEditForm({...editForm, dateExecuted: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Observations"
              multiline
              rows={2}
              value={editForm.observations}
              onChange={(e) => setEditForm({...editForm, observations: e.target.value})}
              fullWidth
            />
            
            {(userRole === 'FINANCE' || userRole === 'SUPER_ADMIN') && (
              <>
                <TextField
                  label="Motif / Observation (si bloqué)"
                  multiline
                  rows={2}
                  value={editForm.motifObservation}
                  onChange={(e) => setEditForm({...editForm, motifObservation: e.target.value})}
                  fullWidth
                  helperText="Champ libre rempli par le service financier si le virement est bloqué"
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControl component="fieldset">
                    <Typography variant="body2" sx={{ mb: 1 }}>Demande de récupération</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant={editForm.demandeRecuperation ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setEditForm({...editForm, demandeRecuperation: !editForm.demandeRecuperation})}
                      >
                        {editForm.demandeRecuperation ? 'Oui' : 'Non'}
                      </Button>
                      {editForm.demandeRecuperation && (
                        <TextField
                          label="Date demande"
                          type="date"
                          value={editForm.dateDemandeRecuperation}
                          onChange={(e) => setEditForm({...editForm, dateDemandeRecuperation: e.target.value})}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />
                      )}
                    </Box>
                  </FormControl>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControl component="fieldset">
                    <Typography variant="body2" sx={{ mb: 1 }}>Montant récupéré</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant={editForm.montantRecupere ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setEditForm({...editForm, montantRecupere: !editForm.montantRecupere})}
                      >
                        {editForm.montantRecupere ? 'Oui' : 'Non'}
                      </Button>
                      {editForm.montantRecupere && (
                        <TextField
                          label="Date récupération"
                          type="date"
                          value={editForm.dateMontantRecupere}
                          onChange={(e) => setEditForm({...editForm, dateMontantRecupere: e.target.value})}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />
                      )}
                    </Box>
                  </FormControl>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, record: null})}>
            Annuler
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Manual Entry Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une nouvelle entrée (non liée à un bordereau)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Référence"
              value={createForm.reference}
              onChange={(e) => setCreateForm({...createForm, reference: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Nom du client"
              value={createForm.clientData.name}
              onChange={(e) => setCreateForm({
                ...createForm, 
                clientData: {...createForm.clientData, name: e.target.value}
              })}
              fullWidth
              required
            />
            
            <TextField
              label="Société"
              value={createForm.clientData.society}
              onChange={(e) => setCreateForm({
                ...createForm, 
                clientData: {...createForm.clientData, society: e.target.value}
              })}
              fullWidth
            />
            
            <TextField
              label="Montant total"
              type="number"
              value={createForm.montantTotal}
              onChange={(e) => setCreateForm({...createForm, montantTotal: parseFloat(e.target.value) || 0})}
              fullWidth
              required
            />
            
            <TextField
              label="Nombre d'adhérents"
              type="number"
              value={createForm.nombreAdherents}
              onChange={(e) => setCreateForm({...createForm, nombreAdherents: parseInt(e.target.value) || 0})}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreateManualEntry} 
            variant="contained"
            disabled={!createForm.reference || !createForm.clientData.name || createForm.montantTotal <= 0}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrackingTab;