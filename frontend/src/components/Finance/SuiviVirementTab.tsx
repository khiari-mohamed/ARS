import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Button, Box, TextField, FormControl, InputLabel,
  Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, Checkbox, FormControlLabel
} from '@mui/material';
import { Refresh, Visibility, Edit, Add, Replay } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { financeService } from '../../services/financeService';

interface SuiviVirement {
  id: string;
  numeroBordereau: string;
  societe: string;
  dateInjection: string;
  utilisateurSante: string;
  dateTraitement?: string;
  utilisateurFinance?: string;
  etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE';
  dateEtatFinal?: string;
  commentaire?: string;
  motifObservation?: string;
  demandeRecuperation?: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere?: boolean;
  dateMontantRecupere?: string;
  ordreVirement?: any;
}

const SuiviVirementTab: React.FC = () => {
  const { user } = useAuth();
  const [suiviVirements, setSuiviVirements] = useState<SuiviVirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    etatVirement: '',
    societe: '',
    dateFrom: '',
    dateTo: '',
    utilisateurSante: '',
    utilisateurFinance: ''
  });
  const [selectedSuivi, setSelectedSuivi] = useState<SuiviVirement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    etatVirement: '',
    commentaire: '',
    motifObservation: '',
    demandeRecuperation: false,
    dateDemandeRecuperation: '',
    montantRecupere: false,
    dateMontantRecupere: ''
  });
  const [createManualOpen, setCreateManualOpen] = useState(false);
  const [manualOVData, setManualOVData] = useState({
    reference: '',
    clientName: '',
    donneurOrdreId: '',
    montantTotal: 0,
    nombreAdherents: 0
  });

  useEffect(() => {
    loadSuiviVirements();
  }, []);

  const loadSuiviVirements = async () => {
    setLoading(true);
    try {
      const data = await financeService.getSuiviVirements(filters);
      
      const transformedData = data.map((record: any) => ({
        id: record.id,
        numeroBordereau: record.reference,
        societe: record.society,
        dateInjection: record.dateInjected,
        utilisateurSante: 'demo-user',
        dateTraitement: record.dateTraitement,
        utilisateurFinance: 'demo-finance',
        etatVirement: record.status,
        dateEtatFinal: record.dateExecuted,
        commentaire: record.observations,
        motifObservation: record.motifObservation,
        demandeRecuperation: record.demandeRecuperation,
        dateDemandeRecuperation: record.dateDemandeRecuperation,
        montantRecupere: record.montantRecupere,
        dateMontantRecupere: record.dateMontantRecupere
      }));
      
      setSuiviVirements(transformedData);
    } catch (error) {
      console.error('Failed to load suivi virements:', error);
      setSuiviVirements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    loadSuiviVirements();
  };

  const handleViewDetails = async (suivi: SuiviVirement) => {
    try {
      setSelectedSuivi(suivi);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load suivi details:', error);
    }
  };

  const handleUpdateEtat = (suivi: SuiviVirement) => {
    setSelectedSuivi(suivi);
    setUpdateData({
      etatVirement: suivi.etatVirement,
      commentaire: suivi.commentaire || '',
      motifObservation: suivi.motifObservation || '',
      demandeRecuperation: suivi.demandeRecuperation || false,
      dateDemandeRecuperation: suivi.dateDemandeRecuperation || '',
      montantRecupere: suivi.montantRecupere || false,
      dateMontantRecupere: suivi.dateMontantRecupere || ''
    });
    setUpdateOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!selectedSuivi) return;

    try {
      // Update virement status
      await financeService.updateEtatVirement(selectedSuivi.id, {
        etatVirement: updateData.etatVirement,
        commentaire: updateData.commentaire
      });
      
      // Update recovery information if user has permission
      if (canModifyStatus()) {
        await financeService.updateRecoveryInfo(selectedSuivi.id, {
          motifObservation: updateData.motifObservation,
          demandeRecuperation: updateData.demandeRecuperation,
          dateDemandeRecuperation: updateData.demandeRecuperation ? updateData.dateDemandeRecuperation : undefined,
          montantRecupere: updateData.montantRecupere,
          dateMontantRecupere: updateData.montantRecupere ? updateData.dateMontantRecupere : undefined
        });
      }
      
      setUpdateOpen(false);
      loadSuiviVirements();
    } catch (error) {
      console.error('Failed to update virement:', error);
    }
  };

  const handleCreateManualOV = async () => {
    try {
      // Get first available donneur d'ordre if not specified
      let donneurId = manualOVData.donneurOrdreId;
      if (!donneurId) {
        const donneurs = await financeService.getDonneursOrdre();
        donneurId = donneurs[0]?.id || 'default-donneur';
      }
      
      await financeService.createManualOV({
        reference: manualOVData.reference,
        clientData: { name: manualOVData.clientName, society: manualOVData.clientName },
        donneurOrdreId: donneurId,
        montantTotal: manualOVData.montantTotal,
        nombreAdherents: manualOVData.nombreAdherents
      });
      
      setCreateManualOpen(false);
      setManualOVData({
        reference: '',
        clientName: '',
        donneurOrdreId: '',
        montantTotal: 0,
        nombreAdherents: 0
      });
      loadSuiviVirements();
      alert('Entrée manuelle créée avec succès!');
    } catch (error) {
      console.error('Failed to create manual OV:', error);
      alert('Erreur lors de la création: ' + (error as any).message);
    }
  };

  const getEtatChip = (etat: string) => {
    const config = {
      'NON_EXECUTE': { label: 'Non Exécuté', color: 'default' as const },
      'EN_COURS_EXECUTION': { label: 'En Cours', color: 'info' as const },
      'EXECUTE_PARTIELLEMENT': { label: 'Partiel', color: 'warning' as const },
      'REJETE': { label: 'Rejeté', color: 'error' as const },
      'BLOQUE': { label: 'Bloqué', color: 'error' as const },
      'EXECUTE': { label: 'Exécuté', color: 'success' as const }
    };
    
    const { label, color } = config[etat as keyof typeof config] || { label: etat, color: 'default' as const };
    return <Chip label={label} color={color} size="small" />;
  };
  
  const canModifyStatus = () => {
    return user?.role === 'FINANCE' || user?.role === 'SUPER_ADMIN';
  };
  
  const canReinject = () => {
    return user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN';
  };
  
  const handleReinject = async (suivi: SuiviVirement) => {
    if (suivi.etatVirement !== 'REJETE') {
      alert('Seuls les virements rejetés peuvent être réinjectés');
      return;
    }
    
    try {
      await financeService.reinjectOV(suivi.id);
      loadSuiviVirements();
    } catch (error) {
      console.error('Failed to reinject OV:', error);
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filtres de Recherche
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>État Virement</InputLabel>
              <Select
                value={filters.etatVirement}
                label="État Virement"
                onChange={(e) => handleFilterChange('etatVirement', e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
                <MenuItem value="EN_COURS_EXECUTION">En Cours</MenuItem>
                <MenuItem value="EXECUTE_PARTIELLEMENT">Partiel</MenuItem>
                <MenuItem value="REJETE">Rejeté</MenuItem>
                <MenuItem value="BLOQUE">Bloqué</MenuItem>
                <MenuItem value="EXECUTE">Exécuté</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Société"
              value={filters.societe}
              onChange={(e) => handleFilterChange('societe', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date Début"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date Fin"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                startIcon={<Refresh />}
                disabled={loading}
              >
                Rechercher
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilters({
                    etatVirement: '',
                    societe: '',
                    dateFrom: '',
                    dateTo: '',
                    utilisateurSante: '',
                    utilisateurFinance: ''
                  });
                  loadSuiviVirements();
                }}
              >
                Réinitialiser
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Suivi des Virements ({suiviVirements.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateManualOpen(true)}
          >
            Créer Nouvelle Entrée
          </Button>
        </Box>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Bordereau</TableCell>
              <TableCell>Société</TableCell>
              <TableCell>Date Injection</TableCell>
              <TableCell>Statut de virement</TableCell>
              <TableCell>Date de traitement du virement</TableCell>
              <TableCell>Motif / Observation</TableCell>
              <TableCell>Demande récupération</TableCell>
              <TableCell>Montant récupéré</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suiviVirements.map((suivi) => (
              <TableRow key={suivi.id}>
                <TableCell>{suivi.numeroBordereau}</TableCell>
                <TableCell>{suivi.societe}</TableCell>
                <TableCell>
                  {new Date(suivi.dateInjection).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>{getEtatChip(suivi.etatVirement)}</TableCell>
                <TableCell>
                  {suivi.dateTraitement 
                    ? new Date(suivi.dateTraitement).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {suivi.motifObservation || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {suivi.demandeRecuperation ? (
                    <Box>
                      <Chip label="Oui" color="warning" size="small" />
                      {suivi.dateDemandeRecuperation && (
                        <Typography variant="caption" display="block">
                          {new Date(suivi.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip label="Non" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {suivi.montantRecupere ? (
                    <Box>
                      <Chip label="Oui" color="success" size="small" />
                      {suivi.dateMontantRecupere && (
                        <Typography variant="caption" display="block">
                          {new Date(suivi.dateMontantRecupere).toLocaleDateString('fr-FR')}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip label="Non" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(suivi)}
                    >
                      Voir
                    </Button>
                    {canModifyStatus() && (
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleUpdateEtat(suivi)}
                      >
                        Modifier
                      </Button>
                    )}
                    {canReinject() && suivi.etatVirement === 'REJETE' && (
                      <Button
                        size="small"
                        startIcon={<Replay />}
                        onClick={() => handleReinject(suivi)}
                        color="warning"
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

        {suiviVirements.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Aucun virement trouvé avec les critères sélectionnés.
          </Alert>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Détails du Suivi Virement</DialogTitle>
        <DialogContent>
          {selectedSuivi && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">N° Bordereau</Typography>
                <Typography>{selectedSuivi.numeroBordereau}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Société</Typography>
                <Typography>{selectedSuivi.societe}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Date Injection</Typography>
                <Typography>
                  {new Date(selectedSuivi.dateInjection).toLocaleString('fr-FR')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Utilisateur Santé</Typography>
                <Typography>{selectedSuivi.utilisateurSante}</Typography>
              </Grid>
              {selectedSuivi.dateTraitement && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Date Traitement</Typography>
                    <Typography>
                      {new Date(selectedSuivi.dateTraitement).toLocaleString('fr-FR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Utilisateur Finance</Typography>
                    <Typography>{selectedSuivi.utilisateurFinance}</Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">État Virement</Typography>
                {getEtatChip(selectedSuivi.etatVirement)}
              </Grid>
              {selectedSuivi.dateEtatFinal && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Date État Final</Typography>
                  <Typography>
                    {new Date(selectedSuivi.dateEtatFinal).toLocaleString('fr-FR')}
                  </Typography>
                </Grid>
              )}
              {selectedSuivi.commentaire && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Commentaire</Typography>
                  <Typography>{selectedSuivi.commentaire}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateOpen} onClose={() => setUpdateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier État Virement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>État Virement</InputLabel>
                <Select
                  value={updateData.etatVirement}
                  label="État Virement"
                  onChange={(e) => setUpdateData(prev => ({ ...prev, etatVirement: e.target.value }))}
                >
                  <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
                  <MenuItem value="EN_COURS_EXECUTION">En Cours d'Exécution</MenuItem>
                  <MenuItem value="EXECUTE_PARTIELLEMENT">Exécuté Partiellement</MenuItem>
                  <MenuItem value="REJETE">Rejeté</MenuItem>
                  <MenuItem value="BLOQUE">Bloqué</MenuItem>
                  <MenuItem value="EXECUTE">Exécuté</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Motif/Observation"
                value={updateData.motifObservation}
                onChange={(e) => setUpdateData(prev => ({ ...prev, motifObservation: e.target.value }))}
                helperText="Champ libre rempli par le service financier si le virement est bloqué"
              />
            </Grid>
            {canModifyStatus() && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={updateData.demandeRecuperation}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, demandeRecuperation: e.target.checked }))}
                      />
                    }
                    label="Demande de récupération"
                  />
                  {updateData.demandeRecuperation && (
                    <TextField
                      fullWidth
                      type="date"
                      label="Date demande"
                      value={updateData.dateDemandeRecuperation}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, dateDemandeRecuperation: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={updateData.montantRecupere}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, montantRecupere: e.target.checked }))}
                      />
                    }
                    label="Montant récupéré"
                  />
                  {updateData.montantRecupere && (
                    <TextField
                      fullWidth
                      type="date"
                      label="Date récupération"
                      value={updateData.dateMontantRecupere}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, dateMontantRecupere: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveUpdate} variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Manual OV Dialog */}
      <Dialog open={createManualOpen} onClose={() => setCreateManualOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer Nouvelle Entrée (non liée à un bordereau)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Référence OV"
                value={manualOVData.reference}
                onChange={(e) => setManualOVData(prev => ({ ...prev, reference: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom Client/Société"
                value={manualOVData.clientName}
                onChange={(e) => setManualOVData(prev => ({ ...prev, clientName: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Montant Total"
                value={manualOVData.montantTotal}
                onChange={(e) => setManualOVData(prev => ({ ...prev, montantTotal: parseFloat(e.target.value) || 0 }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Nombre Adhérents"
                value={manualOVData.nombreAdherents}
                onChange={(e) => setManualOVData(prev => ({ ...prev, nombreAdherents: parseInt(e.target.value) || 0 }))}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateManualOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateManualOV} variant="contained">
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuiviVirementTab;