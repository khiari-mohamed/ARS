import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { LocalAPI } from '../services/axios';
import { hasDashboardAccess, canViewFeature } from '../utils/dashboardRoles';
import WorkforceEstimator from './analytics/WorkforceEstimator';
import { AssignmentSuggestions } from './BS/AssignmentSuggestions';
import { RebalancingSuggestions } from './BS/RebalancingSuggestions';
import { PrioritiesDashboard } from './BS/PrioritiesDashboard';
import DossiersList from './BS/DossiersList';
import { useIsReadOnly } from './ReadOnlyWrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableauBordStats {
  totalDossiers: number;
  clotures: number;
  enCours: number;
  nonAffectes: number;
  progressBars: { clotures: number; enCours: number; nonAffectes: number };
}

interface TypeDetail {
  [key: string]: {
    total: number;
    clotures: number;
    enCours: number;
    nonAffectes: number;
  };
}

interface Dossier {
  id: string;
  reference: string;
  client: string;
  type: string;
  statut: string;
  gestionnaire: string;
  date: string;
  joursEnCours: number;
  priorite: string;
  completionPercentage?: number;
  dossierStates?: string[];
}

interface DashboardData {
  kpis: any;
  performance: any;
  slaStatus: any[];
  alerts: any;
  role?: string;
  permissions?: string[];
  departmentStats?: any[];
  clientStats?: any[];
  financialSummary?: any;
  personalTasks?: any[];
  virements?: any[];
  financialStats?: any;
  pendingBordereaux?: any[];
  scanQueue?: any[];
  activeReclamations?: any[];
  documentStats?: {
    bulletinSoin: number;
    complementInfo: number;
    adhesions: number;
    reclamations: number;
    contrats: number;
    resiliations: number;
    conventions: number;
    [key: string]: any;
  };
}

interface Filter1 { ref: string; client: string; type: string; statut: string; dateFrom: string; dateTo: string }
interface Filter2 { ref: string; client: string; statut: string; dateFrom: string; dateTo: string }
interface Filter3 { ref: string; refBrdx: string; client: string; type: string; statut: string; gest: string; dateFrom: string; dateTo: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60_000; // Bumped from 30s → 60s to reduce server hammering
const ITEMS_PER_PAGE = 5;
const INDIVIDUEL_PER_PAGE = 20;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  TRAITE:           { bg: '#d1fae5', text: '#065f46' },
  EN_COURS:         { bg: '#e0f2fe', text: '#0369a1' },
  A_AFFECTER:       { bg: '#fce7f3', text: '#9d174d' },
  A_SCANNER:        { bg: '#fef3c7', text: '#92400e' },
  VIREMENT_EXECUTE: { bg: '#dbeafe', text: '#1d4ed8' },
  ASSIGNE:          { bg: '#ede9fe', text: '#5b21b6' },
  CLOTURE:          { bg: '#f1f5f9', text: '#475569' },
  default:          { bg: '#f3f4f6', text: '#374151' },
};

const getStatusStyle = (status: string) =>
  STATUS_COLORS[status] ?? STATUS_COLORS.default;

const getDossierStatutStyle = (statut: string) => {
  if (statut === 'Traité')   return { bg: '#4caf50', text: 'white' };
  if (statut === 'En cours') return { bg: '#ff9800', text: 'white' };
  return { bg: '#f44336', text: 'white' };
};

const getPriorityColor = (priorite: string) => {
  if (priorite === 'Très')    return '#f44336';
  if (priorite === 'Moyenne') return '#ff9800';
  return '#4caf50';
};

const getCompletionColor = (pct: number) =>
  pct >= 80 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#f44336';

// ─── Micro-components ─────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
    <div style={{
      width: 44, height: 44,
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #d52b36',
      borderRadius: '50%',
      animation: 'ars-spin 0.8s linear infinite',
    }} />
    <p style={{ color: '#6b7280', fontWeight: 500, margin: 0 }}>Chargement du tableau de bord…</p>
  </div>
);

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 48, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: getCompletionColor(pct), borderRadius: 3, transition: 'width .3s' }} />
    </div>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 30 }}>{pct}%</span>
  </div>
);

const StatusBadge: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
  const { bg, text } = getStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 6px' : '3px 10px',
      borderRadius: 6, fontSize: small ? 10 : 12,
      fontWeight: 700, background: bg, color: text,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

const DossierStatutBadge: React.FC<{ statut: string }> = ({ statut }) => {
  const { bg, text } = getDossierStatutStyle(statut);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 700, background: bg, color: text,
    }}>
      {statut}
    </span>
  );
};

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}
const Pagination: React.FC<PaginationProps> = ({ page, total, perPage, onChange }) => {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb', marginTop: 12 }}>
      <button
        onClick={() => onChange(page - 1)} disabled={page === 1}
        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: page === 1 ? '#e5e7eb' : '#d52b36', color: page === 1 ? '#9ca3af' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}
      >← Précédent</button>
      <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} / {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)} disabled={page >= totalPages}
        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: page >= totalPages ? '#e5e7eb' : '#d52b36', color: page >= totalPages ? '#9ca3af' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}
      >Suivant →</button>
    </div>
  );
};

// ─── Filter Row ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: 13, color: '#374151', background: 'white',
  outline: 'none', transition: 'border-color .15s',
};

const FilterRow: React.FC<{ children: React.ReactNode; onClear: () => void }> = ({ children, onClear }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
    {children}
    <button onClick={onClear} style={{ padding: '6px 14px', background: '#d52b36', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
      Effacer
    </button>
  </div>
);

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const ModalShell: React.FC<{ title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode; accentColor?: string }> = ({
  title, onClose, maxWidth = 480, children, accentColor = '#d52b36'
}) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `3px solid ${accentColor}` }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: accentColor }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: 24, flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  total: number;
  breakdown: Record<string, any>;
  gestionnaireBreakdown: Record<string, any>;
  accentColor?: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, total, breakdown, gestionnaireBreakdown, accentColor = '#d52b36' }) => (
  <div style={{ background: 'white', borderRadius: 10, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,.08)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>
      <span style={{ background: accentColor, color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{total}</span>
    </div>
    <div style={{ fontSize: 11, color: '#6b7280', maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.keys(breakdown).length > 0 && (
        <>
          <span style={{ fontWeight: 700, color: '#374151', marginBottom: 2 }}>Par client</span>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#374151', flexShrink: 0 }}>{String(v)}</span>
            </div>
          ))}
        </>
      )}
      {Object.keys(gestionnaireBreakdown).length > 0 && (
        <>
          <span style={{ fontWeight: 700, color: '#374151', marginTop: 6, marginBottom: 2 }}>Par gestionnaire</span>
          {Object.entries(gestionnaireBreakdown).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#374151', flexShrink: 0 }}>{String(v)}</span>
            </div>
          ))}
        </>
      )}
      {Object.keys(breakdown).length === 0 && Object.keys(gestionnaireBreakdown).length === 0 && (
        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aucune donnée</span>
      )}
    </div>
  </div>
);

// ─── Table ────────────────────────────────────────────────────────────────────

