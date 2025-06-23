import { useQuery } from '@tanstack/react-query';
import * as analyticsApi from '../api/analyticsApi';
import {
  AnalyticsKpiDto,
  AnalyticsPerformanceDto,
  AnalyticsExportDto,
} from '../types/analytics';

export const useDailyKpis = (params: AnalyticsKpiDto) =>
  useQuery(['analytics', 'kpis', params], () => analyticsApi.getDailyKpis(params), { keepPreviousData: true });

export const usePerformanceByUser = (params: AnalyticsPerformanceDto) =>
  useQuery(['analytics', 'performance', params], () => analyticsApi.getPerformanceByUser(params), { keepPreviousData: true });

export const useAlerts = () =>
  useQuery(['analytics', 'alerts'], analyticsApi.getAlerts);

export const useRecommendations = () =>
  useQuery(['analytics', 'recommendations'], analyticsApi.getRecommendations);

export const useTrends = (period: 'day' | 'week' | 'month') =>
  useQuery(['analytics', 'trends', period], () => analyticsApi.getTrends(period));

export const useForecast = () =>
  useQuery(['analytics', 'forecast'], analyticsApi.getForecast);

export const useStaffing = () =>
  useQuery(['analytics', 'staffing'], analyticsApi.getStaffing);

export const useThroughputGap = () =>
  useQuery(['analytics', 'throughput-gap'], analyticsApi.getThroughputGap);

export const useExportAnalytics = (params: AnalyticsExportDto) =>
  useQuery(['analytics', 'export', params], () => analyticsApi.exportAnalytics(params), { enabled: false });

// --- New Advanced Analytics Hooks ---
export const useSlaComplianceByUser = (params: any) =>
  useQuery(['analytics', 'sla-compliance-by-user', params], () => analyticsApi.getSlaComplianceByUser(params));

export const useReclamationPerformance = (params: any) =>
  useQuery(['analytics', 'reclamation-performance', params], () => analyticsApi.getReclamationPerformance(params));

export const useClientDashboard = (params: any) =>
  useQuery(['analytics', 'client-dashboard', params], () => analyticsApi.getClientDashboard(params));

export const useUserDailyTargetAnalysis = (params: any) =>
  useQuery(['analytics', 'user-daily-target', params], () => analyticsApi.getUserDailyTargetAnalysis(params));

export const usePriorityScoring = (params: any) =>
  useQuery<any[], Error>(['analytics', 'priority-scoring', params], () => analyticsApi.getPriorityScoring(params));

export const useComparativeAnalysis = (params: any, p0: { enabled: boolean; }) =>
  useQuery(['analytics', 'comparative-analysis', params], () => analyticsApi.getComparativeAnalysis(params));

export const useSlaTrend = (params: any) =>
  useQuery<any[], Error>(['analytics', 'sla-trend', params], () => analyticsApi.getSlaTrend(params));

export const useAlertEscalationFlag = () =>
  useQuery(['analytics', 'alert-escalation-flag'], analyticsApi.getAlertEscalationFlag);

export const useEnhancedRecommendations = () =>
  useQuery(['analytics', 'recommendations', 'enhanced'], analyticsApi.getEnhancedRecommendations);