import { useQuery } from '@tanstack/react-query';
import { fetchReclamationStats } from '../api/reclamationsApi';
import { ReclamationStats } from '../types/reclamation.d';

export const useReclamationStats = () =>
  useQuery<ReclamationStats>(['reclamationStats'], fetchReclamationStats, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });