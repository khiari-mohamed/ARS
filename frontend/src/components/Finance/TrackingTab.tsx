import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Box, CircularProgress, Card, CardContent, Alert, Checkbox,
  TablePagination, Autocomplete, TableContainer
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../../contexts/AuthContext';
import VirementHistoryDialog from './VirementHistoryDialog';
import GlobalHistoryDialog from './GlobalHistoryDialog';

// ─── Interface ────────────────────────────────────────────────────────────────
interface BordereauTraite {
  id: string;
  clientSociete: string;
  referenceOV: string;
  referenceBordereau: string;
  montantBordereau: number;
  dateFinalisationBordereau?: string;
  dateInjection: string;
  statutVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE' | 'EN_COURS_VALIDATION' | 'VIREMENT_NON_VALIDE' | 'VIREMENT_DEPOSE';
  statutGlobal?: string; // NEW: Global workflow status
  dateTraitementVirement?: string;
  motifObservation?: string;
  demandeRecuperation: boolean;
  dateDemandeRecuperation?: string;
  montantRecupere: boolean;
  dateMontantRecupere?: string;
}

// ─── Shared table cell styles (mirrors dashboard design) ──────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.2,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.7,
  px: 1.2,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
const TrackingTab: React.FC = () => {
  const [bordereauxTraites, setBordereauxTraites] = useState<BordereauTraite[]>([]);
  const [manualOVs, setManualOVs] = useState<BordereauTraite[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BordereauTraite[]>([]);
  const [filteredManualOVs, setFilteredManualOVs] = useState<BordereauTraite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingManual, setLoadingManual] = useState(true);
  const [selectedBordereaux, setSelectedBordereaux] = useState<string[]>([]);
  const [selectedForBulkUpdate, setSelectedForBulkUpdate] = useState<string[]>([]);
  const [bulkUpdateDialog, setBulkUpdateDialog] = useState(false);
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    statutVirement: '',
    motifObservation: ''
  });
  const [clients, setClients] = useState<any[]>([]);

  const handleSelectBordereau = (id: string) => {
    setSelectedBordereaux(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectForBulkUpdate = (id: string) => {
    setSelectedForBulkUpdate(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllForBulkUpdate = () => {
    const allIds = filteredRecords.filter(r => r.referenceOV).map(r => r.id);
    setSelectedForBulkUpdate(prev =>
      prev.length === allIds.length ? [] : allIds
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
    referenceBordereau: '',
    modeRecuperation: '',
    nomDonneur: '',
    numeroContrat: '',
    statutGlobal: '', // NEW: Global workflow status filter
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean, record: BordereauTraite | null }>({
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
    clientName: '',
    clientId: '',
    contractId: '', // NEW: Optional contract ID
    donneurOrdreId: '',
    montantTotal: '',
    nombreAdherents: '',
    generatedReference: ''
  });
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [documentViewer, setDocumentViewer] = useState<{ open: boolean, url: string, title: string, type: 'pdf' | 'txt' }>({
    open: false, url: '', title: '', type: 'pdf'
  });
  const [reinjectDialog, setReinjectDialog] = useState<{ open: boolean, record: BordereauTraite | null }>({
    open: false, record: null
  });
  const [reinjectFiles, setReinjectFiles] = useState<{ excel: File | null, pdf: File | null }>({
    excel: null, pdf: null
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [correctOVOpen, setCorrectOVOpen] = useState(false);
  const [correctOVData, setCorrectOVData] = useState<any>(null);
  const [restartProcessingOpen, setRestartProcessingOpen] = useState(false);
  const [selectedForRestart, setSelectedForRestart] = useState<BordereauTraite | null>(null);
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; virementId: string; reference: string }>({
    open: false,
    virementId: '',
    reference: ''
  });
  const [globalHistoryDialog, setGlobalHistoryDialog] = useState(false);

  // Helper functions for statutGlobal display
  const getStatutGlobalLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'VALIDE_INTERNE': 'Validé interne',
      'VALIDE_RECOUVREMENT': 'Validé recouvrement',
      'BLOQUE_RECOUVREMENT': 'Bloqué recouvrement',
      'COMPTABILISE': 'Comptabilisé',
      'INTEGRE_SAGE': 'Intégré dans Sage',
    };
    return labels[status] || status;
  };

  const getStatutGlobalColor = (status: string): 'default' | 'info' | 'success' | 'error' | 'primary' => {
    const colors: Record<string, 'default' | 'info' | 'success' | 'error' | 'primary'> = {
      'EN_ATTENTE': 'default',
      'VALIDE_INTERNE': 'info',
      'VALIDE_RECOUVREMENT': 'success',
      'BLOQUE_RECOUVREMENT': 'error',
      'COMPTABILISE': 'primary',
      'INTEGRE_SAGE': 'success',
    };
    return colors[status] || 'default';
  };

  // ── Data loading (unchanged) ────────────────────────────────────────────────
  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const generateNextOVReference = async () => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/finance/next-ov-reference');
      setCreateForm(prev => ({ ...prev, generatedReference: response.data.reference }));
    } catch (error) {
      console.error('Failed to generate OV reference:', error);
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

    // EXACT SPEC: Finance role can only see virements with 4 specific statuses
    if (user?.role === 'FINANCE') {
      filtered = filtered.filter(r => 
        ['VIREMENT_DEPOSE', 'BLOQUE', 'EXECUTE', 'REJETE'].includes(r.statutVirement)
      );
    }

    // EXACT SPEC: Responsable Département can only see virements with 2 specific statuses
    if (user?.role === 'RESPONSABLE_DEPARTEMENT') {
      filtered = filtered.filter(r => 
        ['VIREMENT_NON_VALIDE', 'VIREMENT_DEPOSE'].includes(r.statutVirement)
      );
    }

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
    if (filters.modeRecuperation) {
      filtered = filtered.filter(r => (r as any).modeRecuperation?.toLowerCase().includes(filters.modeRecuperation.toLowerCase()));
    }
    if (filters.nomDonneur) {
      filtered = filtered.filter(r => (r as any).nomDonneur?.toLowerCase().includes(filters.nomDonneur.toLowerCase()));
    }
    if (filters.numeroContrat) {
      filtered = filtered.filter(r => (r as any).numeroContrat?.toLowerCase().includes(filters.numeroContrat.toLowerCase()));
    }
    if (filters.statutGlobal) {
      filtered = filtered.filter(r => r.statutGlobal === filters.statutGlobal);
    }

    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.dateTraitementVirement || a.dateInjection).getTime();
      const dateB = new Date(b.dateTraitementVirement || b.dateInjection).getTime();
      return dateB - dateA;
    });

    setFilteredRecords(filtered);
  }, [bordereauxTraites, filters, user?.role]);

  useEffect(() => {
    let filtered = manualOVs;

    // EXACT SPEC: Finance role can only see virements with 4 specific statuses
    if (user?.role === 'FINANCE') {
      filtered = filtered.filter(r => 
        ['VIREMENT_DEPOSE', 'BLOQUE', 'EXECUTE', 'REJETE'].includes(r.statutVirement)
      );
    }

    // EXACT SPEC: Responsable Département can only see virements with 2 specific statuses
    if (user?.role === 'RESPONSABLE_DEPARTEMENT') {
      filtered = filtered.filter(r => 
        ['VIREMENT_NON_VALIDE', 'VIREMENT_DEPOSE'].includes(r.statutVirement)
      );
    }

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
      filtered = filtered.filter(r => r.referenceOV?.toLowerCase().includes(filters.referenceBordereau.toLowerCase()));
    }
    if (filters.modeRecuperation) {
      filtered = filtered.filter(r => (r as any).modeRecuperation?.toLowerCase().includes(filters.modeRecuperation.toLowerCase()));
    }
    if (filters.nomDonneur) {
      filtered = filtered.filter(r => (r as any).nomDonneur?.toLowerCase().includes(filters.nomDonneur.toLowerCase()));
    }
    if (filters.numeroContrat) {
      filtered = filtered.filter(r => (r as any).numeroContrat?.toLowerCase().includes(filters.numeroContrat.toLowerCase()));
    }
    if (filters.statutGlobal) {
      filtered = filtered.filter(r => r.statutGlobal === filters.statutGlobal);
    }

    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.dateTraitementVirement || a.dateInjection).getTime();
      const dateB = new Date(b.dateTraitementVirement || b.dateInjection).getTime();
      return dateB - dateA;
    });

    setFilteredManualOVs(filtered);
  }, [manualOVs, filters, user?.role]);

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

  // ── Handlers (unchanged) ───────────────────────────────────────────────────
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
    setEditDialog({ open: true, record });
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
      setEditDialog({ open: false, record: null });
      alert('Statut mis à jour avec succès!');
    } catch (error) {
      console.error('Failed to update record:', error);
      alert('Erreur lors de la mise à jour du statut: ' + (error as any).message);
    }
  };

  const handleCreateManualEntry = async () => {
    // EXACT SPEC: Manual OV must follow same workflow as bordereau OV
    const manualOVPdfPath = sessionStorage.getItem('manualOVPdfPath');

    // Clean montantTotal: remove all separators (spaces, commas, dots) and parse as number
    const cleanMontant = createForm.montantTotal.replace(/[\s,\.]/g, '');
    const montantTotal = parseFloat(cleanMontant) || 0;

    sessionStorage.setItem('manualOVData', JSON.stringify({
      // NO reference field - will be auto-generated by backend
      clientName: createForm.clientName,
      clientId: createForm.clientId,
      contractId: createForm.contractId || null, // NEW: Optional contract ID
      montantTotal: montantTotal,
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
    return user?.role === 'FINANCE' || user?.role === 'SUPER_ADMIN' || user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'RESPONSABLE_DEPARTEMENT';
  };

  const canBulkUpdate = () => {
    return user?.role === 'FINANCE' || user?.role === 'SUPER_ADMIN' || user?.role === 'RESPONSABLE_DEPARTEMENT';
  };

  const canReinject = () => {
    return user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN' || user?.role === 'GESTIONNAIRE_SENIOR';
  };

  // EXACT SPEC: Finance role can only access 4 specific statuses
  // EXACT SPEC: Responsable Département can only access 2 specific statuses
  const getAvailableStatuses = () => {
    if (user?.role === 'FINANCE') {
      return [
        { value: 'VIREMENT_DEPOSE', label: '🏦 Virement autorisé' },
        { value: 'BLOQUE', label: '⏸️ Virement bloqué' },
        { value: 'EXECUTE', label: '✅ Virement exécuté' },
        { value: 'REJETE', label: '❌ Virement rejeté' },
      ];
    }
    if (user?.role === 'RESPONSABLE_DEPARTEMENT') {
      return [
        { value: 'VIREMENT_NON_VALIDE', label: '❌ Virement non validé' },
        { value: 'VIREMENT_DEPOSE', label: '🏦 Virement déposé' },
      ];
    }
    // All other roles have access to all statuses
    return [
      { value: 'NON_EXECUTE', label: '⏳ Virement non exécuté' },
      { value: 'EN_COURS_EXECUTION', label: '🔄 Virement en cours d\'exécution' },
      { value: 'EXECUTE_PARTIELLEMENT', label: '⚠️ Virement exécuté partiellement' },
      { value: 'REJETE', label: '❌ Virement rejeté' },
      { value: 'BLOQUE', label: '⏸️ Virement bloqué' },
      { value: 'EXECUTE', label: '✅ Virement exécuté' },
      { value: 'EN_COURS_VALIDATION', label: '📝 En cours de validation' },
      { value: 'VIREMENT_NON_VALIDE', label: '❌ Virement non validé' },
      { value: 'VIREMENT_DEPOSE', label: '🏦 Virement déposé' },
    ];
  };

  const handleCorrectOV = async (record: BordereauTraite) => {
    try {
      const financeService = await import('../../services/financeService');
      const ovDetails = await financeService.financeService.getOVDetails(record.id);

      setCorrectOVData({
        id: record.id,
        reference: record.referenceOV || record.referenceBordereau,
        montantTotal: ovDetails.montantTotal || 0,
        nombreAdherents: ovDetails.nombreAdherents || 0,
        donneurOrdreId: ovDetails.donneurOrdreId || '',
        observations: ovDetails.observations || ''
      });
      setCorrectOVOpen(true);
    } catch (error) {
      console.error('Failed to load OV details:', error);
      alert('Erreur lors du chargement des détails: ' + (error as any).message);
    }
  };

  const handleSaveCorrection = async () => {
    if (!correctOVData) return;

    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.updateOVDetails(correctOVData.id, {
        montantTotal: correctOVData.montantTotal,
        nombreAdherents: correctOVData.nombreAdherents,
        donneurOrdreId: correctOVData.donneurOrdreId,
        observations: correctOVData.observations
      });

      alert('Ordre de virement corrigé avec succès!');
      setCorrectOVOpen(false);
      setCorrectOVData(null);
      loadBordereauxTraites();
    } catch (error) {
      console.error('Failed to correct OV:', error);
      alert('Erreur lors de la correction: ' + (error as any).message);
    }
  };

  const handleRestartProcessing = async (record: BordereauTraite) => {
    setSelectedForRestart(record);
    setRestartProcessingOpen(true);
  };

  const handleConfirmRestart = async () => {
    if (!selectedForRestart) return;

    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.restartOVProcessing(selectedForRestart.id);

      alert('Traitement financier relancé avec succès!');
      setRestartProcessingOpen(false);
      setSelectedForRestart(null);
      loadBordereauxTraites();
    } catch (error) {
      console.error('Failed to restart processing:', error);
      alert('Erreur lors de la relance: ' + (error as any).message);
    }
  };

  const handleBulkUpdateStatus = async () => {
    if (selectedForBulkUpdate.length === 0) {
      alert('Veuillez sélectionner au moins un virement');
      return;
    }

    if (!bulkUpdateForm.statutVirement) {
      alert('Veuillez sélectionner un statut');
      return;
    }

    try {
      const financeService = await import('../../services/financeService');
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const virementId of selectedForBulkUpdate) {
        try {
          await financeService.financeService.updateOVStatus(virementId, {
            etatVirement: bulkUpdateForm.statutVirement as any,
            motifObservation: bulkUpdateForm.motifObservation
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to update virement ${virementId}:`, error);
          errorCount++;
          errors.push(`Virement ${virementId}: ${error.message || 'Erreur inconnue'}`);
        }
      }

      await loadBordereauxTraites();
      await loadManualOVs();
      setBulkUpdateDialog(false);
      setSelectedForBulkUpdate([]);
      setBulkUpdateForm({ statutVirement: '', motifObservation: '' });

      if (errorCount === 0) {
        alert(`✅ Mise à jour réussie!\n\n${successCount} virement(s) mis à jour avec succès.`);
      } else if (successCount === 0) {
        alert(`❌ Échec de la mise à jour!\n\n${errorCount} virement(s) ont échoué:\n${errors.join('\n')}`);
      } else {
        alert(`⚠️ Mise à jour partielle!\n\n✅ Réussis: ${successCount}\n❌ Échecs: ${errorCount}\n\nErreurs:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('Erreur lors de la mise à jour groupée: ' + (error as any).message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f', letterSpacing: -0.5 }}>
            Suivi &amp; Statut
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Suivi des bordereaux traités et des ordres de virement
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {selectedBordereaux.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => {
                sessionStorage.setItem('selectedBordereaux', JSON.stringify(selectedBordereaux));
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('tab', '2');
                window.location.href = currentUrl.toString();
              }}
              sx={{ fontWeight: 600 }}
            >
              🏦 Créer OV ({selectedBordereaux.length})
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<HistoryIcon />}
            onClick={() => setGlobalHistoryDialog(true)}
            sx={{ fontWeight: 600 }}
            title="Voir l'historique complet de tous les virements"
          >
            📊 Historique Global
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateDialog(true);
              generateNextOVReference();
            }}
            sx={{ fontWeight: 600 }}
          >
            + Nouvelle Entrée
          </Button>
        </Stack>
      </Box>

      {/* ── Filter Panel ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 3,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Filtres de Recherche
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              console.log('🔄 Force refresh clicked by user:', user?.role);
              setBordereauxTraites([]);
              loadBordereauxTraites();
            }}
            disabled={loading}
            size="small"
            variant="contained"
            color="primary"
            sx={{ fontSize: '0.78rem' }}
          >
            Actualiser
          </Button>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Autocomplete
            options={clients}
            getOptionLabel={(option) => option.name}
            value={clients.find(c => c.name === filters.society) || null}
            onChange={(event, newValue) => {
              setFilters({ ...filters, society: newValue?.name || '' });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Société / Client"
                placeholder="Tapez pour rechercher..."
                size="small"
              />
            )}
            isOptionEqualToValue={(option, value) => option.name === value.name}
            noOptionsText="Aucun client trouvé"
            size="small"
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Référence bordereau"
            value={filters.referenceBordereau}
            onChange={(e) => setFilters({ ...filters, referenceBordereau: e.target.value })}
            size="small"
            sx={{ minWidth: 150 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Statut Virement</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Statut Virement"
            >
              <MenuItem value="">Tous</MenuItem>
              {getAvailableStatuses().map(status => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Date Début"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Date Fin"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <Autocomplete
            options={Array.from(new Set(bordereauxTraites.map((b: any) => b.modeRecuperation).filter(Boolean))) as string[]}
            getOptionLabel={(option) => {
              const MODE_MAP: Record<string, string> = {
                'FEUILLE_CAISSE': 'Feuille de caisse',
                'VIREMENT': 'Virement',
                'CHEQUE': 'Chèque',
                'ESPECES': 'Espèces',
                'AUTRE': 'Autre',
              };
              return MODE_MAP[option as string] || option as string;
            }}
            value={filters.modeRecuperation || null}
            onChange={(_, newValue) => setFilters({ ...filters, modeRecuperation: (newValue as string) || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Mode de récupération" placeholder="Tapez pour rechercher..." size="small" />
            )}
            noOptionsText="Aucun mode trouvé"
            size="small"
            sx={{ minWidth: 180 }}
          />

          <Autocomplete
            options={Array.from(new Set(bordereauxTraites.map((b: any) => b.nomDonneur).filter(Boolean))) as string[]}
            getOptionLabel={(option) => option as string}
            value={filters.nomDonneur || null}
            onChange={(_, newValue) => setFilters({ ...filters, nomDonneur: (newValue as string) || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Nom du donneur" placeholder="Tapez pour rechercher..." size="small" />
            )}
            noOptionsText="Aucun donneur trouvé"
            size="small"
            sx={{ minWidth: 180 }}
          />

          <Autocomplete
            options={Array.from(new Set(bordereauxTraites.map((b: any) => b.numeroContrat).filter(Boolean))) as string[]}
            getOptionLabel={(option) => option as string}
            value={filters.numeroContrat || null}
            onChange={(_, newValue) => setFilters({ ...filters, numeroContrat: (newValue as string) || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Numéro de contrat" placeholder="Tapez pour rechercher..." size="small" />
            )}
            noOptionsText="Aucun contrat trouvé"
            size="small"
            sx={{ minWidth: 180 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Statut Global (Workflow)</InputLabel>
            <Select
              value={filters.statutGlobal}
              onChange={(e) => setFilters({ ...filters, statutGlobal: e.target.value })}
              label="Statut Global (Workflow)"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="EN_ATTENTE">En attente</MenuItem>
              <MenuItem value="VALIDE_INTERNE">Validé interne</MenuItem>
              <MenuItem value="VALIDE_RECOUVREMENT">Validé recouvrement</MenuItem>
              <MenuItem value="BLOQUE_RECOUVREMENT">Bloqué recouvrement</MenuItem>
              <MenuItem value="COMPTABILISE">Comptabilisé</MenuItem>
              <MenuItem value="INTEGRE_SAGE">Intégré dans Sage</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => setFilters({ society: '', status: '', donneurOrdre: '', dateFrom: '', dateTo: '', referenceBordereau: '', modeRecuperation: '', nomDonneur: '', numeroContrat: '', statutGlobal: '' })}
            size="small"
            sx={{ alignSelf: 'center' }}
          >
            Réinitialiser
          </Button>
        </Stack>
      </Paper>

      {/* ── Bloc récapitulatif des bordereaux en état Traité ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.10)',
          borderRadius: 2,
        }}
      >
        <CardContent>
          {/* Bulk Action Toolbar */}
          {canBulkUpdate() && selectedForBulkUpdate.length > 0 && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                bgcolor: '#e3f2fd',
                border: '2px solid #2196f3',
                '& .MuiAlert-message': { width: '100%' }
              }}
              action={
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => setBulkUpdateDialog(true)}
                    sx={{ fontWeight: 600 }}
                  >
                    📝 Modifier le statut
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedForBulkUpdate([])}
                  >
                    Annuler
                  </Button>
                </Stack>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedForBulkUpdate.length} virement(s) sélectionné(s)
              </Typography>
            </Alert>
          )}

          {/* Card header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            pb={1.5}
            sx={{ borderBottom: '2px solid #e8edf5' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                Bloc récapitulatif des bordereaux en état Traité
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Affichage de {filteredRecords.filter(r => r.referenceBordereau).length} bordereau(x) traité(s) — Page {page + 1}
              </Typography>
              {user?.role === 'CHEF_EQUIPE' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', display: 'block' }}>
                  Affichage limité aux bordereaux de votre équipe
                </Typography>
              )}
              {user?.role === 'GESTIONNAIRE_SENIOR' && (
                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', display: 'block' }}>
                  Affichage limité à vos clients uniquement
                </Typography>
              )}
              {user?.role === 'FINANCE' && (
                <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic', display: 'block' }}>
                  Finance: Affichage limité aux statuts Autorisé, Bloqué, Exécuté, Rejeté
                </Typography>
              )}
              {user?.role === 'RESPONSABLE_DEPARTEMENT' && (
                <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic', display: 'block' }}>
                  Responsable Département: Affichage limité aux statuts Non validé, Déposé
                </Typography>
              )}
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer
                sx={{
                  borderRadius: 1.5,
                  border: '1px solid #dde3ef',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { height: 6, width: 6 },
                  '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
                }}
              >
                <Table size="small" stickyHeader sx={{ minWidth: 1400 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
                        <Checkbox
                          sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                          indeterminate={selectedBordereaux.length > 0 && selectedBordereaux.length < filteredRecords.filter(r => !r.referenceOV).length}
                          checked={filteredRecords.filter(r => !r.referenceOV).length > 0 && selectedBordereaux.length === filteredRecords.filter(r => !r.referenceOV).length}
                          onChange={handleSelectAll}
                          title="Sélectionner pour créer OV"
                        />
                      </TableCell>
                      {canBulkUpdate() && (
                        <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
                          <Checkbox
                            sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                            indeterminate={selectedForBulkUpdate.length > 0 && selectedForBulkUpdate.length < filteredRecords.filter(r => r.referenceOV).length}
                            checked={filteredRecords.filter(r => r.referenceOV).length > 0 && selectedForBulkUpdate.length === filteredRecords.filter(r => r.referenceOV).length}
                            onChange={handleSelectAllForBulkUpdate}
                            title="Sélectionner pour modification groupée"
                          />
                        </TableCell>
                      )}
                      <TableCell sx={HEAD_CELL_SX}>Client / Société</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Référence OV</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Réf. Bordereau</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Date Finalisation</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Date Injection</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut Virement</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Date Traitement</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 160 }}>Motif / Observation</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Mode Récupération</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>Nom Donneur</TableCell>
                      <TableCell sx={HEAD_CELL_SX}>N° Contrat</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut Global</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Dem. Récup.</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Mnt Récupéré</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 200 }}>Documents</TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 220 }}>Actions par rôle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.filter(r => r.referenceBordereau).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record, index) => (
                      <TableRow
                        key={record.id}
                        sx={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                          '&:hover': { backgroundColor: '#e8f0fe' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                          {!record.referenceOV && (
                            <Checkbox
                              checked={selectedBordereaux.includes(record.id)}
                              onChange={() => handleSelectBordereau(record.id)}
                              size="small"
                              title="Sélectionner pour créer OV"
                            />
                          )}
                        </TableCell>
                        {canBulkUpdate() && (
                          <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                            {record.referenceOV && (
                              <Checkbox
                                checked={selectedForBulkUpdate.includes(record.id)}
                                onChange={() => handleSelectForBulkUpdate(record.id)}
                                size="small"
                                title="Sélectionner pour modification groupée"
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                          {record.clientSociete}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {record.referenceOV}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#37474f' }}>
                          {record.referenceBordereau}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                          {record.montantBordereau.toLocaleString('fr-TN')}{' '}
                          <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {record.dateFinalisationBordereau
                            ? new Date(record.dateFinalisationBordereau).toLocaleDateString('fr-FR')
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {record.dateInjection && record.dateInjection !== '1970-01-01T00:00:00.000Z'
                            ? new Date(record.dateInjection).toLocaleDateString('fr-FR')
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {getStatusChip(record.statutVirement)}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {record.dateTraitementVirement
                            ? new Date(record.dateTraitementVirement).toLocaleDateString('fr-FR')
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#546e7a' }}>
                            {record.motifObservation || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {(record as any).modeRecuperation || '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {(record as any).nomDonneur || '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                          {(record as any).numeroContrat || '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {record.statutGlobal ? (
                            <Chip
                              label={getStatutGlobalLabel(record.statutGlobal)}
                              color={getStatutGlobalColor(record.statutGlobal) as any}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {record.demandeRecuperation ? (
                            <Box>
                              <Chip label="Oui" color="warning" size="small" />
                              {record.dateDemandeRecuperation && (
                                <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.3 }}>
                                  {new Date(record.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Chip label="Non" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                          {record.montantRecupere ? (
                            <Box>
                              <Chip label="Oui" color="success" size="small" />
                              {record.dateMontantRecupere && (
                                <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.3 }}>
                                  {new Date(record.dateMontantRecupere).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Chip label="Non" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell sx={BODY_CELL_SX}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }}>
                            {record.referenceOV && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                    borderColor: '#1e3a5f', color: '#1e3a5f',
                                    '&:hover': { bgcolor: '#1e3a5f', color: '#fff' },
                                  }}
                                  onClick={async () => {
                                    try {
                                      const { LocalAPI } = await import('../../services/axios');
                                      const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/pdf`, { responseType: 'blob' });
                                      const blob = new Blob([response.data], { type: 'application/pdf' });
                                      const blobUrl = URL.createObjectURL(blob);
                                      setDocumentViewer({ open: true, url: blobUrl, title: `PDF OV - ${record.referenceOV}`, type: 'pdf' });
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
                                  sx={{
                                    fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                    borderColor: '#546e7a', color: '#546e7a',
                                    '&:hover': { bgcolor: '#546e7a', color: '#fff' },
                                  }}
                                  onClick={async () => {
                                    try {
                                      const { LocalAPI } = await import('../../services/axios');
                                      const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/txt`, { responseType: 'blob' });
                                      const blob = new Blob([response.data], { type: 'text/plain' });
                                      const blobUrl = URL.createObjectURL(blob);
                                      setDocumentViewer({ open: true, url: blobUrl, title: `TXT - ${record.referenceOV}`, type: 'txt' });
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
                                  sx={{
                                    fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                    '&:hover': { bgcolor: 'secondary.main', color: '#fff' },
                                  }}
                                  onClick={async () => {
                                    try {
                                      const { LocalAPI } = await import('../../services/axios');
                                      const ovResponse = await LocalAPI.get(`/finance/ordres-virement/${record.id}`);
                                      const ov = ovResponse.data;
                                      if (!ov.bordereauId) { alert('Aucun bordereau lié à cet OV'); return; }
                                      const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${ov.bordereauId}`);
                                      const ovDocuments = response.data;
                                      const pdfDoc = ovDocuments.find((doc: any) => doc.type === 'BORDEREAU_PDF');
                                      if (pdfDoc) {
                                        const docResponse = await LocalAPI.get(`/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`, { responseType: 'blob' });
                                        const blob = new Blob([docResponse.data], { type: 'application/pdf' });
                                        const blobUrl = URL.createObjectURL(blob);
                                        setDocumentViewer({ open: true, url: blobUrl, title: `PDF Uploadé - ${pdfDoc.name}`, type: 'pdf' });
                                      } else {
                                        alert('Aucun PDF uploadé trouvé');
                                      }
                                    } catch (error: any) {
                                      console.error('Error loading bordereau PDF:', error);
                                      alert(`Erreur lors du chargement du PDF\n\n${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
                                    }
                                  }}
                                >
                                  Bordereau
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={BODY_CELL_SX}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {/* Historique button - ALWAYS VISIBLE for all roles */}
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={<HistoryIcon sx={{ fontSize: '0.8rem !important' }} />}
                              onClick={() => setHistoryDialog({ open: true, virementId: record.id, reference: record.referenceOV || record.referenceBordereau })}
                              title="Voir l'historique complet des actions"
                              sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                            >
                              Historique
                            </Button>

                            {/* EXACT SPEC: Finance and Super Admin can always modify */}
                            {canModifyStatus() && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                                onClick={() => handleEditClick(record)}
                                sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                              >
                                Modifier
                              </Button>
                            )}

                            {/* EXACT SPEC: Réinjecter button - ONLY for Chef d'équipe/Gestionnaire Senior AND ONLY for REJETE/VIREMENT_NON_VALIDE status */}
                            {(user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'SUPER_ADMIN') && (
                              <Button
                                size="small"
                                color="error"
                                variant={record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE' ? 'contained' : 'outlined'}
                                disabled={record.statutVirement !== 'REJETE' && record.statutVirement !== 'VIREMENT_NON_VALIDE'}
                                onClick={() => {
                                  if (record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE') {
                                    setEditDialog({ open: false, record: null });
                                    setReinjectDialog({ open: true, record });
                                  }
                                }}
                                title={record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE'
                                  ? "Réinjecter le virement avec nouveaux fichiers"
                                  : "Disponible uniquement pour les virements rejetés ou non validés"}
                                sx={{ 
                                  fontSize: '0.68rem', 
                                  py: 0.3, 
                                  px: 0.8, 
                                  minWidth: 0, 
                                  whiteSpace: 'nowrap',
                                  opacity: (record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE') ? 1 : 0.5
                                }}
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
              </TableContainer>

              {/* Pagination */}
              <Box
                sx={{
                  mt: 1.5, display: 'flex', justifyContent: 'flex-end',
                  bgcolor: '#f4f7fb', borderRadius: 1.5,
                  border: '1px solid #e0e7ef',
                }}
              >
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
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Entrées manuelles (non liées à un bordereau) ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.10)',
          borderRadius: 2,
        }}
      >
        <CardContent>
          {/* Card header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            pb={1.5}
            sx={{ borderBottom: '2px solid #e8edf5' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                Entrées manuelles (non liées à un bordereau)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Affichage de {filteredManualOVs.length} entrée(s) manuelle(s)
              </Typography>
            </Box>
          </Box>

          {loadingManual ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredManualOVs.length === 0 ? (
            <Box
              sx={{
                p: 5, textAlign: 'center',
                bgcolor: '#f8faff', borderRadius: 2,
                border: '1px dashed #c5d4e8',
              }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                Aucune entrée manuelle trouvée
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Les entrées manuelles apparaîtront ici une fois créées
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                borderRadius: 1.5,
                border: '1px solid #dde3ef',
                overflow: 'auto',
                '&::-webkit-scrollbar': { height: 6, width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
              }}
            >
              <Table size="small" stickyHeader sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={HEAD_CELL_SX}>Client / Société</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Référence OV</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Date Injection</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut Virement</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Date Traitement</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 160 }}>Motif / Observation</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Mode Récupération</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Nom Donneur</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>N° Contrat</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Dem. Récup.</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Mnt Récupéré</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 160 }}>Documents</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 220 }}>Actions par rôle</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredManualOVs.map((record, index) => (
                    <TableRow
                      key={record.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                        '&:hover': { backgroundColor: '#e8f0fe' },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                        {record.clientSociete}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {record.referenceOV}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                        {record.montantBordereau.toLocaleString('fr-TN')}{' '}
                        <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                        {record.dateInjection && record.dateInjection !== '1970-01-01T00:00:00.000Z'
                          ? new Date(record.dateInjection).toLocaleDateString('fr-FR')
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                        {getStatusChip(record.statutVirement)}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                        {record.dateTraitementVirement
                          ? new Date(record.dateTraitementVirement).toLocaleDateString('fr-FR')
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#546e7a' }}>
                          {record.motifObservation || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {(record as any).modeRecuperation || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {(record as any).nomDonneur || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {(record as any).numeroContrat || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                        {record.demandeRecuperation ? (
                          <Box>
                            <Chip label="Oui" color="warning" size="small" />
                            {record.dateDemandeRecuperation && (
                              <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.3 }}>
                                {new Date(record.dateDemandeRecuperation).toLocaleDateString('fr-FR')}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Chip label="Non" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                        {record.montantRecupere ? (
                          <Box>
                            <Chip label="Oui" color="success" size="small" />
                            {record.dateMontantRecupere && (
                              <Typography variant="caption" display="block" sx={{ color: '#78909c', mt: 0.3 }}>
                                {new Date(record.dateMontantRecupere).toLocaleDateString('fr-FR')}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Chip label="Non" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }}>
                          {record.referenceOV && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                  borderColor: '#1e3a5f', color: '#1e3a5f',
                                  '&:hover': { bgcolor: '#1e3a5f', color: '#fff' },
                                }}
                                onClick={async () => {
                                  try {
                                    const { LocalAPI } = await import('../../services/axios');
                                    const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/pdf`, { responseType: 'blob' });
                                    const blob = new Blob([response.data], { type: 'application/pdf' });
                                    setDocumentViewer({ open: true, url: URL.createObjectURL(blob), title: `PDF OV - ${record.referenceOV}`, type: 'pdf' });
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
                                sx={{
                                  fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap',
                                  borderColor: '#546e7a', color: '#546e7a',
                                  '&:hover': { bgcolor: '#546e7a', color: '#fff' },
                                }}
                                onClick={async () => {
                                  try {
                                    const { LocalAPI } = await import('../../services/axios');
                                    const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/txt`, { responseType: 'blob' });
                                    const blob = new Blob([response.data], { type: 'text/plain' });
                                    setDocumentViewer({ open: true, url: URL.createObjectURL(blob), title: `TXT - ${record.referenceOV}`, type: 'txt' });
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
                      <TableCell sx={BODY_CELL_SX}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {/* Historique button - ALWAYS VISIBLE for all roles */}
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            startIcon={<HistoryIcon sx={{ fontSize: '0.8rem !important' }} />}
                            onClick={() => setHistoryDialog({ open: true, virementId: record.id, reference: record.referenceOV })}
                            title="Voir l'historique complet des actions"
                            sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                          >
                            Historique
                          </Button>

                          {canModifyStatus() && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                              onClick={() => handleEditClick(record)}
                              sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                            >
                              Modifier
                            </Button>
                          )}

                          {/* EXACT SPEC: Réinjecter button - ONLY for Chef d'équipe/Gestionnaire Senior AND ONLY for REJETE/VIREMENT_NON_VALIDE status */}
                          {(user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'SUPER_ADMIN') && (
                            <Button
                              size="small"
                              color="error"
                              variant={record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE' ? 'contained' : 'outlined'}
                              disabled={record.statutVirement !== 'REJETE' && record.statutVirement !== 'VIREMENT_NON_VALIDE'}
                              onClick={() => {
                                if (record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE') {
                                  setReinjectDialog({ open: true, record });
                                }
                              }}
                              title={record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE'
                                ? "Réinjecter le virement avec nouveaux fichiers"
                                : "Disponible uniquement pour les virements rejetés ou non validés"}
                              sx={{ 
                                fontSize: '0.68rem', 
                                py: 0.3, 
                                px: 0.8, 
                                minWidth: 0, 
                                whiteSpace: 'nowrap',
                                opacity: (record.statutVirement === 'REJETE' || record.statutVirement === 'VIREMENT_NON_VALIDE') ? 1 : 0.5
                              }}
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
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS — zero logic changes, minor visual polish only
      ══════════════════════════════════════════════════════════════════════ */}

      {/* EXACT SPEC: Edit Dialog with role-based actions */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, record: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Modifier — {editDialog.record?.referenceOV}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Bordereau : {editDialog.record?.referenceBordereau}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* EXACT SPEC: Service Financier peut modifier le statut de virement */}
            <FormControl fullWidth>
              <InputLabel>Statut de virement</InputLabel>
              <Select
                value={editForm.statutVirement}
                onChange={(e) => setEditForm({ ...editForm, statutVirement: e.target.value })}
                label="Statut de virement"
                disabled={!canModifyStatus()}
              >
                {getAvailableStatuses().map(status => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
              {!canModifyStatus() && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Seul le Service Financier peut modifier le statut
                </Typography>
              )}
              {user?.role === 'FINANCE' && (
                <Typography variant="caption" color="info.main" sx={{ mt: 0.5 }}>
                  Finance: Accès limité à 4 statuts (Autorisé, Bloqué, Exécuté, Rejeté)
                </Typography>
              )}
              {user?.role === 'RESPONSABLE_DEPARTEMENT' && (
                <Typography variant="caption" color="info.main" sx={{ mt: 0.5 }}>
                  Responsable Département: Accès limité à 2 statuts (Virement non validé, Virement déposé)
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Date de traitement du virement"
              type="date"
              value={editForm.dateTraitementVirement}
              onChange={(e) => setEditForm({ ...editForm, dateTraitementVirement: e.target.value })}
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
                  onChange={(e) => setEditForm({ ...editForm, motifObservation: e.target.value })}
                  fullWidth
                  helperText="Champ libre - service financier, si virement bloqué"
                  placeholder="Saisir le motif ou observation..."
                />

                {/* EXACT SPEC: Demande de récupération : Oui / Non → si Oui, afficher la date */}
                <Box sx={{ p: 2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1e3a5f' }}>Demande de récupération</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.demandeRecuperation ? 'contained' : 'outlined'}
                      color={editForm.demandeRecuperation ? 'warning' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({ ...editForm, demandeRecuperation: !editForm.demandeRecuperation })}
                    >
                      {editForm.demandeRecuperation ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.demandeRecuperation && (
                      <TextField
                        label="Date de la demande"
                        type="date"
                        value={editForm.dateDemandeRecuperation}
                        onChange={(e) => setEditForm({ ...editForm, dateDemandeRecuperation: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        required
                      />
                    )}
                  </Box>
                </Box>

                {/* EXACT SPEC: Montant récupéré : Oui / Non → si Oui, afficher la date de récupération */}
                <Box sx={{ p: 2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1e3a5f' }}>Montant récupéré</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant={editForm.montantRecupere ? 'contained' : 'outlined'}
                      color={editForm.montantRecupere ? 'success' : 'inherit'}
                      size="small"
                      onClick={() => setEditForm({ ...editForm, montantRecupere: !editForm.montantRecupere })}
                    >
                      {editForm.montantRecupere ? 'Oui' : 'Non'}
                    </Button>
                    {editForm.montantRecupere && (
                      <TextField
                        label="Date de récupération"
                        type="date"
                        value={editForm.dateMontantRecupere}
                        onChange={(e) => setEditForm({ ...editForm, dateMontantRecupere: e.target.value })}
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
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setEditDialog({ open: false, record: null })} variant="outlined">
            Annuler
          </Button>
          {/* EXACT SPEC: Réinjecter button always visible inside Corriger popup */}
          {(user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR') && (
            <Button
              onClick={() => {
                setEditDialog({ open: false, record: null });
                setReinjectDialog({ open: true, record: editDialog.record });
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
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Créer une nouvelle entrée
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cette entrée n'est pas liée à un bordereau
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
            Création manuelle d'un ordre de virement sans bordereau associé
          </Alert>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ La référence OV sera générée automatiquement de manière séquentielle (ex: OV-2026-0001, OV-2026-0002, etc.)
          </Alert>
          <Stack spacing={2.5}>
            <TextField
              label="Référence OV (générée automatiquement)"
              value={createForm.generatedReference}
              disabled
              fullWidth
              helperText="Cette référence sera attribuée lors de la création"
              sx={{ bgcolor: '#f5f5f5' }}
            />

            <Autocomplete
              options={clients}
              getOptionLabel={(option) => option.name}
              value={clients.find(c => c.name === createForm.clientName) || null}
              onChange={async (event, newValue) => {
                setCreateForm({ ...createForm, clientName: newValue?.name || '', clientId: newValue?.id || '', contractId: '' });
                // Load contracts for selected client
                if (newValue?.id) {
                  try {
                    const { LocalAPI } = await import('../../services/axios');
                    const response = await LocalAPI.get(`/contracts?clientId=${newValue.id}`);
                    setClientContracts(response.data || []);
                  } catch (error) {
                    console.error('Failed to load contracts:', error);
                    setClientContracts([]);
                  }
                } else {
                  setClientContracts([]);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Client / Société *"
                  required
                  placeholder="Tapez pour rechercher..."
                />
              )}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              noOptionsText="Aucun client trouvé"
              fullWidth
            />

            <Autocomplete
              options={clientContracts}
              getOptionLabel={(option) => `${option.codeAssure || 'N/A'} - ${option.clientName}`}
              value={clientContracts.find(c => c.id === createForm.contractId) || null}
              onChange={(event, newValue) => {
                setCreateForm({ ...createForm, contractId: newValue?.id || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Numéro de Contrat (optionnel)"
                  placeholder="Sélectionnez un contrat..."
                  helperText="Optionnel - Sélectionnez un contrat si applicable"
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={createForm.clientId ? "Aucun contrat trouvé pour ce client" : "Sélectionnez d'abord un client"}
              disabled={!createForm.clientId}
              fullWidth
            />

            <TextField
              label="Montant total (TND)"
              value={createForm.montantTotal}
              onChange={(e) => {
                setCreateForm({ ...createForm, montantTotal: e.target.value });
              }}
              fullWidth
              required
              placeholder="Ex: 1191310 ou 1,191,310 ou 1.191.310"
              helperText="Vous pouvez taper librement avec ou sans séparateurs"
            />

            <TextField
              label="Nombre d'adhérents"
              type="text"
              value={createForm.nombreAdherents}
              onChange={(e) => setCreateForm({ ...createForm, nombreAdherents: e.target.value })}
              fullWidth
              required
              placeholder="0"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setCreateDialog(false)} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleCreateManualEntry}
            variant="contained"
            disabled={!createForm.clientName || !createForm.clientId || !createForm.montantTotal || parseFloat(createForm.montantTotal.replace(/[\s,\.]/g, '')) <= 0}
            startIcon={<AddIcon />}
          >
            Créer l'entrée
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reinject Dialog */}
      <Dialog
        open={reinjectDialog.open}
        onClose={() => setReinjectDialog({ open: false, record: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Réinjecter OV</Typography>
          <Typography variant="caption" color="text.secondary">
            {reinjectDialog.record?.referenceOV} — {reinjectDialog.record?.referenceBordereau}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            Motif du rejet : {reinjectDialog.record?.motifObservation || 'Non spécifié'}
          </Alert>
          <Stack spacing={2}>
            <Box
              component="label"
              sx={{ border: '2px dashed #1976d2', borderRadius: 1.5, p: 2.5, textAlign: 'center', cursor: 'pointer', bgcolor: '#f5f9ff' }}
            >
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setReinjectFiles({ ...reinjectFiles, excel: e.target.files?.[0] || null })} style={{ display: 'none' }} />
              <Typography variant="body2">{reinjectFiles.excel ? `✅ ${reinjectFiles.excel.name}` : '📄 Nouveau fichier Excel'}</Typography>
            </Box>
            <Box
              component="label"
              sx={{ border: '2px dashed #d32f2f', borderRadius: 1.5, p: 2.5, textAlign: 'center', cursor: 'pointer', bgcolor: '#fff5f5' }}
            >
              <input type="file" accept=".pdf" onChange={(e) => setReinjectFiles({ ...reinjectFiles, pdf: e.target.files?.[0] || null })} style={{ display: 'none' }} />
              <Typography variant="body2">{reinjectFiles.pdf ? `✅ ${reinjectFiles.pdf.name}` : '📝 Nouveau fichier PDF'}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setReinjectDialog({ open: false, record: null })} variant="outlined">Annuler</Button>
          <Button
            onClick={async () => {
              if (!reinjectFiles.excel || !reinjectFiles.pdf) {
                alert('Les deux fichiers sont obligatoires!');
                return;
              }
              try {
                const { LocalAPI } = await import('../../services/axios');
                
                // Create FormData to send files
                const formData = new FormData();
                formData.append('files', reinjectFiles.excel);
                formData.append('files', reinjectFiles.pdf);
                
                // Send reinject request with files
                await LocalAPI.put(`/finance/ordres-virement/${reinjectDialog.record!.id}/reinject`, formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data'
                  }
                });
                
                alert('OV réinjecté avec succès! Notification envoyée au Responsable.');
                setReinjectDialog({ open: false, record: null });
                setReinjectFiles({ excel: null, pdf: null });
                await loadBordereauxTraites();
                await loadManualOVs();
              } catch (error: any) {
                console.error('Erreur lors de la réinjection:', error);
                alert('Erreur lors de la réinjection: ' + (error.response?.data?.message || error.message));
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
        onClose={() => setDocumentViewer({ open: false, url: '', title: '', type: 'pdf' })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh', borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>{documentViewer.title}</Typography>
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
              onClick={() => setDocumentViewer({ open: false, url: '', title: '', type: 'pdf' })}
              size="small"
              variant="outlined"
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
                  style={{ width: '100%', height: '100%', border: '1px solid #ddd', backgroundColor: 'white', fontFamily: 'monospace', fontSize: '14px' }}
                  title={documentViewer.title}
                />
              </Box>
            )
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '18px', color: '#666' }}>
              Chargement du document...
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Correct OV Dialog */}
      <Dialog
        open={correctOVOpen}
        onClose={() => setCorrectOVOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Corriger l'Ordre de Virement</Typography>
        </DialogTitle>
        <DialogContent>
          {correctOVData && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Alert severity="info">
                Vous pouvez corriger les informations de l'ordre de virement avant de le réinjecter.
              </Alert>
              <TextField
                fullWidth
                label="Référence"
                value={correctOVData.reference}
                disabled
                helperText="La référence ne peut pas être modifiée"
              />
              <TextField
                fullWidth
                type="number"
                label="Montant Total (TND)"
                value={correctOVData.montantTotal}
                onChange={(e) => setCorrectOVData((prev: any) => ({ ...prev, montantTotal: parseFloat(e.target.value) || 0 }))}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Nombre Adhérents"
                value={correctOVData.nombreAdherents}
                onChange={(e) => setCorrectOVData((prev: any) => ({ ...prev, nombreAdherents: parseInt(e.target.value) || 0 }))}
                required
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observations"
                value={correctOVData.observations}
                onChange={(e) => setCorrectOVData((prev: any) => ({ ...prev, observations: e.target.value }))}
                helperText="Notes sur les corrections effectuées"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setCorrectOVOpen(false)} variant="outlined">Annuler</Button>
          <Button onClick={handleSaveCorrection} variant="contained" color="primary">
            Sauvegarder et Réinjecter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restart Processing Dialog */}
      <Dialog
        open={restartProcessingOpen}
        onClose={() => setRestartProcessingOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>Relancer le Traitement Financier</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedForRestart && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Alert severity="warning">
                <strong>Attention :</strong> Cette action va réinitialiser le statut du virement et relancer le traitement financier complet.
              </Alert>
              <Box
                sx={{
                  p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5,
                  border: '1px solid #dde3ef',
                }}
              >
                <Grid container spacing={1.5}>
                  <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.70rem' }}>Référence OV</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2" sx={{ fontWeight: 600, color: '#1e3a5f', fontFamily: 'monospace' }}>{selectedForRestart.referenceOV}</Typography></Grid>
                  <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.70rem' }}>Bordereau</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2">{selectedForRestart.referenceBordereau || 'Entrée manuelle'}</Typography></Grid>
                  <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.70rem' }}>Statut actuel</Typography></Grid>
                  <Grid item xs={8}>{getStatusChip(selectedForRestart.statutVirement)}</Grid>
                  <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.70rem' }}>Société</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2">{selectedForRestart.clientSociete}</Typography></Grid>
                </Grid>
              </Box>
              <Alert severity="info">
                Le virement sera remis en statut "Non Exécuté" et pourra être retraité par le service financier.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setRestartProcessingOpen(false)} variant="outlined">Annuler</Button>
          <Button onClick={handleConfirmRestart} variant="contained" color="warning">
            Confirmer la Relance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Virement History Dialog */}
      <VirementHistoryDialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, virementId: '', reference: '' })}
        virementId={historyDialog.virementId}
        virementReference={historyDialog.reference}
      />

      {/* Global History Dialog */}
      <GlobalHistoryDialog
        open={globalHistoryDialog}
        onClose={() => setGlobalHistoryDialog(false)}
      />

      {/* Bulk Update Status Dialog */}
      <Dialog
        open={bulkUpdateDialog}
        onClose={() => setBulkUpdateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              Modification Groupée du Statut
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedForBulkUpdate.length} virement(s) sélectionné(s)
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
            Cette action modifiera le statut de tous les virements sélectionnés en une seule opération.
          </Alert>
          <Stack spacing={2.5}>
            <FormControl fullWidth required>
              <InputLabel>Nouveau Statut</InputLabel>
              <Select
                value={bulkUpdateForm.statutVirement}
                onChange={(e) => setBulkUpdateForm({ ...bulkUpdateForm, statutVirement: e.target.value })}
                label="Nouveau Statut"
              >
                {getAvailableStatuses().map(status => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
              {user?.role === 'FINANCE' && (
                <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                  Finance: Accès limité à 4 statuts (Autorisé, Bloqué, Exécuté, Rejeté)
                </Typography>
              )}
              {user?.role === 'RESPONSABLE_DEPARTEMENT' && (
                <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                  Responsable Département: Accès limité à 2 statuts (Virement non validé, Virement déposé)
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Motif / Observation (optionnel)"
              multiline
              rows={3}
              value={bulkUpdateForm.motifObservation}
              onChange={(e) => setBulkUpdateForm({ ...bulkUpdateForm, motifObservation: e.target.value })}
              fullWidth
              placeholder="Saisir un motif ou observation pour tous les virements..."
              helperText="Ce commentaire sera appliqué à tous les virements sélectionnés"
            />

            <Alert severity="warning">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Attention: Cette action est irréversible!
              </Typography>
              <Typography variant="caption">
                Tous les virements sélectionnés seront mis à jour avec le même statut.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setBulkUpdateDialog(false)} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleBulkUpdateStatus}
            variant="contained"
            color="primary"
            disabled={!bulkUpdateForm.statutVirement}
          >
            Appliquer à {selectedForBulkUpdate.length} virement(s)
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default TrackingTab;