import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Save,
  Refresh,
  CompareArrows,
  AutoFixHigh,
  Visibility,
  Edit
} from '@mui/icons-material';
import { performMultiEngineOCR, saveOCRCorrection } from '../services/scanService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ocr-tabpanel-${index}`}
      aria-labelledby={`ocr-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OCRCorrectionInterface: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [selectedEngine, setSelectedEngine] = useState(0);
  const [originalText, setOriginalText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentId, setDocumentId] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrResults([]);
      setOriginalText('');
      setCorrectedText('');
    }
  };

  const handlePerformOCR = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const result = await performMultiEngineOCR(formData);
      setOcrResults(result.results);
      
      if (result.bestResult) {
        setOriginalText(result.bestResult.text);
        setCorrectedText(result.bestResult.text);
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!documentId || !originalText || !correctedText) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setSaving(true);
    try {
      await saveOCRCorrection(documentId, originalText, correctedText);
      alert('Correction sauvegardée avec succès!');
    } catch (error) {
      console.error('Failed to save correction:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectEngineResult = (index: number) => {
    setSelectedEngine(index);
    if (ocrResults[index]) {
      setOriginalText(ocrResults[index].text);
      setCorrectedText(ocrResults[index].text);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'success';
    if (confidence >= 70) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Excellente';
    if (confidence >= 70) return 'Bonne';
    return 'Faible';
  };

  return (
    <Box>
      {/* File Upload */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <input
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          id="ocr-file-upload"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="ocr-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUpload />}
            size="large"
            sx={{ mb: 2 }}
          >
            Sélectionner un document
          </Button>
        </label>
        
        {selectedFile && (
          <Box>
            <Typography variant="body1" gutterBottom>
              Document: {selectedFile.name}
            </Typography>
            <Button
              variant="contained"
              onClick={handlePerformOCR}
              disabled={loading}
              startIcon={loading ? <Refresh /> : <AutoFixHigh />}
            >
              {loading ? 'Traitement OCR...' : 'Lancer OCR Multi-Moteurs'}
            </Button>
          </Box>
        )}
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* OCR Results */}
      {ocrResults.length > 0 && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Résultats OCR
                </Typography>
                
                <List>
                  {ocrResults.map((result, index) => (
                    <ListItem
                      key={index}
                      button
                      selected={selectedEngine === index}
                      onClick={() => handleSelectEngineResult(index)}
                      sx={{ 
                        border: 1, 
                        borderColor: selectedEngine === index ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {result.engine.toUpperCase()}
                            </Typography>
                            <Chip
                              label={`${result.confidence.toFixed(1)}%`}
                              color={getConfidenceColor(result.confidence) as any}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={getConfidenceLabel(result.confidence)}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Interface de Correction
                  </Typography>
                  <Tooltip title="Comparer les versions">
                    <IconButton>
                      <CompareArrows />
                    </IconButton>
                  </Tooltip>
                </Box>

                <TextField
                  fullWidth
                  label="ID Document"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  margin="normal"
                  size="small"
                />

                <Tabs value={selectedEngine} onChange={(_, newValue) => setSelectedEngine(newValue)}>
                  <Tab label="Texte Original" />
                  <Tab label="Texte Corrigé" />
                </Tabs>

                <TabPanel value={selectedEngine} index={0}>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    label="Texte OCR Original"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    InputProps={{
                      readOnly: true,
                      style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                    }}
                  />
                </TabPanel>

                <TabPanel value={selectedEngine} index={1}>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    label="Texte Corrigé"
                    value={correctedText}
                    onChange={(e) => setCorrectedText(e.target.value)}
                    InputProps={{
                      style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                    }}
                  />
                </TabPanel>

                <Box mt={2} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveCorrection}
                    disabled={saving || !documentId || !originalText || !correctedText}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder Correction'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => {
                      // Show diff view
                    }}
                  >
                    Voir Différences
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setCorrectedText(originalText)}
                  >
                    Réinitialiser
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Learning Feedback */}
      {ocrResults.length > 0 && (
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Amélioration Continue
          </Typography>
          <Typography variant="body2">
            Vos corrections sont utilisées pour améliorer la précision de l'OCR. 
            Plus vous corrigez, plus le système devient précis pour des documents similaires.
          </Typography>
        </Alert>
      )}

      {/* Instructions */}
      {ocrResults.length === 0 && !selectedFile && (
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Instructions d'utilisation:
          </Typography>
          <Typography variant="body2">
            1. Sélectionnez un document scanné (image ou PDF)<br/>
            2. Lancez l'OCR multi-moteurs pour obtenir plusieurs résultats<br/>
            3. Sélectionnez le meilleur résultat ou celui avec la plus haute confiance<br/>
            4. Corrigez le texte dans l'interface de correction<br/>
            5. Sauvegardez vos corrections pour améliorer le système
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default OCRCorrectionInterface;