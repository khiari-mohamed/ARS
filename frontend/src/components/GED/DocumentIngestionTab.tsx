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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState({
    clientId: '',
    contractId: '',
    type: 'BULLETIN_SOIN',
    numberOfDocs: 1,
    bordereauRef: '',
    dateReception: new Date().toISOString().split('T')[0]
  });
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
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
        const clientsResponse = await LocalAPI.get('/clients');
        setClients(clientsResponse.data);
      } catch (error) {
        console.error('Failed to load clients:', error);
        setClients([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (metadata.clientId) {
      loadContracts(metadata.clientId);
    } else {
      setContracts([]);
      setMetadata(prev => ({ ...prev, contractId: '' }));
    }
  }, [metadata.clientId]);

  const loadContracts = async (clientId: string) => {
    try {
      const { fetchContractsByClient } = await import('../../services/contractService');
      const data = await fetchContractsByClient(clientId);
      setContracts(data);
      if (data.length === 1) {
        setMetadata(prev => ({ ...prev, contractId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
      setContracts([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => [...prev, ...fileArray]);
      
      // Generate preview for first image
      const firstImage = fileArray.find(f => f.type.startsWith('image/'));
      if (firstImage) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(firstImage);
      } else if (fileArray.length > 0) {
        setPreview(null);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
      setPreview(null);
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
    if (uploadedFiles.length === 0) {
      alert('Veuillez sélectionner au moins un fichier');
      return;
    }

    if (!metadata.clientId) {
      alert('Veuillez sélectionner un client');
      return;
    }

    console.log('🚀 [DEBUG] Starting document upload...');
    console.log('📋 [DEBUG] Metadata:', metadata);
    console.log('📁 [DEBUG] Files to upload:', uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

    setUploading(true);
    try {
      const uploadResults = [];
      
      for (const file of uploadedFiles) {
        console.log(`\n📤 [DEBUG] Uploading file: ${file.name}`);
        
        const formData = new FormData();
        formData.append('files', file);
        formData.append('name', file.name);
        formData.append('type', metadata.type);
        
        if (metadata.bordereauRef && metadata.bordereauRef.trim() !== '') {
          formData.append('bordereauId', metadata.bordereauRef.trim());
          console.log(`🔗 [DEBUG] Linking to bordereau: ${metadata.bordereauRef.trim()}`);
        } else {
          console.log('⚠️ [DEBUG] No bordereau reference provided');
        }

        console.log('📡 [DEBUG] Sending POST request to /documents/upload');
        const response = await LocalAPI.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log('✅ [DEBUG] Upload response:', response.data);
        uploadResults.push(response.data);
      }

      console.log('\n🎉 [DEBUG] All uploads completed successfully!');
      console.log('📊 [DEBUG] Upload results:', uploadResults);
      
      alert(`✅ ${uploadedFiles.length} document(s) enregistré(s) avec succès!\n\nDétails: ${JSON.stringify(uploadResults, null, 2)}`);
      
      // Reset form
      setUploadedFiles([]);
      setPreview(null);
      setMetadata({
        clientId: '',
        contractId: '',
        type: 'BULLETIN_SOIN',
        numberOfDocs: 1,
        bordereauRef: '',
        dateReception: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('❌ [DEBUG] Upload failed:', error);
      console.error('❌ [DEBUG] Error response:', error.response?.data);
      console.error('❌ [DEBUG] Error status:', error.response?.status);
      alert('Erreur lors de l\'upload: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
      console.log('🏁 [DEBUG] Upload process finished');
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
              multiple
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

          {uploadedFiles.length > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                {uploadedFiles.length} fichier(s) sélectionné(s):
              </Typography>
              {uploadedFiles.map((file, index) => (
                <Box key={index} display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                  <Typography variant="caption">
                    {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Button size="small" color="error" onClick={() => handleRemoveFile(index)}>
                    Supprimer
                  </Button>
                </Box>
              ))}
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

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Contrat</InputLabel>
                <Select
                  value={metadata.contractId}
                  onChange={(e) => setMetadata({...metadata, contractId: e.target.value})}
                  label="Contrat"
                  disabled={!metadata.clientId}
                >
                  {contracts.length === 0 && <MenuItem value="">Aucun contrat disponible</MenuItem>}
                  {contracts.map((contract) => (
                    <MenuItem key={contract.id} value={contract.id}>
                      {contract.clientName || contract.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type de Document *</InputLabel>
                <Select
                  value={metadata.type}
                  onChange={(e) => setMetadata({...metadata, type: e.target.value})}
                  label="Type de Document *"
                >
                  <MenuItem value="BULLETIN_SOIN">Bulletin de Soin</MenuItem>
                  <MenuItem value="COMPLEMENT_INFORMATION">Complément Information</MenuItem>
                  <MenuItem value="ADHESION">Adhésion</MenuItem>
                  <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                  <MenuItem value="CONTRAT_AVENANT">Contrat/Avenant</MenuItem>
                  <MenuItem value="DEMANDE_RESILIATION">Demande Résiliation</MenuItem>
                  <MenuItem value="CONVENTION_TIERS_PAYANT">Convention Tiers Payant</MenuItem>
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
              <TextField
                label="Date de Réception *"
                type="date"
                value={metadata.dateReception}
                onChange={(e) => setMetadata({...metadata, dateReception: e.target.value})}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleSaveAndNotify}
            disabled={uploading || uploadedFiles.length === 0 || !metadata.clientId}
            fullWidth
            sx={{ mt: 3 }}
          >
            {uploading ? 'Enregistrement...' : `Enregistrer ${uploadedFiles.length} document(s)`}
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
          ) : uploadedFiles.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {uploadedFiles.length} fichier(s) sélectionné(s)
              </Typography>
              {uploadedFiles.map((file, index) => (
                <Card key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{file.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {file.type} - {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <PreviewIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                  </Box>
                </Card>
              ))}
            </Box>
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