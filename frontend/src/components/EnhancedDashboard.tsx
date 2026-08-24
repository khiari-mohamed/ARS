import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { LocalAPI } from '../services/axios';
import { hasDashboardAccess } from '../utils/dashboardRoles';
import DossiersList from './BS/DossiersList';
import { useIsReadOnly } from './ReadOnlyWrapper';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Single source of truth for the visual language. Inline styles reference this
// object so the whole dashboard stays consistent without touching any global
// stylesheet — nothing here changes behaviour, only appearance.

const theme = {
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  bg: '#f4f5f9',
  surface: '#ffffff',
  surfaceSubtle: '#fafbfd',
  surfaceMuted: '#f3f4f8',
  border: '#e7e9f0',
  borderStrong: '#d9dce6',
  divider: '#eef0f5',
  text: '#161a24',
  textMuted: '#5b6072',
  textFaint: '#9498a8',
  textOnPrimary: '#ffffff',
  primary: '#c31f2e',
  primaryDark: '#9c1723',
  primaryDarker: '#7a121b',
  primarySoft: '#fdeceb',
  primarySoftBorder: '#f6c9c9',
  success: '#1a9c5b',
  successSoft: '#e9f9f1',
  successBorder: '#b6ecd2',
  warning: '#c17a09',
  warningSoft: '#fef6e7',
  warningBorder: '#f6ddab',
  danger: '#d13438',
  dangerSoft: '#fdecec',
  dangerBorder: '#f5c6c6',
  info: '#2461c0',
  infoSoft: '#eaf2fd',
  infoBorder: '#c3dbf8',
  violet: '#6d4bce',
  violetSoft: '#f1edfc',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  shadowXs: '0 1px 2px rgba(20,22,35,.04)',
  shadowSm: '0 1px 3px rgba(20,22,35,.05), 0 1px 2px rgba(20,22,35,.03)',
  shadowMd: '0 6px 16px -4px rgba(20,22,35,.09), 0 2px 6px -2px rgba(20,22,35,.05)',
  shadowLg: '0 20px 48px -12px rgba(20,22,35,.18)',
} as const;

const cardBase: React.CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusLg,
  boxShadow: theme.shadowSm,
};

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

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60_000; // Bumped from 30s → 60s to reduce server hammering
const ITEMS_PER_PAGE = 5;

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TRAITE:           { bg: theme.successSoft, text: '#0f7a49', border: theme.successBorder },
  EN_COURS:         { bg: theme.infoSoft,    text: '#1d4f9e', border: theme.infoBorder },
  A_AFFECTER:       { bg: '#fdedf5',         text: '#9d1361', border: '#f4c3de' },
  A_SCANNER:        { bg: theme.warningSoft, text: '#8f5a06', border: theme.warningBorder },
  VIREMENT_EXECUTE: { bg: theme.infoSoft,    text: '#1544a8', border: theme.infoBorder },
  ASSIGNE:          { bg: theme.violetSoft,  text: '#5334a8', border: '#dad0f5' },
  CLOTURE:          { bg: theme.surfaceMuted,text: '#4b5164', border: theme.border },
  default:          { bg: theme.surfaceMuted,text: '#4b5164', border: theme.border },
};

const getStatusStyle = (status: string) =>
  STATUS_COLORS[status] ?? STATUS_COLORS.default;

const getDossierStatutStyle = (statut: string) => {
  if (statut === 'Traité')   return { bg: theme.successSoft, text: theme.success, border: theme.successBorder };
  if (statut === 'En cours') return { bg: theme.warningSoft, text: theme.warning, border: theme.warningBorder };
  return { bg: theme.dangerSoft, text: theme.danger, border: theme.dangerBorder };
};

const getPriorityColor = (priorite: string) => {
  if (priorite === 'Très')    return theme.danger;
  if (priorite === 'Moyenne') return theme.warning;
  return theme.success;
};

const getCompletionColor = (pct: number) =>
  pct >= 80 ? theme.success : pct >= 50 ? theme.warning : theme.danger;

// ─── Micro-components ─────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 18, fontFamily: theme.font }}>
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      <div style={{
        position: 'absolute', inset: 0,
        border: `3px solid ${theme.surfaceMuted}`,
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        border: '3px solid transparent',
        borderTopColor: theme.primary,
        borderRightColor: theme.primary,
        borderRadius: '50%',
        animation: 'ars-spin 0.7s cubic-bezier(.5,0,.5,1) infinite',
      }} />
    </div>
    <p style={{ color: theme.textMuted, fontWeight: 600, fontSize: 14, margin: 0, letterSpacing: '.01em' }}>Chargement du tableau de bord…</p>
  </div>
);

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: theme.font }}>
    <div style={{ width: 56, height: 7, background: theme.surfaceMuted, borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: getCompletionColor(pct), borderRadius: 999, transition: 'width .3s ease' }} />
    </div>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.text, minWidth: 32 }}>{pct}%</span>
  </div>
);

const StatusBadge: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
  const { bg, text, border } = getStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '3px 8px' : '4px 11px',
      borderRadius: 999, fontSize: small ? 10.5 : 12,
      fontWeight: 700, background: bg, color: text,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap', letterSpacing: '.01em',
      fontFamily: theme.font,
    }}>
      {status}
    </span>
  );
};

const DossierStatutBadge: React.FC<{ statut: string }> = ({ statut }) => {
  const { bg, text, border } = getDossierStatutStyle(statut);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, background: bg, color: text,
      border: `1px solid ${border}`, whiteSpace: 'nowrap',
      fontFamily: theme.font,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: text, flexShrink: 0 }} />
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
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 15px', borderRadius: theme.radiusSm, border: `1px solid ${disabled ? theme.divider : theme.primary}`,
    background: disabled ? theme.surfaceSubtle : theme.surface, color: disabled ? theme.textFaint : theme.primary,
    cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12.5,
    transition: 'background .15s, color .15s', fontFamily: theme.font,
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${theme.divider}`, marginTop: 14, fontFamily: theme.font }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} style={btnStyle(page === 1)}>← Précédent</button>
      <span style={{ fontSize: 12.5, color: theme.textMuted, fontWeight: 600 }}>Page <strong style={{ color: theme.text }}>{page}</strong> sur {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} style={btnStyle(page >= totalPages)}>Suivant →</button>
    </div>
  );
};

// ─── Filter Row ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm,
  fontSize: 13, color: theme.text, background: theme.surfaceSubtle,
  outline: 'none', transition: 'border-color .15s, background .15s',
  fontFamily: theme.font,
};

const FilterRow: React.FC<{ children: React.ReactNode; onClear: () => void }> = ({ children, onClear }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18, padding: 12, background: theme.surfaceSubtle, border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd, fontFamily: theme.font }}>
    {children}
    <button
      onClick={onClear}
      style={{ padding: '8px 14px', background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.borderStrong}`, borderRadius: theme.radiusSm, fontSize: 12.5, cursor: 'pointer', fontWeight: 700, marginLeft: 'auto', transition: 'color .15s, border-color .15s' }}
    >
      ✕ Effacer les filtres
    </button>
  </div>
);

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const ModalShell: React.FC<{ title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode; accentColor?: string }> = ({
  title, onClose, maxWidth = 480, children, accentColor = theme.primary
}) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,26,.55)', backdropFilter: 'blur(2px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: theme.font }}>
    <div style={{ background: theme.surface, borderRadius: theme.radiusLg, width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: theme.shadowLg, display: 'flex', flexDirection: 'column', border: `1px solid ${theme.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${theme.divider}` }}>
        <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 4, height: 18, borderRadius: 2, background: accentColor, display: 'inline-block' }} />
          {title}
        </h2>
        <button onClick={onClose} style={{ background: theme.surfaceMuted, border: 'none', width: 28, height: 28, borderRadius: '50%', fontSize: 17, cursor: 'pointer', color: theme.textMuted, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>×</button>
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
const StatCard: React.FC<StatCardProps> = ({ label, total, breakdown, gestionnaireBreakdown, accentColor = theme.primary }) => (
  <div style={{ ...cardBase, padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', fontFamily: theme.font }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      <span style={{ background: accentColor, color: 'white', borderRadius: theme.radiusSm, padding: '3px 11px', fontSize: 16, fontWeight: 800, minWidth: 30, textAlign: 'center', lineHeight: 1.5 }}>{total}</span>
    </div>
    <div style={{ fontSize: 11.5, color: theme.textMuted, maxHeight: 170, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Object.keys(breakdown).length > 0 && (
        <>
          <span style={{ fontWeight: 700, marginBottom: 3, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.03em', color: theme.textFaint }}>Par client</span>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${theme.divider}` }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{k}</span>
              <span style={{ fontWeight: 700, color: theme.text, flexShrink: 0 }}>{String(v)}</span>
            </div>
          ))}
        </>
      )}
      {Object.keys(gestionnaireBreakdown).length > 0 && (
        <>
          <span style={{ fontWeight: 700, marginTop: 8, marginBottom: 3, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.03em', color: theme.textFaint }}>Par gestionnaire</span>
          {Object.entries(gestionnaireBreakdown).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${theme.divider}` }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{k}</span>
              <span style={{ fontWeight: 700, color: theme.text, flexShrink: 0 }}>{String(v)}</span>
            </div>
          ))}
        </>
      )}
      {Object.keys(breakdown).length === 0 && Object.keys(gestionnaireBreakdown).length === 0 && (
        <span style={{ color: theme.textFaint, fontStyle: 'italic' }}>Aucune donnée</span>
      )}
    </div>
  </div>
);

// ─── Table ────────────────────────────────────────────────────────────────────

interface Column { key: string; label: string; width?: number | string; render?: (row: any) => React.ReactNode }
const DataTable: React.FC<{ columns: Column[]; rows: any[]; striped?: boolean }> = ({ columns, rows, striped = true }) => (
  <div style={{ overflowX: 'auto', border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd, fontFamily: theme.font }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead>
        <tr style={{ background: theme.surfaceSubtle }}>
          {columns.map(c => (
            <th key={c.key} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: theme.textMuted, whiteSpace: 'nowrap', width: c.width, borderBottom: `1px solid ${theme.divider}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: '36px 24px', textAlign: 'center', color: theme.textFaint, fontStyle: 'italic', fontSize: 13 }}>Aucun résultat</td></tr>
        ) : rows.map((row, i) => (
          <tr
            key={row.id ?? i}
            style={{ background: striped && i % 2 !== 0 ? theme.surfaceSubtle : theme.surface, borderBottom: `1px solid ${theme.divider}`, transition: 'background .12s' }}
          >
            {columns.map(c => (
              <td key={c.key} style={{ padding: '11px 14px', verticalAlign: 'middle', color: theme.text }}>
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
  const [departments, setDepartments] = useState<any[]>([]);

  // FIX: use a ref to track whether a fetch is already in-flight
  // Prevents duplicate parallel requests on 30-s timer fires
  const fetchInFlight = useRef(false);
  const superAdminDataInFlight = useRef(false);

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

  // ✅ MERGED: "Tous les Bordereaux" + "Bordereaux (X total)" now share ONE
  // dataset, coming from a single `/bordereaux-unified` call (one Prisma
  // query, one Redis entry) instead of the two separate, largely-overlapping
  // fetches this dashboard used to make.
  const [superAdminBordereaux, setSuperAdminBordereaux]     = useState<any[]>([]);
  const [superAdminEnCoursCount, setSuperAdminEnCoursCount] = useState(0);
  const [showOnlyEnCours, setShowOnlyEnCours]               = useState(false);
  const [superAdminUnifiedPage, setSuperAdminUnifiedPage]   = useState(1);

  // PDF modal
  const [showSuperAdminPDFModal, setShowSuperAdminPDFModal]   = useState(false);
  const [currentSuperAdminPDFUrl, setCurrentSuperAdminPDFUrl] = useState('');
  const [currentSuperAdminDossier, setCurrentSuperAdminDossier] = useState<any>(null);

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
  const [showDepartmentExplanationModal, setShowDepartmentExplanationModal] = useState(false);

  // ── Per-table filters ────────────────────────────────────────────────────────
  // filter1 drives the single merged "Bordereaux" table.
  const [filter1, setFilter1] = useState<Filter1>({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' });

  // ── Derived values ────────────────────────────────────────────────────────────
  const normalizeType = React.useCallback((type?: string) => {
    if (!type) return '';
    return type === 'Aucun document' ? 'Prestation' : type;
  }, []);

  const allUniqueStatuts = React.useMemo(() => {
    const all = superAdminBordereaux.map((d: any) => d.statut).filter(Boolean);
    return [...new Set(all)].sort();
  }, [superAdminBordereaux]);

  const allUniqueTypes = React.useMemo(() => {
    const all = superAdminBordereaux.map((d: any) => normalizeType(d.type)).filter(Boolean);
    return [...new Set(all)].sort();
  }, [superAdminBordereaux, normalizeType]);

  // ✅ useMemo instead of useEffect+setState: one fewer render pass per
  // filter keystroke, and no risk of the filtered list lagging one tick
  // behind the source data / toggle.
  const filteredUnifiedBordereaux = React.useMemo(() => {
    const inDate = (isoDate: string, from: string, to: string) => {
      if (!isoDate) return true;
      const t = new Date(isoDate).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to   && t > new Date(to).getTime())   return false;
      return true;
    };

    let list = superAdminBordereaux.filter(d =>
      (!filter1.ref    || d.reference?.toLowerCase().includes(filter1.ref.toLowerCase())) &&
      (!filter1.client || d.client?.toLowerCase().includes(filter1.client.toLowerCase())) &&
      (!filter1.type   || normalizeType(d.type) === filter1.type) &&
      inDate(d.dateSort, filter1.dateFrom, filter1.dateTo)
    );

    if (showOnlyEnCours) {
      list = list.filter(d => d.isEnCours);
      // Oldest-received-first, matching the original "en cours" priority order
      list = [...list].sort((a, b) => (b.joursEnCours ?? 0) - (a.joursEnCours ?? 0));
    }

    return list;
  }, [superAdminBordereaux, filter1, showOnlyEnCours]);

  const pagedUnifiedBordereaux = React.useMemo(() => {
    const start = (superAdminUnifiedPage - 1) * ITEMS_PER_PAGE;
    return filteredUnifiedBordereaux.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnifiedBordereaux, superAdminUnifiedPage]);

  // Reset to page 1 whenever the filtered set shrinks below the current page
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUnifiedBordereaux.length / ITEMS_PER_PAGE));
    if (superAdminUnifiedPage > totalPages) setSuperAdminUnifiedPage(totalPages);
  }, [filteredUnifiedBordereaux.length, superAdminUnifiedPage]);

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
  // FIX (this pass): the old "Tous les Bordereaux" (derniers-dossiers) and
  // "Bordereaux en cours" (dossiers-en-cours) sections each fired their own
  // heavy Prisma query with the full documents/client/contract include set —
  // and dossiers-en-cours frequently just returned the SAME rows as
  // derniers-dossiers anyway (its own fallback logic). That's now ONE call to
  // `/bordereaux-unified`. The former "Dossiers Individuels" table's
  // `/documents-individuels` call has also been dropped entirely now that
  // its data/columns were merged into the "Liste Dossiers" table
  // (DossiersList.tsx), cutting this batch to 5 calls.
  const fetchSuperAdminData = useCallback(async () => {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(user?.role ?? '')) return;
    if (superAdminDataInFlight.current) return;
    superAdminDataInFlight.current = true;
    try {
      const [
        statsRes,        // tableau-bord/stats
        typesRes,        // tableau-bord/types-detail
        unifiedRes,       // tableau-bord/bordereaux-unified  (was: derniers-dossiers + dossiers-en-cours)
        assignmentsRes,  // gestionnaire-assignments-dossiers
        seniorRes,       // tableau-bord/gestionnaire-senior-assignments
      ] = await Promise.all([
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/stats?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/types-detail?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/bordereaux-unified?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/gestionnaire-assignments-dossiers?superAdmin=true'),
        LocalAPI.get('/bordereaux/chef-equipe/tableau-bord/gestionnaire-senior-assignments?superAdmin=true'),
      ]);

      const unifiedItems: any[] = Array.isArray(unifiedRes.data?.items) ? unifiedRes.data.items : [];
      const enCoursCount: number = unifiedRes.data?.enCoursCount ?? unifiedItems.filter((i: any) => i.isEnCours).length;

      // ── Chef équipe state (kept for the search/type-filter handlers above,
      // which still hit their own endpoints independently) ──
      setStats(statsRes.data);
      setTypesDetail(typesRes.data);
      setDerniersDossiers(unifiedItems);
      setDossiersEnCours(unifiedItems.filter((i: any) => i.isEnCours));
      setAllGestionnaireAssignments(assignmentsRes.data ?? []);
      setFilteredGestionnaireAssignments(assignmentsRes.data ?? []);

      // ── Super admin state ──
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

      setSuperAdminBordereaux(unifiedItems);
      setSuperAdminEnCoursCount(enCoursCount);
      setSuperAdminGestionnaireAssignments(assignmentsRes.data ?? []);
      setSuperAdminGestionnaireSeniorAssignments(seniorRes.data ?? []);
    } catch (e) {
      console.error('Error loading Super Admin data:', e);
    } finally {
      superAdminDataInFlight.current = false;
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

      const isSuperAdmin = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(user?.role ?? '');

      // The Super Admin screen has its own data batch below. Do not block the
      // first paint on the same heavy aggregate queries a second time.
      if (isSuperAdmin) {
        void fetchSuperAdminData();
        setDashboardData({
          role: user?.role === 'RESPONSABLE_DEPARTEMENT' ? 'SUPER_ADMIN' : user?.role ?? 'SUPER_ADMIN',
          permissions: user?.role === 'RESPONSABLE_DEPARTEMENT' ? ['READ_ONLY'] : [],
          kpis: { dataSource: 'DATABASE' },
          performance: {},
          slaStatus: [],
          alerts: {},
        });
        setDepartments([]);
        setLastUpdated(new Date());
        return;
      }

      const [dashRes, deptRes, docStatsRes, docStatusRes] = await Promise.all([
        LocalAPI.get('/dashboard/role-based', { params: filters, timeout: 300_000 }),
        LocalAPI.get('/super-admin/departments').catch(() => ({ data: [] })),
        LocalAPI.get('/dashboard/documents/all-types', { params: filters }).catch(() => ({ data: {} })),
        LocalAPI.get('/dashboard/documents/status-breakdown', { params: filters }).catch(() => ({ data: {} })),
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

  // Auto-refresh
  useEffect(() => {
    if (!realTimeEnabled) return;
    const id = setInterval(() => {
      fetchDashboardData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchDashboardData, realTimeEnabled]);

  // ── Filter change helpers ─────────────────────────────────────────────────────
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Super admin actions ───────────────────────────────────────────────────────
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
      else alert('Erreur modification'); }
    catch { alert('Erreur modification'); }
  }, [currentSuperAdminDossier, fetchDashboardData, closeSuperAdminPDFModal]);

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
    <div style={{ fontFamily: theme.font, background: theme.bg, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(120deg, ${theme.primaryDarker} 0%, ${theme.primary} 55%, ${theme.primaryDark} 100%)`,
        color: 'white', padding: '26px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        boxShadow: '0 4px 20px rgba(154,20,30,.18)',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {isReadOnly ? '👁️' : '⚡'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .78 }}>ARS · Tableau de bord</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' }}>
            {isReadOnly ? 'Dashboard Responsable Département' : 'Dashboard Super Admin'}
          </h1>
          {isReadOnly && <p style={{ margin: '6px 0 0', fontSize: 13, opacity: .85, fontWeight: 500 }}>Mode lecture seule — accès complet en consultation</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button
            onClick={() => setRealTimeEnabled(p => !p)}
            title={realTimeEnabled ? 'Désactiver l\'actualisation auto' : 'Activer l\'actualisation auto'}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 999, border: '1px solid rgba(255,255,255,.35)', background: realTimeEnabled ? 'rgba(255,255,255,.16)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, transition: 'background .15s' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: realTimeEnabled ? '#4ade80' : 'rgba(255,255,255,.5)', flexShrink: 0 }} />
            {realTimeEnabled ? 'Auto-actualisation' : 'Actualisation en pause'}
          </button>
          <span style={{ fontSize: 12, opacity: .75, fontWeight: 500 }}>Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 24px 40px' }}>

        {/* ── Stat Cards ── */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <StatCard label="Prestation"          total={superAdminStats.prestation?.total  ?? 0} breakdown={superAdminStats.prestation?.breakdown  ?? {}} gestionnaireBreakdown={superAdminStats.prestation?.gestionnaireBreakdown  ?? {}} />
            <StatCard label="Adhésion"            total={superAdminStats.adhesion?.total    ?? 0} breakdown={superAdminStats.adhesion?.breakdown    ?? {}} gestionnaireBreakdown={superAdminStats.adhesion?.gestionnaireBreakdown    ?? {}} />
            <StatCard label="Complément Dossier"  total={superAdminStats.complement?.total  ?? 0} breakdown={superAdminStats.complement?.breakdown  ?? {}} gestionnaireBreakdown={superAdminStats.complement?.gestionnaireBreakdown  ?? {}} accentColor={theme.info} />
            <StatCard label="Résiliation"         total={superAdminStats.resiliation?.total ?? 0} breakdown={superAdminStats.resiliation?.breakdown ?? {}} gestionnaireBreakdown={superAdminStats.resiliation?.gestionnaireBreakdown ?? {}} />
            <StatCard label="Réclamation"         total={superAdminStats.reclamation?.total ?? 0} breakdown={superAdminStats.reclamation?.breakdown ?? {}} gestionnaireBreakdown={superAdminStats.reclamation?.gestionnaireBreakdown ?? {}} />
            <StatCard label="Avenant"             total={superAdminStats.avenant?.total     ?? 0} breakdown={superAdminStats.avenant?.breakdown     ?? {}} gestionnaireBreakdown={superAdminStats.avenant?.gestionnaireBreakdown     ?? {}} />
          </div>
        </section>

        {/* ── Affectations par gestionnaire ── */}
        <section style={{ ...cardBase, padding: '20px 22px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle>Affectations par Gestionnaire</SectionTitle>
            <span style={{ fontSize: 12.5, color: theme.textMuted, fontWeight: 600, background: theme.surfaceMuted, padding: '4px 10px', borderRadius: 999 }}>{superAdminGestionnaireAssignments.length} gestionnaire(s)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {superAdminGestionnaireAssignments.map((a, i) => (
              <div key={i} style={{ background: theme.surfaceSubtle, borderRadius: theme.radiusMd, padding: '15px 17px', border: `1px solid ${theme.divider}`, opacity: a.totalAssigned === 0 ? .65 : 1, transition: 'box-shadow .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: theme.surfaceMuted, color: theme.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}>{String(a.gestionnaire ?? '?').charAt(0)}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: theme.text }}>{a.gestionnaire}</span>
                  {a.totalAssigned === 0 && <span style={{ fontSize: 10.5, background: theme.surfaceMuted, color: theme.textFaint, padding: '2px 8px', borderRadius: 999, fontWeight: 700, marginLeft: 'auto' }}>Disponible</span>}
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Row label="Total affectés" value={a.totalAssigned} />
                  <Row label="✓ Traités"      value={a.traites   ?? 0} color={theme.success} />
                  <Row label="⏳ En cours"    value={a.enCours   ?? 0} color={theme.warning} />
                  <Row label="↩ Retournés"    value={a.retournes ?? 0} color={theme.danger} />
                </div>
                {Object.keys(a.documentsByType ?? {}).length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: theme.textMuted, background: theme.surfaceMuted, padding: '6px 9px', borderRadius: theme.radiusSm }}>
                    {Object.entries(a.documentsByType ?? {}).map(([t, c]) => `${t}: ${c}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {superAdminGestionnaireAssignments.length === 0 && <EmptyState>Aucun gestionnaire</EmptyState>}
          </div>
        </section>

        {/* ── Gestionnaires Senior ── */}
        <section style={{ background: theme.successSoft, borderRadius: theme.radiusLg, padding: '20px 22px', marginBottom: 18, border: `1px solid ${theme.successBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle color={theme.success}>⭐ Gestionnaires Senior</SectionTitle>
            <span style={{ background: theme.success, color: 'white', padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}>
              {superAdminGestionnaireSeniorAssignments.length} Senior(s)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {superAdminGestionnaireSeniorAssignments.map((a, i) => (
              <div key={i} style={{ background: theme.surface, borderRadius: theme.radiusMd, padding: '15px 17px', border: `1px solid ${theme.successBorder}`, boxShadow: theme.shadowXs }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: theme.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👤</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: theme.success }}>{a.gestionnaire}</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Row label="Total affectés" value={a.totalAssigned} />
                    {(a.reassignedCount ?? 0) > 0 && (
                      <span style={{ background: theme.info, color: 'white', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>
                        +{a.reassignedCount} 🔄
                      </span>
                    )}
                  </div>
                  <Row label="✓ Traités"   value={a.traites   ?? 0} color={theme.success} />
                  <Row label="⏳ En cours" value={a.enCours   ?? 0} color={theme.warning} />
                  <div>
                    <Row label="↩ Retournés" value={a.retournes ?? 0} color={theme.danger} />
                    {a.returnedBy && (a.retournes ?? 0) > 0 && (
                      <div style={{ marginLeft: 16, marginTop: 4, fontSize: 11, color: theme.danger, background: theme.dangerSoft, padding: '4px 9px', borderRadius: theme.radiusSm, fontWeight: 600 }}>
                        → Retourné par : {a.returnedBy}
                      </div>
                    )}
                  </div>
                </div>
                {Object.keys(a.documentsByType ?? {}).length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: theme.success, background: theme.successSoft, padding: '6px 9px', borderRadius: theme.radiusSm }}>
                    {Object.entries(a.documentsByType ?? {}).map(([t, c]) => `${t}: ${c}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {superAdminGestionnaireSeniorAssignments.length === 0 && <EmptyState>Aucun gestionnaire senior</EmptyState>}
          </div>
        </section>

        {/* ── Bordereaux (merged: "Tous les Bordereaux" + "Bordereaux en cours") ── */}
        <section style={{ ...cardBase, padding: '20px 22px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <SectionTitle>Bordereaux</SectionTitle>
            <div style={{ display: 'flex', background: theme.surfaceMuted, borderRadius: 999, padding: 3, border: `1px solid ${theme.divider}` }}>
              <button
                onClick={() => { setShowOnlyEnCours(false); setSuperAdminUnifiedPage(1); }}
                style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, transition: 'background .15s, color .15s', background: !showOnlyEnCours ? theme.primary : 'transparent', color: !showOnlyEnCours ? 'white' : theme.textMuted }}
              >
                Tous ({superAdminBordereaux.length})
              </button>
              <button
                onClick={() => { setShowOnlyEnCours(true); setSuperAdminUnifiedPage(1); }}
                style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, transition: 'background .15s, color .15s', background: showOnlyEnCours ? theme.primary : 'transparent', color: showOnlyEnCours ? 'white' : theme.textMuted }}
              >
                En cours ({superAdminEnCoursCount})
              </button>
            </div>
          </div>

          {/* Quick stat chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { label: 'Total',         value: superAdminBordereaux.length, color: theme.text },
              { label: 'En cours',      value: superAdminEnCoursCount, color: theme.warning },
              { label: 'Traités',       value: superAdminBordereaux.filter(b => b.statut === 'Traité').length, color: theme.success },
              { label: 'Non assignés',  value: superAdminBordereaux.filter(b => b.gestionnaire === 'Non assigné').length, color: theme.danger },
            ].map(chip => (
              <div key={chip.label} style={{ padding: '7px 15px', background: theme.surfaceSubtle, border: `1px solid ${theme.divider}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: theme.textMuted }}>
                {chip.label} <span style={{ color: chip.color, fontWeight: 800, marginLeft: 3 }}>{chip.value}</span>
              </div>
            ))}
          </div>

          <FilterRow onClear={() => { setFilter1({ ref: '', client: '', type: '', statut: '', dateFrom: '', dateTo: '' }); setSuperAdminUnifiedPage(1); }}>
            <input style={{ ...inputStyle, width: 130 }} placeholder="Référence" value={filter1.ref}      onChange={e => setFilter1(p => ({ ...p, ref:      e.target.value }))} />
            <input style={{ ...inputStyle, width: 130 }} placeholder="Client"    value={filter1.client}   onChange={e => setFilter1(p => ({ ...p, client:   e.target.value }))} />
            <select style={{ ...inputStyle, width: 120 }} value={filter1.type}   onChange={e => setFilter1(p => ({ ...p, type:   e.target.value }))}>
              <option value="">Type</option>
              {allUniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={{ ...inputStyle, width: 150 }} value={filter1.statut} onChange={e => setFilter1(p => ({ ...p, statut: e.target.value }))}>
              <option value="">Statut</option>
              {allUniqueStatuts.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter1.dateFrom} onChange={e => setFilter1(p => ({ ...p, dateFrom: e.target.value }))} />
            <input type="date" style={{ ...inputStyle, width: 130 }} value={filter1.dateTo}   onChange={e => setFilter1(p => ({ ...p, dateTo:   e.target.value }))} />
          </FilterRow>

          <DataTable
            columns={[
              { key: 'reference',  label: 'Référence',      render: r => <span style={{ fontWeight: 700, color: theme.info }}>{r.reference}</span> },
              { key: 'client',     label: 'Client' },
              { key: 'type',       label: 'Type',            render: r => r.type === 'Aucun document' ? 'Prestation' : r.type },
              { key: 'completion', label: '% Finalisation',  render: r => <ProgressBar pct={r.statut === 'Traité' ? 100 : r.completionPercentage ?? 0} /> },
              { key: 'etats',      label: 'États Dossiers',  render: r => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(r.dossierStates ?? [r.statut]).map((s: string, i: number) => <DossierStatutBadge key={i} statut={s} />)}
                </div>
              )},
              { key: 'statut',     label: 'Statut',          render: r => <DossierStatutBadge statut={r.statut} /> },
              { key: 'jours',      label: 'Jours',           render: r => <span style={{ fontWeight: 700, color: getPriorityColor(r.priorite) }}>{r.joursEnCours}j</span> },
              { key: 'gestionnaire', label: 'Gestionnaire',  render: r => r.gestionnaire === 'Non assigné' ? <span style={{ color: theme.textFaint, fontStyle: 'italic' }}>Non assigné</span> : r.gestionnaire },
              { key: 'date',       label: 'Date réception' },
            ]}
            rows={pagedUnifiedBordereaux}
          />
          <Pagination page={superAdminUnifiedPage} total={filteredUnifiedBordereaux.length} perPage={ITEMS_PER_PAGE} onChange={setSuperAdminUnifiedPage} />
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
        return null;
      case 'CHEF_EQUIPE':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <div style={{ marginBottom: '1.75rem' }}>
              <SectionHeading>Équipe</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {dashboardData.performance?.teamMembers?.map((m: any, i: number) => (
                  <InfoCard key={i}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: theme.text, fontSize: 14 }}>{m.fullName}</p>
                    <p style={{ margin: 0, color: theme.textMuted, fontSize: 12.5 }}>{m.role}</p>
                  </InfoCard>
                ))}
              </div>
            </div>
            <div>
              <SectionHeading>Charge de Travail Équipe</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                {dashboardData.performance?.teamWorkload?.map((w: any, i: number) => (
                  <InfoCard key={i}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: theme.textMuted }}>Utilisateur : <strong style={{ color: theme.text }}>{w.assignedToUserId}</strong></p>
                    <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>Charge : <strong style={{ color: theme.text }}>{w._count.id} dossiers</strong></p>
                  </InfoCard>
                ))}
              </div>
            </div>
          </div>
        );

      case 'GESTIONNAIRE':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <SectionHeading>Mes Tâches</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {dashboardData.personalTasks?.map((t: any, i: number) => (
                <InfoCard key={i}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: theme.text, fontSize: 14 }}>Bordereau {t.reference}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Client : {t.client?.name}</p>
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, color: theme.textMuted }}>Statut : <DossierStatutBadge statut={t.statut} /></p>
                  <p style={{ margin: 0, fontSize: 11.5, color: theme.textFaint }}>Reçu le {new Date(t.dateReception).toLocaleDateString('fr-FR')}</p>
                </InfoCard>
              ))}
            </div>
          </div>
        );

      case 'FINANCE':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <div style={{ marginBottom: '1.75rem' }}>
              <SectionHeading>Virements en Attente</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                {dashboardData.virements?.map((v: any, i: number) => (
                  <InfoCard key={i}>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, color: theme.text, fontSize: 14 }}>Virement {v.referenceBancaire}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Montant : <strong style={{ color: theme.text }}>{v.montant.toLocaleString()} €</strong></p>
                    <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Client : {v.bordereau?.client?.name}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: theme.textFaint }}>Dépôt le {new Date(v.dateDepot).toLocaleDateString('fr-FR')}</p>
                  </InfoCard>
                ))}
              </div>
            </div>
            <div>
              <SectionHeading>Statistiques Financières</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Virements Quotidiens',  value: dashboardData.financialStats?.dailyVirements,   color: theme.info },
                  { label: 'Virements Mensuels',    value: dashboardData.financialStats?.monthlyVirements,  color: theme.success },
                  { label: 'Montant Moyen',          value: `${(dashboardData.financialStats?.avgAmount ?? 0).toLocaleString()} €`, color: theme.primary },
                ].map(s => (
                  <div key={s.label} style={{ ...cardBase, padding: '18px 16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'BO':
      case 'BUREAU_ORDRE':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <SectionHeading>Bordereaux en Attente</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {dashboardData.pendingBordereaux?.map((b: any, i: number) => (
                <InfoCard key={i}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: theme.text, fontSize: 14 }}>Bordereau {b.reference}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Client : {b.client?.name}</p>
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, color: theme.textMuted }}>Statut : <DossierStatutBadge statut={b.statut} /></p>
                  <p style={{ margin: 0, fontSize: 11.5, color: theme.textFaint }}>Reçu le {new Date(b.dateReception).toLocaleDateString('fr-FR')}</p>
                </InfoCard>
              ))}
            </div>
          </div>
        );

      case 'SCAN_TEAM':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <SectionHeading>File d'Attente Scan</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {dashboardData.scanQueue?.map((b: any, i: number) => (
                <InfoCard key={i}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: theme.text, fontSize: 14 }}>Bordereau {b.reference}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Client : {b.client?.name}</p>
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, color: theme.textMuted }}>Statut : <DossierStatutBadge statut={b.statut} /></p>
                  <p style={{ margin: 0, fontSize: 11.5, color: theme.textFaint }}>Reçu le {new Date(b.dateReception).toLocaleDateString('fr-FR')}</p>
                </InfoCard>
              ))}
            </div>
          </div>
        );

      case 'CLIENT_SERVICE':
        return (
          <div style={{ marginTop: '1.75rem', fontFamily: theme.font }}>
            <SectionHeading>Réclamations Actives</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {dashboardData.activeReclamations?.map((r: any, i: number) => (
                <InfoCard key={i}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: theme.text, fontSize: 14 }}>Réclamation #{r.id}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: theme.textMuted }}>Client : {r.client?.name}</p>
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, color: theme.textMuted }}>Statut : <DossierStatutBadge statut={r.status} /></p>
                  <p style={{ margin: 0, fontSize: 11.5, color: theme.textFaint }}>Créée le {new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                </InfoCard>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div style={{ marginTop: '1.75rem', padding: '2.5rem 2rem', ...cardBase, textAlign: 'center', fontFamily: theme.font }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: theme.text }}>Tableau de Bord — {dashboardData.role}</h3>
            <p style={{ color: theme.textMuted, margin: 0, fontSize: 13.5 }}>Contenu spécifique au rôle en cours de développement.</p>
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
        <ModalShell title="Modifier le Statut" onClose={() => setStatusModifyModalOpen(false)} maxWidth={400}>
          <div style={{ background: theme.surfaceSubtle, border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd, padding: '12px 14px', marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: theme.textMuted }}>
              Dossier : <strong style={{ color: theme.text }}>{selectedDossier.reference}</strong><br />
              Client : <strong style={{ color: theme.text }}>{selectedDossier.client}</strong><br />
              Statut actuel : <strong style={{ color: theme.text }}>{selectedDossier.statut}</strong>
            </p>
          </div>
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
                  style={{ padding: '11px 14px', border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? theme.surfaceSubtle : theme.surface, fontSize: 13.5, fontWeight: 700, textAlign: 'left', opacity: disabled ? .5 : 1, transition: 'border-color .15s, background .15s', color: theme.text, fontFamily: theme.font }}
                >
                  {icons[s]} {s}
                  {disabled && <span style={{ fontSize: 11, color: theme.textFaint, marginLeft: 8, fontWeight: 500 }}>(Documents uniquement)</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStatusModifyModalOpen(false)} style={{ padding: '9px 18px', background: theme.surfaceMuted, border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: theme.textMuted, fontFamily: theme.font }}>Annuler</button>
          </div>
        </ModalShell>
      )}

      {/* PDF View modal (chef equipe style) */}
      {pdfViewModalOpen && selectedDossier && (
        <ModalShell title="Aperçu PDF du Dossier" onClose={() => { setPdfViewModalOpen(false); setDossierDetails(null); }} maxWidth={600}>
          {loadingDossierDetails ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
                {[
                  ['Référence', selectedDossier.reference],
                  ['Client',    selectedDossier.client],
                  ['Type',      selectedDossier.type],
                  ['Statut',    selectedDossier.statut],
                  ['Gestionnaire', selectedDossier.gestionnaire ?? 'Non assigné'],
                  ['Date',      selectedDossier.date],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 700, color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
                    <div style={{ padding: '8px 11px', background: theme.surfaceSubtle, border: `1px solid ${theme.divider}`, borderRadius: theme.radiusSm, fontSize: 13, color: theme.text, fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ margin: '0 0 9px', fontSize: 10.5, fontWeight: 700, color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Documents ({dossierDetails?.documents?.length ?? 0})
                </p>
                <div style={{ border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
                  {dossierDetails?.documents?.length > 0 ? dossierDetails.documents.map((doc: any, i: number) => (
                    <div key={doc.id ?? i} onClick={() => handleDocumentPDFView(doc.id, doc.fileName ?? doc.name)} style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: i < dossierDetails.documents.length - 1 ? `1px solid ${theme.divider}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i % 2 !== 0 ? theme.surfaceSubtle : theme.surface }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: theme.text }}>📄 {doc.fileName ?? doc.name ?? `Document ${i + 1}`}</p>
                        <p style={{ margin: 0, fontSize: 11, color: theme.textFaint }}>{doc.type ?? 'Non spécifié'} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Taille inconnue'}</p>
                      </div>
                      <ActionBtn color={theme.info} onClick={e => { e.stopPropagation(); handleDocumentPDFView(doc.id, doc.fileName ?? doc.name); }}>PDF</ActionBtn>
                    </div>
                  )) : (
                    <p style={{ padding: '22px', textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>Aucun document disponible</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button onClick={() => { setPdfViewModalOpen(false); setDossierDetails(null); }} style={{ padding: '9px 18px', background: theme.surfaceMuted, border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: theme.textMuted, fontFamily: theme.font }}>Fermer</button>
                <button onClick={() => { setPdfViewModalOpen(false); setStatusModifyModalOpen(true); }} style={{ padding: '9px 18px', background: theme.primary, border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: 'white', fontFamily: theme.font }}>Modifier le Statut</button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {/* PDF full view modal (super admin) */}
      {showSuperAdminPDFModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,26,.7)', backdropFilter: 'blur(2px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: theme.font }}>
          <div style={{ background: theme.surface, borderRadius: theme.radiusLg, width: '90%', height: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: theme.shadowLg, border: `1px solid ${theme.border}` }}>
            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${theme.divider}`, background: theme.surfaceSubtle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15.5, color: theme.text }}>{currentSuperAdminDossier?.reference} — {currentSuperAdminDossier?.client}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: theme.textMuted }}>Type : {currentSuperAdminDossier?.type} · Statut : {currentSuperAdminDossier?.statut}</p>
              </div>
              <button onClick={closeSuperAdminPDFModal} style={{ padding: '8px 17px', background: theme.danger, color: 'white', border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>Fermer</button>
            </div>
            <div style={{ flex: 1, padding: 18, background: theme.surfaceMuted }}>
              {currentSuperAdminPDFUrl
                ? <iframe src={currentSuperAdminPDFUrl} style={{ width: '100%', height: '100%', border: `1px solid ${theme.divider}`, borderRadius: theme.radiusMd, background: 'white' }} title="PDF" />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.textFaint }}>Chargement du PDF…</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Department explanation modal */}
      {showDepartmentExplanationModal && (
        <ModalShell title="Statistiques par Département — Comment ça marche ?" onClose={() => setShowDepartmentExplanationModal(false)} maxWidth={860} accentColor={theme.info}>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: theme.textMuted }}>
            <InfoBox color={theme.infoSoft} border={theme.infoBorder}>
              💡 Ces statistiques montrent <strong style={{ color: theme.text }}>où se trouvent les dossiers dans le processus de traitement</strong>, pas qui y travaille actuellement.
            </InfoBox>
            <h4 style={{ color: theme.info, marginTop: 22, marginBottom: 12, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>🔄 Parcours d'un dossier</h4>
            {[
              { step: '1', icon: '📥', title: 'Réception — Bureau d\'Ordre', statuts: 'EN_ATTENTE, A_SCANNER', desc: 'Le dossier vient d\'arriver. Le Bureau d\'Ordre l\'enregistre et le prépare pour la numérisation.' },
              { step: '2', icon: '📷', title: 'Numérisation — Service SCAN', statuts: 'SCAN_EN_COURS, SCANNE', desc: 'L\'équipe SCAN transforme les documents papier en fichiers numériques.' },
              { step: '3', icon: '👥', title: 'Attribution — Chef d\'Équipe', statuts: 'A_AFFECTER', desc: 'Le Chef d\'Équipe décide quel gestionnaire va traiter ce dossier.' },
              { step: '4', icon: '✍️', title: 'Traitement — Gestionnaire', statuts: 'ASSIGNE, EN_COURS, TRAITE', desc: 'Le gestionnaire analyse, vérifie et traite le dossier.' },
              { step: '5', icon: '💰', title: 'Paiement — Finance', statuts: 'PRET_VIREMENT, VIREMENT_EN_COURS, VIREMENT_EXECUTE', desc: 'Le service Finance effectue le virement bancaire pour rembourser le client.' },
              { step: '6', icon: '✅', title: 'Clôture', statuts: 'CLOTURE', desc: 'Le dossier est terminé et archivé.' },
            ].map(s => (
              <div key={s.step} style={{ padding: '11px 15px', borderLeft: `3px solid ${theme.info}`, background: theme.infoSoft, borderRadius: `0 ${theme.radiusSm}px ${theme.radiusSm}px 0`, marginBottom: 10 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, color: theme.text, fontSize: 13.5 }}>{s.icon} Étape {s.step} : {s.title}</p>
                <p style={{ margin: '0 0 3px', fontSize: 11.5, color: theme.info, fontWeight: 600 }}>Statuts : {s.statuts}</p>
                <p style={{ margin: 0, fontSize: 12, color: theme.textMuted }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => setShowDepartmentExplanationModal(false)} style={{ padding: '10px 30px', background: theme.info, color: 'white', border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, fontFamily: theme.font }}>Compris !</button>
          </div>
        </ModalShell>
      )}

      {/* Edit type modal */}
      {editModalOpen && (
        <ModalShell title="Modifier le Type de Dossier" onClose={() => setEditModalOpen(false)} maxWidth={420} accentColor={theme.violet}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {(['Prestation','Adhésion','Complément Dossier','Avenant','Réclamation'] as const).map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: selectedType === t ? `2px solid ${theme.violet}` : `1px solid ${theme.border}`, borderRadius: theme.radiusSm, cursor: 'pointer', background: selectedType === t ? theme.violetSoft : theme.surface, transition: 'border-color .15s, background .15s' }}>
                <input type="radio" name="docType" value={t} checked={selectedType === t} onChange={e => setSelectedType(e.target.value)} style={{ accentColor: theme.violet }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: theme.text }}>{t}</p>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setEditModalOpen(false)} style={{ padding: '9px 18px', background: theme.surfaceMuted, border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: theme.textMuted, fontFamily: theme.font }}>Annuler</button>
            <button onClick={() => { setEditModalOpen(false); alert('Type modifié'); loadChefEquipeData(); }} disabled={!selectedType} style={{ padding: '9px 18px', background: selectedType ? theme.violet : theme.borderStrong, border: 'none', borderRadius: theme.radiusSm, cursor: selectedType ? 'pointer' : 'not-allowed', fontSize: 13.5, fontWeight: 700, color: 'white', fontFamily: theme.font }}>Confirmer</button>
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
    <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: 520, margin: '4rem auto', fontFamily: theme.font }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: theme.dangerSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', margin: '0 auto 1.1rem' }}>🚨</div>
      <h3 style={{ color: theme.text, marginBottom: '0.4rem', fontSize: 17, fontWeight: 800 }}>Problème de Connexion ARS</h3>
      <div style={{ padding: '1rem 1.15rem', background: theme.dangerSoft, border: `1px solid ${theme.dangerBorder}`, borderRadius: theme.radiusMd, marginBottom: '1.5rem', textAlign: 'left' }}>
        <p style={{ margin: 0, color: theme.danger, fontWeight: 600, fontSize: 13.5 }}>{error}</p>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={fetchDashboardData} style={{ padding: '10px 20px', background: theme.primary, color: 'white', border: 'none', borderRadius: theme.radiusSm, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, fontFamily: theme.font }}>Réessayer</button>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: theme.surfaceMuted, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, fontFamily: theme.font }}>Recharger</button>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: 12.5, color: theme.textFaint }}>Si le problème persiste, contactez l'administrateur ARS</p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const isSuperAdminRole = dashboardData?.role === 'SUPER_ADMIN' || dashboardData?.role === 'ADMINISTRATEUR' || user?.role === 'RESPONSABLE_DEPARTEMENT';

  return (
    <>
      <style>{`@keyframes ars-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: isSuperAdminRole ? 0 : '1.25rem', background: isSuperAdminRole ? 'transparent' : theme.bg, minHeight: '100vh', fontFamily: theme.font }}>
        {/* Super Admin full-page content */}
        {isSuperAdminRole && renderSuperAdminContent()}

        <div style={{ padding: isSuperAdminRole ? '0 24px' : 0, maxWidth: 1440, margin: '0 auto' }}>
          {/* Shared content (all roles) */}
          {dashboardData && (
            <>
              {renderRoleSpecificContent()}

              {/* DossiersList — now includes everything the old "Dossiers Individuels"
                  table had (Type, % Finalisation, États Dossiers, colors) */}
              {['SUPER_ADMIN','ADMINISTRATEUR','CHEF_EQUIPE','RESPONSABLE_DEPARTEMENT'].includes(dashboardData?.role ?? '') && (
                <div style={{ marginTop: '1.75rem', marginBottom: '1.5rem', padding: '1.4rem 1.6rem', ...cardBase }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.1rem' }}>
                    <div style={{ width: 3, height: 18, backgroundColor: theme.success, marginRight: '0.7rem', borderRadius: 2 }}></div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: theme.text }}>Liste Dossiers</h3>
                  </div>
                  <DossiersList params={{}} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {renderModals()}
    </>
  );
};

// ─── Tiny helper components (file-local) ─────────────────────────────────────

const Row: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: theme.font }}>
    <span style={{ color: theme.textMuted }}>{label}</span>
    <span style={{ fontWeight: 700, color: color ?? theme.text }}>{value}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = theme.text, style: s }) => (
  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 9, fontFamily: theme.font, ...s }}>
    <span style={{ width: 3, height: 17, background: color === theme.success ? theme.success : theme.primary, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
    {children}
  </h3>
);

// Heading used inside role-specific panels (Équipe, Mes Tâches, etc.)
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: theme.text, textTransform: 'uppercase', letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 9 }}>
    <span style={{ width: 3, height: 15, background: theme.primary, borderRadius: 2, display: 'inline-block' }} />
    {children}
  </h3>
);

// Generic content card used across the simple role-specific list views
const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ ...cardBase, padding: '15px 17px', background: theme.surfaceSubtle }}>{children}</div>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ textAlign: 'center', padding: '32px 20px', color: theme.textFaint, fontSize: 13.5, gridColumn: '1 / -1', fontFamily: theme.font }}>
    <div style={{ fontSize: 32, marginBottom: 8, opacity: .6 }}>📋</div>
    <p style={{ margin: 0 }}>{children}</p>
  </div>
);

const ActionBtn: React.FC<{ color: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }> = ({ color, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '5px 11px', background: color, color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: theme.font, letterSpacing: '.01em' }}>{children}</button>
);

const InfoBox: React.FC<{ color: string; border: string; children: React.ReactNode }> = ({ color, border, children }) => (
  <div style={{ padding: '11px 15px', background: color, border: `1px solid ${border}`, borderRadius: theme.radiusMd, fontSize: 13.5, fontFamily: theme.font }}>{children}</div>
);

export default EnhancedDashboard;