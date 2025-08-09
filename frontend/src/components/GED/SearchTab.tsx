import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, TextField, FormControl, InputLabel, 
  Select, MenuItem, Button, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Stack, Box
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';

const SearchTab: React.FC = () => {
  const [filters, setFilters] = useState({
    client: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    assignedUser: '',
    ocrText: ''
  });
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      // Mock search results
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResults = [
        {
          id: '1',
          reference: 'DOC/2025/001',
          client: 'Client A',
          type: 'BS',
          status: 'TRAITE',
          assignedTo: 'Gestionnaire 1',
          slaStatus: 'green',
          uploadedAt: '2025-01-15'
        },
        {
          id: '2',
          reference: 'DOC/2025/002',
          client: 'Client B',
          type: 'CONTRAT',
          status: 'EN_COURS',
          assignedTo: 'Gestionnaire 2',
          slaStatus: 'orange',
          uploadedAt: '2025-01-14'
        }
      ];
      
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      client: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      assignedUser: '',
      ocrText: ''
    });
    setResults([]);
  };

  const getSLAChip = (slaStatus: string) => {
    const config = {
      'green': { label: '🟢 À temps', color: 'success' },
      'orange': { label: '🟠 À risque', color: 'warning' },
      'red': { label: '🔴 En retard', color: 'error' }
    };
    const { label, color } = config[slaStatus as keyof typeof config];
    return <Chip label={label} color={color as any} size="small" />;
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'TRAITE': { label: 'Traité', color: 'success' },
      'EN_COURS': { label: 'En cours', color: 'primary' },
      'NON_AFFECTE': { label: 'Non affecté', color: 'default' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  return (
    <Box>
      {/* Search Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtres de Recherche</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Client"
              value={filters.client}
              onChange={(e) => setFilters({...filters, client: e.target.value})}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                label="Type"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="BS">BS</MenuItem>
                <MenuItem value="CONTRAT">Contrat</MenuItem>
                <MenuItem value="COURRIER">Courrier</MenuItem>
                <MenuItem value="RECLAMATION">Réclamation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                label="Statut"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="ENREGISTRE">Enregistré</MenuItem>
                <MenuItem value="SCANNE">Scanné</MenuItem>
                <MenuItem value="EN_COURS">En cours</MenuItem>
                <MenuItem value="TRAITE">Traité</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Date début"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Date fin"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Utilisateur assigné"
              value={filters.assignedUser}
              onChange={(e) => setFilters({...filters, assignedUser: e.target.value})}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Recherche OCR (contenu du texte)"
              value={filters.ocrText}
              onChange={(e) => setFilters({...filters, ocrText: e.target.value})}
              fullWidth
              size="small"
              placeholder="Rechercher dans le contenu des documents..."
            />
          </Grid>
        </Grid>
        
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'Recherche...' : 'Rechercher'}
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {/* Search Results */}
      {results.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Résultats de recherche ({results.length})
          </Typography>
          
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>SLA</TableCell>
                <TableCell>Assigné à</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.reference}</TableCell>
                  <TableCell>{doc.client}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusChip(doc.status)}</TableCell>
                  <TableCell>{getSLAChip(doc.slaStatus)}</TableCell>
                  <TableCell>{doc.assignedTo || 'Non assigné'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<VisibilityIcon />}>
                        Voir
                      </Button>
                      <Button size="small" startIcon={<DownloadIcon />}>
                        Télécharger
                      </Button>
                      <Button size="small" startIcon={<HistoryIcon />}>
                        Historique
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {results.length === 0 && !searching && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <SearchIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">Utilisez les filtres ci-dessus pour rechercher des documents</Typography>
          <Typography variant="body2">
            Vous pouvez rechercher par client, type, statut, date ou contenu OCR
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SearchTab;