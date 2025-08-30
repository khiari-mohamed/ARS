import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Accordion, AccordionSummary,
  AccordionDetails, Card, CardContent
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Scanner as ScannerIcon,
  QrCode as BarcodeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { paperStreamService } from '../../services/paperStreamService';
import { Document } from '../../types/document';

interface SearchFilters {
  keywords?: string;
  batchId?: string;
  operatorId?: string;
  scannerModel?: string;
  ingestStatus?: string;
  barcodeValue?: string;
  dateFrom?: string;
  dateTo?: string;
}

const PaperStreamDocumentSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await paperStreamService.searchDocuments(filters);
      setResults(data);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setResults([]);
    setSearchPerformed(false);
  };

  const getIngestStatusChip = (status?: string) => {
    if (!status) return <Chip label="N/A" size="small" />;
    
    const config = {
      'PENDING': { label: 'En attente', color: 'warning' },
      'INGESTED': { label: 'Ingéré', color: 'success' },
      'ERROR': { label: 'Erreur', color: 'error' },
      'QUARANTINED': { label: 'Quarantaine', color: 'error' }
    };
    const { label, color } = config[status as keyof typeof config] || { label: status, color: 'default' };
    return <Chip label={label} color={color as any} size="small" />;
  };

  const renderPaperStreamMetadata = (doc: Document) => (
    <Box sx={{ mt: 1 }}>
      <Grid container spacing={1}>
        {doc.batchId && (
          <Grid item>
            <Chip 
              icon={<ScannerIcon />} 
              label={`Lot: ${doc.batchId}`} 
              size="small" 
              variant="outlined" 
            />
          </Grid>
        )}
        {doc.operatorId && (
          <Grid item>
            <Chip 
              icon={<PersonIcon />} 
              label={`Op: ${doc.operatorId}`} 
              size="small" 
              variant="outlined" 
            />
          </Grid>
        )}
        {doc.barcodeValues && doc.barcodeValues.length > 0 && (
          <Grid item>
            <Chip 
              icon={<BarcodeIcon />} 
              label={`Codes: ${doc.barcodeValues.join(', ')}`} 
              size="small" 
              variant="outlined" 
            />
          </Grid>
        )}
        {doc.pageCount && (
          <Grid item>
            <Chip 
              label={`${doc.pageCount} pages`} 
              size="small" 
              variant="outlined" 
            />
          </Grid>
        )}
        {doc.scannerModel && (
          <Grid item>
            <Chip 
              label={doc.scannerModel} 
              size="small" 
              variant="outlined" 
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Recherche Documents PaperStream
      </Typography>

      {/* Search Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtres de Recherche
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Mots-clés"
              value={filters.keywords || ''}
              onChange={(e) => handleFilterChange('keywords', e.target.value)}
              placeholder="Rechercher dans le nom, type, contenu OCR..."
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ID Lot (Batch)"
              value={filters.batchId || ''}
              onChange={(e) => handleFilterChange('batchId', e.target.value)}
              placeholder="BATCH_001"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Opérateur"
              value={filters.operatorId || ''}
              onChange={(e) => handleFilterChange('operatorId', e.target.value)}
              placeholder="OP001"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Scanner</InputLabel>
              <Select
                value={filters.scannerModel || ''}
                onChange={(e) => handleFilterChange('scannerModel', e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="fi-7600">fi-7600</MenuItem>
                <MenuItem value="fi-8000">fi-8000</MenuItem>
                <MenuItem value="fi-8170">fi-8170</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Statut Ingestion</InputLabel>
              <Select
                value={filters.ingestStatus || ''}
                onChange={(e) => handleFilterChange('ingestStatus', e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="PENDING">En attente</MenuItem>
                <MenuItem value="INGESTED">Ingéré</MenuItem>
                <MenuItem value="ERROR">Erreur</MenuItem>
                <MenuItem value="QUARANTINED">Quarantaine</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Valeur Code-barres"
              value={filters.barcodeValue || ''}
              onChange={(e) => handleFilterChange('barcodeValue', e.target.value)}
              placeholder="BORD-2025-001"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date début"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date fin"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </Button>
          <Button
            variant="outlined"
            onClick={clearFilters}
          >
            Effacer
          </Button>
        </Box>
      </Paper>

      {/* Search Results */}
      {searchPerformed && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Résultats ({results.length} documents)
          </Typography>

          {results.length === 0 ? (
            <Typography color="textSecondary">
              Aucun document trouvé avec ces critères.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Bordereau</TableCell>
                  <TableCell>Statut Ingestion</TableCell>
                  <TableCell>Date Upload</TableCell>
                  <TableCell>Métadonnées PaperStream</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {doc.name}
                      </Typography>
                      {doc.ocrText && (
                        <Typography variant="caption" color="textSecondary">
                          {doc.ocrText.substring(0, 100)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.type} size="small" />
                    </TableCell>
                    <TableCell>
                      {doc.bordereau?.reference || '-'}
                    </TableCell>
                    <TableCell>
                      {getIngestStatusChip(doc.ingestStatus)}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {renderPaperStreamMetadata(doc)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default PaperStreamDocumentSearch;