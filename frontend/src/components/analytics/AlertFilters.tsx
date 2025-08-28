import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Paper,
  Grid
} from '@mui/material';
import { AlertsDashboardQuery } from '../../types/alerts.d';

interface AlertFiltersProps {
  filters: AlertsDashboardQuery;
  setFilters: (filters: AlertsDashboardQuery) => void;
}

const AlertFilters: React.FC<AlertFiltersProps> = ({ filters, setFilters }) => {
  const handleFilterChange = (field: keyof AlertsDashboardQuery, value: any) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleReset = () => {
    setFilters({});
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            size="small"
            label="Type d'Alerte"
            value={filters.alertType || ''}
            onChange={(e) => handleFilterChange('alertType', e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="SLA_BREACH">Dépassement SLA</MenuItem>
            <MenuItem value="PERFORMANCE">Performance</MenuItem>
            <MenuItem value="WORKLOAD">Charge de Travail</MenuItem>
            <MenuItem value="CLAIM">Réclamation</MenuItem>
            <MenuItem value="SYSTEM">Système</MenuItem>
          </TextField>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            size="small"
            label="Statut"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="ACTIVE">Actif</MenuItem>
            <MenuItem value="ACKNOWLEDGED">Acquitté</MenuItem>
            <MenuItem value="RESOLVED">Résolu</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Équipe ID"
            value={filters.teamId || ''}
            onChange={(e) => handleFilterChange('teamId', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Client ID"
            value={filters.clientId || ''}
            onChange={(e) => handleFilterChange('clientId', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Date début"
            InputLabelProps={{ shrink: true }}
            value={filters.fromDate || ''}
            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Date fin"
            InputLabelProps={{ shrink: true }}
            value={filters.toDate || ''}
            onChange={(e) => handleFilterChange('toDate', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleReset}
          >
            Réinitialiser
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AlertFilters;