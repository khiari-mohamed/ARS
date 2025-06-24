import { LocalAPI } from './axios';

// AI Priorities
export async function getPrioritiesAI(items: any) {
  const params = new URLSearchParams({ items: JSON.stringify(items) });
  const { data } = await LocalAPI.get(`/analytics/ai/priorities?${params.toString()}`);
  return data;
}

// AI Reassignment
export async function getReassignmentAI(payload: any) {
  const params = new URLSearchParams({ payload: JSON.stringify(payload) });
  const { data } = await LocalAPI.get(`/analytics/ai/reassignment?${params.toString()}`);
  return data;
}

// AI Performance
export async function getPerformanceAI(payload: any) {
  const params = new URLSearchParams({ payload: JSON.stringify(payload) });
  const { data } = await LocalAPI.get(`/analytics/ai/performance?${params.toString()}`);
  return data;
}

// AI Compare Performance
export async function getComparePerformanceAI(payload: any) {
  const params = new URLSearchParams({ payload: JSON.stringify(payload) });
  const { data } = await LocalAPI.get(`/analytics/ai/compare-performance?${params.toString()}`);
  return data;
}

// AI Diagnostic Optimisation
export async function getDiagnosticOptimisationAI(payload: any) {
  const params = new URLSearchParams({ payload: JSON.stringify(payload) });
  const { data } = await LocalAPI.get(`/analytics/ai/diagnostic-optimisation?${params.toString()}`);
  return data;
}

// AI Predict Resources
export async function getPredictResourcesAI(payload: any) {
  const params = new URLSearchParams({ payload: JSON.stringify(payload) });
  const { data } = await LocalAPI.get(`/analytics/ai/predict-resources?${params.toString()}`);
  return data;
}
