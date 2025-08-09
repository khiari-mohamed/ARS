import React, { useState, useEffect } from 'react';
import { useCreateReclamation, useUpdateReclamation } from '../../hooks/useReclamations';
import { CreateReclamationDTO, UpdateReclamationDTO, Reclamation } from '../../types/reclamation.d';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { TextField, Select, MenuItem, FormControl, InputLabel, Button, Grid, Paper, Typography, Autocomplete, Chip } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Props {
  initial?: Partial<Reclamation>;
  onSuccess: () => void;
}

const fetchClients = async () => {
  const { data } = await LocalAPI.get('/clients');
  return data;
};

const fetchContracts = async () => {
  const { data } = await LocalAPI.get('/contracts');
  return data;
};

const fetchBordereaux = async () => {
  const { data } = await LocalAPI.get('/bordereaux');
  return data;
};

export const ReclamationForm: React.FC<Props> = ({ initial = {}, onSuccess }) => {
  const [form, setForm] = useState<CreateReclamationDTO>({
    clientId: initial.clientId || '',
    type: initial.type || '',
    severity: (initial.severity as any) || 'medium',
    description: initial.description || '',
    documentId: initial.documentId,
    bordereauId: initial.bordereauId,
    assignedToId: initial.assignedToId,
    file: undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [dateReceived, setDateReceived] = useState<Date | null>(new Date());
  const [slaDeadline, setSlaDeadline] = useState<Date | null>(null);
  const [preview, setPreview] = useState(false);

  const { data: clients = [] } = useQuery(['clients'], fetchClients);
  const { data: contracts = [] } = useQuery(['contracts'], fetchContracts);
  const { data: bordereaux = [] } = useQuery(['bordereaux'], fetchBordereaux);

  const createMutation = useCreateReclamation();

  // Auto-calculate SLA deadline when client changes
  useEffect(() => {
    if (form.clientId && dateReceived) {
      const client = clients.find((c: any) => c.id === form.clientId);
      const slaDays = client?.reclamationDelay || 7;
      const deadline = new Date(dateReceived);
      deadline.setDate(deadline.getDate() + slaDays);
      setSlaDeadline(deadline);
    }
  }, [form.clientId, dateReceived, clients]);

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setForm(f => ({ ...f, file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.clientId || !form.type || !form.description) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    try {
      await createMutation.mutateAsync(form);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la soumission.');
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('reclamation_draft', JSON.stringify(form));
    alert('Brouillon sauvegardé');
  };

  const loadDraft = () => {
    const draft = localStorage.getItem('reclamation_draft');
    if (draft) {
      setForm(JSON.parse(draft));
    }
  };

  if (preview) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Aperçu de la réclamation</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography><strong>Client:</strong> {clients.find((c: any) => c.id === form.clientId)?.name || form.clientId}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Type:</strong> {form.type}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Priorité:</strong> {form.severity}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Date reçue:</strong> {dateReceived?.toLocaleDateString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Échéance SLA:</strong> {slaDeadline?.toLocaleDateString()}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Description:</strong> {form.description}</Typography>
          </Grid>
        </Grid>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => setPreview(false)}>Retour</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Envoi...' : 'Confirmer'}
          </Button>
        </div>
      </Paper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Nouvelle Réclamation</Typography>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option: any) => option.name || ''}
                value={clients.find((c: any) => c.id === form.clientId) || null}
                onChange={(_, value) => handleChange('clientId', value?.id || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Client *" required />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={contracts.filter((c: any) => c.clientId === form.clientId)}
                getOptionLabel={(option: any) => option.reference || ''}
                value={contracts.find((c: any) => c.id === form.bordereauId) || null}
                onChange={(_, value) => handleChange('bordereauId', value?.id || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Contrat/Bordereau lié" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Type de réclamation</InputLabel>
                <Select
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <MenuItem value="retard">Retard de traitement</MenuItem>
                  <MenuItem value="document manquant">Document manquant</MenuItem>
                  <MenuItem value="erreur traitement">Erreur de traitement</MenuItem>
                  <MenuItem value="qualité service">Qualité de service</MenuItem>
                  <MenuItem value="facturation">Problème de facturation</MenuItem>
                  <MenuItem value="autre">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={form.severity}
                  onChange={(e) => handleChange('severity', e.target.value)}
                >
                  <MenuItem value="low">Normale</MenuItem>
                  <MenuItem value="medium">Urgente</MenuItem>
                  <MenuItem value="critical">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date de réception"
                value={dateReceived}
                onChange={setDateReceived}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Échéance SLA (auto-calculée)"
                value={slaDeadline}
                onChange={setSlaDeadline}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true, disabled: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description détaillée *"
                multiline
                rows={4}
                fullWidth
                required
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez la réclamation en détail..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Document GED lié"
                fullWidth
                value={form.documentId || ''}
                onChange={(e) => handleChange('documentId', e.target.value)}
                placeholder="ID du document dans GED"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
              />
              <Typography variant="caption" color="textSecondary">
                Formats acceptés: PDF, Images, Documents Word
              </Typography>
            </Grid>
          </Grid>

          <div className="flex gap-2 mt-6">
            <Button onClick={loadDraft} variant="outlined">
              Charger brouillon
            </Button>
            <Button onClick={handleSaveDraft} variant="outlined">
              Sauvegarder brouillon
            </Button>
            <Button onClick={() => setPreview(true)} variant="outlined">
              Aperçu
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Envoi...' : 'Soumettre'}
            </Button>
          </div>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

export default ReclamationForm;