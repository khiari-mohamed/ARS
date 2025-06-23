"use client";
import { useEffect, useState } from "react";
import {
  fetchBordereaux,
  fetchKPIs,
  searchBordereauxAndDocuments,
  analyzeComplaintsAI,
  getAIRecommendations,
  fetchForecastBordereaux,
  fetchEstimateStaffing,
} from "../../services/bordereauxService";
import { fetchClients, Societe } from "../../services/clientService";
import { Contract, fetchContracts } from "../../services/contractService";
import BordereauCard from "../../components/BordereauCard";
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

export default function BordereauxListPage() {
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [clients, setClients] = useState<Societe[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New states for search, AI, and forecasting
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIComplaintAnalysis | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendations | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [staffing, setStaffing] = useState<StaffingEstimation | null>(null);

  useEffect(() => {
    fetchClients().then(data => setClients(data as unknown as Societe[]));
    fetchContracts().then(setContracts);
    fetchKPIs().then(setKpis).catch(() => setError("Erreur lors du chargement des KPIs"));
    // Fetch AI and forecasting on mount
    analyzeComplaintsAI().then(setAIAnalysis);
    getAIRecommendations().then(setAIRecommendations);
    fetchForecastBordereaux().then(setForecast);
    fetchEstimateStaffing().then(setStaffing);
  }, []);

  useEffect(() => {
    setLoading(true);
    // If a search is present, use full-text search endpoint
    if (filters.search && filters.search.trim() !== "") {
      searchBordereauxAndDocuments(filters.search)
        .then(setSearchResults)
        .catch(() => setError("Erreur lors de la recherche"))
        .finally(() => setLoading(false));
    } else {
      setSearchResults(null);
      fetchBordereaux(filters)
        .then(setBordereaux)
        .catch(() => setError("Erreur lors du chargement des bordereaux"))
        .finally(() => setLoading(false));
    }
  }, [filters]);

  // Extract summary KPI object
  const summary = kpis.find(k => k.id === "SUMMARY");

  return (
    <div className="bordereaux-container">
      <div className="bordereaux-header">
        <h1>Bordereaux</h1>
        <button
          className="bordereaux-new-btn"
          onClick={() => setShowCreateModal(true)}
          type="button"
        >
          + Nouveau Bordereau
        </button>
      </div>
      <div className="bordereaux-filters">
        <BordereauFilters
          onChange={setFilters}
          clients={clients.map(c => ({ id: String(c.id), name: c.name }))}
          contracts={contracts.map(c => ({ id: String(c.id), name: c.name || c.nom }))}
        />
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}

      {/* Search Results */}
      {searchResults ? (
      <SearchResultsPanel results={searchResults} />
      ) : (
      <div className="bordereaux-list">
      {loading
      ? <div className="bordereaux-loading">Chargement...</div>
      : bordereaux.map(b => (
      <div key={b.id} className="mb-8">
      <BordereauCard bordereau={b} />
      {/* OCR Panel for each document of the bordereau, if any */}
      {b.documents && b.documents.length > 0 && (
      <div className="ml-4">
      <h4 className="mt-2 mb-1 text-xs font-semibold">OCR pour les documents:</h4>
      {b.documents.map((doc: any) => (
      <OcrPanel key={doc.id} documentId={doc.id} />
      ))}
      </div>
      )}
      {/* Courrier Panel for each bordereau (optional, or show globally below) */}
      <div className="ml-4 mt-2">
      <CourrierPanel />
      </div>
      {/* Contract Threshold Panel for each bordereau's contract (if available) */}
      {b.contract && b.contract.id && (
      <div className="ml-4 mt-2">
      <ContractThresholdPanel contractId={b.contract.id} />
      </div>
      )}
      </div>
      ))}
      </div>
      )}

      <div className="bordereaux-kpis-section">
      <h2>KPIs</h2>
      {summary && (
      <>
      <div className="bordereaux-kpis">
      <div className="bordereaux-kpi-card bordereaux-kpi-green">
      <b>Total:</b> {summary.daysElapsed}
      </div>
      <div className="bordereaux-kpi-card bordereaux-kpi-blue">
      <b>Retards:</b> {summary.daysRemaining}
      </div>
      <div className="bordereaux-kpi-card bordereaux-kpi-yellow">
      <b>Durée scan moyenne:</b> {summary.scanDuration ?? "-"} jours
      </div>
      <div className="bordereaux-kpi-card bordereaux-kpi-orange">
      <b>Durée traitement moyenne:</b> {summary.totalDuration ?? "-"} jours
      </div>
      </div>
      {summary.byStatus && (
      <div className="mt-4">
      <BarChart byStatus={summary.byStatus} label="Bordereaux par statut" color="#1976d2" />
      </div>
      )}
      </>
      )}
      </div>
      
      {/* --- Enhanced Forecast, AI Analysis, and Recommendations Sections --- */}
      <div className="dashboard-section">
      <h2>Prévisions</h2>
      <div className="kpi-widgets">
      <div className="kpi-box kpi-box-info">
      <div className="kpi-label">Prévision (7 jours)</div>
      <div className="kpi-value">{forecast?.forecast ?? 0}</div>
      </div>
      <div className="kpi-box kpi-box-primary">
      <div className="kpi-label">Moyenne journalière</div>
      <div className="kpi-value">{forecast?.dailyAverage ?? 0}</div>
      </div>
      <div className="kpi-box kpi-box-success">
      <div className="kpi-label">Effectif estimé requis</div>
      <div className="kpi-value">{staffing?.staffNeeded ?? 0}</div>
      </div>
      </div>
      </div>
      
      <div className="dashboard-section">
      <h2>Analyse IA des réclamations</h2>
      <div className="card-panel">
      {aiAnalysis?.summary ?? "Aucune analyse disponible"}
      {/* Optionally, list recurrent complaints here */}
      </div>
      </div>
      
      <div className="dashboard-section">
      <h2>Recommandations IA</h2>
      <div className="card-panel">
      {aiRecommendations && Array.isArray(aiRecommendations) && aiRecommendations.length > 0 ? (
      aiRecommendations.map(rec => (
      <div key={rec.teamId || 'none'}>
      <strong>Équipe:</strong> {rec.teamId || 'N/A'}<br />
      <span>{rec.recommendation}</span>
      </div>
      ))
      ) : (
      <span>Aucune recommandation disponible</span>
      )}
      </div>
      </div>
      
      {/* Example Complaint Details Section (replace with your real complaints data) */}
      {/*
      {complaints && complaints.length > 0 && (
      <div className="mt-8">
      <h2>Réclamations</h2>
      {complaints.map(complaint => (
      <ComplaintDetails key={complaint.id} complaint={complaint} />
      ))}
      </div>
      )}
      */}

      {/* Modal for Bordereau creation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowCreateModal(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
            {/* BordereauCreateForm should call onSuccess to close and refresh */}
            <BordereauCreateForm
              onSuccess={() => {
                setShowCreateModal(false);
                setLoading(true);
                fetchBordereaux(filters)
                  .then(setBordereaux)
                  .finally(() => setLoading(false));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}