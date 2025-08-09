import React, { useState } from 'react';
import { 
  Paper, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Snackbar, Alert, IconButton, Tooltip 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GetAppIcon from '@mui/icons-material/GetApp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { createComplaint, exportClientsToExcel, exportClientsToPDF } from '../../services/clientService';

interface Props {
  clientId: string;
  clientName: string;
  onComplaintCreated?: () => void;
}

const ClientQuickActions: React.FC<Props> = ({ clientId, clientName, onComplaintCreated }) => {
  const [claimDialog, setClaimDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'}>({
    open: false, message: '', severity: 'success'
  });

  // Claim form
  const [claimForm, setClaimForm] = useState({
    type: '',
    severity: 'medium',
    description: ''
  });

  // Alert form
  const [alertForm, setAlertForm] = useState({
    slaThreshold: '',
    emailNotifications: true
  });

  const handleCreateClaim = async () => {
    try {
      await createComplaint({
        clientId,
        ...claimForm,
        status: 'open'
      });
      setSnackbar({open: true, message: 'Réclamation créée avec succès', severity: 'success'});
      setClaimDialog(false);
      setClaimForm({type: '', severity: 'medium', description: ''});
      if (onComplaintCreated) onComplaintCreated();
    } catch (error: any) {
      setSnackbar({open: true, message: error?.message || 'Erreur lors de la création', severity: 'error'});
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await exportClientsToExcel({clientId});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName}_report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({open: true, message: 'Export Excel réussi', severity: 'success'});
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de l\'export', severity: 'error'});
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await exportClientsToPDF({clientId});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({open: true, message: 'Export PDF réussi', severity: 'success'});
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de l\'export', severity: 'error'});
    }
  };

  return (
    <>
      <Paper elevation={1} sx={{ p: 2, position: 'sticky', top: 20 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
          Actions Rapides
        </Typography>
        
        <Stack spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setClaimDialog(true)}
            fullWidth
            size="small"
          >
            Nouvelle Réclamation
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            component="label"
            fullWidth
            size="small"
          >
            Télécharger Contrat
            <input type="file" hidden accept=".pdf" />
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            onClick={handleExportExcel}
            fullWidth
            size="small"
          >
            Export Excel
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            onClick={handleExportPDF}
            fullWidth
            size="small"
          >
            Export PDF
          </Button>
          
          <Tooltip title="Configurer les alertes SLA">
            <IconButton 
              onClick={() => setAlertDialog(true)}
              sx={{ alignSelf: 'center', mt: 1 }}
            >
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Create Claim Dialog */}
      <Dialog open={claimDialog} onClose={() => setClaimDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle Réclamation - {clientName}</DialogTitle>
        <DialogContent>
          <TextField
            label="Type de réclamation"
            value={claimForm.type}
            onChange={(e) => setClaimForm({...claimForm, type: e.target.value})}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Sévérité"
            value={claimForm.severity}
            onChange={(e) => setClaimForm({...claimForm, severity: e.target.value})}
            select
            fullWidth
            margin="normal"
            SelectProps={{native: true}}
          >
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
          </TextField>
          <TextField
            label="Description"
            value={claimForm.description}
            onChange={(e) => setClaimForm({...claimForm, description: e.target.value})}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialog(false)}>Annuler</Button>
          <Button onClick={handleCreateClaim} variant="contained">Créer</Button>
        </DialogActions>
      </Dialog>

      {/* SLA Alert Dialog */}
      <Dialog open={alertDialog} onClose={() => setAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration des Alertes SLA</DialogTitle>
        <DialogContent>
          <TextField
            label="Seuil d'alerte SLA (jours)"
            value={alertForm.slaThreshold}
            onChange={(e) => setAlertForm({...alertForm, slaThreshold: e.target.value})}
            type="number"
            fullWidth
            margin="normal"
            helperText="Déclencher une alerte si le délai dépasse ce seuil"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog(false)}>Annuler</Button>
          <Button variant="contained">Sauvegarder</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({...s, open: false}))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ClientQuickActions;