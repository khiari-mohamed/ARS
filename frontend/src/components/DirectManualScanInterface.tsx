import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  TextField,
  Chip
} from '@mui/material';
import { 
  Upload, 
  CheckCircle, 
  Description,
  Warning
} from '@mui/icons-material';

interface Props {
  bordereau: any;
  onComplete: () => void;
}

const DirectManualScanInterface: React.FC<Props> = ({ bordereau, onComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    try {
      // NEW: Validate multiple scan capability before upload
      const { validateMultipleScanCapability, uploadAdditionalDocuments, uploadManualDocuments } = await import('../services/manualScanService');
      
      const validation = await validateMultipleScanCapability(bordereau.id);
      
      if (!validation.isValid) {
        alert(`❌ Impossible d'uploader: Statut du bordereau invalide (${validation.currentStatus})`);
        return;
      }

      let response;
      if (validation.canScanMultiple) {
        // Use additional upload for multiple scans
        response = await uploadAdditionalDocuments(bordereau.id, uploadedFiles, notes);
      } else {
        // Use regular upload for first scan
        response = await uploadManualDocuments(bordereau.id, uploadedFiles);
      }

      if (response.success) {
        const scanType = validation.canScanMultiple ? 'supplémentaire' : 'initial';
        alert(`✅ Documents uploadés avec succès!\n\n📄 ${response.uploadedDocuments?.length || uploadedFiles.length} document(s) ajouté(s)\n🔄 Scan ${scanType} effectué\n📊 Total documents: ${validation.documentsCount + uploadedFiles.length}`);
        onComplete();
      } else {
        alert(`❌ Erreur lors de l'upload: ${response.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`❌ Erreur: ${error.response?.data?.message || error.message || 'Erreur lors de l\'upload'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="body2" color="text.secondary">
          Client: <strong>{bordereau.client?.name}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Statut: <Chip label={bordereau.statut} size="small" color={bordereau.statut === 'SCAN_EN_COURS' ? 'info' : 'warning'} />
        </Typography>
        {bordereau.statut === 'SCAN_EN_COURS' && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Ce bordereau est déjà en cours de scan. Vous pouvez ajouter des documents supplémentaires.
          </Alert>
        )}
      </Box>

      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 2,
          '&:hover': { backgroundColor: '#f5f5f5' }
        }}
        onClick={() => document.getElementById('direct-file-input')?.click()}
      >
        <input
          id="direct-file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Upload sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
        <Typography variant="body1">
          Cliquez pour sélectionner des documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Formats: PDF, JPEG, PNG, TIFF (max 10MB par fichier)
        </Typography>
      </Box>

      {uploadedFiles.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Documents sélectionnés ({uploadedFiles.length})
          </Typography>
          <List dense>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeFile(index)}
                >
                  Supprimer
                </Button>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Notes (optionnel)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ mb: 2 }}
        placeholder={bordereau.statut === 'SCAN_EN_COURS' ? 'Notes pour ce scan supplémentaire...' : 'Notes pour ce scan...'}
      />

      <Box display="flex" gap={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={handleUpload}
          disabled={uploadedFiles.length === 0 || uploading}
          color="success"
        >
          {uploading ? 'Upload en cours...' : `Upload ${uploadedFiles.length} document(s)`}
        </Button>
      </Box>

      {uploading && (
        <LinearProgress sx={{ mt: 2 }} />
      )}
    </Box>
  );
};

export default DirectManualScanInterface;