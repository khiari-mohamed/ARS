import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert as MuiAlert,
  Snackbar,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Visibility, Assignment, CheckCircle, Refresh, FilterList, Download } from '@mui/icons-material';
import { useAlertsDashboard, useResolveAlert } from '../hooks/useAlertsQuery';
import { AlertsDashboardQuery, Alert } from '../types/alerts.d';
import { alertLevelColor, alertLevelLabel } from '../utils/alertUtils';
import AlertFilters from './analytics/AlertFilters';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';

const fetchUsers = async () => {
  const { data } = await LocalAPI.get('/users');
  return data;
};

const ActiveAlerts: React.FC = () => {
  const [filters, setFilters] = useState<AlertsDashboardQuery>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; alert: any | null }>({ open: false, alert: null });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; alert: any | null }>({ open: false, alert: null });
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: alerts = [], isLoading, error, refetch } = useAlertsDashboard(filters);
  const { data: users = [] } = useQuery(['users'], fetchUsers);
  const resolveMutation = useResolveAlert();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const activeAlerts = alerts.filter((a: any) => a.alertLevel === 'red' || a.alertLevel === 'orange');

  const handleResolve = async (alert: any) => {
    try {
      await resolveMutation.mutateAsync(alert.bordereau.id);
      setSnackbar({ open: true, message: 'Alerte résolue avec succès', severity: 'success' });
      refetch();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de la résolution', severity: 'error' });
    }
  };

  const handleFilterChange = (field: keyof AlertsDashboardQuery, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const response = await LocalAPI.get('/alerts/export?format=excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'alertes-actives.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Export réussi', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de l\'export', severity: 'error' });
    }
  };

  const getSLAStatus = (alert: any) => {
    const daysSince = alert.bordereau.dateReception 
      ? (new Date().getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    return Math.round(daysSince);
  };

  return (
    <Box sx={{ p: 2 }}>
      <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
          Alertes Actives ({activeAlerts.length})
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Actualiser">
            <IconButton onClick={() => refetch()} disabled={isLoading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtres">
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter">
            <IconButton onClick={handleExport}>
              <Download />
            </IconButton>
          </Tooltip>
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </Box>
      </Box>

      {showFilters && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="ID Équipe"
                  value={filters.teamId || ''}
                  onChange={(e) => handleFilterChange('teamId', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="ID Utilisateur"
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Niveau d'Alerte</InputLabel>
                  <Select
                    value={filters.alertLevel || ''}
                    onChange={(e) => handleFilterChange('alertLevel', e.target.value)}
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="red">Critique</MenuItem>
                    <MenuItem value="orange">Attention</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date de début"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          Erreur lors du chargement des alertes
        </MuiAlert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Lié à</TableCell>
                <TableCell>Urgence</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Assigné à</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell>SLA (jours)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAlerts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((alert: any) => (
                <TableRow key={alert.bordereau.id}>
                  <TableCell>{alert.bordereau.id}</TableCell>
                  <TableCell>
                    {alert.reason === 'SLA breach' ? 'Dépassement SLA' : 
                     alert.reason === 'Risk of delay' ? 'Risque de retard' : 
                     alert.reason}
                  </TableCell>
                  <TableCell>Bordereau #{alert.bordereau.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={alertLevelLabel(alert.alertLevel)}
                      sx={{
                        backgroundColor: alertLevelColor(alert.alertLevel),
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.bordereau.statut} 
                      color={alert.bordereau.statut === 'CLOTURE' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {alert.bordereau.userId ? 
                      users.find((u: any) => u.id === alert.bordereau.userId)?.fullName || alert.bordereau.userId 
                      : 'Non assigné'}
                  </TableCell>
                  <TableCell>
                    {new Date(alert.bordereau.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getSLAStatus(alert)}
                      color={getSLAStatus(alert) > 7 ? 'error' : getSLAStatus(alert) > 5 ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Voir détails">
                        <IconButton 
                          size="small"
                          onClick={() => setDetailDialog({ open: true, alert })}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Marquer résolu">
                        <IconButton 
                          size="small"
                          color="success"
                          onClick={() => handleResolve(alert)}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={activeAlerts.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="Lignes par page:"
        />
      </Paper>

      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, alert: null })} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'alerte</DialogTitle>
        <DialogContent>
          {detailDialog.alert && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>ID:</strong> {detailDialog.alert.bordereau.id}</Typography>
              <Typography><strong>Raison:</strong> {detailDialog.alert.reason}</Typography>
              <Typography><strong>Niveau:</strong> {alertLevelLabel(detailDialog.alert.alertLevel)}</Typography>
              <Typography><strong>Client:</strong> {detailDialog.alert.bordereau.clientId}</Typography>
              <Typography><strong>Équipe:</strong> {detailDialog.alert.bordereau.teamId}</Typography>
              <Typography><strong>Date réception:</strong> {detailDialog.alert.bordereau.dateReception ? new Date(detailDialog.alert.bordereau.dateReception).toLocaleDateString() : 'N/A'}</Typography>
              <Typography><strong>Statut:</strong> {detailDialog.alert.bordereau.statut}</Typography>
              <Typography><strong>SLA dépassé:</strong> {getSLAStatus(detailDialog.alert)} jours</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, alert: null })}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
      </>
    </Box>
  );
};

export default ActiveAlerts;