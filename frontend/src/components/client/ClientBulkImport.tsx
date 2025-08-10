import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import { Upload, CheckCircle, Error, Warning } from '@mui/icons-material';
import { bulkImportClients } from '../../services/clientService';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const steps = ['Upload File', 'Validate Data', 'Import Results'];

const ClientBulkImport: React.FC<Props> = ({ open, onClose, onImportComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setActiveStep(1);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const results = await bulkImportClients(file, true);
      setValidationResults(results);
      setActiveStep(2);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const results = await bulkImportClients(file, false);
      setResults(results);
      if (results.success.length > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setResults(null);
    setValidationResults(null);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = 'name,reglementDelay,reclamationDelay,gestionnaireIds\n' +
                      'Example Client,30,15,manager1;manager2\n' +
                      'Another Client,45,20,manager3';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Upload />
          Bulk Import Clients
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Step 1: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a CSV file with client data. Make sure to follow the template format.
            </Alert>
            
            <Box display="flex" gap={2} mb={3}>
              <Button variant="outlined" onClick={downloadTemplate}>
                Download Template
              </Button>
            </Box>

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
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Click to upload CSV file
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported format: CSV files only
              </Typography>
            </Box>

            {file && (
              <Box mt={2}>
                <Typography variant="body2">
                  Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Step 2: Validation */}
        {activeStep === 1 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Validate your data before importing. This will check for errors without making changes.
            </Alert>
            
            {file && (
              <Box mb={2}>
                <Typography variant="body2">
                  File: <strong>{file.name}</strong>
                </Typography>
              </Box>
            )}

            {validationResults && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Validation Results
                </Typography>
                
                <Box display="flex" gap={2} mb={2}>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${validationResults.success.length} Valid`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Error />}
                    label={`${validationResults.errors.length} Errors`}
                    color="error"
                    variant="outlined"
                  />
                  <Chip
                    label={`${validationResults.total} Total`}
                    variant="outlined"
                  />
                </Box>

                {validationResults.errors.length > 0 && (
                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Line</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResults.errors.map((error: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{error.line}</TableCell>
                            <TableCell>{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 3: Import Results */}
        {activeStep === 2 && results && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Import Complete
            </Typography>
            
            <Box display="flex" gap={2} mb={3}>
              <Chip
                icon={<CheckCircle />}
                label={`${results.success.length} Imported`}
                color="success"
              />
              <Chip
                icon={<Error />}
                label={`${results.errors.length} Failed`}
                color="error"
              />
            </Box>

            {results.success.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully imported {results.success.length} clients.
              </Alert>
            )}

            {results.errors.length > 0 && (
              <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {results.errors.length} clients failed to import.
                </Alert>
                
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Line</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.errors.map((error: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{error.line}</TableCell>
                          <TableCell>{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {results ? 'Close' : 'Cancel'}
        </Button>
        
        {activeStep === 1 && !validationResults && (
          <Button
            variant="contained"
            onClick={handleValidate}
            disabled={!file || loading}
          >
            Validate Data
          </Button>
        )}
        
        {activeStep === 1 && validationResults && validationResults.errors.length === 0 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={loading}
          >
            Import Clients
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ClientBulkImport;