import React, { useState } from 'react';
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
  Select
} from '@mui/material';
import { Visibility, Assignment, CheckCircle } from '@mui/icons-material';
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
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; alert: Alert | null }>({ open: false, alert: null });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; alert: Alert | null }>({ open: false, alert: null });

  const { data: alerts = [], isLoading } = useAlertsDashboard(filters);
  const { data: users = [] } = useQuery(['users'], fetchUsers);
  const resolveMutation = useResolveAlert();

  const activeAlerts = alerts.filter((a: any) => a.alertLevel === 'red' || a.alertLevel === 'orange');

  const handleResolve = async (alert: Alert) => {
    await resolveMutation.mutateAsync(alert.bordereau.id);
  };

  const getSLAStatus = (alert: Alert) => {
    const daysSince = alert.bordereau.dateReception 
      ? (new Date().getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    return Math.round(daysSince);
  };

  return (
    <div className="space-y-4">
      <Typography variant="h5" gutterBottom>
        Alertes Actives ({activeAlerts.length})
      </Typography>

      <AlertFilters filters={filters} setFilters={setFilters} />

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
    </div>
  );
};

export default ActiveAlerts;