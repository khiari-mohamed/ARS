import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { CloudUpload, CheckCircle, Error } from '@mui/icons-material';
import { validateDocuments } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentUploadPortal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
    setResults(null);
    setError(null);
  };

  const handleValidate = async () => {
    if (files.length === 0) {
      setError('Veuillez sélectionner des fichiers');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validationResults = await validateDocuments(files);
      setResults(validationResults);
    } catch (error: any) {
      console.error('Validation error:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!results || !results.results) return;

    setLoading(true);
    setError(null);

    try {
      // Create bordereau entries for valid documents
      const validDocuments = results.results.filter((r: any) => r.validation?.isValid);
      
      const entries = validDocuments.map((doc: any) => ({
        documentType: doc.classification?.type || 'AUTRE',
        nombreDocuments: 1,
        delaiReglement: 30,
        dateReception: new Date().toISOString().split('T')[0],
        fileName: doc.fileName,
        fileSize: files.find(f => f.name === doc.fileName)?.size || 0
      }));

      if (entries.length > 0) {
        const { createBOBatch } = await import('../services/boService');
        await createBOBatch(entries);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setResults(null);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload de Documents</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              fullWidth
              sx={{ mb: 2 }}
            >
              Sélectionner des Fichiers
            </Button>
          </label>

          {files.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Fichiers sélectionnés ({files.length}):
              </Typography>
              <List dense>
                {files.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Validation en cours...
              </Typography>
            </Box>
          )}

          {results && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Résultats de Validation:
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                Valides: {results.summary?.valid || 0} | 
                Invalides: {results.summary?.invalid || 0} | 
                Total: {results.summary?.total || 0}
              </Alert>
              
              <List dense>
                {(results.results || []).slice(0, 5).map((result: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {result.validation?.isValid ? 
                        <CheckCircle color="success" /> : 
                        <Error color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={result.fileName}
                      secondary={
                        result.validation?.isValid ? 
                          `Score: ${result.validation.score}% - ${result.classification?.type}` :
                          result.validation?.issues?.join(', ')
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => { resetForm(); onClose(); }}>
          Annuler
        </Button>
        {files.length > 0 && !results && (
          <Button
            onClick={handleValidate}
            variant="outlined"
            disabled={loading}
          >
            Valider
          </Button>
        )}
        {results && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            Confirmer Upload
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadPortal;