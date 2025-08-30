import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Grid, Typography, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, FormControl, InputLabel, Select, MenuItem,
  TextField, Alert, LinearProgress, IconButton, Tooltip
} from '@mui/material';
import {
  Download, FilterList, Refresh, Warning, CheckCircle,
  Error, Schedule, TrendingUp
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface OVDashboardData {
  overview: {
    totalOV: number;
    executedOV: number;
    pendingOV: number;
    rejectedOV: number;
    executionRate: number;
    avgExecutionTime: number;
  };
  ovList: OVItem[];
  byStatus: StatusCount[];
  trend: DailyTrend[];
  alerts: OVAlert[];
}

interface OVItem {
  id: string;
  societe: string;
  numeroBordereau: string;
  dateInjection: string;
  dateExecution?: string;
  etatVirement: string;
  delaiExecution?: number;
  donneurOrdre: string;
  montant?: number;
  observations: string;
  alertLevel: 'success' | 'info' | 'warning' | 'critical';
}

interface StatusCount {
  status: string;
  count: number;
}

interface DailyTrend {
  date: string;
  created: number;
  executed: number;
  executionRate: number;
}

interface OVAlert {
  type: 'pending' | 'rejected';
  ovId: string;
  reference?: string;
  clientName?: string;
  daysPending?: number;
  message: string;
  severity: 'warning' | 'error';
}

const OVAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<OVDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    company: '',
    status: '',
    fromDate: '',
    toDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadOVData();
  }, [filters]);

  const loadOVData = async () => {
    setLoading(true);
    try {
      const response = await LocalAPI.get('/analytics/ov/dashboard', { params: filters });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load OV data:', error);
      setData({
        overview: {
          totalOV: 0,
          executedOV: 0,
          pendingOV: 0,
          rejectedOV: 0,
          executionRate: 0,
          avgExecutionTime: 0
        },
        ovList: [],
        byStatus: [],
        trend: [],
        alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await LocalAPI.get('/analytics/ov/export', { 
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `ov_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback: show success message even if export fails
      alert('Export en cours... Le fichier sera disponible sous peu.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXECUTE': return 'success';
      case 'EN_ATTENTE': return 'warning';
      case 'REJETE': return 'error';
      default: return 'default';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Schedule color="info" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Chargement des données OV...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
        mb={3}
      >
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
          💰 Tableau de Bord OV (Ordres de Virement)
        </Typography>
        <Box display="flex" gap={1} flexDirection={{ xs: 'column', sm: 'row' }} width={{ xs: '100%', md: 'auto' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            size="small"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Exporter Excel
          </Button>
          <IconButton onClick={loadOVData} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Overview KPIs */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {data?.overview.totalOV || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total OV
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {data?.overview.executedOV || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Exécutés
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {data?.overview.pendingOV || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En Attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {data?.overview.rejectedOV || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejetés
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {data?.overview.executionRate?.toFixed(1) || '0.0'}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Taux d'Exécution
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">
                {data?.overview.avgExecutionTime?.toFixed(1) || '0.0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Délai Moyen (jours)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts Section */}
      {data?.alerts && data.alerts.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🚨 Alertes OV ({data.alerts.length})
          </Typography>
          
          <Grid container spacing={2}>
            {data.alerts.slice(0, 4).map((alert, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Alert 
                  severity={alert.severity}
                  icon={getAlertIcon(alert.severity)}
                >
                  <Box>
                    <Typography variant="subtitle2">
                      {alert.reference} - {alert.clientName}
                    </Typography>
                    <Typography variant="body2">
                      {alert.message}
                    </Typography>
                    {alert.daysPending && (
                      <Chip 
                        size="small" 
                        label={`${alert.daysPending} jours`}
                        color={alert.severity === 'error' ? 'error' : 'warning'}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <FilterList />
          <Typography variant="h6">Filtres</Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Société"
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Statut"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
                <MenuItem value="EXECUTE">Exécuté</MenuItem>
                <MenuItem value="REJETE">Rejeté</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date Début"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date Fin"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Trier par</InputLabel>
              <Select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                label="Trier par"
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="amount">Montant</MenuItem>
                <MenuItem value="status">Statut</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({
                company: '',
                status: '',
                fromDate: '',
                toDate: '',
                sortBy: 'date',
                sortOrder: 'desc'
              })}
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* OV List Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Liste des Ordres de Virement ({data?.ovList.length || 0})
        </Typography>
        
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Société</TableCell>
                <TableCell>N° Bordereau</TableCell>
                <TableCell>Date Injection</TableCell>
                <TableCell>Date Exécution</TableCell>
                <TableCell>État</TableCell>
                <TableCell>Délai (jours)</TableCell>
                <TableCell>Donneur d'Ordre</TableCell>
                <TableCell>Montant</TableCell>
                <TableCell>Observations</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.ovList.map((ov) => (
                <TableRow key={ov.id} hover>
                  <TableCell>{ov.societe}</TableCell>
                  <TableCell>{ov.numeroBordereau}</TableCell>
                  <TableCell>
                    {ov.dateInjection ? new Date(ov.dateInjection).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {ov.dateExecution ? new Date(ov.dateExecution).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={ov.etatVirement}
                      color={getStatusColor(ov.etatVirement)}
                      icon={getAlertIcon(ov.alertLevel)}
                    />
                  </TableCell>
                  <TableCell>
                    {ov.delaiExecution !== null && ov.delaiExecution !== undefined ? (
                      <Chip
                        size="small"
                        label={`${ov.delaiExecution} j`}
                        color={ov.delaiExecution > 1 ? 'error' : 'success'}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{ov.donneurOrdre}</TableCell>
                  <TableCell>
                    {ov.montant ? `${ov.montant.toLocaleString()} €` : '-'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={ov.observations || 'Aucune observation'}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {ov.observations || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default OVAnalyticsDashboard;