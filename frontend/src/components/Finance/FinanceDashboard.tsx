import React, { useState, useEffect } from 'react';
import financeService from '../../services/financeService';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Error,
  FilterList,
  Refresh
} from '@mui/icons-material';

interface DashboardStats {
  totalOrdres: number;
  ordresEnCours: number;
  ordresExecutes: number;
  ordresRejetes: number;
  montantTotal: number;
}

interface RecentOrdre {
  id: string;
  reference: string;
  etatVirement: string;
  montantTotal: number;
  dateCreation: string;
  bordereau?: {
    client?: {
      name: string;
    };
  };
  donneurOrdre?: {
    nom: string;
  };
}

const FinanceDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    compagnie: '',
    client: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentOrdersFilters, setRecentOrdersFilters] = useState({
    compagnie: '',
    client: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showRecentOrdersFilters, setShowRecentOrdersFilters] = useState(false);
  const [showAllRecentOrders, setShowAllRecentOrders] = useState(false);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.compagnie) queryParams.append('compagnie', filters.compagnie);
      if (filters.client) queryParams.append('client', filters.client);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const data = await financeService.getFinanceDashboard(queryParams.toString());
      setDashboard(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      // Set default data to prevent crashes
      setDashboard({
        stats: {
          totalOrdres: 0,
          ordresEnCours: 0,
          ordresExecutes: 0,
          ordresRejetes: 0,
          montantTotal: 0,
          demandesRecuperation: 0,
          montantsRecuperes: 0
        },
        ordresVirement: []
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRecentOrdersFilterChange = (field: string, value: string) => {
    setRecentOrdersFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const applyFilters = () => {
    loadDashboard();
  };
  
  const clearFilters = () => {
    setFilters({ compagnie: '', client: '', dateFrom: '', dateTo: '' });
    setTimeout(() => loadDashboard(), 100);
  };
  
  const clearRecentOrdersFilters = () => {
    setRecentOrdersFilters({ compagnie: '', client: '', dateFrom: '', dateTo: '' });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement du tableau de bord...</Typography>
      </Box>
    );
  }

  if (error && !dashboard) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button variant="outlined" onClick={loadDashboard} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Alert>
    );
  }

  const stats: DashboardStats = dashboard?.stats || {
    totalOrdres: 0,
    ordresEnCours: 0,
    ordresExecutes: 0,
    ordresRejetes: 0,
    montantTotal: 0
  };
  
  const ordresVirement = dashboard?.ordresVirement || [];

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Ordres
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalOrdres}
                </Typography>
              </Box>
              <Assignment color="primary" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.ordresEnCours}
                </Typography>
              </Box>
              <TrendingUp color="info" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Exécutés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.ordresExecutes}
                </Typography>
              </Box>
              <CheckCircle color="success" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Montant Total
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {(stats.montantTotal || 0).toLocaleString('fr-TN')} TND
                </Typography>
              </Box>
              <AccountBalance color="secondary" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const getFilteredRecentOrders = () => {
    let filtered = ordresVirement || [];
    
    if (recentOrdersFilters.compagnie) {
      filtered = filtered.filter((ordre: any) => 
        ordre.client?.toLowerCase().includes(recentOrdersFilters.compagnie.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.client) {
      filtered = filtered.filter((ordre: any) => 
        ordre.client?.toLowerCase().includes(recentOrdersFilters.client.toLowerCase())
      );
    }
    
    if (recentOrdersFilters.dateFrom) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) >= new Date(recentOrdersFilters.dateFrom)
      );
    }
    
    if (recentOrdersFilters.dateTo) {
      filtered = filtered.filter((ordre: any) => 
        new Date(ordre.dateCreation) <= new Date(recentOrdersFilters.dateTo)
      );
    }
    
    return showAllRecentOrders ? filtered : filtered.slice(0, 10);
  };

  const renderRecentOrdres = () => {
    const filteredOrders = getFilteredRecentOrders();
    
    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Ordres de Virement Récents</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                size="small"
                onClick={() => setShowRecentOrdersFilters(!showRecentOrdersFilters)}
              >
                Filtres
              </Button>
              <Button
                variant={showAllRecentOrders ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setShowAllRecentOrders(!showAllRecentOrders)}
              >
                {showAllRecentOrders ? 'Afficher moins' : 'Afficher tout'}
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                onClick={loadDashboard}
              >
                Actualiser
              </Button>
            </Box>
          </Box>
          
          {/* Recent Orders Filters */}
          {showRecentOrdersFilters && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Filtres pour les ordres récents</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Compagnie d'assurance"
                    value={recentOrdersFilters.compagnie}
                    onChange={(e) => handleRecentOrdersFilterChange('compagnie', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Client"
                    value={recentOrdersFilters.client}
                    onChange={(e) => handleRecentOrdersFilterChange('client', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Date début"
                    type="date"
                    value={recentOrdersFilters.dateFrom}
                    onChange={(e) => handleRecentOrdersFilterChange('dateFrom', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Date fin"
                    type="date"
                    value={recentOrdersFilters.dateTo}
                    onChange={(e) => handleRecentOrdersFilterChange('dateTo', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button 
                    variant="outlined" 
                    onClick={clearRecentOrdersFilters} 
                    size="small"
                    fullWidth
                  >
                    Effacer
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

        {filteredOrders.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>État</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Demande Récupération</TableCell>
                  <TableCell>Montant Récupéré</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((ordre: any, index: number) => (
                  <TableRow key={ordre.id || index} hover>
                    <TableCell>{ordre.reference}</TableCell>
                    <TableCell>{ordre.client}</TableCell>
                    <TableCell>{ordre.montant?.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      <Chip
                        label={ordre.statut}
                        color={ordre.statut === 'EXECUTE' ? 'success' : ordre.statut === 'REJETE' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(ordre.dateCreation).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {ordre.demandeRecuperation ? (
                        <Box>
                          <Chip label="Oui" color="warning" size="small" />
                          {ordre.dateDemandeRecuperation && (
                            <Typography variant="caption" display="block">
                              {new Date(ordre.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {ordre.montantRecupere ? (
                        <Box>
                          <Chip label="Oui" color="success" size="small" />
                          {ordre.dateMontantRecupere && (
                            <Typography variant="caption" display="block">
                              {new Date(ordre.dateMontantRecupere).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo) 
                ? 'Aucun ordre de virement trouvé avec ces filtres' 
                : 'Aucun ordre de virement récent'
              }
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo)
                ? 'Essayez de modifier les critères de recherche'
                : 'Les ordres de virement apparaîtront ici une fois créés'
              }
            </Typography>
          </Box>
        )}
        
        {/* Show count info */}
        {filteredOrders.length > 0 && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {showAllRecentOrders 
                ? `Affichage de tous les ${filteredOrders.length} ordres`
                : `Affichage de ${Math.min(10, filteredOrders.length)} sur ${(ordresVirement || []).length} ordres`
              }
              {(recentOrdersFilters.compagnie || recentOrdersFilters.client || recentOrdersFilters.dateFrom || recentOrdersFilters.dateTo) && 
                ' (filtrés)'
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Tableau de Bord Finance
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboard}
          >
            Actualiser
          </Button>
        </Box>
      </Box>
      
      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Filtres</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Compagnie d'assurance"
                value={filters.compagnie}
                onChange={(e) => handleFilterChange('compagnie', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Client"
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Date début"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Date fin"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={applyFilters} size="small">
                  Appliquer
                </Button>
                <Button variant="outlined" onClick={clearFilters} size="small">
                  Effacer
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {error}
        </Alert>
      )}

      {/* Rejected Orders Alert */}
      {stats.ordresRejetes > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {stats.ordresRejetes} ordre(s) de virement rejeté(s)
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Recent Orders */}
      {renderRecentOrdres()}
      
      {/* Recovery Stats */}
      {dashboard?.stats && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Demandes de Récupération
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {dashboard.stats.demandesRecuperation || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ordres avec demande de récupération
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Montants Récupérés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {dashboard.stats.montantsRecuperes || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ordres avec montant récupéré
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinanceDashboard;