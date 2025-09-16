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
  StepLabel
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

const startManualScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/scan/manual/start/${bordereauId}`);
  return data;
};

const uploadDocuments = async (bordereauId: string, files: File[], notes?: string) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  if (notes) formData.append('notes', notes);
  
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
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: scanQueue = [], isLoading, refetch } = useQuery(
    ['scan-queue'],
    fetchScanQueue,
    { refetchInterval: 30000 }
  );

  const startScanMutation = useMutation(startManualScan, {
    onSuccess: () => {
      setScanStep('upload');
      queryClient.invalidateQueries(['scan-queue']);
    }
  });

  const uploadMutation = useMutation(
    ({ bordereauId, files, notes }: { bordereauId: string; files: File[]; notes?: string }) =>
      uploadDocuments(bordereauId, files, notes),
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
    setUploadedFiles(prev => [...prev, ...files]);
  };

  // Simple file input handler (replacing dropzone temporarily)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFileUpload(files);
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
      uploadMutation.mutate({
        bordereauId: selectedBordereau.id,
        files: uploadedFiles,
        notes
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
                Formats acceptés: PDF, JPEG, PNG, TIFF (max 10MB par fichier)
              </Typography>
            </Box>

            {uploadedFiles.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Fichiers sélectionnés ({uploadedFiles.length})
                </Typography>
                <List dense>
                  {uploadedFiles.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      />
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
          {selectedBordereau ? renderScanProcess() : renderScanQueue()}
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