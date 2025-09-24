import React, { useState, useEffect } from 'react';
import { fetchBordereaux, assignBordereau2 as assignBordereau, markBordereauAsProcessed, exportBordereauxCSV, bulkUpdateBordereaux, bulkAssignBordereaux, fetchUsers, progressToNextStage, getPerformanceAnalytics, advancedSearchBordereaux, batchUpdateStatus, sendCustomNotification, startScan, completeScan, returnBordereau, archiveBordereau } from '../services/bordereauxService';
import { fetchClients } from '../services/clientService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import BordereauAssignModal from './BordereauAssignModal';
import BordereauBatchOperations from './BordereauBatchOperations';
import AdvancedBordereauFilters from './AdvancedBordereauFilters';
import BordereauCreateForm from './BordereauCreateForm';
import BordereauDetailsModal from './BordereauDetailsModal';
import BordereauEditModal from './BordereauEditModal';

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
}

const columns: TableColumn[] = [
  { key: 'select', label: '', sortable: false, width: '40px' },
  { key: 'reference', label: 'Réf Bordereau', sortable: true, width: '120px' },
  { key: 'client', label: 'Client / Prestataire', sortable: true, width: '200px' },
  { key: 'nombreBS', label: 'Nb BS', sortable: true, width: '80px' },
  { key: 'dateReception', label: 'Date réception BO', sortable: true, width: '140px' },
  { key: 'dateDebutScan', label: 'Date début Scan', sortable: true, width: '140px' },
  { key: 'dateFinScan', label: 'Date fin Scan', sortable: true, width: '140px' },
  { key: 'delaiReglement', label: 'Délais contractuels', sortable: true, width: '140px' },
  { key: 'dateReceptionSante', label: 'Date réception équipe Santé', sortable: true, width: '180px' },
  { key: 'dateLimite', label: 'Date limite', sortable: true, width: '120px' },
  { key: 'statut', label: 'Status', sortable: true, width: '120px' },
  { key: 'assigned', label: 'Assigned', sortable: true, width: '150px' },
  { key: 'actions', label: 'Actions', sortable: false, width: '300px' }
];

interface BordereauTableProps {
  filters?: any;
}

