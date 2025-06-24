// src/components/Client/ClientFormModal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormHelperText, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { LocalAPI } from '../../services/axios';
import { Client } from '../../types/client.d';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Client>) => void;
  client?: Client | null;
}

const ClientFormModal: React.FC<Props> = ({ open, onClose, onSubmit, client }) => {
  const [form, setForm] = useState<Partial<Client>>({
    name: '',
    reglementDelay: 0,
    reclamationDelay: 0,
    accountManagerId: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    // Fetch managers (CHEF_EQUIPE) from backend
    LocalAPI.get('/users', { params: { role: 'CHEF_EQUIPE' } })
      .then(res => setManagers(res.data || []))
      .catch(() => setManagers([]));
  }, []);

  useEffect(() => {
    if (client) setForm(client);
    else setForm({ name: '', reglementDelay: 0, reclamationDelay: 0, accountManagerId: '' });
    setErrors({});
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'reglementDelay' || name === 'reclamationDelay' ? Number(value) : value });
    setErrors((prev: any) => ({ ...prev, [name]: undefined }));
  };

const validate = () => {
  const newErrors: any = {};
  if (!form.name || !form.name.toString().trim()) newErrors.name = 'Name is required';
  
  // For reglementDelay
  if (form.reglementDelay === undefined || form.reglementDelay === null) {
    newErrors.reglementDelay = 'Reglement Delay is required';
  } else if (isNaN(Number(form.reglementDelay)) || Number(form.reglementDelay) < 0) {
    newErrors.reglementDelay = 'Must be a non-negative number';
  }
  
  // For reclamationDelay
  if (form.reclamationDelay === undefined || form.reclamationDelay === null) {
    newErrors.reclamationDelay = 'Reclamation Delay is required';
  } else if (isNaN(Number(form.reclamationDelay)) || Number(form.reclamationDelay) < 0) {
    newErrors.reclamationDelay = 'Must be a non-negative number';
  }
  
  if (!form.accountManagerId || !form.accountManagerId.toString().trim()) {
    newErrors.accountManagerId = 'Account Manager ID is required';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{client ? 'Edit Client' : 'Add Client'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid >
            <TextField
              label="Reglement Delay"
              name="reglementDelay"
              type="number"
              value={form.reglementDelay}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.reglementDelay}
              helperText={errors.reglementDelay}
            />
          </Grid>
          <Grid>
            <TextField
              label="Reclamation Delay"
              name="reclamationDelay"
              type="number"
              value={form.reclamationDelay}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.reclamationDelay}
              helperText={errors.reclamationDelay}
            />
          </Grid>
          <Grid>
            <FormControl fullWidth required error={!!errors.accountManagerId}>
              <InputLabel id="accountManagerId-label">Account Manager</InputLabel>
              <Select
                labelId="accountManagerId-label"
                name="accountManagerId"
                value={form.accountManagerId}
                onChange={e => {
                  setForm({ ...form, accountManagerId: e.target.value });
                  setErrors((prev: any) => ({ ...prev, accountManagerId: undefined }));
                }}
                label="Account Manager"
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {managers.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.fullName}</MenuItem>
                ))}
              </Select>
              {errors.accountManagerId && <FormHelperText>{errors.accountManagerId}</FormHelperText>}
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} color="primary">{client ? 'Update' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientFormModal;