import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as alertService from '../api/alertService';
import {
  AlertsDashboardQuery,
  AlertHistoryQuery,
  Alert,
  TeamOverloadAlert,
  ReclamationAlert,
  DelayPrediction,
  PriorityBordereau,
  ComparativeAnalytics,
  AlertHistoryEntry,
} from '../types/alerts.d';

/**
 * Fetches the real-time alerts dashboard with filters.
 */
export const useAlertsDashboard = (params: AlertsDashboardQuery) =>
  useQuery<Alert[], Error>(['alertsDashboard', params], () => alertService.getAlertsDashboard(params), {
    keepPreviousData: true,
  });

/**
 * Fetches team overload alerts.
 */
export const useTeamOverloadAlerts = () =>
  useQuery<TeamOverloadAlert[], Error>(['teamOverloadAlerts'], alertService.getTeamOverloadAlerts);

/**
 * Fetches reclamation alerts.
 */
export const useReclamationAlerts = () =>
  useQuery<ReclamationAlert[], Error>(['reclamationAlerts'], alertService.getReclamationAlerts);

/**
 * Fetches AI-powered delay predictions.
 */
export const useDelayPredictions = () =>
  useQuery<DelayPrediction, Error>(['delayPredictions'], alertService.getDelayPredictions);

/**
 * Fetches the list of priority bordereaux.
 */
export const usePriorityList = () =>
  useQuery<PriorityBordereau[], Error>(['priorityList'], alertService.getPriorityList);

/**
 * Fetches comparative analytics (planned vs actual).
 */
export const useComparativeAnalytics = () =>
  useQuery<ComparativeAnalytics, Error>(['comparativeAnalytics'], alertService.getComparativeAnalytics);

/**
 * Fetches alert history with filters.
 */
export const useAlertHistory = (params: AlertHistoryQuery) =>
  useQuery<AlertHistoryEntry[], Error>(['alertHistory', params], () => alertService.getAlertHistory(params), {
    keepPreviousData: true,
  });

/**
 * Mutation to mark an alert as resolved.
 */
export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation(alertService.resolveAlert, {
    onSuccess: () => {
      queryClient.invalidateQueries(['alertsDashboard']);
      queryClient.invalidateQueries(['priorityList']);
      queryClient.invalidateQueries(['alertHistory']);
    },
  });
};