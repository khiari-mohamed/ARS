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
  nombreAdherents?: number; // UI label: "Nombre de BS" (DB field unchanged)
  observation?: string;
  dateFinalisationBordereau?: string;
  dateInjection: string;
  statutVirement: 'NON_EXECUTE' | 'EN_COURS_VALIDATION' | 'VIREMENT_DEPOSE' | 'VIREMENT_NON_VALIDE' | 'VIREMENT_AUTORISE' | 'BLOQUE' | 'EXECUTE' | 'REJETE';
  statutGlobal?: string;
  modeRecuperation?: string;
  numeroContrat?: string;
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

/** Display a bank-ready bordereau ref. Never show "Entrée manuelle". */
const displayRefBordereau = (record: BordereauTraite): string => {
  const ref = record.referenceBordereau?.trim() || '';
  if (!ref || /^entr[ée]e\s*manuelle$/i.test(ref)) return '—';
  return ref;
};

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
    referenceOV: '',
    compagnie: '',
    modeRecuperation: '',
    nomDonneur: '',
    numeroContrat: '',
    statutGlobal: '',
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean, record: BordereauTraite | null }>({
    open: false, record: null
  });
  const [recoveryDialog, setRecoveryDialog] = useState<{ open: boolean, record: BordereauTraite | null }>({
    open: false, record: null
  });
  const [recoveryForm, setRecoveryForm] = useState({
    dateTraitementVirement: '',
    motifObservation: '',
    demandeRecuperation: false,
    dateDemandeRecuperation: '',
    montantRecupere: false,
    dateMontantRecupere: ''
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
    contractId: '',
    donneurOrdreId: '',
    montantTotal: '',
    nombreAdherents: '', // UI: Nombre de BS
    generatedReference: '',
    referenceBordereau: '', // FREE TEXT — not a FK. Written into TXT/PDF/SAGE.
    observation: '',
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
  const [reinjectLoading, setReinjectLoading] = useState(false);
  const [reinjectError, setReinjectError] = useState<string | null>(null);
  const [reinjectSuccess, setReinjectSuccess] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [manualPage, setManualPage] = useState(0);
  const [manualRowsPerPage, setManualRowsPerPage] = useState(20);
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
  const [donneurs, setDonneurs] = useState<any[]>([]);
  const [changeDonneurDialog, setChangeDonneurDialog] = useState<{ open: boolean; record: BordereauTraite | null }>({ open: false, record: null });
  const [selectedDonneurId, setSelectedDonneurId] = useState<string>('');
  const [changeDonneurLoading, setChangeDonneurLoading] = useState(false);

  const loadDonneurs = async () => {
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/finance/donneurs-ordre');
      setDonneurs(response.data);
    } catch (error) {
      console.error('Failed to load donneurs:', error);
    }
  };

  const handleChangeDonneur = async () => {
    if (!changeDonneurDialog.record || !selectedDonneurId) return;
    
    setChangeDonneurLoading(true);
    try {
      const { LocalAPI } = await import('../../services/axios');
      await LocalAPI.put(`/finance/ordres-virement/${changeDonneurDialog.record.id}/donneur`, {
        donneurOrdreId: selectedDonneurId
      });
      alert('Donneur mis à jour avec succès!');
      setChangeDonneurDialog({ open: false, record: null });
      setSelectedDonneurId('');
      await loadBordereauxTraites();
      await loadManualOVs();
    } catch (error: any) {
      console.error('Failed to change donneur:', error);
      alert('Erreur lors du changement de donneur: ' + (error.response?.data?.message || error.message));
    } finally {
      setChangeDonneurLoading(false);
    }
  };

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
    loadDonneurs();
    loadBordereauxTraites();
    loadManualOVs();
  }, []);

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
    if (filters.referenceOV) {
      filtered = filtered.filter(r => r.referenceOV?.toLowerCase().includes(filters.referenceOV.toLowerCase()));
    }
    if (filters.compagnie) {
      filtered = filtered.filter(r => (r as any).compagnieAssurance?.toLowerCase().includes(filters.compagnie.toLowerCase()));
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
      filtered = filtered.filter(r => r.referenceOV?.toLowerCase().includes(filters.referenceBordereau.toLowerCase()) || r.referenceBordereau?.toLowerCase().includes(filters.referenceBordereau.toLowerCase()));
    }
    if (filters.referenceOV) {
      filtered = filtered.filter(r => r.referenceOV?.toLowerCase().includes(filters.referenceOV.toLowerCase()));
    }
    if (filters.compagnie) {
      filtered = filtered.filter(r => (r as any).compagnieAssurance?.toLowerCase().includes(filters.compagnie.toLowerCase()));
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
    setManualPage(0);
  }, [manualOVs, filters, user?.role]);

  const getStatusChip = (status: string) => {
    const statusLabels: Record<string, string> = {
      'NON_EXECUTE':         'Virement non créé',
      'EN_COURS_VALIDATION': 'En cours de validation',
      'VIREMENT_DEPOSE':     'Virement déposé',
      'VIREMENT_NON_VALIDE': 'Virement non validé',
      'VIREMENT_AUTORISE':   'Virement autorisé',
      'BLOQUE':              'Virement bloqué',
      'EXECUTE':             'Virement exécuté',
      'REJETE':              'Virement rejeté',
    };

    const statusColors: Record<string, string> = {
      'NON_EXECUTE':         'default',
      'EN_COURS_VALIDATION': 'info',
      'VIREMENT_DEPOSE':     'primary',
      'VIREMENT_NON_VALIDE': 'error',
      'VIREMENT_AUTORISE':   'success',
      'BLOQUE':              'warning',
      'EXECUTE':             'success',
      'REJETE':              'error',
    };

    const statusIcons: Record<string, string> = {
      'NON_EXECUTE':         '⏳',
      'EN_COURS_VALIDATION': '📝',
      'VIREMENT_DEPOSE':     '📤',
      'VIREMENT_NON_VALIDE': '❌',
      'VIREMENT_AUTORISE':   '✅',
      'BLOQUE':              '⏸️',
      'EXECUTE':             '✅',
      'REJETE':              '❌',
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
    setEditDialog({ open: true, record });
  };

  const handleRecoveryEditClick = (record: BordereauTraite) => {
    setRecoveryForm({
      dateTraitementVirement: record.dateTraitementVirement || '',
      motifObservation: record.motifObservation || record.observation || '',
      demandeRecuperation: record.demandeRecuperation || false,
      dateDemandeRecuperation: record.dateDemandeRecuperation || '',
      montantRecupere: record.montantRecupere || false,
      dateMontantRecupere: record.dateMontantRecupere || ''
    });
    setRecoveryDialog({ open: true, record });
  };

  const handleSaveRecoveryInfo = async () => {
    if (!recoveryDialog.record) return;

    try {
      const financeService = await import('../../services/financeService');
      await financeService.financeService.updateRecoveryInfo(recoveryDialog.record.id, {
        dateTraitementVirement: recoveryForm.dateTraitementVirement || null,
        motifObservation: recoveryForm.motifObservation,
        demandeRecuperation: recoveryForm.demandeRecuperation,
        dateDemandeRecuperation: recoveryForm.demandeRecuperation ? recoveryForm.dateDemandeRecuperation : null,
        montantRecupere: recoveryForm.montantRecupere,
        dateMontantRecupere: recoveryForm.montantRecupere ? recoveryForm.dateMontantRecupere : null
      });
      setRecoveryDialog({ open: false, record: null });
      await loadBordereauxTraites();
      await loadManualOVs();
      alert('Informations de récupération mises à jour avec succès!');
    } catch (error: any) {
      console.error('Failed to update recovery info:', error);
      alert('Erreur lors de la mise à jour: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleReinject = async (recordId: string, excelFile: File, pdfFile: File): Promise<boolean> => {
    setReinjectLoading(true);
    setReinjectError(null);
    try {
      const { LocalAPI } = await import('../../services/axios');
      const formData = new FormData();
      formData.append('files', excelFile);
      formData.append('files', pdfFile);
      await LocalAPI.put(`/finance/ordres-virement/${recordId}/reinject`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReinjectSuccess(true);
      await loadBordereauxTraites();
      await loadManualOVs();
      return true;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la réinjection';
      setReinjectError(Array.isArray(msg) ? msg.join(', ') : msg);
      return false;
    } finally {
      setReinjectLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record) return;

    try {
      const financeService = await import('../../services/financeService');

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

  const resetCreateForm = () => {
    setCreateForm({
      clientName: '',
      clientId: '',
      contractId: '',
      donneurOrdreId: '',
      montantTotal: '',
      nombreAdherents: '',
      generatedReference: '',
      referenceBordereau: '',
      observation: '',
    });
    setClientContracts([]);
  };

  const handleCreateManualEntry = async () => {
    const refBrdx = createForm.referenceBordereau.trim();
    if (!refBrdx) {
      alert('La référence bordereau est obligatoire : elle sera inscrite dans le fichier TXT envoyé à la banque.');
      return;
    }

    const manualOVPdfPath = sessionStorage.getItem('manualOVPdfPath');

    const cleanMontant = createForm.montantTotal.replace(/[\s,\.]/g, '');
    const montantTotal = parseFloat(cleanMontant) || 0;

    // Persist the FREE-TEXT ref. No bordereauId is set — this is not a FK.
    sessionStorage.setItem('manualOVData', JSON.stringify({
      clientName: createForm.clientName,
      clientId: createForm.clientId,
      contractId: createForm.contractId || null,
      montantTotal: montantTotal,
      nombreAdherents: parseInt(createForm.nombreAdherents) || 0, // Nombre de BS
      referenceBordereau: refBrdx,
      observation: createForm.observation.trim(),
      isManual: true,
      uploadedPdfPath: manualOVPdfPath
    }));

    setCreateDialog(false);
    resetCreateForm();

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', '2');
    currentUrl.searchParams.set('manual', 'true');
    window.location.href = currentUrl.toString();
  };

  const isLocked = (record: BordereauTraite) =>
    record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN';

  const canModifyStatus = () => {
    return user?.role === 'FINANCE' || user?.role === 'COMPTABILITE' || user?.role === 'SUPER_ADMIN' || user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'RESPONSABLE_DEPARTEMENT';
  };

  const canBulkUpdate = () => {
    return user?.role === 'FINANCE' || user?.role === 'COMPTABILITE' || user?.role === 'SUPER_ADMIN' || user?.role === 'RESPONSABLE_DEPARTEMENT';
  };

  const canReinject = () => {
    return user?.role === 'CHEF_EQUIPE' || user?.role === 'SUPER_ADMIN' || user?.role === 'GESTIONNAIRE_SENIOR';
  };

  const getAvailableStatuses = () => {
    return [
      { value: 'NON_EXECUTE', label: '⏳ Virement non créé' },
      { value: 'EN_COURS_VALIDATION', label: '📝 En cours de validation' },
      { value: 'VIREMENT_DEPOSE', label: '💼 Virement déposé' },
      { value: 'VIREMENT_NON_VALIDE', label: '❌ Virement non validé' },
      { value: 'VIREMENT_AUTORISE', label: '✅ Virement autorisé' },
      { value: 'BLOQUE', label: '⏸️ Virement bloqué' },
      { value: 'EXECUTE', label: '✅ Virement exécuté' },
      { value: 'REJETE', label: '❌ Virement rejeté' },
    ];
  };

  const getEditableStatuses = () => {
    if (user?.role === 'FINANCE') {
      return [
        { value: 'VIREMENT_AUTORISE', label: '✅ Virement autorisé' },
        { value: 'BLOQUE', label: '⏸️ Virement bloqué' },
      ];
    }
    if (user?.role === 'COMPTABILITE') {
      return [
        { value: 'EXECUTE', label: '✅ Virement exécuté' },
        { value: 'REJETE', label: '❌ Virement rejeté' },
      ];
    }
    if (user?.role === 'RESPONSABLE_DEPARTEMENT') {
      return [
        { value: 'VIREMENT_NON_VALIDE', label: '❌ Virement non validé' },
        { value: 'VIREMENT_DEPOSE', label: '💼 Virement déposé' },
      ];
    }
    if (!user || user.role === 'SUPER_ADMIN' || user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      return [
        { value: 'NON_EXECUTE', label: '⏳ Virement non créé' },
        { value: 'EN_COURS_VALIDATION', label: '📝 En cours de validation' },
        { value: 'VIREMENT_DEPOSE', label: '💼 Virement déposé' },
        { value: 'VIREMENT_NON_VALIDE', label: '❌ Virement non validé' },
        { value: 'VIREMENT_AUTORISE', label: '✅ Virement autorisé' },
        { value: 'BLOQUE', label: '⏸️ Virement bloqué' },
        { value: 'EXECUTE', label: '✅ Virement exécuté' },
        { value: 'REJETE', label: '❌ Virement rejeté' },
      ];
    }

    return [];
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
      const errors: string[] = [];
      const allowedIds: string[] = [];
      for (const virementId of selectedForBulkUpdate) {
        const record = [...filteredRecords, ...filteredManualOVs].find(r => r.id === virementId);
        if (record && record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN') {
          errors.push(`Virement ${virementId}: Virement exécuté — modification verrouillée`);
          continue;
        }
        allowedIds.push(virementId);
      }

      if (allowedIds.length === 0) {
        alert('Aucun virement autorisé à la mise à jour.');
        return;
      }

      const resp = await financeService.financeService.bulkUpdateEtatVirement(allowedIds, {
        etatVirement: bulkUpdateForm.statutVirement as any,
        commentaire: bulkUpdateForm.motifObservation
      });

      const successCount = resp.updated || 0;
      const failed: Array<{ id: string; success: boolean; error?: string }> = resp.failed || [];
      const errorCount = failed.length + errors.length;
      for (const f of failed) {
        errors.push(`Virement ${f.id}: ${f.error || 'Erreur inconnue'}`);
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

  const createFormValid =
    !!createForm.clientName &&
    !!createForm.clientId &&
    !!createForm.montantTotal &&
    parseFloat(createForm.montantTotal.replace(/[\s,\.]/g, '')) > 0 &&
    !!createForm.referenceBordereau.trim();

  const selectedContract = clientContracts.find(contract => contract.id === createForm.contractId);

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

          <TextField
            label="Référence OV"
            value={filters.referenceOV}
            onChange={(e) => setFilters({ ...filters, referenceOV: e.target.value })}
            size="small"
            placeholder="Ex: OV-2026-0001"
            sx={{ minWidth: 160 }}
          />

          <Autocomplete
            options={Array.from(new Set(bordereauxTraites.map((b: any) => b.compagnieAssurance).filter(Boolean))) as string[]}
            getOptionLabel={(option) => option as string}
            value={filters.compagnie || null}
            onChange={(_, newValue) => setFilters({ ...filters, compagnie: (newValue as string) || '' })}
            renderInput={(params) => (
              <TextField {...params} label="Compagnie d'assurance" placeholder="Tapez pour rechercher..." size="small" />
            )}
            noOptionsText="Aucune compagnie trouvée"
            size="small"
            sx={{ minWidth: 200 }}
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
            onClick={() => setFilters({ society: '', status: '', donneurOrdre: '', dateFrom: '', dateTo: '', referenceBordereau: '', referenceOV: '', compagnie: '', modeRecuperation: '', nomDonneur: '', numeroContrat: '', statutGlobal: '' })}
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
              {(user?.role === 'FINANCE' || user?.role === 'COMPTABILITE') && (
                <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic', display: 'block' }}>
                  Finance / Comptabilité : Affichage limité aux statuts Autorisé, Bloqué, Exécuté, Rejeté
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
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Nombre de BS</TableCell>
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
                        backgroundColor: record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN'
                          ? '#f5f5f5'
                          : index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                          opacity: record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN' ? 0.75 : 1,
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
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#37474f', fontFamily: 'monospace', fontWeight: 600 }}>
                          {displayRefBordereau(record)}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                          {record.montantBordereau.toLocaleString('fr-TN')}{' '}
                          <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1e3a5f' }}>
                          {record.nombreAdherents != null
                            ? record.nombreAdherents.toLocaleString('fr-TN')
                            : '—'}
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
                            {record.motifObservation || record.observation || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {record.modeRecuperation || '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {(record as any).nomDonneur || '—'}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                          {record.numeroContrat || '—'}
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

                            {canModifyStatus() && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                                onClick={() => handleEditClick(record)}
                                disabled={isLocked(record)}
                                title={isLocked(record) ? 'Virement exécuté — modification verrouillée' : 'Modifier'}
                                sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                              >
                                {isLocked(record) ? '🔒 Verrouillé' : 'Modifier'}
                              </Button>
                            )}

                            {user?.role === 'COMPTABILITE' && record.statutVirement === 'EXECUTE' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                                onClick={() => handleRecoveryEditClick(record)}
                                title="Modifier les informations de récupération, même après exécution"
                                sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                              >
                                Récupération
                              </Button>
                            )}

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

                            {user?.role === 'SUPER_ADMIN' && record.referenceOV && (
                              <Button
                                size="small"
                                color="secondary"
                                variant="outlined"
                                onClick={() => {
                                  setChangeDonneurDialog({ open: true, record });
                                  setSelectedDonneurId('');
                                }}
                                title="Changer le donneur d'ordre (Super Admin uniquement)"
                                sx={{
                                  fontSize: '0.68rem',
                                  py: 0.3,
                                  px: 0.8,
                                  minWidth: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🔧 Donneur
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

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
                Affichage de {filteredManualOVs.length} entrée(s) manuelle(s) — Page {manualPage + 1}
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
                    <TableCell sx={HEAD_CELL_SX}>Réf. Bordereau</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                    <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Nombre de BS</TableCell>
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
                  {filteredManualOVs.slice(manualPage * manualRowsPerPage, manualPage * manualRowsPerPage + manualRowsPerPage).map((record, index) => (
                    <TableRow
                      key={record.id}
                      sx={{
                        backgroundColor: record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN'
                          ? '#f5f5f5'
                          : index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                          opacity: record.statutVirement === 'EXECUTE' && user?.role !== 'SUPER_ADMIN' ? 0.75 : 1,
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
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#37474f', fontFamily: 'monospace', fontWeight: 600 }}>
                        {displayRefBordereau(record)}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1b5e20' }}>
                        {record.montantBordereau.toLocaleString('fr-TN')}{' '}
                        <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1e3a5f' }}>
                        {record.nombreAdherents != null
                          ? record.nombreAdherents.toLocaleString('fr-TN')
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
                          {record.motifObservation || record.observation || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {record.modeRecuperation || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {(record as any).nomDonneur || '—'}
                      </TableCell>
                      <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {record.numeroContrat || '—'}
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
                                    const response = await LocalAPI.get(`/finance/ordres-virement/${record.id}/uploaded-pdf`, { responseType: 'blob' });
                                    const blob = new Blob([response.data], { type: 'application/pdf' });
                                    setDocumentViewer({ open: true, url: URL.createObjectURL(blob), title: `PDF Uploadé - ${record.referenceOV}`, type: 'pdf' });
                                  } catch (error: any) {
                                    alert(`Aucun PDF uploadé trouvé pour cet OV\n${error.response?.data?.message || error.message || ''}`);
                                  }
                                }}
                              >
                                PDF Uploadé
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                              disabled={isLocked(record)}
                              title={isLocked(record) ? 'Virement exécuté — modification verrouillée' : 'Modifier'}
                              sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                            >
                              {isLocked(record) ? '🔒 Verrouillé' : 'Modifier'}
                            </Button>
                          )}

                          {user?.role === 'COMPTABILITE' && record.statutVirement === 'EXECUTE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                              onClick={() => handleRecoveryEditClick(record)}
                              title="Modifier les informations de récupération, même après exécution"
                              sx={{ fontSize: '0.68rem', py: 0.3, px: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}
                            >
                              Récupération
                            </Button>
                          )}

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

                          {user?.role === 'SUPER_ADMIN' && record.referenceOV && (
                            <Button
                              size="small"
                              color="secondary"
                              variant="outlined"
                              onClick={() => {
                                setChangeDonneurDialog({ open: true, record });
                                setSelectedDonneurId('');
                              }}
                              title="Changer le donneur d'ordre (Super Admin uniquement)"
                              sx={{
                                fontSize: '0.68rem',
                                py: 0.3,
                                px: 0.8,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              🔧 Donneur
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

          {filteredManualOVs.length > 0 && (
            <Box
              sx={{
                mt: 1.5, display: 'flex', justifyContent: 'flex-end',
                bgcolor: '#f4f7fb', borderRadius: 1.5,
                border: '1px solid #e0e7ef',
              }}
            >
              <TablePagination
                component="div"
                count={filteredManualOVs.length}
                page={manualPage}
                onPageChange={(e, newPage) => setManualPage(newPage)}
                rowsPerPage={manualRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setManualRowsPerPage(parseInt(e.target.value, 10));
                  setManualPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

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
            Bordereau : {displayRefBordereau(editDialog.record || { referenceBordereau: '' } as BordereauTraite)}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Statut de virement</InputLabel>
              <Select
                value={editForm.statutVirement}
                onChange={(e) => setEditForm({ ...editForm, statutVirement: e.target.value })}
                label="Statut de virement"
                disabled={!canModifyStatus()}
              >
                {getEditableStatuses().map(status => (
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
                  Finance : Accès limité à 4 statuts (Autorisé, Bloqué, Exécuté, Rejeté)
                </Typography>
              )}
              {user?.role === 'COMPTABILITE' && (
                <Typography variant="caption" color="info.main" sx={{ mt: 0.5 }}>
                  Comptabilité : Accès limité aux virements autorisés, puis uniquement à Exécuté ou Rejeté.
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

      <Dialog
        open={recoveryDialog.open}
        onClose={() => setRecoveryDialog({ open: false, record: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Modifier les informations de récupération
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {recoveryDialog.record?.referenceOV} — disponible même après exécution
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Mode de récupération"
              value={recoveryDialog.record?.modeRecuperation || 'Non renseigné'}
              fullWidth
              InputProps={{ readOnly: true }}
              sx={{ bgcolor: '#f5f5f5' }}
            />
            <TextField
              label="Date de traitement du virement"
              type="date"
              value={recoveryForm.dateTraitementVirement}
              onChange={(e) => setRecoveryForm({ ...recoveryForm, dateTraitementVirement: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Motif / Observation"
              multiline
              rows={3}
              value={recoveryForm.motifObservation}
              onChange={(e) => setRecoveryForm({ ...recoveryForm, motifObservation: e.target.value })}
              fullWidth
              placeholder="Saisir le motif ou observation..."
              helperText="Champ libre, modifiable après exécution"
            />
            <Box sx={{ p: 2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1e3a5f' }}>Demande de récupération</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant={recoveryForm.demandeRecuperation ? 'contained' : 'outlined'}
                  color={recoveryForm.demandeRecuperation ? 'warning' : 'inherit'}
                  size="small"
                  onClick={() => setRecoveryForm({ ...recoveryForm, demandeRecuperation: !recoveryForm.demandeRecuperation })}
                >
                  {recoveryForm.demandeRecuperation ? 'Oui' : 'Non'}
                </Button>
                {recoveryForm.demandeRecuperation && (
                  <TextField
                    label="Date de la demande"
                    type="date"
                    value={recoveryForm.dateDemandeRecuperation}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, dateDemandeRecuperation: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                )}
              </Stack>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#f0f4ff', border: '1px solid #d0dff5', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1e3a5f' }}>Montant récupéré</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant={recoveryForm.montantRecupere ? 'contained' : 'outlined'}
                  color={recoveryForm.montantRecupere ? 'success' : 'inherit'}
                  size="small"
                  onClick={() => setRecoveryForm({ ...recoveryForm, montantRecupere: !recoveryForm.montantRecupere })}
                >
                  {recoveryForm.montantRecupere ? 'Oui' : 'Non'}
                </Button>
                {recoveryForm.montantRecupere && (
                  <TextField
                    label="Date de récupération"
                    type="date"
                    value={recoveryForm.dateMontantRecupere}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, dateMontantRecupere: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setRecoveryDialog({ open: false, record: null })} variant="outlined">Annuler</Button>
          <Button onClick={handleSaveRecoveryInfo} variant="contained" color="warning">Sauvegarder</Button>
        </DialogActions>
      </Dialog>

      {/* Créer nouvelle entrée — Réf. Bordereau = champ texte, PAS une FK */}
      <Dialog
        open={createDialog}
        onClose={() => { setCreateDialog(false); resetCreateForm(); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            Créer une nouvelle entrée
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cette entrée n'est pas liée à un bordereau scanné
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
            Création manuelle d'un ordre de virement sans bordereau associé.
            Le processus de génération (TXT / PDF / SAGE) est identique à celui d'un bordereau scanné.
          </Alert>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ La référence OV sera générée automatiquement de manière séquentielle (ex: OV-2026-0001, OV-2026-0002, etc.)
          </Alert>
          <Alert severity="warning" sx={{ mb: 2 }}>
            La <strong>Référence bordereau</strong> est obligatoire : la banque refuse tout fichier TXT
            sans cette référence. Ce n'est <strong>pas</strong> un lien vers un bordereau existant —
            c'est un champ libre, au même format qu'une réf. bordereau classique, inscrit tel quel
            dans le TXT, le PDF et SAGE.
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

            <TextField
              label="Référence bordereau *"
              value={createForm.referenceBordereau}
              onChange={(e) => setCreateForm({ ...createForm, referenceBordereau: e.target.value })}
              fullWidth
              required
              autoFocus
              placeholder="Ex: BRD-2026-0142"
              helperText="Format identique à une réf. bordereau. Inscrite dans le TXT banque — aucun lien avec un bordereau scanné."
              inputProps={{ maxLength: 64 }}
            />

            <Autocomplete
              options={clients}
              getOptionLabel={(option) => option.name}
              value={clients.find(c => c.name === createForm.clientName) || null}
              onChange={async (event, newValue) => {
                setCreateForm({ ...createForm, clientName: newValue?.name || '', clientId: newValue?.id || '', contractId: '' });
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
              value={selectedContract || null}
              onChange={(event, newValue) => {
                setCreateForm({ ...createForm, contractId: newValue?.id || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Numéro de Contrat"
                  placeholder="Sélectionnez un contrat..."
                  helperText="Requis pour afficher le Mode de Récupération et le N° Contrat dans le tableau"
                  color={createForm.clientId && !createForm.contractId ? 'warning' : 'primary'}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={createForm.clientId ? "Aucun contrat trouvé pour ce client" : "Sélectionnez d'abord un client"}
              disabled={!createForm.clientId}
              fullWidth
            />

            <Box
              sx={{
                p: 2,
                bgcolor: selectedContract ? '#f0f4ff' : '#fafafa',
                border: '1px solid',
                borderColor: selectedContract ? '#d0dff5' : '#e0e0e0',
                borderRadius: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 1 }}>
                Informations récupérées du contrat
                {!selectedContract && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                    — sélectionnez un contrat ci-dessus
                  </Typography>
                )}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Mode de récupération"
                    value={selectedContract?.modeRecuperation || '—'}
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: 'white' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="N° Contrat / Code assuré"
                    value={selectedContract?.codeAssure || '—'}
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: 'white' }}
                  />
                </Grid>
              </Grid>
            </Box>

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
              label="Nombre de BS"
              type="text"
              value={createForm.nombreAdherents}
              onChange={(e) => setCreateForm({ ...createForm, nombreAdherents: e.target.value.replace(/[^\d]/g, '') })}
              fullWidth
              required
              placeholder="0"
              helperText="Nombre de bulletins de soin (anciennement « Nombre d'adhérents »)"
            />

            <TextField
              label="Observation"
              value={createForm.observation}
              onChange={(e) => setCreateForm({ ...createForm, observation: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Saisir une observation (optionnel)..."
              helperText="Champ libre — reporté sur l'OV et visible dans Suivi & Statut"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => { setCreateDialog(false); resetCreateForm(); }} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleCreateManualEntry}
            variant="contained"
            disabled={!createFormValid}
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
            {reinjectDialog.record?.referenceOV} — {displayRefBordereau(reinjectDialog.record || { referenceBordereau: '' } as BordereauTraite)}
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
              const succeeded = await handleReinject(reinjectDialog.record!.id, reinjectFiles.excel, reinjectFiles.pdf);
              if (succeeded) {
                alert('OV réinjecté avec succès! Notification envoyée au Responsable.');
                setReinjectDialog({ open: false, record: null });
                setReinjectFiles({ excel: null, pdf: null });
              }
            }}
            variant="contained"
            color="error"
            disabled={!reinjectFiles.excel || !reinjectFiles.pdf || reinjectLoading}
          >
            {reinjectLoading ? 'Réinjection en cours...' : 'Réinjecter et Envoyer'}
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
                label="Nombre de BS"
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
                  <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', fontSize: '0.70rem' }}>Réf. Bordereau</Typography></Grid>
                  <Grid item xs={8}><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{displayRefBordereau(selectedForRestart)}</Typography></Grid>
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

      <VirementHistoryDialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, virementId: '', reference: '' })}
        virementId={historyDialog.virementId}
        virementReference={historyDialog.reference}
      />

      <GlobalHistoryDialog
        open={globalHistoryDialog}
        onClose={() => setGlobalHistoryDialog(false)}
      />

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
                {getEditableStatuses().map(status => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
              {(user?.role === 'FINANCE' || user?.role === 'COMPTABILITE') && (
                <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                  Finance / Comptabilité : Accès limité à 4 statuts (Autorisé, Bloqué, Exécuté, Rejeté)
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

      {/* Change Donneur Dialog - Super Admin only */}
      <Dialog
        open={changeDonneurDialog.open}
        onClose={() => setChangeDonneurDialog({ open: false, record: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e7ef', bgcolor: '#f4f7fb' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            🔧 Changement Donneur
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {changeDonneurDialog.record?.referenceOV} — {changeDonneurDialog.record?.clientSociete}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            <strong>Super Admin uniquement</strong> — Cette action modifie le donneur d'ordre associé à ce virement.
          </Alert>
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: '#f4f7fb', borderRadius: 1.5, border: '1px solid #dde3ef' }}>
              <Grid container spacing={1}>
                <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a' }}>Référence OV</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{changeDonneurDialog.record?.referenceOV}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a' }}>Client</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2">{changeDonneurDialog.record?.clientSociete}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a' }}>Donneur actuel</Typography></Grid>
                <Grid item xs={8}><Typography variant="body2">{(changeDonneurDialog.record as any)?.nomDonneur || '—'}</Typography></Grid>
              </Grid>
            </Box>
            
            <FormControl fullWidth required>
              <InputLabel>Nouveau Donneur d'Ordre</InputLabel>
              <Select
                value={selectedDonneurId}
                onChange={(e) => setSelectedDonneurId(e.target.value)}
                label="Nouveau Donneur d'Ordre"
              >
                {donneurs.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.nom} ({d.banque})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setChangeDonneurDialog({ open: false, record: null })} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleChangeDonneur}
            variant="contained"
            color="primary"
            disabled={!selectedDonneurId || changeDonneurLoading}
            startIcon={changeDonneurLoading ? <CircularProgress size={16} /> : null}
          >
            {changeDonneurLoading ? 'Enregistrement...' : 'Confirmer le changement'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default TrackingTab;
