import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Typography,
  IconButton,
  Grid
} from '@mui/material';
import { PlayArrow, Visibility, Warning, Refresh } from '@mui/icons-material';

interface DocumentTypeModalProps {
  open: boolean;
  onClose: () => void;
  documentType: string;
  documentTypeLabel: string;
  documentTypeIcon: string;
}

const DocumentTypeModal: React.FC<DocumentTypeModalProps> = ({
  open,
  onClose,
  documentType,
  documentTypeLabel,
  documentTypeIcon
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);

  useEffect(() => {
    if (open && documentType) {
      loadDocuments();
    }
  }, [open, documentType]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { LocalAPI } = await import('../services/axios');
      console.log('🔍 Loading documents for type:', documentType);
      
      // Get all documents and filter by type
      const response = await LocalAPI.get('/documents/search');
      const allDocuments = response.data || [];
      
      // Filter documents by the specific type
      const filteredDocuments = allDocuments.filter((doc: any) => doc.type === documentType);
      
      console.log('📊 Found documents:', {
        total: allDocuments.length,
        filtered: filteredDocuments.length,
        type: documentType
      });
      
      setDocuments(filteredDocuments);
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = async (documentId: string) => {
    setProcessing(documentId);
    try {
      const { LocalAPI } = await import('../services/axios');
      await LocalAPI.patch(`/documents/${documentId}/status`, { status: 'EN_COURS' });
      await loadDocuments();
    } catch (error) {
      console.error('Failed to start document scanning:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDocument = async (documentId: string) => {
    try {
      const { LocalAPI } = await import('../services/axios');
      const response = await LocalAPI.get(`/documents/${documentId}`);
      setSelectedDocument(response.data);
      setShowDocumentDetails(true);
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const handleStatusUpdate = async (documentId: string, newStatus: string) => {
    try {
      const { LocalAPI } = await import('../services/axios');
      await LocalAPI.patch(`/documents/${documentId}/status`, { status: newStatus });
      await loadDocuments();
    } catch (error) {
      console.error('Failed to update document status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPLOADED': return 'warning';
      case 'EN_COURS': return 'info';
      case 'TRAITE': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UPLOADED': return 'À scanner';
      case 'EN_COURS': return 'En cours';
      case 'TRAITE': return 'Traité';
      default: return status;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              {documentTypeIcon} {documentTypeLabel}
            </Typography>
            <Chip label={`${documents.length} documents`} color="primary" size="small" />
            <Box flexGrow={1} />
            <IconButton onClick={loadDocuments} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Date Upload</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => {
                  const daysPending = Math.floor((Date.now() - new Date(doc.uploadedAt).getTime()) / (24 * 60 * 60 * 1000));
                  const isUrgent = daysPending > 1;
                  
                  return (
                    <TableRow 
                      key={doc.id}
                      sx={{ 
                        backgroundColor: isUrgent ? 'rgba(255, 152, 0, 0.1)' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {isUrgent && <Warning color="warning" fontSize="small" />}
                          <Typography variant="body2" fontWeight={isUrgent ? 'bold' : 'normal'}>
                            {doc.name.replace('.pdf', '')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                          <br />
                          <Typography variant="caption" color={isUrgent ? 'warning.main' : 'text.secondary'}>
                            {daysPending} jour{daysPending > 1 ? 's' : ''}
                          </Typography>
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(doc.status)}
                          color={getStatusColor(doc.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={() => handleStartScanning(doc.id)}
                            disabled={processing === doc.id}
                          >
                            Scanner
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDocument(doc.id)}
                          >
                            Voir
                          </Button>
                          
                          {/* Status Management Buttons */}
                          {doc.status === 'UPLOADED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              onClick={() => handleStatusUpdate(doc.id, 'EN_COURS')}
                            >
                              🖨️ Démarrer
                            </Button>
                          )}
                          {doc.status === 'EN_COURS' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleStatusUpdate(doc.id, 'TRAITE')}
                            >
                              ✅ Finaliser
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {loading ? 'Chargement...' : `Aucun document ${documentTypeLabel.toLowerCase()}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Document Details Dialog */}
      <Dialog 
        open={showDocumentDetails} 
        onClose={() => setShowDocumentDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails Document - {selectedDocument?.name}
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informations Document</Typography>
                <Typography><strong>Nom:</strong> {selectedDocument.name}</Typography>
                <Typography><strong>Type:</strong> {selectedDocument.type}</Typography>
                <Typography><strong>Statut:</strong> {selectedDocument.status}</Typography>
                <Typography><strong>Téléchargé le:</strong> {new Date(selectedDocument.uploadedAt).toLocaleString()}</Typography>
                <Typography><strong>Chemin:</strong> {selectedDocument.path}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informations Scan</Typography>
                <Typography><strong>Assigné à:</strong> {selectedDocument.assignedTo?.fullName || 'Non assigné'}</Typography>
                <Typography><strong>Assigné par:</strong> {selectedDocument.assignedBy?.fullName || 'N/A'}</Typography>
                <Typography><strong>Date d'assignation:</strong> {selectedDocument.assignedAt ? new Date(selectedDocument.assignedAt).toLocaleString() : 'N/A'}</Typography>
                <Typography><strong>Priorité:</strong> {selectedDocument.priority || 'Normale'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedDocument?.status === 'EN_COURS' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={async () => {
                try {
                  const { LocalAPI } = await import('../services/axios');
                  await LocalAPI.patch(`/documents/${selectedDocument.id}/status`, { status: 'TRAITE' });
                  await loadDocuments();
                  setShowDocumentDetails(false);
                } catch (error) {
                  console.error('Failed to validate document scanning:', error);
                }
              }}
            >
              Valider Scan
            </Button>
          )}
          <Button onClick={() => setShowDocumentDetails(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentTypeModal;