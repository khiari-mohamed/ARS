import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';

export const useDailyKpis = (filters?: any) => {
  return useQuery({
    queryKey: ['daily-kpis', filters],
    queryFn: async () => {
      const response = await LocalAPI.get('/analytics/daily-kpis', { params: filters });
      return response.data;
    }
  });
};

export const usePerformanceByUser = (filters?: any) => {
  return useQuery({
    queryKey: ['performance-by-user', filters],
    queryFn: async () => {
      const response = await LocalAPI.get('/analytics/performance-by-user', { params: filters });
      return response.data;
    }
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts-summary'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/dashboard');
      return response.data;
    }
  });
};

export const useRecommendations = () => {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/delay-predictions');
      return response.data;
    }
  });
};

export const useTrends = () => {
  return useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const response = await LocalAPI.get('/analytics/trends');
      return response.data;
    }
  });
};