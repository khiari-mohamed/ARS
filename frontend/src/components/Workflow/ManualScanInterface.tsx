import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Scanner, 
  Upload, 
  CheckCircle, 
  Cancel, 
  Description,
  Warning,
  Info
} from '@mui/icons-material';
// import { useDropzone } from 'react-dropzone';

interface ScanQueueItem {
  id: string;
  reference: string;
  clientName: string;
  dateReception: string;
  nombreBS: number;
  delaiReglement: number;
  documentsCount: number;
  canScan: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const fetchScanQueue = async (): Promise<ScanQueueItem[]> => {
  const { data } = await LocalAPI.get('/scan/manual/queue');
  return data;
};

const fetchCompletedScans = async () => {
  const { data } = await LocalAPI.get('/bordereaux', {
    params: {
      statut: 'SCANNE,A_AFFECTER',
      limit: 50,
      orderBy: 'dateFinScan',
      order: 'desc'
    }
  });
  return data;
};

const startManualScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/scan/manual/start/${bordereauId}`);
  return data;
};

const uploadDocuments = async (bordereauId: string, files: File[], notes?: string, fileTypes?: Record<number, string>) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  if (notes) formData.append('notes', notes);
  if (fileTypes) {
    Object.values(fileTypes).forEach(type => formData.append('fileTypes', type));
  }
  
  const { data } = await LocalAPI.post(`/scan/manual/upload/${bordereauId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

const validateScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.put(`/scan/manual/validate/${bordereauId}`);
  return data;
};

const cancelScan = async (bordereauId: string, reason: string) => {
  const { data } = await LocalAPI.put(`/scan/manual/cancel/${bordereauId}`, { reason });
  return data;
};

export const ManualScanInterface: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedBordereau, setSelectedBordereau] = useState<ScanQueueItem | null>(null);
  const [scanStep, setScanStep] = useState<'select' | 'upload' | 'validate'>('select');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<Record<number, string>>({});
  const [bulkType, setBulkType] = useState<string>('BULLETIN_SOIN');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: scanQueue = [], isLoading, refetch } = useQuery(
    ['scan-queue'],
    fetchScanQueue,
    { refetchInterval: 30000 }
  );

  const { data: completedScans = [] } = useQuery(
    ['completed-scans'],
    fetchCompletedScans,
    { refetchInterval: 60000 }
  );

  const startScanMutation = useMutation(startManualScan, {
    onSuccess: () => {
      setScanStep('upload');
      queryClient.invalidateQueries(['scan-queue']);
    }
  });

  const uploadMutation = useMutation(
    ({ bordereauId, files, notes, fileTypes }: { bordereauId: string; files: File[]; notes?: string; fileTypes?: Record<number, string> }) =>
      uploadDocuments(bordereauId, files, notes, fileTypes),
    {
      onSuccess: () => {
        setScanStep('validate');
        setUploadedFiles([]);
      }
    }
  );

  const validateMutation = useMutation(validateScan, {
    onSuccess: () => {
      setSelectedBordereau(null);
      setScanStep('select');
      setNotes('');
      queryClient.invalidateQueries(['scan-queue']);
    }
  });

  const cancelMutation = useMutation(
    ({ bordereauId, reason }: { bordereauId: string; reason: string }) =>
      cancelScan(bordereauId, reason),
    {
      onSuccess: () => {
        setSelectedBordereau(null);
        setScanStep('select');
        setShowCancelDialog(false);
        setCancelReason('');
        queryClient.invalidateQueries(['scan-queue']);
      }
    }
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const handleFileUpload = (files: File[]) => {
    const startIndex = uploadedFiles.length;
    setUploadedFiles(prev => [...prev, ...files]);
    
    // Initialize with bulk type for new files
    const newTypes: Record<number, string> = {};
    files.forEach((_, index) => {
      newTypes[startIndex + index] = bulkType;
    });
    setFileTypes(prev => ({ ...prev, ...newTypes }));
  };

  // Simple file input handler (replacing dropzone temporarily)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFileUpload(files);
  };

  const applyBulkType = () => {
    const newTypes: Record<number, string> = {};
    uploadedFiles.forEach((_, index) => {
      newTypes[index] = bulkType;
    });
    setFileTypes(newTypes);
  };

  const getRootProps = () => ({
    onClick: () => document.getElementById('file-input')?.click()
  });
  const getInputProps = () => ({ style: { display: 'none' } });
  const isDragActive = false;

  const handleStartScan = (bordereau: ScanQueueItem) => {
    setSelectedBordereau(bordereau);
    startScanMutation.mutate(bordereau.id);
  };

  const handleUpload = () => {
    if (selectedBordereau && uploadedFiles.length > 0) {
      // Validate all files have types
      const missingTypes = uploadedFiles.some((_, index) => !fileTypes[index]);
      if (missingTypes) {
        alert('⚠️ Veuillez sélectionner un type pour tous les documents');
        return;
      }
      
      uploadMutation.mutate({
        bordereauId: selectedBordereau.id,
        files: uploadedFiles,
        notes,
        fileTypes
      });
    }
  };

  const handleValidate = () => {
    if (selectedBordereau) {
      validateMutation.mutate(selectedBordereau.id);
    }
  };

  const handleCancel = () => {
    if (selectedBordereau && cancelReason) {
      cancelMutation.mutate({
        bordereauId: selectedBordereau.id,
        reason: cancelReason
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      default: return 'success';
    }
  };

  const renderScanQueue = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Queue de Numérisation</Typography>
          <Button variant="outlined" onClick={() => refetch()}>
            Actualiser
          </Button>
        </Box>

        {scanQueue.length === 0 ? (
          <Alert severity="info">
            Aucun bordereau en attente de numérisation
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Date Réception</TableCell>
                  <TableCell>Nombre BS</TableCell>
                  <TableCell>Priorité</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanQueue.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.reference}</TableCell>
                    <TableCell>{item.clientName}</TableCell>
                    <TableCell>
                      {new Date(item.dateReception).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{item.nombreBS}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.priority}
                        color={getPriorityColor(item.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        startIcon={<Scanner />}
                        onClick={() => handleStartScan(item)}
                        disabled={!item.canScan || startScanMutation.isLoading}
                        size="small"
                      >
                        Numériser
                      </Button> 
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderScanProcess = () => (
    <Card>
      <CardContent>
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Numérisation Manuelle - {selectedBordereau?.reference}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Client: {selectedBordereau?.clientName}
          </Typography>
        </Box>

        <Stepper activeStep={scanStep === 'select' ? 0 : scanStep === 'upload' ? 1 : 2} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Sélection</StepLabel>
          </Step>
          <Step>
            <StepLabel>Upload Documents</StepLabel>
          </Step>
          <Step>
            <StepLabel>Validation</StepLabel>
          </Step>
        </Stepper>

        {scanStep === 'upload' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload des Documents
            </Typography>
            
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? '#f5f5f5' : 'transparent',
                mb: 2
              }}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                onChange={handleFileSelect}
                {...getInputProps()}
              />
              <Upload sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography variant="body1">
                Cliquez pour sélectionner des fichiers
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Formats acceptés: PDF, JPEG, PNG, TIFF (max 5GB par fichier, 1000 fichiers max)
              </Typography>
            </Box>

            {uploadedFiles.length > 0 && (
              <Box mb={2}>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    🎯 Sélection en Masse (Bulk)
                  </Typography>
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 250 }}>
                      <InputLabel>Type pour tous les documents</InputLabel>
                      <Select
                        value={bulkType}
                        onChange={(e) => setBulkType(e.target.value)}
                        label="Type pour tous les documents"
                      >
                        <MenuItem value="BULLETIN_SOIN">🏥 Bulletin de Soins</MenuItem>
                        <MenuItem value="COMPLEMENT_INFORMATION">📋 Complément Info</MenuItem>
                        <MenuItem value="ADHESION">👥 Adhésion</MenuItem>
                        <MenuItem value="RECLAMATION">⚠️ Réclamation</MenuItem>
                        <MenuItem value="CONTRAT_AVENANT">📄 Contrat/Avenant</MenuItem>
                        <MenuItem value="DEMANDE_RESILIATION">❌ Demande Résiliation</MenuItem>
                        <MenuItem value="CONVENTION_TIERS_PAYANT">🤝 Convention Tiers</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={applyBulkType}
                      sx={{ minWidth: 180 }}
                    >
                      Appliquer à tous ({uploadedFiles.length})
                    </Button>
                  </Box>
                  <Alert severity="info" sx={{ mt: 1, fontSize: '0.85rem' }}>
                    💡 Sélectionnez un type et cliquez sur "Appliquer à tous" pour définir le même type pour tous les documents. Vous pouvez ensuite modifier individuellement.
                  </Alert>
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  Fichiers sélectionnés ({uploadedFiles.length})
                </Typography>
                <List dense>
                  {uploadedFiles.map((file, index) => (
                    <ListItem key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1, bgcolor: '#fafafa' }}>
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        sx={{ flex: '0 0 40%' }}
                      />
                      <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={fileTypes[index] || ''}
                          onChange={(e) => setFileTypes(prev => ({ ...prev, [index]: e.target.value }))}
                          label="Type"
                        >
                          <MenuItem value="BULLETIN_SOIN">🏥 Bulletin de Soins</MenuItem>
                          <MenuItem value="COMPLEMENT_INFORMATION">📋 Complément Info</MenuItem>
                          <MenuItem value="ADHESION">👥 Adhésion</MenuItem>
                          <MenuItem value="RECLAMATION">⚠️ Réclamation</MenuItem>
                          <MenuItem value="CONTRAT_AVENANT">📄 Contrat/Avenant</MenuItem>
                          <MenuItem value="DEMANDE_RESILIATION">❌ Demande Résiliation</MenuItem>
                          <MenuItem value="CONVENTION_TIERS_PAYANT">🤝 Convention Tiers</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeFile(index)}
                      >
                        Supprimer
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Upload />}
                onClick={handleUpload}
                disabled={uploadedFiles.length === 0 || uploadMutation.isLoading}
              >
                {uploadMutation.isLoading ? 'Upload en cours...' : 'Upload Documents'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
              >
                Annuler
              </Button>
            </Box>
          </Box>
        )}

        {scanStep === 'validate' && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Validation de la Numérisation
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1">
                Documents uploadés avec succès! Vous pouvez maintenant valider la numérisation.
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                En validant, le bordereau sera marqué comme "Scanné" et automatiquement 
                envoyé au chef d'équipe pour affectation.
              </Typography>
            </Alert>

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleValidate}
                disabled={validateMutation.isLoading}
                color="success"
              >
                {validateMutation.isLoading ? 'Validation...' : 'Valider la Numérisation'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
              >
                Annuler
              </Button>
            </Box>
          </Box>
        )}

        {(uploadMutation.isLoading || validateMutation.isLoading) && (
          <LinearProgress sx={{ mt: 2 }} />
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement de la queue de numérisation...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Numérisation Manuelle
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {selectedBordereau ? renderScanProcess() : (
            <Box>
              {renderScanQueue()}
              <Box mt={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Scans Terminés Récents
                    </Typography>
                    
                    {completedScans.length === 0 ? (
                      <Alert severity="info">
                        Aucun scan terminé récemment
                      </Alert>
                    ) : (
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Référence</TableCell>
                              <TableCell>Client</TableCell>
                              <TableCell>Date Scan</TableCell>
                              <TableCell>Documents</TableCell>
                              <TableCell>Statut</TableCell>
                              <TableCell>Assigné à</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {completedScans.map((item: any) => (
                              <TableRow key={item.id} hover>
                                <TableCell>{item.reference}</TableCell>
                                <TableCell>{item.client?.name}</TableCell>
                                <TableCell>
                                  {item.dateFinScan ? new Date(item.dateFinScan).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${item.documents?.length || 0} docs`}
                                    size="small"
                                    color="success"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.statut}
                                    color={item.statut === 'SCANNE' ? 'success' : 'info'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {item.currentHandler?.fullName || item.client?.gestionnaires?.find((g: any) => g.role === 'CHEF_EQUIPE')?.fullName || 'Non assigné'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Annuler la Numérisation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Raison de l'annulation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            Fermer
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            disabled={!cancelReason || cancelMutation.isLoading}
          >
            Confirmer l'Annulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManualScanInterface;