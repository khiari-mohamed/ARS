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
    if (!selectedFile) {
      alert('Veuillez sélectionner un document');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const result = await performMultiEngineOCR(formData);
      
      if (result.results && result.results.length > 0) {
        setOcrResults(result.results);
        
        // Select best result automatically
        const bestResult = result.bestResult || result.results[0];
        setOriginalText(bestResult.text);
        setCorrectedText(bestResult.text);
        setSelectedEngine(0);
        
        // Generate document ID if not provided
        if (!documentId) {
          setDocumentId(`DOC_${Date.now()}`);
        }
      } else {
        alert('❌ Aucun texte détecté dans le document');
      }
    } catch (error: any) {
      console.error('OCR processing failed:', error);
      alert(`❌ Erreur OCR: ${error.response?.data?.message || error.message || 'Traitement échoué'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!documentId.trim()) {
      alert('⚠️ Veuillez saisir un ID de document');
      return;
    }
    
    if (!originalText.trim() || !correctedText.trim()) {
      alert('⚠️ Le texte original et corrigé ne peuvent pas être vides');
      return;
    }
    
    if (originalText === correctedText) {
      alert('ℹ️ Aucune correction détectée (texte identique)');
      return;
    }

    setSaving(true);
    try {
      await saveOCRCorrection(documentId, originalText, correctedText);
      
      // Calculate improvement metrics
      const improvementPercent = Math.round(
        ((correctedText.length - originalText.length) / originalText.length) * 100
      );
      
      alert(`✅ Correction sauvegardée avec succès!\n\n📊 Statistiques:\n• Caractères originaux: ${originalText.length}\n• Caractères corrigés: ${correctedText.length}\n• Amélioration: ${improvementPercent > 0 ? '+' : ''}${improvementPercent}%\n\n🤖 Cette correction aidera à améliorer la précision de l'OCR pour des documents similaires.`);
      
      // Reset form
      setSelectedFile(null);
      setOcrResults([]);
      setOriginalText('');
      setCorrectedText('');
      setDocumentId('');
      setSelectedEngine(0);
      
    } catch (error: any) {
      console.error('Failed to save correction:', error);
      alert(`❌ Erreur lors de la sauvegarde: ${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectEngineResult = (index: number) => {
    if (index >= 0 && index < ocrResults.length) {
      setSelectedEngine(index);
      const selectedResult = ocrResults[index];
      setOriginalText(selectedResult.text);
      setCorrectedText(selectedResult.text);
    }
  };
  
  const calculateTextDifferences = () => {
    if (!originalText || !correctedText) return null;
    
    const originalWords = originalText.split(/\s+/).length;
    const correctedWords = correctedText.split(/\s+/).length;
    const wordDiff = correctedWords - originalWords;
    
    return {
      originalLength: originalText.length,
      correctedLength: correctedText.length,
      originalWords,
      correctedWords,
      wordDiff,
      hasChanges: originalText !== correctedText
    };
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
                  label="ID Document *"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  margin="normal"
                  size="small"
                  placeholder="Ex: DOC_BS_2024_001"
                  helperText="Identifiant unique du document pour le suivi des corrections"
                  required
                />

                <Tabs value={selectedEngine} onChange={(_, newValue) => setSelectedEngine(newValue)}>
                  <Tab 
                    label={`📄 Texte Original (${originalText.length} car.)`} 
                    disabled={!originalText}
                  />
                  <Tab 
                    label={`✏️ Texte Corrigé (${correctedText.length} car.)`}
                    disabled={!correctedText}
                  />
                </Tabs>

                <TabPanel value={selectedEngine} index={0}>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    label="📄 Texte OCR Original (Lecture seule)"
                    value={originalText}
                    InputProps={{
                      readOnly: true,
                      style: { 
                        fontFamily: 'Consolas, Monaco, monospace', 
                        fontSize: '0.9rem',
                        backgroundColor: '#f8f9fa',
                        lineHeight: 1.5
                      }
                    }}
                    helperText={`${originalText.split('\n').length} lignes • ${originalText.split(/\s+/).length} mots`}
                  />
                </TabPanel>

                <TabPanel value={selectedEngine} index={1}>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    label="✏️ Texte Corrigé (Éditable)"
                    value={correctedText}
                    onChange={(e) => setCorrectedText(e.target.value)}
                    InputProps={{
                      style: { 
                        fontFamily: 'Consolas, Monaco, monospace', 
                        fontSize: '0.9rem',
                        lineHeight: 1.5
                      }
                    }}
                    helperText={`${correctedText.split('\n').length} lignes • ${correctedText.split(/\s+/).length} mots • ${originalText !== correctedText ? '⚠️ Modifié' : '✅ Identique'}`}
                  />
                </TabPanel>
                
                {/* Text Comparison Summary */}
                {(() => {
                  const diff = calculateTextDifferences();
                  return diff && diff.hasChanges ? (
                    <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        📊 Résumé des modifications:
                      </Typography>
                      <Typography variant="body2">
                        • Caractères: {diff.originalLength} → {diff.correctedLength} ({diff.correctedLength - diff.originalLength > 0 ? '+' : ''}{diff.correctedLength - diff.originalLength})
                        • Mots: {diff.originalWords} → {diff.correctedWords} ({diff.wordDiff > 0 ? '+' : ''}{diff.wordDiff})
                      </Typography>
                    </Box>
                  ) : null;
                })()}

                <Box mt={3} display="flex" gap={2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={saving ? <Refresh /> : <Save />}
                    onClick={handleSaveCorrection}
                    disabled={saving || !documentId.trim() || !originalText || !correctedText || originalText === correctedText}
                    sx={{ minWidth: 200 }}
                  >
                    {saving ? 'Sauvegarde...' : '💾 Sauvegarder Correction'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => {
                      if (window.confirm('Réinitialiser le texte corrigé avec le texte original?')) {
                        setCorrectedText(originalText);
                      }
                    }}
                    disabled={!originalText || saving}
                  >
                    🔄 Réinitialiser
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => {
                      const diff = calculateTextDifferences();
                      if (diff) {
                        alert(`📊 Statistiques de correction:\n\n• Caractères: ${diff.originalLength} → ${diff.correctedLength}\n• Mots: ${diff.originalWords} → ${diff.correctedWords}\n• Modifications: ${diff.hasChanges ? 'Oui' : 'Non'}`);
                      }
                    }}
                    disabled={!originalText || !correctedText}
                  >
                    📊 Statistiques
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