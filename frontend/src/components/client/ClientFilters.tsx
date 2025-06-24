import React, { useState, useEffect } from 'react';
import { TextField, Button, Grid, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { LocalAPI } from '../../services/axios';

interface Props {
  onChange: (filters: { name?: string; accountManagerId?: string }) => void;
}

const ClientFilters: React.FC<Props> = ({ onChange }) => {
  const [name, setName] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    LocalAPI.get('/users', { params: { role: 'CHEF_EQUIPE' } })
      .then(res => setManagers(res.data || []))
      .catch(() => setManagers([]));
  }, []);

  const handleSearch = () => {
    onChange({
      name: name.trim() || undefined,
      accountManagerId: accountManagerId.trim() || undefined,
    });
  };

  const handleReset = () => {
    setName('');
    setAccountManagerId('');
    onChange({});
  };

  return (
    <Grid container spacing={2} alignItems="center" style={{ marginBottom: 16 }}>
      <Grid >
        <TextField
          label="Client Name"
          value={name}
          onChange={e => setName(e.target.value)}
          size="small"
        />
      </Grid>
      <Grid >
        <FormControl size="small" fullWidth>
          <InputLabel id="accountManagerId-label">Account Manager</InputLabel>
          <Select
            labelId="accountManagerId-label"
            value={accountManagerId}
            onChange={e => setAccountManagerId(e.target.value)}
            label="Account Manager"
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {managers.map(m => (
              <MenuItem key={m.id} value={m.id}>{m.fullName}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid>
        <Button variant="contained" color="primary" onClick={handleSearch}>Search</Button>
      </Grid>
      <Grid >
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Grid>
    </Grid>
  );
};

export default ClientFilters;