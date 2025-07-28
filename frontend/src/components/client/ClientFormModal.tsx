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
  const [form, setForm] = useState({
  name: '',
  reglementDelay: 0,
  reclamationDelay: 0,
  gestionnaireIds: [] as string[],
});
  const [errors, setErrors] = useState<any>({});
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    // Fetch managers (GESTIONNAIRE) from backend
    LocalAPI.get('/users', { params: { role: 'GESTIONNAIRE' } })
      .then(res => setManagers(res.data || []))
      .catch(() => setManagers([]));
  }, []);

  useEffect(() => {
    if (client) setForm({ ...client, gestionnaireIds: client.gestionnaires?.map((g: any) => g.id) || [] });
    else setForm({ name: '', reglementDelay: 0, reclamationDelay: 0, gestionnaireIds: [] });
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
  
  if (!form.gestionnaireIds || form.gestionnaireIds.length === 0) {
    newErrors.gestionnaireIds = 'At least one gestionnaire is required';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    if (!validate()) return;
    try {
      await onSubmit(form);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'An error occurred');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{client ? 'Edit Client' : 'Add Client'}</DialogTitle>
      <DialogContent>
        {formError && <div style={{ color: 'red', marginBottom: 8 }}>{formError}</div>}
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
            <FormControl fullWidth required error={!!errors.gestionnaireIds}>
              <InputLabel id="gestionnaireIds-label">Gestionnaires</InputLabel>
              <Select
                labelId="gestionnaireIds-label"
                name="gestionnaireIds"
                multiple
                value={form.gestionnaireIds || []}
                onChange={e => {
                  setForm({ ...form, gestionnaireIds: e.target.value as string[] });
                  setErrors((prev: any) => ({ ...prev, gestionnaireIds: undefined }));
                }}
                label="Gestionnaires"
                renderValue={(selected) => (selected as string[]).map(id => managers.find(m => m.id === id)?.fullName).join(', ')}
              >
                {managers.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.fullName}</MenuItem>
                ))}
              </Select>
              {errors.gestionnaireIds && <FormHelperText>{errors.gestionnaireIds}</FormHelperText>}
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