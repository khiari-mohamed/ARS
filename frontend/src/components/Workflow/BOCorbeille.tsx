import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { Assignment, Send } from '@mui/icons-material';

const fetchBOCorbeille = async () => {
  const { data } = await LocalAPI.get('/workflow/corbeille/bo');
  return data;
};

const processBordereauForScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/workflow/bo/process-for-scan/${bordereauId}`);
  return data;
};

export const BOCorbeille: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error, refetch } = useQuery(
    ['bo-corbeille'],
    fetchBOCorbeille,
    { 
      refetchInterval: 30000,
      retry: 3
    }
  );

  const processMutation = useMutation(processBordereauForScan, {
    onSuccess: (data) => {
      console.log('Bordereau envoyé au SCAN avec succès:', data);
      queryClient.invalidateQueries(['bo-corbeille']);
    },
    onError: (error) => {
      console.error('Erreur lors du traitement:', error);
    }
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement de la corbeille BO...</Typography>
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

  const { items = [], stats } = corbeilleData || {};

  const handleProcessForScan = (bordereauId: string) => {
    processMutation.mutate(bordereauId);
  };

  const renderStatsCard = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Documents en attente
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.pending || 0}
                </Typography>
              </Box>
              <Assignment color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Nombre BS</TableCell>
            <TableCell>Date Réception</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id} hover>
              <TableCell>{item.reference}</TableCell>
              <TableCell>{item.clientName}</TableCell>
              <TableCell>{item.subject}</TableCell>
              <TableCell>
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Chip
                  label="En attente"
                  color="warning"
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Send />}
                  onClick={() => handleProcessForScan(item.id)}
                  disabled={processMutation.isLoading}
                >
                  Envoyer au SCAN
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="bo-corbeille p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Bureau d'Ordre - Corbeille
        </Typography>
        <Button variant="outlined" onClick={() => refetch()} disabled={isLoading}>
          Actualiser
        </Button>
      </Box>

      {/* Stats Cards */}
      {renderStatsCard()}

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Instructions:</strong> Traitez les bordereaux reçus physiquement en les envoyant au service SCAN pour numérisation.
        </Typography>
      </Alert>

      {/* Table */}
      {items.length > 0 ? renderTable() : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Aucun document en attente
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tous les bordereaux ont été traités
          </Typography>
        </Paper>
      )}
    </div>
  );
};

export default BOCorbeille;