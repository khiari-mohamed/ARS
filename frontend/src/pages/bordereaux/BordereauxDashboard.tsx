import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Autocomplete } from '@mui/material';
import '../../styles/bordereaux.css';
import { 
  BarChart3, CheckCircle, AlertTriangle, TrendingUp, Eye, Archive,
  Plus, Edit, FolderOpen, AlertCircle, Users, LayoutDashboard,
  CheckSquare, Pause, ArrowRight, RefreshCw, Search, X, FileText,
  Calendar, Filter, Download, Upload, FileSpreadsheet
} from 'lucide-react';
import { 
  fetchBordereaux, 
  fetchKPIs, 
  getPerformanceAnalytics,
  progressToNextStage,
  batchUpdateStatus,
  bulkAssignBordereaux,
  exportBordereauxCSV,
  fetchUsers,
  startScan,
  completeScan,
  returnBordereau,
  archiveBordereau,
  markBordereauAsProcessed,
  advancedSearchBordereaux
} from '../../services/bordereauxService';
import { LocalAPI } from '../../services/axios';
import EnhancedBordereauCreateForm from '../../components/EnhancedBordereauCreateForm';
import AIRecommendations from '../../components/AIRecommendations';
import BordereauDetailsModal from '../../components/BordereauDetailsModal';
import BordereauProgressModal from '../../components/BordereauProgressModal';
import BordereauAssignModal from '../../components/BordereauAssignModal';
import BordereauCorbeilleModal from '../../components/BordereauCorbeilleModal';
import BordereauReassignModal from '../../components/BordereauReassignModal';
import BordereauEditModal from '../../components/BordereauEditModal';

const BordereauxDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<any>({archived: false});
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [gestionnaireSeniors, setGestionnaireSeniors] = useState<any[]>([]);
  const [chefsEquipe, setChefsEquipe] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedGestionnaire, setSelectedGestionnaire] = useState('');
  const [selectedGestionnaireSenior, setSelectedGestionnaireSenior] = useState('');
  const [selectedChefEquipe, setSelectedChefEquipe] = useState('');
  const [slaFilter, setSlaFilter] = useState<'all' | 'respecte' | 'a_risque' | 'en_retard'>('all');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [virementFilter, setVirementFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [showWorkflowDashboard, setShowWorkflowDashboard] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBordereauForDetails, setSelectedBordereauForDetails] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBordereauForProgress, setSelectedBordereauForProgress] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBordereauForAssign, setSelectedBordereauForAssign] = useState<string | null>(null);
  const [showCorbeilleModal, setShowCorbeilleModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedBordereauForReassign, setSelectedBordereauForReassign] = useState<string | null>(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [selectedBordereauForAlerts, setSelectedBordereauForAlerts] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBordereauForEdit, setSelectedBordereauForEdit] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Role-based permissions
  const isBureauOrdre = user?.role === 'BO';
  const isScanTeam = user?.role === 'SCAN_TEAM';
  const isChefEquipe = user?.role === 'CHEF_EQUIPE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdministrateur = user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    loadData();
    loadUsers();
    loadClients();
  }, []);
  
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bordereauxData, kpisData, analyticsData] = await Promise.all([
        fetchBordereaux({ ...filters, withVirement: true, include: 'ordresVirement' }),
        fetchKPIs(),
        getPerformanceAnalytics(filters)
      ]);
      
      const bordereauList = Array.isArray(bordereauxData) ? bordereauxData : bordereauxData.items || [];
      // Filter out archived bordereaux on client side as safety measure
      const nonArchivedBordereaux = bordereauList.filter((b: any) => !b.archived && b.archived !== true);
      setBordereaux(nonArchivedBordereaux);
      setKpis(kpisData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers({ role: 'GESTIONNAIRE' });
      setUsers(usersData || []);
      
      // Load all users and categorize by role
      const allUsersResponse = await LocalAPI.get('/users');
      const allUsers = allUsersResponse.data || [];
      
      setGestionnaires(allUsers.filter((u: any) => u.role === 'GESTIONNAIRE' && u.active));
      setGestionnaireSeniors(allUsers.filter((u: any) => u.role === 'GESTIONNAIRE_SENIOR' && u.active));
      setChefsEquipe(allUsers.filter((u: any) => u.role === 'CHEF_EQUIPE' && u.active));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { fetchClients } = await import('../../services/clientService');
      const clientsData = await fetchClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const applyFilters = () => {
    const newFilters: any = { archived: false };
    
    if (dateFrom) newFilters.dateStart = dateFrom;
    if (dateTo) newFilters.dateEnd = dateTo;
    if (selectedClient) newFilters.clientId = selectedClient;
    if (selectedGestionnaire) newFilters.gestionnaireId = selectedGestionnaire;
    if (selectedGestionnaireSenior) newFilters.gestionnaireSeniorId = selectedGestionnaireSenior;
    if (selectedChefEquipe) newFilters.chefEquipeId = selectedChefEquipe;
    if (referenceFilter) newFilters.reference = referenceFilter;
    if (statusFilter) newFilters.statut = statusFilter;
    
    console.log('🔍 Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedClient('');
    setSelectedGestionnaire('');
    setSelectedGestionnaireSenior('');
    setSelectedChefEquipe('');
    setSlaFilter('all');
    setReferenceFilter('');
    setStatusFilter('');
    setVirementFilter('');
    setFilters({ archived: false });
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau', 'warning');
      return;
    }

    try {
      const ids = Array.from(selectedRows);
      
      switch (action) {
        case 'assign':
          await bulkAssignBordereaux(ids, value);
          notify(`${ids.length} bordereau(x) assigné(s)`, 'success');
          break;
        case 'status':
          await batchUpdateStatus(ids, value);
          notify(`${ids.length} bordereau(x) mis à jour`, 'success');
          break;
        case 'progress':
          for (const id of ids) {
            await progressToNextStage(id);
          }
          notify(`${ids.length} bordereau(x) progressé(s)`, 'success');
          break;
      }
      
      setSelectedRows(new Set());
      loadData();
    } catch (error) {
      notify('Erreur lors de l\'opération', 'error');
    }
  };

  const handleAdvancedSearch = async () => {
    if (!searchQuery.trim()) {
      notify('Veuillez saisir un terme de recherche', 'warning');
      return;
    }

    try {
      const results: any[] = await advancedSearchBordereaux(searchQuery, filters);
      setBordereaux(Array.isArray(results) ? results : []);
      notify(`${results.length} résultat(s) trouvé(s)`, 'success');
    } catch (error) {
      notify('Erreur lors de la recherche avancée', 'error');
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
      const { importBordereauxFromExcel } = await import('../../services/ovService');
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

  const handleGenerateOV = async () => {
    if (selectedRows.size === 0) {
      notify('Sélectionnez au moins un bordereau pour générer un OV', 'warning');
      return;
    }

    try {
      const { generateOV } = await import('../../services/ovService');
      const ovData = await generateOV({
        bordereauIds: Array.from(selectedRows),
        format: 'PDF',
        includeDetails: true
      });
      
      const blob = new Blob([ovData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OV_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      notify(`OV généré pour ${selectedRows.size} bordereau(x)`, 'success');
      setSelectedRows(new Set());
    } catch (error) {
      notify('Erreur lors de la génération OV', 'error');
    }
  };

  const handleExport = async () => {
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
    }
  };

  // Get Durée de traitement from backend calculation
  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean; warning?: string } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeTraitement, 
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN',
      warning: bordereau.dureeTraitementWarning || undefined
    };
  };

  // Get Durée de règlement from backend calculation
  const getDureeReglement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeReglement === null || bordereau.dureeReglement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeReglement, 
      isOnTime: bordereau.dureeReglementStatus === 'GREEN' 
    };
  };

  // ✅ UNIFIED SLA LOGIC WITH FREEZE - Calculate from dateReception, freeze when virement executed
  const calculateSLAStatus = (bordereau: any) => {
    if (!bordereau.dateReception || !bordereau.delaiReglement) return 'UNKNOWN';
    
    const today = new Date();
    const reception = new Date(bordereau.dateReception);
    const delai = bordereau.delaiReglement;
    
    // ✅ FREEZE LOGIC: Stop calculation when virement is executed
    const isFrozen = ['VIREMENT_EXECUTE', 'PAYE', 'CLOTURE'].includes(bordereau.statut);
    const freezeDate = bordereau.dateExecutionVirement || bordereau.dateCloture;
    
    const effectiveEndDate = isFrozen && freezeDate ? new Date(freezeDate) : today;
    const daysElapsed = (effectiveEndDate.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24);
    const percentElapsed = (daysElapsed / delai) * 100;
    
    if (percentElapsed > 100) return 'OVERDUE';  // En retard
    if (percentElapsed > 80) return 'AT_RISK';   // À risque (>80%)
    return 'ON_TIME';  // À temps
  };

  // Pagination logic with SLA filter applied
  const filteredBySLA = slaFilter === 'all' ? bordereaux : bordereaux.filter(b => {
    const slaStatus = calculateSLAStatus(b);
    
    if (slaFilter === 'en_retard') return slaStatus === 'OVERDUE';
    if (slaFilter === 'a_risque') return slaStatus === 'AT_RISK';
    if (slaFilter === 'respecte') return slaStatus === 'ON_TIME';
    return true;
  });
  
  // Apply virement filter
  const filteredByVirement = virementFilter === '' ? filteredBySLA : filteredBySLA.filter(b => {
    if (virementFilter === 'NONE') {
      return !b.ordresVirement || b.ordresVirement.length === 0;
    }
    if (b.ordresVirement && b.ordresVirement.length > 0) {
      return b.ordresVirement[0].etatVirement === virementFilter;
    }
    return false;
  });
  
  // Log SLA filter results for debugging
  console.log('🔍 SLA Filter Applied:', slaFilter);
  console.log('🔍 Virement Filter Applied:', virementFilter);
  console.log('📊 Total bordereaux:', bordereaux.length);
  console.log('📊 Filtered by SLA:', filteredBySLA.length);
  console.log('📊 Filtered by Virement:', filteredByVirement.length);
  console.log('📊 SLA Breakdown:', {
    onTime: bordereaux.filter(b => calculateSLAStatus(b) === 'ON_TIME').length,
    atRisk: bordereaux.filter(b => calculateSLAStatus(b) === 'AT_RISK').length,
    overdue: bordereaux.filter(b => calculateSLAStatus(b) === 'OVERDUE').length
  });
  
  const totalPages = Math.ceil(filteredByVirement.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBordereaux = filteredByVirement.slice(startIndex, endIndex);

  const handleViewBordereau = (bordereauId: string) => {
    setSelectedBordereauForDetails(bordereauId);
    setShowDetailsModal(true);
  };

  const handleProgressBordereau = (bordereau: any) => {
    setSelectedBordereauForProgress(bordereau);
    setShowProgressModal(true);
  };

  const handleAssignBordereau = (bordereauId: string) => {
    setSelectedBordereauForAssign(bordereauId);
    setShowAssignModal(true);
  };

  const handleReassignBordereau = (bordereauId: string) => {
    setSelectedBordereauForReassign(bordereauId);
    setShowReassignModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'EN_ATTENTE': 'bg-gray-100 text-gray-800',
      'A_SCANNER': 'bg-orange-100 text-orange-800',
      'SCAN_EN_COURS': 'bg-blue-100 text-blue-800',
      'SCANNE': 'bg-indigo-100 text-indigo-800',
      'A_AFFECTER': 'bg-purple-100 text-purple-800',
      'ASSIGNE': 'bg-purple-100 text-purple-800',
      'EN_COURS': 'bg-yellow-100 text-yellow-800',
      'TRAITE': 'bg-green-100 text-green-800',
      'PRET_VIREMENT': 'bg-teal-100 text-teal-800',
      'VIREMENT_EN_COURS': 'bg-cyan-100 text-cyan-800',
      'VIREMENT_EXECUTE': 'bg-emerald-100 text-emerald-800',
      'VIREMENT_REJETE': 'bg-red-100 text-red-800',
      'CLOTURE': 'bg-gray-100 text-gray-800',
      'EN_DIFFICULTE': 'bg-red-100 text-red-800',
      'MIS_EN_INSTANCE': 'bg-yellow-100 text-yellow-800',
      'REJETE': 'bg-red-100 text-red-800',
      'PARTIEL': 'bg-amber-100 text-amber-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bordereau-loading">
        <div style={{textAlign: 'center'}}>
          <div className="bordereau-spinner"></div>
          <p style={{color: '#6b7280', marginTop: '16px'}}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bordereau-dashboard">
      {/* Header */}
      <div className="bordereau-header">
        <div className="bordereau-header-content">
          <div>
            <h1 className="bordereau-title">Gestion des Bordereaux</h1>
            <p className="bordereau-subtitle">Tableau de bord centralisé pour le suivi des bordereaux</p>
          </div>
          <div className="flex items-center gap-4">
         
            <div className="bordereau-user-info">
              Connecté en tant que <span style={{fontWeight: 600}}>{user?.fullName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bordereau-main">
        {/* KPI Cards */}
        <div className="bordereau-kpi-container">
          <div className="bordereau-kpi-card">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="bordereau-kpi-label">Total Bordereaux</h3>
                <p className="bordereau-kpi-value">{bordereaux.length}</p>
              </div>
            </div>
          </div>
          <div className="bordereau-kpi-card kpi-success">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-success">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="bordereau-kpi-label">Traités</h3>
                <p className="bordereau-kpi-value value-success">
                  {bordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bordereau-kpi-card kpi-danger">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-danger">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="bordereau-kpi-label">En retard</h3>
                <p className="bordereau-kpi-value value-danger">
                  {bordereaux.filter(b => calculateSLAStatus(b) === 'OVERDUE').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bordereau-kpi-card kpi-warning">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-warning">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="bordereau-kpi-label">Conformité SLA</h3>
                <p className="bordereau-kpi-value value-warning">{analytics?.slaCompliance || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific Workflow Dashboard - Corbeille */}
        {(isChefEquipe || isGestionnaire || isSuperAdmin) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                {/* Only keep the header and subtitle */}
              
              
              </div>
             
            </div>
            {/* REMOVE ALL CORBEILLE CARDS AND ACTIONS RAPIDES */}
            {/* Nothing else is rendered here */}
          </div>
        )}

        {/* Filters Panel */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0', borderTop: '3px solid #2196f3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ background: '#e3f2fd', borderRadius: '6px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter style={{ width: '14px', height: '14px', color: '#1976d2' }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>Filtres de recherche</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Référence</label>
              <input type="text" placeholder="Rechercher..." value={referenceFilter} onChange={(e) => setReferenceFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '140px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</label>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name || ''}
                value={clients.find(c => c.id === selectedClient) || null}
                onChange={(e, newValue) => setSelectedClient(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input
                      {...params.inputProps}
                      type="text"
                      placeholder="Sélectionner..."
                      style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%', color: '#374151' }}
                    />
                  </div>
                )}
                style={{ width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestionnaire</label>
              <Autocomplete
                options={gestionnaires}
                getOptionLabel={(option) => option.fullName || ''}
                value={gestionnaires.find(g => g.id === selectedGestionnaire) || null}
                onChange={(e, newValue) => setSelectedGestionnaire(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input
                      {...params.inputProps}
                      type="text"
                      placeholder="Sélectionner..."
                      style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%', color: '#374151' }}
                    />
                  </div>
                )}
                style={{ width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestionnaire Senior</label>
              <Autocomplete
                options={gestionnaireSeniors}
                getOptionLabel={(option) => option.fullName || ''}
                value={gestionnaireSeniors.find(g => g.id === selectedGestionnaireSenior) || null}
                onChange={(e, newValue) => setSelectedGestionnaireSenior(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input
                      {...params.inputProps}
                      type="text"
                      placeholder="Sélectionner..."
                      style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%', color: '#374151' }}
                    />
                  </div>
                )}
                style={{ width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chef d'équipe</label>
              <Autocomplete
                options={chefsEquipe}
                getOptionLabel={(option) => option.fullName || ''}
                value={chefsEquipe.find(c => c.id === selectedChefEquipe) || null}
                onChange={(e, newValue) => setSelectedChefEquipe(newValue?.id || '')}
                renderInput={(params) => (
                  <div ref={params.InputProps.ref}>
                    <input
                      {...params.inputProps}
                      type="text"
                      placeholder="Sélectionner..."
                      style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '100%', color: '#374151' }}
                    />
                  </div>
                )}
                style={{ width: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '140px', color: '#374151' }}>
                <option value="">Tous</option>
                <option value="EN_COURS">En cours</option>
                <option value="TRAITE">Traité</option>
                <option value="CLOTURE">Clôturé</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut Virement</label>
              <select value={virementFilter} onChange={(e) => setVirementFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '160px', color: '#374151' }}>
                <option value="">Tous</option>
                <option value="EXECUTE">✅ Exécuté</option>
                <option value="EN_COURS">🔄 En cours</option>
                <option value="EN_COURS_VALIDATION">⏳ En attente validation</option>
                <option value="REJETE">❌ Rejeté</option>
                <option value="NONE">Pas de virement</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA</label>
              <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value as any)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '190px', color: '#374151' }}>
                <option value="all">📊 Tous ({bordereaux.length})</option>
                <option value="en_retard">● En retard ({bordereaux.filter(b => calculateSLAStatus(b) === 'OVERDUE').length})</option>
                <option value="a_risque">▲ À risque ({bordereaux.filter(b => calculateSLAStatus(b) === 'AT_RISK').length})</option>
                <option value="respecte">✓ Respecté ({bordereaux.filter(b => calculateSLAStatus(b) === 'ON_TIME').length})</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date début</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '142px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date fin</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '142px', color: '#374151' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button onClick={applyFilters} style={{ padding: '7px 16px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search style={{ width: '13px', height: '13px' }} />
                Appliquer
              </button>
              <button onClick={resetFilters} style={{ padding: '7px 14px', background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                Effacer
              </button>
            </div>
          </div>
        </div>

              {/* Role-specific buttons */}
              {isBureauOrdre && (
                <>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bordereau-btn bordereau-btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Enregistrer Bordereau
                  </button>
                  <button className="bordereau-btn bordereau-btn-secondary flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                </>
              )}
              
              {isScanTeam && (
                <>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="bordereau-btn bordereau-btn-primary flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Importer Scan
                    </button>
                  </div>
                  <button className="bordereau-btn bordereau-btn-warning flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Signaler Surcharge
                  </button>
                </>
              )}
              
              {isChefEquipe && (
                <>
                  <button className="bordereau-btn bordereau-btn-primary flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assigner en Lot
                  </button>
                  <button className="bordereau-btn bordereau-btn-secondary flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Tableau de Bord
                  </button>
                </>
              )}
              
              {isGestionnaire && (
                <>
                  <button 
                    onClick={() => handleBulkAction('status', 'TRAITE')}
                    className="bordereau-btn bordereau-btn-success flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Marquer Traités
                  </button>
                  <button 
                    onClick={() => handleBulkAction('status', 'MIS_EN_INSTANCE')}
                    className="bordereau-btn bordereau-btn-warning flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Mettre en Instance
                  </button>
                </>
              )}
             

              {selectedRows.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <span className="text-sm text-gray-600 font-medium bg-blue-50 px-2 py-1 rounded">
                    {selectedRows.size} sélectionné(s)
                  </span>
                  
                  {(isChefEquipe || isSuperAdmin) && (
                    <select
                      onChange={(e) => e.target.value && handleBulkAction('assign', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      defaultValue=""
                    >
                      <option value="">Assigner à...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.fullName}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => handleBulkAction('progress')}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Progresser
                  </button>
                  
                  <div className="relative group">
                    <button className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Changer Statut ▼
                    </button>
                    <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md py-1 z-10 hidden group-hover:block min-w-40">
                     
                      <button 
                        className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => handleBulkAction('status', 'TRAITE')}
                      >
                        Traité
                      </button>
                      <button 
                        className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => handleBulkAction('status', 'EN_DIFFICULTE')}
                      >
                        En difficulté
                      </button>
                    </div>
                  </div>
                </>
              )}
            {/* </div>

            <div className="flex items-center gap-3">

            </div>
          </div>
        </div> */}

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                onClick={handleAdvancedSearch}
              >
                <Search className="w-4 h-4" />
                Rechercher
              </button>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                onClick={() => {
                  setSearchQuery('');
                  setShowAdvancedSearch(false);
                  loadData();
                }}
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </div>
        )}

        <div>
            {/* Content */}
        {
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bordereau-table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.size === bordereaux.length && bordereaux.length > 0}
                        onChange={() => {
                          if (selectedRows.size === bordereaux.length) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(bordereaux.map(b => b.id)));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Client / Prestataire</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Référence Bordereau</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Gestionnaire</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Date réception BO</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Bulletin de soins</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Date fin de Scannérisation</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Délais contractuels de règlement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Durée de traitement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Durée de règlement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>SLA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Statut Virement</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Dernière MAJ</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Statut</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBordereaux.map((bordereau, index) => {
                    return (
                      <tr key={bordereau.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(bordereau.id)}
                            onChange={() => {
                              const newSelection = new Set(selectedRows);
                              if (newSelection.has(bordereau.id)) {
                                newSelection.delete(bordereau.id);
                              } else {
                                newSelection.add(bordereau.id);
                              }
                              setSelectedRows(newSelection);
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {bordereau.client?.name || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 'bold', color: '#0066cc', borderBottom: '1px solid #dee2e6' }}>
                          {bordereau.reference}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {(() => {
                            // Check for Gestionnaire Senior first (priority)
                            if (bordereau.contract?.assignedManager) {
                              return (
                                <span style={{ 
                                  background: '#e8f5e9', 
                                  color: '#2e7d32', 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '11px', 
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  👨‍💼 {bordereau.contract.assignedManager.fullName}
                                </span>
                              );
                            }
                            // Then check for regular Gestionnaire
                            if (bordereau.currentHandler && (bordereau.currentHandler.role === 'GESTIONNAIRE' || bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR')) {
                              const icon = bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤';
                              const bgColor = bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '#e8f5e9' : '#e3f2fd';
                              const textColor = bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '#2e7d32' : '#1976d2';
                              return (
                                <span style={{ background: bgColor, color: textColor, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {icon} {bordereau.currentHandler.fullName}
                                </span>
                              );
                            }
                            // Not assigned
                            return <span style={{ color: '#999', fontSize: '12px' }}>Non assigné</span>;
                          })()}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                              {bordereau.nombreBS || 0} BS
                            </span>
                            {bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0 && (
                              <span style={{ fontSize: '12px', color: '#666' }}>
                                ({bordereau.BulletinSoin.filter((bs: any) => bs.etat === 'VALIDATED').length} traités)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {bordereau.dateFinScan ? new Date(bordereau.dateFinScan).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          <span style={{ background: '#fff3e0', color: '#f57c00', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                            {bordereau.delaiReglement || 0} jours
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {(() => {
                            const dureeTraitement = getDureeTraitement(bordereau);
                            if (dureeTraitement.days === null || dureeTraitement.days === undefined) {
                              return <span style={{ color: '#999', fontSize: '12px' }}>En cours</span>;
                            }
                            
                            const hasWarning = !!dureeTraitement.warning;
                            const bgColor = hasWarning ? '#fff3e0' : (dureeTraitement.isOnTime ? '#e8f5e9' : '#ffebee');
                            const textColor = hasWarning ? '#f57c00' : (dureeTraitement.isOnTime ? '#2e7d32' : '#c62828');
                            
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ 
                                  background: bgColor, 
                                  color: textColor, 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  display: 'inline-block'
                                }}>
                                  {dureeTraitement.days} jour{dureeTraitement.days !== 1 ? 's' : ''}
                                </span>
                                {hasWarning && (
                                  <span 
                                    title={dureeTraitement.warning}
                                    style={{ 
                                      cursor: 'help',
                                      fontSize: '14px',
                                      color: '#f57c00'
                                    }}
                                  >
                                    ⚠️
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {(() => {
                            if (bordereau.statut === 'VIREMENT_EXECUTE' && bordereau.ordresVirement?.[0]?.dateEtatFinal) {
                              return <span style={{ color: '#4caf50', fontSize: '12px', fontWeight: 'bold' }}>✓ Réglé ({bordereau.dureeReglement || 0}j)</span>;
                            }
                            if (bordereau.dureeReglement !== null && bordereau.dureeReglement !== undefined) {
                              return (
                                <span style={{ 
                                  background: bordereau.dureeReglementStatus === 'GREEN' ? '#e8f5e9' : '#ffebee', 
                                  color: bordereau.dureeReglementStatus === 'GREEN' ? '#2e7d32' : '#c62828', 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  display: 'inline-block'
                                }}>
                                  {bordereau.dureeReglement} jour{bordereau.dureeReglement !== 1 ? 's' : ''}
                                </span>
                              );
                            }
                            return <span style={{ color: '#999', fontSize: '12px' }}>En attente</span>;
                          })()}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {(() => {
                            const slaStatus = calculateSLAStatus(bordereau);
                            if (slaStatus === 'UNKNOWN') {
                              return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
                            }
                            return (
                              <span style={{ 
                                background: slaStatus === 'OVERDUE' ? '#ffebee' : slaStatus === 'AT_RISK' ? '#fff3e0' : '#e8f5e9',
                                color: slaStatus === 'OVERDUE' ? '#c62828' : slaStatus === 'AT_RISK' ? '#f57c00' : '#2e7d32',
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                display: 'inline-block'
                              }}>
                                {slaStatus === 'OVERDUE' ? '● En retard' : slaStatus === 'AT_RISK' ? '▲ À risque' : '✓ Respecté'}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {(() => {
                            // Check if virement exists
                            if (bordereau.ordresVirement && bordereau.ordresVirement.length > 0) {
                              const virement = bordereau.ordresVirement[0];
                              const etat = virement.etatVirement;
                              
                              let bgColor = '#e3f2fd';
                              let textColor = '#1976d2';
                              let icon = '⏳';
                              let label = 'En attente';
                              
                              if (etat === 'EXECUTE') {
                                bgColor = '#e8f5e9';
                                textColor = '#2e7d32';
                                icon = '✅';
                                label = 'Exécuté';
                              } else if (etat === 'REJETE') {
                                bgColor = '#ffebee';
                                textColor = '#c62828';
                                icon = '❌';
                                label = 'Rejeté';
                              } else if (etat === 'EN_COURS') {
                                bgColor = '#fff3e0';
                                textColor = '#f57c00';
                                icon = '🔄';
                                label = 'En cours';
                              } else if (etat === 'EN_COURS_VALIDATION') {
                                bgColor = '#e3f2fd';
                                textColor = '#1976d2';
                                icon = '⏳';
                                label = 'En attente';
                              }
                              
                              return (
                                <span style={{ 
                                  background: bgColor, 
                                  color: textColor, 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '11px', 
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {icon} {label}
                                </span>
                              );
                            }
                            
                            // No virement yet
                            return <span style={{ color: '#999', fontSize: '12px' }}>Pas de virement</span>;
                          })()}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          {bordereau.updatedAt ? new Date(bordereau.updatedAt).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6' }}>
                          <span style={{
                            background: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(bordereau.statut) ? '#4caf50' : '#2196f3',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {bordereau.statut === 'EN_COURS' && bordereau.currentHandler?.role === 'GESTIONNAIRE_SENIOR' 
                              ? `Affecté à ${bordereau.currentHandler.fullName}` 
                              : bordereau.statut === 'A_AFFECTER' && bordereau.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR'
                              ? `Affecté à ${bordereau.contract.teamLeader.fullName}`
                              : bordereau.statut}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              {/* Always visible actions */}
                              <button
                                style={{ padding: '4px 8px', fontSize: '12px', background: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleViewBordereau(bordereau.id);
                                }}
                                title="Voir détails"
                              >
                                <Eye className="w-3 h-3" />
                                Voir
                              </button>

                              {/* Archive action */}
                              {isSuperAdmin && (
                                <button
                                  style={{ padding: '4px 8px', fontSize: '12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      await archiveBordereau(bordereau.id);
                                      notify(`Bordereau ${bordereau.reference} archivé`, 'success');
                                      setBordereaux(prev => prev.filter(b => b.id !== bordereau.id));
                                    } catch (error) {
                                      notify('Erreur archivage', 'error');
                                    }
                                  }}
                                  title="Archiver"
                                >
                                  <Archive className="w-3 h-3" />
                                  Archiver
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid #e5e7eb',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {/* Info */}
                <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Affichage de{' '}
                  <span style={{ color: '#2563eb', fontWeight: '700' }}>{startIndex + 1}</span>
                  {' '}à{' '}
                  <span style={{ color: '#2563eb', fontWeight: '700' }}>{Math.min(endIndex, filteredByVirement.length)}</span>
                  {' '}sur{' '}
                  <span style={{ color: '#2563eb', fontWeight: '700' }}>{filteredByVirement.length}</span>
                  {' '}bordereaux
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: currentPage === 1 ? '#f9fafb' : 'white',
                      color: currentPage === 1 ? '#d1d5db' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Précédent
                  </button>

                  {/* Windowed page numbers */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 4) pages.push('ellipsis-start');
                      const start = Math.max(2, currentPage - 2);
                      const end = Math.min(totalPages - 1, currentPage + 2);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (currentPage < totalPages - 3) pages.push('ellipsis-end');
                      pages.push(totalPages);
                    }
                    return pages.map((page, idx) =>
                      typeof page === 'string' ? (
                        <span key={page} style={{ padding: '6px 2px', fontSize: '13px', color: '#9ca3af', userSelect: 'none' }}>•••</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: currentPage === page ? '2px solid #2196f3' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            background: currentPage === page ? '#2196f3' : 'white',
                            color: currentPage === page ? 'white' : '#374151',
                            cursor: 'pointer',
                            minWidth: '34px',
                          }}
                        >
                          {page}
                        </button>
                      )
                    );
                  })()}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: currentPage === totalPages ? '#f9fafb' : 'white',
                      color: currentPage === totalPages ? '#d1d5db' : '#374151',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        }
          </div>
          
          {/* AI Sidebar - COMMENTED OUT */}
          {/* <div className="lg:col-span-1 space-y-6">
            <AIRecommendations />
          </div>
        </div> */}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="bordereau-modal-overlay">
          <div className="bordereau-modal-container">
            <div className="bordereau-modal-content">
              <div className="bordereau-modal-header">
                <h3 className="bordereau-modal-title">
                  Créer un nouveau bordereau
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="bordereau-modal-close"
                >
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bordereau-modal-body">
                <EnhancedBordereauCreateForm 
                  onSuccess={() => {
                    setShowCreateModal(false);
                    loadData();
                  }} 
                />
              </div>
            </div>
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

      {/* Progress Modal */}
      {showProgressModal && selectedBordereauForProgress && (
        <BordereauProgressModal
          bordereauId={selectedBordereauForProgress.id}
          open={showProgressModal}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedBordereauForProgress(null);
            loadData();
          }}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedBordereauForAssign && (
        <BordereauAssignModal
          bordereauId={selectedBordereauForAssign}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedBordereauForAssign(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Corbeille Modal */}
      {showCorbeilleModal && (
        <BordereauCorbeilleModal
          bordereaux={bordereaux}
          onClose={() => setShowCorbeilleModal(false)}
          onFilterChange={(newFilters) => {
            console.log('🔄 Dashboard: Applying new filters:', newFilters);
            console.log('🔄 Dashboard: Previous filters:', filters);
            setFilters(newFilters);
            console.log('🔄 Dashboard: Filters updated, triggering reload...');
          }}
          getSLAStatus={(b: any) => {
            const status = calculateSLAStatus(b);
            return {
              color: status === 'OVERDUE' ? 'text-red-600' : status === 'AT_RISK' ? 'text-orange-600' : 'text-green-600',
              days: 0,
              label: status === 'OVERDUE' ? 'En retard' : status === 'AT_RISK' ? 'À risque' : 'Respecté'
            };
          }}
        />
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedBordereauForReassign && (
        <BordereauReassignModal
          bordereauId={selectedBordereauForReassign}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedBordereauForReassign(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Alerts Modal */}
      {showAlertsModal && selectedBordereauForAlerts && (
        <div className="bordereau-modal-overlay">
          <div className="bordereau-modal-container">
            <div className="bordereau-modal-content">
              <div className="bordereau-modal-header">
                <h3 className="bordereau-modal-title">
                  ⚠️ Alertes - {selectedBordereauForAlerts.reference}
                </h3>
                <button
                  onClick={() => {
                    setShowAlertsModal(false);
                    setSelectedBordereauForAlerts(null);
                    setAlertsData([]);
                  }}
                  className="bordereau-modal-close"
                >
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bordereau-modal-body">
                {alertsData.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-gray-500">Aucune alerte pour ce bordereau</p>
                    <p className="text-sm text-gray-400 mt-2">Tout semble en ordre !</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertsData.map((alert, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        alert.type === 'SLA_BREACH' ? 'bg-red-50 border-red-400' :
                        alert.type === 'SLA_WARNING' ? 'bg-orange-50 border-orange-400' :
                        alert.type === 'PROCESS_STUCK' ? 'bg-yellow-50 border-yellow-400' :
                        alert.type === 'HIGH_VOLUME' ? 'bg-purple-50 border-purple-400' :
                        alert.type === 'UNASSIGNED' ? 'bg-blue-50 border-blue-400' :
                        'bg-gray-50 border-gray-400'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">
                                {alert.type === 'SLA_BREACH' ? '🔴' :
                                 alert.type === 'SLA_WARNING' ? '🟠' :
                                 alert.type === 'PROCESS_STUCK' ? '⏱️' :
                                 alert.type === 'HIGH_VOLUME' ? '📈' :
                                 alert.type === 'UNASSIGNED' ? '👥' : 'ℹ️'}
                              </span>
                              <span className="font-medium text-gray-900">
                                {alert.title || alert.type || 'Alerte'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                alert.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                                alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {alert.severity || 'INFO'}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">
                              {alert.message || alert.description || 'Alerte détectée pour ce bordereau'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {alert.timestamp ? new Date(alert.timestamp).toLocaleString('fr-FR') : 'Date inconnue'}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/alerts/${alert.id}/resolve`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  }
                                });
                                setAlertsData(prev => prev.filter((_, i) => i !== index));
                                notify('Alerte résolue', 'success');
                              } catch (error) {
                                notify('Erreur lors de la résolution', 'error');
                              }
                            }}
                            className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
                          >
                            ✓ Résoudre
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAlertsModal(false);
                      setSelectedBordereauForAlerts(null);
                      setAlertsData([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/bordereaux/${selectedBordereauForAlerts.id}/alerts`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                        });
                        if (response.ok) {
                          const alerts = await response.json();
                          setAlertsData(alerts);
                          notify('Alertes actualisées', 'success');
                        }
                      } catch (error) {
                        notify('Erreur lors de l\'actualisation', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default BordereauxDashboard;