interface Column { key: string; label: string; width?: number | string; render?: (row: any) => React.ReactNode }
const DataTable: React.FC<{ columns: Column[]; rows: any[]; striped?: boolean }> = ({ columns, rows, striped = true }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {columns.map(c => (
            <th key={c.key} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', width: c.width, borderBottom: '2px solid #e5e7eb' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>Aucun résultat</td></tr>
        ) : rows.map((row, i) => (
          <tr key={row.id ?? i} style={{ background: striped && i % 2 !== 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #f3f4f6' }}>
            {columns.map(c => (
              <td key={c.key} style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                {c.render ? c.render(row) : row[c.key] ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const isReadOnly = useIsReadOnly();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  // FIX: use a ref to track whether a fetch is already in-flight
  // Prevents duplicate parallel requests on 30-s timer fires
  const fetchInFlight = useRef(false);
  const aiInFlight = useRef(false);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({ departmentId: '', fromDate: '', toDate: '', period: 'day' });

  // ── Super admin state ────────────────────────────────────────────────────────
  const [superAdminStats, setSuperAdminStats] = useState<any>({
    prestation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    adhesion:   { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    complement: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    reclamation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    avenant:    { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
  });
  const [superAdminGestionnaireAssignments, setSuperAdminGestionnaireAssignments]           = useState<any[]>([]);
  const [superAdminGestionnaireSeniorAssignments, setSuperAdminGestionnaireSeniorAssignments] = useState<any[]>([]);
  const [superAdminDerniersDossiers, setSuperAdminDerniersDossiers]                         = useState<any[]>([]);
  const [superAdminDossiersEnCours, setSuperAdminDossiersEnCours]                           = useState<any[]>([]);
  const [superAdminAllDossiers, setSuperAdminAllDossiers]                                   = useState<any[]>([]);
  const [superAdminDocumentsIndividuels, setSuperAdminDocumentsIndividuels]                 = useState<any[]>([]);

  // PDF modal
  const [showSuperAdminPDFModal, setShowSuperAdminPDFModal]   = useState(false);
  const [currentSuperAdminPDFUrl, setCurrentSuperAdminPDFUrl] = useState('');
  const [currentSuperAdminDossier, setCurrentSuperAdminDossier] = useState<any>(null);

  // Pagination
  const [superAdminDerniersPage, setSuperAdminDerniersPage]     = useState(1);
  const [superAdminBordereauxPage, setSuperAdminBordereauxPage] = useState(1);
  const [superAdminIndividuelsPage, setSuperAdminIndividuelsPage] = useState(1);

  // ── Chef équipe state ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<TableauBordStats>({
    totalDossiers: 0, clotures: 0, enCours: 0, nonAffectes: 0,
    progressBars: { clotures: 0, enCours: 0, nonAffectes: 0 },
  });
  const [typesDetail, setTypesDetail]                                     = useState<TypeDetail>({});
  const [derniersDossiers, setDerniersDossiers]                           = useState<Dossier[]>([]);
  const [dossiersEnCours, setDossiersEnCours]                             = useState<Dossier[]>([]);
  const [allGestionnaireAssignments, setAllGestionnaireAssignments]       = useState<any[]>([]);
  const [filteredGestionnaireAssignments, setFilteredGestionnaireAssignments] = useState<any[]>([]);
  const [gestionnaireFilter, setGestionnaireFilter]                       = useState('Tous');
  const [searchType, setSearchType]                                       = useState('Ref. GSD');
  const [searchQuery, setSearchQuery]                                     = useState('');
  const [typeFilter, setTypeFilter]                                       = useState('Tous types');

  // Modals
  const [modalOpen, setModalOpen]                   = useState(false);
  const [selectedDossier, setSelectedDossier]       = useState<any>(null);
  const [editModalOpen, setEditModalOpen]           = useState(false);
  const [selectedType, setSelectedType]             = useState('');
  const [pdfViewModalOpen, setPdfViewModalOpen]     = useState(false);
  const [statusModifyModalOpen, setStatusModifyModalOpen] = useState(false);
  const [newStatus, setNewStatus]                   = useState('');
  const [dossierDetails, setDossierDetails]         = useState<any>(null);
  const [loadingDossierDetails, setLoadingDossierDetails] = useState(false);

  // Explanation modals
  const [showAIExplanationModal, setShowAIExplanationModal]               = useState(false);
  const [showDepartmentExplanationModal, setShowDepartmentExplanationModal] = useState(false);

  // ── Per-table filters ────────────────────────────────────────────────────────
  const [filter1, setFilter1] = useState<Filter1>({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });
  const [filter2, setFilter2] = useState<Filter2>({ ref: '', client: '', statut: '', dateFrom: '', dateTo: '' });
  const [filter3, setFilter3] = useState<Filter3>({ ref: '', refBrdx: '', client: '', type: '', statut: '', gest: '', dateFrom: '', dateTo: '' });

  const [filteredDerniers, setFilteredDerniers]       = useState<any[]>([]);
  const [filteredEnCours, setFilteredEnCours]         = useState<any[]>([]);
  const [filteredIndividuels, setFilteredIndividuels] = useState<any[]>([]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const allUniqueStatuts = React.useMemo(() => {
    const all = [
      ...derniersDossiers.map((d: any) => d.statut),
      ...superAdminDossiersEnCours.map((d: any) => d.statut),
      ...superAdminDocumentsIndividuels.map((d: any) => d.statut),
    ].filter(Boolean);
    return [...new Set(all)].sort();
  }, [derniersDossiers, superAdminDossiersEnCours, superAdminDocumentsIndividuels]);

  // ── Apply per-table filters ───────────────────────────────────────────────────
  useEffect(() => {
    const inDate = (d: string, from: string, to: string) => {
      if (!d) return true;
      const t = new Date(d).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to   && t > new Date(to).getTime())   return false;
      return true;
    };

    setFilteredDerniers(derniersDossiers.filter(d =>
      (!filter1.ref    || d.reference?.toLowerCase().includes(filter1.ref.toLowerCase())) &&
      (!filter1.client || d.client?.toLowerCase().includes(filter1.client.toLowerCase())) &&
      (!filter1.type   || d.type === filter1.type) &&
      (!filter1.statut || d.statut === filter1.statut) &&
      inDate(d.date, filter1.dateFrom, filter1.dateTo)
    ));

    setFilteredEnCours(superAdminDossiersEnCours.filter(d =>
      (!filter2.ref    || d.reference?.toLowerCase().includes(filter2.ref.toLowerCase())) &&
      (!filter2.client || d.client?.toLowerCase().includes(filter2.client.toLowerCase())) &&
      (!filter2.statut || d.statut === filter2.statut) &&
      inDate(d.date, filter2.dateFrom, filter2.dateTo)
    ));

    setFilteredIndividuels(superAdminDocumentsIndividuels.filter(d =>
      (!filter3.ref    || d.reference?.toLowerCase().includes(filter3.ref.toLowerCase())) &&
      (!filter3.refBrdx || d.bordereauReference?.toLowerCase().includes(filter3.refBrdx.toLowerCase())) &&
      (!filter3.client || d.client?.toLowerCase().includes(filter3.client.toLowerCase())) &&
      (!filter3.type   || d.type === filter3.type) &&
      (!filter3.statut || d.statut === filter3.statut) &&
      (!filter3.gest   || d.gestionnaire?.toLowerCase().includes(filter3.gest.toLowerCase())) &&
      inDate(d.uploadedAt || d.date, filter3.dateFrom, filter3.dateTo)
    ));
  }, [derniersDossiers, superAdminDossiersEnCours, superAdminDocumentsIndividuels, filter1, filter2, filter3]);

  // ── Dossier details ───────────────────────────────────────────────────────────
  const fetchDossierDetails = useCallback(async (dossierId: string) => {
    try {
      setLoadingDossierDetails(true);
      const res = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier/${dossierId}`);
      if (res.data) setDossierDetails(res.data);
    } catch (e) {
      console.error('Error fetching dossier details:', e);
    } finally {
      setLoadingDossierDetails(false);
    }
  }, []);

  // ── Document PDF ──────────────────────────────────────────────────────────────
  const handleDocumentPDFView = useCallback(async (documentId: string, documentName: string) => {
    try {
      const res = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${documentId}`);
      if (res.data.success && res.data.pdfUrl) {
        const base = process.env.REACT_APP_API_URL?.replace('/api', '') ?? window.location.origin;
        let url = res.data.pdfUrl;
        const idx = url.indexOf('/uploads/');
        if (idx !== -1) url = url.substring(idx);
        else {
          url = url.replace('/api/bordereaux/chef-equipe/tableau-bord/serve-pdf/', '');
          url = url.replace('/serve-pdf/', '');
          if (!url.startsWith('/')) url = '/' + url;
        }
        window.open(`${base}${url.replace(/\/\/+/g, '/')}`, '_blank');
      } else {
        alert(res.data.error ?? `PDF non disponible : ${documentName}`);
      }
    } catch {
      alert(`Erreur ouverture PDF : ${documentName}`);
    }
  }, []);

  // ── Chef équipe helpers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/search', { params: { type: searchType, query: searchQuery } });
      setDerniersDossiers(res.data);
    } catch {
      alert('Erreur lors de la recherche');
    }
  }, [searchQuery, searchType]);

  const handleTypeFilterChange = useCallback(async (newType: string) => {
    setTypeFilter(newType);
    try {
      const res = await LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours', { params: { type: newType } });
      setDossiersEnCours(res.data);
    } catch {
      console.error('Filter error');
    }
  }, []);

  const handleVoirDossier = useCallback(async (dossier: Dossier) => {
    try {
      const res = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${dossier.id}`);
      if (res.data.success && res.data.pdfUrl) {
        const base = process.env.REACT_APP_API_URL?.replace('/api', '') ?? window.location.origin;
        window.open(`${base}${res.data.pdfUrl}`, '_blank');
      } else {
        alert(res.data.error ?? 'PDF non disponible');
      }
    } catch {
      alert('Erreur ouverture PDF');
    }
  }, []);

  const handleGestionnaireFilterChange = useCallback((value: string) => {
    setGestionnaireFilter(value);
    setFilteredGestionnaireAssignments(
      value === 'Tous' ? allGestionnaireAssignments
        : allGestionnaireAssignments.filter(a => a.gestionnaire === value)
    );
  }, [allGestionnaireAssignments]);

  const handleModifyDossierStatus = useCallback(async () => {
    if (!selectedDossier || !newStatus) return;
    try {
      const res = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', { dossierId: selectedDossier.id, newStatus });
      if (res.data.success) {
        alert('Statut modifié avec succès');
        setStatusModifyModalOpen(false);
        setNewStatus('');
        window.location.reload();
      }
    } catch {
      alert('Erreur modification du statut');
    }
  }, [selectedDossier, newStatus]);

  const handleTelechargerDossier = useCallback(async (dossier: any) => {
    try {
      const info = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/download-info/${dossier.id}`);
      if (info.data.success) {
        const msg = `Télécharger ${info.data.reference} ?\nClient: ${info.data.client}\nDocuments: ${info.data.summary.totalDocuments} • Taille: ${info.data.summary.estimatedSize}`;
        if (!window.confirm(msg)) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`${LocalAPI.defaults.baseURL}/bordereaux/chef-equipe/tableau-bord/download/${dossier.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `Dossier_${info.data.reference}_${new Date().toISOString().split('T')[0]}.zip`,
          });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      alert('Erreur téléchargement');
    }
  }, []);

  const handleExportDossiersEnCours = useCallback(async () => {
    const suffix = typeFilter !== 'Tous types' ? `?type=${encodeURIComponent(typeFilter)}` : '';
    if (!window.confirm(`Exporter les dossiers en cours${typeFilter !== 'Tous types' ? ` (${typeFilter})` : ''} vers Excel ?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${LocalAPI.defaults.baseURL}/bordereaux/chef-equipe/tableau-bord/export-dossiers-en-cours${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const label = typeFilter !== 'Tous types' ? typeFilter.replace(' ', '_') + '_' : '';
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `Dossiers_En_Cours_${label}${new Date().toISOString().split('T')[0]}.xlsx`,
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      alert('Export lancé !');
    } catch {
      alert("Erreur export Excel");
    }
  }, [typeFilter]);

  // ── Fetch ALL Chef équipe + Super admin data in ONE parallel batch ─────────────
  // FIX: previously this was two sequential phases:
  //   loadChefEquipeData() -> 5 calls (awaited)
  //   then fetchSuperAdminData() -> 6 more calls, 4 of which duplicated the first batch
  // That was 11 total network calls (4 wasted) split across two sequential round-trips.
  // Now: a single Promise.all with the 7 distinct endpoints needed, fired together.
  const fetchSuperAdminData = useCallback(async () => {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(user?.role ?? '')) return;
    try {
      const [
        statsRes,        // tableau-bord/stats
        typesRes,        // tableau-bord/types-detail
        derniersRes,     // tableau-bord/derniers-dossiers
        enCoursRes,      // tableau-bord/dossiers-en-cours
        assignmentsRes,  // gestionnaire-assignments-dossiers
        seniorRes,       // tableau-bord/gestionnaire-senior-assignments
        individuelsRes,  // tableau-bord/documents-individuels
      ] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/stats?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/derniers-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/documents-individuels?superAdmin=true'),
      ]);

      // ── Chef équipe state (previously set inside loadChefEquipeData) ──
      setStats(statsRes.data);
      setTypesDetail(typesRes.data);
      setDerniersDossiers(derniersRes.data);
      setDossiersEnCours(enCoursRes.data);
      setAllGestionnaireAssignments(assignmentsRes.data ?? []);
      setFilteredGestionnaireAssignments(assignmentsRes.data ?? []);

      // ── Super admin state (previously set inside fetchSuperAdminData) ──
      if (typesRes.data) {
        setSuperAdminStats({
          prestation:  { total: typesRes.data.Prestation?.total ?? 0,           breakdown: typesRes.data.Prestation?.clientBreakdown ?? {},           gestionnaireBreakdown: typesRes.data.Prestation?.gestionnaireBreakdown ?? {} },
          adhesion:    { total: typesRes.data['Adhésion']?.total ?? 0,          breakdown: typesRes.data['Adhésion']?.clientBreakdown ?? {},           gestionnaireBreakdown: typesRes.data['Adhésion']?.gestionnaireBreakdown ?? {} },
          complement:  { total: typesRes.data['Complément Dossier']?.total ?? 0, breakdown: typesRes.data['Complément Dossier']?.clientBreakdown ?? {}, gestionnaireBreakdown: typesRes.data['Complément Dossier']?.gestionnaireBreakdown ?? {} },
          resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
          reclamation: { total: typesRes.data['Réclamation']?.total ?? 0,       breakdown: typesRes.data['Réclamation']?.clientBreakdown ?? {},        gestionnaireBreakdown: typesRes.data['Réclamation']?.gestionnaireBreakdown ?? {} },
          avenant:     { total: typesRes.data.Avenant?.total ?? 0,              breakdown: typesRes.data.Avenant?.clientBreakdown ?? {},               gestionnaireBreakdown: typesRes.data.Avenant?.gestionnaireBreakdown ?? {} },
        });
      }

      if (derniersRes.data) {
        setSuperAdminDerniersDossiers(derniersRes.data);
        setSuperAdminAllDossiers(derniersRes.data);
      }
      setSuperAdminGestionnaireAssignments(assignmentsRes.data ?? []);
      setSuperAdminGestionnaireSeniorAssignments(seniorRes.data ?? []);
      setSuperAdminDossiersEnCours(enCoursRes.data ?? []);
      setSuperAdminDocumentsIndividuels(individuelsRes.data ?? []);
    } catch (e) {
      console.error('Error loading Super Admin data:', e);
    }
  }, [user?.role]);

  // Kept for the few call sites that still want to refresh chef-équipe-only data
  // (e.g. after editing a doc type). Delegates to the same merged fetch so there's
  // still only one code path and no stale/duplicate requests.
  const loadChefEquipeData = useCallback(async () => {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(user?.role ?? '')) return;
    await fetchSuperAdminData();
  }, [user?.role, fetchSuperAdminData]);

  // ── Fetch dashboard data ───────────────────────────────────────────────────────
  // FIX: guard with fetchInFlight ref so concurrent calls collapse into one
  const fetchDashboardData = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      setError(null);
      if (!hasDashboardAccess(user?.role)) {
        setError('Accès non autorisé au tableau de bord pour votre rôle');
        return;
      }

      // Super admin batch (7 calls, single Promise.all) + the role-based dashboard
      // batch below now all fire together rather than super-admin awaiting first.
      const superAdminPromise = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(user?.role ?? '')
        ? fetchSuperAdminData()
        : Promise.resolve();

      const [dashRes, deptRes, docStatsRes, docStatusRes] = await Promise.all([
        LocalAPI.get('/dashboard/role-based', { params: filters, timeout: 300_000 }),
        LocalAPI.get('/super-admin/departments').catch(() => ({ data: [] })),
        LocalAPI.get('/dashboard/documents/all-types', { params: filters }).catch(() => ({ data: {} })),
        LocalAPI.get('/dashboard/documents/status-breakdown', { params: filters }).catch(() => ({ data: {} })),
        superAdminPromise,
      ]);

      const ds = docStatsRes.data ?? {};
      const ss = docStatusRes.data ?? {};
      const emptyBreakdown = { enCours: 0, traites: 0, nonAffectes: 0 };

      setDashboardData({
        ...dashRes.data,
        documentStats: {
          bulletinSoin:   ds.BULLETIN_SOIN        ?? 0,
          complementInfo: ds.COMPLEMENT_INFORMATION ?? 0,
          adhesions:      ds.ADHESION              ?? 0,
          reclamations:   ds.RECLAMATION           ?? 0,
          contrats:       ds.CONTRAT_AVENANT       ?? 0,
          resiliations:   ds.DEMANDE_RESILIATION   ?? 0,
          conventions:    ds.CONVENTION_TIERS_PAYANT ?? 0,
          bulletin_soinStatusBreakdown:             ss.BULLETIN_SOIN            ?? emptyBreakdown,
          complement_informationStatusBreakdown:    ss.COMPLEMENT_INFORMATION   ?? emptyBreakdown,
          adhesionStatusBreakdown:                  ss.ADHESION                 ?? emptyBreakdown,
          reclamationStatusBreakdown:               ss.RECLAMATION              ?? emptyBreakdown,
          contrat_avenantStatusBreakdown:           ss.CONTRAT_AVENANT          ?? emptyBreakdown,
          demande_resiliationStatusBreakdown:       ss.DEMANDE_RESILIATION      ?? emptyBreakdown,
          convention_tiers_payantStatusBreakdown:   ss.CONVENTION_TIERS_PAYANT  ?? emptyBreakdown,
        },
      });
      setDepartments(deptRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message ?? 'Erreur de connexion — vérifiez votre connexion réseau');
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
    }
  }, [filters, user?.role, fetchSuperAdminData]);

  // ── Fetch AI insights ──────────────────────────────────────────────────────────
  // FIX: guard with aiInFlight ref
  const fetchAIInsights = useCallback(async () => {
    if (!dashboardData?.kpis || aiInFlight.current) return;
    aiInFlight.current = true;
    try {
      const isReady = await aiService.ensureReady();
      if (!isReady) throw new Error('Authentication failed');

      const healthCheck = await aiService.healthCheck();
      let recommendations = { recommendations: [] };

      if (healthCheck.status === 'healthy') {
        try {
          const [bordereauxRes, agentsRes] = await Promise.all([
            LocalAPI.get('/bordereaux', { params: { excludeArchived: true, excludeClosed: true, limit: 1000 } }),
            LocalAPI.get('/users/gestionnaires'),
          ]);
          const allBordereaux = bordereauxRes.data.bordereaux ?? bordereauxRes.data ?? [];
          const agents        = agentsRes.data ?? [];
          recommendations = await aiService.getRecommendations({
            bordereaux: allBordereaux, agents,
            workload: dashboardData.performance?.performance ?? [],
            currentWorkload: allBordereaux.length, staff_count: agents.length,
          });
        } catch (e) {
          console.warn('AI recommendations unavailable:', e);
        }
      }

      setAiInsights({ health: healthCheck, recommendations: recommendations?.recommendations ?? [], lastUpdated: new Date() });
    } catch (e) {
      setAiInsights({ health: { status: 'unavailable', message: 'Service inaccessible' }, recommendations: [], lastUpdated: new Date() });
    } finally {
      aiInFlight.current = false;
    }
  }, [dashboardData]);

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchDashboardData();

    const handlePDFModal = (ev: any) => {
      const { pdfUrl, document: doc } = ev.detail;
      const base = process.env.REACT_APP_API_URL?.replace('/api', '') ?? window.location.origin;
      setCurrentSuperAdminPDFUrl(`${base}${pdfUrl}`);
      setCurrentSuperAdminDossier(doc);
      setShowSuperAdminPDFModal(true);
    };
    window.addEventListener('openPDFModal', handlePDFModal);
    return () => window.removeEventListener('openPDFModal', handlePDFModal);
  }, [fetchDashboardData]);

  // AI insights after dashboard data arrives
  useEffect(() => {
    if (dashboardData) fetchAIInsights();
  }, [fetchAIInsights, dashboardData]);

  // Auto-refresh
  useEffect(() => {
    if (!realTimeEnabled) return;
    const id = setInterval(() => {
      fetchDashboardData();
      if (aiInsights?.health?.status === 'unavailable') fetchAIInsights();
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchDashboardData, realTimeEnabled, aiInsights, fetchAIInsights]);

  // ── Filter change helpers ─────────────────────────────────────────────────────
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Super admin actions ───────────────────────────────────────────────────────
  const handleSuperAdminViewPDF = useCallback(async (dossierId: string) => {
    try {
      const res = await LocalAPI.get(`/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${dossierId}`);
      if (res.data.success && res.data.pdfUrl) {
        const dossier = [...superAdminDerniersDossiers, ...superAdminDossiersEnCours, ...superAdminAllDossiers].find(d => d.id === dossierId);
        const base = process.env.REACT_APP_API_URL?.replace('/api', '') ?? window.location.origin;
        setCurrentSuperAdminPDFUrl(`${base}${res.data.pdfUrl}`);
        setCurrentSuperAdminDossier(dossier);
        setShowSuperAdminPDFModal(true);
      } else {
        alert(res.data.error ?? 'PDF non disponible');
      }
    } catch {
      alert('Erreur ouverture PDF');
    }
  }, [superAdminDerniersDossiers, superAdminDossiersEnCours, superAdminAllDossiers]);

  const closeSuperAdminPDFModal = useCallback(() => {
    setShowSuperAdminPDFModal(false);
    setCurrentSuperAdminPDFUrl('');
    setCurrentSuperAdminDossier(null);
  }, []);

  const handleSuperAdminStatusChangeInModal = useCallback(async (status: string) => {
    if (!currentSuperAdminDossier) return;
    try {
      const res = await LocalAPI.post('/bordereaux/chef-equipe/tableau-bord/modify-dossier-status', { dossierId: currentSuperAdminDossier.id, newStatus: status });
      if (res.data.success) { alert('Statut modifié'); fetchDashboardData(); closeSuperAdminPDFModal(); }
      else alert('Erreur modification');
    } catch { alert('Erreur modification'); }
  }, [currentSuperAdminDossier, fetchDashboardData, closeSuperAdminPDFModal]);

  const handleSuperAdminModifyStatus = useCallback((dossier: any) => {
    setSelectedDossier({ ...dossier, isDocument: false });
    setNewStatus('');
    setStatusModifyModalOpen(true);
  }, []);

  const handleSuperAdminExport = useCallback(() => {
    const rows = [
      ['Type','Total','Client Breakdown','Gestionnaire Breakdown'],
      ...(['prestation','adhesion','complement','resiliation','reclamation','avenant'] as const).map(k => [
        k, superAdminStats[k]?.total ?? 0,
        JSON.stringify(superAdminStats[k]?.breakdown ?? {}),
        JSON.stringify(superAdminStats[k]?.gestionnaireBreakdown ?? {}),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `dashboard-super-admin-${new Date().toISOString().split('T')[0]}.csv` });
    a.click(); URL.revokeObjectURL(url);
  }, [superAdminStats]);

  const handleSuperAdminTransfer = useCallback(async (type: string) => {
    try {
      const res = await LocalAPI.post('/bordereaux/super-admin/transfer-documents', { targetType: type });
      if (res.data.success) { alert(`Transfert : ${res.data.transferred} doc(s) → ${type}`); fetchDashboardData(); }
      else alert('Erreur transfert');
    } catch { alert('Erreur transfert'); }
  }, [fetchDashboardData]);

  const exportData = useCallback(async (format: 'excel' | 'pdf' = 'excel') => {
    try {
      const res = await LocalAPI.get('/analytics/export', { params: { ...filters, format }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = Object.assign(document.createElement('a'), { href: url });
      a.setAttribute('download', `dashboard_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) {
      alert(`Erreur export : ${e.response?.data?.message ?? e.message}`);
    }
  }, [filters]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const renderSuperAdminContent = () => (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f4f6fb', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #c0392b 0%, #d52b36 60%, #e74c3c 100%)', color: 'white', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>
            {isReadOnly ? '👁️ Dashboard Responsable Département' : '⚡ Dashboard Super Admin'}
          </h1>
          {isReadOnly && <p style={{ margin: '6px 0 0', fontSize: 13, opacity: .85, fontWeight: 500 }}>Mode lecture seule — accès complet en consultation</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setRealTimeEnabled(p => !p)}
            title={realTimeEnabled ? 'Désactiver l\'actualisation auto' : 'Activer l\'actualisation auto'}
            style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid rgba(255,255,255,.5)', background: realTimeEnabled ? 'rgba(255,255,255,.2)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {realTimeEnabled ? '⏸ Auto' : '▶ Auto'}
          </button>
          <span style={{ fontSize: 12, opacity: .7 }}>Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Stat Cards ── */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <StatCard label="Prestation"          total={superAdminStats.prestation?.total  ?? 0} breakdown={superAdminStats.prestation?.breakdown  ?? {}} gestionnaireBreakdown={superAdminStats.prestation?.gestionnaireBreakdown  ?? {}} />
            <StatCard label="Adhésion"            total={superAdminStats.adhesion?.total    ?? 0} breakdown={superAdminStats.adhesion?.breakdown    ?? {}} gestionnaireBreakdown={superAdminStats.adhesion?.gestionnaireBreakdown    ?? {}} />
            <StatCard label="Complément Dossier"  total={superAdminStats.complement?.total  ?? 0} breakdown={superAdminStats.complement?.breakdown  ?? {}} gestionnaireBreakdown={superAdminStats.complement?.gestionnaireBreakdown  ?? {}} accentColor="#2196f3" />
            <StatCard label="Résiliation"         total={superAdminStats.resiliation?.total ?? 0} breakdown={superAdminStats.resiliation?.breakdown ?? {}} gestionnaireBreakdown={superAdminStats.resiliation?.gestionnaireBreakdown ?? {}} />
            <StatCard label="Réclamation"         total={superAdminStats.reclamation?.total ?? 0} breakdown={superAdminStats.reclamation?.breakdown ?? {}} gestionnaireBreakdown={superAdminStats.reclamation?.gestionnaireBreakdown ?? {}} />
            <StatCard label="Avenant"             total={superAdminStats.avenant?.total     ?? 0} breakdown={superAdminStats.avenant?.breakdown     ?? {}} gestionnaireBreakdown={superAdminStats.avenant?.gestionnaireBreakdown     ?? {}} />
          </div>
        </section>

        {/* ── Affectations par gestionnaire ── */}
        <section style={{ background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle>Affectations par Gestionnaire</SectionTitle>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{superAdminGestionnaireAssignments.length} gestionnaire(s)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {superAdminGestionnaireAssignments.map((a, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', border: '1px solid #e5e7eb', opacity: a.totalAssigned === 0 ? .65 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{a.gestionnaire}</span>
                  {a.totalAssigned === 0 && <span style={{ fontSize: 11, background: '#e5e7eb', color: '#6b7280', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>Disponible</span>}
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Row label="Total affectés" value={a.totalAssigned} />
                  <Row label="✓ Traités"      value={a.traites   ?? 0} color="#16a34a" />
                  <Row label="⏳ En cours"    value={a.enCours   ?? 0} color="#d97706" />
                  <Row label="↩ Retournés"    value={a.retournes ?? 0} color="#dc2626" />
                </div>
                {Object.keys(a.documentsByType ?? {}).length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                    {Object.entries(a.documentsByType ?? {}).map(([t, c]) => `${t}: ${c}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {superAdminGestionnaireAssignments.length === 0 && <EmptyState>Aucun gestionnaire</EmptyState>}
          </div>
        </section>

        {/* ── Gestionnaires Senior ── */}
        <section style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '2px solid #86efac', boxShadow: '0 1px 6px rgba(34,197,94,.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle color="#15803d">⭐ Gestionnaires Senior</SectionTitle>
            <span style={{ background: '#22c55e', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
              {superAdminGestionnaireSeniorAssignments.length} Senior(s)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {superAdminGestionnaireSeniorAssignments.map((a, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '2px solid #86efac', boxShadow: '0 1px 6px rgba(34,197,94,.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>👤</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#15803d' }}>{a.gestionnaire}</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Row label="Total affectés" value={a.totalAssigned} />
                    {(a.reassignedCount ?? 0) > 0 && (
                      <span style={{ background: '#1d4ed8', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        +{a.reassignedCount} 🔄
                      </span>
                    )}
                  </div>
                  <Row label="✓ Traités"   value={a.traites   ?? 0} color="#16a34a" />
                  <Row label="⏳ En cours" value={a.enCours   ?? 0} color="#d97706" />
                  <div>
                    <Row label="↩ Retournés" value={a.retournes ?? 0} color="#dc2626" />
                    {a.returnedBy && (a.retournes ?? 0) > 0 && (
                      <div style={{ marginLeft: 16, marginTop: 3, fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                        → Retourné par : {a.returnedBy}
                      </div>
                    )}
                  </div>
                </div>
                {Object.keys(a.documentsByType ?? {}).length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#15803d', background: '#f0fdf4', padding: '4px 8px', borderRadius: 4 }}>
                    {Object.entries(a.documentsByType ?? {}).map(([t, c]) => `${t}: ${c}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {superAdminGestionnaireSeniorAssignments.length === 0 && <EmptyState>Aucun gestionnaire senior</EmptyState>}
          </div>
        </section>

        {/* ── Tous les bordereaux ── */}
        <section style={{ background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle style={{ marginBottom: 14 }}>Tous les Bordereaux (triés par récents)</SectionTitle>
          <FilterRow onClear={() => { setFilter1({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' }); setSuperAdminDerniersPage(1); }}>
            <input style={{ ...inputStyle, width: 130 }} placeholder="Référence" value={filter1.ref}      onChange={e => setFilter1(p => ({ ...p, ref:      e.target.value }))} />
            <input style={{ ...inputStyle, width: 130 }} placeholder="Client"    value={filter1.client}   onChange={e => setFilter1(p => ({ ...p, client:   e.target.value }))} />
            <select style={{ ...inputStyle, width: 120 }} value={filter1.type}   onChange={e => setFilter1(p => ({ ...p, type:   e.target.value }))}>
              <option value="">Type</option>
              <option>Prestation</option><option>Adhésion</option>
            </select>
            <select style={{ ...inputStyle, width: 120 }} value={filter1.statut} onChange={e => setFilter1(p => ({ ...p, statut: e.target.value }))}>
              <option value="">Statut</option>
              {allUniqueStatuts.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter1.dateFrom} onChange={e => setFilter1(p => ({ ...p, dateFrom: e.target.value }))} />
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter1.dateTo}   onChange={e => setFilter1(p => ({ ...p, dateTo:   e.target.value }))} />
          </FilterRow>
          <DataTable
            columns={[
              { key: 'reference',  label: 'Référence',         render: r => <span style={{ fontWeight: 700, color: '#2563eb' }}>{r.reference}</span> },
              { key: 'client',     label: 'Client' },
              { key: 'type',       label: 'Type',              render: r => r.type === 'Aucun document' ? 'Prestation' : r.type },
              { key: 'completion', label: '% Finalisation',    render: r => <ProgressBar pct={r.statut === 'Traité' ? 100 : r.completionPercentage ?? 0} /> },
              { key: 'statut',     label: 'Statut',            render: r => <DossierStatutBadge statut={r.statut} /> },
              { key: 'date',       label: 'Date réception' },
            ]}
            rows={filteredDerniers.slice((superAdminDerniersPage - 1) * ITEMS_PER_PAGE, superAdminDerniersPage * ITEMS_PER_PAGE)}
          />
          <Pagination page={superAdminDerniersPage} total={filteredDerniers.length} perPage={ITEMS_PER_PAGE} onChange={setSuperAdminDerniersPage} />
        </section>

        {/* ── Bordereaux en cours ── */}
        <section style={{ background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle style={{ marginBottom: 14 }}>Bordereaux ({superAdminDossiersEnCours.length} total)</SectionTitle>
          <FilterRow onClear={() => { setFilter2({ ref: '', client: '', statut: '', dateFrom: '', dateTo: '' }); setSuperAdminBordereauxPage(1); }}>
            <input style={{ ...inputStyle, width: 130 }} placeholder="Référence" value={filter2.ref}      onChange={e => setFilter2(p => ({ ...p, ref:      e.target.value }))} />
            <input style={{ ...inputStyle, width: 130 }} placeholder="Client"    value={filter2.client}   onChange={e => setFilter2(p => ({ ...p, client:   e.target.value }))} />
            <select style={{ ...inputStyle, width: 120 }} value={filter2.statut} onChange={e => setFilter2(p => ({ ...p, statut: e.target.value }))}>
              <option value="">Statut</option>
              {allUniqueStatuts.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter2.dateFrom} onChange={e => setFilter2(p => ({ ...p, dateFrom: e.target.value }))} />
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter2.dateTo}   onChange={e => setFilter2(p => ({ ...p, dateTo:   e.target.value }))} />
          </FilterRow>
          <DataTable
            columns={[
              { key: 'reference',  label: 'Référence',      render: r => <span style={{ fontWeight: 700, color: '#2563eb' }}>{r.reference}</span> },
              { key: 'client',     label: 'Client' },
              { key: 'statut',     label: 'Statut',         render: r => <DossierStatutBadge statut={r.statut} /> },
              { key: 'completion', label: '% Finalisation', render: r => <ProgressBar pct={r.completionPercentage ?? 0} /> },
              { key: 'etats',      label: 'États Dossiers', render: r => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(r.dossierStates ?? [r.statut]).map((s: string, i: number) => <DossierStatutBadge key={i} statut={s} />)}
                </div>
              )},
            ]}
            rows={filteredEnCours.slice((superAdminBordereauxPage - 1) * ITEMS_PER_PAGE, superAdminBordereauxPage * ITEMS_PER_PAGE)}
          />
          <Pagination page={superAdminBordereauxPage} total={filteredEnCours.length} perPage={ITEMS_PER_PAGE} onChange={setSuperAdminBordereauxPage} />
        </section>

        {/* ── Dossiers individuels ── */}
        <section style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)', marginBottom: 20 }}>
          <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <SectionTitle>Dossiers Individuels</SectionTitle>
              <span style={{ fontSize: 13, color: '#6b7280' }}>({superAdminDocumentsIndividuels.length})</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af' }}>Affichage par dossier (non par bordereau)</p>
            <FilterRow onClear={() => { setFilter3({ ref: '', refBrdx: '', client: '', type: '', statut: '', gest: '', dateFrom: '', dateTo: '' }); setSuperAdminIndividuelsPage(1); }}>
              <input style={{ ...inputStyle, width: 120 }} placeholder="Réf. Dossier"    value={filter3.ref}    onChange={e => setFilter3(p => ({ ...p, ref:    e.target.value }))} />
              <input style={{ ...inputStyle, width: 120 }} placeholder="Réf. Bordereau"  value={filter3.refBrdx} onChange={e => setFilter3(p => ({ ...p, refBrdx: e.target.value }))} />
              <input style={{ ...inputStyle, width: 110 }} placeholder="Client"          value={filter3.client}  onChange={e => setFilter3(p => ({ ...p, client:  e.target.value }))} />
              <select style={{ ...inputStyle, width: 110 }} value={filter3.type}   onChange={e => setFilter3(p => ({ ...p, type:   e.target.value }))}>
                <option value="">Type</option>
                <option>Prestation</option><option>Adhésion</option>
              </select>
              <select style={{ ...inputStyle, width: 110 }} value={filter3.statut} onChange={e => setFilter3(p => ({ ...p, statut: e.target.value }))}>
                <option value="">Statut</option>
                {allUniqueStatuts.map(s => <option key={s}>{s}</option>)}
              </select>
              <input style={{ ...inputStyle, width: 120 }} placeholder="Gestionnaire"    value={filter3.gest}    onChange={e => setFilter3(p => ({ ...p, gest:    e.target.value }))} />
              <input type="date" style={{ ...inputStyle, width: 120 }} value={filter3.dateFrom} onChange={e => setFilter3(p => ({ ...p, dateFrom: e.target.value }))} />
              <input type="date" style={{ ...inputStyle, width: 120 }} value={filter3.dateTo}   onChange={e => setFilter3(p => ({ ...p, dateTo:   e.target.value }))} />
            </FilterRow>
          </div>
          <DataTable
            columns={[
              { key: 'reference',         label: 'Réf. Dossier',   render: r => <span style={{ fontWeight: 600 }}>{r.reference}</span> },
              { key: 'bordereauReference',label: 'Réf. Bordereau' },
              { key: 'client',            label: 'Client' },
              { key: 'type',              label: 'Type' },
              { key: 'statut',            label: 'Statut',          render: r => <DossierStatutBadge statut={r.statut} /> },
              { key: 'gestionnaire',      label: 'Gestionnaire',    render: r => r.gestionnaire ?? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Non assigné</span> },
              { key: 'date',              label: 'Date' },
              { key: 'actions',           label: 'Actions',         render: r => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <ActionBtn color="#2563eb" onClick={() => handleSuperAdminViewPDF(r.id)}>PDF</ActionBtn>
                  {!isReadOnly && <ActionBtn color="#d97706" onClick={() => handleSuperAdminModifyStatus({ ...r, isDocument: true })}>Statut</ActionBtn>}
                </div>
              )},
            ]}
            rows={filteredIndividuels.slice((superAdminIndividuelsPage - 1) * INDIVIDUEL_PER_PAGE, superAdminIndividuelsPage * INDIVIDUEL_PER_PAGE)}
          />
          <div style={{ padding: '0 24px 16px' }}>
            <Pagination page={superAdminIndividuelsPage} total={filteredIndividuels.length} perPage={INDIVIDUEL_PER_PAGE} onChange={setSuperAdminIndividuelsPage} />
          </div>
        </section>

      </div>
    </div>
  );

  const renderRoleSpecificContent = () => {
    if (!dashboardData) return null;
    switch (dashboardData.role) {
      case 'SUPER_ADMIN':
      case 'ADMINISTRATEUR':
      case 'RESPONSABLE_DEPARTEMENT':
        return (
          <div style={{ marginTop: '2rem' }}>
            {/* Department Stats */}
            <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', border: '1px solid #e0e7ff', borderRadius: '10px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: '3px', height: '16px', backgroundColor: '#3b82f6', marginRight: '0.625rem', borderRadius: '2px' }}></div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statistiques par Département</h3>
                <button onClick={() => setShowDepartmentExplanationModal(true)} title="Comment fonctionnent ces statistiques ?" style={{ cursor: 'pointer', background: '#2196f3', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', marginLeft: '8px', border: 'none' }}>?</button>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
                  {(dashboardData.departmentStats ?? []).reduce((s: number, d: any) => s + (d.count ?? 0), 0)} dossiers total
                </span>
              </div>
              {/* Status legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem', paddingBottom: '0.625rem', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  { key: 'EN_COURS' }, { key: 'A_AFFECTER' }, { key: 'A_SCANNER' },
                  { key: 'TRAITE' }, { key: 'VIREMENT_EXECUTE' }, { key: 'ASSIGNE' }, { key: 'CLOTURE' },
                ].filter(s => (dashboardData.departmentStats ?? []).some((d: any) => d.status === s.key)).map(s => (
                  <StatusBadge key={s.key} status={s.key} small />
                ))}
              </div>
              {/* Dept rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {Object.entries(
                  (dashboardData.departmentStats ?? []).reduce((acc: Record<string, any[]>, dept: any) => {
                    if (!acc[dept.department]) acc[dept.department] = [];
                    acc[dept.department].push(dept);
                    return acc;
                  }, {})
                ).map(([name, items]: [string, any[]]) => {
                  const total = items.reduce((s: number, d: any) => s + (d.count ?? 0), 0);
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '7px', backgroundColor: '#f8faff', border: '1px solid #e8eef8' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.78rem' }}>{name.charAt(0)}</span>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#374151', minWidth: 108, flexShrink: 0 }}>{name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', background: '#e5e7eb', padding: '0.1rem 0.45rem', borderRadius: 10, flexShrink: 0 }}>{total}</span>
                      <div style={{ width: 1, height: 16, background: '#d1d5db', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', flex: 1 }}>
                        {items.map((item: any, i: number) => {
                          const { bg, text } = getStatusStyle(item.status);
                          return (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.18rem 0.5rem', borderRadius: 5, background: bg, fontSize: '0.72rem' }}>
                              <span style={{ fontWeight: 700, color: text }}>{item.count}</span>
                              <span style={{ color: text, opacity: .75, fontWeight: 500 }}>{item.status}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Clients */}
            <div style={{ padding: '1rem 1.25rem', border: '1px solid #e0e7ff', borderRadius: '10px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: 3, height: 16, backgroundColor: '#8b5cf6', marginRight: '0.625rem', borderRadius: 2 }}></div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Clients</h3>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>{(dashboardData.clientStats ?? []).length} clients</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {dashboardData.clientStats?.map((client: any, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.45rem 0.75rem', borderRadius: 7, backgroundColor: index % 2 === 0 ? '#f8faff' : '#faf8ff', border: '1px solid #ece8fd' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['#7c3aed','#8b5cf6','#a78bfa','#c4b5fd'][Math.min(index,3)], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.78rem' }}>{client.name.charAt(0)}</span>
                      </div>
                      {index < 3 && (
                        <span style={{ position: 'absolute', top: -4, right: -4, width: 13, height: 13, borderRadius: '50%', background: ['#f59e0b','#94a3b8','#b45309'][index], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 800, border: '1px solid white' }}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={client.name}>{client.name}</span>
                    <div style={{ width: 80, textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ background: '#d1fae5', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', padding: '0.15rem 0.55rem', borderRadius: 10 }}>{client._count.bordereaux}</span>
                    </div>
                    <div style={{ width: 90, textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ background: client._count.reclamations > 0 ? '#fee2e2' : '#f1f5f9', fontSize: '0.78rem', fontWeight: 700, color: client._count.reclamations > 0 ? '#991b1b' : '#94a3b8', padding: '0.15rem 0.55rem', borderRadius: 10 }}>
                        {client._count.reclamations}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'CHEF_EQUIPE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3>Équipe</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {dashboardData.performance?.teamMembers?.map((m: any, i: number) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                    <h4 style={{ margin: '0 0 4px' }}>{m.fullName}</h4>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{m.role}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>Charge de Travail Équipe</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {dashboardData.performance?.teamWorkload?.map((w: any, i: number) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                    <p style={{ margin: '0 0 4px' }}>Utilisateur: <strong>{w.assignedToUserId}</strong></p>
                    <p style={{ margin: 0 }}>Charge: <strong>{w._count.id} dossiers</strong></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'GESTIONNAIRE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Mes Tâches</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.personalTasks?.map((t: any, i: number) => (
                <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 4px' }}>Bordereau {t.reference}</h4>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Client: {t.client?.name}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Statut: <DossierStatutBadge statut={t.statut} /></p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Reçu le {new Date(t.dateReception).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'FINANCE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3>Virements en Attente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {dashboardData.virements?.map((v: any, i: number) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                    <h4 style={{ margin: '0 0 4px' }}>Virement {v.referenceBancaire}</h4>
                    <p style={{ margin: '0 0 2px', fontSize: 13 }}>Montant: <strong>{v.montant.toLocaleString()} €</strong></p>
                    <p style={{ margin: '0 0 2px', fontSize: 13 }}>Client: {v.bordereau?.client?.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Dépôt le {new Date(v.dateDepot).toLocaleDateString('fr-FR')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>Statistiques Financières</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Virements Quotidiens',  value: dashboardData.financialStats?.dailyVirements,   color: '#2563eb' },
                  { label: 'Virements Mensuels',    value: dashboardData.financialStats?.monthlyVirements,  color: '#16a34a' },
                  { label: 'Montant Moyen',          value: `${(dashboardData.financialStats?.avgAmount ?? 0).toLocaleString()} €`, color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'BO':
      case 'BUREAU_ORDRE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Bordereaux en Attente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.pendingBordereaux?.map((b: any, i: number) => (
                <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 4px' }}>Bordereau {b.reference}</h4>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Client: {b.client?.name}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Statut: <DossierStatutBadge statut={b.statut} /></p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Reçu le {new Date(b.dateReception).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'SCAN_TEAM':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>File d'Attente Scan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.scanQueue?.map((b: any, i: number) => (
                <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 4px' }}>Bordereau {b.reference}</h4>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Client: {b.client?.name}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Statut: <DossierStatutBadge statut={b.statut} /></p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Reçu le {new Date(b.dateReception).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CLIENT_SERVICE':
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Réclamations Actives</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {dashboardData.activeReclamations?.map((r: any, i: number) => (
                <div key={i} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
                  <h4 style={{ margin: '0 0 4px' }}>Réclamation #{r.id}</h4>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Client: {r.client?.name}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 13 }}>Statut: <DossierStatutBadge statut={r.status} /></p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Créée le {new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb', textAlign: 'center' }}>
            <h3>Tableau de Bord — {dashboardData.role}</h3>
            <p style={{ color: '#6b7280' }}>Contenu spécifique au rôle en cours de développement.</p>
          </div>
        );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MODALS
  // ─────────────────────────────────────────────────────────────────────────────

  const renderModals = () => (
    <>
      {/* Status modify modal */}
      {statusModifyModalOpen && selectedDossier && (
        <ModalShell title="✏️ Modifier le Statut" onClose={() => setStatusModifyModalOpen(false)} maxWidth={400}>
          <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6 }}>
            Dossier : <strong>{selectedDossier.reference}</strong><br />
            Client : <strong>{selectedDossier.client}</strong><br />
            Statut actuel : <strong>{selectedDossier.statut}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {(['Nouveau','En cours','Traité','Rejeté','Retourné'] as const).map(s => {
              const docOnly  = s === 'Rejeté' || s === 'Retourné';
              const disabled = docOnly && !selectedDossier?.isDocument;
              const icons: Record<string, string> = { Nouveau: '🆕', 'En cours': '⏳', Traité: '✅', Rejeté: '❌', Retourné: '↩️' };
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onMouseDown={() => !disabled && setNewStatus(s)}
                  onClick={() => !disabled && handleModifyDossierStatus()}
                  style={{ padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f9fafb' : 'white', fontSize: 14, fontWeight: 600, textAlign: 'left', opacity: disabled ? .5 : 1, transition: 'border-color .15s' }}
                >
                  {icons[s]} {s}
                  {disabled && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>(Documents uniquement)</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStatusModifyModalOpen(false)} style={{ padding: '8px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>Annuler</button>
          </div>
        </ModalShell>
      )}

      {/* PDF View modal (chef equipe style) */}
      {pdfViewModalOpen && selectedDossier && (
        <ModalShell title="📄 Aperçu PDF du Dossier" onClose={() => { setPdfViewModalOpen(false); setDossierDetails(null); }} maxWidth={600}>
          {loadingDossierDetails ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Référence', selectedDossier.reference],
                  ['Client',    selectedDossier.client],
                  ['Type',      selectedDossier.type],
                  ['Statut',    selectedDossier.statut],
                  ['Gestionnaire', selectedDossier.gestionnaire ?? 'Non assigné'],
                  ['Date',      selectedDossier.date],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{label}</p>
                    <div style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: 6, fontSize: 13, color: '#374151' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                  Documents ({dossierDetails?.documents?.length ?? 0})
                </p>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
                  {dossierDetails?.documents?.length > 0 ? dossierDetails.documents.map((doc: any, i: number) => (
                    <div key={doc.id ?? i} onClick={() => handleDocumentPDFView(doc.id, doc.fileName ?? doc.name)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < dossierDetails.documents.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13 }}>📄 {doc.fileName ?? doc.name ?? `Document ${i + 1}`}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{doc.type ?? 'Non spécifié'} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Taille inconnue'}</p>
                      </div>
                      <ActionBtn color="#2563eb" onClick={e => { e.stopPropagation(); handleDocumentPDFView(doc.id, doc.fileName ?? doc.name); }}>PDF</ActionBtn>
                    </div>
                  )) : (
                    <p style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Aucun document disponible</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setPdfViewModalOpen(false); setDossierDetails(null); }} style={{ padding: '8px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>Fermer</button>
                <button onClick={() => { setPdfViewModalOpen(false); setStatusModifyModalOpen(true); }} style={{ padding: '8px 18px', background: '#d52b36', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'white' }}>Modifier le Statut</button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {/* PDF full view modal (super admin) */}
      {showSuperAdminPDFModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '90%', height: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{currentSuperAdminDossier?.reference} — {currentSuperAdminDossier?.client}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>Type : {currentSuperAdminDossier?.type} · Statut : {currentSuperAdminDossier?.statut}</p>
              </div>
              <button onClick={closeSuperAdminPDFModal} style={{ padding: '7px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Fermer</button>
            </div>
            <div style={{ flex: 1, padding: 16 }}>
              {currentSuperAdminPDFUrl
                ? <iframe src={currentSuperAdminPDFUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6 }} title="PDF" />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>Chargement du PDF…</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Department explanation modal */}
      {showDepartmentExplanationModal && (
        <ModalShell title="📊 Statistiques par Département — Comment ça marche ?" onClose={() => setShowDepartmentExplanationModal(false)} maxWidth={860} accentColor="#2196f3">
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
            <InfoBox color="#e3f2fd" border="#90caf9">
              💡 Ces statistiques montrent <strong>où se trouvent les dossiers dans le processus de traitement</strong>, pas qui y travaille actuellement.
            </InfoBox>
            <h4 style={{ color: '#2196f3', marginTop: 20 }}>🔄 Parcours d'un dossier</h4>
            {[
              { step: '1', icon: '📥', title: 'Réception — Bureau d\'Ordre', statuts: 'EN_ATTENTE, A_SCANNER', desc: 'Le dossier vient d\'arriver. Le Bureau d\'Ordre l\'enregistre et le prépare pour la numérisation.' },
              { step: '2', icon: '📷', title: 'Numérisation — Service SCAN', statuts: 'SCAN_EN_COURS, SCANNE', desc: 'L\'équipe SCAN transforme les documents papier en fichiers numériques.' },
              { step: '3', icon: '👥', title: 'Attribution — Chef d\'Équipe', statuts: 'A_AFFECTER', desc: 'Le Chef d\'Équipe décide quel gestionnaire va traiter ce dossier.' },
              { step: '4', icon: '✍️', title: 'Traitement — Gestionnaire', statuts: 'ASSIGNE, EN_COURS, TRAITE', desc: 'Le gestionnaire analyse, vérifie et traite le dossier.' },
              { step: '5', icon: '💰', title: 'Paiement — Finance', statuts: 'PRET_VIREMENT, VIREMENT_EN_COURS, VIREMENT_EXECUTE', desc: 'Le service Finance effectue le virement bancaire pour rembourser le client.' },
              { step: '6', icon: '✅', title: 'Clôture', statuts: 'CLOTURE', desc: 'Le dossier est terminé et archivé.' },
            ].map(s => (
              <div key={s.step} style={{ padding: '10px 14px', borderLeft: '4px solid #2196f3', background: '#f0f7ff', borderRadius: '0 6px 6px 0', marginBottom: 10 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700 }}>{s.icon} Étape {s.step} : {s.title}</p>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#1565c0' }}>Statuts : {s.statuts}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => setShowDepartmentExplanationModal(false)} style={{ padding: '10px 28px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Compris !</button>
          </div>
        </ModalShell>
      )}

      {/* AI explanation modal */}
      {showAIExplanationModal && (
        <ModalShell title="🤖 Système d'Assignation IA" onClose={() => setShowAIExplanationModal(false)} maxWidth={860} accentColor="#6366f1">
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
            <InfoBox color="#f0f9ff" border="#bae6fd">
              💡 L'IA analyse la charge de travail, les performances historiques et les délais SLA pour recommander les meilleurs gestionnaires pour chaque dossier.
            </InfoBox>
            <h4 style={{ color: '#6366f1', marginTop: 20 }}>📊 Formule de Score (0–1)</h4>
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>
              Score = (Charge × 40%) + (Efficacité × 25%) + (SLA × 20%) + (Retards × 15%)
            </div>
            {[
              ['Charge (40%)', 'Plus la charge est faible → meilleur score. Score_Charge = 1 − (charge_actuelle / charge_max)'],
              ['Efficacité (25%)', 'Dossiers traités avec succès / total assignés'],
              ['SLA (20%)', 'Pourcentage de dossiers traités dans les délais contractuels'],
              ['Retards (15%)', 'Nombre de dossiers dépassant les délais (pénalité)'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 12px', background: '#f9fafb', borderLeft: '3px solid #6366f1', borderRadius: '0 6px 6px 0', marginBottom: 8 }}>
                <strong>{k}</strong> — {v}
              </div>
            ))}
            <h4 style={{ color: '#6366f1', marginTop: 20 }}>⚖️ Rééquilibrage automatique</h4>
            <p>L'IA détecte les gestionnaires surchargés (charge &gt; moyenne + 20%) et propose des transferts vers les moins chargés, en évitant les doublons et en recalculant après chaque transfert.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => setShowAIExplanationModal(false)} style={{ padding: '10px 28px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Compris !</button>
          </div>
        </ModalShell>
      )}

      {/* Edit type modal */}
      {editModalOpen && (
        <ModalShell title="✏️ Modifier le Type de Dossier" onClose={() => setEditModalOpen(false)} maxWidth={420} accentColor="#9c27b0">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {(['Prestation','Adhésion','Complément Dossier','Avenant','Réclamation'] as const).map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: selectedType === t ? '2px solid #9c27b0' : '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: selectedType === t ? '#f3e5f5' : 'white' }}>
                <input type="radio" name="docType" value={t} checked={selectedType === t} onChange={e => setSelectedType(e.target.value)} style={{ accentColor: '#9c27b0' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{t}</p>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setEditModalOpen(false)} style={{ padding: '8px 18px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>Annuler</button>
            <button onClick={() => { setEditModalOpen(false); alert('Type modifié'); loadChefEquipeData(); }} disabled={!selectedType} style={{ padding: '8px 18px', background: selectedType ? '#9c27b0' : '#d1d5db', border: 'none', borderRadius: 6, cursor: selectedType ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, color: 'white' }}>Confirmer</button>
          </div>
        </ModalShell>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading && !dashboardData) return (
    <>
      <style>{`@keyframes ars-spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner />
    </>
  );

  if (error) return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
      <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>Problème de Connexion ARS</h3>
      <div style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.5rem', textAlign: 'left' }}>
        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{error}</p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={fetchDashboardData} style={{ padding: '0.7rem 1.4rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>🔄 Réessayer</button>
        <button onClick={() => window.location.reload()} style={{ padding: '0.7rem 1.4rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>🔄 Recharger</button>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>Si le problème persiste, contactez l'administrateur ARS</p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const isSuperAdminRole = dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT';

  return (
    <>
      <style>{`@keyframes ars-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: '1rem' }}>
        {/* Super Admin full-page content */}
        {isSuperAdminRole && renderSuperAdminContent()}

        {/* Status/AI banners */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.5rem 0', maxWidth: 1440 }}>
          {dashboardData?.kpis?.dataSource && (
            <Banner
              icon={dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '⚠️' : dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '🚨' : '✅'}
              color={dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '#fffbeb' : dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '#fef2f2' : '#f0fdf4'}
              border={dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? '#fde68a' : dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? '#fecaca' : '#bbf7d0'}
              title={dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? 'Mode Dégradé ARS' : dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? 'Erreur Système ARS' : 'Système ARS Opérationnel'}
              desc={
                dashboardData.kpis.dataSource === 'ARS_DATABASE_FALLBACK' ? 'Données réelles disponibles — Service IA temporairement indisponible' :
                dashboardData.kpis.dataSource === 'ERROR_FALLBACK' ? 'Problème base de données — Contactez l\'administrateur' :
                'Tous les services ARS fonctionnent normalement'
              }
            />
          )}
          {aiInsights && (
            <Banner
              icon="🤖"
              color={aiInsights.health.status === 'healthy' ? '#f0fdf4' : '#fffbeb'}
              border={aiInsights.health.status === 'healthy' ? '#bbf7d0' : '#fde68a'}
              title={`Intelligence Artificielle ARS : ${aiInsights.health.status === 'healthy' ? 'Active' : 'Indisponible'}`}
              desc={aiInsights.health.message}
            >
              {aiInsights.recommendations.length > 0 && (
                <span style={{ padding: '3px 10px', background: '#22c55e', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {aiInsights.recommendations.length} recommandation(s)
                </span>
              )}
              {aiInsights.health.status === 'unavailable' && (
                <button onClick={fetchAIInsights} style={{ padding: '4px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                  Réactiver
                </button>
              )}
            </Banner>
          )}
        </div>

        {/* Shared content (all roles) */}
        {dashboardData && (
          <>
            {canViewFeature(user?.role, 'workforce_estimator') && (
              <div style={{ marginTop: '2rem' }}><WorkforceEstimator /></div>
            )}

            {renderRoleSpecificContent()}

            {/* DossiersList */}
            {['SUPER_ADMIN','ADMINISTRATEUR','CHEF_EQUIPE','RESPONSABLE_DEPARTEMENT'].includes(dashboardData?.role ?? '') && (
              <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', border: '1px solid #e0e7ff', borderRadius: 12, backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 4, height: 22, backgroundColor: '#10b981', marginRight: '1rem', borderRadius: 2 }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>Liste Dossiers</h3>
                </div>
                <DossiersList params={{}} />
              </div>
            )}

            {/* BS module */}
            {(dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT') && (
              <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', border: '1px solid #e0e7ff', borderRadius: 12, backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 4, height: 22, backgroundColor: '#10b981', marginRight: '1rem', borderRadius: 2 }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>Module Bulletin de Soins</h3>
                  <button onClick={() => setShowAIExplanationModal(true)} style={{ marginLeft: 'auto', padding: '7px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ℹ️ Comment ça marche ?
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Suggestions d'Assignation IA</h4>
                    <div style={{ maxHeight: 320, overflow: 'auto' }}><AssignmentSuggestions showActions={false} /></div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Suggestions de Rééquilibrage IA</h4>
                    <div style={{ maxHeight: 320, overflow: 'auto' }}><RebalancingSuggestions /></div>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>Priorités par Gestionnaire</h4>
                  <PrioritiesDashboard />
                </div>
              </div>
            )}

            {/* AI recommendations */}
            {(aiInsights?.recommendations.length ?? 0) > 0 && (
              <div style={{ marginTop: '2rem', padding: '1.5rem 2rem', border: '1px solid #e0e7ff', borderRadius: 12, backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 4, height: 22, backgroundColor: '#6366f1', marginRight: '1rem', borderRadius: 2 }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>🤖 Recommandations IA</h3>
                  <span style={{ marginLeft: 'auto', padding: '5px 14px', background: '#6366f1', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {aiInsights.recommendations.length} recommandation(s)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiInsights.recommendations.map((rec: string, i: number) => {
                    const isCrit = rec.includes('🚨') || rec.includes('CRITIQUE') || rec.includes('URGENT');
                    const isWarn = rec.includes('⚠️') || rec.includes('Alerte') || rec.includes('Attention');
                    const bg     = isCrit ? '#fef2f2' : isWarn ? '#fffbeb' : '#f0f9ff';
                    const border = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6';
                    return (
                      <div key={i} style={{ padding: '1rem', background: bg, border: `2px solid ${border}`, borderRadius: 8, display: 'flex', gap: 10 }}>
                        <span style={{ flexShrink: 0, fontSize: 18 }}>{isCrit ? '🚨' : isWarn ? '⚠️' : '📊'}</span>
                        <span style={{ fontSize: 14, lineHeight: 1.5, color: '#374151' }}>{rec}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI unavailable notice */}
            {aiInsights?.health?.status === 'unavailable' && (
              <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb' }}>
                <h4 style={{ margin: '0 0 6px', color: '#92400e' }}>Service IA Indisponible</h4>
                <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280' }}>Les fonctionnalités de base du tableau de bord restent disponibles.</p>
                <button onClick={fetchAIInsights} style={{ padding: '7px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Réessayer la connexion IA</button>
              </div>
            )}
          </>
        )}
      </div>

      {renderModals()}
    </>
  );
};

// ─── Tiny helper components (file-local) ─────────────────────────────────────

const Row: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
    <span style={{ color: color ?? '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: 700, color: color ?? '#374151' }}>{value}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = '#1f2937', style: s }) => (
  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 8, ...s }}>
    <span style={{ width: 3, height: 18, background: color === '#15803d' ? '#22c55e' : '#d52b36', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
    {children}
  </h3>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: 14, gridColumn: '1 / -1' }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
    <p style={{ margin: 0 }}>{children}</p>
  </div>
);

const ActionBtn: React.FC<{ color: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }> = ({ color, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '4px 10px', background: color, color: 'white', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>{children}</button>
);

const InfoBox: React.FC<{ color: string; border: string; children: React.ReactNode }> = ({ color, border, children }) => (
  <div style={{ padding: '10px 14px', background: color, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14 }}>{children}</div>
);

interface BannerProps { icon: string; color: string; border: string; title: string; desc?: string; children?: React.ReactNode }
const Banner: React.FC<BannerProps> = ({ icon, color, border, title, desc, children }) => (
  <div style={{ padding: '12px 16px', background: color, border: `1px solid ${border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{title}</p>
      {desc && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{desc}</p>}
    </div>
    {children && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{children}</div>}
  </div>
);

export default EnhancedDashboard;