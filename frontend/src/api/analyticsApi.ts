import { LocalAPI } from '../services/axios';
import {
  AnalyticsKpiDto,
  AnalyticsPerformanceDto,
  AnalyticsExportDto,
  AnalyticsKpiResponse,
  AnalyticsPerformanceResponse,
  AnalyticsAlertsResponse,
  AnalyticsRecommendationResponse,
  AnalyticsForecastResponse,
  AnalyticsTrendsResponse,
  AnalyticsThroughputGapResponse,
  AnalyticsExportResponse,
} from '../types/analytics';

export const getDailyKpis = async (params: AnalyticsKpiDto) => {
  const { data } = await LocalAPI.get<AnalyticsKpiResponse>('/analytics/kpis/daily', { params });
  return data;
};

export const getPerformanceByUser = async (params: AnalyticsPerformanceDto) => {
  const { data } = await LocalAPI.get<AnalyticsPerformanceResponse>('/analytics/performance/by-user', { params });
  return data;
};

export const getAlerts = async () => {
  const { data } = await LocalAPI.get<AnalyticsAlertsResponse>('/analytics/alerts');
  return data;
};

export const getRecommendations = async () => {
  const { data } = await LocalAPI.get<AnalyticsRecommendationResponse>('/analytics/recommendations');
  return data;
};

export const getTrends = async (period: 'day' | 'week' | 'month') => {
  const { data } = await LocalAPI.get<AnalyticsTrendsResponse[]>('/analytics/trends', { params: { period } });
  return data;
};

export const getForecast = async () => {
  const { data } = await LocalAPI.get<AnalyticsForecastResponse>('/analytics/forecast');
  return data;
};

export const getStaffing = async () => {
  const { data } = await LocalAPI.get<{ neededStaff: number; recommendation: string }>('/analytics/staffing');
  return data;
};

export const getThroughputGap = async () => {
  const { data } = await LocalAPI.get<AnalyticsThroughputGapResponse>('/analytics/throughput-gap');
  return data;
};

export const exportAnalytics = async (params: AnalyticsExportDto) => {
  const { data } = await LocalAPI.get<AnalyticsExportResponse>('/analytics/export', { params });
  return data;
};

export const getTraceability = async (bordereauId: string) => {
  const { data } = await LocalAPI.get<any>(`/analytics/traceability/${bordereauId}`);
  return data;
};

export const getAdvancedClustering = async () => {
  const { data } = await LocalAPI.post<any>('/analytics/ai/advanced-clustering', {});
  return data;
};

export const getSophisticatedAnomalyDetection = async () => {
  const { data } = await LocalAPI.post<any>('/analytics/ai/sophisticated-anomaly-detection', {});
  return data;
};

export const generateExecutiveReport = async (params: any = {}) => {
  const { data } = await LocalAPI.post<any>('/analytics/ai/executive-report', params);
  return data;
};

// --- New Advanced Analytics Endpoints ---
export const getSlaComplianceByUser = async (params: any) => {
  const { data } = await LocalAPI.get<any[]>('/analytics/sla-compliance-by-user', { params });
  return data;
};

export const getReclamationPerformance = async (params: any) => {
  const { data } = await LocalAPI.get<any[]>('/analytics/reclamation-performance', { params });
  return data;
};

export const getClientDashboard = async (params: any) => {
  const { data } = await LocalAPI.get<any>('/analytics/client-dashboard', { params });
  return data;
};

export const getUserDailyTargetAnalysis = async (params: any) => {
  const { data } = await LocalAPI.get<any[]>('/analytics/user-daily-target', { params });
  return data;
};

export const getPriorityScoring = async (params: any) => {
  const { data } = await LocalAPI.get<any[]>('/analytics/priority-scoring', { params });
  return data;
};

export const getComparativeAnalysis = async (params: any) => {
  if (!params?.period1?.fromDate || !params?.period1?.toDate || !params?.period2?.fromDate || !params?.period2?.toDate) {
    return null;
  }
  const { data } = await LocalAPI.get<any>('/analytics/comparative-analysis', { params });
  return data;
};

export const getSlaTrend = async (params: any) => {
  const { data } = await LocalAPI.get<any[]>('/analytics/sla-trend', { params });
  return data;
};

export const getAlertEscalationFlag = async () => {
  const { data } = await LocalAPI.get<{ escalate: boolean }>('/analytics/alert-escalation-flag');
  return data;
};

export const getEnhancedRecommendations = async () => {
  const { data } = await LocalAPI.get<any>('/analytics/recommendations/enhanced');
  return data;
};

export const getExecutiveDashboard = async (params: any = {}) => {
  const { data } = await LocalAPI.post<any>('/analytics/ai/executive-report', {
    report_type: 'executive_dashboard',
    time_period: '30d',
    include_forecasts: true,
    ...params
  });
  return data;
};

export const getAdvancedAnalyticsDashboard = async () => {
  const [clustering, anomalies, report] = await Promise.all([
    LocalAPI.post<any>('/analytics/ai/advanced-clustering', {}),
    LocalAPI.post<any>('/analytics/ai/sophisticated-anomaly-detection', {}),
    LocalAPI.post<any>('/analytics/ai/executive-report', { report_type: 'comprehensive' })
  ]);
  
  return {
    clustering: clustering.data,
    anomalies: anomalies.data,
    executive_report: report.data
  };
};