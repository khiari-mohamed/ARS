import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  LinearProgress
} from '@mui/material';
import { createBOBatch } from '../services/boService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BOBatchForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Create sample batch entries for demo
      const sampleEntries = [
        {
          documentType: 'BS',
          nombreDocuments: 5,
          delaiReglement: 30
        },
        {
          documentType: 'CONTRAT',
          nombreDocuments: 2,
          delaiReglement: 45
        }
      ];
      
      const result = await createBOBatch(sampleEntries);
      
      if (result && (result.successCount > 0 || result.success)) {
        onSuccess();
        onClose();
      } else {
        setError('Erreur lors de la création du lot');
      }
    } catch (error: any) {
      console.error('Batch creation error:', error);
      setError(error.response?.data?.message || error.message || 'Erreur lors de la création du lot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Création de Lot BO</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Cette fonctionnalité créera un lot d'entrées de test pour démonstration.
          </Typography>
          
          {loading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Création du lot en cours...
              </Typography>
            </Box>
          )}
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
          {loading ? 'Création...' : 'Créer le Lot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BOBatchForm;