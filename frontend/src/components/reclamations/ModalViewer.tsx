import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface ModalViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  fileType: 'pdf' | 'image';
}

export const ModalViewer: React.FC<ModalViewerProps> = ({
  open,
  onClose,
  title,
  fileUrl,
  fileType
}) => {
  const renderContent = () => {
    if (fileType === 'pdf') {
      return (
        <iframe
          src={fileUrl}
          width="100%"
          height="600px"
          style={{ border: 'none' }}
          title={title}
        />
      );
    } else {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <img
            src={fileUrl}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
          />
        </Box>
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {title}
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button
          variant="contained"
          onClick={() => window.open(fileUrl, '_blank')}
        >
          Ouvrir dans un nouvel onglet
        </Button>
      </DialogActions>
    </Dialog>
  );
};