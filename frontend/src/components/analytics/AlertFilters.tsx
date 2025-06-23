import React from 'react';
import { AlertsDashboardQuery } from '../../types/alerts.d';
import { Box, TextField, MenuItem, Button, CircularProgress, Alert as MuiAlert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getClients, getTeams, getUsers } from '../../api/lookupService';

interface Props {
  filters: AlertsDashboardQuery;
  setFilters: (filters: AlertsDashboardQuery) => void;
}

const AlertFilters: React.FC<Props> = ({ filters, setFilters }) => {
  // Fetch teams, clients, users from backend
  const {
    data: teams,
    isLoading: loadingTeams,
    error: errorTeams,
  } = useQuery(['teams'], getTeams);

  const {
    data: clients,
    isLoading: loadingClients,
    error: errorClients,
  } = useQuery(['clients'], getClients);

  const {
    data: users,
    isLoading: loadingUsers,
    error: errorUsers,
  } = useQuery(['users'], getUsers);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleReset = () => setFilters({});

  const hasError = !!(errorTeams || errorClients || errorUsers);

  return (
    <>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
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
        <TextField
          select
          label="Equipe"
          name="teamId"
          value={filters.teamId || ''}
          onChange={handleChange}
          size="small"
          sx={{ minWidth: 160 }}
          disabled={loadingTeams || !!errorTeams}
        >
          <MenuItem value="">Toutes</MenuItem>
          {loadingTeams && <MenuItem disabled value=""><CircularProgress size={16} /></MenuItem>}
          {errorTeams && <MenuItem disabled value="">Erreur chargement équipes</MenuItem>}
          {(teams ?? []).map((t: any) => (
            <MenuItem key={t.id} value={t.id}>{t.fullName || t.name || t.id}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Client"
          name="clientId"
          value={filters.clientId || ''}
          onChange={handleChange}
          size="small"
          sx={{ minWidth: 160 }}
          disabled={loadingClients || !!errorClients}
        >
          <MenuItem value="">Tous</MenuItem>
          {loadingClients && <MenuItem disabled value=""><CircularProgress size={16} /></MenuItem>}
          {errorClients && <MenuItem disabled value="">Erreur chargement clients</MenuItem>}
          {(clients ?? []).map((c: any) => (
            <MenuItem key={c.id} value={c.id}>{c.name || c.id}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Utilisateur"
          name="userId"
          value={filters.userId || ''}
          onChange={handleChange}
          size="small"
          sx={{ minWidth: 160 }}
          disabled={loadingUsers || !!errorUsers}
        >
          <MenuItem value="">Tous</MenuItem>
          {loadingUsers && <MenuItem disabled value=""><CircularProgress size={16} /></MenuItem>}
          {errorUsers && <MenuItem disabled value="">Erreur chargement utilisateurs</MenuItem>}
          {(users ?? []).map((u: any) => (
            <MenuItem key={u.id} value={u.id}>{u.fullName || u.name || u.email || u.id}</MenuItem>
          ))}
        </TextField>
        <Button onClick={handleReset} variant="outlined" color="secondary">
          Réinitialiser
        </Button>
      </Box>
      {hasError && (
        <MuiAlert severity="error" sx={{ ml: 2 }}>
          {errorTeams ? 'Erreur équipes. ' : ''}
          {errorClients ? 'Erreur clients. ' : ''}
          {errorUsers ? 'Erreur utilisateurs.' : ''}
        </MuiAlert>
      )}
    </>
  );
};

export default AlertFilters;