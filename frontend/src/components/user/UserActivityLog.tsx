import React, { useState, useEffect } from 'react';
import { fetchUserAuditLogs } from '../../api/usersApi';
import { AuditLog } from '../../types/user.d';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Visibility,
  FilterList,
  Download,
  Refresh
} from '@mui/icons-material';

interface Props {
  userId: string;
  maxHeight?: number;
  showFilters?: boolean;
  showPagination?: boolean;
}

const actionColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'LOGIN_SUCCESS': 'success',
  'LOGIN_FAILED': 'error',
  'USER_CREATE': 'primary',
  'USER_UPDATE': 'info',
  'USER_DELETE': 'error',
  'USER_DISABLE': 'warning',
  'USER_ENABLE': 'success',
  'PASSWORD_RESET': 'warning',
  'DOCUMENT_PROCESS': 'info',
  'TASK_COMPLETE': 'success',
  'BORDEREAU_CREATE': 'primary',
  'BORDEREAU_UPDATE': 'info',
  'VIREMENT_CONFIRM': 'success',
  'VIREMENT_REJECT': 'error'
};

const actionLabels: Record<string, string> = {
  'LOGIN_SUCCESS': 'Connexion réussie',
  'LOGIN_FAILED': 'Échec de connexion',
  'USER_CREATE': 'Création utilisateur',
  'USER_UPDATE': 'Modification utilisateur',
  'USER_DELETE': 'Suppression utilisateur',
  'USER_DISABLE': 'Désactivation utilisateur',
  'USER_ENABLE': 'Activation utilisateur',
  'PASSWORD_RESET': 'Réinitialisation mot de passe',
  'DOCUMENT_PROCESS': 'Traitement document',
  'TASK_COMPLETE': 'Tâche terminée',
  'BORDEREAU_CREATE': 'Création bordereau',
  'BORDEREAU_UPDATE': 'Modification bordereau',
  'VIREMENT_CONFIRM': 'Confirmation virement',
  'VIREMENT_REJECT': 'Rejet virement'
};

const UserActivityLog: React.FC<Props> = ({ 
  userId, 
  maxHeight = 400, 
  showFilters = true, 
  showPagination = true 
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const logsPerPage = 10;

  useEffect(() => {
    loadLogs();
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserAuditLogs(userId);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
    setPage(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date', 'Action', 'Détails'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        actionLabels[log.action] || log.action,
        log.details ? JSON.stringify(log.details) : ''
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_activity_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const paginatedLogs = showPagination 
    ? filteredLogs.slice((page - 1) * logsPerPage, page * logsPerPage)
    : filteredLogs;

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Journal d'activité ({filteredLogs.length})
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Actualiser">
              <IconButton onClick={loadLogs} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exporter CSV">
              <IconButton onClick={exportLogs} size="small">
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {showFilters && (
          <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Filtres
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <TextField
                size="small"
                label="Recherche"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                sx={{ minWidth: 200 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {uniqueActions.map(action => (
                    <MenuItem key={action} value={action}>
                      {actionLabels[action] || action}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                type="date"
                label="Du"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                size="small"
                type="date"
                label="Au"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                startIcon={<FilterList />}
              >
                Effacer
              </Button>
            </Box>
          </Box>
        )}

        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ maxHeight: maxHeight }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date/Heure</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Détails</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">
                      Aucune activité trouvée
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(log.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={actionLabels[log.action] || log.action}
                        size="small"
                        color={actionColors[log.action] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {log.details 
                          ? typeof log.details === 'object' 
                            ? JSON.stringify(log.details).substring(0, 50) + '...'
                            : String(log.details).substring(0, 50) + '...'
                          : '-'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Voir détails">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {showPagination && filteredLogs.length > logsPerPage && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={Math.ceil(filteredLogs.length / logsPerPage)}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}
      </CardContent>

      {/* Log Details Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails de l'activité
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Date/Heure:
              </Typography>
              <Typography variant="body2" paragraph>
                {new Date(selectedLog.timestamp).toLocaleString()}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Action:
              </Typography>
              <Box mb={2}>
                <Chip
                  label={actionLabels[selectedLog.action] || selectedLog.action}
                  color={actionColors[selectedLog.action] || 'default'}
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Détails:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  {selectedLog.details 
                    ? typeof selectedLog.details === 'object'
                      ? JSON.stringify(selectedLog.details, null, 2)
                      : String(selectedLog.details)
                    : 'Aucun détail disponible'
                  }
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UserActivityLog;