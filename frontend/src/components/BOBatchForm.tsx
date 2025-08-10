import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import { Add, Delete, AutoAwesome, Upload } from '@mui/icons-material';
import { fetchClients } from '../services/clientService';
import { createBOBatch, generateReference } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BatchEntry {
  id: string;
  reference: string;
  clientId: string;
  contractId: string;
  documentType: string;
  nombreDocuments: number;
  delaiReglement: number;
  dateReception: string;
}

const documentTypes = [
  { value: 'BS', label: 'Bulletin de Soin' },
  { value: 'CONTRAT', label: 'Contrat' },
  { value: 'RECLAMATION', label: 'Réclamation' },
  { value: 'FACTURE', label: 'Facture' },
  { value: 'AUTRE', label: 'Autre' }
];

const BOBatchForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadClients();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEntries([createEmptyEntry()]);
    setError(null);
    setResults(null);
  };

  const createEmptyEntry = (): BatchEntry => ({
    id: Date.now().toString() + Math.random(),
    reference: '',
    clientId: '',
    contractId: '',
    documentType: 'BS',
    nombreDocuments: 1,
    delaiReglement: 30,
    dateReception: new Date().toISOString().split('T')[0]
  });

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const addEntry = () => {
    setEntries(prev => [...prev, createEmptyEntry()]);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof BatchEntry, value: any) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const generateAllReferences = async () => {
    const updatedEntries = await Promise.all(
      entries.map(async (entry) => {
        if (!entry.reference && entry.documentType && entry.clientId) {
          try {
            const { reference } = await generateReference(entry.documentType, entry.clientId);
            return { ...entry, reference };
          } catch (error) {
            console.error('Failed to generate reference for entry:', error);
            return entry;
          }
        }
        return entry;
      })
    );
    setEntries(updatedEntries);
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validate entries
    const invalidEntries = entries.filter(entry => 
      !entry.reference || !entry.clientId || !entry.documentType || !entry.nombreDocuments
    );
    
    if (invalidEntries.length > 0) {
      setError(`${invalidEntries.length} entrée(s) ont des champs manquants`);
      return;
    }

    setLoading(true);
    try {
      const result = await createBOBatch(entries.map(entry => ({
        reference: entry.reference,
        clientId: entry.clientId,
        contractId: entry.contractId || undefined,
        documentType: entry.documentType,
        nombreDocuments: entry.nombreDocuments,
        delaiReglement: entry.delaiReglement,
        dateReception: entry.dateReception,
        startTime: Date.now()
      })));
      
      setResults(result);
      
      if (result.errorCount === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création du lot');
    } finally {
      setLoading(false);
    }
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importedEntries = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const entry = createEmptyEntry();
        
        headers.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case 'reference':
              entry.reference = value;
              break;
            case 'client':
            case 'clientid':
              const client = clients.find(c => c.name === value || c.id === value);
              if (client) entry.clientId = client.id;
              break;
            case 'type':
            case 'documenttype':
              entry.documentType = value;
              break;
            case 'nombre':
            case 'nombredocuments':
              entry.nombreDocuments = parseInt(value) || 1;
              break;
            case 'delai':
            case 'delaireglement':
              entry.delaiReglement = parseInt(value) || 30;
              break;
            case 'date':
            case 'datereception':
              entry.dateReception = value;
              break;
          }
        });
        
        return entry;
      });
      
      setEntries(importedEntries);
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Entrée Lot BO</Typography>
          <Box display="flex" gap={1}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-upload"
              type="file"
              onChange={importFromCSV}
            />
            <label htmlFor="csv-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Upload />}
                size="small"
              >
                Import CSV
              </Button>
            </label>
            <Button
              variant="outlined"
              onClick={generateAllReferences}
              startIcon={<AutoAwesome />}
              size="small"
            >
              Générer Refs
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results && (
          <Alert 
            severity={results.errorCount === 0 ? 'success' : 'warning'} 
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2">
              Résultats: {results.successCount} succès, {results.errorCount} erreurs
            </Typography>
            {results.errors.length > 0 && (
              <Box mt={1}>
                {results.errors.slice(0, 3).map((error: any, index: number) => (
                  <Typography key={index} variant="caption" display="block">
                    Ligne {error.index + 1}: {error.error}
                  </Typography>
                ))}
                {results.errors.length > 3 && (
                  <Typography variant="caption">
                    ... et {results.errors.length - 3} autres erreurs
                  </Typography>
                )}
              </Box>
            )}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Référence *</TableCell>
                <TableCell>Client *</TableCell>
                <TableCell>Type *</TableCell>
                <TableCell>Nb Docs *</TableCell>
                <TableCell>Délai</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={entry.reference}
                      onChange={(e) => updateEntry(entry.id, 'reference', e.target.value)}
                      placeholder="REF-001"
                      sx={{ minWidth: 120 }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={entry.clientId}
                        onChange={(e) => updateEntry(entry.id, 'clientId', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Sélectionner</MenuItem>
                        {clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={entry.documentType}
                        onChange={(e) => updateEntry(entry.id, 'documentType', e.target.value)}
                      >
                        {documentTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={entry.nombreDocuments}
                      onChange={(e) => updateEntry(entry.id, 'nombreDocuments', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={entry.delaiReglement}
                      onChange={(e) => updateEntry(entry.id, 'delaiReglement', parseInt(e.target.value) || 30)}
                      inputProps={{ min: 1 }}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="date"
                      value={entry.dateReception}
                      onChange={(e) => updateEntry(entry.id, 'dateReception', e.target.value)}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length === 1}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addEntry}
          >
            Ajouter Ligne
          </Button>
          <Typography variant="body2" color="text.secondary">
            {entries.length} entrée(s)
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || entries.length === 0}
        >
          {loading ? 'Traitement...' : `Créer ${entries.length} Entrée(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BOBatchForm;