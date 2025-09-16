import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Box, Alert, Card, CardContent
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import PreviewIcon from '@mui/icons-material/Preview';
import { LocalAPI } from '../../services/axios';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<any>(null);
  const [dialogResolve, setDialogResolve] = useState<any>(null);
  
  const showCustomDialog = (data: any): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogData(data);
      setDialogResolve(() => resolve);
      setDialogOpen(true);
    });
  };
  
  const handleDialogClose = (confirmed: boolean) => {
    setDialogOpen(false);
    if (dialogResolve) {
      dialogResolve(confirmed);
      setDialogResolve(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load real clients and gestionnaires using LocalAPI
        const [clientsResponse, usersResponse] = await Promise.all([
          LocalAPI.get('/clients'),
          LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
        ]);
        
        setClients(clientsResponse.data.map((c: any) => ({ id: c.id, name: c.name })));
        setGestionnaires(usersResponse.data.filter((u: any) => u.active).map((u: any) => ({ id: u.id, name: u.fullName })));
      } catch (error) {
        console.error('Failed to load data:', error);
        setClients([]);
        setGestionnaires([]);
      }
    };
    loadData();
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
      // Check PaperStream status first
      const statusResponse = await LocalAPI.get('/documents/paperstream/status');
      const status = statusResponse.data;
      
      const message = `📊 Statut PaperStream:\n\n` +
        `📁 Dossier surveillé: ${status.inputFolder || './paperstream-input'}\n` +
        `📄 Fichiers en attente: ${status.pendingBatches || 0}\n` +
        `✅ Lots traités: ${status.totalProcessed || 0}\n` +
        `⚠️ En quarantaine: ${status.totalQuarantined || 0}\n` +
        `📈 Taux de succès: ${status.successRate || 0}%\n\n` +
        `🔄 Statut: ${status.watcherActive ? 'Actif' : 'Inactif'}`;
      
      const shouldImport = await showCustomDialog({
        title: '📄 Statut PaperStream',
        message,
        confirmText: 'Déclencher Import',
        cancelText: 'Annuler'
      });
      
      if (shouldImport) {
        const importResponse = await LocalAPI.post('/scan/paperstream-import');
        const result = importResponse.data;
        
        if (result.importedCount > 0) {
          alert(`✅ Import réussi!\n\n📊 Résultats:\n• ${result.importedCount} fichier(s) importé(s)\n• ${result.files?.length || 0} fichier(s) traité(s)\n\n🔄 Actualisation...`);
          // Refresh the page to show new documents
          window.location.reload();
        } else {
          alert(`ℹ️ Import terminé\n\n📊 Résultats:\n• Aucun nouveau fichier détecté\n• Dossier d'entrée vide\n\n💡 Placez des fichiers dans le dossier PaperStream pour les traiter`);
        }
      }
    } catch (error: any) {
      console.error('Scanner import failed:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Erreur inconnue';
      alert(`❌ Erreur PaperStream\n\n🔍 Détails: ${errorMsg}\n\n💡 Vérifiez que le service PaperStream est configuré`);
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
      formData.append('files', uploadedFile);
      formData.append('name', uploadedFile.name);
      formData.append('type', metadata.type);
      // Only add bordereauId if it's not empty
      if (metadata.bordereauRef && metadata.bordereauRef.trim() !== '') {
        formData.append('bordereauId', metadata.bordereauRef.trim());
      }

      const response = await LocalAPI.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = response.data;
      alert('Document enregistré avec succès!');
      
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
      alert('Erreur lors de l\'upload: ' + (error as Error).message);
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
              p: { xs: 3, sm: 4 },
              mx: 0,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
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
            <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
              Glissez-déposez votre document ici
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              ou cliquez pour sélectionner
            </Typography>
            <Typography variant="caption" color="textSecondary">
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
                label="Référence Bordereau (optionnel)"
                value={metadata.bordereauRef}
                onChange={(e) => setMetadata({...metadata, bordereauRef: e.target.value})}
                fullWidth
                helperText="Laissez vide si aucun bordereau associé"
                placeholder="Ex: REF2025001"
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
      
      {/* Custom PaperStream Status Dialog */}
      <Dialog open={dialogOpen} onClose={() => handleDialogClose(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon color="primary" />
          {dialogData?.title}
        </DialogTitle>
        <DialogContent>
          <Typography component="pre" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace', fontSize: '0.9rem', mb: 2 }}>
            {dialogData?.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Voulez-vous déclencher un import manuel des fichiers PaperStream?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false)} color="inherit">
            {dialogData?.cancelText || 'Annuler'}
          </Button>
          <Button onClick={() => handleDialogClose(true)} variant="contained" startIcon={<FolderIcon />}>
            {dialogData?.confirmText || 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DocumentIngestionTab;