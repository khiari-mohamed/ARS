import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/bordereaux.css';
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [slaFilter, setSlaFilter] = useState<'all' | 'en_cours' | 'regle' | 'en_retard'>('all');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
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
    console.log('🚀 Dashboard: Initial load with default filters');
    loadData();
    loadUsers();
    loadClients();
  }, []);
  
  useEffect(() => {
    console.log('🔄 Filters changed:', filters);
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📡 Loading data with filters:', filters);
      console.log('🔍 Dashboard: Current filter state:', JSON.stringify(filters, null, 2));
      const [bordereauxData, kpisData, analyticsData] = await Promise.all([
        fetchBordereaux({ ...filters, withVirement: true, include: 'ordresVirement' }),
        fetchKPIs(),
        getPerformanceAnalytics(filters)
      ]);
      
      const bordereauList = Array.isArray(bordereauxData) ? bordereauxData : bordereauxData.items || [];
      console.log('📊 Loaded bordereaux:', bordereauList.length, 'items');
      console.log('📊 Dashboard: Bordereau statuts:', bordereauList.map((b: any) => `${b.reference}: ${b.statut}`));
      setBordereaux(bordereauList);
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
    if (referenceFilter) newFilters.reference = referenceFilter;
    if (statusFilter) newFilters.statut = statusFilter;
    if (overdueFilter) newFilters.overdue = true;
    
    console.log('🔍 Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedClient('');
    setSlaFilter('all');
    setReferenceFilter('');
    setStatusFilter('');
    setOverdueFilter(false);
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

  // Pagination logic
  const totalPages = Math.ceil(bordereaux.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBordereaux = bordereaux.slice(startIndex, endIndex);

  const handleViewBordereau = (bordereauId: string) => {
    console.log('handleViewBordereau called with ID:', bordereauId);
    setSelectedBordereauForDetails(bordereauId);
    setShowDetailsModal(true);
    console.log('Modal state set - showDetailsModal:', true, 'selectedId:', bordereauId);
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

  const getSLAStatus = (bordereau: any) => {
    if (!bordereau.dateReception || !bordereau.delaiReglement) return { color: 'text-gray-500', days: 0 };
    
    const today = new Date();
    const reception = new Date(bordereau.dateReception);
    const elapsed = Math.floor((today.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = bordereau.delaiReglement - elapsed;
    
    if (remaining < 0) return { color: 'text-red-600', days: remaining, label: 'En retard' };
    if (remaining <= 3) return { color: 'text-orange-600', days: remaining, label: 'Urgent' };
    return { color: 'text-green-600', days: remaining, label: 'OK' };
  };

  // Get Durée de traitement from backend calculation
  const getDureeTraitement = (bordereau: any): { days: number | null; isOnTime: boolean } => {
    if (bordereau.dureeTraitement === null || bordereau.dureeTraitement === undefined) {
      return { days: null, isOnTime: true };
    }
    return { 
      days: bordereau.dureeTraitement, 
      isOnTime: bordereau.dureeTraitementStatus === 'GREEN' 
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
                  <span>📊</span>
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
                  <span>✅</span>
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
                  <span>⚠️</span>
                </div>
                <h3 className="bordereau-kpi-label">En retard</h3>
                <p className="bordereau-kpi-value value-danger">
                  {bordereaux.filter(b => getSLAStatus(b).days < 0).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bordereau-kpi-card kpi-warning">
            <div className="bordereau-kpi-content">
              <div className="bordereau-kpi-info">
                <div className="bordereau-kpi-icon icon-warning">
                  <span>📈</span>
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
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '0', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Référence" value={referenceFilter} onChange={(e) => setReferenceFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }} />
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '140px' }}>
              <option value="">Client</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }}>
              <option value="">Statut</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITE">Traité</option>
              <option value="VIREMENT_EXECUTE">Virement Exécuté</option>
            </select>
            <select value={overdueFilter ? 'true' : ''} onChange={(e) => { const val = e.target.value; setOverdueFilter(val === 'true'); }} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '120px' }}>
              <option value="">SLA</option>
              <option value="true">En retard</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '130px' }} />
            <button onClick={applyFilters} style={{ padding: '6px 12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Appliquer</button>
            <button onClick={resetFilters} style={{ padding: '6px 12px', background: '#d52b36', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Effacer</button>
          </div>
        </div>

              {/* Role-specific buttons */}
              {isBureauOrdre && (
                <>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bordereau-btn bordereau-btn-primary"
                  >
                    <span>➕</span>
                    Enregistrer Bordereau
                  </button>
                  <button className="bordereau-btn bordereau-btn-secondary">
                    <span>✏️</span>
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
                    <button className="bordereau-btn bordereau-btn-primary">
                      <span>📂</span>
                      Importer Scan
                    </button>
                  </div>
                  <button className="bordereau-btn bordereau-btn-warning">
                    <span>🚨</span>
                    Signaler Surcharge
                  </button>
                </>
              )}
              
              {isChefEquipe && (
                <>
                  <button className="bordereau-btn bordereau-btn-primary">
                    <span>👥</span>
                    Assigner en Lot
                  </button>
                  <button className="bordereau-btn bordereau-btn-secondary">
                    <span>📊</span>
                    Tableau de Bord
                  </button>
                </>
              )}
              
              {isGestionnaire && (
                <>
                  <button 
                    onClick={() => handleBulkAction('status', 'TRAITE')}
                    className="bordereau-btn bordereau-btn-success"
                  >
                    <span>✅</span>
                    Marquer Traités
                  </button>
                  <button 
                    onClick={() => handleBulkAction('status', 'MIS_EN_INSTANCE')}
                    className="bordereau-btn bordereau-btn-warning"
                  >
                    <span>⏸️</span>
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
                      <option value="">👥 Assigner à...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.fullName}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => handleBulkAction('progress')}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    ➡️ Progresser
                  </button>
                  
                  <div className="relative group">
                    <button className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                      🔄 Changer Statut ▼
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={handleAdvancedSearch}
              >
                🔍 Rechercher
              </button>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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

        <div>
            {/* Content */}
        {
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bordereau-table-container">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
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
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Référence</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Client</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Date Réception</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Documents</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Délai</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Durée Trait.</th>
                    {paginatedBordereaux.some(b => b.statut === 'VIREMENT_EXECUTE' && b.virement?.dateExecution) && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Date Trait. Virement</th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Durée Règlement</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Statut</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedBordereaux.map((bordereau) => {
                    const sla = getSLAStatus(bordereau);
                    return (
                      <tr key={bordereau.id} className="hover:bg-blue-50 transition-colors group">
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
                          <div className="text-sm font-semibold text-blue-600">{bordereau.reference}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-700">{bordereau.client?.name}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-600">
                            {bordereau.dateReception ? new Date(bordereau.dateReception).toLocaleDateString('fr-FR') : '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {bordereau._count?.documents || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-600">
                            {bordereau.delaiReglement || '-'}j
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {(() => {
                            const dureeTraitement = getDureeTraitement(bordereau);
                            if (dureeTraitement.days === null || dureeTraitement.days === undefined) {
                              return <span className="text-xs text-gray-400">-</span>;
                            }
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                dureeTraitement.isOnTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {dureeTraitement.days}j
                              </span>
                            );
                          })()}
                        </td>
                        {paginatedBordereaux.some(b => b.statut === 'VIREMENT_EXECUTE' && b.ordresVirement?.[0]?.dateEtatFinal) && (
                          <td className="px-3 py-3">
                            {bordereau.statut === 'VIREMENT_EXECUTE' && bordereau.ordresVirement?.[0]?.dateEtatFinal ? (
                              <span style={{
                                display: 'inline-flex',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: '600',
                                borderRadius: '9999px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                              }}>
                                {new Date(bordereau.ordresVirement[0].dateEtatFinal).toLocaleDateString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3">
                          {bordereau.statut === 'VIREMENT_EXECUTE' && bordereau.ordresVirement?.[0]?.dateEtatFinal ? (
                            <span style={{
                              display: 'inline-flex',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              borderRadius: '9999px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                            }}>
                              ✓ Réglé ({bordereau.dureeReglement || 0}j)
                            </span>
                          ) : bordereau.dureeReglement !== null && bordereau.dureeReglement !== undefined ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              bordereau.dureeReglementStatus === 'GREEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {bordereau.dureeReglement}j
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">En attente</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bordereau.statut)}`}>
                            {bordereau.statut}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center relative">

                          <div className="flex gap-2 justify-center">
                              {/* Always visible actions */}
                              <button
                                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleViewBordereau(bordereau.id);
                                }}
                                title="Voir détails"
                              >
                                👁️ Voir
                              </button>



                              
                              {/* Archive action */}
                              {isSuperAdmin && (
                                <button
                                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
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
                                  🗄️ Archiver
                                </button>
                              )}
                            {/* </div>
                          </div> */}
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
                padding: '20px 24px',
                borderTop: '2px solid #e5e7eb',
                background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  Affichage de <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{startIndex + 1}</span> à <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{Math.min(endIndex, bordereaux.length)}</span> sur <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{bordereaux.length}</span> bordereaux
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === 1 ? '#f3f4f6' : 'white',
                      color: currentPage === 1 ? '#9ca3af' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: currentPage === 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    ← Précédent
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        border: currentPage === page ? '2px solid #2563eb' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        background: currentPage === page ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                        color: currentPage === page ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: currentPage === page ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                        minWidth: '40px'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === totalPages ? '#f3f4f6' : 'white',
                      color: currentPage === totalPages ? '#9ca3af' : '#374151',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: currentPage === totalPages ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
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
          getSLAStatus={getSLAStatus}
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
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    🔄 Actualiser
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