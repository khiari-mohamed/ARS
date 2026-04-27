/**
 * SCAN SLA Calculator
 * Calculates SLA status for SCAN processing time
 * Timer starts from dateReception (BO reception date)
 */

export interface ScanSLAResult {
  daysElapsed: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  statusColor: 'GREEN' | 'ORANGE' | 'RED';
  percentElapsed: number;
  isOverdue: boolean;
  message: string;
}

export interface ScanSLAThresholds {
  warningDays: number;  // Default: 2 days
  criticalDays: number; // Default: 5 days
}

const DEFAULT_THRESHOLDS: ScanSLAThresholds = {
  warningDays: 2,
  criticalDays: 5,
};

/**
 * Calculate SCAN SLA status based on dateReception
 */
export function calculateScanSLA(
  dateReception: Date,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
): ScanSLAResult {
  const now = new Date();
  const receptionDate = new Date(dateReception);
  
  // Calculate days elapsed
  const msElapsed = now.getTime() - receptionDate.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  
  // Calculate percentage based on critical threshold
  const percentElapsed = (daysElapsed / thresholds.criticalDays) * 100;
  
  // Determine status
  let status: 'OK' | 'WARNING' | 'CRITICAL';
  let statusColor: 'GREEN' | 'ORANGE' | 'RED';
  let message: string;
  let isOverdue: boolean;
  
  if (daysElapsed >= thresholds.criticalDays) {
    status = 'CRITICAL';
    statusColor = 'RED';
    isOverdue = true;
    message = `SLA dépassé ! ${daysElapsed} jours écoulés (limite: ${thresholds.criticalDays} jours)`;
  } else if (daysElapsed >= thresholds.warningDays) {
    status = 'WARNING';
    statusColor = 'ORANGE';
    isOverdue = false;
    message = `Attention ! ${daysElapsed} jours écoulés (alerte à ${thresholds.warningDays} jours)`;
  } else {
    status = 'OK';
    statusColor = 'GREEN';
    isOverdue = false;
    message = `Dans les délais (${daysElapsed} jours écoulés)`;
  }
  
  return {
    daysElapsed,
    status,
    statusColor,
    percentElapsed: Math.min(percentElapsed, 100),
    isOverdue,
    message,
  };
}

/**
 * Check if bordereau needs SCAN alert
 */
export function needsScanAlert(
  dateReception: Date,
  scanStatus: string,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
): boolean {
  // Only alert if not yet finalized
  if (scanStatus === 'SCAN_FINALISE') {
    return false;
  }
  
  const sla = calculateScanSLA(dateReception, thresholds);
  return sla.status === 'WARNING' || sla.status === 'CRITICAL';
}

/**
 * Get alert level for notification
 */
export function getScanAlertLevel(
  dateReception: Date,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
): 'INFO' | 'WARNING' | 'CRITICAL' {
  const sla = calculateScanSLA(dateReception, thresholds);
  
  if (sla.status === 'CRITICAL') return 'CRITICAL';
  if (sla.status === 'WARNING') return 'WARNING';
  return 'INFO';
}
