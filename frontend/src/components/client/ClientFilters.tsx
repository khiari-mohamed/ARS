import React, { useState } from 'react';
import { TextField, Button, Grid } from '@mui/material';

interface Props {
  onChange: (filters: { name?: string; accountManagerId?: string }) => void;
}

const ClientFilters: React.FC<Props> = ({ onChange }) => {
  const [name, setName] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');

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
        <TextField
          label="Account Manager ID"
          value={accountManagerId}
          onChange={e => setAccountManagerId(e.target.value)}
          size="small"
        />
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