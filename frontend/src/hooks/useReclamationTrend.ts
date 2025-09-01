import { useQuery } from '@tanstack/react-query';
import { fetchReclamationTrend } from '../api/reclamationsApi';

export const useReclamationTrend = () => {
  return useQuery(
    ['reclamation-trend'],
    fetchReclamationTrend,
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      staleTime: 60000, // Consider data stale after 1 minute
    }
  );
};