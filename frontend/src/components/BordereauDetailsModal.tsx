import React, { useState, useEffect, useCallback, useMemo, CSSProperties } from 'react';
import { Modal, Progress, Tag, Table, Empty, message } from 'antd';
import { fetchBordereau } from '../services/bordereauxService';

interface BordereauDetailsModalProps {
  bordereauId: string;
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Design tokens
// ============================================================================
const T = {
  bg: '#ffffff',
  bgSubtle: '#f8f9fb',
  border: '#e8eaed',
  textPrimary: '#14181f',
  textSecondary: '#5f6b7a',
  textMuted: '#9aa5b1',
  brand: '#2563eb',
  brandBg: '#eaf1fe',
  green: '#0f9d58',
  greenBg: '#e6f6ec',
  orange: '#c77700',
  orangeBg: '#fff4e0',
  red: '#d33b3b',
  redBg: '#fdeaea',
  gray: '#6b7280',
  grayBg: '#f1f2f4',
  radius: 10,
  radiusSm: 6,
  shadow: '0 1px 2px rgba(16,24,40,0.04)',
} as const;

const sectionCard: CSSProperties = {
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
  padding: '18px 20px',
  marginBottom: 16,
  boxShadow: T.shadow,
};

const sectionTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: T.textPrimary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const fieldGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: '14px 20px',
};

const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: T.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 3,
};

const fieldValue: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: T.textPrimary,
  lineHeight: 1.4,
  wordBreak: 'break-word',
};

const noteText: CSSProperties = {
  fontSize: 12,
  color: T.textMuted,
  fontStyle: 'italic',
  marginTop: 2,
};

const pill = (bg: string, fg: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: bg,
  color: fg,
  whiteSpace: 'nowrap',
});

// ============================================================================
// Static label / color maps
// ============================================================================
const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  A_SCANNER: 'À scanner',
  SCAN_EN_COURS: 'Scan en cours',
  SCANNE: 'Scanné',
  A_AFFECTER: 'À affecter',
  ASSIGNE: 'Assigné',
  EN_COURS: 'En cours',
  TRAITE: 'Traité',
  PRET_VIREMENT: 'Prêt virement',
  VIREMENT_EN_COURS: 'Virement en cours',
  VIREMENT_EXECUTE: 'Virement exécuté',
  VIREMENT_REJETE: 'Virement rejeté',
  CLOTURE: 'Clôturé',
  PAYE: 'Payé',
  EN_DIFFICULTE: 'En difficulté',
  PARTIEL: 'Partiel',
  MIS_EN_INSTANCE: 'Mis en instance',
  REJETE: 'Rejeté',
  RETOURNE: 'Retourné',
};

const STATUT_STYLE: Record<string, [string, string]> = {
  EN_ATTENTE: [T.grayBg, T.gray],
  A_SCANNER: [T.orangeBg, T.orange],
  SCAN_EN_COURS: [T.brandBg, T.brand],
  SCANNE: [T.brandBg, T.brand],
  A_AFFECTER: ['#f2e9fe', '#7c3aed'],
  ASSIGNE: ['#f2e9fe', '#7c3aed'],
  EN_COURS: [T.orangeBg, T.orange],
  TRAITE: [T.greenBg, T.green],
  PRET_VIREMENT: ['#e0f7f9', '#0891a1'],
  VIREMENT_EN_COURS: ['#e0f7f9', '#0891a1'],
  VIREMENT_EXECUTE: [T.greenBg, T.green],
  VIREMENT_REJETE: [T.redBg, T.red],
  CLOTURE: [T.grayBg, T.gray],
  PAYE: [T.greenBg, T.green],
  EN_DIFFICULTE: [T.redBg, T.red],
  PARTIEL: [T.orangeBg, T.orange],
  MIS_EN_INSTANCE: [T.orangeBg, T.orange],
  REJETE: [T.redBg, T.red],
  RETOURNE: ['#ffe4d6', '#c2410c'],
};

