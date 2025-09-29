import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Schedule
} from '@mui/icons-material';
import { financeService } from '../../services/financeService';
import { useAuth } from '../../contexts/AuthContext';

interface PendingOV {
  id: string;
  reference: string;
  client: string;
  donneurOrdre: string;
  montantTotal: number;
  nombreAdherents: number;
  dateCreation: string;
  utilisateurSante: string;
}

const OVValidationTab: React.FC = () => {
  const [pendingOVs, setPendingOVs] = useState<PendingOV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOV, setSelectedOV] = useState<PendingOV | null>(null);
  const [validationDialog, setValidationDialog] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [validating, setValidating] = useState(false);
  const { user } = useAuth();

  const loadPendingOVs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Loading pending OVs...');
      console.log('🔍 User:', user);
      console.log('🔍 API URL:', `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/pending-validation`);
      
      const data = await financeService.getPendingValidationOVs();
      console.log('✅ Pending OVs loaded:', data);
      setPendingOVs(data);
    } catch (err: any) {
      console.error('❌ Error loading pending OVs:', err);
      console.error('❌ Error response:', err?.response);
      console.error('❌ Error data:', err?.response?.data);
      setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement');
      setPendingOVs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (approved: boolean) => {
    if (!selectedOV) return;
    
    try {
      setValidating(true);
      await financeService.validateOV(selectedOV.id, approved, validationComment);
      
      // Remove from pending list
      setPendingOVs(prev => prev.filter(ov => ov.id !== selectedOV.id));
      
      // Close dialog
      setValidationDialog(false);
      setSelectedOV(null);
      setValidationComment('');
      
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const openValidationDialog = (ov: PendingOV) => {
    setSelectedOV(ov);
    setValidationDialog(true);
    setValidationComment('');
  };

  const closeValidationDialog = () => {
    setValidationDialog(false);
    setSelectedOV(null);
    setValidationComment('');
  };

  useEffect(() => {
    loadPendingOVs();
  }, []);

  // Check if user has validation permissions
  if (!user || !['RESPONSABLE_DEPARTEMENT', 'SUPER_ADMIN'].includes(user.role)) {
    return (
      <Alert severity="warning">
        Accès refusé. Seuls les Responsables de Département peuvent valider les OV.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Chargement des OV en attente...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Validation des Ordres de Virement
        </Typography>
        <Button variant="outlined" onClick={loadPendingOVs}>
          Actualiser
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Étape 3 du processus OV:</strong> Validation par le Responsable de Département avant transmission au Chef d'Équipe
        </Typography>
      </Alert>

      {/* Pending OVs Table */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            OV en Attente de Validation ({pendingOVs.length})
          </Typography>
          
          {pendingOVs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Aucun OV en attente de validation
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Les nouveaux ordres de virement apparaîtront ici pour validation
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Référence</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Donneur d'Ordre</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Adhérents</TableCell>
                    <TableCell>Date Création</TableCell>
                    <TableCell>Créé par</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingOVs.map((ov) => (
                    <TableRow key={ov.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {ov.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>{ov.client}</TableCell>
                      <TableCell>{ov.donneurOrdre}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {ov.montantTotal.toLocaleString('fr-TN')} TND
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={ov.nombreAdherents} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(ov.dateCreation).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>{ov.utilisateurSante}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => openValidationDialog(ov)}
                          >
                            Valider
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => openValidationDialog(ov)}
                          >
                            Rejeter
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={validationDialog} onClose={closeValidationDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Validation de l'OV: {selectedOV?.reference}
        </DialogTitle>
        <DialogContent>
          {selectedOV && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Client: {selectedOV.client}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Montant: {selectedOV.montantTotal.toLocaleString('fr-TN')} TND
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Adhérents: {selectedOV.nombreAdherents}
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Commentaire (optionnel)"
            value={validationComment}
            onChange={(e) => setValidationComment(e.target.value)}
            placeholder="Ajoutez un commentaire sur cette validation..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeValidationDialog} disabled={validating}>
            Annuler
          </Button>
          <Button
            onClick={() => handleValidation(false)}
            color="error"
            variant="outlined"
            disabled={validating}
            startIcon={validating ? <CircularProgress size={16} /> : <Cancel />}
          >
            Rejeter
          </Button>
          <Button
            onClick={() => handleValidation(true)}
            color="success"
            variant="contained"
            disabled={validating}
            startIcon={validating ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OVValidationTab;