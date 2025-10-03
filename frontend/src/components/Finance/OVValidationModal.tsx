import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

interface OVValidationModalProps {
  open: boolean;
  onClose: () => void;
  ovId: string;
  ovReference: string;
  onValidated: () => void;
}

const OVValidationModal: React.FC<OVValidationModalProps> = ({
  open,
  onClose,
  ovId,
  ovReference,
  onValidated
}) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [ovDetails, setOvDetails] = useState<any>(null);

  React.useEffect(() => {
    if (open && ovId) {
      loadOVDetails();
    }
  }, [open, ovId]);

  const loadOVDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('OV Details:', data);
        console.log('Bordereau:', data.bordereau);
        setOvDetails(data);
      }
    } catch (error) {
      console.error('Failed to load OV details:', error);
    }
  };

  const handleValidate = async (approved: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validation/${ovId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            approved,
            comment: comment || undefined
          })
        }
      );

      if (response.ok) {
        alert(approved ? 'OV validé avec succès!' : 'OV rejeté');
        onValidated();
        onClose();
      } else {
        alert('Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Validation Ordre de Virement
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Référence:</strong> {ovReference}
        </Alert>

        {ovDetails && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Montant Total
                </Typography>
                <Typography variant="h6">
                  {ovDetails.montantTotal?.toLocaleString('fr-TN')} TND
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Nombre d'Adhérents
                </Typography>
                <Typography variant="h6">
                  {ovDetails.nombreAdherents}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Donneur d'Ordre
                </Typography>
                <Typography variant="body1">
                  {ovDetails.donneurOrdre?.nom || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Date de Création
                </Typography>
                <Typography variant="body1">
                  {new Date(ovDetails.dateCreation).toLocaleString('fr-FR')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Référence Bordereau
                </Typography>
                <Typography variant="body1">
                  {ovDetails.bordereau?.reference || 'Entrée manuelle'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Commentaire (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ajoutez un commentaire si nécessaire..."
          sx={{ mb: 2 }}
        />

        <Alert severity="warning">
          <strong>Attention:</strong> Cette action est irréversible. Veuillez vérifier les informations avant de valider.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
        >
          Annuler
        </Button>
        <Button
          onClick={() => handleValidate(false)}
          disabled={loading}
          variant="outlined"
          color="error"
          startIcon={loading ? <CircularProgress size={20} /> : <Cancel />}
        >
          Rejeter
        </Button>
        <Button
          onClick={() => handleValidate(true)}
          disabled={loading}
          variant="contained"
          color="success"
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
        >
          Approuver
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OVValidationModal;
