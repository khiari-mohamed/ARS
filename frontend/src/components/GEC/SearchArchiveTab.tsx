import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, TextField, FormControl, InputLabel, 
  Select, MenuItem, Button, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Stack, Box
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';

const SearchArchiveTab: React.FC = () => {
  const [filters, setFilters] = useState({
    client: '',
    type: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
    keywords: ''
  });
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResults = [
        {
          id: '1',
          reference: 'OUT/2025/001',
          client: 'Client A',
          date: '2025-01-15',
          type: 'REGLEMENT',
          status: 'SENT',
          priority: 'NORMAL',
          subject: 'Courrier de règlement'
        },
        {
          id: '2',
          reference: 'IN/2025/001',
          client: 'Client B',
          date: '2025-01-14',
          type: 'RECLAMATION',
          status: 'RESPONDED',
          priority: 'URGENT',
          subject: 'Réclamation traitement dossier'
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
      priority: '',
      dateFrom: '',
      dateTo: '',
      keywords: ''
    });
    setResults([]);
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      'SENT': { label: 'Envoyé', color: 'info' },
      'RESPONDED': { label: 'Répondu', color: 'success' },
      'PENDING_RESPONSE': { label: 'En attente', color: 'warning' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const config = {
      'NORMAL': { label: 'Normal', color: 'default' },
      'URGENT': { label: 'Urgent', color: 'warning' },
      'CRITIQUE': { label: 'Critique', color: 'error' }
    };
    const { label, color } = config[priority as keyof typeof config];
    return <Chip label={label} color={color as any} size="small" />;
  };

  return (
    <Box>
      {/* Search Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recherche & Archive</Typography>
        
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
                <MenuItem value="REGLEMENT">Règlement</MenuItem>
                <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                <MenuItem value="RELANCE">Relance</MenuItem>
                <MenuItem value="AUTRE">Autre</MenuItem>
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
                <MenuItem value="SENT">Envoyé</MenuItem>
                <MenuItem value="PENDING_RESPONSE">En attente</MenuItem>
                <MenuItem value="RESPONDED">Répondu</MenuItem>
                <MenuItem value="CLOSED">Clôturé</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priorité</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                label="Priorité"
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
                <MenuItem value="CRITIQUE">Critique</MenuItem>
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
          
          <Grid item xs={12}>
            <TextField
              label="Mots-clés"
              value={filters.keywords}
              onChange={(e) => setFilters({...filters, keywords: e.target.value})}
              fullWidth
              size="small"
              placeholder="Rechercher dans le sujet et le contenu..."
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
            Résultats ({results.length})
          </Typography>
          
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Priorité</TableCell>
                <TableCell>Sujet</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{getPriorityChip(item.priority)}</TableCell>
                  <TableCell>{item.subject}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<VisibilityIcon />}>
                        Ouvrir
                      </Button>
                      <Button size="small" startIcon={<DownloadIcon />}>
                        Télécharger
                      </Button>
                      <Button size="small" startIcon={<FolderIcon />}>
                        Voir dans GED
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
          <Typography variant="h6">Utilisez les filtres ci-dessus pour rechercher</Typography>
          <Typography variant="body2">
            Recherchez dans l'archive complète de correspondance
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SearchArchiveTab;