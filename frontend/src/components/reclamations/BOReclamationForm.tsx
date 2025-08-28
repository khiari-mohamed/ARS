import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
  Autocomplete,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Upload, Send, Preview, CheckCircle } from '@mui/icons-material';

interface BOReclamationDTO {
  clientId: string;
  type: 'reclamation';
  reference: string;
  description: string;
  severity: 'low' | 'medium' | 'critical';
  documentIds?: string[];
  bordereauId?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    preferredContact?: 'email' | 'phone' | 'mail';
  };
}

const fetchClients = async () => {
  const { data } = await LocalAPI.get('/clients');
  return data;
};

const fetchBordereaux = async (clientId?: string) => {
  const params = clientId ? { clientId } : {};
  const { data } = await LocalAPI.get('/bordereaux', { params });
  return data;
};

const validateReclamation = async (dto: BOReclamationDTO) => {
  const { data } = await LocalAPI.post('/reclamations/bo/validate', dto);
  return data;
};

const createReclamationFromBO = async (formData: FormData) => {
  const { data } = await LocalAPI.post('/reclamations/bo/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

const steps = ['Informations Client', 'Détails Réclamation', 'Documents', 'Validation'];

export const BOReclamationForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<BOReclamationDTO>({
    clientId: '',
    type: 'reclamation',
    reference: '',
    description: '',
    severity: 'medium',
    documentIds: [],
    contactInfo: {
      preferredContact: 'email'
    }
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [slaInfo, setSlaInfo] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery(['clients'], fetchClients);
  const { data: bordereaux = [] } = useQuery(
    ['bordereaux', formData.clientId],
    () => fetchBordereaux(formData.clientId),
    { enabled: !!formData.clientId }
  );

  const validateMutation = useMutation(validateReclamation);
  const createMutation = useMutation(createReclamationFromBO, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['reclamations']);
      queryClient.invalidateQueries(['bo-stats']);
      if (onSuccess) onSuccess();
      setActiveStep(0);
      setFormData({
        clientId: '',
        type: 'reclamation',
        reference: '',
        description: '',
        severity: 'medium',
        documentIds: [],
        contactInfo: { preferredContact: 'email' }
      });
      setFiles([]);
    }
  });

  // Auto-generate reference
  useEffect(() => {
    if (!formData.reference) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      setFormData(prev => ({
        ...prev,
        reference: `REC-${timestamp}-${random}`
      }));
    }
  }, []);

  // Get client SLA info
  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find((c: any) => c.id === formData.clientId);
      if (client) {
        setSlaInfo({
          name: client.name,
          reclamationDelay: client.reclamationDelay || 7,
          email: client.email,
          phone: client.phone
        });
        
        // Auto-fill contact info
        setFormData(prev => ({
          ...prev,
          contactInfo: {
            ...prev.contactInfo,
            email: client.email,
            phone: client.phone
          }
        }));
      }
    }
  }, [formData.clientId, clients]);

  const handleNext = async () => {
    if (activeStep === steps.length - 2) {
      // Validate before final step
      try {
        const result = await validateMutation.mutateAsync(formData);
        setValidationResult(result);
        if (!result.valid) {
          setErrors(result.errors);
          return;
        }
      } catch (error) {
        setErrors(['Erreur de validation']);
        return;
      }
    }
    
    setErrors([]);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const submitFormData = new FormData();
    
    // Add form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'contactInfo') {
        submitFormData.append(key, JSON.stringify(value));
      } else if (key === 'documentIds' && Array.isArray(value)) {
        value.forEach(id => submitFormData.append('documentIds[]', id));
      } else if (value !== undefined && value !== null) {
        submitFormData.append(key, value.toString());
      }
    });

    // Add files
    files.forEach(file => {
      submitFormData.append('files', file);
    });

    try {
      await createMutation.mutateAsync(submitFormData);
    } catch (error) {
      setErrors(['Erreur lors de la création de la réclamation']);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option: any) => option.name || ''}
                value={clients.find((c: any) => c.id === formData.clientId) || null}
                onChange={(_, value) => setFormData(prev => ({ ...prev, clientId: value?.id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} label="Client *" required />
                )}
              />
            </Grid>
            
            {slaInfo && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>SLA Client:</strong> {slaInfo.reclamationDelay} jours pour répondre aux réclamations
                  </Typography>
                  <Typography variant="body2">
                    <strong>Contact:</strong> {slaInfo.email} | {slaInfo.phone}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Référence *"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={bordereaux}
                getOptionLabel={(option: any) => option.reference || ''}
                value={bordereaux.find((b: any) => b.id === formData.bordereauId) || null}
                onChange={(_, value) => setFormData(prev => ({ ...prev, bordereauId: value?.id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} label="Bordereau lié (optionnel)" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email de contact"
                type="email"
                value={formData.contactInfo?.email || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, email: e.target.value }
                }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Téléphone de contact"
                value={formData.contactInfo?.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, phone: e.target.value }
                }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Contact préféré</InputLabel>
                <Select
                  value={formData.contactInfo?.preferredContact || 'email'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, preferredContact: e.target.value as any }
                  }))}
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="phone">Téléphone</MenuItem>
                  <MenuItem value="mail">Courrier</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Gravité</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                >
                  <MenuItem value="low">Normale</MenuItem>
                  <MenuItem value="medium">Urgente</MenuItem>
                  <MenuItem value="critical">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Description détaillée *"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                placeholder="Décrivez la réclamation en détail..."
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, border: '2px dashed #ccc' }}>
                <Box textAlign="center">
                  <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Joindre des documents
                  </Typography>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ marginBottom: 16 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Formats acceptés: PDF, Images, Documents Word
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {files.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Fichiers sélectionnés:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {files.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                      onDelete={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Récapitulatif de la réclamation
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography><strong>Client:</strong> {slaInfo?.name}</Typography>
              <Typography><strong>Référence:</strong> {formData.reference}</Typography>
              <Typography><strong>Gravité:</strong> {formData.severity}</Typography>
              <Typography><strong>SLA:</strong> {slaInfo?.reclamationDelay} jours</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography><strong>Contact préféré:</strong> {formData.contactInfo?.preferredContact}</Typography>
              <Typography><strong>Email:</strong> {formData.contactInfo?.email || '-'}</Typography>
              <Typography><strong>Téléphone:</strong> {formData.contactInfo?.phone || '-'}</Typography>
              <Typography><strong>Documents:</strong> {files.length} fichier(s)</Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography><strong>Description:</strong></Typography>
              <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                <Typography variant="body2">
                  {formData.description}
                </Typography>
              </Paper>
            </Grid>

            {validationResult && !validationResult.valid && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Erreurs de validation:</strong>
                  </Typography>
                  <ul>
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Nouvelle Réclamation - Bureau d'Ordre
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Précédent
            </Button>

            <Box display="flex" gap={2}>
              {activeStep === steps.length - 1 ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setPreviewOpen(true)}
                    startIcon={<Preview />}
                  >
                    Aperçu
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={createMutation.isLoading || (validationResult && !validationResult.valid)}
                    startIcon={<Send />}
                  >
                    {createMutation.isLoading ? 'Création...' : 'Créer la réclamation'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={validateMutation.isLoading}
                >
                  {activeStep === steps.length - 2 ? 'Valider' : 'Suivant'}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={createMutation.isSuccess} onClose={() => createMutation.reset()}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            Réclamation créée avec succès
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            La réclamation a été créée et les notifications ont été envoyées.
          </Typography>
          {createMutation.data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>ID:</strong> {createMutation.data.id}
              </Typography>
              <Typography variant="body2">
                <strong>Référence:</strong> {createMutation.data.reference}
              </Typography>
              <Typography variant="body2">
                <strong>Échéance SLA:</strong> {new Date(createMutation.data.slaDeadline).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => createMutation.reset()}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default BOReclamationForm;