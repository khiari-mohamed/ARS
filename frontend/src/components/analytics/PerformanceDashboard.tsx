import React, { useState, useEffect } from 'react';
import { AnalyticsPerformanceDto } from '../../types/analytics';
import { LocalAPI } from '../../services/axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import { Refresh, TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

const defaultFilters: AnalyticsPerformanceDto = {
  fromDate: undefined,
  toDate: undefined,
  teamId: undefined,
  userId: undefined,
  role: undefined,
};

interface PerformanceData {
  userId: string;
  userName: string;
  actual: number;
  expected: number;
  delta: number;
  status: 'above' | 'below' | 'on_target';
  role: string;
}

const PerformanceDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsPerformanceDto>(defaultFilters);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value || undefined });
  };

  const handleSelectChange = (e: any) => {
    setFilters({ ...filters, [e.target.name]: e.target.value || undefined });
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        users: [{
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          teamId: filters.teamId,
          userId: filters.userId,
          role: filters.role
        }]
      };
      
      const response = await LocalAPI.post('/analytics/ai/performance', payload);
      const aiData = response.data.performance || [];
      
      // Transform AI data to our format
      const transformedData: PerformanceData[] = aiData.map((item: any) => ({
        userId: item.user_id,
        userName: item.user_name || item.user_id,
        actual: item.actual,
        expected: item.expected,
        delta: item.delta,
        status: item.status === 'above_target' ? 'above' : 
                item.status === 'below_target' ? 'below' : 'on_target',
        role: item.role || 'GESTIONNAIRE'
      }));
      
      setPerformanceData(transformedData);
    } catch (e: any) {
      console.error('Performance AI Error:', e);
      setError(e.response?.data?.message || e.message);
      setPerformanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [filters]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'above':
        return <TrendingUp color="success" />;
      case 'below':
        return <TrendingDown color="error" />;
      default:
        return <Remove color="info" />;
    }
  };

  const getStatusChip = (status: string, delta: number) => {
    switch (status) {
      case 'above':
        return <Chip label={`+${delta}`} color="success" size="small" />;
      case 'below':
        return <Chip label={`${delta}`} color="error" size="small" />;
      default:
        return <Chip label="0" color="default" size="small" />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Performance par utilisateur (IA)
        </Typography>
        
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              name="fromDate"
              type="date"
              label="Date début"
              value={filters.fromDate || ''}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              name="toDate"
              type="date"
              label="Date fin"
              value={filters.toDate || ''}
              onChange={handleFilterChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              name="teamId"
              label="ID équipe"
              value={filters.teamId || ''}
              onChange={handleFilterChange}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              name="userId"
              label="ID utilisateur"
              value={filters.userId || ''}
              onChange={handleFilterChange}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Rôle</InputLabel>
              <Select
                name="role"
                value={filters.role || ''}
                onChange={handleSelectChange}
                label="Rôle"
              >
                <MenuItem value="">Tous rôles</MenuItem>
                <MenuItem value="GESTIONNAIRE">Gestionnaire</MenuItem>
                <MenuItem value="CHEF_EQUIPE">Chef d'équipe</MenuItem>
                <MenuItem value="CLIENT_SERVICE">Service Client</MenuItem>
                <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setFilters(defaultFilters)}
              fullWidth
              size="small"
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Erreur chargement performance: {error}
          </Alert>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Utilisateur</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Réel</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Attendu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Delta</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {performanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Aucun utilisateur trouvé pour les filtres sélectionnés.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  performanceData.map((user) => (
                    <TableRow key={user.userId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {user.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.userId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={500}>
                          {user.actual}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {user.expected}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(user.status, user.delta)}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center">
                          {getStatusIcon(user.status)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboard;