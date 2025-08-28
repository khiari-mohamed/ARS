import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Search, Clear } from '@mui/icons-material';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import SlaCountdown from './SlaCountdown';

interface SearchFilters {
  clientId?: string;
  status?: string;
  severity?: string;
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
  return data.filter((u: any) => u.role === 'GESTIONNAIRE' && u.active);
};

const searchReclamations = async (filters: SearchFilters) => {
  const params = {
    ...filters,
    dateFrom: filters.dateFrom?.toISOString(),
    dateTo: filters.dateTo?.toISOString()
  };
  const { data } = await LocalAPI.get('/reclamations/search', { params });
  return data;
};

const ReclamationSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: clients = [] } = useQuery(['clients'], fetchClients);
  const { data: users = [] } = useQuery(['users'], fetchUsers);

  const { data: results = [], isLoading, error } = useQuery(
    ['reclamation-search', filters],
    () => searchReclamations(filters),
    { enabled: searchTriggered }
  );

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleClear = () => {
    setFilters({});
    setSearchTriggered(false);
  };

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="reclamation-search p-4">
        <Typography variant="h4" gutterBottom>
          Recherche Avancée
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filtres de recherche
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

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="OPEN">Ouvert</MenuItem>
                    <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                    <MenuItem value="ESCALATED">Escaladé</MenuItem>
                    <MenuItem value="PENDING_CLIENT_REPLY">Attente client</MenuItem>
                    <MenuItem value="RESOLVED">Résolu</MenuItem>
                    <MenuItem value="CLOSED">Fermé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Gravité</InputLabel>
                  <Select
                    value={filters.severity || ''}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                  >
                    <MenuItem value="">Toutes</MenuItem>
                    <MenuItem value="low">Faible</MenuItem>
                    <MenuItem value="medium">Moyenne</MenuItem>
                    <MenuItem value="critical">Critique</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
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
                    <MenuItem value="autre">Autre</MenuItem>
                  </Select>
                </FormControl>
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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mot-clé dans la description"
                  value={filters.keyword || ''}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  placeholder="Rechercher dans les descriptions..."
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? 'Recherche...' : 'Rechercher'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClear}
              >
                Effacer
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Results */}
        {searchTriggered && (
          <Card>
            <CardContent>
              <>
                <Typography variant="h6" gutterBottom>
                  Résultats de recherche ({results.length} trouvé(s))
                </Typography>

                {error && (
                  <Typography color="error">
                    Erreur lors de la recherche
                  </Typography>
                )}

                {results.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Client</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Gravité</TableCell>
                          <TableCell>Statut</TableCell>
                          <TableCell>SLA</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Assigné à</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((rec: any) => (
                          <TableRow key={rec.id} hover>
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
                              <SlaCountdown
                                createdAt={rec.createdAt}
                                slaDays={7}
                                status={rec.status}
                                clientName={rec.client?.name}
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(rec.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {rec.assignedTo?.fullName || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => window.open(`/reclamations/${rec.id}`, '_blank')}
                              >
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : searchTriggered && !isLoading ? (
                  <Typography>Aucun résultat trouvé</Typography>
                ) : null}
              </>
            </CardContent>
          </Card>
        )}
      </div>
    </LocalizationProvider>
  );
};

export default ReclamationSearch;