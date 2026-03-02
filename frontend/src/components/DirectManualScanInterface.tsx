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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { 
  Upload, 
  CheckCircle, 
  Description,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';

interface Props {
  bordereau: any;
  onComplete: () => void;
}

const DirectManualScanInterface: React.FC<Props> = ({ bordereau, onComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<Record<number, string>>({});
  const [bulkType, setBulkType] = useState<string>('BULLETIN_SOIN');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    successCount: number;
    failedCount: number;
    failedFiles: Array<{ fileName: string; error: string }>;
    typeSummary: Record<string, number>;
  } | null>(null);

  const documentTypes = [
    { value: 'BULLETIN_SOIN', label: '🏥 Bulletin de Soins', icon: '🏥' },
    { value: 'COMPLEMENT_INFORMATION', label: '📋 Complément Info', icon: '📋' },
    { value: 'ADHESION', label: '👥 Adhésion', icon: '👥' },
    { value: 'RECLAMATION', label: '⚠️ Réclamation', icon: '⚠️' },
    { value: 'CONTRAT_AVENANT', label: '📄 Contrat/Avenant', icon: '📄' },
    { value: 'DEMANDE_RESILIATION', label: '❌ Demande Résiliation', icon: '❌' },
    { value: 'CONVENTION_TIERS_PAYANT', label: '🤝 Convention Tiers', icon: '🤝' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const startIndex = uploadedFiles.length;
    setUploadedFiles(prev => [...prev, ...files]);
    
    // Initialize with bulk type for new files
    const newTypes: Record<number, string> = {};
    files.forEach((_, index) => {
      newTypes[startIndex + index] = bulkType; // Use bulk type as default
    });
    setFileTypes(prev => ({ ...prev, ...newTypes }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileTypes(prev => {
      const newTypes = { ...prev };
      delete newTypes[index];
      // Reindex remaining files
      const reindexed: Record<number, string> = {};
      Object.keys(newTypes).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = newTypes[oldIndex];
        } else {
          reindexed[oldIndex] = newTypes[oldIndex];
        }
      });
      return reindexed;
    });
  };

  const applyBulkType = () => {
    const newTypes: Record<number, string> = {};
    uploadedFiles.forEach((_, index) => {
      newTypes[index] = bulkType;
    });
    setFileTypes(newTypes);
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;

    // Validate all files have types assigned
    const missingTypes = uploadedFiles.some((_, index) => !fileTypes[index]);
    if (missingTypes) {
      alert('⚠️ Veuillez sélectionner un type pour tous les documents');
      return;
    }

    // DEBUG: Log file types before upload
    console.log('🔍 DEBUG: File types before upload:', fileTypes);
    console.log('🔍 DEBUG: Files:', uploadedFiles.map((f, i) => `${i}: ${f.name} -> ${fileTypes[i]}`));

    setUploading(true);
    try {
      const { validateMultipleScanCapability, uploadAdditionalDocuments, uploadManualDocuments } = await import('../services/manualScanService');
      
      const validation = await validateMultipleScanCapability(bordereau.id);
      
      if (!validation.isValid) {
        alert(`❌ Impossible d'uploader: Statut du bordereau invalide (${validation.currentStatus})`);
        return;
      }

      let response;
      if (validation.canScanMultiple) {
        // Use additional upload with document types
        console.log('📤 Uploading additional documents with types:', fileTypes);
        response = await uploadAdditionalDocuments(bordereau.id, uploadedFiles, notes, fileTypes);
      } else {
        // Use regular upload with document types
        console.log('📤 Uploading documents with types:', fileTypes);
        response = await uploadManualDocuments(bordereau.id, uploadedFiles, fileTypes);
      }

      const successCount = response.uploadedDocuments?.length || 0;
      const failedCount = response.errors?.length || 0;
      const typeSummary = Object.values(fileTypes).reduce((acc: Record<string, number>, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      setUploadResult({
        success: response.success,
        successCount,
        failedCount,
        failedFiles: response.errors || [],
        typeSummary
      });

      if (response.success && failedCount === 0) {
        // Auto-close after 2 seconds if all successful
        setTimeout(() => {
          setUploadResult(null);
          onComplete();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadResult({
        success: false,
        successCount: 0,
        failedCount: uploadedFiles.length,
        failedFiles: uploadedFiles.map(f => ({
          fileName: f.name,
          error: error.response?.data?.message || error.message || 'Erreur lors de l\'upload'
        })),
        typeSummary: {}
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCloseResult = () => {
    setUploadResult(null);
    if (uploadResult?.success && uploadResult.failedCount === 0) {
      onComplete();
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
          Cliquez pour sélectionner des documents (multiple)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Formats: PDF, JPEG, PNG, TIFF (max 5GB par fichier, 1000 fichiers max)
        </Typography>
        <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
          ✅ Téléversement multiple de PDF autorisé
        </Typography>
      </Box>

      {uploadedFiles.length > 0 && (
        <Box mb={2}>
          <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              🎯 Sélection en Masse (Bulk)
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Type pour tous les documents</InputLabel>
                <Select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  label="Type pour tous les documents"
                >
                  {documentTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                onClick={applyBulkType}
                sx={{ minWidth: 180 }}
              >
                Appliquer à tous ({uploadedFiles.length})
              </Button>
            </Box>
            <Alert severity="info" sx={{ mt: 1 }}>
              💡 Sélectionnez un type et cliquez sur "Appliquer à tous" pour définir le même type pour tous les documents. Vous pouvez ensuite modifier individuellement si nécessaire.
            </Alert>
          </Box>
          <Typography variant="subtitle1" gutterBottom>
            Documents sélectionnés ({uploadedFiles.length})
          </Typography>
          <List dense>
            {uploadedFiles.map((file, index) => (
              <ListItem 
                key={index}
                sx={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1, 
                  mb: 1,
                  bgcolor: '#fafafa'
                }}
              >
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                  sx={{ flex: '0 0 40%' }}
                />
                <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                  <InputLabel>Type de document</InputLabel>
                  <Select
                    value={fileTypes[index] || ''}
                    onChange={(e) => setFileTypes(prev => ({ ...prev, [index]: e.target.value }))}
                    label="Type de document"
                  >
                    {documentTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
          <Alert severity="info" sx={{ mt: 1 }}>
            💡 Sélectionnez le type pour chaque document avant l'upload
          </Alert>
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

      {/* Custom Upload Result Modal */}
      <Dialog 
        open={uploadResult !== null} 
        onClose={handleCloseResult}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: uploadResult?.success ? '#4caf50' : '#f44336', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {uploadResult?.success ? (
            <><CheckCircle /> Upload Terminé</>
          ) : (
            <><ErrorIcon /> Erreur d'Upload</>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {uploadResult && (
            <Box>
              {/* Success Summary */}
              {uploadResult.successCount > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ✅ {uploadResult.successCount} document(s) uploadé(s) avec succès
                  </Typography>
                  {Object.keys(uploadResult.typeSummary).length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" fontWeight="bold">📊 Répartition par type:</Typography>
                      {Object.entries(uploadResult.typeSummary).map(([type, count]) => (
                        <Typography key={type} variant="body2" sx={{ ml: 2 }}>
                          • {documentTypes.find(t => t.value === type)?.icon || '📄'} {type}: {count}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Alert>
              )}

              {/* Failed Files */}
              {uploadResult.failedCount > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    ❌ {uploadResult.failedCount} document(s) échoué(s)
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Documents en erreur:
                  </Typography>
                  <List dense>
                    {uploadResult.failedFiles.map((failed, index) => (
                      <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <ErrorIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={failed.fileName}
                          secondary={failed.error}
                          primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem', color: 'error.main' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    💡 Veuillez vérifier ces fichiers sur votre ordinateur et réessayer.
                  </Alert>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResult} variant="contained" color="primary">
            {uploadResult?.success && uploadResult.failedCount === 0 ? 'Fermer' : 'Compris'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DirectManualScanInterface;