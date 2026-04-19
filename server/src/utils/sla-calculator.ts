/**
 * 🎯 CENTRALIZED SLA CALCULATOR
 * 
 * This utility calculates SLA metrics for bordereaux with the correct freeze logic.
 * 
 * CRITICAL RULE:
 * - SLA clock runs from dateReception until virement is EXECUTED
 * - Clock FREEZES when virement reaches EXECUTE state (not at TRAITE!)
 * - TRAITE = processing complete, but payment not yet executed
 * - VIREMENT_EXECUTE = payment executed → FREEZE SLA HERE
 * 
 * @see Ticket: Module Bordereaux - SLA calculation must stop after virement execution
 */

export interface SLACalculationResult {
  daysElapsed: number;
  daysRemaining: number;
  percentElapsed: number;
  statusColor: 'GREEN' | 'ORANGE' | 'RED';
  isFrozen: boolean;
  freezeDate: Date | null;
  isOverdue: boolean;
}

export interface BordereauForSLA {
  dateReception: Date | string;
  delaiReglement: number;
  statut: string;
  dateCloture?: Date | string | null;
  dateExecutionVirement?: Date | string | null;
  ordresVirement?: Array<{
    etatVirement: string;
    dateEtatFinal?: Date | string | null;
    dateTraitement?: Date | string | null;
  }>;
}

/**
 * Calculate SLA metrics for a bordereau with correct freeze logic
 * 
 * @param bordereau - Bordereau object with dates and virement info
 * @returns SLA calculation result with freeze status
 */
export function calculateSLA(bordereau: BordereauForSLA): SLACalculationResult {
  const now = new Date();
  const startDate = new Date(bordereau.dateReception);
  const slaThreshold = bordereau.delaiReglement || 30;
  
  // ========================================
  // STEP 1: Determine if SLA should be frozen
  // ========================================
  
  // Find the latest EXECUTED ordre de virement
  const executedOv = (bordereau.ordresVirement ?? [])
    .filter(ov => ov.etatVirement === 'EXECUTE')
    .sort((a, b) => {
      const dateA = new Date(b.dateEtatFinal ?? b.dateTraitement ?? 0).getTime();
      const dateB = new Date(a.dateEtatFinal ?? a.dateTraitement ?? 0).getTime();
      return dateA - dateB;
    })[0];
  
  // Determine freeze date (priority order):
  // 1. bordereau.dateExecutionVirement (if set)
  // 2. Latest executed OV's dateEtatFinal
  // 3. Latest executed OV's dateTraitement
  // 4. dateCloture ONLY if status is VIREMENT_EXECUTE or PAYE (safe fallback)
  // 5. null (not frozen - still in progress)
  const freezeAt =
    bordereau.dateExecutionVirement ??
    executedOv?.dateEtatFinal ??
    executedOv?.dateTraitement ??
    (['VIREMENT_EXECUTE', 'PAYE', 'CLOTURE'].includes(bordereau.statut) ? bordereau.dateCloture : null);
  
  // ========================================
  // STEP 2: Calculate days elapsed
  // ========================================
  
  // Use freeze date if exists, otherwise use today (still running)
  const effectiveEndDate = freezeAt ? new Date(freezeAt) : now;
  const daysElapsed = Math.floor(
    (effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // ========================================
  // STEP 3: Calculate SLA metrics
  // ========================================
  
  const percentElapsed = (daysElapsed / slaThreshold) * 100;
  const daysRemaining = slaThreshold - daysElapsed;
  
  // Determine status color based on percentage elapsed
  let statusColor: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN';
  if (percentElapsed > 100) {
    statusColor = 'RED';
  } else if (percentElapsed > 80) {
    statusColor = 'ORANGE';
  }
  
  return {
    daysElapsed,
    daysRemaining,
    percentElapsed,
    statusColor,
    isFrozen: !!freezeAt,
    freezeDate: freezeAt ? new Date(freezeAt) : null,
    isOverdue: daysRemaining < 0,
  };
}

/**
 * Check if a bordereau is SLA compliant (≤ 80% of delay elapsed)
 */
export function isSLACompliant(bordereau: BordereauForSLA): boolean {
  const { percentElapsed } = calculateSLA(bordereau);
  return percentElapsed <= 80;
}

/**
 * Check if a bordereau is at SLA risk (> 80% and ≤ 100%)
 */
export function isSLAAtRisk(bordereau: BordereauForSLA): boolean {
  const { percentElapsed } = calculateSLA(bordereau);
  return percentElapsed > 80 && percentElapsed <= 100;
}

/**
 * Check if a bordereau has breached SLA (> 100%)
 */
export function isSLABreached(bordereau: BordereauForSLA): boolean {
  const { percentElapsed } = calculateSLA(bordereau);
  return percentElapsed > 100;
}

/**
 * Get SLA status as string
 */
export function getSLAStatus(bordereau: BordereauForSLA): 'COMPLIANT' | 'AT_RISK' | 'BREACHED' {
  const { percentElapsed } = calculateSLA(bordereau);
  
  if (percentElapsed > 100) return 'BREACHED';
  if (percentElapsed > 80) return 'AT_RISK';
  return 'COMPLIANT';
}
