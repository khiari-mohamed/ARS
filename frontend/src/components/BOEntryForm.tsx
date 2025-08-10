import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Alert,
  Box,
  Chip,
  IconButton
} from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';
import { fetchClients } from '../services/clientService';
import { fetchContractsByClient } from '../services/contractService';
import { createBOEntry, generateReference, classifyDocument } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const documentTypes = [
  { value: 'BS', label: 'Bulletin de Soin' },
  { value: 'CONTRAT', label: 'Contrat' },
  { value: 'RECLAMATION', label: 'Réclamation' },
  { value: 'FACTURE', label: 'Facture' },
  { value: 'AUTRE', label: 'Autre' }
];

const BOEntryForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reference: '',
    clientId: '',
    contractId: '',
    documentType: 'BS',
    nombreDocuments: 1,
    delaiReglement: 30,
    dateReception: new Date().toISOString().split('T')[0]
  });
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classification, setClassification] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadClients();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (formData.clientId) {
      loadContracts(formData.clientId);
    } else {
      setContracts([]);
      setFormData(prev => ({ ...prev, contractId: '' }));
    }
  }, [formData.clientId]);

  const resetForm = () => {
    setFormData({
      reference: '',
      clientId: '',
      contractId: '',
      documentType: 'BS',
      nombreDocuments: 1,
      delaiReglement: 30,
      dateReception: new Date().toISOString().split('T')[0]
    });
    setError(null);
    setClassification(null);
  };

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadContracts = async (clientId: string) => {
    try {
      const data = await fetchContractsByClient(clientId);
      setContracts(data);
      
      if (data.length === 1) {
        setFormData(prev => ({
          ...prev,
          contractId: data[0].id,
          delaiReglement: data[0].delaiReglement || 30
        }));
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  const handleGenerateReference = async () => {
    try {
      const { reference } = await generateReference(formData.documentType, formData.clientId);
      setFormData(prev => ({ ...prev, reference }));
    } catch (error) {
      console.error('Failed to generate reference:', error);
    }
  };

  const handleClassifyDocument = async () => {
    if (!formData.reference) return;
    
    try {
      const result = await classifyDocument(formData.reference);
      setClassification(result);
      
      if (result.confidence > 0.8) {
        setFormData(prev => ({ ...prev, documentType: result.type }));
      }
    } catch (error) {
      console.error('Failed to classify document:', error);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!formData.reference || !formData.clientId || !formData.documentType || !formData.nombreDocuments) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await createBOEntry({
        ...formData,
        startTime: Date.now()
      });
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création de l\'entrée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Nouvelle Entrée BO</Typography>
          {classification && (
            <Chip
              label={`${classification.type} (${Math.round(classification.confidence * 100)}%)`}
              color="primary"
              size="small"
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

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Référence *"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              onBlur={handleClassifyDocument}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box display="flex" gap={1} height="100%">
              <Button
                variant="outlined"
                onClick={handleGenerateReference}
                startIcon={<AutoAwesome />}
                sx={{ minWidth: 120 }}
              >
                Générer
              </Button>
              <IconButton onClick={handleClassifyDocument} title="Classifier">
                <Refresh />
              </IconButton>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Client *</InputLabel>
              <Select
                value={formData.clientId}
                label="Client *"
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Contrat</InputLabel>
              <Select
                value={formData.contractId}
                label="Contrat"
                onChange={(e) => setFormData(prev => ({ ...prev, contractId: e.target.value }))}
                disabled={!formData.clientId}
              >
                <MenuItem value="">Aucun</MenuItem>
                {contracts.map((contract) => (
                  <MenuItem key={contract.id} value={contract.id}>
                    {contract.clientName || contract.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type de Document *</InputLabel>
              <Select
                value={formData.documentType}
                label="Type de Document *"
                onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
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
              label="Nombre de Documents *"
              value={formData.nombreDocuments}
              onChange={(e) => setFormData(prev => ({ ...prev, nombreDocuments: parseInt(e.target.value) || 1 }))}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Date de Réception *"
              value={formData.dateReception}
              onChange={(e) => setFormData(prev => ({ ...prev, dateReception: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Délai Règlement (jours)"
              value={formData.delaiReglement}
              onChange={(e) => setFormData(prev => ({ ...prev, delaiReglement: parseInt(e.target.value) || 30 }))}
              inputProps={{ min: 1 }}
            />
          </Grid>
        </Grid>

        {classification && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Classification Automatique
            </Typography>
            <Grid container spacing={1}>
              <Grid item>
                <Chip label={`Type: ${classification.type}`} size="small" />
              </Grid>
              <Grid item>
                <Chip label={`Catégorie: ${classification.category}`} size="small" />
              </Grid>
              <Grid item>
                <Chip label={`Priorité: ${classification.priority}`} size="small" />
              </Grid>
              <Grid item>
                <Chip label={`Confiance: ${Math.round(classification.confidence * 100)}%`} size="small" />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Création...' : 'Créer Entrée'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BOEntryForm;