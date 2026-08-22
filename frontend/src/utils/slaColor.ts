import type { SLAColor, SLAIndicator } from '../types/sla';

/**
 * Legacy helper — kept for any existing caller computing color from raw
 * daysElapsed/threshold. Prefer getColorForIndicator() for the four unified
 * SLA indicators coming from the backend, since those correctly encode
 * freeze/not-applicable state that this function cannot express.
 *
 * - Green: percentageElapsed <= 80%
 * - Orange: percentageElapsed > 80% && <= 100%
 * - Red: percentageElapsed > 100%
 */
export function getSLAColor(daysElapsed: number, reglementDelay: number): 'green' | 'orange' | 'red' {
  if (daysElapsed === undefined || reglementDelay === undefined || reglementDelay === 0) return 'green';

  const percentageElapsed = (daysElapsed / reglementDelay) * 100;

  if (percentageElapsed > 100) return 'red';
  if (percentageElapsed > 80) return 'orange';
  return 'green';
}

/** Lowercase hex used by StatusBadge / existing UI conventions. */
export function toLowerColor(status: SLAColor | null | undefined): 'green' | 'orange' | 'red' | 'gray' {
  if (status === 'RED') return 'red';
  if (status === 'ORANGE') return 'orange';
  if (status === 'GREEN') return 'green';
  return 'gray';
}

export const SLA_HEX: Record<'green' | 'orange' | 'red' | 'gray', string> = {
  green: '#2E7D32',
  orange: '#F57C00',
  red: '#C62828',
  gray: '#9e9e9e',
};

/**
 * Preferred entry point: derive display color directly from one of the four
 * unified SLA indicators returned by the backend (slaScan / slaTraitement /
 * slaReglementBO / slaReglementFinance). Correctly handles:
 *  - not yet applicable (e.g. Finance SLA before traitement is finalised) → gray
 *  - frozen vs still running is irrelevant to color — status is already computed
 */
export function getColorForIndicator(indicator: SLAIndicator | null | undefined): string {
  if (!indicator || !indicator.applicable) return SLA_HEX.gray;
  return SLA_HEX[toLowerColor(indicator.status)];
}

/** Human-readable label for an indicator, in French, matching the Excel export labels. */
export function getIndicatorLabel(indicator: SLAIndicator | null | undefined): string {
  if (!indicator || !indicator.applicable) return '—';
  if (indicator.status === 'RED') return indicator.frozen ? 'Dépassé' : 'En retard';
  if (indicator.status === 'ORANGE') return 'À risque';
  if (indicator.status === 'GREEN') return indicator.frozen ? 'Respecté' : 'Dans les délais';
  return '—';
}

/** Short days display, e.g. "12 j" or "—" when not applicable. */
export function formatIndicatorDays(indicator: SLAIndicator | null | undefined): string {
  if (!indicator || !indicator.applicable || indicator.daysElapsed === null) return '—';
  return `${indicator.daysElapsed} j`;
}