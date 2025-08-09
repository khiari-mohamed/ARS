import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';
import { AlertsDashboardQuery, AlertHistoryQuery } from '../types/alerts.d';

// Fetch alerts dashboard
export const useAlertsDashboard = (query: AlertsDashboardQuery) => {
  return useQuery(['alerts-dashboard', query], async () => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    const { data } = await LocalAPI.get(`/alerts/dashboard?${params}`);
    return data;
  });
};

// Fetch alert history
export const useAlertHistory = (query: AlertHistoryQuery) => {
  return useQuery(['alert-history', query], async () => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    const { data } = await LocalAPI.get(`/alerts/history?${params}`);
    return data;
  });
};

// Fetch delay predictions
export const useDelayPredictions = () => {
  return useQuery(['delay-predictions'], async () => {
    const { data } = await LocalAPI.get('/alerts/delay-predictions');
    return data;
  });
};

// Fetch comparative analytics
export const useComparativeAnalytics = () => {
  return useQuery(['comparative-analytics'], async () => {
    const { data } = await LocalAPI.get('/alerts/comparative-analytics');
    return data;
  });
};

// Fetch priority list
export const usePriorityList = () => {
  return useQuery(['priority-list'], async () => {
    const { data } = await LocalAPI.get('/alerts/priority-list');
    return data;
  });
};

// Fetch team overload alerts
export const useTeamOverloadAlerts = () => {
  return useQuery(['team-overload'], async () => {
    const { data } = await LocalAPI.get('/alerts/team-overload');
    return data;
  });
};

// Fetch reclamation alerts
export const useReclamationAlerts = () => {
  return useQuery(['reclamation-alerts'], async () => {
    const { data } = await LocalAPI.get('/alerts/reclamations');
    return data;
  });
};

// Resolve alert mutation
export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (alertId: string) => {
      const { data } = await LocalAPI.post(`/alerts/${alertId}/resolve`);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alerts-dashboard']);
        queryClient.invalidateQueries(['alert-history']);
      },
    }
  );
};

// Assign alert mutation
export const useAssignAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { data } = await LocalAPI.post(`/alerts/${alertId}/assign`, { userId });
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alerts-dashboard']);
        queryClient.invalidateQueries(['alert-history']);
      },
    }
  );
};

// Acknowledge alert mutation
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (alertId: string) => {
      const { data } = await LocalAPI.post(`/alerts/${alertId}/acknowledge`);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alerts-dashboard']);
        queryClient.invalidateQueries(['alert-history']);
      },
    }
  );
};

// Add comment to alert mutation
export const useAddAlertComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ alertId, comment }: { alertId: string; comment: string }) => {
      const { data } = await LocalAPI.post(`/alerts/${alertId}/comment`, { comment });
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert-history']);
      },
    }
  );
};