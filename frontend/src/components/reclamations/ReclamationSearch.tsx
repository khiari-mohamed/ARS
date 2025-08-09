import React, { useState } from 'react';
import { 
  Paper, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Chip, 
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ReclamationStatus, ReclamationSeverity } from '../../types/reclamation.d';

interface SearchFilters {
  clientId?: string;
  status?: ReclamationStatus;
  severity?: ReclamationSeverity;
  type?: string;
  assignedToId?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  keyword?: string;
}

const fetchClients = async () => {
  const { data } = await LocalAPI.get('/clients');
  return data;
};

const fetchUsers = async () => {
  const { data } = await LocalAPI.get('/users');
  return data;
};

const searchReclamations = async (filters: SearchFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  const { data } = await LocalAPI.get(`/reclamations/search?${params}`);
  return data;
};

const ReclamationSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: clients = [] } = useQuery(['clients'], fetchClients);
  const { data: users = [] } = useQuery(['users'], fetchUsers);

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchReclamations(filters);
      setResults(data);
      setPage(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setResults([]);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="space-y-6">
        {/* Search Filters */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recherche avancée
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} filtre(s) actif(s)`} 
                size="small" 
                color="primary" 
                sx={{ ml: 2 }} 
              />
            )}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option: any) => option.name || ''}
                value={clients.find((c: any) => c.id === filters.clientId) || null}
                onChange={(_, value) => handleFilterChange('clientId', value?.id || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Client" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="OPEN">Ouverte</MenuItem>
                  <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                  <MenuItem value="ESCALATED">Escaladée</MenuItem>
                  <MenuItem value="PENDING_CLIENT_REPLY">Attente client</MenuItem>
                  <MenuItem value="RESOLVED">Résolue</MenuItem>
                  <MenuItem value="CLOSED">Fermée</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <MenuItem value="">Toutes</MenuItem>
                  <MenuItem value="low">Normale</MenuItem>
                  <MenuItem value="medium">Urgente</MenuItem>
                  <MenuItem value="critical">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="retard">Retard</MenuItem>
                  <MenuItem value="document manquant">Document manquant</MenuItem>
                  <MenuItem value="erreur traitement">Erreur traitement</MenuItem>
                  <MenuItem value="qualité service">Qualité service</MenuItem>
                  <MenuItem value="facturation">Facturation</MenuItem>
                  <MenuItem value="autre">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={users}
                getOptionLabel={(option: any) => option.fullName || ''}
                value={users.find((u: any) => u.id === filters.assignedToId) || null}
                onChange={(_, value) => handleFilterChange('assignedToId', value?.id || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Assigné à" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date de début"
                value={filters.dateFrom}
                onChange={(date) => handleFilterChange('dateFrom', date)}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date de fin"
                value={filters.dateTo}
                onChange={(date) => handleFilterChange('dateTo', date)}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Mot-clé dans la description"
                fullWidth
                value={filters.keyword || ''}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                placeholder="Rechercher dans les descriptions..."
              />
            </Grid>
          </Grid>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="contained" 
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleClearFilters}
            >
              Effacer les filtres
            </Button>
          </div>
        </Paper>

        {/* Search Results */}
        {results.length > 0 && (
          <Paper>
            <Typography variant="h6" sx={{ p: 2 }}>
              Résultats de recherche ({results.length} réclamation(s))
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priorité</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Assigné à</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.id}</TableCell>
                      <TableCell>{rec.client?.name || rec.clientId}</TableCell>
                      <TableCell>{rec.type}</TableCell>
                      <TableCell>
                        <PriorityBadge severity={rec.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rec.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {rec.assignedTo?.fullName || '-'}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={results.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              labelRowsPerPage="Lignes par page:"
            />
          </Paper>
        )}
      </div>
    </LocalizationProvider>
  );
};

export default ReclamationSearch;