import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Divider,
  Stack,
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  AutoFixHigh,
  Visibility,
  CheckCircle,
  Warning,
  Edit,
  Close,
  Add,
  Description,
  FilterList
} from '@mui/icons-material';

interface ReturnedBordereauHandlerProps {
  onCorrectionComplete?: () => void;
}

const ReturnedBordereauHandler: React.FC<ReturnedBordereauHandlerProps> = ({ onCorrectionComplete }) => {
  const [returnedBordereaux, setReturnedBordereaux] = useState<any[]>([]);
  const [selectedBordereau, setSelectedBordereau] = useState<any>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modifyBordereau, setModifyBordereau] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [newReference, setNewReference] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newDateReception, setNewDateReception] = useState('');
  const [documentNameFilter, setDocumentNameFilter] = useState('');
  const [documentStatusFilter, setDocumentStatusFilter] = useState('');
  const [addingBS, setAddingBS] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadReturnedBordereaux();
    loadClients();
    const interval = setInterval(loadReturnedBordereaux, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadClients = async () => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/clients');
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadReturnedBordereaux = async () => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/scan/returned-bordereaux');
      setReturnedBordereaux(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load returned bordereaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectBordereau = async (bordereau: any) => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get(`/scan/bordereau/${bordereau.id}`);
      setSelectedBordereau(response.data);
      setCorrectionDialogOpen(true);
    } catch (error) {
      console.error('Failed to load bordereau details:', error);
      alert('❌ Erreur lors du chargement des détails du bordereau');
    }
  };

  const handleReplaceDocument = (documentName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentName', documentName);
          
          const { LocalAPI } = await import('../../services/axios');
          await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/replace-document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          alert('✅ Document remplacé avec succès');
          const updatedResponse = await LocalAPI.get(`/scan/bordereau/${selectedBordereau.id}`);
          setSelectedBordereau(updatedResponse.data);
        } catch (error: any) {
          alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
        }
      }
    };
    input.click();
  };

  const handleAddMissingDocument = () => {
    if (!selectedDocumentType) {
      alert('⚠️ Veuillez sélectionner un type de document');
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', selectedDocumentType);
          
          const { LocalAPI } = await import('../../services/axios');
          await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/add-missing-document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          alert('✅ Document manquant ajouté avec succès');
          const updatedResponse = await LocalAPI.get(`/scan/bordereau/${selectedBordereau.id}`);
          setSelectedBordereau(updatedResponse.data);
          setSelectedDocumentType('');
        } catch (error: any) {
          alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
        }
      }
    };
    input.click();
  };

  const handleAddBulletins = () => {
    if (!selectedBordereau) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif';
    input.multiple = true;
    input.onchange = async (event: Event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      setAddingBS(true);
      try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const { LocalAPI } = await import('../../services/axios');
        const response = await LocalAPI.post(
          `/bordereaux/${selectedBordereau.id}/bs/upload-multiple`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Erreur lors de l\'ajout des BS');
        }

        const updatedResponse = await LocalAPI.get(`/scan/bordereau/${selectedBordereau.id}`);
        setSelectedBordereau(updatedResponse.data);
        await loadReturnedBordereaux();

        alert(
          `${response.data.bsCreated || files.length} BS ajouté(s) avec succès. ` +
          'Les statuts des BS existants ont été conservés.'
        );
      } catch (error: any) {
        alert(`❌ Erreur lors de l'ajout des BS: ${error.response?.data?.message || error.message}`);
      } finally {
        setAddingBS(false);
      }
    };
    input.click();
  };

  const handleCompleteCorrections = async () => {
    if (selectedBordereau) {
      try {
        const { LocalAPI } = await import('../../services/axios');
        await LocalAPI.post(`/scan/bordereau/${selectedBordereau.id}/complete-corrections`);
        
        alert('✅ Corrections terminées - Le bordereau est prêt pour re-scan');
        setCorrectionDialogOpen(false);
        setSelectedBordereau(null);
        setSelectedDocumentType('');
        await loadReturnedBordereaux();
        onCorrectionComplete?.();
      } catch (error: any) {
        alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleOpenModifyDialog = (bordereau: any) => {
    setModifyBordereau(bordereau);
    setNewReference(bordereau.reference);
    setNewClientId(bordereau.clientId?.toString() || '');
    setNewDateReception(bordereau.dateReception ? new Date(bordereau.dateReception).toISOString().split('T')[0] : '');
    setModifyDialogOpen(true);
  };

  const handleSaveModifications = async () => {
    if (!modifyBordereau) return;
    
    try {
      const { LocalAPI } = await import('../../services/axios');
      const payload: any = {};
      if (newReference !== modifyBordereau.reference) payload.reference = newReference;
      if (newClientId && newClientId !== modifyBordereau.clientId?.toString()) {
        payload.clientId = newClientId;
      }
      if (newDateReception) {
        const originalDate = modifyBordereau.dateReception ? new Date(modifyBordereau.dateReception).toISOString().split('T')[0] : '';
        if (newDateReception !== originalDate) {
          payload.dateReception = newDateReception;
        }
      }
      
      await LocalAPI.patch(`/scan/bordereau/${modifyBordereau.id}/modify`, payload);
      
      alert('✅ Bordereau modifié avec succès');
      setModifyDialogOpen(false);
      setModifyBordereau(null);
      await loadReturnedBordereaux();
    } catch (error: any) {
      alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    }
  };

  // Paginated data
  const paginatedBordereaux = useMemo(() => {
    const start = page * rowsPerPage;
    return returnedBordereaux.slice(start, start + rowsPerPage);
  }, [returnedBordereaux, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
          <CircularProgress size={24} color="warning" />
          <Typography color="text.secondary">Chargement des bordereaux retournés...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (returnedBordereaux.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Card
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
          border: '1px solid rgba(255, 152, 0, 0.2)'
        }}
      >
        {/* Gradient Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            px: 3,
            py: 2.5,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Warning sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Bordereaux Retournés pour Correction
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Rejetés par le chef d'équipe — Action requise
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={`${returnedBordereaux.length} bordereau${returnedBordereaux.length > 1 ? 'x' : ''}`}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.25)', 
              color: 'white', 
              fontWeight: 700,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          />
        </Box>

        <CardContent sx={{ p: 3, bgcolor: '#fffaf3' }}>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              border: '1px solid #ffcc80',
              '& .MuiAlert-icon': { fontSize: 24 }
            }}
          >
            Ces bordereaux ont été rejetés et nécessitent une correction des documents avant re-soumission.
          </Alert>

          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 2, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #f0f0f0'
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }}>TYPE</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }}>RÉFÉRENCE</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }}>CLIENT</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }}>DOCUMENT RETOURNÉ</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }}>DATE RETOUR</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.8rem' }} align="center">ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBordereaux.map((item: any, idx: number) => (
                  <TableRow 
                    key={`${item.id}-${item.returnType}-${item.returnedDocument?.id || 'all'}`}
                    sx={{ 
                      bgcolor: idx % 2 === 0 ? 'white' : '#fafafa',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: '#fff8e1' }
                    }}
                  >
                    <TableCell>
                      <Chip 
                        label={item.returnType === 'BORDEREAU'
                          ? '🔴 Bordereau'
                          : `🟠 ${item.returnedDocument?.type || 'Document'}`}
                        color={item.returnType === 'BORDEREAU' ? 'error' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="700" color="text.primary">
                        {item.reference}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.client?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.returnedDocument ? (
                        <Chip 
                          label={item.returnedDocument.name} 
                          color="warning" 
                          size="small" 
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      ) : (
                        <Chip 
                          label={`${item.documents?.length || 0} doc(s)`} 
                          color="error" 
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.returnedAt || item.updatedAt).toLocaleDateString('fr-FR')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<AutoFixHigh sx={{ fontSize: 16 }} />}
                          onClick={() => handleCorrectBordereau(item)}
                          sx={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 600, 
                            textTransform: 'none',
                            borderRadius: 2,
                            boxShadow: '0 2px 6px rgba(255,152,0,0.3)',
                            '&:hover': { boxShadow: '0 4px 10px rgba(255,152,0,0.4)' }
                          }}
                        >
                          {item.returnType === 'DOCUMENT' ? 'Corriger Document' : 'Corriger'}
                        </Button>
                        <Tooltip title="Modifier les informations du bordereau">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<Edit sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenModifyDialog(item)}
                            sx={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 600, 
                              textTransform: 'none',
                              borderRadius: 2
                            }}
                          >
                            Modifier
                          </Button>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={returnedBordereaux.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              sx={{
                borderTop: '1px solid #f0f0f0',
                '& .MuiTablePagination-toolbar': { minHeight: 52 }
              }}
            />
          </TableContainer>
        </CardContent>
      </Card>

      {/* Document Correction Dialog */}
      <Dialog 
        open={correctionDialogOpen} 
        onClose={() => {
          setCorrectionDialogOpen(false);
          setSelectedBordereau(null);
          setSelectedDocumentType('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            color: 'white',
            p: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              🔄 Correction Documents
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {selectedBordereau?.reference} — Rejeté par le chef d'équipe
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setCorrectionDialogOpen(false);
              setSelectedBordereau(null);
              setSelectedDocumentType('');
            }}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
          {selectedBordereau && (
            <Box>
              {/* Documents Section */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Description sx={{ color: '#e65100' }} />
                  <Typography variant="h6" sx={{ color: '#e65100', fontWeight: 700 }}>
                    Documents de ce bordereau
                  </Typography>
                </Box>
                
                {/* Filters */}
                <Paper 
                  variant="outlined"
                  sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <FilterList fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      FILTRES
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nom du document"
                        placeholder="Ex: moadhcv.pdf"
                        value={documentNameFilter}
                        onChange={(e) => setDocumentNameFilter(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Statut</InputLabel>
                        <Select
                          value={documentStatusFilter}
                          onChange={(e) => setDocumentStatusFilter(e.target.value)}
                          label="Statut"
                        >
                          <MenuItem value="">Tous les statuts</MenuItem>
                          <MenuItem value="UPLOADED">UPLOADED</MenuItem>
                          <MenuItem value="SCANNE">SCANNE</MenuItem>
                          <MenuItem value="RETOURNER_AU_SCAN">RETOURNER_AU_SCAN</MenuItem>
                          <MenuItem value="TRAITE">TRAITE</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
                
                {selectedBordereau.documents && selectedBordereau.documents.length > 0 ? (
                  <Stack spacing={1.5}>
                    {selectedBordereau.documents
                      .filter((doc: any) => {
                        const nameMatch = !documentNameFilter || doc.name.toLowerCase().includes(documentNameFilter.toLowerCase());
                        const statusMatch = !documentStatusFilter || doc.status === documentStatusFilter;
                        return nameMatch && statusMatch;
                      })
                      .map((doc: any) => (
                        <Paper
                          key={doc.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                            '&:hover': { 
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              borderColor: '#ff9800'
                            }
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight="700" sx={{ color: '#212121', mb: 0.5 }}>
                              {doc.name}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip 
                                label={doc.type} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', fontWeight: 500 }}
                              />
                              <Chip 
                                label={doc.status} 
                                size="small" 
                                color={doc.status === 'SCANNE' ? 'success' : 'warning'}
                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            </Stack>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<Visibility sx={{ fontSize: 16 }} />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${doc.id}`);
                                  
                                  if (response.data.success && response.data.pdfUrl) {
                                    const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
                                    let pdfUrl = response.data.pdfUrl;
                                    
                                    const uploadsIndex = pdfUrl.indexOf('/uploads/');
                                    if (uploadsIndex !== -1) {
                                      pdfUrl = pdfUrl.substring(uploadsIndex);
                                    }
                                    
                                    const cleanedPdfUrl = pdfUrl.replace(/\/\/+/g, '/');
                                    const fullPdfUrl = `${serverBaseUrl}${cleanedPdfUrl}`;
                                    
                                    window.open(fullPdfUrl, '_blank');
                                  } else {
                                    alert(response.data.error || `PDF non disponible pour le document: ${doc.name}`);
                                  }
                                } catch (error) {
                                  console.error('Failed to open PDF:', error);
                                  alert('❌ Erreur lors de l\'ouverture du PDF');
                                }
                              }}
                              sx={{ fontSize: '0.7rem', textTransform: 'none', borderRadius: 2 }}
                            >
                              Voir PDF
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<AutoFixHigh sx={{ fontSize: 16 }} />}
                              onClick={() => handleReplaceDocument(doc.name)}
                              sx={{ 
                                fontSize: '0.7rem', 
                                textTransform: 'none', 
                                borderRadius: 2,
                                boxShadow: '0 2px 6px rgba(255,152,0,0.3)'
                              }}
                            >
                              Remplacer
                            </Button>
                          </Stack>
                        </Paper>
                      ))}
                  </Stack>
                ) : (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Aucun document trouvé pour ce bordereau
                  </Alert>
                )}
              </Paper>

              <Divider sx={{ my: 3 }}>
                <Chip label="ACTIONS D'AJOUT" size="small" sx={{ fontWeight: 700, color: 'text.secondary' }} />
              </Divider>

              {/* Add BS Section */}
              <Paper 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  border: '1px solid #90caf9'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Add sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#0d47a1', fontWeight: 700 }}>
                      Ajouter des Bulletins de Soins
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1565c0' }}>
                      Ajout unitaire ou en masse
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.7)' }}>
                  Les statuts existants (Traité / En cours) ne seront pas modifiés.
                </Alert>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={addingBS}
                  onClick={handleAddBulletins}
                  startIcon={addingBS ? <CircularProgress size={16} color="inherit" /> : <Add />}
                  sx={{ 
                    py: 1.2, 
                    borderRadius: 2, 
                    fontWeight: 700, 
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                  }}
                >
                  {addingBS ? 'Ajout des BS en cours...' : 'Sélectionner et Ajouter'}
                </Button>
              </Paper>

              {/* Add Missing Document Section */}
              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  border: '1px solid #a5d6a7'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: '#2e7d32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Description sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1b5e20', fontWeight: 700 }}>
                      Ajouter un document manquant
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2e7d32' }}>
                      Sélectionner le type puis le fichier
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: 'white', borderRadius: 1 }}>
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={selectedDocumentType}
                        onChange={(e) => setSelectedDocumentType(e.target.value)}
                        label="Type de document"
                      >
                        <MenuItem value="BULLETIN_SOIN">📋 Bulletin de Soins</MenuItem>
                        <MenuItem value="COMPLEMENT_INFORMATION">📄 Complément Info</MenuItem>
                        <MenuItem value="ADHESION">👥 Adhésion</MenuItem>
                        <MenuItem value="RECLAMATION">⚠️ Réclamation</MenuItem>
                        <MenuItem value="CONTRAT_AVENANT">📜 Contrat/Avenant</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      disabled={!selectedDocumentType}
                      onClick={handleAddMissingDocument}
                      startIcon={<Add />}
                      sx={{ 
                        py: 1, 
                        borderRadius: 2, 
                        fontWeight: 700, 
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
                      }}
                    >
                      Sélectionner et Ajouter
                    </Button>
                  </Grid>
                  {selectedDocumentType && (
                    <Grid item xs={12}>
                      <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.7)' }}>
                        Type sélectionné: <strong>{selectedDocumentType}</strong>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'white', borderTop: '1px solid #e0e0e0', p: 2 }}>
          <Button 
            onClick={() => {
              setCorrectionDialogOpen(false);
              setSelectedBordereau(null);
              setSelectedDocumentType('');
              setDocumentNameFilter('');
              setDocumentStatusFilter('');
            }}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Fermer
          </Button>
          <Button 
            onClick={handleCompleteCorrections}
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700, 
              px: 3, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
            }}
          >
            Corrections Terminées
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modify Bordereau Dialog */}
      <Dialog 
        open={modifyDialogOpen} 
        onClose={() => {
          setModifyDialogOpen(false);
          setModifyBordereau(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            p: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              ✏️ Modifier Bordereau
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {modifyBordereau?.reference}
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setModifyDialogOpen(false);
              setModifyBordereau(null);
            }}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          {modifyBordereau && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Référence Bordereau"
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Client</InputLabel>
                    <Select
                      value={newClientId}
                      onChange={(e) => setNewClientId(e.target.value)}
                      label="Client"
                    >
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Date de Réception"
                    value={newDateReception}
                    onChange={(e) => setNewDateReception(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0', p: 2 }}>
          <Button 
            onClick={() => {
              setModifyDialogOpen(false);
              setModifyBordereau(null);
            }}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveModifications}
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700, 
              px: 3, 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReturnedBordereauHandler;