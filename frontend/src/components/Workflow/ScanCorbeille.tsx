import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Tabs,
  Tab,
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
import { Scanner, PlayArrow, CheckCircle, Schedule } from '@mui/icons-material';

const fetchScanCorbeille = async () => {
  const { data } = await LocalAPI.get('/workflow/corbeille/scan');
  return data;
};

const startScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/workflow/scan/start/${bordereauId}`);
  return data;
};

const completeScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/workflow/scan/complete/${bordereauId}`);
  return data;
};

export const ScanCorbeille: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error, refetch } = useQuery(
    ['scan-corbeille'],
    fetchScanCorbeille,
    { 
      refetchInterval: 30000,
      retry: 3
    }
  );

  const startScanMutation = useMutation(startScan, {
    onSuccess: () => {
      queryClient.invalidateQueries(['scan-corbeille']);
    }
  });

  const completeScanMutation = useMutation(completeScan, {
    onSuccess: () => {
      queryClient.invalidateQueries(['scan-corbeille']);
    }
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement de la corbeille SCAN...</Typography>
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

  const { toScan = [], scanning = [], completed = [], stats } = corbeilleData || {};

  const handleStartScan = (bordereauId: string) => {
    startScanMutation.mutate(bordereauId);
  };

  const handleCompleteScan = (bordereauId: string) => {
    completeScanMutation.mutate(bordereauId);
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  À Scanner
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.toScan || 0}
                </Typography>
              </Box>
              <Scanner color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Cours
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats?.scanning || 0}
                </Typography>
              </Box>
              <Schedule color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Terminés
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats?.completed || 0}
                </Typography>
              </Box>
              <CheckCircle color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTable = (items: any[], showActions: boolean = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Référence</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Nombre BS</TableCell>
            <TableCell>Date Réception</TableCell>
            <TableCell>Statut</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
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
                  label={item.status === 'A_SCANNER' ? 'À scanner' : 
                        item.status === 'SCAN_EN_COURS' ? 'En cours' : 'Terminé'}
                  color={item.status === 'A_SCANNER' ? 'warning' : 
                        item.status === 'SCAN_EN_COURS' ? 'info' : 'success'}
                  size="small"
                />
              </TableCell>
              {showActions && (
                <TableCell>
                  {item.status === 'A_SCANNER' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => handleStartScan(item.id)}
                      disabled={startScanMutation.isLoading}
                    >
                      Commencer
                    </Button>
                  )}
                  {item.status === 'SCAN_EN_COURS' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleCompleteScan(item.id)}
                      disabled={completeScanMutation.isLoading}
                    >
                      Terminer
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="scan-corbeille p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Service SCAN - Corbeille
        </Typography>
        <Button variant="outlined" onClick={() => refetch()} disabled={isLoading}>
          Actualiser
        </Button>
      </Box>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Instructions:</strong> Numérisez les bordereaux reçus du Bureau d'Ordre. Une fois terminé, ils seront automatiquement envoyés au Chef d'équipe pour affectation.
        </Typography>
      </Alert>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`À Scanner (${toScan.length})`} />
          <Tab label={`En Cours (${scanning.length})`} />
          <Tab label={`Terminés (${completed.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        toScan.length > 0 ? renderTable(toScan) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun bordereau à scanner
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 1 && (
        scanning.length > 0 ? renderTable(scanning) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun scan en cours
            </Typography>
          </Paper>
        )
      )}
      {activeTab === 2 && (
        completed.length > 0 ? renderTable(completed, false) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Aucun scan terminé récemment
            </Typography>
          </Paper>
        )
      )}
    </div>
  );
};

export default ScanCorbeille;