const VIREMENT_META: Record<string, { label: string; bg: string; fg: string; icon: string }> = {
  EXECUTE: { label: 'Exécuté', bg: T.greenBg, fg: T.green, icon: '✅' },
  REJETE: { label: 'Rejeté', bg: T.redBg, fg: T.red, icon: '❌' },
  EN_COURS_EXECUTION: { label: "En cours d'exécution", bg: T.orangeBg, fg: T.orange, icon: '🔄' },
  EN_COURS_VALIDATION: { label: 'En attente de validation', bg: T.brandBg, fg: T.brand, icon: '⏳' },
  NON_EXECUTE: { label: 'Non exécuté', bg: T.grayBg, fg: T.gray, icon: '⏳' },
  EXECUTE_PARTIELLEMENT: { label: 'Exécuté partiellement', bg: T.orangeBg, fg: T.orange, icon: '⚠️' },
  BLOQUE: { label: 'Bloqué', bg: T.redBg, fg: T.red, icon: '⛔' },
  VIREMENT_NON_VALIDE: { label: 'Non validé', bg: T.redBg, fg: T.red, icon: '❌' },
  VIREMENT_DEPOSE: { label: 'Déposé', bg: T.brandBg, fg: T.brand, icon: '📤' },
  VIREMENT_AUTORISE: { label: 'Autorisé', bg: '#e0f7f9', fg: '#0891a1', icon: '🔓' },
};

const BS_ETAT_META: Record<string, [string, string, string]> = {
  VALIDATED: [T.greenBg, T.green, 'Validé'],
  REJECTED: [T.redBg, T.red, 'Rejeté'],
  IN_PROGRESS: [T.brandBg, T.brand, 'En cours'],
  TRAITE: [T.greenBg, T.green, 'Traité'],
};

const DOC_STATUS_META: Record<string, [string, string, string]> = {
  UPLOADED: [T.brandBg, T.brand, 'Uploadé'],
  EN_COURS: [T.orangeBg, T.orange, 'En cours'],
  SCANNE: [T.brandBg, T.brand, 'Scanné'],
  TRAITE: [T.greenBg, T.green, 'Traité'],
  REJETE: [T.redBg, T.red, 'Rejeté'],
  RETOUR_ADMIN: ['#ffe4d6', '#c2410c', 'Retour admin'],
  RETOURNER_AU_SCAN: [T.orangeBg, T.orange, 'Retourner au scan'],
};

type SLAStatus = 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'UNKNOWN';
const SLA_META: Record<SLAStatus, { label: string; bg: string; fg: string }> = {
  ON_TIME: { label: '✓ Respecté', bg: T.greenBg, fg: T.green },
  AT_RISK: { label: '▲ À risque', bg: T.orangeBg, fg: T.orange },
  OVERDUE: { label: '● En retard', bg: T.redBg, fg: T.red },
  UNKNOWN: { label: 'Non déterminé', bg: T.grayBg, fg: T.gray },
};

const FINISHED_STATUTS = ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'];

// ============================================================================
// Safe formatting helpers
// ============================================================================
const safeDate = (value?: string | Date | null, withTime = false): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return withTime ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
};
const safeNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const safeText = (value: any, fallback = 'Non renseigné'): string =>
  value === null || value === undefined || value === '' ? fallback : String(value);
const safeAmount = (value: any): string =>
  value === null || value === undefined ? '—' : `${safeNumber(value).toFixed(2)} DT`;

const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000);

const calculateSLAStatus = (b: any): SLAStatus => {
  if (!b?.dateReception || !b?.delaiReglement) return 'UNKNOWN';
  const reception = new Date(b.dateReception);
  if (isNaN(reception.getTime())) return 'UNKNOWN';
  const delai = safeNumber(b.delaiReglement);
  if (delai <= 0) return 'UNKNOWN';
  const isFrozen = ['VIREMENT_EXECUTE', 'PAYE', 'CLOTURE'].includes(b.statut);
  const freezeDate = b.dateExecutionVirement || b.dateCloture;
  const effectiveEndDate = isFrozen && freezeDate ? new Date(freezeDate) : new Date();
  const daysElapsed = (effectiveEndDate.getTime() - reception.getTime()) / 86400000;
  const percentElapsed = (daysElapsed / delai) * 100;
  if (percentElapsed > 100) return 'OVERDUE';
  if (percentElapsed > 80) return 'AT_RISK';
  return 'ON_TIME';
};

const getDaysInfo = (b: any): { elapsed: number | null; remaining: number | null } => {
  if (!b?.dateReception || !b?.delaiReglement) return { elapsed: null, remaining: null };
  const reception = new Date(b.dateReception);
  if (isNaN(reception.getTime())) return { elapsed: null, remaining: null };
  const delai = safeNumber(b.delaiReglement);
  const elapsed = Math.floor((Date.now() - reception.getTime()) / 86400000);
  return { elapsed, remaining: delai - elapsed };
};

const getScanStatusMeta = (status: string): [string, string, string] => {
  switch (status) {
    case 'NON_SCANNE': return [T.orangeBg, T.orange, 'Non scanné'];
    case 'SCAN_EN_COURS': return [T.brandBg, T.brand, 'Scan en cours'];
    case 'SCAN_FINALISE': return [T.greenBg, T.green, 'Scan finalisé'];
    default: return [T.grayBg, T.gray, status || '—'];
  }
};

// ---- Client-side fallback for durée de traitement -------------------------
// The backend already computes this correctly in the normal case. This is a
// defensive fallback ONLY: if the backend still returns null (e.g. an edge
// case not covered by the fix above) but we have enough raw data (dateCloture
// + dateReception + a finished statut) to compute it ourselves, show that
// value instead of a dead-end "En attente" — clearly marked as estimated.
const computeDureeTraitementFallback = (b: any): { days: number; status: 'GREEN' | 'RED'; estimated: true } | null => {
  if (!b) return null;
  if (b.dureeTraitement !== null && b.dureeTraitement !== undefined) return null; // backend value exists, no fallback needed
  if (!FINISHED_STATUTS.includes(b.statut)) return null;
  const closeDate = b.dateCloture || b.dateReelleCloture;
  if (!closeDate || !b.dateReception) return null;
  const reception = new Date(b.dateReception);
  const cloture = new Date(closeDate);
  if (isNaN(reception.getTime()) || isNaN(cloture.getTime())) return null;
  const days = daysBetween(reception, cloture);
  const status: 'GREEN' | 'RED' = days <= safeNumber(b.delaiReglement, Infinity) ? 'GREEN' : 'RED';
  return { days, status, estimated: true };
};

// Fallback "date limite de traitement" = dateReception + delaiReglement,
// shown only when the raw field isn't set — clearly marked as estimated.
const computeDateLimiteFallback = (b: any): string | null => {
  if (!b || b.dateLimiteTraitement || !b.dateReception || !b.delaiReglement) return null;
  const d = new Date(b.dateReception);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + safeNumber(b.delaiReglement));
  return d.toLocaleDateString('fr-FR');
};

// ============================================================================
// Small reusable presentational pieces
// ============================================================================
const Field: React.FC<{ label: string; children: React.ReactNode; note?: string; full?: boolean }> = ({ label, children, note, full }) => (
  <div style={full ? { gridColumn: '1 / -1' } : undefined}>
    <div style={fieldLabel}>{label}</div>
    <div style={fieldValue}>{children}</div>
    {note && <div style={noteText}>{note}</div>}
  </div>
);

const Pill: React.FC<{ bg: string; fg: string; children: React.ReactNode }> = ({ bg, fg, children }) => (
  <span style={pill(bg, fg)}>{children}</span>
);

const SectionEmpty: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ padding: '28px 0', textAlign: 'center' }}>
    <Empty description={<span style={{ color: T.textMuted, fontSize: 13 }}>{text}</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  </div>
);

const renderDureeBadge = (
  days: number | null | undefined,
  status?: string | null,
  warning?: string | null,
  estimated?: boolean
) => {
  if (days === null || days === undefined) return <Pill bg={T.grayBg} fg={T.gray}>En attente</Pill>;
  const [bg, fg] = status === 'GREEN' ? [T.greenBg, T.green] : status === 'RED' ? [T.redBg, T.red] : [T.orangeBg, T.orange];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Pill bg={bg} fg={fg}>{days} jour{days !== 1 ? 's' : ''}</Pill>
      {estimated && <span title="Valeur estimée à partir des dates disponibles" style={{ cursor: 'help', fontSize: 13 }}>≈</span>}
      {warning && <span title={warning} style={{ cursor: 'help', fontSize: 13 }}>⚠️</span>}
    </span>
  );
};

// ============================================================================
// Component
// ============================================================================
const BordereauDetailsModal: React.FC<BordereauDetailsModalProps> = ({ bordereauId, open, onClose }) => {
  const [bordereau, setBordereau] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'dates' | 'sla' | 'affectation' | 'virement' | 'documents' | 'bs'>('general');

  const loadBordereau = useCallback(async () => {
    if (!bordereauId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBordereau(bordereauId);
      setBordereau(data ?? null);
    } catch (error) {
      console.error('Error loading bordereau:', error);
      setLoadError('Erreur lors du chargement du bordereau');
      message.error('Erreur lors du chargement du bordereau');
      setBordereau(null);
    } finally {
      setLoading(false);
    }
  }, [bordereauId]);

  useEffect(() => {
    if (!open || !bordereauId) return;
    let cancelled = false;
    setActiveTab('general');
    (async () => {
      setLoading(true);
      setLoadError(null);
      setBordereau(null);
      try {
        const data = await fetchBordereau(bordereauId);
        if (!cancelled) setBordereau(data ?? null);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading bordereau:', error);
        setLoadError('Erreur lors du chargement du bordereau');
        message.error('Erreur lors du chargement du bordereau');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bordereauId, open]);

  // ---- Derived data ----
  const bulletins: any[] = Array.isArray(bordereau?.bulletinSoins) ? bordereau.bulletinSoins : [];
  const documents: any[] = Array.isArray(bordereau?.documents) ? bordereau.documents : [];
  const ordresVirement: any[] = Array.isArray(bordereau?.ordresVirement) ? bordereau.ordresVirement : [];
  const latestOV = ordresVirement.length > 0 ? ordresVirement[0] : null;

  // ✅ FIX: BS count and document count are DIFFERENT things and must not
  // share a fallback. `nombreBS` is a bulletin count (real or imported
  // metadata); it must never be used to estimate the document count.
  const bsRecordCount = bulletins.length;
  const displayedBsCount = bsRecordCount || safeNumber(bordereau?.nombreBS, 0);
  const bsCountIsMetadataOnly = bsRecordCount === 0 && displayedBsCount > 0;

  const documentCount = documents.length || safeNumber(bordereau?._count?.documents, 0);

  const progressData = useMemo(() => {
    if (!bordereau) return null;
    if (bulletins.length > 0) {
      const total = bulletins.length;
      const traites = bulletins.filter((bs) => bs.etat === 'VALIDATED' || bs.etat === 'TRAITE').length;
      const rejetes = bulletins.filter((bs) => bs.etat === 'REJECTED').length;
      const enCours = Math.max(total - traites - rejetes, 0);
      const completionRate = total > 0 ? Math.round(((traites + rejetes) / total) * 100) : 0;
      let scanStatus = 'NON_SCANNE';
      if (completionRate > 0 && completionRate < 100) scanStatus = 'SCAN_EN_COURS';
      if (completionRate === 100) scanStatus = 'SCAN_FINALISE';
      return { total, traites, rejetes, enCours, completionRate, scanStatus };
    }
    // No detailed BS records — fall back to stored progress metadata, but
    // if the bordereau is already in a finished statut, reflect that as 100%
    // rather than a misleading 0%.
    const isFinished = FINISHED_STATUTS.includes(bordereau.statut);
    const total = displayedBsCount;
    const storedRate = safeNumber(bordereau.completionRate, 0);
    const completionRate = isFinished ? 100 : storedRate;
    return {
      total,
      traites: isFinished ? total : 0,
      rejetes: 0,
      enCours: isFinished ? 0 : total,
      completionRate,
      scanStatus: isFinished ? 'SCAN_FINALISE' : (bordereau.scanStatus || 'NON_SCANNE'),
    };
  }, [bordereau, bulletins, displayedBsCount]);

  const slaStatus = useMemo(() => calculateSLAStatus(bordereau), [bordereau]);
  const daysInfo = useMemo(() => getDaysInfo(bordereau), [bordereau]);
  const dureeTraitementFallback = useMemo(() => computeDureeTraitementFallback(bordereau), [bordereau]);
  const dateLimiteFallback = useMemo(() => computeDateLimiteFallback(bordereau), [bordereau]);

  const progressColor = (percentage: number) => {
    if (percentage >= 100) return T.green;
    if (percentage >= 75) return T.brand;
    if (percentage >= 50) return T.orange;
    return T.red;
  };

  const bsColumns = [
    { title: 'N° BS', dataIndex: 'numBs', key: 'numBs', render: (v: string) => safeText(v, '—') },
    { title: 'Assuré', dataIndex: 'nomAssure', key: 'nomAssure', render: (v: string) => safeText(v, '—') },
    { title: 'Bénéficiaire', dataIndex: 'nomBeneficiaire', key: 'nomBeneficiaire', render: (v: string) => safeText(v, '—') },
    { title: 'Acte', dataIndex: 'acte', key: 'acte', render: (v: string) => safeText(v, '—') },
    { title: 'Montant', dataIndex: 'montant', key: 'montant', render: (v: number) => safeAmount(v) },
    { title: 'Total PEC', dataIndex: 'totalPec', key: 'totalPec', render: (v: number) => safeAmount(v) },
    { title: 'Date soin', dataIndex: 'dateSoin', key: 'dateSoin', render: (v: string) => safeDate(v) },
    {
      title: 'État', dataIndex: 'etat', key: 'etat',
      render: (v: string) => {
        const meta = BS_ETAT_META[v];
        return <Pill bg={meta?.[0] || T.grayBg} fg={meta?.[1] || T.gray}>{meta?.[2] || v || '—'}</Pill>;
      },
    },
  ];

  const documentColumns = [
    { title: 'Nom', dataIndex: 'name', key: 'name', render: (v: string) => safeText(v, '—') },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => safeText(v, '—') },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const meta = v ? DOC_STATUS_META[v] : null;
        return <Pill bg={meta?.[0] || T.grayBg} fg={meta?.[1] || T.gray}>{meta?.[2] || v || '—'}</Pill>;
      },
    },
    { title: 'Uploadé le', dataIndex: 'uploadedAt', key: 'uploadedAt', render: (v: string) => safeDate(v, true) },
    { title: 'Uploadé par', dataIndex: 'uploader', key: 'uploader', render: (u: any) => safeText(u?.fullName, '—') },
    { title: 'Assigné à', dataIndex: 'assignedTo', key: 'assignedTo', render: (u: any) => safeText(u?.fullName, 'Non assigné') },
  ];

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: 'general', label: '📋 Général' },
    { key: 'dates', label: '📅 Dates & Suivi' },
    { key: 'sla', label: '⏱️ SLA & Délais' },
    { key: 'affectation', label: '👥 Affectation' },
    { key: 'virement', label: '💰 Virement' },
    { key: 'documents', label: `📄 Documents (${documentCount})` },
    { key: 'bs', label: `📝 Bulletins de Soin (${displayedBsCount})` },
  ];

  // ============================================================================
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1080}
      destroyOnClose
      footer={null}
      closeIcon={<span style={{ fontSize: 16, color: T.textSecondary }}>✕</span>}
      styles={{
        body: { padding: 0, background: T.bgSubtle, maxHeight: '82vh', overflowY: 'auto' },
        content: { padding: 0, borderRadius: 14, overflow: 'hidden' },
      }}
    >
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, margin: '0 auto 16px', borderRadius: '50%',
            border: `3px solid ${T.border}`, borderTopColor: T.brand,
            animation: 'bordereau-modal-spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes bordereau-modal-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: T.textSecondary, fontSize: 14 }}>Chargement du bordereau…</div>
        </div>
      ) : loadError ? (
        <div style={{ padding: 48 }}><SectionEmpty text={loadError} /></div>
      ) : !bordereau ? (
        <div style={{ padding: 48 }}><SectionEmpty text="Bordereau non trouvé" /></div>
      ) : (
        <div>
          {/* ---------- Header ---------- */}
          <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '20px 28px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, lineHeight: 1.3 }}>
                  Bordereau {safeText(bordereau.reference, '')}
                </div>
                <div style={{ fontSize: 14, color: T.textSecondary, marginTop: 2 }}>
                  {safeText(bordereau.client?.name, 'Client inconnu')}
                </div>
              </div>
              <button
                onClick={loadBordereau}
                disabled={loading}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  background: T.bg, color: T.textSecondary,
                  border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                  cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0,
                }}
              >
                ↻ Rafraîchir
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(() => {
                const [bg, fg] = STATUT_STYLE[bordereau.statut] || [T.grayBg, T.gray];
                return <Pill bg={bg} fg={fg}>{STATUT_LABELS[bordereau.statut] || bordereau.statut}</Pill>;
              })()}
              <Pill bg={SLA_META[slaStatus].bg} fg={SLA_META[slaStatus].fg}>{SLA_META[slaStatus].label}</Pill>
              {(() => {
                const [bg, fg, label] = getScanStatusMeta(progressData?.scanStatus || 'NON_SCANNE');
                return <Pill bg={bg} fg={fg}>🏷️ {label}</Pill>;
              })()}
              {bordereau.archived && <Pill bg={T.grayBg} fg={T.gray}>📦 Archivé</Pill>}
            </div>
          </div>

          {/* ---------- KPI strip ---------- */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 1, background: T.border, borderBottom: `1px solid ${T.border}`,
          }}>
            {[
              { label: 'Nombre de BS', value: displayedBsCount },
              { label: 'Documents', value: documentCount },
              { label: 'Jours écoulés', value: daysInfo.elapsed ?? '—' },
              {
                label: daysInfo.remaining !== null && daysInfo.remaining < 0 ? 'Jours de retard' : 'Jours restants',
                value: daysInfo.remaining !== null ? Math.abs(daysInfo.remaining) : '—',
                color: daysInfo.remaining !== null && daysInfo.remaining < 0
                  ? T.red
                  : daysInfo.remaining !== null && daysInfo.remaining <= 3
                  ? T.orange
                  : T.textPrimary,
              },
            ].map((kpi, i) => (
              <div key={i} style={{ background: T.bg, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color || T.textPrimary }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          {/* ---------- Progress ---------- */}
          {progressData && (
            <div style={{ background: T.bg, padding: '16px 28px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>📈 Progression</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{progressData.completionRate}%</span>
              </div>
              <Progress
                percent={progressData.completionRate}
                strokeColor={progressColor(progressData.completionRate)}
                trailColor={T.grayBg}
                showInfo={false}
                strokeWidth={8}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill bg={T.greenBg} fg={T.green}>Traités: {progressData.traites}</Pill>
                <Pill bg={T.redBg} fg={T.red}>Rejetés: {progressData.rejetes}</Pill>
                <Pill bg={T.brandBg} fg={T.brand}>En cours: {progressData.enCours}</Pill>
              </div>
            </div>
          )}

          {/* ---------- Tab bar ---------- */}
          <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '0 28px', display: 'flex', gap: 4, overflowX: 'auto' }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 14px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? T.brand : T.textSecondary, background: 'transparent', border: 'none',
                    borderBottom: isActive ? `2px solid ${T.brand}` : '2px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ---------- Tab content ---------- */}
          <div style={{ padding: '20px 28px 28px' }}>
            {activeTab === 'general' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Informations générales</div>
                <div style={fieldGrid}>
                  <Field label="Référence">{safeText(bordereau.reference)}</Field>
                  <Field label="Client">{safeText(bordereau.client?.name)}</Field>
                  <Field label="Contrat">{safeText(bordereau.contract?.clientName)}</Field>
                  <Field label="Délai de règlement">
                    {bordereau.delaiReglement != null ? `${bordereau.delaiReglement} jours` : '—'}
                  </Field>
                  <Field
                    label="Nombre de BS"
                    note={bsCountIsMetadataOnly ? "Valeur importée — aucun détail individuel enregistré" : undefined}
                  >
                    {displayedBsCount}
                  </Field>
                  <Field label="Nombre de documents">{documentCount}</Field>
                  <Field label="Priorité">{safeText(bordereau.priority, '—')}</Field>
                  <Field label="Archivé">{bordereau.archived ? 'Oui' : 'Non'}</Field>
                </div>
              </div>
            )}

            {activeTab === 'dates' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Dates & Suivi</div>
                <div style={fieldGrid}>
                  <Field label="Date réception BO">{safeDate(bordereau.dateReceptionBO, true)}</Field>
                  <Field label="Date réception">{safeDate(bordereau.dateReception)}</Field>
                  <Field label="Date début scan">{safeDate(bordereau.dateDebutScan, true)}</Field>
                  <Field label="Date fin scan">{safeDate(bordereau.dateFinScan, true)}</Field>
                  <Field label="Date réception santé">{safeDate(bordereau.dateReceptionSante, true)}</Field>
                  <Field label="Date réception équipe santé">{safeDate(bordereau.dateReceptionEquipeSante, true)}</Field>
                  <Field label="Date affectation">{safeDate(bordereau.dateAffectation, true)}</Field>
                  <Field
                    label="Date limite de traitement"
                    note={dateLimiteFallback ? 'Estimée (réception + délai contractuel)' : undefined}
                  >
                    {bordereau.dateLimiteTraitement ? safeDate(bordereau.dateLimiteTraitement) : (dateLimiteFallback || '—')}
                  </Field>
                  <Field label="Date clôture">{safeDate(bordereau.dateCloture, true)}</Field>
                  <Field label="Date réelle de clôture">{safeDate(bordereau.dateReelleCloture, true)}</Field>
                  <Field label="Date dépôt virement">{safeDate(bordereau.dateDepotVirement, true)}</Field>
                  <Field label="Date exécution virement">{safeDate(bordereau.dateExecutionVirement, true)}</Field>
                  <Field label="Créé le">{safeDate(bordereau.createdAt, true)}</Field>
                  <Field label="Dernière mise à jour">{safeDate(bordereau.updatedAt, true)}</Field>
                </div>
                {!bordereau.dateDebutScan && FINISHED_STATUTS.includes(bordereau.statut) && (
                  <div style={{ ...noteText, marginTop: 14, fontSize: 12.5 }}>
                    ℹ️ Ce bordereau ne comporte pas de trace du processus de scan/affectation — il a probablement été créé ou importé directement au statut « {STATUT_LABELS[bordereau.statut] || bordereau.statut} ».
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sla' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>SLA & Délais</div>
                <div style={fieldGrid}>
                  <Field label="Statut SLA">
                    <Pill bg={SLA_META[slaStatus].bg} fg={SLA_META[slaStatus].fg}>{SLA_META[slaStatus].label}</Pill>
                  </Field>
                  <Field label="Délai contractuel">
                    {bordereau.delaiReglement != null ? `${bordereau.delaiReglement} jours` : '—'}
                  </Field>
                  <Field label="Jours écoulés">{daysInfo.elapsed ?? '—'}</Field>
                  <Field label="Jours restants">{daysInfo.remaining === null ? '—' : daysInfo.remaining}</Field>
                  <Field label="Durée de traitement">
                    {bordereau.dureeTraitement !== null && bordereau.dureeTraitement !== undefined
                      ? renderDureeBadge(bordereau.dureeTraitement, bordereau.dureeTraitementStatus, bordereau.dureeTraitementWarning)
                      : dureeTraitementFallback
                        ? renderDureeBadge(dureeTraitementFallback.days, dureeTraitementFallback.status, null, true)
                        : renderDureeBadge(null)}
                  </Field>
                  <Field label="Durée de règlement">
                    {renderDureeBadge(bordereau.dureeReglement, bordereau.dureeReglementStatus)}
                  </Field>
                  <Field label="Jours de traitement (enregistré)">{safeText(bordereau.nombreJourTraitement, '—')}</Field>
                </div>
              </div>
            )}

            {activeTab === 'affectation' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Affectation</div>
                <div style={fieldGrid}>
                  <Field label="Gestionnaire actuel">
                    {bordereau.currentHandler
                      ? `${bordereau.currentHandler.fullName} (${bordereau.currentHandler.role})`
                      : 'Non assigné'}
                  </Field>
                  <Field label="Assigné à">{bordereau.assignedToUser?.fullName || 'Non assigné'}</Field>
                  <Field label="Chef d'équipe / Gestionnaire Senior (contrat)">
                    {bordereau.contract?.teamLeader
                      ? `${bordereau.contract.teamLeader.fullName} (${bordereau.contract.teamLeader.role})`
                      : 'Non défini'}
                  </Field>
                  <Field label="Gestionnaire du contrat">{bordereau.contract?.assignedManager?.fullName || 'Non défini'}</Field>
                  <Field label="Chargé de compte">{bordereau.chargeCompte?.fullName || 'Non défini'}</Field>
                  <Field label="Créé par">{bordereau.createdByUser?.fullName || 'N/A'}</Field>
                </div>
              </div>
            )}

            {activeTab === 'virement' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Virement</div>
                {latestOV ? (
                  <div style={fieldGrid}>
                    <Field label="Référence OV">{safeText(latestOV.reference)}</Field>
                    <Field label="État virement">
                      {(() => {
                        const meta = VIREMENT_META[latestOV.etatVirement];
                        return (
                          <Pill bg={meta?.bg || T.grayBg} fg={meta?.fg || T.gray}>
                            {meta?.icon} {meta?.label || latestOV.etatVirement}
                          </Pill>
                        );
                      })()}
                    </Field>
                    <Field label="Statut global">{safeText(latestOV.statutGlobal)}</Field>
                    <Field label="Montant total">{latestOV.montantTotal != null ? safeAmount(latestOV.montantTotal) : '—'}</Field>
                    <Field label="Nombre d'adhérents">{safeText(latestOV.nombreAdherents, '—')}</Field>
                    <Field label="Date de création">{safeDate(latestOV.dateCreation, true)}</Field>
                    <Field label="Date de traitement">{safeDate(latestOV.dateTraitement, true)}</Field>
                    <Field label="Date état final">{safeDate(latestOV.dateEtatFinal, true)}</Field>
                    <Field label="Commentaire" full>{safeText(latestOV.commentaire, 'Aucun commentaire')}</Field>
                  </div>
                ) : bordereau.virement ? (
                  <div style={fieldGrid}>
                    <Field label="Référence bancaire">{safeText(bordereau.virement.referenceBancaire)}</Field>
                    <Field label="Montant">{safeAmount(bordereau.virement.montant)}</Field>
                    <Field label="Date de dépôt">{safeDate(bordereau.virement.dateDepot)}</Field>
                    <Field label="Date d'exécution">{safeDate(bordereau.virement.dateExecution)}</Field>
                    <Field label="Confirmé">{bordereau.virement.confirmed ? 'Oui' : 'Non'}</Field>
                  </div>
                ) : (
                  <SectionEmpty text="Pas de virement associé à ce bordereau" />
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Documents ({documentCount})</div>
                {documents.length > 0 ? (
                  <Table
                    rowKey="id"
                    columns={documentColumns as any}
                    dataSource={documents}
                    size="small"
                    pagination={{ pageSize: 5, size: 'small' }}
                    scroll={{ x: true }}
                  />
                ) : (
                  <SectionEmpty text="Aucun document numérisé pour ce bordereau" />
                )}
              </div>
            )}

            {activeTab === 'bs' && (
              <div style={sectionCard}>
                <div style={sectionTitle}>Bulletins de Soin ({displayedBsCount})</div>
                {bulletins.length > 0 ? (
                  <Table
                    rowKey="id"
                    columns={bsColumns as any}
                    dataSource={bulletins}
                    size="small"
                    pagination={{ pageSize: 5, size: 'small' }}
                    scroll={{ x: true }}
                  />
                ) : bsCountIsMetadataOnly ? (
                  <SectionEmpty text={`${displayedBsCount} bulletin(s) de soin enregistré(s) (donnée importée) — aucun détail individuel disponible`} />
                ) : (
                  <SectionEmpty text="Aucun bulletin de soin pour ce bordereau" />
                )}
              </div>
            )}
          </div>

          {/* ---------- Footer ---------- */}
          <div style={{ background: T.bg, borderTop: `1px solid ${T.border}`, padding: '14px 28px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 20px', fontSize: 14, fontWeight: 600,
                background: T.brand, color: '#fff', border: 'none',
                borderRadius: T.radiusSm, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BordereauDetailsModal;