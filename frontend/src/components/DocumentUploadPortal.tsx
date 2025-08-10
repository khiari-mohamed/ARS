import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Warning,
  Description
} from '@mui/icons-material';
import { validateDocuments, classifyDocument } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationResult {
  index: number;
  fileName: string;
  validation: {
    isValid: boolean;
    issues: string[];
    score: number;
  };
  classification: {
    type: string;
    category: string;
    priority: string;
    confidence: number;
  };
}

const DocumentUploadPortal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    setResults([]);
    setSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const validateFiles = async () => {
    if (files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await validateDocuments(formData);
      setResults(response.results);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to validate documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getValidationIcon = (validation: any) => {
    if (validation.isValid) {
      return <CheckCircle color="success" />;
    } else if (validation.score > 50) {
      return <Warning color="warning" />;
    } else {
      return <Error color="error" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      default: return 'default';
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setResults([]);
    setSummary(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload />
          <Typography variant="h6">Portail d'Upload Documents</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Upload Area */}
        {files.length === 0 && (
          <Box
            sx={{
              border: `2px dashed ${dragOver ? '#1976d2' : '#ccc'}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragOver ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease'
            }}
            component="label"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Glissez-déposez vos documents ici
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ou cliquez pour sélectionner des fichiers
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Formats supportés: PDF, JPG, PNG, TIFF (max 10MB par fichier)
            </Typography>
          </Box>
        )}

        {/* File List */}
        {files.length > 0 && results.length === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Fichiers Sélectionnés ({files.length})
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom du Fichier</TableCell>
                    <TableCell>Taille</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Description />
                          {file.name}
                        </Box>
                      </TableCell>
                      <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>{file.type || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box mt={2} display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={validateFiles}
                disabled={loading}
              >
                {loading ? 'Validation...' : 'Valider Documents'}
              </Button>
              <Button variant="outlined" onClick={resetUpload}>
                Recommencer
              </Button>
            </Box>
          </Box>
        )}

        {loading && <LinearProgress sx={{ mt: 2 }} />}

        {/* Validation Results */}
        {results.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Résultats de Validation
            </Typography>
            
            {/* Summary Cards */}
            {summary && (
              <Grid container spacing={2} mb={3}>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <CheckCircle color="success" sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h6">{summary.valid}</Typography>
                      <Typography variant="caption">Valides</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Error color="error" sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h6">{summary.invalid}</Typography>
                      <Typography variant="caption">Invalides</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Description color="info" sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h6">{summary.total}</Typography>
                      <Typography variant="caption">Total</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Detailed Results */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fichier</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Type Détecté</TableCell>
                    <TableCell>Priorité</TableCell>
                    <TableCell>Problèmes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.fileName}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getValidationIcon(result.validation)}
                          {result.validation.isValid ? 'Valide' : 'Invalide'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={result.validation.score}
                            sx={{ width: 60, height: 6 }}
                            color={result.validation.score > 80 ? 'success' : 
                                   result.validation.score > 50 ? 'warning' : 'error'}
                          />
                          {result.validation.score}%
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.classification.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.classification.priority}
                          size="small"
                          color={getPriorityColor(result.classification.priority) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {result.validation.issues.length > 0 ? (
                          <Box>
                            {result.validation.issues.slice(0, 2).map((issue, i) => (
                              <Typography key={i} variant="caption" display="block">
                                • {issue}
                              </Typography>
                            ))}
                            {result.validation.issues.length > 2 && (
                              <Typography variant="caption" color="text.secondary">
                                +{result.validation.issues.length - 2} autres
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="success.main">
                            Aucun problème
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {summary && summary.invalid > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {summary.invalid} document(s) ont des problèmes de qualité. 
                Veuillez corriger les problèmes avant de continuer.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {results.length > 0 && (
          <Button variant="outlined" onClick={resetUpload}>
            Nouveau Upload
          </Button>
        )}
        {results.length > 0 && summary && summary.valid > 0 && (
          <Button
            variant="contained"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Continuer avec {summary.valid} Document(s)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadPortal;