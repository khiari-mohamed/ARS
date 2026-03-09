import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, 
  TableBody, Chip, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Box, CircularProgress, Card, CardContent, Alert, Checkbox, TablePagination
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../../contexts/AuthContext';

interface BordereauTraite {
  id: string;
  clientSociete: string;
  referenceOV: string;
  referenceBordereau: string;
  montantBordereau: number;
  dateFinalisationBordereau?: string;
  dateInjection: string;
  statutVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE' | 'EN_COURS_VALIDATION' | 'VIREMENT_NON_VALIDE' | 'VIREMENT_DEPOSE';
  dateTraitementVirement?: string;
  motifObservation?: string;
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
}

const TrackingTab: React.FC = () => {
  const [bordereauxTraites, setBordereauxTraites] = useState<BordereauTraite[]>([]);
  const [manualOVs, setManualOVs] = useState<BordereauTraite[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BordereauTraite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingManual, setLoadingManual] = useState(true);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const handleSelectBordereau = (id: string) => {
    setSelectedBordereaux(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = filteredRecords.filter(r => !r.referenceOV).map(r => r.id);
    setSelectedBordereaux(prev => 
      prev.length === selectableIds.length ? [] : selectableIds
    );
  };
  const [filters, setFilters] = useState({
    society: '',
    status: '',
    donneurOrdre: '',
    dateFrom: '',
    dateTo: '',
    referenceBordereau: ''
  });
  const [editDialog, setEditDialog] = useState<{open: boolean, record: BordereauTraite | null}>({
    open: false, record: null
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    statutVirement: '',
    dateTraitementVirement: '',
    motifObservation: '',
    demandeRecuperation: false,
    dateDemandeRecuperation: '',
    montantRecupere: false,
    dateMontantRecupere: ''
  });
  const { user } = useAuth();
  const [createForm, setCreateForm] = useState({
    reference: '',
    clientName: '',
    donneurOrdreId: '',
    montantTotal: '',
    nombreAdherents: ''
  });
  const [documentViewer, setDocumentViewer] = useState<{open: boolean, url: string, title: string, type: 'pdf' | 'txt'}>({
    open: false, url: '', title: '', type: 'pdf'
  });
  const [reinjectDialog, setReinjectDialog] = useState<{open: boolean, record: BordereauTraite | null}>({
    open: false, record: null
  });
  const [reinjectFiles, setReinjectFiles] = useState<{excel: File | null, pdf: File | null}>({
    excel: null, pdf: null
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadBordereauxTraites = async () => {
    setLoading(true);
    try {
      const financeService = await import('../../services/financeService');
      const data = await financeService.financeService.getBordereauxTraites(filters);
      setBordereauxTraites(data);
    } catch (error) {
      console.error('Failed to load bordereaux traités:', error);
      setBordereauxTraites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadManualOVs = async () => {
    setLoadingManual(true);
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/finance/manual-ov-entries', { params: filters });
      setManualOVs(response.data);
    } catch (error) {
      console.error('Failed to load manual OVs:', error);
      setManualOVs([]);
    } finally {
      setLoadingManual(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadBordereauxTraites();
    loadManualOVs();
  }, []);
  
  // Reload when filters change
  useEffect(() => {
    if (filters.society || filters.status || filters.dateFrom || filters.dateTo || filters.referenceBordereau) {
      loadBordereauxTraites();
      loadManualOVs();
    }
  }, [filters.society, filters.status, filters.dateFrom, filters.dateTo, filters.referenceBordereau]);

  useEffect(() => {
    let filtered = bordereauxTraites;
    
    if (filters.society) {
      filtered = filtered.filter(r => r.clientSociete.toLowerCase().includes(filters.society.toLowerCase()));
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.statutVirement === filters.status);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.dateInjection >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(r => r.dateInjection <= filters.dateTo);
    }
    if (filters.referenceBordereau) {
      filtered = filtered.filter(r => r.referenceBordereau.toLowerCase().includes(filters.referenceBordereau.toLowerCase()));
    }
    
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.dateTraitementVirement || a.dateInjection).getTime();
      const dateB = new Date(b.dateTraitementVirement || b.dateInjection).getTime();
      return dateB - dateA;
    });
    
    setFilteredRecords(filtered);
  }, [bordereauxTraites, filters]);

  // EXACT SPEC: Statuts de virement
  const getStatusChip = (status: string) => {
    const statusLabels = {
      'NON_EXECUTE': 'Virement non exécuté',
      'EN_COURS_EXECUTION': 'Virement en cours d\'exécution',
      'EXECUTE_PARTIELLEMENT': 'Virement exécuté partiellement',
      'REJETE': 'Virement rejeté',
      'BLOQUE': 'Virement bloqué',
      'EXECUTE': 'Virement exécuté',
      'EN_COURS_VALIDATION': 'En cours de validation',
      'VIREMENT_NON_VALIDE': 'Virement non validé',
      'VIREMENT_DEPOSE': 'Virement déposé'
    };

    const statusColors = {
      'NON_EXECUTE': 'default',
      'EN_COURS_EXECUTION': 'info',
      'EXECUTE_PARTIELLEMENT': 'warning',
      'REJETE': 'error',
      'BLOQUE': 'error',
      'EXECUTE': 'success',
      'EN_COURS_VALIDATION': 'info',
      'VIREMENT_NON_VALIDE': 'error',
      'VIREMENT_DEPOSE': 'success'
    };

    const statusIcons = {
      'NON_EXECUTE': '⏳',
      'EN_COURS_EXECUTION': '🔄',
      'EXECUTE_PARTIELLEMENT': '⚠️',
      'REJETE': '❌',
      'BLOQUE': '⏸️',
      'EXECUTE': '✅',
      'EN_COURS_VALIDATION': '📝',
      'VIREMENT_NON_VALIDE': '❌',
      'VIREMENT_DEPOSE': '🏦'
    };

    return (
      <Chip 
        label={`${statusIcons[status as keyof typeof statusIcons] || ''} ${statusLabels[status as keyof typeof statusLabels] || status}`}
        color={statusColors[status as keyof typeof statusColors] as any || 'default'}
        size="small"
      />
    );
  };

  const handleEditClick = (record: BordereauTraite) => {
    setEditForm({
      statutVirement: record.statutVirement,
      dateTraitementVirement: record.dateTraitementVirement || '',
      motifObservation: record.motifObservation || '',
      demandeRecuperation: record.demandeRecuperation || false,
      dateDemandeRecuperation: record.dateDemandeRecuperation || '',
      montantRecupere: record.montantRecupere || false,
      dateMontantRecupere: record.dateMontantRecupere || ''
    });
    setEditDialog({open: true, record});
  };

  const handleReinject = async (recordId: string) => {
    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.reinjectOV(recordId);
      await loadBordereauxTraites();
      alert('Réinjection effectuée avec succès');
    } catch (error) {
      console.error('Failed to reinject OV:', error);
      alert('Erreur lors de la réinjection');
    }
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record) return;
    
    try {
      const financeService = await import('../../services/financeService');
      
      // If record has OV reference, update OV directly
      if (editDialog.record.referenceOV) {
        await financeService.financeService.updateOVStatus(editDialog.record.id, {
          etatVirement: editForm.statutVirement as any,
          motifObservation: editForm.motifObservation,
          demandeRecuperation: editForm.demandeRecuperation,
          dateDemandeRecuperation: editForm.demandeRecuperation ? editForm.dateDemandeRecuperation : undefined,
          montantRecupere: editForm.montantRecupere,
          dateMontantRecupere: editForm.montantRecupere ? editForm.dateMontantRecupere : undefined
        });
      } else {
        // Otherwise update bordereau traite
        await financeService.financeService.updateBordereauTraite(editDialog.record.id, {
          statutVirement: editForm.statutVirement,
          dateTraitementVirement: editForm.dateTraitementVirement,
          motifObservation: editForm.motifObservation,
          demandeRecuperation: editForm.demandeRecuperation,
          dateDemandeRecuperation: editForm.demandeRecuperation ? editForm.dateDemandeRecuperation : undefined,
          montantRecupere: editForm.montantRecupere,
          dateMontantRecupere: editForm.montantRecupere ? editForm.dateMontantRecupere : undefined
        });
      }
      
      await loadBordereauxTraites();
      setEditDialog({open: false, record: null});
      alert('Statut mis à jour avec succès!');
    } catch (error) {
      console.error('Failed to update record:', error);
      alert('Erreur lors de la mise à jour du statut: ' + (error as any).message);
    }
  };

  const handleCreateManualEntry = async () => {
    // EXACT SPEC: Manual OV must follow same workflow as bordereau OV
    // Store manual OV data and redirect to OV Processing tab
    const manualOVPdfPath = sessionStorage.getItem('manualOVPdfPath');
    sessionStorage.setItem('manualOVData', JSON.stringify({
      reference: createForm.reference,
      clientName: createForm.clientName,
      montantTotal: parseFloat(createForm.montantTotal) || 0,
      nombreAdherents: parseInt(createForm.nombreAdherents) || 0,
      isManual: true,
      uploadedPdfPath: manualOVPdfPath
    }));
    
    setCreateDialog(false);
    
    // Redirect to OV Processing tab (tab index 2)
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', '2');
    currentUrl.searchParams.set('manual', 'true');
    window.location.href = currentUrl.toString();
  };

  const canModifyStatus = () => {
    return user?.role === 'FINANCE' || user?.role === 'SUPER_ADMIN' || user?.role === 'CHEF_EQUIPE';
  };
  
  const canReinject = () => {
    return user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN';
  };

  return (
    <Box>
      {/* EXACT SPEC: Possibilité de créer une nouvelle entrée qui n'est pas liée à un bordereau */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Suivi & Statut
        </Typography>
        <Stack direction="row" spacing={2}>
          {selectedBordereaux.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => {
                // Store selected bordereaux in sessionStorage
                sessionStorage.setItem('selectedBordereaux', JSON.stringify(selectedBordereaux));
                // Force reload to Finance module with tab parameter
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('tab', '2');
                window.location.href = currentUrl.toString();
              }}
            >
              🏦 Créer OV ({selectedBordereaux.length})
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            + Nouvelle Entrée
          </Button>
        </Stack>
      </Box>

      {/* EXACT SPEC: Filtres pour recherche */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Filtres de Recherche</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              console.log('🔄 Force refresh clicked by user:', user?.role);
              setBordereauxTraites([]); // Clear current data
              loadBordereauxTraites();
            }}
            disabled={loading}
            size="small"
            variant="contained"
            color="primary"
          >
            Actualiser
          </Button>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Société / Client</InputLabel>
            <Select
              value={filters.society}
              onChange={(e) => setFilters({...filters, society: e.target.value})}
              label="Société / Client"
            >
              <MenuItem value="">Tous</MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.name}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Référence bordereau"
            value={filters.referenceBordereau}
            onChange={(e) => setFilters({...filters, referenceBordereau: e.target.value})}
            size="small"
            sx={{ minWidth: 150 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Statut Virement</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              label="Statut Virement"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="NON_EXECUTE">Non Exécuté</MenuItem>
              <MenuItem value="EN_COURS_EXECUTION">En Cours d'Exécution</MenuItem>
              <MenuItem value="EXECUTE_PARTIELLEMENT">Exécuté Partiellement</MenuItem>
              <MenuItem value="REJETE">Rejeté</MenuItem>
              <MenuItem value="BLOQUE">Bloqué</MenuItem>
              <MenuItem value="EXECUTE">Exécuté</MenuItem>
              <MenuItem value="EN_COURS_VALIDATION">En Cours de Validation</MenuItem>
              <MenuItem value="VIREMENT_NON_VALIDE">Virement Non Validé</MenuItem>
              <MenuItem value="VIREMENT_DEPOSE">Virement Déposé</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Date Début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Date Fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          
          <Button 
            variant="outlined" 
            onClick={() => setFilters({society: '', status: '', donneurOrdre: '', dateFrom: '', dateTo: '', referenceBordereau: ''})}
            size="small"
          >
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {/* EXACT SPEC: Bloc récapitulatif des bordereaux en état Traité */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Bloc récapitulatif des bordereaux en état Traité</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Affichage de {filteredRecords.filter(r => r.referenceBordereau).length} bordereau(x) traité(s) - Page {page + 1}</Typography>
        {user?.role === 'CHEF_EQUIPE' && (
          <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', mb: 2, display: 'block' }}>
            Affichage limité aux bordereaux de votre équipe
          </Typography>
        )}
        {user?.role === 'GESTIONNAIRE_SENIOR' && (
          <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', mb: 2, display: 'block' }}>
            Affichage limité à vos clients uniquement
          </Typography>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedBordereaux.length > 0 && selectedBordereaux.length < filteredRecords.filter(r => !r.referenceOV).length}
                      checked={filteredRecords.filter(r => !r.referenceOV).length > 0 && selectedBordereaux.length === filteredRecords.filter(r => !r.referenceOV).length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Client / Société</strong></TableCell>
                  <TableCell><strong>Référence OV</strong></TableCell>
                  <TableCell><strong>Référence bordereau</strong></TableCell>
                  <TableCell><strong>Montant du bordereau</strong></TableCell>
                  <TableCell><strong>Date de finalisation du bordereau (statut Traité)</strong></TableCell>
                  <TableCell><strong>Date d'injection</strong></TableCell>
                  <TableCell><strong>Statut de virement</strong></TableCell>
                  <TableCell><strong>Date de traitement du virement</strong></TableCell>
                  <TableCell><strong>Motif / Observation</strong></TableCell>
                  <TableCell><strong>Demande de récupération</strong></TableCell>
                  <TableCell><strong>Montant récupéré</strong></TableCell>
                  <TableCell><strong>Documents</strong></TableCell>
                  <TableCell><strong>Actions par rôle</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.filter(r => r.referenceBordereau).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell padding="checkbox">
                      {!record.referenceOV && (
                        <Checkbox
                          checked={selectedBordereaux.includes(record.id)}
                          onChange={() => handleSelectBordereau(record.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{record.clientSociete}</TableCell>
                    <TableCell>{record.referenceOV}</TableCell>
                    <TableCell>{record.referenceBordereau}</TableCell>
                    <TableCell>{record.montantBordereau.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      {record.dateFinalisationBordereau 
                        ? new Date(record.dateFinalisationBordereau).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {record.dateInjection && record.dateInjection !== '1970-01-01T00:00:00.000Z' 
                        ? new Date(record.dateInjection).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusChip(record.statutVirement)}</TableCell>
                    <TableCell>
                      {record.dateTraitementVirement
                        ? new Date(record.dateTraitementVirement).toLocaleDateString('fr-FR') 
                        : '-'
                      }
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" sx={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.875rem'
                      }}>
                        {record.motifObservation || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.demandeRecuperation ? (
                        <Box>
                          <Chip label="Oui" color="warning" size="small" />
                          {record.dateDemandeRecuperation && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {record.montantRecupere ? (
                        <Box>
                          <Chip label="Oui" color="success" size="small" />
                          {record.dateMontantRecupere && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateMontantRecupere).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {record.referenceOV && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/pdf`, {
                                    responseType: 'blob'
                                  });
                                  const blob = new Blob([response.data], { type: 'application/pdf' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  
                                  setDocumentViewer({
                                    open: true,
                                    url: blobUrl,
                                    title: `PDF OV - ${record.referenceOV}`,
                                    type: 'pdf'
                                  });
                                } catch (error) {
                                  console.error('Error loading PDF:', error);
                                  alert('Erreur lors du chargement du PDF');
                                }
                              }}
                            >
                              PDF OV
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/txt`, {
                                    responseType: 'blob'
                                  });
                                  const blob = new Blob([response.data], { type: 'text/plain' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  
                                  setDocumentViewer({
                                    open: true,
                                    url: blobUrl,
                                    title: `TXT - ${record.referenceOV}`,
                                    type: 'txt'
                                  });
                                } catch (error) {
                                  console.error('Error loading TXT:', error);
                                  alert('Erreur lors du chargement du TXT');
                                }
                              }}
                            >
                              TXT
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              startIcon={<VisibilityIcon />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  
                                  // Get OV details to find bordereauId
                                  const ovResponse = await LocalAPI.get(`/finance/ordres-virement/${record.id}`);
                                  const ov = ovResponse.data;
                                  
                                  if (!ov.bordereauId) {
                                    alert('Aucun bordereau lié à cet OV');
                                    return;
                                  }
                                  
                                  // Fetch documents by bordereauId
                                  const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${ov.bordereauId}`);
                                  const ovDocuments = response.data;
                                  
                                  const pdfDoc = ovDocuments.find((doc: any) => doc.type === 'BORDEREAU_PDF');
                                  
                                  if (pdfDoc) {
                                    const docResponse = await LocalAPI.get(`/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`, {
                                      responseType: 'blob'
                                    });
                                    const blob = new Blob([docResponse.data], { type: 'application/pdf' });
                                    const blobUrl = URL.createObjectURL(blob);
                                    
                                    setDocumentViewer({
                                      open: true,
                                      url: blobUrl,
                                      title: `PDF Uploadé - ${pdfDoc.name}`,
                                      type: 'pdf'
                                    });
                                  } else {
                                    alert('Aucun PDF uploadé trouvé');
                                  }
                                } catch (error: any) {
                                  console.error('Error loading bordereau PDF:', error);
                                  alert(`Erreur lors du chargement du PDF\n\n${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
                                }
                              }}
                            >
                              PDF Bordereau
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {/* EXACT SPEC: Finance and Super Admin can always modify */}
                        {canModifyStatus() && (
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(record)}
                          >
                            Modifier
                          </Button>
                        )}
                        {/* Corriger button - visible for all roles */}
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditClick(record)}
                        >
                          Corriger
                        </Button>
                        {/* EXACT SPEC: Réinjecter for VIREMENT_NON_VALIDE - Chef Equipe and Super Admin only */}
                        {record.statutVirement === 'VIREMENT_NON_VALIDE' && (user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN') && (
                          <Button
                            size="small"
                            color="error"
                            variant="contained"
                            onClick={() => setReinjectDialog({open: true, record})}
                          >
                            Réinjecter
                          </Button>
                        )}
                        {/* EXACT SPEC: Reinject only for REJETE status */}
                        {canReinject() && record.statutVirement === 'REJETE' && (
                          <Button
                            size="small"
                            color="warning"
                            onClick={() => handleReinject(record.id)}
                          >
                            Réinjecter
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredRecords.filter(r => r.referenceBordereau).length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </Box>
        )}
      </Paper>

      {/* EXACT SPEC: Entrées manuelles (non liées à un bordereau) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Entrées manuelles (non liées à un bordereau)</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>Affichage de {manualOVs.length} entrée(s) manuelle(s)</Typography>
        
        {loadingManual ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : manualOVs.length === 0 ? (
          <Alert severity="info">Aucune entrée manuelle trouvée</Alert>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Client / Société</strong></TableCell>
                  <TableCell><strong>Référence OV</strong></TableCell>
                  <TableCell><strong>Montant</strong></TableCell>
                  <TableCell><strong>Date d'injection</strong></TableCell>
                  <TableCell><strong>Statut de virement</strong></TableCell>
                  <TableCell><strong>Date de traitement du virement</strong></TableCell>
                  <TableCell><strong>Motif / Observation</strong></TableCell>
                  <TableCell><strong>Demande de récupération</strong></TableCell>
                  <TableCell><strong>Montant récupéré</strong></TableCell>
                  <TableCell><strong>Documents</strong></TableCell>
                  <TableCell><strong>Actions par rôle</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manualOVs.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.clientSociete}</TableCell>
                    <TableCell>{record.referenceOV}</TableCell>
                    <TableCell>{record.montantBordereau.toLocaleString('fr-TN')} TND</TableCell>
                    <TableCell>
                      {record.dateInjection && record.dateInjection !== '1970-01-01T00:00:00.000Z' 
                        ? new Date(record.dateInjection).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusChip(record.statutVirement)}</TableCell>
                    <TableCell>
                      {record.dateTraitementVirement
                        ? new Date(record.dateTraitementVirement).toLocaleDateString('fr-FR') 
                        : '-'
                      }
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" sx={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.875rem'
                      }}>
                        {record.motifObservation || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.demandeRecuperation ? (
                        <Box>
                          <Chip label="Oui" color="warning" size="small" />
                          {record.dateDemandeRecuperation && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {record.montantRecupere ? (
                        <Box>
                          <Chip label="Oui" color="success" size="small" />
                          {record.dateMontantRecupere && (
                            <Typography variant="caption" display="block">
                              {new Date(record.dateMontantRecupere).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Non" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {record.referenceOV && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/pdf`, {
                                    responseType: 'blob'
                                  });
                                  const blob = new Blob([response.data], { type: 'application/pdf' });
                                  setDocumentViewer({
                                    open: true,
                                    url: URL.createObjectURL(blob),
                                    title: `PDF OV - ${record.referenceOV}`,
                                    type: 'pdf'
                                  });
                                } catch (error) {
                                  alert('Erreur lors du chargement du PDF');
                                }
                              }}
                            >
                              PDF OV
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={async () => {
                                try {
                                  const { LocalAPI } = await import('../../services/axios');
                                  const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/txt`, {
                                    responseType: 'blob'
                                  });
                                  const blob = new Blob([response.data], { type: 'text/plain' });
                                  setDocumentViewer({
                                    open: true,
                                    url: URL.createObjectURL(blob),
                                    title: `TXT - ${record.referenceOV}`,
                                    type: 'txt'
                                  });
                                } catch (error) {
                                  alert('Erreur lors du chargement du TXT');
                                }
                              }}
                            >
                              TXT
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {canModifyStatus() && (
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditClick(record)}
                          >
                            Modifier
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditClick(record)}
                        >
                          Corriger
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* EXACT SPEC: Edit Dialog with role-based actions */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({open: false, record: null})} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Modifier - {editDialog.record?.referenceOV}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Bordereau: {editDialog.record?.referenceBordereau}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* EXACT SPEC: Service Financier peut modifier le statut de virement */}
            <FormControl fullWidth>
              <InputLabel>Statut de virement</InputLabel>
              <Select
                value={editForm.statutVirement}
                onChange={(e) => setEditForm({...editForm, statutVirement: e.target.value})}
                label="Statut de virement"
                disabled={!canModifyStatus()}
              >
                <MenuItem value="NON_EXECUTE">⏳ Virement non exécuté</MenuItem>
                <MenuItem value="EN_COURS_EXECUTION">🔄 Virement en cours d'exécution</MenuItem>
                <MenuItem value="EXECUTE_PARTIELLEMENT">⚠️ Virement exécuté partiellement</MenuItem>
                <MenuItem value="REJETE">❌ Virement rejeté</MenuItem>
                <MenuItem value="BLOQUE">⏸️ Virement bloqué</MenuItem>
                <MenuItem value="EXECUTE">✅ Virement exécuté</MenuItem>
                <MenuItem value="EN_COURS_VALIDATION">📝 En cours de validation</MenuItem>
                <MenuItem value="VIREMENT_NON_VALIDE">❌ Virement non validé</MenuItem>
                <MenuItem value="VIREMENT_DEPOSE">🏦 Virement déposé</MenuItem>
              </Select>
              {!canModifyStatus() && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Seul le Service Financier peut modifier le statut
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Date de traitement du virement"
              type="date"
              value={editForm.dateTraitementVirement}
              onChange={(e) => setEditForm({...editForm, dateTraitementVirement: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            {/* EXACT SPEC: Motif / Observation - champ libre service financier */}
            {canModifyStatus() && (
              <>
                <TextField
                  label="Motif / Observation (champ libre)"
                  multiline
                  rows={3}
                  value={editForm.motifObservation}
                  onChange={(e) => setEditForm({...editForm, motifObservation: e.target.value})}
                  fullWidth
                  helperText="Champ libre - service financier, si virement bloqué"
                  placeholder="Saisir le motif ou observation..."
                />
                
                {/* EXACT SPEC: Demande de récupération : Oui / Non → si Oui, afficher la date */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Demande de récupération</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.demandeRecuperation ? 'contained' : 'outlined'}
                      color={editForm.demandeRecuperation ? 'warning' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({...editForm, demandeRecuperation: !editForm.demandeRecuperation})}
                    >
                      {editForm.demandeRecuperation ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.demandeRecuperation && (
                      <TextField
                        label="Date de la demande"
                        type="date"
                        value={editForm.dateDemandeRecuperation}
                        onChange={(e) => setEditForm({...editForm, dateDemandeRecuperation: e.target.value})}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        required
                      />
                    )}
                  </Box>
                </Box>
                
                {/* EXACT SPEC: Montant récupéré : Oui / Non → si Oui, afficher la date de récupération */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Montant récupéré</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.montantRecupere ? 'contained' : 'outlined'}
                      color={editForm.montantRecupere ? 'success' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({...editForm, montantRecupere: !editForm.montantRecupere})}
                    >
                      {editForm.montantRecupere ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.montantRecupere && (
                      <TextField
                        label="Date de récupération"
                        type="date"
                        value={editForm.dateMontantRecupere}
                        onChange={(e) => setEditForm({...editForm, dateMontantRecupere: e.target.value})}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        required
                      />
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, record: null})}>
            Annuler
          </Button>
          {/* EXACT SPEC: Réinjecter button always visible inside Corriger popup */}
          {(user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN') && (
            <Button 
              onClick={() => {
                setEditDialog({open: false, record: null});
                setReinjectDialog({open: true, record: editDialog.record});
              }}
              variant="contained"
              color="error"
            >
              Réinjecter
            </Button>
          )}
          <Button onClick={handleSaveEdit} variant="contained" disabled={!canModifyStatus()}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* EXACT SPEC: Créer nouvelle entrée (non liée à un bordereau) */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Créer une nouvelle entrée
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Cette entrée n'est pas liée à un bordereau
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Création manuelle d'un ordre de virement sans bordereau associé
          </Alert>
          <Stack spacing={2.5}>
            <TextField
              label="Référence OV"
              value={createForm.reference}
              onChange={(e) => setCreateForm({...createForm, reference: e.target.value})}
              fullWidth
              required
              placeholder="Ex: OV-MANUAL-001"
              helperText="Référence unique de l'ordre de virement"
            />
            
            <FormControl fullWidth required>
              <InputLabel>Client / Société *</InputLabel>
              <Select
                value={createForm.clientName}
                label="Client / Société *"
                onChange={(e) => setCreateForm({...createForm, clientName: e.target.value})}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.name}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Montant total (TND)"
              type="text"
              value={createForm.montantTotal ? parseFloat(createForm.montantTotal).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '');
                if (value === '' || /^\d*\.?\d{0,3}$/.test(value)) {
                  setCreateForm({...createForm, montantTotal: value});
                }
              }}
              fullWidth
              required
              placeholder="Ex: 10 ou 100 ou 100,000"
              helperText="Format: 10dt, 100dt, 100,000dt"
            />
            
            <TextField
              label="Nombre d'adhérents"
              type="text"
              value={createForm.nombreAdherents}
              onChange={(e) => setCreateForm({...createForm, nombreAdherents: e.target.value})}
              fullWidth
              required
              placeholder="0"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCreateDialog(false)} variant="outlined">
            Annuler
          </Button>
          <Button 
            onClick={handleCreateManualEntry} 
            variant="contained"
            disabled={!createForm.reference || !createForm.clientName || !createForm.montantTotal || parseFloat(createForm.montantTotal) <= 0}
            startIcon={<AddIcon />}
          >
            Créer l'entrée
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reinject Dialog */}
      <Dialog open={reinjectDialog.open} onClose={() => setReinjectDialog({open: false, record: null})} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Réinjecter OV</Typography>
          <Typography variant="caption" color="textSecondary">
            {reinjectDialog.record?.referenceOV} - {reinjectDialog.record?.referenceBordereau}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            Motif du rejet: {reinjectDialog.record?.motifObservation || 'Non spécifié'}
          </Alert>
          <Stack spacing={2}>
            <Box sx={{ border: '2px dashed #1976d2', borderRadius: 1, p: 2, textAlign: 'center', cursor: 'pointer', bgcolor: '#f5f9ff' }} component="label">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setReinjectFiles({...reinjectFiles, excel: e.target.files?.[0] || null})} style={{ display: 'none' }} />
              <Typography variant="body2">{reinjectFiles.excel ? `✅ ${reinjectFiles.excel.name}` : '📄 Nouveau fichier Excel'}</Typography>
            </Box>
            <Box sx={{ border: '2px dashed #d32f2f', borderRadius: 1, p: 2, textAlign: 'center', cursor: 'pointer', bgcolor: '#fff5f5' }} component="label">
              <input type="file" accept=".pdf" onChange={(e) => setReinjectFiles({...reinjectFiles, pdf: e.target.files?.[0] || null})} style={{ display: 'none' }} />
              <Typography variant="body2">{reinjectFiles.pdf ? `✅ ${reinjectFiles.pdf.name}` : '📝 Nouveau fichier PDF'}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReinjectDialog({open: false, record: null})} variant="outlined">Annuler</Button>
          <Button 
            onClick={async () => {
              if (!reinjectFiles.excel || !reinjectFiles.pdf) {
                alert('Les deux fichiers sont obligatoires!');
                return;
              }
              try {
                const { financeService } = await import('../../services/financeService');
                await financeService.updateOVStatus(reinjectDialog.record!.id, { etatVirement: 'EN_COURS_VALIDATION' });
                alert('OV réinjecté avec succès! Notification envoyée au Responsable.');
                setReinjectDialog({open: false, record: null});
                setReinjectFiles({excel: null, pdf: null});
                await loadBordereauxTraites();
              } catch (error) {
                alert('Erreur lors de la réinjection');
              }
            }}
            variant="contained" 
            color="error"
            disabled={!reinjectFiles.excel || !reinjectFiles.pdf}
          >
            Réinjecter et Envoyer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog 
        open={documentViewer.open} 
        onClose={() => setDocumentViewer({open: false, url: '', title: '', type: 'pdf'})} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{documentViewer.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {documentViewer.type === 'txt' && documentViewer.url && (
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = documentViewer.url;
                  link.download = documentViewer.title.replace('TXT - ', '') + '.txt';
                  link.click();
                }}
              >
                Télécharger
              </Button>
            )}
            <Button 
              onClick={() => setDocumentViewer({open: false, url: '', title: '', type: 'pdf'})}
              size="small"
            >
              Fermer
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {documentViewer.url ? (
            documentViewer.type === 'pdf' ? (
              <iframe
                src={documentViewer.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={documentViewer.title}
              />
            ) : (
              <Box sx={{ p: 2, height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5' }}>
                <iframe
                  src={documentViewer.url}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: '1px solid #ddd', 
                    backgroundColor: 'white',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                  title={documentViewer.title}
                />
              </Box>
            )
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: '18px',
              color: '#666'
            }}>
              Chargement du document...
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TrackingTab;