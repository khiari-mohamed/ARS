/**
 * 🎯 CENTRALIZED & UNIFIED SLA CALCULATOR
 *
 * Implements the four distinct SLA indicators required by the business:
 *
 *   1) SLA de scan               = Date fin de Scannérisation − Date de réception
 *   2) SLA de traitement         = Date de finalisation du traitement (dateCloture) − Date de réception
 *   3) SLA de règlement BO       = Date d'exécution du virement − Date de réception
 *   4) SLA de règlement Finance  = Date d'exécution du virement − Date de finalisation du traitement (dateCloture)
 *
 * Each metric:
 *  - is NOT applicable while its start date isn't known yet (e.g. Finance SLA
 *    can't start until traitement is finalised — dateCloture must exist)
 *  - keeps running against "now" while its end-milestone hasn't happened yet
 *  - FREEZES permanently once the end-milestone date is known
 *
 * Legacy exports (calculateSLA / isSLACompliant / isSLAAtRisk / isSLABreached /
 * getSLAStatus) are kept for backward compatibility. They now map 1:1 onto
 * "SLA de règlement BO" — which is exactly what the app used to compute as
 * "the" SLA before this fix. No caller of those functions needs to change.
 */

export type SLAColor = 'GREEN' | 'ORANGE' | 'RED';

export interface SingleSLAResult {
  /** false only when the start date required for this SLA isn't known yet */
  applicable: boolean;
  /** true once the end-milestone happened and the clock is frozen */
  isFrozen: boolean;
  /** true when percentElapsed > 100 */
  isOverdue: boolean;
  daysElapsed: number | null;
  daysRemaining: number | null;
  percentElapsed: number | null;
  statusColor: SLAColor | null;
  startDate: Date | null;
  /** date the clock froze at, or null if still running / not applicable */
  endDate: Date | null;
  thresholdDays: number;
}

export interface UnifiedSLAResult {
  scan: SingleSLAResult;
  traitement: SingleSLAResult;
  reglementBO: SingleSLAResult;
  reglementFinance: SingleSLAResult;
}

export interface BordereauForSLA {
  dateReception: Date | string;
  delaiReglement: number;
  statut: string;
  dateDebutScan?: Date | string | null;
  dateFinScan?: Date | string | null;
  dateCloture?: Date | string | null;
  dateExecutionVirement?: Date | string | null;
  ordresVirement?: Array<{
    etatVirement: string;
    dateEtatFinal?: Date | string | null;
    dateTraitement?: Date | string | null;
  }>;
  /** Optional per-metric threshold overrides — fall back to delaiReglement when absent */
  delaiScan?: number;
  delaiTraitement?: number;
  delaiReglementFinance?: number;
}

const DEFAULT_SCAN_THRESHOLD_DAYS = 5;
const DEFAULT_THRESHOLD_DAYS = 30;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Resolve the date the virement (payment) was actually EXECUTED.
 * Priority order (same everywhere in the app):
 *   1. bordereau.dateExecutionVirement (explicit field)
 *   2. latest EXECUTE ordre de virement's dateEtatFinal
 *   3. latest EXECUTE ordre de virement's dateTraitement
 */
export function resolveDateExecutionVirement(bordereau: BordereauForSLA): Date | null {
  const explicit = toDate(bordereau.dateExecutionVirement);
  if (explicit) return explicit;

  const executedOv = (bordereau.ordresVirement ?? [])
    .filter((ov) => ov.etatVirement === 'EXECUTE')
    .sort((a, b) => {
      const dateA = toDate(a.dateEtatFinal ?? a.dateTraitement)?.getTime() ?? 0;
      const dateB = toDate(b.dateEtatFinal ?? b.dateTraitement)?.getTime() ?? 0;
      return dateB - dateA;
    })[0];

  return toDate(executedOv?.dateEtatFinal ?? executedOv?.dateTraitement);
}

/**
 * "Date de finalisation du traitement" — set by the workflow only once the
 * bordereau genuinely reaches TRAITE / CLOTURE / VIREMENT_EXECUTE.
 */
export function resolveDateFinalisationTraitement(bordereau: BordereauForSLA): Date | null {
  return toDate(bordereau.dateCloture);
}

/**
 * Core building block: elapsed/remaining/percent/color for a start → end
 * interval against a day-based threshold.
 *  - startDate === null → not applicable (nothing to measure yet)
 *  - endDate === null   → still running, measured up to "now"
 *  - endDate !== null   → frozen at that date
 */
function computeInterval(
  startDate: Date | null,
  endDate: Date | null,
  thresholdDays: number,
): SingleSLAResult {
  if (!startDate) {
    return {
      applicable: false,
      isFrozen: false,
      isOverdue: false,
      daysElapsed: null,
      daysRemaining: null,
      percentElapsed: null,
      statusColor: null,
      startDate: null,
      endDate: null,
      thresholdDays,
    };
  }

  const now = new Date();
  const isFrozen = !!endDate;
  const effectiveEnd = endDate ?? now;

  const daysElapsed = Math.floor(
    (effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const percentElapsed = thresholdDays > 0 ? (daysElapsed / thresholdDays) * 100 : 0;
  const daysRemaining = thresholdDays - daysElapsed;

  let statusColor: SLAColor = 'GREEN';
  if (percentElapsed > 100) statusColor = 'RED';
  else if (percentElapsed > 80) statusColor = 'ORANGE';

  return {
    applicable: true,
    isFrozen,
    isOverdue: daysRemaining < 0,
    daysElapsed,
    daysRemaining,
    percentElapsed,
    statusColor,
    startDate,
    endDate: endDate ?? null,
    thresholdDays,
  };
}

/** 1) SLA de scan = Date fin de Scannérisation − Date de réception */
export function calculateScanSLAMetric(bordereau: BordereauForSLA): SingleSLAResult {
  const start = toDate(bordereau.dateReception);
  const end = toDate(bordereau.dateFinScan);
  const threshold = bordereau.delaiScan ?? DEFAULT_SCAN_THRESHOLD_DAYS;
  return computeInterval(start, end, threshold);
}

/** 2) SLA de traitement = Date de finalisation du traitement − Date de réception */
export function calculateTraitementSLAMetric(bordereau: BordereauForSLA): SingleSLAResult {
  const start = toDate(bordereau.dateReception);
  const end = resolveDateFinalisationTraitement(bordereau);
  const threshold = bordereau.delaiTraitement ?? bordereau.delaiReglement ?? DEFAULT_THRESHOLD_DAYS;
  return computeInterval(start, end, threshold);
}

/**
 * 3) SLA de règlement BO = Date d'exécution du virement − Date de réception
 *    (this is the metric the app used to call "the SLA")
 */
export function calculateReglementBOSLAMetric(bordereau: BordereauForSLA): SingleSLAResult {
  const start = toDate(bordereau.dateReception);
  const end = resolveDateExecutionVirement(bordereau);
  const threshold = bordereau.delaiReglement || DEFAULT_THRESHOLD_DAYS;
  return computeInterval(start, end, threshold);
}

/**
 * 4) SLA de règlement Finance = Date d'exécution du virement − Date de finalisation du traitement
 *    Cannot start until traitement is finalised (dateCloture known).
 */
export function calculateReglementFinanceSLAMetric(bordereau: BordereauForSLA): SingleSLAResult {
  const start = resolveDateFinalisationTraitement(bordereau);
  const end = resolveDateExecutionVirement(bordereau);
  const threshold = bordereau.delaiReglementFinance ?? bordereau.delaiReglement ?? DEFAULT_THRESHOLD_DAYS;
  return computeInterval(start, end, threshold);
}

/** Compute all four SLA indicators at once — use this everywhere. */
export function calculateAllSLAs(bordereau: BordereauForSLA): UnifiedSLAResult {
  return {
    scan: calculateScanSLAMetric(bordereau),
    traitement: calculateTraitementSLAMetric(bordereau),
    reglementBO: calculateReglementBOSLAMetric(bordereau),
    reglementFinance: calculateReglementFinanceSLAMetric(bordereau),
  };
}

/* ============================================================================
 * LEGACY COMPATIBILITY LAYER — DO NOT REMOVE
 * bordereaux.service.ts (getPerformanceAnalytics) and any other caller still
 * imports calculateSLA / isSLACompliant / isSLAAtRisk / isSLABreached /
 * getSLAStatus. They now map onto "SLA de règlement BO" — exactly what the
 * app previously computed as the only SLA. No other file needs to change.
 * ============================================================================ */

export interface SLACalculationResult {
  daysElapsed: number;
  daysRemaining: number;
  percentElapsed: number;
  statusColor: SLAColor;
  isFrozen: boolean;
  freezeDate: Date | null;
  isOverdue: boolean;
}

export function calculateSLA(bordereau: BordereauForSLA): SLACalculationResult {
  const r = calculateReglementBOSLAMetric(bordereau);
  return {
    daysElapsed: r.daysElapsed ?? 0,
    daysRemaining: r.daysRemaining ?? (bordereau.delaiReglement || DEFAULT_THRESHOLD_DAYS),
    percentElapsed: r.percentElapsed ?? 0,
    statusColor: r.statusColor ?? 'GREEN',
    isFrozen: r.isFrozen,
    freezeDate: r.endDate,
    isOverdue: r.isOverdue,
  };
}

export function isSLACompliant(bordereau: BordereauForSLA): boolean {
  return calculateSLA(bordereau).percentElapsed <= 80;
}

export function isSLAAtRisk(bordereau: BordereauForSLA): boolean {
  const { percentElapsed } = calculateSLA(bordereau);
  return percentElapsed > 80 && percentElapsed <= 100;
}

export function isSLABreached(bordereau: BordereauForSLA): boolean {
  return calculateSLA(bordereau).percentElapsed > 100;
}

export function getSLAStatus(bordereau: BordereauForSLA): 'COMPLIANT' | 'AT_RISK' | 'BREACHED' {
  const { percentElapsed } = calculateSLA(bordereau);
  if (percentElapsed > 100) return 'BREACHED';
  if (percentElapsed > 80) return 'AT_RISK';
  return 'COMPLIANT';
}