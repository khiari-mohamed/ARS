import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export const FinanceDashboard: React.FC = () => {
  const { data: dashboard, isLoading, error, refetch } = useQuery(
    ['finance-dashboard'],
    () => financeService.getFinanceDashboard(),
    { 
      refetchInterval: 30000,
      retry: 3 
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement du tableau de bord...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6">Erreur lors du chargement</Typography>
        <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Alert>
    );
  }

  const { stats, recentOrdres } = dashboard || {};

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Ordres
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.totalOrdres || 0}
                </Typography>
              </Box>
              <Assignment color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats?.ordresEnCours || 0}
                </Typography>
              </Box>
              <TrendingUp color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Exécutés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats?.ordresExecutes || 0}
                </Typography>
              </Box>
              <CheckCircle color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Montant Total
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {financeService.formatMontant(stats?.montantTotal || 0)}
                </Typography>
              </Box>
              <AccountBalance color="secondary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderRecentOrdres = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Ordres de Virement Récents</Typography>
          <Button 
            variant="outlined" 
            onClick={() => window.location.href = '/finance/ordres-virement'}
          >
            Voir Tout
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Donneur d'Ordre</TableCell>
                <TableCell>Montant</TableCell>
                <TableCell>État</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentOrdres?.map((ordre: any) => (
                <TableRow key={ordre.id} hover>
                  <TableCell>{ordre.reference}</TableCell>
                  <TableCell>{ordre.bordereau?.client?.name || '-'}</TableCell>
                  <TableCell>{ordre.donneurOrdre?.nom}</TableCell>
                  <TableCell>{financeService.formatMontant(ordre.montantTotal)}</TableCell>
                  <TableCell>
                    <Chip
                      label={financeService.getEtatVirementLabel(ordre.etatVirement)}
                      color={financeService.getEtatVirementColor(ordre.etatVirement)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(ordre.dateCreation).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => window.location.href = `/finance/ordres-virement/${ordre.id}`}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {(!recentOrdres || recentOrdres.length === 0) && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              Aucun ordre de virement récent
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="finance-dashboard p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Tableau de Bord Finance
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            sx={{ mr: 2 }}
            onClick={() => window.location.href = '/finance/ordres-virement/nouveau'}
          >
            Nouvel Ordre
          </Button>
          <Button variant="outlined" onClick={() => refetch()}>
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {stats?.ordresRejetes > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Attention:</strong> {stats.ordresRejetes} ordre(s) de virement rejeté(s)
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Recent Orders */}
      {renderRecentOrdres()}
    </div>
  );
};

export default FinanceDashboard;