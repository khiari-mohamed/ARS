// Extended analytics types for components
export interface BordereauItem {
  id: string;
  nomSociete?: string;
  delaiReglement: number;
  statusLevel?: string;
}

export interface DailyKpiItem {
  createdAt: string | Date;
  _count: { id: number };
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface AlertData {
  critical: BordereauItem[];
  warning: BordereauItem[];
  ok: BordereauItem[];
}

export interface KpiData {
  bsPerDay: DailyKpiItem[];
  avgDelay: number;
}

export interface ChartDataPoint {
  x: string;
  y: number;
}