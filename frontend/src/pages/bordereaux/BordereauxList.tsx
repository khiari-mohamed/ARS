import { useEffect, useState, useMemo } from "react";
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
import BordereauKanban from "../../components/BordereauKanban";
import BordereauTable from "../../components/BordereauTable";
import BordereauFilters from "../../components/BordereauFilters";
import { KPI, SearchResult, AIComplaintAnalysis, AIRecommendations, ForecastResult, StaffingEstimation } from "../../types/bordereaux";
import BarChart from "../../components/BarChart";
import BordereauCreateForm from "../../components/BordereauCreateForm";
import SearchResultsPanel from "../../components/SearchResultsPanel";
import ForecastPanel from "../../components/ForecastPanel";
import AIInsightsPanel from "../../components/AIInsightsPanel";
import ComplaintDetails from "../../components/ComplaintDetails";
import OcrPanel from "../../components/OcrPanel";
import CourrierPanel from "../../components/CourrierPanel";
import ContractThresholdPanel from "../../components/ContractThresholdPanel";
import { useAuth } from '../../contexts/AuthContext';
import MobileBSProcessor from '../../components/MobileBSProcessor';
import TeamLeaderDashboard from '../../components/TeamLeaderDashboard';

export default function BordereauxListPage() {
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
  // New states for search, AI, and forecasting
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIComplaintAnalysis | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendations | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [staffing, setStaffing] = useState<StaffingEstimation | null>(null);
  const [exporting, setExporting] = useState(false);

  // Defensive: if not authenticated, show nothing
  if (!isAuthenticated || !user) {
    return <div className="text-center py-10 text-gray-500">Authentification requise.</div>;
  }

  // Use backend role names
  const userRole = user.role;
  const userId = user.id;
  // For Chef d'Équipe, you may want to fetch teamId from user object or another API
  // For now, fallback to user.id as teamId if not present
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

  // Extract summary KPI object
  const summary = kpis.find(k => k.id === "SUMMARY");

  // Export CSV handler
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

  // --- UI by Role ---
  if (userRole === 'CLIENT_SERVICE') {
    // Only show creation form (BO)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded shadow max-w-xl w-full p-8 space-y-6">
          <h1 className="text-2xl font-bold mb-4">Créer un Bordereau</h1>
          <BordereauCreateForm onSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (userRole === 'CHEF_EQUIPE') {
    // Enhanced Team Leader Dashboard with advanced features
    return <TeamLeaderDashboard />;
  }

  if (userRole === 'GESTIONNAIRE') {
    // Gestionnaire: only assigned to me, personal stats
    return (
      <div className="bordereaux-gestionnaire-dashboard-container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">Mes Bordereaux</h1>
        </div>
        <div className="mb-6">
          {userBordereaux.length === 0 ? <div className="text-gray-500">Aucun bordereau assigné</div> : (
            <div className="grid md:grid-cols-2 gap-4">
              {userBordereaux.map(b => <BordereauCard key={b.id} bordereau={b} onAssignSuccess={() => fetchUserBordereaux(userId).then(setUserBordereaux)} />)}
            </div>
          )}
        </div>
        {/* Personal KPIs */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Ma performance</h2>
          {summary && (
            <div className="bordereaux-kpis">
              <div className="bordereaux-kpi-card bordereaux-kpi-green"><b>Total:</b> {summary.daysElapsed}</div>
              <div className="bordereaux-kpi-card bordereaux-kpi-blue"><b>Retards:</b> {summary.daysRemaining}</div>
              <div className="bordereaux-kpi-card bordereaux-kpi-yellow"><b>Durée scan moyenne:</b> {summary.scanDuration ?? "-"} jours</div>
              <div className="bordereaux-kpi-card bordereaux-kpi-orange"><b>Durée traitement moyenne:</b> {summary.totalDuration ?? "-"} jours</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADMINISTRATEUR: Table view as specified
  const [activeTab, setActiveTab] = useState<'tous' | 'corbeille'>('tous');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // When switching tabs, reset page and filters
  useEffect(() => {
    setPage(1);
    setFilters((f: any) => ({ ...f, archived: activeTab === 'corbeille' }));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Frame - Top Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Bordereaux</h1>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Rechercher références / clients / BS..."
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  🔍
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span>Retard</span>
                <span className="w-2 h-2 bg-yellow-500 rounded-full ml-2"></span>
                <span>Risque</span>
                <span className="w-2 h-2 bg-green-500 rounded-full ml-2"></span>
                <span>OK</span>
              </div>
              <div className="border-l border-gray-200 mx-2 h-6"></div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600">👤</span>
                <span className="text-sm font-medium">{user?.id}</span>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  🔔
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Top Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button className="btn-primary">+ Ajouter Bordereau</button>
              <div className="border border-dashed border-gray-300 rounded px-4 py-2 text-sm text-gray-500 cursor-pointer hover:border-gray-400">
                📁 Importer Excel (glisser-déposer)
              </div>
              <button className="btn-warning">Générer OV</button>
            </div>
            <div className="flex gap-2">
              <button 
                className={`btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('table')}
              >
                📊 Table
              </button>
              <button 
                className={`btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('cards')}
              >
                🗃️ Cards
              </button>
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 mb-4">
            <button className="quick-filter-btn">À scanner</button>
            <button className="quick-filter-btn">À affecter</button>
            <button className="quick-filter-btn">Retard &gt; 0 jours</button>
            <div className="border-l border-gray-200 mx-2"></div>
            <button
              className={`quick-filter-btn ${activeTab === 'tous' ? 'active' : ''}`}
              onClick={() => setActiveTab('tous')}
            >
              Tous
            </button>
            <button
              className={`quick-filter-btn ${activeTab === 'corbeille' ? 'active' : ''}`}
              onClick={() => setActiveTab('corbeille')}
            >
              Corbeille
            </button>
          </div>
          
          <BordereauFilters 
            onChange={setFilters} 
            clients={clients.map(c => ({ id: String(c.id), name: c.name }))} 
            contracts={contracts.map(c => ({ id: String(c.id), name: c.name || c.nom }))} 
          />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {/* Main Content */}
        {searchResults ? (
          <SearchResultsPanel results={searchResults} />
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            {viewMode === 'table' ? (
              <BordereauTable />
            ) : (
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-lg text-gray-500">Chargement...</div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}

        {/* KPIs Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Prévisions</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Prévision (7j)</span>
                <span className="font-medium">{forecast?.forecast ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Moyenne/jour</span>
                <span className="font-medium">{forecast?.dailyAverage ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Effectif requis</span>
                <span className="font-medium">{staffing?.staffNeeded ?? 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Performance</h3>
            {summary && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-medium">{summary.daysElapsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Retards</span>
                  <span className="font-medium text-red-600">{summary.daysRemaining}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Durée scan moy.</span>
                  <span className="font-medium">{summary.scanDuration ?? "-"} j</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Analyse IA</h3>
            <div className="text-sm text-gray-600">
              {aiAnalysis?.summary ?? "Aucune analyse disponible"}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Recommandations</h3>
            <div className="text-sm text-gray-600">
              {aiRecommendations && Array.isArray(aiRecommendations) && aiRecommendations.length > 0 ? (
                aiRecommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="mb-2">
                    {rec.recommendation || 'Optimisation suggérée'}
                  </div>
                ))
              ) : (
                "Aucune recommandation"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Bordereau creation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setShowCreateModal(false)} aria-label="Fermer">✕</button>
            <BordereauCreateForm onSuccess={() => { setShowCreateModal(false); loadData(); }} />
          </div>
        </div>
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
        
        .btn-primary:hover {
          background-color: #0a58ca;
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
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        
        .quick-filter-btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .quick-filter-btn:hover {
          background-color: #f3f4f6;
        }
        
        .quick-filter-btn.active {
          background-color: #0b5ed7;
          color: white;
          border-color: #0b5ed7;
        }
      `}</style>
    </div>
  );
}