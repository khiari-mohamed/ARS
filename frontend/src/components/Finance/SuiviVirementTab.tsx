import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Button, Box, TextField, FormControl, InputLabel,
  Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress
} from '@mui/material';
import { Refresh, Visibility, Edit } from '@mui/icons-material';
import { financeService } from '../../services/financeService';

interface SuiviVirement {
  id: string;
  numeroBordereau: string;
  societe: string;
  dateInjection: string;
  utilisateurSante: string;
  dateTraitement?: string;
  utilisateurFinance?: string;
  etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE';
  dateEtatFinal?: string;
  commentaire?: string;
  ordreVirement?: any;
}

const SuiviVirementTab: React.FC = () => {
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
    commentaire: ''
  });

  useEffect(() => {
    loadSuiviVirements();
  }, []);

  const loadSuiviVirements = async () => {
    setLoading(true);
    try {
      const data = await financeService.getSuiviVirements(filters);
      setSuiviVirements(data);
    } catch (error) {
      console.error('Failed to load suivi virements:', error);
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
      const details = await financeService.getSuiviVirementById(suivi.id);
      setSelectedSuivi(details);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load suivi details:', error);
    }
  };

  const handleUpdateEtat = (suivi: SuiviVirement) => {
    setSelectedSuivi(suivi);
    setUpdateData({
      etatVirement: suivi.etatVirement,
      commentaire: suivi.commentaire || ''
    });
    setUpdateOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!selectedSuivi) return;

    try {
      await financeService.updateEtatVirement(selectedSuivi.id, {
        etatVirement: updateData.etatVirement,
        commentaire: updateData.commentaire
      });
      setUpdateOpen(false);
      loadSuiviVirements();
    } catch (error) {
      console.error('Failed to update etat virement:', error);
    }
  };

  const getEtatChip = (etat: string) => {
    const config = {
      'NON_EXECUTE': { label: 'Non Exécuté', color: 'default' as const },
      'EN_COURS_EXECUTION': { label: 'En Cours', color: 'info' as const },
      'EXECUTE_PARTIELLEMENT': { label: 'Partiel', color: 'warning' as const },
      'REJETE': { label: 'Rejeté', color: 'error' as const },
      'EXECUTE': { label: 'Exécuté', color: 'success' as const }
    };
    
    const { label, color } = config[etat as keyof typeof config] || { label: etat, color: 'default' as const };
    return <Chip label={label} color={color} size="small" />;
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
        <Typography variant="h6" sx={{ mb: 2 }}>
          Suivi des Virements ({suiviVirements.length})
        </Typography>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Bordereau</TableCell>
              <TableCell>Société</TableCell>
              <TableCell>Date Injection</TableCell>
              <TableCell>Utilisateur Santé</TableCell>
              <TableCell>Date Traitement</TableCell>
              <TableCell>Utilisateur Finance</TableCell>
              <TableCell>État</TableCell>
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
                <TableCell>{suivi.utilisateurSante}</TableCell>
                <TableCell>
                  {suivi.dateTraitement 
                    ? new Date(suivi.dateTraitement).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </TableCell>
                <TableCell>{suivi.utilisateurFinance || '-'}</TableCell>
                <TableCell>{getEtatChip(suivi.etatVirement)}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(suivi)}
                    >
                      Voir
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleUpdateEtat(suivi)}
                    >
                      Modifier
                    </Button>
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
                  <MenuItem value="EXECUTE">Exécuté</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Commentaire"
                value={updateData.commentaire}
                onChange={(e) => setUpdateData(prev => ({ ...prev, commentaire: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveUpdate} variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuiviVirementTab;