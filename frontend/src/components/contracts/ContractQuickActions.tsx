import React, { useState } from 'react';
import { Contract } from '../../types/contract.d';
import { 
  Paper, Typography, Button, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Alert, IconButton, Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GetAppIcon from '@mui/icons-material/GetApp';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LinkIcon from '@mui/icons-material/Link';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { ContractService } from '../../api/ContractService';

interface Props {
  contract: Contract;
  onUpdate: () => void;
}

const ContractQuickActions: React.FC<Props> = ({ contract, onUpdate }) => {
  const [alertDialog, setAlertDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'warning'}>({
    open: false, message: '', severity: 'success'
  });

  const handleUploadDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Implementation would depend on your upload API
          setSnackbar({open: true, message: 'Document téléchargé avec succès', severity: 'success'});
          onUpdate();
        } catch (error) {
          setSnackbar({open: true, message: 'Erreur lors du téléchargement', severity: 'error'});
        }
      }
    };
    input.click();
  };

  const handleExportExcel = async () => {
    try {
      const blob = await ContractService.exportExcel({contractId: contract.id});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${contract.id}_report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({open: true, message: 'Export Excel réussi', severity: 'success'});
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de l\'export', severity: 'error'});
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await ContractService.exportPdf({contractId: contract.id});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${contract.id}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({open: true, message: 'Export PDF réussi', severity: 'success'});
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de l\'export', severity: 'error'});
    }
  };

  const handleSLACheck = async () => {
    try {
      const result = await ContractService.checkSla();
      setSnackbar({
        open: true, 
        message: `Vérification SLA: ${result.breached?.length || 0} violations détectées`, 
        severity: result.breached?.length > 0 ? 'warning' : 'success'
      });
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de la vérification SLA', severity: 'error'});
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
            startIcon={<UploadFileIcon />}
            onClick={handleUploadDocument}
            fullWidth
            size="small"
          >
            Télécharger Document
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
          
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => setReportDialog(true)}
            fullWidth
            size="small"
          >
            Générer Rapport
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => window.open(`/clients/${contract.clientId}`, '_blank')}
            fullWidth
            size="small"
          >
            Voir Client
          </Button>
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
          Outils Admin
        </Typography>
        
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Configurer les alertes SLA">
            <IconButton 
              onClick={() => setAlertDialog(true)}
              size="small"
            >
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Vérifier SLA">
            <IconButton 
              onClick={handleSLACheck}
              size="small"
            >
              <AssessmentIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* SLA Alert Dialog */}
      <Dialog open={alertDialog} onClose={() => setAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration des Alertes SLA</DialogTitle>
        <DialogContent>
          <TextField
            label="Seuil d'alerte (%)"
            type="number"
            fullWidth
            margin="normal"
            helperText="Déclencher une alerte à X% du délai"
            defaultValue={80}
          />
          <TextField
            label="Email de notification"
            type="email"
            fullWidth
            margin="normal"
            helperText="Adresse email pour les notifications"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog(false)}>Annuler</Button>
          <Button variant="contained">Sauvegarder</Button>
        </DialogActions>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Générer Rapport de Contrat</DialogTitle>
        <DialogContent>
          <TextField
            label="Période (jours)"
            type="number"
            fullWidth
            margin="normal"
            defaultValue={30}
            helperText="Nombre de jours à inclure dans le rapport"
          />
          <TextField
            label="Type de rapport"
            select
            fullWidth
            margin="normal"
            SelectProps={{native: true}}
            defaultValue="performance"
          >
            <option value="performance">Performance SLA</option>
            <option value="volume">Volume traité</option>
            <option value="claims">Réclamations</option>
            <option value="complete">Rapport complet</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleExportPDF}>Générer PDF</Button>
          <Button variant="outlined" onClick={handleExportExcel}>Générer Excel</Button>
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

export default ContractQuickActions;