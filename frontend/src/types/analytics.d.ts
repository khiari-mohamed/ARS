export interface AnalyticsKpiDto {
  teamId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AnalyticsPerformanceDto extends AnalyticsKpiDto {
  role?: string;
}

export interface AnalyticsExportDto extends AnalyticsKpiDto {
  format?: 'csv' | 'excel' | 'pdf';
}

export interface DailyKpi {
  date: string;
  bsCount: number;
  avgDelay: number;
}

export interface PerformanceByUser {
  clientId: string;
  count: number;
}

export interface AnalyticsKpiResponse {
  bsPerDay: { createdAt: string; _count: { id: number } }[];
  avgDelay: number;
}

export interface AnalyticsPerformanceResponse {
  processedByUser: { clientId: string; _count: { id: number } }[];
  slaCompliant: number;
}

export interface AnalyticsAlertsResponse {
  critical: any[];
  warning: any[];
  ok: any[];
}

export interface AnalyticsRecommendationResponse {
  forecast: AnalyticsForecastResponse;
  neededStaff: number;
  recommendation: string;
}

export interface AnalyticsForecastResponse {
  slope: number;
  intercept: number;
  nextWeekForecast: number;
  history: { day: number; count: number }[];
}

export interface AnalyticsTrendsResponse {
  date: string;
  count: number;
}

export interface AnalyticsThroughputGapResponse {
  planned: number;
  actual: number;
  gap: number;
}

export interface AnalyticsExportResponse {
  filePath: string;
}

export type AnalyticsRole = 'SUPER_ADMIN' | 'CHEF_EQUIPE' | 'SCAN' | 'BO' | 'GESTIONNAIRE';