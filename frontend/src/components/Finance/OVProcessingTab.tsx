import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Button, Box, Stepper, Step, StepLabel, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';

interface DonneurOrdre {
  id: string;
  name: string;
  bank: string;
  rib: string;
  txtFormat: string;
}

interface ValidationResult {
  matricule: string;
  name: string;
  society: string;
  rib: string;
  amount: number;
  status: 'ok' | 'error' | 'warning';
  notes: string;
}

interface OVProcessingTabProps {
  onSwitchToTab?: (tabIndex: number) => void;
}

const OVProcessingTab: React.FC<OVProcessingTabProps> = ({ onSwitchToTab }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDonneur, setSelectedDonneur] = useState<DonneurOrdre | null>(null);
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [processing, setProcessing] = useState(false);

  const steps = [
    'Sélectionner Donneur d\'Ordre',
    'Importer Fichier Excel',
    'Validation Automatique',
    'Générer Fichiers'
  ];

  useEffect(() => {
    const loadDonneurs = async () => {
      try {
        const { getDonneurs } = await import('../../services/financeService');
        const data = await getDonneurs();
        setDonneurs(data);
      } catch (error) {
        console.error('Failed to load donneurs:', error);
        setDonneurs([]);
      }
    };
    loadDonneurs();
  }, []);

  const handleDonneurSelect = (donneur: DonneurOrdre) => {
    setSelectedDonneur(donneur);
    setActiveStep(1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setProcessing(true);
    try {
      const { validateOVFile } = await import('../../services/financeService');
      const result = await validateOVFile(file, selectedDonneur?.id || '');
      
      if (result.results && result.results.length > 0) {
        setValidationResults(result.results);
        setActiveStep(2);
        
        // Show validation summary
        if (result.summary) {
          console.log('Validation Summary:', result.summary);
        }
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn('Validation Errors:', result.errors);
        }
      } else {
        console.error('No results from validation');
        // Show error to user
        alert('Aucune donnée valide trouvée dans le fichier Excel');
      }
    } catch (error: any) {
      console.error('File processing failed:', error);
      alert('Erreur lors du traitement du fichier: ' + (error?.message || 'Erreur inconnue'));
      setValidationResults([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateFiles = async (type: 'pdf' | 'txt') => {
    setProcessing(true);
    try {
      const { processOV, generateOVPDF, generateOVTXT } = await import('../../services/financeService');
      
      // First process the OV
      const validAdherents = validationResults.filter(r => r.status === 'ok');
      const ovData = {
        donneurOrdreId: selectedDonneur?.id,
        societyId: 'default',
        adherents: validAdherents,
        totalAmount: validAdherents.reduce((sum, r) => sum + r.amount, 0)
      };
      
      const ovRecord = await processOV(ovData);
      
      // Then generate the file
      if (type === 'pdf') {
        const blob = await generateOVPDF(ovRecord.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OV_${ovRecord.reference}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = await generateOVTXT(ovRecord.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OV_${ovRecord.reference}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        setActiveStep(3);
      }
    } catch (error) {
      console.error('File generation failed:', error);
      alert('Erreur lors de la génération du fichier');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ok': return <Chip label="Valide" color="success" size="small" />;
      case 'error': return <Chip label="Erreur" color="error" size="small" />;
      case 'warning': return <Chip label="Attention" color="warning" size="small" />;
      default: return <Chip label="Inconnu" size="small" />;
    }
  };

  return (
    <Box>
      {/* Progress Stepper */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto' }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Grid container spacing={3}>
        {/* Step 1: Select Donneur d'Ordre */}
        {activeStep === 0 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 1: Sélectionner le Donneur d'Ordre
              </Typography>
              <Grid container spacing={2}>
                {donneurs.map((donneur) => (
                  <Grid item xs={12} md={6} key={donneur.id}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        border: selectedDonneur?.id === donneur.id ? 2 : 1,
                        borderColor: selectedDonneur?.id === donneur.id ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handleDonneurSelect(donneur)}
                    >
                      <Typography variant="h6">{donneur.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Banque: {donneur.bank}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        RIB: {donneur.rib}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Format: {donneur.txtFormat}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Step 2: File Upload */}
        {activeStep === 1 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 2: Importer le Fichier Excel
              </Typography>
              
              {selectedDonneur && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Donneur sélectionné: <strong>{selectedDonneur.name}</strong> - {selectedDonneur.bank}
                </Alert>
              )}

              <Box
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                component="label"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Glissez-déposez votre fichier Excel ici
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ou cliquez pour sélectionner
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Formats supportés: .xlsx, .xls
                </Typography>
              </Box>

              {uploadedFile && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Fichier sélectionné: {uploadedFile.name}
                </Alert>
              )}

              {processing && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Traitement du fichier en cours...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Step 3: Validation Results */}
        {activeStep === 2 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 3: Résultats de Validation
              </Typography>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Matricule</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Société</TableCell>
                    <TableCell>RIB</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.matricule}</TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.society}</TableCell>
                      <TableCell>{result.rib || 'N/A'}</TableCell>
                      <TableCell>{result.amount.toFixed(2)} €</TableCell>
                      <TableCell>{getStatusChip(result.status)}</TableCell>
                      <TableCell>{result.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => handleGenerateFiles('pdf')}
                  disabled={processing}
                >
                  Générer PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DescriptionIcon />}
                  onClick={() => handleGenerateFiles('txt')}
                  disabled={processing}
                >
                  Générer TXT
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Step 4: Files Generated */}
        {activeStep === 3 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 4: Fichiers Générés
              </Typography>
              
              <Alert severity="success" sx={{ mb: 2 }}>
                Les fichiers ont été générés avec succès et sauvegardés dans l'historique.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setActiveStep(0)}>
                  Nouveau Traitement
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => onSwitchToTab?.(1)}
                >
                  Voir le Suivi
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default OVProcessingTab;