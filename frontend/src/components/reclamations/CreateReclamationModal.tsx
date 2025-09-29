import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { LocalAPI } from '../../services/axios';

interface Props {
  open: boolean;
  onClose: () => void;
  onReclamationCreated: () => void;
}

const CreateReclamationModal: React.FC<Props> = ({ open, onClose, onReclamationCreated }) => {
  const [form, setForm] = useState({
    clientId: '',
    type: 'REMBOURSEMENT',
    severity: 'MOYENNE',
    description: '',
    department: 'RECLAMATIONS'
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchClients();
      setForm({
        clientId: '',
        type: 'REMBOURSEMENT',
        severity: 'MOYENNE',
        description: '',
        department: 'RECLAMATIONS'
      });
      setError(null);
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const { data } = await LocalAPI.get('/clients');
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.clientId || !form.description.trim()) {
      setError('Client et description sont requis');
      return;
    }

    setLoading(true);
    try {
      await LocalAPI.post('/reclamations', form);
      onReclamationCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Créer une Réclamation
        <Typography variant="body2" color="text.secondary">
          Créer une nouvelle réclamation
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Client</InputLabel>
            <Select
              value={form.clientId}
              onChange={(e) => handleChange('clientId', e.target.value)}
              label="Client"
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Type"
            >
              <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
              <MenuItem value="DELAI">Délai</MenuItem>
              <MenuItem value="QUALITE_SERVICE">Qualité de service</MenuItem>
              <MenuItem value="ERREUR">Erreur</MenuItem>
              <MenuItem value="AUTRE">Autre</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Gravité</InputLabel>
            <Select
              value={form.severity}
              onChange={(e) => handleChange('severity', e.target.value)}
              label="Gravité"
            >
              <MenuItem value="BASSE">Basse</MenuItem>
              <MenuItem value="MOYENNE">Moyenne</MenuItem>
              <MenuItem value="HAUTE">Haute</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            required
            fullWidth
            placeholder="Décrivez la réclamation en détail..."
          />

          <TextField
            label="Département"
            value={form.department}
            onChange={(e) => handleChange('department', e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReclamationModal;