import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, Grid, FormControl, InputLabel, Select, MenuItem,
  Alert, Box, Typography, Chip, IconButton, Autocomplete
} from '@mui/material';
import { AutoAwesome, Refresh, CheckCircle, Warning } from '@mui/icons-material';
import { boInterfaceService, BOEntryData } from '../services/boInterfaceService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BOInterfaceForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<BOEntryData>({
    typeFichier: 'BS',
    nombreFichiers: 1,
    referenceBordereau: '',
    clientId: '',
    delaiReglement: 30,
    delaiReclamation: 15,
    gestionnaire: '',
    observations: ''
  });
  
  const [clients, setClients] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preFillData, setPreFillData] = useState<any>(null);
  const [referenceValidation, setReferenceValidation] = useState<any>(null);

  const documentTypes = [
    { value: 'BS', label: 'Bulletin de Soin' },
    { value: 'FACTURE', label: 'Facture' },
    { value: 'CONTRAT', label: 'Contrat' },
    { value: 'RECLAMATION', label: 'Réclamation' },
    { value: 'AUTRE', label: 'Autre' }
  ];

  useEffect(() => {
    if (open) {
      loadInitialData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (formData.clientId) {
      loadClientPreFillData(formData.clientId);
    }
  }, [formData.clientId]);

  useEffect(() => {
    if (formData.referenceBordereau) {
      validateReference(formData.referenceBordereau);
    }
  }, [formData.referenceBordereau]);

  const resetForm = () => {
    setFormData({
      typeFichier: 'BS',
      nombreFichiers: 1,
      referenceBordereau: '',
      clientId: '',
      delaiReglement: 30,
      delaiReclamation: 15,
      gestionnaire: '',
      observations: ''
    });
    setError(null);
    setSuccess(null);
    setPreFillData(null);
    setReferenceValidation(null);
  };

  const loadInitialData = async () => {
    try {
      const [clientsData, gestionnairesData] = await Promise.all([
        boInterfaceService.getAvailableClients(),
        boInterfaceService.getAvailableGestionnaires()
      ]);
      
      setClients(clientsData);
      setGestionnaires(gestionnairesData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadClientPreFillData = async (clientId: string) => {
    try {
      const data = await boInterfaceService.getClientPreFillData(clientId);
      setPreFillData(data);
      
      // Auto-fill delays from client data
      setFormData(prev => ({
        ...prev,
        delaiReglement: data.reglementDelay || prev.delaiReglement,
        delaiReclamation: data.reclamationDelay || prev.delaiReclamation
      }));
    } catch (error) {
      console.error('Failed to load client pre-fill data:', error);
    }
  };

  const validateReference = async (reference: string) => {
    if (!reference.trim()) {
      setReferenceValidation(null);
      return;
    }

    try {
      const validation = await boInterfaceService.validateBordereauReference(reference);
      setReferenceValidation(validation);
    } catch (error) {
      console.error('Failed to validate reference:', error);
    }
  };

  const generateReference = () => {
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 99999) + 1;
    
    // Get client abbreviation
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const clientAbbr = selectedClient ? 
      selectedClient.name.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 3).toUpperCase() :
      'CLI';
    
    // Get document type abbreviation
    const docTypeAbbr = formData.typeFichier || 'DOC';
    
    const reference = `${clientAbbr}-${docTypeAbbr}-${year}-${sequence.toString().padStart(5, '0')}`;
    
    setFormData(prev => ({ ...prev, referenceBordereau: reference }));
  };
  
  // Auto-generate reference when client or document type changes
  useEffect(() => {
    if (formData.clientId && formData.typeFichier && !formData.referenceBordereau) {
      generateReference();
    }
  }, [formData.clientId, formData.typeFichier, clients]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      const result = await boInterfaceService.createBordereauEntry(formData);
      
      if (result.bordereau) {
        setSuccess(`Bordereau ${result.bordereau.reference} créé avec succès. ${result.message}`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError('Erreur lors de la création du bordereau');
      }
    } catch (error: any) {
      console.error('BO Entry creation error:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de la création du bordereau');
    } finally {
      setLoading(false);
    }
  };

  const getReferenceValidationIcon = () => {
    if (!referenceValidation) return null;
    
    if (referenceValidation.exists) {
      return <Warning color="error" />;
    } else if (referenceValidation.isValid) {
      return <CheckCircle color="success" />;
    } else {
      return <Warning color="warning" />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Saisie Manuelle - Bureau d'Ordre</Typography>
          {preFillData && (
            <Chip
              label="Données pré-remplies"
              color="primary"
              size="small"
              icon={<AutoAwesome />}
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Reference with validation */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Référence Bordereau *"
              value={formData.referenceBordereau}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceBordereau: e.target.value }))}
              InputProps={{
                endAdornment: getReferenceValidationIcon()
              }}
              error={referenceValidation?.exists}
              helperText={
                referenceValidation?.exists 
                  ? `Référence déjà utilisée. Suggestion: ${referenceValidation.suggestion}`
                  : referenceValidation && !referenceValidation.isValid
                  ? `Format invalide. Suggestion: ${referenceValidation.suggestion}`
                  : ''
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              onClick={generateReference}
              startIcon={<AutoAwesome />}
              disabled={loading}
              fullWidth
              sx={{ height: '56px' }}
            >
              Générer
            </Button>
          </Grid>

          {/* Client selection with pre-fill indicator */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => option.name}
              value={clients.find(c => c.id === formData.clientId) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, clientId: newValue?.id || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Client *"
                  required
                />
              )}
            />
            {preFillData && (
              <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                Délais pré-remplis depuis le profil client
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type de Fichier *</InputLabel>
              <Select
                value={formData.typeFichier}
                label="Type de Fichier *"
                onChange={(e) => setFormData(prev => ({ ...prev, typeFichier: e.target.value }))}
              >
                {documentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Nombre de Fichiers *"
              value={formData.nombreFichiers}
              onChange={(e) => setFormData(prev => ({ ...prev, nombreFichiers: parseInt(e.target.value) || 1 }))}
              inputProps={{ min: 1 }}
            />
          </Grid>

          {/* Gestionnaire assignment removed - handled by Chef d'équipe */}
          {/* <Grid item xs={12} sm={6}>
            <Autocomplete
              options={gestionnaires}
              getOptionLabel={(option) => option.fullName}
              value={gestionnaires.find(g => g.id === formData.gestionnaire) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, gestionnaire: newValue?.id || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Gestionnaire Assigné"
                />
              )}
            />
          </Grid> */}

          {/* Pre-filled delays */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Délai Règlement (jours)"
              value={formData.delaiReglement}
              onChange={(e) => setFormData(prev => ({ ...prev, delaiReglement: parseInt(e.target.value) || 30 }))}
              inputProps={{ min: 1 }}
              helperText={preFillData ? "Pré-rempli depuis le client" : ""}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Délai Réclamation (jours)"
              value={formData.delaiReclamation}
              onChange={(e) => setFormData(prev => ({ ...prev, delaiReclamation: parseInt(e.target.value) || 15 }))}
              inputProps={{ min: 1 }}
              helperText={preFillData ? "Pré-rempli depuis le client" : ""}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observations"
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            />
          </Grid>
        </Grid>

        {/* Pre-fill data display */}
        {preFillData && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Informations Client Pré-remplies
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Client: <strong>{preFillData.clientName}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Délai Règlement: <strong>{preFillData.reglementDelay} jours</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Délai Réclamation: <strong>{preFillData.reclamationDelay} jours</strong>
                </Typography>
              </Grid>
              {preFillData.activeContract && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Contrat Actif: <strong>Oui</strong>
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.referenceBordereau || !formData.clientId || referenceValidation?.exists}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Création...' : 'Créer & Notifier SCAN'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BOInterfaceForm;