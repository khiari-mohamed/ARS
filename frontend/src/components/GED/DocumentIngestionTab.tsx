import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Box, Alert, Card, CardContent
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import PreviewIcon from '@mui/icons-material/Preview';

const DocumentIngestionTab: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    clientId: '',
    type: 'BS',
    numberOfDocs: 1,
    bordereauRef: '',
    assignedGestionnaire: ''
  });
  const [clients, setClients] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // Load clients and gestionnaires
    setClients([
      { id: '1', name: 'Client A' },
      { id: '2', name: 'Client B' },
      { id: '3', name: 'Client C' }
    ]);
    setGestionnaires([
      { id: '1', name: 'Gestionnaire 1' },
      { id: '2', name: 'Gestionnaire 2' }
    ]);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      // Generate preview for images/PDFs
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleScannerImport = async () => {
    try {
      // Mock scanner folder import
      console.log('Importing from scanner folder...');
      alert('Import depuis le dossier scanner déclenché');
    } catch (error) {
      console.error('Scanner import failed:', error);
    }
  };

  const handleSaveAndNotify = async () => {
    if (!uploadedFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('name', uploadedFile.name);
      formData.append('type', metadata.type);
      formData.append('bordereauId', metadata.bordereauRef);

      // Mock API call - replace with actual upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Document enregistré et notification envoyée au service Scan');
      
      // Reset form
      setUploadedFile(null);
      setPreview(null);
      setMetadata({
        clientId: '',
        type: 'BS',
        numberOfDocs: 1,
        bordereauRef: '',
        assignedGestionnaire: ''
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Upload Panel */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ingestion de Documents
          </Typography>

          {/* Upload Zone */}
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
              '&:hover': { borderColor: 'primary.main' }
            }}
            component="label"
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Glissez-déposez votre document ici
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ou cliquez pour sélectionner
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Formats supportés: PDF, JPG, PNG, TIFF
            </Typography>
          </Box>

          {/* Scanner Import Button */}
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={handleScannerImport}
            fullWidth
            sx={{ mb: 2 }}
          >
            Importer depuis le dossier Scanner
          </Button>

          {uploadedFile && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Fichier sélectionné: {uploadedFile.name}
            </Alert>
          )}

          {/* Metadata Form */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Métadonnées du Document
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={metadata.clientId}
                  onChange={(e) => setMetadata({...metadata, clientId: e.target.value})}
                  label="Client"
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
                <InputLabel>Type de fichier</InputLabel>
                <Select
                  value={metadata.type}
                  onChange={(e) => setMetadata({...metadata, type: e.target.value})}
                  label="Type de fichier"
                >
                  <MenuItem value="BS">BS (Bordereau de Soins)</MenuItem>
                  <MenuItem value="ADHESION">Adhésion</MenuItem>
                  <MenuItem value="CONTRAT">Contrat</MenuItem>
                  <MenuItem value="COURRIER">Courrier</MenuItem>
                  <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                  <MenuItem value="JUSTIFICATIF">Justificatif</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Nombre de documents"
                type="number"
                value={metadata.numberOfDocs}
                onChange={(e) => setMetadata({...metadata, numberOfDocs: parseInt(e.target.value)})}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Référence Bordereau"
                value={metadata.bordereauRef}
                onChange={(e) => setMetadata({...metadata, bordereauRef: e.target.value})}
                fullWidth
                helperText="Identifiant unique du bordereau"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Gestionnaire assigné (optionnel)</InputLabel>
                <Select
                  value={metadata.assignedGestionnaire}
                  onChange={(e) => setMetadata({...metadata, assignedGestionnaire: e.target.value})}
                  label="Gestionnaire assigné (optionnel)"
                >
                  <MenuItem value="">Auto-assignation</MenuItem>
                  {gestionnaires.map((gest) => (
                    <MenuItem key={gest.id} value={gest.id}>
                      {gest.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleSaveAndNotify}
            disabled={uploading || !uploadedFile}
            fullWidth
            sx={{ mt: 3 }}
          >
            {uploading ? 'Enregistrement...' : 'Enregistrer & Notifier'}
          </Button>
        </Paper>
      </Grid>

      {/* Preview Panel */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Aperçu du Document
          </Typography>

          {preview ? (
            <Box sx={{ textAlign: 'center' }}>
              <img 
                src={preview} 
                alt="Document preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} 
              />
            </Box>
          ) : uploadedFile ? (
            <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <PreviewIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">{uploadedFile.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {uploadedFile.type} - {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Card>
          ) : (
            <Box sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px dashed #ccc',
              borderRadius: 1,
              color: 'text.secondary'
            }}>
              <Typography>Sélectionnez un document pour voir l'aperçu</Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DocumentIngestionTab;