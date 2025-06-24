import { LocalAPI } from './axios';

// AI Priorities
export async function getPrioritiesAI(items: any) {
  const { data } = await LocalAPI.post('/analytics/ai/priorities', items);
  return data;
}

// AI Reassignment
export async function getReassignmentAI(payload: any) {
  const { data } = await LocalAPI.post('/analytics/ai/reassignment', payload);
  return data;
}

// AI Performance
export async function getPerformanceAI(payload: any) {
  const { data } = await LocalAPI.post('/analytics/ai/performance', payload);
  return data;
}

// AI Compare Performance
export async function getComparePerformanceAI(payload: any) {
  const { data } = await LocalAPI.post('/analytics/ai/compare-performance', payload);
  return data;
}

// AI Diagnostic Optimisation
export async function getDiagnosticOptimisationAI(payload: any) {
  const { data } = await LocalAPI.post('/analytics/ai/diagnostic-optimisation', payload);
  return data;
}

// AI Predict Resources
export async function getPredictResourcesAI(payload: any) {
  const { data } = await LocalAPI.post('/analytics/ai/predict-resources', payload);
  return data;
}