import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { CloudUpload, GetApp } from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ExcelImportModal: React.FC<Props> = ({ open, onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await LocalAPI.post('/reclamations/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResults(data.data);
      if (data.data.successful > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create Excel template
    const templateData = [
      ['clientName', 'type', 'severity', 'description', 'department', 'assignedTo'],
      ['Nom du client', 'Type réclamation', 'BASSE/MOYENNE/HAUTE', 'Description détaillée', 'RECLAMATIONS', 'Nom gestionnaire (optionnel)'],
      ['Exemple Assurance', 'REMBOURSEMENT', 'MOYENNE', 'Retard de remboursement', 'RECLAMATIONS', 'Jean Dupont']
    ];

    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_reclamations.csv';
    link.click();
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import Excel - Réclamations en Lot
        <Typography variant="body2" color="text.secondary">
          Importez plusieurs réclamations depuis un fichier Excel
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!results && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={downloadTemplate}
              sx={{ mb: 2 }}
            >
              Télécharger le modèle Excel
            </Button>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Format requis:</strong><br/>
                • clientName: Nom exact du client<br/>
                • type: Type de réclamation<br/>
                • severity: BASSE, MOYENNE, ou HAUTE<br/>
                • description: Description détaillée<br/>
                • department: Département (optionnel)<br/>
                • assignedTo: Nom du gestionnaire (optionnel)
              </Typography>
            </Alert>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!results && (
          <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 3, textAlign: 'center' }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUpload />}
                disabled={importing}
              >
                Sélectionner fichier Excel
              </Button>
            </label>
            
            {file && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Fichier sélectionné: {file.name}
              </Typography>
            )}
          </Box>
        )}

        {importing && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Import en cours...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {results && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={results.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              Import terminé: {results.successful} créées, {results.failed} échouées
            </Alert>

            {results.errors && results.errors.length > 0 && (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ligne</TableCell>
                      <TableCell>Erreur</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.errors.slice(0, 10).map((error: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={error.row} size="small" color="error" />
                        </TableCell>
                        <TableCell>{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {results.errors.length > 10 && (
                  <Typography variant="caption" sx={{ p: 1, display: 'block' }}>
                    ... et {results.errors.length - 10} autres erreurs
                  </Typography>
                )}
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {results ? 'Fermer' : 'Annuler'}
        </Button>
        {!results && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!file || importing}
          >
            {importing ? 'Import...' : 'Importer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExcelImportModal;