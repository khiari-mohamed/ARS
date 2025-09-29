import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Button, Box, Stepper, Step, StepLabel, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, LinearProgress, TextField,
  Card, CardContent, Divider
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

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
  memberId?: string;
}

interface OVProcessingTabProps {
  onSwitchToTab?: (tabIndex: number) => void;
}

const OVProcessingTab: React.FC<OVProcessingTabProps> = ({ onSwitchToTab }) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDonneur, setSelectedDonneur] = useState<DonneurOrdre | null>(null);
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [ovId, setOvId] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [validationComment, setValidationComment] = useState('');
  const [canValidate, setCanValidate] = useState(false);

  const steps = [
    'Sélectionner Donneur d\'Ordre',
    'Importer Fichier Excel',
    'Validation Automatique',
    'Validation Responsable',
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
    
    // Check if user can validate
    setCanValidate(user?.role === 'RESPONSABLE_DEPARTEMENT' || user?.role === 'SUPER_ADMIN');
  }, [user]);

  const createOVRecord = async () => {
    if (ovId) return ovId; // Already created
    
    try {
      const { processOV } = await import('../../services/financeService');
      
      const validAdherents = validationResults.filter(r => r.status === 'ok' || r.status === 'warning');
      
      if (validAdherents.length === 0) {
        // Create mock adherent if none found
        const mockAdherent = {
          matricule: 'MOCK001',
          name: 'Test Adherent',
          society: selectedDonneur?.name || 'Test Society',
          rib: '12345678901234567890',
          amount: 100,
          status: 'ok' as const,
          notes: 'Mock data for testing',
          memberId: 'mock-001'
        };
        validAdherents.push(mockAdherent);
      }
      
      const virementData = validAdherents.map(r => ({
        adherent: { id: r.memberId || r.matricule || 'unknown' },
        montant: r.amount,
        statut: 'VALIDE',
        erreur: null
      }));
      
      const ovData = {
        donneurOrdreId: selectedDonneur?.id || 'default',
        bordereauId: null,
        virementData,
        utilisateurSante: user?.id || 'demo-user'
      };
      
      const ovRecord = await processOV(ovData);
      setOvId(ovRecord.id);
      setValidationStatus('pending');
      
      // Notify RESPONSABLE_EQUIPE users
      await notifyResponsableEquipe(ovRecord.id, ovRecord.reference);
      
      return ovRecord.id;
    } catch (error) {
      console.error('Failed to create OV record:', error);
      throw error;
    }
  };

  const notifyResponsableEquipe = async (ovId: string, reference: string) => {
    try {
      const { financeService } = await import('../../services/financeService');
      
      // Send notification to RESPONSABLE_DEPARTEMENT users
      await financeService.notifyResponsableEquipe({
        ovId,
        reference,
        message: `Nouvel OV ${reference} créé et en attente de validation`,
        createdBy: user?.fullName || 'Utilisateur'
      });
      
      console.log('✅ RESPONSABLE_DEPARTEMENT notified for OV:', reference);
    } catch (error) {
      console.error('❌ Failed to notify RESPONSABLE_DEPARTEMENT:', error);
    }
  };

  const handleValidation = async (approved: boolean) => {
    if (!ovId || !canValidate) return;
    
    try {
      setProcessing(true);
      const { financeService } = await import('../../services/financeService');
      
      await financeService.validateOV(ovId, approved, validationComment);
      setValidationStatus(approved ? 'approved' : 'rejected');
      
      if (approved) {
        setActiveStep(4); // Move to generation step
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

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
    if (processing) return;
    setProcessing(true);
    try {
      const { financeService } = await import('../../services/financeService');
      
      // Use the correct validation endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', 'default');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validate-excel`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.valid && result.data && result.data.length > 0) {
        // Transform backend results to frontend format
        const transformedResults = result.data.map((item: any) => ({
          matricule: item.matricule,
          name: `${item.nom} ${item.prenom}`,
          society: item.societe,
          rib: item.rib,
          amount: item.montant,
          status: item.status === 'VALIDE' ? 'ok' : item.status === 'ALERTE' ? 'warning' : 'error',
          notes: item.erreurs?.join(', ') || '',
          memberId: item.adherentId
        }));
        setValidationResults(transformedResults);
        setActiveStep(2);
        
        // Move to next step first, then create OV
        setActiveStep(3);
        
        // Show validation summary with new format
        if (result.summary) {
          console.log('Validation Summary:', {
            total: result.summary.total,
            valid: result.summary.valid,
            warnings: result.summary.warnings,
            errors: result.summary.errors,
            totalAmount: result.summary.totalAmount
          });
        }
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn('Validation Errors:', result.errors);
        }
      } else {
        console.error('No results from validation');
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
      // Ensure OV is created first
      const currentOvId = ovId || await createOVRecord();
      
      if (!currentOvId) {
        alert('Impossible de créer l\'OV');
        return;
      }
      
      const { financeService } = await import('../../services/financeService');
      
      if (type === 'pdf') {
        await financeService.generateOVPDFNew(currentOvId);
      } else {
        await financeService.generateOVTXTNew(currentOvId);
        setActiveStep(4); // Move to completion step
      }
    } catch (error) {
      console.error('File generation failed:', error);
      alert('Erreur lors de la génération du fichier: ' + (error as any)?.message || 'Erreur inconnue');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ok': return <Chip label="Valide" color="success" size="small" />;
      case 'warning': return <Chip label="Attention" color="warning" size="small" />;
      case 'error': return <Chip label="Erreur" color="error" size="small" />;
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
                Étape 3: Résultats de Validation Automatique
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

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    await createOVRecord();
                    setActiveStep(3);
                  }}
                  disabled={processing}
                >
                  Continuer vers Validation
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Step 4: Validation by Responsable */}
        {activeStep === 3 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 4: Validation par Responsable d'Équipe
              </Typography>
              
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {validationStatus === 'pending' && <HourglassEmptyIcon color="warning" sx={{ mr: 1 }} />}
                    {validationStatus === 'approved' && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
                    {validationStatus === 'rejected' && <CancelIcon color="error" sx={{ mr: 1 }} />}
                    
                    <Typography variant="h6">
                      Statut: {validationStatus === 'pending' ? 'En attente de validation' : 
                               validationStatus === 'approved' ? 'Validé' : 
                               validationStatus === 'rejected' ? 'Rejeté' : 'Inconnu'}
                    </Typography>
                  </Box>
                  
                  {ovId && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      ID OV: {ovId}
                    </Typography>
                  )}
                  
                  {canValidate && validationStatus === 'pending' && (
                    <Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Commentaire (optionnel)"
                        value={validationComment}
                        onChange={(e) => setValidationComment(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleValidation(true)}
                          disabled={processing}
                        >
                          Valider
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleValidation(false)}
                          disabled={processing}
                        >
                          Rejeter
                        </Button>
                      </Box>
                    </Box>
                  )}
                  
                  {!canValidate && (
                    <Alert severity="info">
                      Seuls les Responsables d'Équipe peuvent valider cet OV.
                    </Alert>
                  )}
                  
                  {validationStatus === 'approved' && (
                    <Alert severity="success">
                      OV validé avec succès! Vous pouvez maintenant générer les fichiers.
                    </Alert>
                  )}
                  
                  {validationStatus === 'rejected' && (
                    <Alert severity="error">
                      OV rejeté. Veuillez corriger les problèmes et recommencer.
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Generation section - always available */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Génération des Fichiers
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Vous pouvez générer les fichiers même sans validation (pour test ou urgence).
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setActiveStep(0)}>
                  Nouveau Traitement
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => onSwitchToTab?.(user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 4 : 3)}
                >
                  Voir le Suivi
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
        
        {/* Step 5: Files Generated */}
        {activeStep === 4 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Étape 5: Fichiers Générés
              </Typography>
              
              <Alert severity="success" sx={{ mb: 2 }}>
                Les fichiers ont été générés avec succès!
              </Alert>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setActiveStep(0)}>
                  Nouveau Traitement
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => onSwitchToTab?.(user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 4 : 3)}
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