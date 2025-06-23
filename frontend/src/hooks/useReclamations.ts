import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/reclamationsApi';
import {
  SearchReclamationDTO,
  CreateReclamationDTO,
  UpdateReclamationDTO,
} from '../types/reclamation.d';

export const useReclamations = (params: SearchReclamationDTO) =>
  useQuery(['reclamations', params], () => api.fetchReclamations(params), {
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

export const useReclamation = (id: string) =>
  useQuery(['reclamation', id], () => api.fetchReclamation(id), {
    enabled: !!id,
  });

export const useCreateReclamation = () => {
  const queryClient = useQueryClient();
  return useMutation(api.createReclamation, {
    onSuccess: () => {
      queryClient.invalidateQueries(['reclamations']);
    },
  });
};

export const useUpdateReclamation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, dto }: { id: string; dto: UpdateReclamationDTO }) =>
      api.updateReclamation(id, dto),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reclamations']);
        queryClient.invalidateQueries(['reclamations']);
      },
    }
  );
};

export const useAssignReclamation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      api.assignReclamation(id, assignedToId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reclamations']);
        queryClient.invalidateQueries(['reclamations']);
      },
    }
  );
};

export const useReclamationHistory = (id: string) =>
  useQuery(['reclamationHistory', id], () => api.fetchReclamationHistory(id), {
    enabled: !!id,
  });

export const useReclamationStats = () =>
  useQuery(['reclamationStats'], api.fetchReclamationStats);