import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as bsApi from '../api/bsApi';
import { BulletinSoin } from '../types/bs';

// Queries
export const useBSList = (params: any) =>
  useQuery({
    queryKey: ['bs-list', params],
    queryFn: () => bsApi.fetchBSList(params),
  });

export const useBSDetails = (id: number | string) =>
  useQuery({
    queryKey: ['bs-details', id],
    queryFn: () => bsApi.fetchBSDetails(id),
    enabled: !!id
  });

export const useBSLogs = (id: number | string) =>
  useQuery({
    queryKey: ['bs-logs', id],
    queryFn: () => bsApi.fetchBSLogs(id),
    enabled: !!id
  });

export const useBSOcr = (id: number | string) =>
  useQuery({
    queryKey: ['bs-ocr', id],
    queryFn: () => bsApi.fetchBSOcr(id),
    enabled: !!id
  });

export const useBSExpertise = (id: number | string) =>
  useQuery({
    queryKey: ['bs-expertise', id],
    queryFn: () => bsApi.fetchBSExpertise(id),
    enabled: !!id
  });

// Advanced/AI/Finance/Notification hooks
export const useSlaAlerts = () =>
  useQuery({
    queryKey: ['sla-alerts'],
    queryFn: bsApi.fetchSlaAlerts,
  });

export const useAnalyseCharge = () =>
  useQuery({
    queryKey: ['analyse-charge'],
    queryFn: bsApi.fetchAnalyseCharge,
  });

export const usePerformanceMetrics = (params: any) =>
  useQuery({
    queryKey: ['performance-metrics', params],
    queryFn: () => bsApi.fetchPerformanceMetrics(params),
  });

export const useAssignmentSuggestions = () =>
  useQuery({
    queryKey: ['assignment-suggestions'],
    queryFn: bsApi.fetchAssignmentSuggestions,
    retry: 1,
    staleTime: 30000,
  });

export const useTeamWorkload = () =>
  useQuery({
    queryKey: ['team-workload'],
    queryFn: bsApi.fetchTeamWorkload,
  });

export const usePriorities = (gestionnaireId: string | number) =>
  useQuery({
    queryKey: ['priorities', gestionnaireId],
    queryFn: () => bsApi.fetchPriorities(gestionnaireId),
    enabled: !!gestionnaireId,
  });

export const useRebalancingSuggestions = () =>
  useQuery({
    queryKey: ['rebalancing-suggestions'],
    queryFn: bsApi.fetchRebalancingSuggestions,
  });

export const useReconciliationReport = () =>
  useQuery({
    queryKey: ['reconciliation-report'],
    queryFn: bsApi.fetchReconciliationReport,
  });

export const usePaymentStatus = (id: number | string) =>
  useQuery({
    queryKey: ['payment-status', id],
    queryFn: () => bsApi.fetchPaymentStatus(id),
    enabled: !!id,
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: bsApi.fetchNotifications,
  });

// Types for mutations
type UpdateBSVariables = { id: number | string } & Partial<BulletinSoin>;
type AssignBSVariables = { id: number | string; ownerId: string | number };

// Mutations
export const useUpdateBS = () => {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    Error,
    UpdateBSVariables,
    unknown
  >({
    mutationFn: async ({ id, ...payload }: UpdateBSVariables) => {
      const response = await bsApi.updateBS(id, payload);
      return response.data;
    },
    onSuccess: (data: unknown, variables: UpdateBSVariables) => {
      queryClient.invalidateQueries({ queryKey: ['bs-details', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bs-list'] });
    },
  });
};

export const useAssignBS = () => {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    Error,
    AssignBSVariables,
    unknown
  >({
    mutationFn: async ({ id, ownerId }: AssignBSVariables) => {
      const response = await bsApi.assignBS(id, ownerId);
      return response;
    },
    onSuccess: (data: unknown, variables: AssignBSVariables) => {
      queryClient.invalidateQueries({ queryKey: ['bs-details', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bs-list'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-suggestions'] });
    },
  });
};

export const useApplyRebalancing = () => {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { bsId: string; toUserId: string },
    unknown
  >({
    mutationFn: async ({ bsId, toUserId }) => {
      const response = await bsApi.applyRebalancing(bsId, toUserId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bs-list'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      queryClient.invalidateQueries({ queryKey: ['rebalancing-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-suggestions'] });
    },
  });
};