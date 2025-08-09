import React, { useState } from 'react';
import { Contract } from '../../../types/contract.d';
import { 
  Paper, Typography, Box, Button, List, ListItem, ListItemIcon, 
  ListItemText, ListItemSecondaryAction, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HistoryIcon from '@mui/icons-material/History';

interface Props {
  contract: Contract;
  onUpdate: () => void;
}

const ContractDocumentsTab: React.FC<Props> = ({ contract, onUpdate }) => {
  const [previewDialog, setPreviewDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Implementation would depend on your upload API
        console.log('Uploading file:', file.name);
        onUpdate();
      }
    };
    input.click();
  };

  const handleDownload = () => {
    if (contract.documentPath) {
      const a = document.createElement('a');
      a.href = contract.documentPath;
      a.download = `contract_${contract.id}.pdf`;
      a.click();
    }
  };

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const getFileIcon = (path: string) => {
    const ext = getFileExtension(path);
    return <DescriptionIcon color={ext === 'pdf' ? 'error' : 'primary'} />;
  };

  const mockVersions = [
    { version: 2, date: '2025-01-15', author: 'Admin', changes: 'Mise à jour des délais SLA' },
    { version: 1, date: '2025-01-01', author: 'Manager', changes: 'Version initiale' }
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Documents du Contrat</Typography>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleUpload}
          size="small"
        >
          Télécharger Nouvelle Version
        </Button>
      </Box>

      {/* Current Document */}
      {contract.documentPath ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Document Actuel</Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                {getFileIcon(contract.documentPath)}
              </ListItemIcon>
              <ListItemText
                primary={`Contrat v${contract.version || 1}`}
                secondary={`Dernière modification: ${new Date(contract.updatedAt).toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => setPreviewDialog(true)} size="small">
                  <VisibilityIcon />
                </IconButton>
                <IconButton onClick={handleDownload} size="small">
                  <DownloadIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', mb: 2 }}>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            Aucun document téléchargé
          </Typography>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleUpload}
          >
            Télécharger le Premier Document
          </Button>
        </Paper>
      )}

      {/* Version History */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">Historique des Versions</Typography>
          <IconButton onClick={() => setHistoryDialog(true)} size="small">
            <HistoryIcon />
          </IconButton>
        </Box>
        
        <List dense>
          {mockVersions.slice(0, 3).map((version, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <Chip label={`v${version.version}`} size="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={version.changes}
                secondary={`${version.author} - ${version.date}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Aperçu du Document</DialogTitle>
        <DialogContent>
          {contract.documentPath && getFileExtension(contract.documentPath) === 'pdf' ? (
            <iframe
              src={contract.documentPath}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title="Document Preview"
            />
          ) : (
            <Typography>
              Aperçu non disponible pour ce type de fichier. 
              Veuillez télécharger le document pour le consulter.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Fermer</Button>
          <Button onClick={handleDownload} variant="contained">Télécharger</Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Historique Complet des Versions</DialogTitle>
        <DialogContent>
          <List>
            {mockVersions.map((version, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>
                  <Chip 
                    label={`v${version.version}`} 
                    size="small" 
                    color={index === 0 ? 'primary' : 'default'} 
                  />
                </ListItemIcon>
                <ListItemText
                  primary={version.changes}
                  secondary={`Modifié par ${version.author} le ${version.date}`}
                />
                <ListItemSecondaryAction>
                  <IconButton size="small">
                    <DownloadIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractDocumentsTab;