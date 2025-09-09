import { useEffect, useState } from "react";
import {
  fetchBordereaux,
  fetchKPIs,
  searchBordereauxAndDocuments,
  analyzeComplaintsAI,
  getAIRecommendations,
  fetchForecastBordereaux,
  fetchEstimateStaffing,
  fetchUnassignedBordereaux,
  fetchTeamBordereaux,
  fetchUserBordereaux,
  exportBordereauxCSV,
} from "../../services/bordereauxService";
import { fetchClients, Societe } from "../../services/clientService";
import { Contract, fetchContracts } from "../../services/contractService";
import BordereauCard from "../../components/BordereauCard";
import BordereauTable from "../../components/BordereauTable";
import BordereauFilters from "../../components/BordereauFilters";
import { KPI, SearchResult, AIComplaintAnalysis, AIRecommendations, ForecastResult, StaffingEstimation } from "../../types/bordereaux";
import BordereauCreateForm from "../../components/BordereauCreateForm";
import EnhancedBordereauCreateForm from "../../components/EnhancedBordereauCreateForm";
import SearchResultsPanel from "../../components/SearchResultsPanel";
import { useAuth } from '../../contexts/AuthContext';
import TeamLeaderDashboard from '../../components/TeamLeaderDashboard';
import BordereauxDashboard from './BordereauxDashboard';
import BOWorkflowInterface from '../../components/BOWorkflowInterface';

function BordereauxListPage() {
  const { user, isAuthenticated } = useAuth();
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [clients, setClients] = useState<Societe[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [teamBordereaux, setTeamBordereaux] = useState<any[]>([]);
  const [userBordereaux, setUserBordereaux] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIComplaintAnalysis | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendations | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [staffing, setStaffing] = useState<StaffingEstimation | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'tous' | 'corbeille'>('tous');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(false);

  // Authentication check
  if (!isAuthenticated || !user) {
    return <div className="text-center py-10 text-gray-500">Authentification requise.</div>;
  }

  const userRole = user.role;
  const userId = user.id;
  const teamId = user.teamId || user.id;

  const loadData = () => {
    setLoading(true);
    fetchBordereaux(filters, { page, pageSize })
      .then(res => {
        if (res.items && typeof res.total === 'number') {
          setBordereaux(res.items);
          setTotal(res.total);
        } else {
          setBordereaux(res);
          setTotal(res.length || 0);
        }
      })
      .catch(() => setError("Erreur lors du chargement des bordereaux"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients().then(data => setClients(data as unknown as Societe[]));
    fetchContracts().then(setContracts);
    fetchKPIs().then(setKpis).catch(() => setError("Erreur lors du chargement des KPIs"));
    analyzeComplaintsAI().then(setAIAnalysis);
    getAIRecommendations().then(setAIRecommendations);
    fetchForecastBordereaux().then(setForecast);
    fetchEstimateStaffing().then(setStaffing);
    
    if (userRole === 'CHEF_EQUIPE') {
      fetchUnassignedBordereaux().then(setUnassigned);
      fetchTeamBordereaux(teamId).then(setTeamBordereaux);
    }
    if (userRole === 'GESTIONNAIRE') {
      fetchUserBordereaux(userId).then(setUserBordereaux);
    }
  }, [userRole, userId, teamId]);

  useEffect(() => {
    setLoading(true);
    if (filters.search && filters.search.trim() !== "") {
      searchBordereauxAndDocuments(filters.search)
        .then(setSearchResults)
        .catch(() => setError("Erreur lors de la recherche"))
        .finally(() => setLoading(false));
    } else {
      setSearchResults(null);
      loadData();
    }
  }, [filters, page, pageSize]);

  // When switching tabs, reset page and filters
  useEffect(() => {
    setPage(1);
    setFilters((f: any) => ({ ...f, archived: activeTab === 'corbeille' }));
  }, [activeTab]);

  const summary = kpis.find(k => k.id === "SUMMARY");

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csv = await exportBordereauxCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bordereaux.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Role-specific views
  if (userRole === 'CLIENT_SERVICE') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded shadow max-w-xl w-full p-8 space-y-6">
          <h1 className="text-2xl font-bold mb-4">Créer un Bordereau</h1>
          <BordereauCreateForm onSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (userRole === 'BO') {
    return <BOWorkflowInterface />;
  }

  if (userRole === 'CHEF_EQUIPE') {
    return <TeamLeaderDashboard />;
  }

  if (userRole === 'GESTIONNAIRE') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mes Bordereaux</h1>
            <p className="text-gray-600">Bordereaux qui me sont assignés</p>
          </div>
          
          {userBordereaux.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bordereau assigné</h3>
              <p className="text-gray-500">Vous n'avez actuellement aucun bordereau à traiter.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userBordereaux.map(b => (
                <BordereauCard 
                  key={b.id} 
                  bordereau={b} 
                  onAssignSuccess={() => fetchUserBordereaux(userId).then(setUserBordereaux)} 
                />
              ))}
            </div>
          )}

          {/* Personal Performance */}
          {summary && (
            <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Ma Performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{summary.daysElapsed}</div>
                  <div className="text-sm text-gray-600">Total traités</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{summary.daysRemaining}</div>
                  <div className="text-sm text-gray-600">En retard</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.scanDuration ?? "-"}</div>
                  <div className="text-sm text-gray-600">Durée scan moy. (j)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{summary.totalDuration ?? "-"}</div>
                  <div className="text-sm text-gray-600">Durée traitement moy. (j)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADMINISTRATEUR view - Use new dashboard
  return <BordereauxDashboard />;
};

export default BordereauxListPage;

const OldBordereauxView = () => {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [staffing, setStaffing] = useState<any>(null);
  const [aiAnalysis, setAIAnalysis] = useState<any>(null);
  const [aiRecommendations, setAIRecommendations] = useState<any>(null);
  
  const loadData = () => {};
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Bordereaux</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gérez et suivez tous vos bordereaux en temps réel
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span className="text-gray-600">Retard</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                  <span className="text-gray-600">Risque</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span className="text-gray-600">OK</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                👤 {user?.fullName || user?.id}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">{total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Traités</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary?.daysElapsed || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⚠</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">En retard</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary?.daysRemaining || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⏱</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Durée moy.</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary?.totalDuration || "-"} j</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Toolbar */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="mr-2">+</span>
                  Nouveau Bordereau
                </button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) console.log('Importing:', file.name);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    📁 Importer Excel
                  </button>
                </div>
                
                <button
                  onClick={() => console.log('Generating OV')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  💰 Générer OV
                </button>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Rechercher..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                </div>
                
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium ${
                      viewMode === 'table'
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    📊 Tableau
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`relative -ml-px inline-flex items-center px-4 py-2 rounded-r-md border text-sm font-medium ${
                      viewMode === 'cards'
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🗃️ Cartes
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
              <button
                onClick={() => setFilters({...filters, statut: ['SCAN_EN_COURS', 'EN_ATTENTE']})}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                À scanner
              </button>
              <button
                onClick={() => setFilters({...filters, assigned: false})}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                À affecter
              </button>
              <button
                onClick={() => setFilters({...filters, overdue: true})}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                En retard
              </button>
              
              <div className="border-l border-gray-300 mx-2 h-4"></div>
              
              <button
                onClick={() => setActiveTab('tous')}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  activeTab === 'tous'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setActiveTab('corbeille')}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  activeTab === 'corbeille'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Corbeille
              </button>

              <div className="ml-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  🔍 Filtres avancés
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <BordereauFilters 
                  onChange={setFilters} 
                  clients={clients.map(c => ({ id: String(c.id), name: c.name }))} 
                  contracts={contracts.map(c => ({ id: String(c.id), name: c.name || c.nom }))} 
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="flex">
                  <span className="text-red-400 mr-2">⚠️</span>
                  {error}
                </div>
              </div>
            )}

            {searchResults ? (
              <SearchResultsPanel results={searchResults} />
            ) : (
              <>
                {viewMode === 'table' ? (
                  <BordereauTable />
                ) : (
                  <div>
                    {loading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Chargement...</span>
                      </div>
                    ) : bordereaux.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">📋</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bordereau trouvé</h3>
                        <p className="text-gray-500">Essayez de modifier vos filtres ou créez un nouveau bordereau.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bordereaux.map(b => (
                          <BordereauCard 
                            key={b.id}
                            bordereau={b} 
                            isCorbeille={activeTab === 'corbeille'}
                            onAssignSuccess={() => loadData()} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Analytics Section - PRESERVED ALL FEATURES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <span className="mr-2">📈</span>
              Prévisions
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Prévision (7j)</span>
                <span className="text-lg font-semibold text-blue-600">{forecast?.forecast ?? 1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Moyenne/jour</span>
                <span className="text-lg font-semibold text-green-600">{forecast?.dailyAverage ?? 0.19}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Effectif requis</span>
                <span className="text-lg font-semibold text-orange-600">{staffing?.staffNeeded ?? 1}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <span className="mr-2">🤖</span>
              Analyse IA
            </h3>
            <div className="text-sm text-gray-600">
              {aiAnalysis?.summary ?? "Analyse en cours..."}
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <span className="mr-2">💡</span>
              Recommandations
            </h3>
            <div className="space-y-2">
              {aiRecommendations && Array.isArray(aiRecommendations) && aiRecommendations.length > 0 ? (
                aiRecommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="text-sm p-2 bg-blue-50 rounded text-blue-800">
                    {rec.recommendation || 'Optimisation suggérée'}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">Aucune recommandation disponible</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal - FIXED POSITIONING */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Créer un nouveau bordereau
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Fermer</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
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
    </div>
  );
}