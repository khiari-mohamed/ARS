import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  PictureAsPdf, 
  Description, 
  Archive,
  Visibility,
  GetApp
} from '@mui/icons-material';
import { TxtFormatValidator } from './TxtFormatValidator';

interface OVValidationModalProps {
  open: boolean;
  onClose: () => void;
  ovId: string;
  ovReference: string;
  onValidated: () => void;
}

const OVValidationModal: React.FC<OVValidationModalProps> = ({
  open,
  onClose,
  ovId,
  ovReference,
  onValidated
}) => {
  const [activeStep, setActiveStep] = useState(0); // 0=Step4, 1=Step5, 2=Step6
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [ovDetails, setOvDetails] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [txtGenerated, setTxtGenerated] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'deposited' | 'not_validated' | null>(null);
  const [finalizationComplete, setFinalizationComplete] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<{open: boolean, url: string, title: string}>({open: false, url: '', title: ''});
  const [showTxtValidator, setShowTxtValidator] = useState(false);
  const [txtContent, setTxtContent] = useState('');

  const steps = [
    'Étape 4: Validation de l\'upload',
    'Étape 5: Génération des fichiers', 
    'Étape 6: Finalisation'
  ];

  React.useEffect(() => {
    if (open && ovId) {
      loadOVDetails();
      setActiveStep(0);
      setValidationStatus(null);
      setPdfGenerated(false);
      setTxtGenerated(false);
      setFinalStatus(null);
      setFinalizationComplete(false);
    }
  }, [open, ovId]);

  const loadOVDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 OV Details loaded:', { id: data.id, bordereauId: data.bordereauId, uploadedPdfPath: data.uploadedPdfPath });
        setOvDetails(data);
      }
    } catch (error) {
      console.error('Failed to load OV details:', error);
    }
  };

  const handleStep4Validation = async (approved: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validation/${ovId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            approved,
            comment: comment || undefined
          })
        }
      );

      if (response.ok) {
        setValidationStatus(approved ? 'approved' : 'rejected');
        if (approved) {
          setActiveStep(1); // Move to Step 5
        } else {
          alert('OV rejeté - Motif enregistré');
          onValidated();
          onClose();
        }
      } else {
        alert('Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFiles = async () => {
    setLoading(true);
    try {
      // Generate PDF
      const pdfResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/generate-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (pdfResponse.ok) {
        console.log('✅ PDF generated successfully');
        setPdfGenerated(true);
      } else {
        console.error('❌ PDF generation failed:', await pdfResponse.text());
      }

      // Generate TXT
      const txtResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/generate-txt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (txtResponse.ok) {
        console.log('✅ TXT generated successfully');
        setTxtGenerated(true);
      } else {
        console.error('❌ TXT generation failed:', await txtResponse.text());
        alert('Erreur lors de la génération du fichier TXT');
      }

      if (pdfResponse.ok && txtResponse.ok) {
        // Auto-download PDF
        const pdfBlob = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/pdf`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.blob());
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const pdfLink = document.createElement('a');
        pdfLink.href = pdfUrl;
        pdfLink.download = `OV_${ovReference}.pdf`;
        pdfLink.click();
        URL.revokeObjectURL(pdfUrl);

        // Auto-download TXT and show validator
        const txtBlob = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.blob());
        const txtUrl = URL.createObjectURL(txtBlob);
        const txtLink = document.createElement('a');
        txtLink.href = txtUrl;
        txtLink.download = `OV_${ovReference}.txt`;
        txtLink.click();
        URL.revokeObjectURL(txtUrl);

        // Fetch TXT content for validation (only for ATTIJARI format)
        const txtContentResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.text());
        
        // Check if it's ATTIJARI format (starts with 110104)
        if (txtContentResponse.trim().startsWith('110104')) {
          setTxtContent(txtContentResponse);
          setShowTxtValidator(true);
        }

        setActiveStep(2); // Move to Step 6
      }
    } catch (error) {
      console.error('❌ File generation failed:', error);
      alert('Erreur lors de la génération des fichiers: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalValidation = async (deposited: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validation/${ovId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            approved: deposited,
            comment: comment || undefined
          })
        }
      );

      if (response.ok) {
        setFinalizationComplete(true);
        alert(deposited ? 'Virement déposé avec succès!' : 'Virement marqué comme non validé');
        onValidated();
      } else {
        alert('Erreur lors de la finalisation');
      }
    } catch (error) {
      console.error('Final validation failed:', error);
      alert('Erreur lors de la finalisation');
    } finally {
      setLoading(false);
    }
  };

  const renderStep4 = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Étape 4:</strong> Validation de l'upload par le Responsable de département
      </Alert>

      {ovDetails && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📄 PDF Uploadé
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Document uploadé par le Chef d'équipe
                </Typography>
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  <Typography variant="caption">
                    DEBUG: bordereauId={ovDetails?.bordereauId || 'null'} | uploadedPdfPath={ovDetails?.uploadedPdfPath || 'null'}
                  </Typography>
                </Alert>
                {ovDetails?.bordereauId || ovDetails?.uploadedPdfPath ? (
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={async () => {
                      try {
                        const { LocalAPI } = await import('../../services/axios');
                        
                        // For Excel-injected OVs, check bordereau documents first
                        if (ovDetails?.bordereauId) {
                          try {
                            const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${ovDetails.bordereauId}`);
                            const ovDocuments = response.data;
                            
                            const pdfDoc = ovDocuments.find((doc: any) => 
                              doc.name?.toLowerCase().endsWith('.pdf')
                            );
                            
                            if (pdfDoc) {
                              const docResponse = await LocalAPI.get(`/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`, {
                                responseType: 'blob'
                              });
                              const blob = new Blob([docResponse.data], { type: 'application/pdf' });
                              const blobUrl = URL.createObjectURL(blob);
                              setPdfViewer({open: true, url: blobUrl, title: `PDF Uploadé - ${pdfDoc.name}`});
                              return;
                            }
                          } catch (bordereauError) {
                            console.log('No bordereau documents found, trying uploaded PDF...');
                          }
                        }
                        
                        // Fallback: try uploaded PDF endpoint (for manual OVs)
                        try {
                          const response = await LocalAPI.get(`/finance/ordres-virement/${ovId}/uploaded-pdf`, {
                            responseType: 'blob'
                          });
                          const blob = new Blob([response.data], { type: 'application/pdf' });
                          const blobUrl = URL.createObjectURL(blob);
                          setPdfViewer({open: true, url: blobUrl, title: `PDF Uploadé`});
                          return;
                        } catch (uploadedPdfError) {
                          console.log('No uploaded PDF found');
                        }
                        
                        alert('Aucun PDF uploadé trouvé');
                      } catch (error: any) {
                        console.error('❌ Error loading uploaded PDF:', error);
                        alert(`Erreur lors du chargement du PDF\n\n${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
                      }
                    }}
                    fullWidth
                  >
                    Voir PDF Uploadé
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => alert('Aucun PDF uploadé trouvé')}
                    fullWidth
                  >
                    Voir PDF Uploadé
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 PDF de l'Ordre de Virement
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Document généré automatiquement
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={async () => {
                    try {
                      const { LocalAPI } = await import('../../services/axios');
                      const response = await LocalAPI.get(`/finance/ordres-virement/${ovId}/pdf`, {
                        responseType: 'blob'
                      });
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const blobUrl = URL.createObjectURL(blob);
                      setPdfViewer({open: true, url: blobUrl, title: `PDF OV - ${ovReference}`});
                    } catch (error) {
                      console.error('Error loading PDF:', error);
                      alert('Erreur lors du chargement du PDF');
                    }
                  }}
                  fullWidth
                >
                  Voir PDF OV
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Motif / Commentaire"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Motif du rejet ou commentaire..."
        sx={{ mt: 3, mb: 2 }}
      />
    </Box>
  );

  const renderStep5 = () => (
    <Box>
      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>Étape 5:</strong> Validation finale et génération des fichiers
      </Alert>

      <Typography variant="body1" sx={{ mb: 3 }}>
        L'upload a été approuvé. Génération automatique des fichiers finaux :
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ bgcolor: pdfGenerated ? '#e8f5e8' : '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <PictureAsPdf color={pdfGenerated ? 'success' : 'disabled'} />
                <Typography variant="h6">
                  PDF Final de l'OV
                </Typography>
                {pdfGenerated && <CheckCircle color="success" />}
              </Box>
              <Typography variant="body2" color="textSecondary">
                {pdfGenerated ? 'Généré avec succès' : 'En attente de génération'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ bgcolor: txtGenerated ? '#e8f5e8' : '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Description color={txtGenerated ? 'success' : 'disabled'} />
                <Typography variant="h6">
                  Fichier TXT
                </Typography>
                {txtGenerated && <CheckCircle color="success" />}
              </Box>
              <Typography variant="body2" color="textSecondary">
                {txtGenerated ? 'Généré avec succès' : 'En attente de génération'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!pdfGenerated || !txtGenerated ? (
        <Button
          variant="contained"
          onClick={handleGenerateFiles}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <GetApp />}
          fullWidth
          size="large"
        >
          {loading ? 'Génération en cours...' : 'Générer les fichiers'}
        </Button>
      ) : (
        <Alert severity="success">
          <strong>Fichiers générés avec succès!</strong> Vous pouvez maintenant passer à la finalisation.
        </Alert>
      )}
    </Box>
  );

  const renderStep6 = () => {
    if (finalizationComplete) {
      // Show completion message after finalization
      return (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Étape 6:</strong> Finalisation terminée
          </Alert>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Étape 6: Historique et archivage
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Processus terminé avec succès!</strong> Toutes les actions ont été enregistrées automatiquement.
            </Alert>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <Archive color="primary" />
              <Typography variant="body2">
                Date: {new Date().toLocaleString('fr-FR')} | 
                Utilisateur: Responsable Département |
                Action: Finalisation OV {ovReference}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              L'ordre de virement a été traité et archivé. Vous pouvez maintenant fermer cette fenêtre.
            </Typography>
          </Box>
        </Box>
      );
    }

    // Show selection cards before finalization
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Étape 6:</strong> Finalisation - Choisissez le statut final
        </Alert>

        <Typography variant="body1" sx={{ mb: 3 }}>
          Les fichiers ont été générés avec succès. Veuillez choisir le statut final :
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2} 
              sx={{ 
                cursor: 'pointer',
                border: finalStatus === 'deposited' ? '2px solid #4caf50' : '1px solid #ddd',
                bgcolor: finalStatus === 'deposited' ? '#e8f5e8' : 'white'
              }}
              onClick={() => setFinalStatus('deposited')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                <Typography variant="h6" color="success.main">
                  Virement Déposé
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tout est conforme, le virement est validé
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2} 
              sx={{ 
                cursor: 'pointer',
                border: finalStatus === 'not_validated' ? '2px solid #f44336' : '1px solid #ddd',
                bgcolor: finalStatus === 'not_validated' ? '#ffebee' : 'white'
              }}
              onClick={() => setFinalStatus('not_validated')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Cancel sx={{ fontSize: 48, color: '#f44336', mb: 1 }} />
                <Typography variant="h6" color="error.main">
                  Virement Non Validé
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Erreur détectée, le virement est rejeté
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {finalStatus === 'not_validated' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motif du rejet (obligatoire)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précisez le motif du rejet..."
            required
            sx={{ mb: 2 }}
          />
        )}
      </Box>
    );
  };

  const getStepActions = () => {
    switch (activeStep) {
      case 0: // Step 4
        return (
          <>
            <Button onClick={onClose} disabled={loading}>
              Fermer
            </Button>
            <Button
              onClick={() => handleStep4Validation(false)}
              disabled={loading}
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
            >
              Rejeter
            </Button>
            <Button
              onClick={() => handleStep4Validation(true)}
              disabled={loading}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
            >
              Approuver
            </Button>
          </>
        );
      case 1: // Step 5
        return (
          <>
            <Button onClick={() => setActiveStep(0)}>Retour</Button>
            <Button
              onClick={() => setActiveStep(2)}
              disabled={!pdfGenerated || !txtGenerated}
              variant="contained"
            >
              Continuer vers Finalisation
            </Button>
          </>
        );
      case 2: // Step 6
        if (finalizationComplete) {
          // After finalization is complete
          return (
            <>
              <Button onClick={() => setActiveStep(1)}>Retour</Button>
              <Button onClick={onClose} variant="contained" color="primary">
                Fermer
              </Button>
            </>
          );
        } else {
          // Before finalization - show Finaliser button
          return (
            <>
              <Button onClick={() => setActiveStep(1)}>Retour</Button>
              <Button
                onClick={() => {
                  if (finalStatus === 'deposited') {
                    handleFinalValidation(true);
                  } else if (finalStatus === 'not_validated') {
                    handleFinalValidation(false);
                  }
                }}
                disabled={loading || !finalStatus || (finalStatus === 'not_validated' && !comment.trim())}
                variant="contained"
                color={finalStatus === 'deposited' ? 'success' : 'error'}
                startIcon={loading ? <CircularProgress size={20} /> : (finalStatus === 'deposited' ? <CheckCircle /> : <Cancel />)}
              >
                {loading ? 'Finalisation...' : 'Finaliser'}
              </Button>
            </>
          );
        }
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Validation Ordre de Virement - {ovReference}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Processus de validation Responsable de Département
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {/* Progress Stepper */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step Content */}
        <Box sx={{ minHeight: 400 }}>
          {activeStep === 0 && renderStep4()}
          {activeStep === 1 && renderStep5()}
          {activeStep === 2 && renderStep6()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        {getStepActions()}
      </DialogActions>

      {/* PDF Viewer Dialog */}
      <Dialog 
        open={pdfViewer.open} 
        onClose={() => {
          if (pdfViewer.url) URL.revokeObjectURL(pdfViewer.url);
          setPdfViewer({open: false, url: '', title: ''});
        }} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="span">{pdfViewer.title}</Typography>
            <Button onClick={() => {
              if (pdfViewer.url) URL.revokeObjectURL(pdfViewer.url);
              setPdfViewer({open: false, url: '', title: ''});
            }} size="small">
              Fermer
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {pdfViewer.url ? (
            <iframe
              src={pdfViewer.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={pdfViewer.title}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography>Chargement du PDF...</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* TXT Format Validator */}
      <TxtFormatValidator
        open={showTxtValidator}
        onClose={() => setShowTxtValidator(false)}
        generatedContent={txtContent}
      />
    </Dialog>
  );
};

export default OVValidationModal;
