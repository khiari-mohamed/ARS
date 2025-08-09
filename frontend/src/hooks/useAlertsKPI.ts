import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';

export interface AlertsKPIData {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  avgResolutionTime: number;
  slaCompliance: number;
  alertsByDay: Array<{ date: string; critical: number; warning: number; normal: number }>;
  alertsByType: Array<{ name: string; value: number; color: string }>;
  slaComplianceChart: Array<{ date: string; compliance: number }>;
}

export const useAlertsKPI = () => {
  return useQuery(['alerts-kpi'], async (): Promise<AlertsKPIData> => {
    const { data } = await LocalAPI.get('/alerts/kpi');
    return data;
  }, {
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

export const useRealTimeAlerts = () => {
  return useQuery(['alerts-realtime'], async () => {
    const { data } = await LocalAPI.get('/alerts/realtime');
    return data;
  }, {
    refetchInterval: 5000, // Very frequent updates for critical alerts
    staleTime: 2000,
  });
};