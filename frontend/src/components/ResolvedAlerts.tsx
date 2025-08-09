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
  Typography,
  Box,
  TextField,
  MenuItem,
  Button
} from '@mui/material';
import { useAlertHistory } from '../hooks/useAlertsQuery';
import { AlertHistoryQuery, AlertHistoryEntry } from '../types/alerts.d';
import { alertLevelColor, alertLevelLabel } from '../utils/alertUtils';

const ResolvedAlerts: React.FC = () => {
  const [filters, setFilters] = useState<AlertHistoryQuery>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: resolvedAlerts = [], isLoading } = useAlertHistory({
    ...filters,
    resolved: true
  });

  const handleFilterChange = (field: keyof AlertHistoryQuery, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Bordereau', 'Type', 'Niveau', 'Message', 'Résolu le', 'Temps de résolution'],
      ...resolvedAlerts.map((alert: AlertHistoryEntry) => [
        alert.id,
        alert.bordereauId || '-',
        alert.alertType,
        alertLevelLabel(alert.alertLevel),
        alert.message,
        alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : '-',
        alert.resolvedAt && alert.createdAt 
          ? `${Math.round((new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60 * 24))} jours`
          : '-'
      ])
    ].map((row: any) => row.map(String).map((s: string) => `"${s.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'alertes_resolues.csv';
    link.click();
  };

  return (
    <div className="space-y-4">
      <Typography variant="h5" gutterBottom>
        Alertes Résolues ({resolvedAlerts.length})
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Bordereau ID"
            size="small"
            value={filters.bordereauId || ''}
            onChange={(e) => handleFilterChange('bordereauId', e.target.value)}
          />
          <TextField
            select
            label="Niveau"
            size="small"
            sx={{ minWidth: 120 }}
            value={filters.alertLevel || ''}
            onChange={(e) => handleFilterChange('alertLevel', e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="red">Critique</MenuItem>
            <MenuItem value="orange">Alerte</MenuItem>
            <MenuItem value="green">Normal</MenuItem>
          </TextField>
          <TextField
            label="Date début"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.fromDate || ''}
            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
          />
          <TextField
            label="Date fin"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.toDate || ''}
            onChange={(e) => handleFilterChange('toDate', e.target.value)}
          />
          <Button 
            variant="outlined" 
            onClick={() => setFilters({})}
          >
            Réinitialiser
          </Button>
          <Button 
            variant="contained" 
            onClick={handleExport}
            disabled={resolvedAlerts.length === 0}
          >
            Exporter CSV
          </Button>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Bordereau</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Niveau</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Résolu par</TableCell>
                <TableCell>Résolu le</TableCell>
                <TableCell>Temps résolution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resolvedAlerts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((alert: AlertHistoryEntry) => {
                  const resolutionTime = alert.resolvedAt && alert.createdAt 
                    ? Math.round((new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.id}</TableCell>
                      <TableCell>
                        {alert.bordereauId ? (
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => window.open(`/bordereaux/${alert.bordereauId}`, '_blank')}
                          >
                            {alert.bordereauId}
                          </Button>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{alert.alertType}</TableCell>
                      <TableCell>
                        <Chip
                          label={alertLevelLabel(alert.alertLevel)}
                          sx={{
                            backgroundColor: alertLevelColor(alert.alertLevel),
                            color: '#fff',
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {alert.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {alert.user?.fullName || alert.userId || 'Système'}
                      </TableCell>
                      <TableCell>
                        {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {resolutionTime ? (
                          <Chip 
                            label={`${resolutionTime}j`}
                            color={resolutionTime <= 1 ? 'success' : resolutionTime <= 3 ? 'warning' : 'error'}
                            size="small"
                          />
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={resolvedAlerts.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="Lignes par page:"
        />
      </Paper>
    </div>
  );
};

export default ResolvedAlerts;