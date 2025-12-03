import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Chip,
  IconButton
} from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';
import { fetchClients } from '../services/clientService';
import { fetchContractsByClient } from '../services/contractService';
import { classifyDocument } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const documentTypes = [
  { value: 'BULLETIN_SOIN', label: 'Bulletin de Soin' },
  { value: 'COMPLEMENT_INFORMATION', label: 'Complément Information' },
  { value: 'ADHESION', label: 'Adhésion' },
  { value: 'RECLAMATION', label: 'Réclamation' },
  { value: 'CONTRAT_AVENANT', label: 'Contrat/Avenant' },
  { value: 'DEMANDE_RESILIATION', label: 'Demande Résiliation' },
  { value: 'CONVENTION_TIERS_PAYANT', label: 'Convention Tiers Payant' }
];

const ScanEntryForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reference: '',
    clientId: '',
    contractId: '',
    documentType: 'BULLETIN_SOIN',
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
      setFormData(prev => ({ ...prev, contractId: '', delaiReglement: 30 }));
    }
  }, [formData.clientId]);
  
  useEffect(() => {
    if (formData.contractId) {
      const selectedContract = contracts.find(c => c.id === formData.contractId);
      if (selectedContract) {
        setFormData(prev => ({ 
          ...prev, 
          delaiReglement: selectedContract.delaiReglement || 30 
        }));
      }
    }
  }, [formData.contractId, contracts]);
  
  useEffect(() => {
    if (formData.clientId && formData.documentType && !formData.reference) {
      const year = new Date().getFullYear();
      const sequence = Math.floor(Math.random() * 99999) + 1;
      
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const clientAbbr = selectedClient ? 
        selectedClient.name.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 3).toUpperCase() :
        'CLI';
      
      const docType = documentTypes.find(dt => dt.value === formData.documentType);
      const docTypeAbbr = docType ? docType.value.split('_')[0] : 'DOC';
      
      const reference = `${clientAbbr}-${docTypeAbbr}-${year}-${sequence.toString().padStart(5, '0')}`;
      
      setFormData(prev => ({ ...prev, reference }));
    }
  }, [formData.clientId, formData.documentType, clients]);

  const resetForm = () => {
    setFormData({
      reference: '',
      clientId: '',
      contractId: '',
      documentType: 'BULLETIN_SOIN',
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
      } else if (data.length === 0) {
        setFormData(prev => ({ ...prev, delaiReglement: 30 }));
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  const handleGenerateReference = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const year = new Date().getFullYear();
      const sequence = Math.floor(Math.random() * 99999) + 1;
      
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const clientAbbr = selectedClient ? 
        selectedClient.name.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 3).toUpperCase() :
        'CLI';
      
      const docType = documentTypes.find(dt => dt.value === formData.documentType);
      const docTypeAbbr = docType ? docType.value.split('_')[0] : 'DOC';
      
      const reference = `${clientAbbr}-${docTypeAbbr}-${year}-${sequence.toString().padStart(5, '0')}`;
      
      const updates = {
        reference,
        clientId: formData.clientId || (clients.length > 0 ? clients[0].id : ''),
        nombreDocuments: Math.floor(Math.random() * 3) + 1,
        delaiReglement: [15, 30, 45][Math.floor(Math.random() * 3)],
        dateReception: new Date().toISOString().split('T')[0]
      };
      
      setFormData(prev => ({ ...prev, ...updates }));
      
      try {
        const classification = await classifyDocument(reference);
        setClassification(classification);
      } catch (classifyError) {
        console.warn('Classification failed:', classifyError);
      }
    } catch (error: any) {
      console.error('Generate failed:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de la génération de la référence');
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyDocument = async () => {
    if (!formData.reference) return;
    
    try {
      const result = await classifyDocument(formData.reference);
      setClassification(result);
      
      if (result && result.confidence > 0.8) {
        setFormData(prev => ({ ...prev, documentType: result.type }));
      }
    } catch (error) {
      console.error('Failed to classify document:', error);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { LocalAPI } = await import('../services/axios');
      
      // Create bordereau with A_SCANNER status for SCAN workflow
      const bordereauResponse = await LocalAPI.post('/bordereaux', {
        reference: formData.reference,
        clientId: formData.clientId,
        contractId: formData.contractId || null,
        type: formData.documentType,
        dateReception: new Date(formData.dateReception),
        delaiReglement: formData.delaiReglement,
        nombreBS: formData.nombreDocuments,
        statut: 'A_SCANNER' // SCAN workflow status
      });
      
      if (bordereauResponse.data) {
        // Create document with the selected document type
        try {
          await LocalAPI.post('/documents', {
            name: `${formData.reference}.pdf`,
            type: formData.documentType,
            path: `/uploads/scan/${formData.reference}.pdf`,
            bordereauId: bordereauResponse.data.id,
            status: 'UPLOADED'
          });
          console.log('Document created successfully with type:', formData.documentType);
        } catch (docError) {
          console.warn('Failed to create document:', docError);
        }
        
        console.log('SCAN Entry created successfully:', bordereauResponse.data);
        onSuccess();
        onClose();
      } else {
        setError('Erreur lors de la création de l\'entrée');
      }
    } catch (error: any) {
      console.error('SCAN Entry creation error:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de la création de l\'entrée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Nouvelle Entrée SCAN</Typography>
          <Chip label="Bordereau + Document" color="secondary" size="small" />
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
                disabled={loading}
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
              disabled
              helperText={formData.contractId ? "Défini par le contrat sélectionné" : "Valeur par défaut (30 jours)"}
              inputProps={{ min: 1 }}
            />
          </Grid>
        </Grid>

        {classification && (
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Classification AI
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Type: <strong>{classification.type}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Catégorie: <strong>{classification.category}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Priorité: <strong>{classification.priority}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Confiance: <strong>{Math.round(classification.confidence * 100)}%</strong>
                </Typography>
              </Grid>
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
          disabled={loading || !formData.reference}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScanEntryForm;