const BordereauTable: React.FC<BordereauTableProps> = ({ filters: externalFilters = {} }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<any>(externalFilters);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedBordereauId, setSelectedBordereauId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedBordereauForNotification, setSelectedBordereauForNotification] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBordereauForDetails, setSelectedBordereauForDetails] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBordereauForEdit, setSelectedBordereauForEdit] = useState<string | null>(null);

  // Role-based permissions according to workflow specification
  const isBureauOrdre = user?.role === 'BO';
  const isScanTeam = user?.role === 'SCAN_TEAM';
  const isChefEquipe = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdministrateur = user?.role === 'ADMINISTRATEUR';
  const isFinanceTeam = user?.role === 'FINANCE' || user?.role === 'SERVICE_FINANCIER';
  
  // Permissions based on workflow roles
  const canCreate = isBureauOrdre || isChefEquipe || isAdministrateur || isSuperAdmin;
  const canScan = isScanTeam || isAdministrateur || isSuperAdmin;
  const canAssign = isChefEquipe || isAdministrateur || isSuperAdmin;
  const canProcess = isGestionnaire || isChefEquipe || isAdministrateur || isSuperAdmin;
  const canReturn = isGestionnaire || isChefEquipe || isAdministrateur || isSuperAdmin;
  const canReassign = isSuperAdmin || isAdministrateur;
  const canExport = isAdministrateur || isSuperAdmin;
  const canViewAll = isSuperAdmin || isAdministrateur;
  const canManageAlerts = isSuperAdmin || isAdministrateur;
  const canGenerateOV = isFinanceTeam || isSuperAdmin || isAdministrateur;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setFilters(externalFilters);
  }, [externalFilters]);
  
  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, sortConfig, filters]);

  const loadInitialData = async () => {
    try {
      const [usersData, clientsData] = await Promise.all([
        fetchUsers({ role: 'GESTIONNAIRE' }),
        fetchClients()
      ]);
      setUsers(usersData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let params = {
        ...filters,
        page: currentPage,
        pageSize,
        ...(sortConfig && {
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        })
      };

      // Role-based filtering according to workflow specification
      if (isBureauOrdre) {
        // BO sees all bordereaux they created or need to process
        params = { ...params, createdBy: user?.id };
      } else if (isScanTeam) {
        // SCAN team sees bordereaux ready for scan or being scanned
        params = { ...params, statut: ['A_SCANNER', 'SCAN_EN_COURS'] };
      } else if (isChefEquipe) {
        // Chef sees bordereaux in their team's workflow
        params = { ...params, statut: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'] };
      } else if (isGestionnaire) {
        // Gestionnaire sees only bordereaux assigned to them
        params = { ...params, assignedToUserId: user?.id };
      }
      // Super Admin and Administrateur see all bordereaux (no additional filters)

      const response = await fetchBordereaux(params);
      
      if (response.items && typeof response.total === 'number') {
        setBordereaux(response.items);
        setTotal(response.total);
      } else {
        setBordereaux(Array.isArray(response) ? response : []);
        setTotal(Array.isArray(response) ? response.length : 0);
      }
    } catch (error) {
      notify('Erreur lors du chargement des données', 'error');
      setBordereaux([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === bordereaux.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(bordereaux.map(b => b.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const handleBulkAssign = () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }
    setAssignModalOpen(true);
  };

  const handleBulkMarkProcessed = async () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }

    try {
      for (const id of selectedRows) {
        await markBordereauAsProcessed(id);
      }
      notify(`${selectedRows.size} bordereau(x) marqué(s) comme traité(s)`, 'success');
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors du traitement en lot', 'error');
    }
  };

  const handleExport = async () => {
    if (!canExport) {
      notify('Vous n\'avez pas les droits pour exporter', 'warning');
      return;
    }
    
    setExporting(true);
    try {
      const csv = await exportBordereauxCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bordereaux_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      notify('Export réalisé avec succès', 'success');
    } catch (error) {
      notify('Erreur lors de l\'export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      notify('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)', 'error');
      return;
    }

    setImportingExcel(true);
    try {
      const { importBordereauxFromExcel } = await import('../services/ovService');
      const result = await importBordereauxFromExcel(file);
      
      if (result.success) {
        notify(`${result.imported} bordereau(x) importé(s) avec succès`, 'success');
        if (result.errors?.length > 0) {
          notify(`${result.errors.length} erreur(s) détectée(s)`, 'warning');
        }
        loadData();
      } else {
        notify('Erreur lors de l\'import Excel', 'error');
      }
    } catch (error) {
      notify('Erreur lors de l\'import Excel', 'error');
    } finally {
      setImportingExcel(false);
      event.target.value = '';
    }
  };

  // Check if selected bordereaux are valid for OV generation
  const hasValidBordereauForOV = () => {
    if (selectedRows.size === 0) return false;
    const selectedBordereaux = bordereaux.filter(b => selectedRows.has(b.id));
    return selectedBordereaux.some(b => ['TRAITE', 'PRET_VIREMENT', 'A_SCANNER', 'SCANNE', 'EN_COURS'].includes(b.statut));
  };

  const handleGenerateOV = async () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau pour générer un OV', 'warning');
      return;
    }

    const selectedBordereaux = bordereaux.filter(b => selectedRows.has(b.id));
    const validBordereaux = selectedBordereaux.filter(b => ['TRAITE', 'PRET_VIREMENT', 'A_SCANNER', 'SCANNE', 'EN_COURS'].includes(b.statut));
    
    if (validBordereaux.length === 0) {
      notify('Aucun bordereau sélectionné n\'est prêt pour virement', 'warning');
      return;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/finance/generate-ov`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bordereauIds: validBordereaux.map(b => b.id),
          format: 'TXT',
          includeDetails: true
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate OV');
      
      const result = await response.json();
      
      const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      notify(`OV généré pour ${validBordereaux.length} bordereau(x)`, 'success');
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors de la génération OV', 'error');
    }
  };

  const handleProgressBordereau = async (bordereauId: string) => {
    try {
      await progressToNextStage(bordereauId);
      notify('Bordereau progressé vers l\'étape suivante', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors de la progression', 'error');
    }
  };

  const handleStartScan = async (bordereauId: string) => {
    if (!canScan) {
      notify('Vous n\'avez pas les droits pour démarrer un scan', 'warning');
      return;
    }
    try {
      await startScan(bordereauId);
      notify('Scan démarré', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors du démarrage du scan', 'error');
    }
  };

  const handleCompleteScan = async (bordereauId: string) => {
    if (!canScan) {
      notify('Vous n\'avez pas les droits pour terminer un scan', 'warning');
      return;
    }
    try {
      await completeScan(bordereauId);
      notify('Scan terminé', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors de la finalisation du scan', 'error');
    }
  };

  const handleReturnBordereau = async (bordereauId: string, reason: string) => {
    if (!canReturn) {
      notify('Vous n\'avez pas les droits pour retourner un bordereau', 'warning');
      return;
    }
    try {
      await returnBordereau(bordereauId, reason);
      notify('Bordereau retourné au chef d\'équipe', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors du retour', 'error');
    }
  };

  const handleArchiveBordereau = async (bordereauId: string) => {
    if (!canReassign) {
      notify('Vous n\'avez pas les droits pour archiver', 'warning');
      return;
    }
    try {
      await archiveBordereau(bordereauId);
      notify('Bordereau archivé', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors de l\'archivage', 'error');
    }
  };

  const handleMarkAsInstance = async (bordereauId: string) => {
    try {
      await batchUpdateStatus([bordereauId], 'EN_DIFFICULTE');
      notify('Bordereau mis en instance', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors de la mise en instance', 'error');
    }
  };

  const handleRejectBordereau = async (bordereauId: string) => {
    try {
      await batchUpdateStatus([bordereauId], 'VIREMENT_REJETE');
      notify('Bordereau rejeté', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors du rejet', 'error');
    }
  };

  const handleAdvancedSearch = async () => {
    if (!searchQuery.trim()) {
      notify('Veuillez saisir un terme de recherche', 'warning');
      return;
    }

    try {
      const results = await advancedSearchBordereaux(searchQuery, filters);
      setBordereaux(results);
      setTotal(results.length);
      notify(`${results.length} résultat(s) trouvé(s)`, 'success');
    } catch (error) {
      notify('Erreur lors de la recherche avancée', 'error');
    }
  };

  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }

    try {
      const result = await batchUpdateStatus(Array.from(selectedRows), newStatus);
      notify(`${result.successCount} bordereau(x) mis à jour`, 'success');
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors de la mise à jour en lot', 'error');
    }
  };

  const handleSendNotification = async (bordereauId: string) => {
    setSelectedBordereauForNotification(bordereauId);
    setShowNotificationModal(true);
  };

  const loadPerformanceData = async () => {
    try {
      const data = await getPerformanceAnalytics(filters);
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [filters]);

  const handleAssignSingle = (bordereauId: string) => {
    setSelectedBordereauId(bordereauId);
    setAssignModalOpen(true);
  };

  const handleProcessSingle = async (bordereauId: string) => {
    try {
      await markBordereauAsProcessed(bordereauId);
      notify('Bordereau marqué comme traité', 'success');
      loadData();
    } catch (error) {
      notify('Erreur lors du traitement', 'error');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDaysRemaining = (bordereau: any) => {
    if (!bordereau.dateReception || !bordereau.delaiReglement) return 0;
    
    const receptionDate = new Date(bordereau.dateReception);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    return bordereau.delaiReglement - daysElapsed;
  };

  const getDaysRemaining = (bordereau: any) => {
    const daysRemaining = calculateDaysRemaining(bordereau);
    const isOverdue = daysRemaining < 0;
    const isAtRisk = daysRemaining <= 3 && daysRemaining >= 0;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          isOverdue
            ? 'bg-red-100 text-red-800'
            : isAtRisk
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}
        title={`SLA: ${isOverdue ? 'En retard de' : 'Reste'} ${Math.abs(daysRemaining)} jour(s)`}
      >
        {isOverdue ? `+${Math.abs(daysRemaining)}` : `J-${daysRemaining}`}
      </span>
    );
  };

  const getStatusBadge = (bordereau: any) => {
    const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
      'EN_ATTENTE': { color: 'bg-gray-100 text-gray-800', label: 'En attente', icon: '⏳' },
      'A_SCANNER': { color: 'bg-orange-100 text-orange-800', label: 'À scanner', icon: '📄' },
      'SCAN_EN_COURS': { color: 'bg-blue-100 text-blue-800', label: 'Scan en cours', icon: '🔄' },
      'SCANNE': { color: 'bg-indigo-100 text-indigo-800', label: 'Scanné', icon: '✅' },
      'A_AFFECTER': { color: 'bg-purple-100 text-purple-800', label: 'À affecter', icon: '👥' },
      'ASSIGNE': { color: 'bg-purple-100 text-purple-800', label: 'Assigné', icon: '👤' },
      'EN_COURS': { color: 'bg-yellow-100 text-yellow-800', label: 'En cours', icon: '⚡' },
      'TRAITE': { color: 'bg-green-100 text-green-800', label: 'Traité', icon: '✅' },
      'PRET_VIREMENT': { color: 'bg-teal-100 text-teal-800', label: 'Prêt virement', icon: '💰' },
      'VIREMENT_EN_COURS': { color: 'bg-cyan-100 text-cyan-800', label: 'Virement en cours', icon: '🏦' },
      'VIREMENT_EXECUTE': { color: 'bg-emerald-100 text-emerald-800', label: 'Virement exécuté', icon: '✅' },
      'VIREMENT_REJETE': { color: 'bg-red-100 text-red-800', label: 'Virement rejeté', icon: '❌' },
      'CLOTURE': { color: 'bg-gray-100 text-gray-800', label: 'Clôturé', icon: '🔒' },
      'EN_DIFFICULTE': { color: 'bg-red-100 text-red-800', label: 'En difficulté', icon: '⚠️' },
      'PARTIEL': { color: 'bg-amber-100 text-amber-800', label: 'Partiel', icon: '📊' },
      'MIS_EN_INSTANCE': { color: 'bg-yellow-100 text-yellow-800', label: 'Mis en instance', icon: '⏸️' },
      'REJETE': { color: 'bg-red-100 text-red-800', label: 'Rejeté', icon: '❌' }
    };

    const config = statusConfig[bordereau.statut as keyof typeof statusConfig] || 
                  { color: 'bg-gray-100 text-gray-800', label: bordereau.statut, icon: '❓' };
    
    const daysRemaining = calculateDaysRemaining(bordereau);
    
    // SLA indicator overlay
    let slaIcon = '';
    if (daysRemaining < 0) slaIcon = '🔴'; // Red for overdue
    else if (daysRemaining <= 3) slaIcon = '🟡'; // Yellow for at risk
    else if (daysRemaining <= 7) slaIcon = '🟢'; // Green for safe

    return (
      <div className="flex items-center gap-1">
        <div className="relative">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
          {slaIcon && (
            <span className="absolute -top-1 -right-1 text-xs" title={`SLA: ${daysRemaining < 0 ? 'En retard' : `${daysRemaining} jours restants`}`}>
              {slaIcon}
            </span>
          )}
        </div>
      </div>
    );
  };

  const getAssignedUser = (bordereau: any) => {
    if (!bordereau.assignedToUserId) {
      return <span className="text-gray-400 text-sm">Non assigné</span>;
    }
    
    const assignedUser = users.find(u => u.id === bordereau.assignedToUserId);
    return (
      <span className="text-sm">
        {assignedUser ? assignedUser.fullName : bordereau.assignedToUserId}
      </span>
    );
  };

  const renderActionButtons = (bordereau: any) => {
    const status = bordereau.statut;
    console.log('Rendering buttons for role:', user?.role, 'status:', status, 'bordereau:', bordereau.id);
    
    return (
      <div className="flex items-center gap-1 min-w-[200px]">
        {/* Always show Voir button */}
        <button
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedBordereauForDetails(bordereau.id);
            setShowDetailsModal(true);
          }}
          title="Voir détails"
        >
          👁️ Voir
        </button>

        {/* Edit button - available for BO, Chef, Admin, Super Admin */}
        {(isBureauOrdre || isChefEquipe || isAdministrateur || isSuperAdmin) && (
          <button
            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedBordereauForEdit(bordereau.id);
              setShowEditModal(true);
            }}
            title="Modifier le bordereau"
          >
            ✏️ Modifier
          </button>
        )}

        {/* Always show Progresser button */}
        <button
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleProgressBordereau(bordereau.id);
          }}
          title="Progresser vers l'étape suivante"
        >
          ➡️ Progresser
        </button>

        {/* Bureau d'Ordre specific */}
        {isBureauOrdre && status === 'EN_ATTENTE' && (
          <button
            className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
            onClick={() => batchUpdateStatus([bordereau.id], 'A_SCANNER')}
            title="Envoyer au scan"
          >
            📤 Scan
          </button>
        )}

        {/* SCAN Team specific */}
        {isScanTeam && (
          <>
            {status === 'A_SCANNER' && (
              <button
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                onClick={() => handleStartScan(bordereau.id)}
                title="Démarrer scan"
              >
                🖨️ Start
              </button>
            )}
            {status === 'SCAN_EN_COURS' && (
              <button
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
                onClick={() => handleCompleteScan(bordereau.id)}
                title="Terminer scan"
              >
                ✅ Done
              </button>
            )}
          </>
        )}

        {/* Chef d'Équipe specific */}
        {isChefEquipe && (
          <>
            {(status === 'SCANNE' || status === 'A_AFFECTER') && (
              <button
                className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                onClick={() => handleAssignSingle(bordereau.id)}
                title="Assigner à un gestionnaire"
              >
                👥 Assigner
              </button>
            )}
            {bordereau.assignedToUserId && (
              <button
                className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                onClick={() => batchUpdateStatus([bordereau.id], 'A_AFFECTER')}
                title="Récupérer le dossier"
              >
                ↩️ Récupérer
              </button>
            )}
          </>
        )}

        {/* Gestionnaire specific */}
        {isGestionnaire && status === 'EN_COURS' && (
          <>
            <button
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
              onClick={() => handleProcessSingle(bordereau.id)}
              title="Marquer comme traité"
            >
              ✅ Traiter
            </button>
            <button
              className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
              onClick={() => handleMarkAsInstance(bordereau.id)}
              title="Mettre en instance"
            >
              ⏸️ Instance
            </button>
            <button
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded transition-colors"
              onClick={() => handleRejectBordereau(bordereau.id)}
              title="Rejeter le dossier"
            >
              ❌ Rejeter
            </button>
            <button
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
              onClick={() => {
                const reason = prompt('Motif du retour:');
                if (reason) handleReturnBordereau(bordereau.id, reason);
              }}
              title="Renvoyer au chef"
            >
              🔄 Renvoyer
            </button>
          </>
        )}

        {/* Super Admin specific */}
        {isSuperAdmin && (
          <>
            <button
              className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
              onClick={() => handleAssignSingle(bordereau.id)}
              title="Réaffecter"
            >
              ↔️ Réaffecter
            </button>
            <button
              className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
              onClick={() => notify('Gestion des alertes', 'info')}
              title="Gérer alertes"
            >
              ⚠️ Alertes
            </button>
          </>
        )}

        {/* More actions dropdown */}
        <div className="relative group">
          <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors">
            ⋯
          </button>
          <div className="absolute right-0 top-8 bg-white shadow-lg rounded-md py-1 z-50 hidden group-hover:block min-w-32">
            <button 
              className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
              onClick={() => handleSendNotification(bordereau.id)}
            >
              🔔 Notification
            </button>
            <button 
              className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
              onClick={() => notify(`Export PDF du bordereau ${bordereau.reference}`, 'info')}
            >
              📄 Export PDF
            </button>
            {canReassign && (
              <button 
                className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50 text-red-600"
                onClick={() => handleArchiveBordereau(bordereau.id)}
              >
                🗄️ Archiver
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Debug info */}
      <div className="p-2 bg-yellow-50 border-b text-xs">
        <strong>Debug:</strong> User Role = {user?.role} | 
        BO={isBureauOrdre.toString()} | 
        SCAN={isScanTeam.toString()} | 
        CHEF={isChefEquipe.toString()} | 
        GEST={isGestionnaire.toString()} | 
        ADMIN={isSuperAdmin.toString()} | 
        <strong style={{color: 'red'}}>COLUMNS UPDATED: {columns.length} columns</strong>
      </div>
      
      {/* Header with actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {isBureauOrdre && '📅 Bureau d\'Ordre - '}
              {isScanTeam && '🖨️ Service SCAN - '}
              {isChefEquipe && '👨‍💼 Chef d\'Equipe - '}
              {isGestionnaire && '👩‍💻 Gestionnaire - '}
              {isSuperAdmin && '🔑 Super Admin - '}
              Bordereaux ({total})
            </h2>
            {selectedRows.size > 0 && (
              <span className="text-sm text-blue-600">
                {selectedRows.size} sélectionné(s)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {/* Bureau d'Ordre specific buttons */}
            {isBureauOrdre && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  ➕ Enregistrer Bordereau
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => notify('Modification disponible via détails', 'info')}
                >
                  ✏️ Modifier
                </button>
              </>
            )}
            
            {/* Scan Team specific buttons */}
            {isScanTeam && (
              <>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={handleImportExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={importingExcel}
                  />
                  <button
                    className="btn-secondary flex items-center gap-2"
                    disabled={importingExcel}
                  >
                    📂 {importingExcel ? 'Import...' : 'Importer Scan'}
                  </button>
                </div>
              </>
            )}
            
            {/* Chef d'Equipe specific buttons */}
            {isChefEquipe && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => setAdvancedFiltersOpen(true)}
                >
                  📊 Tableau de Bord
                </button>
              </>
            )}
            
            {/* Super Admin specific buttons */}
            {isSuperAdmin && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  + Nouveau Bordereau
                </button>
              </>
            )}
            
            {/* Finance Team specific buttons */}
            {canGenerateOV && (
              <button
                className="btn-warning"
                onClick={handleGenerateOV}
                disabled={selectedRows.size === 0 || !hasValidBordereauForOV()}
                title={!hasValidBordereauForOV() ? 'Sélectionnez des bordereaux traités prêts pour virement' : 'Générer ordre de virement'}
              >
                💰 Générer OV ({selectedRows.size})
              </button>
            )}
            
            {/* Common import for non-BO roles */}
            {!isBureauOrdre && !isScanTeam && (
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={importingExcel}
                />
                <button
                  className="btn-secondary flex items-center gap-2"
                  disabled={importingExcel}
                >
                  📁 {importingExcel ? 'Import...' : 'Importer Excel'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Advanced Search */}
        {showAdvancedSearch && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Recherche avancée (référence, client, contenu OCR...)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch()}
              />
              <button
                className="btn-sm btn-primary"
                onClick={handleAdvancedSearch}
              >
                🔍 Rechercher
              </button>
              <button
                className="btn-sm btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setShowAdvancedSearch(false);
                  loadData();
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Chef d'Equipe Corbeille View */}
        {isChefEquipe && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 Corbeille Chef d'Équipe</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-green-600">{bordereaux.filter(b => b.statut === 'TRAITE' || b.statut === 'CLOTURE').length}</div>
                <div className="text-gray-600">Dossiers traités</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-yellow-600">{bordereaux.filter(b => ['ASSIGNE', 'EN_COURS'].includes(b.statut)).length}</div>
                <div className="text-gray-600">Dossiers en cours</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-orange-600">{bordereaux.filter(b => ['SCANNE', 'A_AFFECTER'].includes(b.statut)).length}</div>
                <div className="text-gray-600">Dossiers non affectés</div>
              </div>
            </div>
          </div>
        )}

        {/* Gestionnaire Personal Corbeille */}
        {isGestionnaire && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-semibold text-green-800 mb-2">📋 Ma Corbeille Personnelle</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-blue-600">{bordereaux.filter(b => b.statut === 'EN_COURS').length}</div>
                <div className="text-gray-600">En cours</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-green-600">{bordereaux.filter(b => b.statut === 'TRAITE').length}</div>
                <div className="text-gray-600">Traités</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-red-600">{bordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length}</div>
                <div className="text-gray-600">Retournés</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="font-bold text-orange-600">{bordereaux.filter(b => calculateDaysRemaining(b) <= 3).length}</div>
                <div className="text-gray-600">Urgences</div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Analytics */}
        {performanceData && (isSuperAdmin || isAdministrateur) && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-semibold text-green-800 mb-2">📈 Analytics de Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-green-600">{performanceData.totalProcessed}</div>
                <div className="text-gray-600">Total traités</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-600">{performanceData.averageProcessingTime}j</div>
                <div className="text-gray-600">Durée moyenne</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-600">{performanceData.slaCompliance}%</div>
                <div className="text-gray-600">Conformité SLA</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">{Object.keys(performanceData.statusDistribution).length}</div>
                <div className="text-gray-600">Statuts actifs</div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        {selectedRows.size > 0 && (
          <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg flex-wrap">
            {canAssign && (
              <button
                className="btn-sm btn-primary"
                onClick={handleBulkAssign}
              >
                Assigner ({selectedRows.size})
              </button>
            )}
            {canProcess && (
              <button
                className="btn-sm btn-success"
                onClick={handleBulkMarkProcessed}
              >
                Marquer traités ({selectedRows.size})
              </button>
            )}
            <div className="relative group">
              <button className="btn-sm btn-warning">
                Changer statut ▼
              </button>
              <div className="absolute top-8 left-0 bg-white shadow-lg rounded-md py-1 z-10 hidden group-hover:block min-w-40">
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('A_SCANNER')}
                >
                  À scanner
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('SCAN_EN_COURS')}
                >
                  Scan en cours
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('SCANNE')}
                >
                  Scanné
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('A_AFFECTER')}
                >
                  À affecter
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('ASSIGNE')}
                >
                  Assigné
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('EN_COURS')}
                >
                  En cours
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('TRAITE')}
                >
                  Traité
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('EN_DIFFICULTE')}
                >
                  En difficulté
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('MIS_EN_INSTANCE')}
                >
                  Mis en instance
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('REJETE')}
                >
                  Rejeté
                </button>
                <button 
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => handleBatchStatusUpdate('CLOTURE')}
                >
                  Clôturé
                </button>
              </div>
            </div>
            <button
              className="btn-sm btn-secondary"
              onClick={() => setBatchModalOpen(true)}
            >
              Opérations avancées
            </button>
          </div>
        )}
        
        {/* Filters toggle */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              className="btn-sm btn-secondary"
              onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            >
              🔍 Filtres avancés
            </button>
            <button
              className="btn-sm btn-info"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            >
              🔎 Recherche avancée
            </button>
          </div>
          <div className="flex gap-2">
            {canExport && (
              <>
                <button
                  className="btn-sm btn-secondary"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? 'Export...' : '📊 Exporter CSV'}
                </button>
                {isSuperAdmin && (
                  <button
                    className="btn-sm btn-secondary"
                    onClick={() => notify('Export Excel/PDF disponible', 'info')}
                  >
                    📅 Exporter Excel/PDF
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      {advancedFiltersOpen && (
        <div className="border-b border-gray-200">
          <AdvancedBordereauFilters
            onFiltersChange={setFilters}
            clients={clients.map(c => ({ id: c.id.toString(), name: c.name }))}
            users={users}
          />
        </div>
      )}

      {/* Table */}
      <div className="bordereau-table-container">
        <table className="bordereau-table divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.key === 'select' ? (
                      <input
                        type="checkbox"
                        checked={selectedRows.size === bordereaux.length && bordereaux.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    ) : (
                      <>
                        {column.label}
                        {column.sortable && sortConfig?.key === column.key && (
                          <span className="text-blue-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bordereaux.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  Aucun bordereau trouvé
                </td>
              </tr>
            ) : (
              bordereaux.map((bordereau) => (
                <tr key={bordereau.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(bordereau.id)}
                      onChange={() => handleSelectRow(bordereau.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bordereau.reference}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bordereau.client?.name || 'N/A'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bordereau.nombreBS || 0}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(bordereau.dateReception)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(bordereau.dateDebutScan)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(bordereau.dateFinScan)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bordereau.delaiReglement || '-'} jours
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(bordereau.dateReceptionSante)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {getDaysRemaining(bordereau)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {getStatusBadge(bordereau)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getAssignedUser(bordereau)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500 mb-1">Status: {bordereau.statut}</div>
                    {renderActionButtons(bordereau)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Affichage de {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, total)} sur {total} résultats
          </div>
          <div className="flex gap-2">
            <button
              className="btn-sm btn-secondary"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} sur {Math.ceil(total / pageSize)}
            </span>
            <button
              className="btn-sm btn-secondary"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Envoyer une notification</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const message = formData.get('message') as string;
              const recipients = (formData.get('recipients') as string).split(',').map(r => r.trim());
              
              if (selectedBordereauForNotification) {
                sendCustomNotification(selectedBordereauForNotification, message, recipients)
                  .then(() => {
                    notify('Notification envoyée', 'success');
                    setShowNotificationModal(false);
                    setSelectedBordereauForNotification(null);
                  })
                  .catch(() => notify('Erreur lors de l\'envoi', 'error'));
              }
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  name="message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  required
                  placeholder="Votre message..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Destinataires (emails séparés par des virgules)</label>
                <input
                  name="recipients"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedBordereauForNotification(null);
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-sm btn-primary">
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {assignModalOpen && (
        <BordereauAssignModal
          bordereauId={selectedBordereauId || undefined}
          selectedBordereaux={selectedBordereauId ? undefined : Array.from(selectedRows)}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedBordereauId(null);
          }}
          onSuccess={() => {
            setAssignModalOpen(false);
            setSelectedBordereauId(null);
            setSelectedRows(new Set());
            loadData();
          }}
        />
      )}

      {batchModalOpen && (
        <BordereauBatchOperations
          open={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          selectedBordereaux={Array.from(selectedRows)}
          onSuccess={() => {
            setBatchModalOpen(false);
            setSelectedRows(new Set());
            loadData();
          }}
        />
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" 
              onClick={() => setCreateModalOpen(false)} 
              aria-label="Fermer"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Créer un nouveau bordereau</h2>
            <BordereauCreateForm 
              onSuccess={() => {
                setCreateModalOpen(false);
                loadData();
              }} 
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedBordereauForDetails && (
        <BordereauDetailsModal
          bordereauId={selectedBordereauForDetails}
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedBordereauForDetails(null);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedBordereauForEdit && (
        <BordereauEditModal
          bordereauId={selectedBordereauForEdit}
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBordereauForEdit(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedBordereauForEdit(null);
            loadData();
          }}
        />
      )}

      <style>{`
        .btn-primary {
          background-color: #0b5ed7;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #0a58ca;
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: #5c636a;
        }
        
        .btn-warning {
          background-color: #fd7e14;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-warning:hover:not(:disabled) {
          background-color: #e8690b;
        }
        
        .btn-success {
          background-color: #198754;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-success:hover:not(:disabled) {
          background-color: #157347;
        }
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        
        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-warning:disabled,
        .btn-success:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-info {
          background-color: #0dcaf0;
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-info:hover:not(:disabled) {
          background-color: #0bb5d6;
        }
        
        .btn-info:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default BordereauTable;