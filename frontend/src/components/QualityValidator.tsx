import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Warning,
  Error,
  AutoFixHigh as Enhancement,
  Refresh
} from '@mui/icons-material';
import { validateScanQuality, enhanceImage } from '../services/scanService';

const QualityValidator: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setEnhancedImage(null);
    }
  };

  const handleValidateQuality = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const result = await validateScanQuality(formData);
      setValidationResult(result);
    } catch (error) {
      console.error('Quality validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceImage = async () => {
    if (!selectedFile) return;

    setEnhancing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const result = await enhanceImage(formData);
      setEnhancedImage(result.enhancedPath);
    } catch (error) {
      console.error('Image enhancement failed:', error);
    } finally {
      setEnhancing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellente';
    if (score >= 70) return 'Acceptable';
    return 'Insuffisante';
  };

  return (
    <Box>
      {/* File Upload */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <input
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          id="quality-file-upload"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="quality-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUpload />}
            size="large"
            sx={{ mb: 2 }}
          >
            Sélectionner un fichier
          </Button>
        </label>
        
        {selectedFile && (
          <Box>
            <Typography variant="body1" gutterBottom>
              Fichier sélectionné: {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taille: {(selectedFile.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Validation Controls */}
      {selectedFile && (
        <Box display="flex" gap={2} mb={3} justifyContent="center">
          <Button
            variant="contained"
            onClick={handleValidateQuality}
            disabled={loading}
            startIcon={loading ? <Refresh /> : <CheckCircle />}
          >
            {loading ? 'Validation...' : 'Valider Qualité'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleEnhanceImage}
            disabled={enhancing}
            startIcon={enhancing ? <Refresh /> : <Enhancement />}
          >
            {enhancing ? 'Amélioration...' : 'Améliorer Image'}
          </Button>
        </Box>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Validation Results */}
      {validationResult && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Score de Qualité
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h3" color={`${getScoreColor(validationResult.score)}.main`}>
                    {validationResult.score}
                  </Typography>
                  <Box>
                    <Chip
                      label={getScoreLabel(validationResult.score)}
                      color={getScoreColor(validationResult.score) as any}
                    />
                    <Typography variant="body2" color="text.secondary">
                      sur 100
                    </Typography>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={validationResult.score}
                  color={getScoreColor(validationResult.score) as any}
                  sx={{ height: 8, borderRadius: 4 }}
                />

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    {validationResult.isAcceptable 
                      ? 'Qualité acceptable pour le traitement'
                      : 'Qualité insuffisante - Rescan recommandé'
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analyse Détaillée
                </Typography>

                {validationResult.issues.length > 0 ? (
                  <List dense>
                    {validationResult.issues.map((issue: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Warning color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={issue} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="success" />
                    <Typography>Aucun problème détecté</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {validationResult.recommendations.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Recommandations d'amélioration:
                </Typography>
                <List dense>
                  {validationResult.recommendations.map((rec: string, index: number) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText primary={`• ${rec}`} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Enhanced Image Result */}
      {enhancedImage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">
            Image améliorée avec succès!
          </Typography>
          <Typography variant="body2">
            Chemin: {enhancedImage}
          </Typography>
        </Alert>
      )}

      {/* Instructions */}
      {!selectedFile && (
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Instructions:
          </Typography>
          <Typography variant="body2">
            1. Sélectionnez un fichier image ou PDF scanné<br/>
            2. Cliquez sur "Valider Qualité" pour analyser la qualité<br/>
            3. Utilisez "Améliorer Image" si la qualité est insuffisante<br/>
            4. Les formats supportés: JPG, PNG, TIFF, PDF
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default QualityValidator;