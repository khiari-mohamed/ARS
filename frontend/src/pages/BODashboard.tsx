import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  Add,
  Upload,
  Speed,
  Error,
  CheckCircle,
  Visibility,
  FileUpload,
  FilterList,
  Refresh
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import BOEntryForm from '../components/BOEntryForm';
import { BOCorbeille } from '../components/Workflow/BOCorbeille';
import BOPerformanceMetrics from '../components/BOPerformanceMetrics';
import DocumentUploadPortal from '../components/DocumentUploadPortal';
import { fetchBODashboard } from '../services/boService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const BODashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    clientId: '',
    chefEquipeId: '',
    dateFrom: '',
    dateTo: '',
    statut: ''
  });
  const [clients, setClients] = useState<any[]>([]);
  const [chefEquipes, setChefEquipes] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    loadFilterData();
    // Disable auto-refresh to prevent infinite loops during development
    // const interval = setInterval(() => loadDashboard(), 30000);
    // return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (dashboardData) {
      applyFilters();
    }
  }, [filters]);

  const loadDashboard = async (filterParams?: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBODashboard(filterParams);
      setDashboardData(data);
      setFilteredEntries(data?.recentEntries || []);
    } catch (error: any) {
      console.error('Failed to load BO dashboard:', error);
      setError('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };
  
  const loadFilterData = async () => {
    try {
      const { LocalAPI } = await import('../services/axios');
      const [clientsRes, chefsRes] = await Promise.all([
        LocalAPI.get('/clients'),
        LocalAPI.get('/users?role=CHEF_EQUIPE')
      ]);
      setClients(clientsRes.data || []);
      setChefEquipes(chefsRes.data || []);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };
  
  const applyFilters = () => {
    // Apply filters via API call for better performance
    const activeFilters = {
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.chefEquipeId && { chefEquipeId: filters.chefEquipeId }),
      ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters.dateTo && { dateTo: filters.dateTo }),
      ...(filters.statut && { statut: filters.statut })
    };
    
    // Only make API call if filters have actually changed
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    if (hasActiveFilters) {
      loadDashboard(activeFilters);
    } else if (dashboardData && !filteredEntries.length) {
      // Only reload if we don't have data
      loadDashboard();
    }
  };
  
  const resetFilters = () => {
    setFilters({
      clientId: '',
      chefEquipeId: '',
      dateFrom: '',
      dateTo: '',
      statut: ''
    });
    // Reload dashboard without filters
    loadDashboard();
  };



  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'warning';
      case 'EN_COURS': return 'info';
      case 'TRAITE': return 'success';
      case 'CLOTURE': return 'success';
      case 'EN_DIFFICULTE': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={loadDashboard}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box mb={3}>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={{ xs: 2, sm: 0 }}
        >
          <Typography 
            variant="h4"
            fontWeight={600}
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem' },
              lineHeight: 1.2
            }}
          >
            Bureau d'Ordre Dashboard
          </Typography>
          {/* Buttons moved to BOCorbeille section for better organization */}
        </Box>
      </Box>

      {/* NEW ENHANCED BO CORBEILLE COMPONENT */}
      <Box sx={{ mb: 4 }}>
        <BOCorbeille onOpenEntryDialog={() => setActiveDialog('entry')} />
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Entrées Aujourd'hui
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.todayEntries || 0}
                  </Typography>
                </Box>
                <Add color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* vi. Statut "En attente" - Commented out pending clarification */}
        {/* <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    En Attente
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.pendingEntries || 0}
                  </Typography>
                </Box>
                <Error color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid> */}

        {/* vii. Vitesse moyenne - Commented out pending clarification */}
        {/* <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Vitesse Moyenne
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.performance?.entrySpeed?.toFixed(1) || '0.0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    entrées/heure
                  </Typography>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid> */}

        {/* viii. Taux d'erreur - Commented out pending clarification */}
        {/* <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Taux d'Erreur
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.performance?.errorRate?.toFixed(1) || '0.0'}%
                  </Typography>
                </Box>
                <Error color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid> */}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribution par Statut (7 derniers jours)
            </Typography>
            <Box sx={{ height: { xs: 350, sm: 450 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.statusCounts || dashboardData?.documentTypes || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="_count.id"
                  >
                  {(dashboardData?.statusCounts || dashboardData?.documentTypes || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value} entrées`,
                    props.payload.statut
                  ]}
                />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(dashboardData?.statusCounts || dashboardData?.documentTypes || []).map((entry: any, index: number) => (
                <Chip
                  key={entry.statut}
                  label={`${entry.statut}: ${entry._count?.id || 0}`}
                  sx={{ 
                    backgroundColor: COLORS[index % COLORS.length],
                    color: 'white',
                    fontSize: '0.75rem'
                  }}
                  size="small"
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* ix. Performance Metrics - Commented out pending clarification */}
        {/* <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <BOPerformanceMetrics userId={user?.id} />
          </Paper>
        </Grid> */}

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Activité avec Filtres
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setActiveDialog('filters')}
                  size="small"
                >
                  Filtres
                </Button>
                {/* Actualiser button - Commented out for interface cleanup */}
                {/* <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => loadDashboard()}
                  size="small"
                >
                  Actualiser
                </Button> */}
              </Box>
            </Box>
            
            {/* Filter Summary */}
            {(filters.clientId || filters.chefEquipeId || filters.dateFrom || filters.dateTo || filters.statut) && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Filtres actifs: {filteredEntries.length} résultat(s) sur {dashboardData?.recentEntries?.length || 0}
                </Typography>
                <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                  {filters.clientId && (
                    <Chip
                      label={`Client: ${clients.find(c => c.id === filters.clientId)?.name || 'Inconnu'}`}
                      size="small"
                      onDelete={() => setFilters(prev => ({ ...prev, clientId: '' }))}
                    />
                  )}
                  {filters.chefEquipeId && (
                    <Chip
                      label={`Chef: ${chefEquipes.find(c => c.id === filters.chefEquipeId)?.fullName || 'Inconnu'}`}
                      size="small"
                      onDelete={() => setFilters(prev => ({ ...prev, chefEquipeId: '' }))}
                    />
                  )}
                  {filters.dateFrom && (
                    <Chip
                      label={`Depuis: ${filters.dateFrom}`}
                      size="small"
                      onDelete={() => setFilters(prev => ({ ...prev, dateFrom: '' }))}
                    />
                  )}
                  {filters.dateTo && (
                    <Chip
                      label={`Jusqu'à: ${filters.dateTo}`}
                      size="small"
                      onDelete={() => setFilters(prev => ({ ...prev, dateTo: '' }))}
                    />
                  )}
                  {filters.statut && (
                    <Chip
                      label={`Statut: ${filters.statut}`}
                      size="small"
                      onDelete={() => setFilters(prev => ({ ...prev, statut: '' }))}
                    />
                  )}
                  <Button size="small" onClick={resetFilters}>Réinitialiser</Button>
                </Box>
              </Box>
            )}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: { xs: 650, sm: 'auto' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Date Réception</TableCell>
                    <TableCell>Nb Documents</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {entry.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.client?.name}</TableCell>
                      <TableCell>
                        {new Date(entry.dateReception).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{entry.nombreBS}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.statut}
                          color={getStatusColor(entry.statut) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Voir Détails">
                          <IconButton 
                            size="small"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          {(filters.clientId || filters.chefEquipeId || filters.dateFrom || filters.dateTo || filters.statut) 
                            ? 'Aucun résultat pour les filtres sélectionnés'
                            : 'Aucune entrée récente'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <BOEntryForm
        open={activeDialog === 'entry'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          // Immediate refresh without timeout
          setTimeout(loadDashboard, 500);
        }}
      />



      <DocumentUploadPortal
        open={activeDialog === 'upload'}
        onClose={() => setActiveDialog(null)}
        onSuccess={() => {
          setActiveDialog(null);
          setTimeout(loadDashboard, 500);
        }}
      />

      {/* Filters Dialog */}
      <Dialog open={activeDialog === 'filters'} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtres d'Activité</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name}
                value={clients.find(c => c.id === filters.clientId) || null}
                onChange={(_, newValue) => {
                  setFilters(prev => ({ ...prev, clientId: newValue?.id || '' }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Client" fullWidth />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                options={chefEquipes}
                getOptionLabel={(option) => option.fullName}
                value={chefEquipes.find(c => c.id === filters.chefEquipeId) || null}
                onChange={(_, newValue) => {
                  setFilters(prev => ({ ...prev, chefEquipeId: newValue?.id || '' }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Chef d'Équipe" fullWidth />
                )}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de fin"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.statut}
                  label="Statut"
                  onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
                  <MenuItem value="A_SCANNER">À Scanner</MenuItem>
                  <MenuItem value="SCAN_EN_COURS">Scan en Cours</MenuItem>
                  <MenuItem value="ASSIGNE">Assigné</MenuItem>
                  <MenuItem value="EN_COURS">En Cours</MenuItem>
                  <MenuItem value="TRAITE">Traité</MenuItem>
                  <MenuItem value="CLOTURE">Clôturé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetFilters}>Réinitialiser</Button>
          <Button onClick={() => setActiveDialog(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Entry Details Dialog */}
      <Dialog open={!!selectedEntry} onClose={() => setSelectedEntry(null)} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'Entrée</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Référence</Typography>
                <Typography variant="body1">{selectedEntry.reference}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Client</Typography>
                <Typography variant="body1">{selectedEntry.client?.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Date Réception</Typography>
                <Typography variant="body1">{new Date(selectedEntry.dateReception).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Nombre de Documents</Typography>
                <Typography variant="body1">{selectedEntry.nombreBS}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Statut</Typography>
                <Chip label={selectedEntry.statut} color={getStatusColor(selectedEntry.statut) as any} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Délai Règlement</Typography>
                <Typography variant="body1">{selectedEntry.delaiReglement} jours</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEntry(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BODashboard;