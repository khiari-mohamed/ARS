/**
 * SCAN SLA Calculator
 * Timer starts from dateReception and — per company requirement — FREEZES at
 * dateFinScan once the scan is completed. Previously this always measured up
 * to "now", so the scan SLA kept growing forever even after the scan was
 * finished. If dateFinScan isn't known yet, it keeps running (this is what
 * the alerting cron relies on — it only checks bordereaux not yet scanned).
 */

export interface ScanSLAResult {
  daysElapsed: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  statusColor: 'GREEN' | 'ORANGE' | 'RED';
  percentElapsed: number;
  isOverdue: boolean;
  isFrozen: boolean;
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
 * Calculate SCAN SLA status based on dateReception, optionally frozen at dateFinScan.
 */
export function calculateScanSLA(
  dateReception: Date,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
  dateFinScan?: Date | string | null,
): ScanSLAResult {
  const now = new Date();
  const receptionDate = new Date(dateReception);
  const isFrozen = !!dateFinScan;
  const effectiveEnd = dateFinScan ? new Date(dateFinScan) : now;

  const msElapsed = effectiveEnd.getTime() - receptionDate.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

  const percentElapsed = (daysElapsed / thresholds.criticalDays) * 100;

  let status: 'OK' | 'WARNING' | 'CRITICAL';
  let statusColor: 'GREEN' | 'ORANGE' | 'RED';
  let message: string;
  let isOverdue: boolean;

  if (daysElapsed >= thresholds.criticalDays) {
    status = 'CRITICAL';
    statusColor = 'RED';
    isOverdue = true;
    message = isFrozen
      ? `SLA dépassé ! Scan finalisé en ${daysElapsed} jours (limite: ${thresholds.criticalDays} jours)`
      : `SLA dépassé ! ${daysElapsed} jours écoulés (limite: ${thresholds.criticalDays} jours)`;
  } else if (daysElapsed >= thresholds.warningDays) {
    status = 'WARNING';
    statusColor = 'ORANGE';
    isOverdue = false;
    message = isFrozen
      ? `Scan finalisé en ${daysElapsed} jours (alerte à ${thresholds.warningDays} jours)`
      : `Attention ! ${daysElapsed} jours écoulés (alerte à ${thresholds.warningDays} jours)`;
  } else {
    status = 'OK';
    statusColor = 'GREEN';
    isOverdue = false;
    message = isFrozen
      ? `Scan finalisé dans les délais (${daysElapsed} jours)`
      : `Dans les délais (${daysElapsed} jours écoulés)`;
  }

  return {
    daysElapsed,
    status,
    statusColor,
    percentElapsed: Math.min(percentElapsed, 100),
    isOverdue,
    isFrozen,
    message,
  };
}

/** Check if bordereau needs SCAN alert */
export function needsScanAlert(
  dateReception: Date,
  scanStatus: string,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
): boolean {
  if (scanStatus === 'SCAN_FINALISE') {
    return false;
  }
  const sla = calculateScanSLA(dateReception, thresholds);
  return sla.status === 'WARNING' || sla.status === 'CRITICAL';
}

/** Get alert level for notification */
export function getScanAlertLevel(
  dateReception: Date,
  thresholds: ScanSLAThresholds = DEFAULT_THRESHOLDS,
): 'INFO' | 'WARNING' | 'CRITICAL' {
  const sla = calculateScanSLA(dateReception, thresholds);
  if (sla.status === 'CRITICAL') return 'CRITICAL';
  if (sla.status === 'WARNING') return 'WARNING';
  return 'INFO';
}