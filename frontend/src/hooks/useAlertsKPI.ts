import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';

export const useAlertsKPI = () => {
  return useQuery(['alerts-kpi'], async () => {
    const { data } = await LocalAPI.get('/alerts/kpi');
    return data;
  }, {
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000 // Consider data stale after 15 seconds
  });
};

export const useRealTimeAlerts = () => {
  return useQuery(['real-time-alerts'], async () => {
    const { data } = await LocalAPI.get('/alerts/realtime');
    return data;
  }, {
    refetchInterval: 5000, // Refresh every 5 seconds for real-time
    staleTime: 2000 // Consider data stale after 2 seconds
  });
};

export const useFinanceAlerts = () => {
  return useQuery(['finance-alerts'], async () => {
    const { data } = await LocalAPI.get('/alerts/finance');
    return data;
  }, {
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });
};

export const useEscalationRules = () => {
  return useQuery(['escalation-rules'], async () => {
    const { data } = await LocalAPI.get('/alerts/escalation/rules');
    return data;
  });
};

export const useActiveEscalations = () => {
  return useQuery(['active-escalations'], async () => {
    const { data } = await LocalAPI.get('/alerts/escalation/active');
    return data;
  }, {
    refetchInterval: 30000
  });
};

export const useEscalationMetrics = (period = '30d') => {
  return useQuery(['escalation-metrics', period], async () => {
    const { data } = await LocalAPI.get('/alerts/escalation/metrics', { params: { period } });
    return data;
  });
};

export const useNotificationChannels = () => {
  return useQuery(['notification-channels'], async () => {
    const { data } = await LocalAPI.get('/alerts/notifications/channels');
    return data;
  });
};

export const useDeliveryStatistics = (period = '24h') => {
  return useQuery(['delivery-statistics', period], async () => {
    const { data } = await LocalAPI.get('/alerts/notifications/delivery-stats', { params: { period } });
    return data;
  });
};

export const useAlertEffectiveness = (alertType?: string, period = '30d') => {
  return useQuery(['alert-effectiveness', alertType, period], async () => {
    const { data } = await LocalAPI.get('/alerts/analytics/effectiveness', { 
      params: { alertType, period } 
    });
    return data;
  });
};

export const useFalsePositiveAnalysis = (period = '30d') => {
  return useQuery(['false-positive-analysis', period], async () => {
    const { data } = await LocalAPI.get('/alerts/analytics/false-positives', { params: { period } });
    return data;
  });
};

export const useAlertTrends = (period = '30d') => {
  return useQuery(['alert-trends', period], async () => {
    const { data } = await LocalAPI.get('/alerts/analytics/trends', { params: { period } });
    return data;
  });
};

export const useAlertRecommendations = (period = '30d') => {
  return useQuery(['alert-recommendations', period], async () => {
    const { data } = await LocalAPI.get('/alerts/analytics/recommendations', { params: { period } });
    return data;
  });
};

export const useAlertPerformanceReport = (period = '30d') => {
  return useQuery(['alert-performance-report', period], async () => {
    const { data } = await LocalAPI.get('/alerts/analytics/performance-report', { params: { period } });
    return data;
  });
};