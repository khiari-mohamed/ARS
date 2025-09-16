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
  Alert
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Error
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

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await financeService.getFinanceDashboard();
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
          montantTotal: 0
        },
        recentOrdres: []
      });
    } finally {
      setIsLoading(false);
    }
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
  
  const recentOrdres: RecentOrdre[] = dashboard?.recentOrdres || [];

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

  const renderRecentOrdres = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Ordres de Virement Récents</Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={loadDashboard}
          >
            Actualiser
          </Button>
        </Box>

        {recentOrdres.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Donneur d'Ordre</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>État</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrdres.slice(0, 5).map((ordre: any, index: number) => (
                  <TableRow key={ordre.id || index} hover>
                    <TableCell>{ordre.reference}</TableCell>
                    <TableCell>{ordre.bordereau?.client?.name || ordre.client}</TableCell>
                    <TableCell>{ordre.donneurOrdre?.nom}</TableCell>
                    <TableCell>{ordre.montantTotal.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      <Chip
                        label={ordre.etatVirement}
                        color={ordre.etatVirement === 'EXECUTE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(ordre.dateCreation).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              Aucun ordre de virement récent
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Les ordres de virement apparaîtront ici une fois créés
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Tableau de Bord Finance
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            sx={{ mr: 2 }}
            onClick={loadDashboard}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

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
    </Box>
  );
};

export default FinanceDashboard;