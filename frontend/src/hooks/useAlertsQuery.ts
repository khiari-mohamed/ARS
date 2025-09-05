import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await LocalAPI.get(`/alerts/resolve?alertId=${alertId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
};

export const useAddAlertComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ alertId, comment }: { alertId: string; comment: string }) => {
      const response = await LocalAPI.post(`/alerts/comments`, {
        alertId,
        comment
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
};

export const useTriggerAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertData: any) => {
      const response = await LocalAPI.post('/alerts/trigger', alertData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
};

export const useEscalateAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ alertId, escalationLevel }: { alertId: string; escalationLevel: string }) => {
      const response = await LocalAPI.post(`/alerts/escalate`, {
        alertId,
        escalationLevel
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
};

export const useAlertsDashboard = (filters?: any) => {
  return useQuery({
    queryKey: ['alerts-dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value as string);
        });
      }
      const response = await LocalAPI.get(`/alerts/dashboard?${params}`);
      return response.data;
    }
  });
};

export const useDelayPredictions = () => {
  return useQuery({
    queryKey: ['delay-predictions'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/delay-predictions');
      return response.data;
    },
    retry: 1,
    refetchInterval: 300000, // 5 minutes
    staleTime: 240000 // 4 minutes
  });
};

export const useComparativeAnalytics = () => {
  return useQuery({
    queryKey: ['comparative-analytics'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/comparative-analytics');
      return response.data;
    }
  });
};

export const usePriorityList = () => {
  return useQuery({
    queryKey: ['priority-list'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/priority-list');
      return response.data;
    }
  });
};

export const useTeamOverloadAlerts = () => {
  return useQuery({
    queryKey: ['team-overload'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/team-overload');
      return response.data;
    }
  });
};

export const useReclamationAlerts = () => {
  return useQuery({
    queryKey: ['reclamation-alerts'],
    queryFn: async () => {
      const response = await LocalAPI.get('/alerts/reclamations');
      return response.data;
    }
  });
};

export const useAlertHistory = (filters?: any) => {
  return useQuery({
    queryKey: ['alert-history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value as string);
        });
      }
      const response = await LocalAPI.get(`/alerts/history?${params}`);
      return response.data;
    }
  });
};