import { LocalAPI } from '../services/axios';
import {
  Reclamation,
  CreateReclamationDTO,
  UpdateReclamationDTO,
  SearchReclamationDTO,
  ReclamationHistory,
  ReclamationStats,
} from '../types/reclamation.d';

/**
 * Fetch a paginated and filtered list of reclamations.
 */
export const fetchReclamations = async (params: SearchReclamationDTO) => {
  const { data } = await LocalAPI.get<Reclamation[]>('/reclamations/search', { params });
  return data;
};

/**
 * Fetch a single reclamation by ID.
 */
export const fetchReclamation = async (id: string) => {
  const { data } = await LocalAPI.get<Reclamation>(`/reclamations/${id}`);
  return data;
};

/**
 * Create a new reclamation (with optional file upload).
 */
export const createReclamation = async (dto: CreateReclamationDTO) => {
  const formData = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value as any);
    }
  });
  const { data } = await LocalAPI.post<Reclamation>('/reclamations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

/**
 * Update a reclamation (status, description, assignedToId).
 */
export const updateReclamation = async (id: string, dto: UpdateReclamationDTO) => {
  const { data } = await LocalAPI.patch<Reclamation>(`/reclamations/${id}`, dto);
  return data;
};

/**
 * Assign a reclamation to a user.
 */
export const assignReclamation = async (id: string, assignedToId: string) => {
  const { data } = await LocalAPI.patch<Reclamation>(`/reclamations/${id}/assign`, { assignedToId });
  return data;
};

/**
 * Escalate a reclamation (set status to ESCALATED).
 */
export const escalateReclamation = async (id: string) => {
  const { data } = await LocalAPI.patch<Reclamation>(`/reclamations/${id}/escalate`);
  return data;
};

/**
 * Fetch the history (timeline) of a reclamation.
 */
export const fetchReclamationHistory = async (id: string) => {
  const { data } = await LocalAPI.get<ReclamationHistory[]>(`/reclamations/${id}/history`);
  return data;
};

/**
 * Fetch dashboard statistics for reclamations.
 */
export const fetchReclamationStats = async () => {
  const { data } = await LocalAPI.get<ReclamationStats>('/reclamations/analytics/dashboard');
  return data;
};

/**
 * Fetch AI-based analysis (group by type, client, severity, root cause).
 */
export const fetchReclamationAIAnalysis = async () => {
  const { data } = await LocalAPI.get('/reclamations/ai/analysis');
  return data;
};

/**
 * Fetch trend data (for charting, grouped by day).
 */
export const fetchReclamationTrend = async () => {
  const { data } = await LocalAPI.get('/reclamations/trend');
  return data;
};

/**
 * Convert a reclamation to a task (integration with task system).
 */
export const convertReclamationToTask = async (id: string) => {
  const { data } = await LocalAPI.post(`/reclamations/${id}/convert-to-task`);
  return data;
};

/**
 * Get auto-reply suggestion for a reclamation (AI template).
 */
export const fetchAutoReplySuggestion = async (id: string) => {
  const { data } = await LocalAPI.get<{ suggestion: string | null }>(`/reclamations/${id}/auto-reply`);
  return data;
};

/**
 * Optionally: Fetch active alerts for reclamations (for alert/notification system).
 */
export const fetchReclamationAlerts = async () => {
  const { data } = await LocalAPI.get('/alerts/reclamations');
  return data;
};


/**
 * Send a notification (email/SMS) for a reclamation.
 */
export const notifyReclamation = async (
  id: string,
  payload: { type: string; email?: string; sms?: string; message?: string }
) => {
  const { data } = await LocalAPI.post(`/reclamations/${id}/notify`, payload);
  return data;
};

/**
 * Bulk update reclamations.
 */
export const bulkUpdateReclamations = async (
  ids: string[],
  data: Partial<UpdateReclamationDTO>
) => {
  const { data: result } = await LocalAPI.patch('/reclamations/bulk-update', { ids, data });
  return result;
};

/**
 * Bulk assign reclamations.
 */
export const bulkAssignReclamations = async (
  ids: string[],
  assignedToId: string
) => {
  const { data: result } = await LocalAPI.patch('/reclamations/bulk-assign', { ids, assignedToId });
  return result;
};

/**
 * Get SLA breaches.
 */
export const fetchSlaBreaches = async () => {
  const { data } = await LocalAPI.get('/reclamations/sla/breaches');
  return data;
};

/**
 * Trigger SLA check.
 */
export const triggerSlaCheck = async () => {
  const { data } = await LocalAPI.post('/reclamations/sla/check');
  return data;
};

/**
 * Generate a GEC document for a reclamation.
 */
export const generateGecDocument = async (id: string) => {
  const { data } = await LocalAPI.post(`/reclamations/${id}/gec/generate`);
  return data;
};

/**
 * Get a GEC document for a reclamation.
 */
export const fetchGecDocument = async (id: string) => {
  const { data } = await LocalAPI.get(`/reclamations/${id}/gec/document`);
  return data;
};

/**
 * AI/ML prediction for a given text (advanced analysis).
 */
export const aiPredictReclamation = async (text: string) => {
  const { data } = await LocalAPI.post('/reclamations/ai/predict', { text });
  return data;
};