import React from 'react';
import { ReclamationSeverity, ReclamationStatus } from '../../types/reclamation.d';
import { Box, TextField, MenuItem, Button } from '@mui/material';

interface FilterPanelProps {
  filters: {
    clientId?: string;
    status?: ReclamationStatus;
    severity?: ReclamationSeverity;
    type?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  onChange: (filters: any) => void;
  clients: { id: string; name: string }[];
  users: { id: string; fullName: string }[];
  types: string[];
  className?: string;
}

const NAVY = '#1e3a5f';

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  clients,
  users,
  types,
  className = '',
}) => {
  const handleChange = (key: string, value: any) => onChange({ ...filters, [key]: value });

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_CLIENT_REPLY', 'RESOLVED', 'CLOSED'];

  return (
    <Box
      className={`reclamations-filter-panel ${className}`}
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
        alignItems: 'center',
      }}
    >
      <TextField
        label="Client"
        size="small"
        select
        value={filters.clientId || ''}
        onChange={(e) => handleChange('clientId', e.target.value)}
      >
        <MenuItem value="">Tous</MenuItem>
        {clients.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Statut"
        size="small"
        select
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
      >
        <MenuItem value="">Tous</MenuItem>
        {statusOptions.map((s) => (
          <MenuItem key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Gravité"
        size="small"
        select
        value={filters.severity || ''}
        onChange={(e) => handleChange('severity', e.target.value)}
      >
        <MenuItem value="">Toutes</MenuItem>
        {['low', 'medium', 'critical'].map((s) => (
          <MenuItem key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Type"
        size="small"
        select
        value={filters.type || ''}
        onChange={(e) => handleChange('type', e.target.value)}
      >
        <MenuItem value="">Tous</MenuItem>
        {types.map((t) => (
          <MenuItem key={t} value={t}>
            {t}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Assigné à"
        size="small"
        select
        value={filters.assignedToId || ''}
        onChange={(e) => handleChange('assignedToId', e.target.value)}
      >
        <MenuItem value="">Tous</MenuItem>
        {users.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            {u.fullName}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Du"
        type="date"
        size="small"
        InputLabelProps={{ shrink: true }}
        value={filters.dateFrom || ''}
        onChange={(e) => handleChange('dateFrom', e.target.value)}
      />

      <TextField
        label="Au"
        type="date"
        size="small"
        InputLabelProps={{ shrink: true }}
        value={filters.dateTo || ''}
        onChange={(e) => handleChange('dateTo', e.target.value)}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onChange(filters)}
          sx={{
            backgroundColor: NAVY,
            '&:hover': { backgroundColor: '#15294a' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Filtrer
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onChange({})}
          sx={{ borderColor: NAVY, color: NAVY, textTransform: 'none', fontWeight: 600 }}
        >
          Réinitialiser
        </Button>
      </Box>
    </Box>
  );
};