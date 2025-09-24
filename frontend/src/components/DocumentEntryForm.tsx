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
  Chip
} from '@mui/material';
import { CloudUpload, AttachFile } from '@mui/icons-material';
import { fetchClients } from '../services/clientService';

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

const DocumentEntryForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reference: '',
    clientId: '',
    documentType: 'BULLETIN_SOIN',
    dateReception: new Date().toISOString().split('T')[0]
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadClients();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      reference: '',
      clientId: '',
      documentType: 'BULLETIN_SOIN',
      dateReception: new Date().toISOString().split('T')[0]
    });
    setSelectedFile(null);
    setError(null);
  };

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
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
    const docType = documentTypes.find(dt => dt.value === formData.documentType);
    const docTypeAbbr = docType ? docType.value.split('_')[0] : 'DOC';
    
    const reference = `${clientAbbr}-${docTypeAbbr}-${year}-${sequence.toString().padStart(5, '0')}`;
    
    setFormData(prev => ({ ...prev, reference }));
  };
  
  // Auto-generate reference when client or document type changes
  useEffect(() => {
    if (formData.clientId && formData.documentType && !formData.reference) {
      generateReference();
    }
  }, [formData.clientId, formData.documentType, clients]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    
    console.log('🚀 [FRONTEND] Submitting document creation:', {
      reference: formData.reference,
      type: formData.documentType,
      clientId: formData.clientId
    });
    
    try {
      const { LocalAPI } = await import('../services/axios');
      
      if (selectedFile) {
        // Upload with file
        const formDataUpload = new FormData();
        formDataUpload.append('files', selectedFile);
        formDataUpload.append('name', selectedFile.name);
        formDataUpload.append('type', formData.documentType);
        if (formData.clientId) {
          formDataUpload.append('clientId', formData.clientId);
        }
        
        const response = await LocalAPI.post('/documents/upload', formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('✅ [FRONTEND] Document uploaded successfully:', response.data);
      } else {
        // Create without file
        const response = await LocalAPI.post('/documents', {
          name: `${formData.reference}.pdf`,
          type: formData.documentType,
          path: `/uploads/documents/${formData.reference}.pdf`,
          clientId: formData.clientId,
          dateReception: formData.dateReception
        });
        
        console.log('✅ [FRONTEND] Document created successfully:', response.data);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ [FRONTEND] Document creation failed:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        formData
      });
      setError(error.response?.data?.message || error.message || 'Erreur lors de la création du document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Nouveau Document</Typography>
          <Chip label="Scan Flow" color="primary" size="small" />
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
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              onClick={generateReference}
              disabled={loading}
              sx={{ height: '56px', width: '100%' }}
            >
              Générer
            </Button>
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
              type="date"
              label="Date de Réception *"
              value={formData.dateReception}
              onChange={(e) => setFormData(prev => ({ ...prev, dateReception: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* File Upload Section */}
          <Grid item xs={12}>
            <Box sx={{ 
              border: '2px dashed #e0e0e0', 
              borderRadius: '8px', 
              p: 3, 
              textAlign: 'center',
              backgroundColor: selectedFile ? '#f0f8ff' : '#fafafa',
              borderColor: selectedFile ? '#1976d2' : '#e0e0e0'
            }}>
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png,.tiff"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    // Auto-generate reference from filename if empty
                    if (!formData.reference) {
                      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                      setFormData(prev => ({ ...prev, reference: nameWithoutExt }));
                    }
                  }
                }}
              />
              
              {selectedFile ? (
                <Box>
                  <AttachFile sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                  <Typography variant="h6" color="primary" gutterBottom>
                    Fichier sélectionné
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedFile(null)}
                      sx={{ mr: 1 }}
                    >
                      Supprimer
                    </Button>
                    <Button
                      variant="outlined"
                      component="label"
                      htmlFor="file-upload"
                    >
                      Changer
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 48, color: '#9e9e9e', mb: 1 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Télécharger un fichier (optionnel)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    PDF, JPG, PNG, TIFF - Max 10MB
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    htmlFor="file-upload"
                    startIcon={<CloudUpload />}
                    sx={{ mt: 2 }}
                  >
                    Choisir un fichier
                  </Button>
                </Box>
              )}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Vous pouvez créer un document avec ou sans fichier. Le fichier peut être ajouté plus tard.
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.reference || !formData.clientId}
          sx={{ minWidth: 120 }}
        >
          {loading ? (selectedFile ? 'Téléchargement...' : 'Création...') : (selectedFile ? 'Télécharger & Créer' : 'Créer Document')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentEntryForm;