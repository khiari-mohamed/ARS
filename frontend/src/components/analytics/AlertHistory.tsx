import React, { useState } from 'react';
import { useAlertHistory } from '../../hooks/useAlertsQuery';
import { AlertHistoryQuery, AlertHistoryEntry } from '../../types/alerts.d';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Link,
  Alert as MuiAlert,
  Tooltip,
} from '@mui/material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';
import { exportAlertsToCSV } from '../../utils/exportAlerts';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const alertLevels = [
  { value: '', label: 'Tous' },
  { value: 'red', label: 'Critique' },
  { value: 'orange', label: 'Alerte' },
  { value: 'green', label: 'Normal' },
];

const AlertHistory: React.FC = () => {
  const [filters, setFilters] = useState<AlertHistoryQuery>({});
  const { data: history, isLoading, error } = useAlertHistory(filters);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleReset = () => setFilters({});

  const handleExport = () => {
    if (history && history.length > 0) {
      // Convert AlertHistoryEntry[] to Alert[]-like for export utility, or write a custom export
      const rows = history.map((h: any) => ({
        id: h.id,
        bordereauId: h.bordereauId,
        user: h.user?.fullName || h.userId,
        alertLevel: h.alertLevel,
        message: h.message,
        createdAt: h.createdAt,
        resolved: h.resolved ? 'Oui' : 'Non',
      }));
      const headers = ['ID', 'Bordereau', 'Utilisateur', 'Niveau', 'Message', 'Date', 'Résolu'];
      const csvContent =
        [headers, ...rows.map((row: any) => [
          row.id,
          row.bordereauId,
          row.user,
          row.alertLevel,
          row.message,
          new Date(row.createdAt).toLocaleString(),
          row.resolved,
        ])]
          .map((row: any) => row.map(String).map((s: string) => `"${s.replace(/"/g, '""')}"`).join(','))
          .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'alert_history.csv';
      link.click();
    }
  };

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Historique des alertes
      </Typography>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          label="Bordereau"
          name="bordereauId"
          value={filters.bordereauId || ''}
          onChange={handleChange}
          size="small"
        />
        <TextField
          label="Utilisateur"
          name="userId"
          value={filters.userId || ''}
          onChange={handleChange}
          size="small"
        />
        <TextField
          select
          label="Niveau"
          name="alertLevel"
          value={filters.alertLevel || ''}
          onChange={handleChange}
          size="small"
          sx={{ minWidth: 120 }}
        >
          {alertLevels.map((l) => (
            <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Du"
          type="date"
          name="fromDate"
          value={filters.fromDate || ''}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="Au"
          type="date"
          name="toDate"
          value={filters.toDate || ''}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Button onClick={handleReset} variant="outlined" color="secondary">
          Réinitialiser
        </Button>
        <Button
          onClick={handleExport}
          variant="outlined"
          color="primary"
          disabled={!history || history.length === 0}
        >
          Exporter CSV
        </Button>
      </Box>
      {isLoading && (
        <Box display="flex" alignItems="center" gap={1} mt={2}>
          <CircularProgress size={20} />
          <Typography>Chargement...</Typography>
        </Box>
      )}
      {error && (
        <MuiAlert severity="error" sx={{ my: 2 }}>
          Erreur lors du chargement de l'historique : {(error as any)?.message || 'Erreur inconnue'}
        </MuiAlert>
      )}
      {!isLoading && !error && (!history || history.length === 0) && (
        <Typography>Aucune alerte trouvée pour ces critères.</Typography>
      )}
      {!isLoading && !error && history && history.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Bordereau</TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Niveau</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Résolu</TableCell>
              <TableCell>Voir</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((h: AlertHistoryEntry) => (
              <TableRow key={h.id}>
                <TableCell>
                  <Tooltip title={h.createdAt}>
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {h.bordereauId ? (
                    <Link
                      href={`/bordereaux/${h.bordereauId}`}
                      target="_blank"
                      rel="noopener"
                      underline="hover"
                    >
                      {h.bordereauId}
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {h.user?.id ? (
                    <Link
                      href={`/users/${h.user.id}`}
                      target="_blank"
                      rel="noopener"
                      underline="hover"
                    >
                      {h.user.fullName || h.user.email || h.user.id}
                    </Link>
                  ) : (
                    h.user?.fullName || h.userId || '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={alertLevelLabel(h.alertLevel)}
                    sx={{
                      backgroundColor: alertLevelColor(h.alertLevel),
                      color: '#fff',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={h.message || ''}>
                    <span>{h.message?.length > 60 ? h.message.slice(0, 60) + '…' : h.message}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {h.resolved ? (
                    <Chip label="Oui" color="success" />
                  ) : (
                    <Chip label="Non" color="warning" />
                  )}
                </TableCell>
                <TableCell>
                  {h.documentId ? (
                    <Tooltip title="Voir document">
                      <Link
                        href={`/ged/documents/${h.documentId}`}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </Link>
                    </Tooltip>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AlertHistory;