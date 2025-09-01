import { useQuery } from '@tanstack/react-query';
import { fetchSlaBreaches } from '../api/reclamationsApi';

export const useReclamationAlerts = () => {
  return useQuery(
    ['reclamation-alerts'],
    fetchSlaBreaches,
    {
      refetchInterval: 60000, // Refresh every minute for alerts
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  );
};