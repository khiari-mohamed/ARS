import axios from 'axios';
import {
  BulletinSoin,
  BSListResponse,
  BsLog,
  ExpertiseInfo,
} from '../types/bs';

const API_BASE = 'http://localhost:5000/api/bulletin-soin';

export const fetchBSList = async (params: any): Promise<BSListResponse> => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await axios.get(API_BASE, { params, headers });
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