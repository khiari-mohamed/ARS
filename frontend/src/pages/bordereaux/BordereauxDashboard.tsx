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

const BordereauxDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<any>({archived: false});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
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
        fetchBordereaux(filters),
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
            {(isChefEquipe || isGestionnaire || isSuperAdmin) && (
              <button
                onClick={() => setShowCorbeilleModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
              >
                {isChefEquipe && '📂 Corbeille Chef'}
                {isGestionnaire && '📋 Ma Corbeille'}
                {isSuperAdmin && '🗂️ Corbeille Globale'}
              </button>
            )}
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

        {/* Actions Bar */}
        <div className="bordereau-actions-bar">
          <div className="bordereau-actions-content">
            <div className="bordereau-actions-left">
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
              
              {(isSuperAdmin || isAdministrateur) && (
                <>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bordereau-btn bordereau-btn-primary"
                  >
                    <span>+</span>
                    Nouveau Bordereau
                  </button>
                  <button
                    onClick={handleGenerateOV}
                    className="bordereau-btn bordereau-btn-warning"
                  >
                    <span>💰</span>
                    Générer OV
                  </button>
                </>
              )}
              
              <button
                onClick={handleExport}
                className="bordereau-btn bordereau-btn-success"
              >
                <span>📊</span>
                Exporter
              </button>
              
              {/* Excel Import */}
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={importingExcel}
                />
                <button
                  className="bordereau-btn bordereau-btn-secondary"
                  disabled={importingExcel}
                >
                  <span>📁</span>
                  {importingExcel ? 'Import...' : 'Importer Excel'}
                </button>
              </div>

              {/* Advanced Search */}
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="bordereau-btn bordereau-btn-secondary"
              >
                <span>🔍</span>
                Recherche Avancée
              </button>

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
                        onClick={() => handleBulkAction('status', 'A_SCANNER')}
                      >
                        À scanner
                      </button>
                      <button 
                        className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => handleBulkAction('status', 'EN_COURS')}
                      >
                        En cours
                      </button>
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
            </div>

            <div className="flex items-center gap-3">

            </div>
          </div>
        </div>

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

        {/* AI Recommendations Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Content */}
        {
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bordereau-table-container">
              <table className="bordereau-table divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bordereaux.map((bordereau) => {
                    const sla = getSLAStatus(bordereau);
                    return (
                      <tr key={bordereau.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{bordereau.reference}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{bordereau.client?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bordereau.statut)}`}>
                            {bordereau.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${sla.color}`}>
                            {sla.days < 0 ? `+${Math.abs(sla.days)}j` : `${sla.days}j`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bordereau.nombreBS}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-1 min-w-[300px]">
                            {/* Always show Voir and Progresser */}
                            <button
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              onClick={(e) => {
                                console.log('Voir button clicked for bordereau:', bordereau.id);
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewBordereau(bordereau.id);
                              }}
                              title="Voir détails"
                            >
                              👁️ Voir
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleProgressBordereau(bordereau);
                              }}
                              title="Progresser vers l'étape suivante"
                            >
                              ➡️ Progresser
                            </button>

                            {/* Bureau d'Ordre specific */}
                            {isBureauOrdre && bordereau.statut === 'EN_ATTENTE' && (
                              <button
                                className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                                onClick={() => batchUpdateStatus([bordereau.id], 'A_SCANNER').then(() => loadData())}
                                title="Envoyer au scan"
                              >
                                📤 Scan
                              </button>
                            )}

                            {/* SCAN Team specific */}
                            {isScanTeam && (
                              <>
                                {bordereau.statut === 'A_SCANNER' && (
                                  <button
                                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                                    onClick={() => startScan(bordereau.id).then(() => loadData())}
                                    title="Démarrer scan"
                                  >
                                    🖨️ Start
                                  </button>
                                )}
                                {bordereau.statut === 'SCAN_EN_COURS' && (
                                  <button
                                    className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
                                    onClick={() => completeScan(bordereau.id).then(() => loadData())}
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
                                {(bordereau.statut === 'SCANNE' || bordereau.statut === 'A_AFFECTER') && (
                                  <button
                                    className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAssignBordereau(bordereau.id);
                                    }}
                                    title="Assigner à un gestionnaire"
                                  >
                                    👥 Assigner
                                  </button>
                                )}
                                {bordereau.assignedToUserId && (
                                  <button
                                    className="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 rounded transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleReassignBordereau(bordereau.id);
                                    }}
                                    title="Réaffecter à un autre gestionnaire"
                                  >
                                    ↔️ Réaffecter
                                  </button>
                                )}
                                {bordereau.assignedToUserId && (
                                  <button
                                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      batchUpdateStatus([bordereau.id], 'A_AFFECTER').then(() => loadData());
                                    }}
                                    title="Récupérer le dossier"
                                  >
                                    ↩️ Récupérer
                                  </button>
                                )}
                              </>
                            )}

                            {/* Gestionnaire specific */}
                            {isGestionnaire && bordereau.statut === 'EN_COURS' && (
                              <>
                                <button
                                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
                                  onClick={() => markBordereauAsProcessed(bordereau.id).then(() => loadData())}
                                  title="Marquer comme traité"
                                >
                                  ✅ Traiter
                                </button>
                                <button
                                  className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
                                  onClick={() => batchUpdateStatus([bordereau.id], 'MIS_EN_INSTANCE').then(() => loadData())}
                                  title="Mettre en instance"
                                >
                                  ⏸️ Instance
                                </button>
                                <button
                                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded transition-colors"
                                  onClick={() => batchUpdateStatus([bordereau.id], 'VIREMENT_REJETE').then(() => loadData())}
                                  title="Rejeter le dossier"
                                >
                                  ❌ Rejeter
                                </button>
                                <button
                                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                                  onClick={() => {
                                    const reason = prompt('Motif du retour:');
                                    if (reason) returnBordereau(bordereau.id, reason).then(() => loadData());
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
                                {(bordereau.statut === 'SCANNE' || bordereau.statut === 'A_AFFECTER') && (
                                  <button
                                    className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAssignBordereau(bordereau.id);
                                    }}
                                    title="Assigner"
                                  >
                                    👥 Assigner
                                  </button>
                                )}
                                {bordereau.assignedToUserId && (
                                  <button
                                    className="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 rounded transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleReassignBordereau(bordereau.id);
                                    }}
                                    title="Réaffecter"
                                  >
                                    ↔️ Réaffecter
                                  </button>
                                )}
                                <button
                                  className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Generate dynamic alerts based on bordereau data
                                    const alerts = [];
                                    const today = new Date();
                                    const reception = new Date(bordereau.dateReception);
                                    const daysElapsed = Math.floor((today.getTime() - reception.getTime()) / (1000 * 60 * 60 * 24));
                                    const daysRemaining = bordereau.delaiReglement - daysElapsed;
                                    
                                    // SLA Breach Alert
                                    if (daysRemaining < 0) {
                                      alerts.push({
                                        id: `sla-${bordereau.id}`,
                                        type: 'SLA_BREACH',
                                        severity: 'HIGH',
                                        title: 'Dépassement SLA Critique',
                                        message: `Ce bordereau a dépassé son délai de règlement de ${Math.abs(daysRemaining)} jour(s). Action immédiate requise.`,
                                        timestamp: new Date().toISOString(),
                                        actionRequired: true
                                      });
                                    }
                                    
                                    // SLA Warning Alert
                                    if (daysRemaining > 0 && daysRemaining <= 3) {
                                      alerts.push({
                                        id: `sla-warning-${bordereau.id}`,
                                        type: 'SLA_WARNING',
                                        severity: 'MEDIUM',
                                        title: 'SLA Proche de l\'expiration',
                                        message: `Ce bordereau expire dans ${daysRemaining} jour(s). Planifiez le traitement rapidement.`,
                                        timestamp: new Date().toISOString(),
                                        actionRequired: false
                                      });
                                    }
                                    
                                    // Status Stuck Alert
                                    if (bordereau.statut === 'EN_COURS' && daysElapsed > 15) {
                                      alerts.push({
                                        id: `stuck-${bordereau.id}`,
                                        type: 'PROCESS_STUCK',
                                        severity: 'MEDIUM',
                                        title: 'Dossier bloqué en traitement',
                                        message: `Ce dossier est en cours de traitement depuis ${daysElapsed} jours. Vérifiez l'état d'avancement.`,
                                        timestamp: new Date().toISOString(),
                                        actionRequired: true
                                      });
                                    }
                                    
                                    // High Volume Alert
                                    if (bordereau.nombreBS > 50) {
                                      alerts.push({
                                        id: `volume-${bordereau.id}`,
                                        type: 'HIGH_VOLUME',
                                        severity: 'MEDIUM',
                                        title: 'Volume élevé de BS',
                                        message: `Ce bordereau contient ${bordereau.nombreBS} bulletins de soin. Considérez une priorité élevée.`,
                                        timestamp: new Date().toISOString(),
                                        actionRequired: false
                                      });
                                    }
                                    
                                    // Assignment Alert
                                    if (!bordereau.assignedToUserId && ['SCANNE', 'A_AFFECTER'].includes(bordereau.statut)) {
                                      alerts.push({
                                        id: `unassigned-${bordereau.id}`,
                                        type: 'UNASSIGNED',
                                        severity: 'MEDIUM',
                                        title: 'Dossier non assigné',
                                        message: 'Ce dossier est prêt pour affectation mais n\'est assigné à aucun gestionnaire.',
                                        timestamp: new Date().toISOString(),
                                        actionRequired: true
                                      });
                                    }
                                    
                                    setAlertsData(alerts);
                                    setSelectedBordereauForAlerts(bordereau);
                                    setShowAlertsModal(true);
                                  }}
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
                                  onClick={async () => {
                                    console.log('🔔 NOTIFICATION BUTTON CLICKED!');
                                    console.log('Notify function:', notify);
                                    
                                    // Test the notification popup directly
                                    notify('TEST: Notification envoyée avec succès!', 'success');
                                    
                                    try {
                                      const { sendCustomNotification } = await import('../../services/bordereauxService');
                                      await sendCustomNotification(
                                        bordereau.id,
                                        `Notification pour le bordereau ${bordereau.reference}`,
                                        [bordereau.assignedToUserId].filter(Boolean)
                                      );
                                      console.log('✅ API call successful');
                                    } catch (error) {
                                      console.error('Notification error:', error);
                                      notify('Erreur lors de l\'envoi de la notification', 'error');
                                    }
                                  }}
                                >
                                  🔔 Notification
                                </button>
                                <button 
                                  className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/bordereaux/${bordereau.id}/export-pdf`, {
                                        method: 'GET',
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        }
                                      });
                                      if (response.ok) {
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `bordereau_${bordereau.reference}.pdf`;
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        notify(`PDF exporté: ${bordereau.reference}`, 'success');
                                      } else {
                                        notify('Erreur lors de l\'export PDF', 'error');
                                      }
                                    } catch (error) {
                                      notify('Erreur lors de l\'export PDF', 'error');
                                    }
                                  }}
                                >
                                  📄 Export PDF
                                </button>
                                {isSuperAdmin && (
                                  <button 
                                    className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50 text-red-600"
                                    onClick={async () => {
                                      try {
                                        await archiveBordereau(bordereau.id);
                                        notify(`Bordereau ${bordereau.reference} archivé avec succès`, 'success');
                                        // Immediately remove from current state
                                        setBordereaux(prev => prev.filter(b => b.id !== bordereau.id));
                                      } catch (error) {
                                        notify('Erreur lors de l\'archivage', 'error');
                                      }
                                    }}
                                  >
                                    🗄️ Archiver
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        }
          </div>
          
          {/* AI Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <AIRecommendations />
          </div>
        </div>
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
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedBordereauForDetails(null);
          }}
        />
      )}

      {/* Progress Modal */}
      {showProgressModal && selectedBordereauForProgress && (
        <BordereauProgressModal
          bordereau={selectedBordereauForProgress}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedBordereauForProgress(null);
          }}
          onSuccess={() => {
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
    </div>
  );
};

export default BordereauxDashboard;