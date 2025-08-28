import { useQuery } from '@tanstack/react-query';
import { fetchReclamationStats } from '../api/reclamationsApi';

export const useReclamationStats = () => {
  return useQuery(
    ['reclamation-stats'],
    fetchReclamationStats,
    {
      refetchInterval: 60000, // Refresh every minute
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  );
};