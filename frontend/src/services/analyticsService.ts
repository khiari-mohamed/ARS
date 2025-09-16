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
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return null;
  }
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

// AI Forecast Trends
export async function getForecastTrendsAI(historicalData: any[]) {
  const { data } = await LocalAPI.post('/analytics/ai/forecast-trends', historicalData);
  return data;
}

// Advanced Clustering
export async function getAdvancedClusteringAI(processData: any[]) {
  const { data } = await LocalAPI.post('/analytics/ai/advanced-clustering', { process_data: processData });
  return data;
}

// Sophisticated Anomaly Detection
export async function getSophisticatedAnomalyDetectionAI(performanceData: any[]) {
  const { data } = await LocalAPI.post('/analytics/ai/sophisticated-anomaly-detection', { performance_data: performanceData });
  return data;
}

// Executive Report Generation
export async function generateExecutiveReportAI(reportParams: any) {
  const { data } = await LocalAPI.post('/analytics/ai/executive-report', reportParams);
  return data;
}

// Advanced Analytics API Extensions
export async function getAdvancedClustering() {
  const { data } = await LocalAPI.post('/analytics/ai/advanced-clustering', {});
  return data;
}

export async function getSophisticatedAnomalyDetection() {
  const { data } = await LocalAPI.post('/analytics/ai/sophisticated-anomaly-detection', {});
  return data;
}

export async function generateExecutiveReport(params: any = {}) {
  const { data } = await LocalAPI.post('/analytics/ai/executive-report', params);
  return data;
}