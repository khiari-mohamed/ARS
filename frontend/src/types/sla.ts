// src/types/sla.ts
// Mirrors server/src/bordereaux/dto/bordereau-response.dto.ts::SLAIndicatorDto
// This is the single shared shape for all four company SLA indicators.

export type SLAColor = 'GREEN' | 'ORANGE' | 'RED';

export interface SLAIndicator {
  /** false while the metric's start date isn't known yet (e.g. Finance SLA before traitement is finalised) */
  applicable: boolean;
  /** true once the end-milestone happened and the clock is frozen */
  frozen: boolean;
  overdue: boolean;
  daysElapsed: number | null;
  daysRemaining: number | null;
  percentElapsed: number | null;
  status: SLAColor | null;
}

/** The four company-mandated SLA indicators, as returned on every Bordereau. */
export interface BordereauSLAIndicators {
  slaScan?: SLAIndicator;
  slaTraitement?: SLAIndicator;
  slaReglementBO?: SLAIndicator;
  slaReglementFinance?: SLAIndicator;
}

export const SLA_INDICATOR_LABELS: Record<keyof BordereauSLAIndicators, string> = {
  slaScan: 'SLA de scan',
  slaTraitement: 'SLA de traitement',
  slaReglementBO: 'SLA de règlement BO',
  slaReglementFinance: 'SLA de règlement Finance',
};

export const SLA_INDICATOR_ORDER: (keyof BordereauSLAIndicators)[] = [
  'slaScan',
  'slaTraitement',
  'slaReglementBO',
  'slaReglementFinance',
];