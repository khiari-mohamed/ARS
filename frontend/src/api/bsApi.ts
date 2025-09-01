import axios from 'axios';
import {
  BulletinSoin,
  BSListResponse,
  BsLog,
  ExpertiseInfo,
} from '../types/bs';

const API_BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bulletin-soin`;

export const fetchBSList = async (params: any): Promise<BSListResponse> => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    // Clean up params to match backend expectations
    const cleanParams: any = {
      page: params.page,
      limit: params.limit,
      etat: params.etat,
      search: params.search,
      prestataire: params.prestataire,
      dateStart: params.dateStart,
      dateEnd: params.dateEnd
    };
    
    // Remove undefined values
    Object.keys(cleanParams).forEach(key => {
      if (cleanParams[key] === undefined || cleanParams[key] === '') {
        delete cleanParams[key];
      }
    });
    
    const { data } = await axios.get(API_BASE, { params: cleanParams, headers });
    return data;
  } catch (error) {
    console.error('BS List API error:', error);
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }
};

export const fetchBSDetails = async (id: number | string): Promise<BulletinSoin> => {
  const { data } = await axios.get(`${API_BASE}/${id}`);
  return data;
};

export const updateBS = async (id: number | string, payload: Partial<BulletinSoin>) => {
  const { data } = await axios.patch(`${API_BASE}/${id}`, payload);
  return data;
};

export const assignBS = async (id: number | string, ownerId: string | number) => {
  const { data } = await axios.post(`${API_BASE}/${id}/assign`, { ownerId });
  return data;
};

export const fetchBSLogs = async (id: number | string): Promise<BsLog[]> => {
  const { data } = await axios.get(`${API_BASE}/${id}/logs`);
  return data;
};

export const addBSLog = async (id: number | string, action: string) => {
  const { data } = await axios.post(`${API_BASE}/${id}/logs`, { action });
  return data;
};

export const fetchBSOcr = async (id: number | string): Promise<{ ocrText: string }> => {
  const { data } = await axios.get(`${API_BASE}/${id}/ocr`);
  return data;
};

export const fetchBSExpertise = async (id: number | string): Promise<ExpertiseInfo[]> => {
  const { data } = await axios.get(`${API_BASE}/${id}/expertise`);
  return data;
};

export const upsertBSExpertise = async (id: number | string, payload: ExpertiseInfo) => {
  const { data } = await axios.post(`${API_BASE}/${id}/expertise`, payload);
  return data;
};


// src/api/bsApi.ts

// ...existing imports and API_BASE...

// SLA Alerts
export const fetchSlaAlerts = async () => {
  const { data } = await axios.get(`${API_BASE}/sla/alerts`);
  return data;
};

// Performance Metrics
export const fetchPerformanceMetrics = async (params: { start?: string; end?: string }) => {
  const { data } = await axios.get(`${API_BASE}/kpi/performance`, { params });
  return data;
};

// AI Assignment Suggestions
export const fetchAssignmentSuggestions = async () => {
  const { data } = await axios.get(`${API_BASE}/ai/suggest-assignment`);
  return data;
};

// AI Priorities
export const fetchPriorities = async (gestionnaireId: string | number) => {
  const { data } = await axios.get(`${API_BASE}/ai/suggest-priorities/${gestionnaireId}`);
  return data;
};

// Rebalancing Suggestions
export const fetchRebalancingSuggestions = async () => {
  const { data } = await axios.get(`${API_BASE}/suggest-rebalancing`);
  return data;
};

// Apply Rebalancing
export const applyRebalancing = async (bsId: string, toUserId: string) => {
  const { data } = await axios.post(`${API_BASE}/apply-rebalancing`, { bsId, toUserId });
  return data;
};

// Reconciliation Report
export const fetchReconciliationReport = async () => {
  const { data } = await axios.get(`${API_BASE}/reconcile-payments`);
  return data;
};

// Payment Status for a BS
export const fetchPaymentStatus = async (id: number | string) => {
  const { data } = await axios.get(`${API_BASE}/${id}/payment-status`);
  return data;
};

// Mark BS as Paid
export const markBsAsPaid = async (id: number | string) => {
  const { data } = await axios.patch(`${API_BASE}/${id}/mark-paid`);
  return data;
};

// Team workload analysis
export const fetchAnalyseCharge = async () => {
  const { data } = await axios.get(`${API_BASE}/analyse-charge`);
  return data;
};

export const fetchTeamWorkload = async () => {
  const { data } = await axios.get(`${API_BASE}/stats/team-workload`);
  return data;
};

// Notification Center (example, if you have a notifications endpoint)
export const fetchNotifications = async () => {
  const { data } = await axios.get(`${API_BASE}/notifications`);
  return data;
};

// BS Analytics APIs
export const fetchBSAnalyticsDashboard = async (period?: string) => {
  const { data } = await axios.get(`${API_BASE}/analytics/dashboard`, { params: { period } });
  return data;
};

export const fetchBSTrends = async (period?: string) => {
  const { data } = await axios.get(`${API_BASE}/analytics/trends`, { params: { period } });
  return data;
};

export const fetchBSSlaCompliance = async (period?: string) => {
  const { data } = await axios.get(`${API_BASE}/analytics/sla-compliance`, { params: { period } });
  return data;
};

export const fetchBSTeamPerformance = async (period?: string) => {
  const { data } = await axios.get(`${API_BASE}/analytics/team-performance`, { params: { period } });
  return data;
};

export const fetchBSVolumeStats = async (period?: string) => {
  const { data } = await axios.get(`${API_BASE}/analytics/volume-stats`, { params: { period } });
  return data;
};