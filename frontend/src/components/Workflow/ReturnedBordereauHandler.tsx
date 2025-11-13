import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  AutoFixHigh,
  Visibility,
  CheckCircle,
  Warning
} from '@mui/icons-material';

interface ReturnedBordereauHandlerProps {
  onCorrectionComplete?: () => void;
}

const ReturnedBordereauHandler: React.FC<ReturnedBordereauHandlerProps> = ({ onCorrectionComplete }) => {
  const [returnedBordereaux, setReturnedBordereaux] = useState<any[]>([]);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReturnedBordereaux();
  }, []);

  const loadReturnedBordereaux = async () => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/scan/returned-bordereaux');
      setReturnedBordereaux(response.data || []);
    } catch (error) {
      console.error('Failed to load returned bordereaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectBordereau = async (bordereau: any) => {
    try {
      // Load full bordereau details with documents
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get(`/scan/bordereau/${bordereau.id}`);
      setSelectedBordereau(response.data);
      setCorrectionDialogOpen(true);
    } catch (error) {
      console.error('Failed to load bordereau details:', error);
      alert('❌ Erreur lors du chargement des détails du bordereau');
    }
  };

  const handleReplaceDocument = (documentName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentName', documentName);
          
          const { LocalAPI } = await import('../../services/axios');
          await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/replace-document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          alert('✅ Document remplacé avec succès');
          // Reload bordereau details
          const updatedResponse = await LocalAPI.get(`/scan/bordereau/${selectedBordereau.id}`);
          setSelectedBordereau(updatedResponse.data);
        } catch (error: any) {
          alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
        }
      }
    };
    input.click();
  };

  const handleAddMissingDocument = () => {
    if (!selectedDocumentType) {
      alert('⚠️ Veuillez sélectionner un type de document');
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', selectedDocumentType);
          
          const { LocalAPI } = await import('../../services/axios');
          await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/add-missing-document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          alert('✅ Document manquant ajouté avec succès');
          // Reload bordereau details
          const updatedResponse = await LocalAPI.get(`/scan/bordereau/${selectedBordereau.id}`);
          setSelectedBordereau(updatedResponse.data);
          setSelectedDocumentType('');
        } catch (error: any) {
          alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
        }
      }
    };
    input.click();
  };

  const handleCompleteCorrections = async () => {
    if (selectedBordereau) {
      try {
        const { LocalAPI } = await import('../../services/axios');
        await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/complete-corrections`);
        
        alert('✅ Corrections terminées - Le bordereau est prêt pour re-scan');
        setCorrectionDialogOpen(false);
        setSelectedBordereau(null);
        setSelectedDocumentType('');
        await loadReturnedBordereaux();
        onCorrectionComplete?.();
      } catch (error: any) {
        alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Chargement des bordereaux retournés...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (returnedBordereaux.length === 0) {
    return null; // Don't show the component if no returned bordereaux
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Card sx={{ border: '2px solid #ff9800', bgcolor: '#fff3e0' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Warning color="warning" />
            <Typography variant="h6" color="warning.main">
              🔄 Bordereaux Retournés pour Correction
            </Typography>
            <Chip 
              label={`${returnedBordereaux.length} bordereau(x)`}
              color="warning"
              size="small"
            />
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ces bordereaux ont été rejetés par le chef d'équipe et nécessitent une correction des documents.
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Date Retour</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnedBordereaux.map((bordereau: any) => (
                  <TableRow key={bordereau.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {bordereau.reference}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {bordereau.client?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {bordereau.documents?.length || 0} doc(s)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(bordereau.updatedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<AutoFixHigh />}
                          onClick={() => handleCorrectBordereau(bordereau)}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Corriger
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleCorrectBordereau(bordereau)}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Voir
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Document Correction Dialog */}
      <Dialog 
        open={correctionDialogOpen} 
        onClose={() => {
          setCorrectionDialogOpen(false);
          setSelectedBordereau(null);
          setSelectedDocumentType('');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#fff3e0', color: '#e65100', borderBottom: '2px solid #ff9800' }}>
          🔄 Correction Documents - {selectedBordereau?.reference}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bordereau rejeté par le chef d'équipe - Correction requise
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedBordereau && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#e65100', mb: 2 }}>
                Documents de ce bordereau:
              </Typography>
              
              {selectedBordereau.documents && selectedBordereau.documents.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <Paper sx={{ p: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                    {selectedBordereau.documents.map((doc: any, index: number) => (
                      <Box key={doc.id} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        py: 1.5,
                        px: 2,
                        mb: index < selectedBordereau.documents.length - 1 ? 1 : 0,
                        bgcolor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 1
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>
                            {doc.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={doc.type} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Chip 
                              label={doc.status} 
                              size="small" 
                              color={doc.status === 'SCANNE' ? 'success' : 'warning'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                        </Box>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<Visibility />}
                            onClick={async () => {
                              try {
                                const { LocalAPI } = await import('../../services/axios');
                                const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${doc.id}`);
                                
                                if (response.data.success && response.data.pdfUrl) {
                                  const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
                                  let pdfUrl = response.data.pdfUrl;
                                  
                                  // Extract uploads path
                                  const uploadsIndex = pdfUrl.indexOf('/uploads/');
                                  if (uploadsIndex !== -1) {
                                    pdfUrl = pdfUrl.substring(uploadsIndex);
                                  }
                                  
                                  const cleanedPdfUrl = pdfUrl.replace(/\/\/+/g, '/');
                                  const fullPdfUrl = `${serverBaseUrl}${cleanedPdfUrl}`;
                                  
                                  window.open(fullPdfUrl, '_blank');
                                } else {
                                  alert(response.data.error || `PDF non disponible pour le document: ${doc.name}`);
                                }
                              } catch (error) {
                                console.error('Failed to open PDF:', error);
                                alert('❌ Erreur lors de l\'ouverture du PDF');
                              }
                            }}
                            sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                          >
                            Voir PDF
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<AutoFixHigh />}
                            onClick={() => handleReplaceDocument(doc.name)}
                            sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                          >
                            Remplacer
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  ⚠️ Aucun document trouvé pour ce bordereau
                </Alert>
              )}
              
              {/* Add Missing Document Section */}
              <Paper sx={{ p: 3, bgcolor: '#e8f5e8', border: '2px solid #4caf50' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                  ➕ Ajouter un document manquant
                </Typography>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={selectedDocumentType}
                        onChange={(e) => setSelectedDocumentType(e.target.value)}
                        label="Type de document"
                      >
                        <MenuItem value="BULLETIN_SOIN">📋 Bulletin de Soins</MenuItem>
                        <MenuItem value="COMPLEMENT_INFORMATION">📄 Complément Info</MenuItem>
                        <MenuItem value="ADHESION">👥 Adhésion</MenuItem>
                        <MenuItem value="RECLAMATION">⚠️ Réclamation</MenuItem>
                        <MenuItem value="CONTRAT_AVENANT">📜 Contrat/Avenant</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      disabled={!selectedDocumentType}
                      onClick={handleAddMissingDocument}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      ➕ Sélectionner et Ajouter
                    </Button>
                  </Grid>
                  {selectedDocumentType && (
                    <Grid item xs={12}>
                      <Alert severity="success" sx={{ mt: 1 }}>
                        ✓ Type sélectionné: <strong>{selectedDocumentType}</strong> - Cliquez sur "Sélectionner et Ajouter" pour choisir le fichier
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <Button 
            onClick={() => {
              setCorrectionDialogOpen(false);
              setSelectedBordereau(null);
              setSelectedDocumentType('');
            }}
            color="inherit"
          >
            Fermer
          </Button>
          <Button 
            onClick={handleCompleteCorrections}
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
          >
            ✅ Corrections Terminées
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReturnedBordereauHandler;