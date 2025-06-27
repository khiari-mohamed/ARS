import { LocalAPI } from '../services/axios';
import {
  Alert,
  TeamOverloadAlert,
  ReclamationAlert,
  DelayPrediction,
  PriorityBordereau,
  ComparativeAnalytics,
  AlertHistoryEntry,
  AlertsDashboardQuery,
  AlertHistoryQuery,
} from '../types/alerts.d';

/**
 * Fetch real-time alerts dashboard with optional filters.
 * @param params AlertsDashboardQuery
 */
export const getAlertsDashboard = async (params: AlertsDashboardQuery): Promise<Alert[]> => {
  // Only send fromDate/toDate if valid
  const filteredParams = { ...params };
  if (filteredParams.fromDate && isNaN(Date.parse(filteredParams.fromDate))) {
    delete filteredParams.fromDate;
  }
  if (filteredParams.toDate && isNaN(Date.parse(filteredParams.toDate))) {
    delete filteredParams.toDate;
  }
  const { data } = await LocalAPI.get('/alerts/dashboard', { params: filteredParams });
  return data;
};

/**
 * Fetch team overload alerts.
 */
export const getTeamOverloadAlerts = async (): Promise<TeamOverloadAlert[]> => {
  const { data } = await LocalAPI.get('/alerts/team-overload');
  return data;
};

/**
 * Fetch reclamation alerts.
 */
export const getReclamationAlerts = async (): Promise<ReclamationAlert[]> => {
  const { data } = await LocalAPI.get('/alerts/reclamations');
  return data;
};

/**
 * Fetch AI-powered delay predictions.
 */
export const getDelayPredictions = async (): Promise<DelayPrediction> => {
  const { data } = await LocalAPI.get('/alerts/delay-predictions');
  return data;
};

/**
 * Fetch the list of priority bordereaux.
 */
export const getPriorityList = async (): Promise<PriorityBordereau[]> => {
  const { data } = await LocalAPI.get('/alerts/priority-list');
  return data;
};

/**
 * Fetch comparative analytics (planned vs actual).
 */
export const getComparativeAnalytics = async (): Promise<ComparativeAnalytics> => {
  const { data } = await LocalAPI.get('/alerts/comparative-analytics');
  return data;
};

/**
 * Fetch alert history with optional filters.
 * @param params AlertHistoryQuery
 */
export const getAlertHistory = async (params: AlertHistoryQuery): Promise<AlertHistoryEntry[]> => {
  const { data } = await LocalAPI.get('/alerts/history', { params });
  return data;
};

/**
 * Mark an alert as resolved.
 * @param alertId string
 */
export const resolveAlert = async (alertId: string): Promise<AlertHistoryEntry> => {
  const { data } = await LocalAPI.get('/alerts/resolve', { params: { alertId } });
  return data;
};
export default {
  getAlertsDashboard,
  getTeamOverloadAlerts,
  getReclamationAlerts,
  getDelayPredictions,
  getPriorityList,
  getComparativeAnalytics,
  getAlertHistory,
  resolveAlert,
};