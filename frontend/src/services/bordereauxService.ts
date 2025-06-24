import { LocalAPI } from './axios';

// --- Original Exports (restore all previous functions) ---
export async function fetchBordereaux(params?: any) {
  const { data } = await LocalAPI.get('/bordereaux', { params });
  return data;
}

export async function fetchBordereau(id: string) {
  const { data } = await LocalAPI.get(`/bordereaux/${id}`);
  return data;
}

export async function createBordereau(payload: any) {
  const { data } = await LocalAPI.post('/bordereaux', payload);
  return data;
}

export async function updateBordereau(id: string, payload: any) {
  const { data } = await LocalAPI.patch(`/bordereaux/${id}`, payload);
  return data;
}

export async function fetchKPIs() {
  const { data } = await LocalAPI.get('/bordereaux/kpis');
  return data;
}

export async function fetchBSList(bordereauId: string) {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/bs`);
  return data;
}

export async function fetchDocuments(bordereauId: string) {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/documents`);
  return data;
}

export async function fetchVirement(bordereauId: string) {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/virement`);
  return data;
}

export async function fetchAlerts(bordereauId: string) {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/alerts`);
  return data;
}

export async function searchBordereauxAndDocuments(query: string) {
  const { data } = await LocalAPI.get('/bordereaux/search', { params: { query } });
  return data;
}

export async function analyzeComplaintsAI() {
  const { data } = await LocalAPI.get('/bordereaux/ai/complaints');
  return data;
}

export async function getAIRecommendations() {
  const { data } = await LocalAPI.get('/bordereaux/ai/recommendations');
  return data;
}

export async function fetchForecastBordereaux(days = 7) {
  const { data } = await LocalAPI.get('/bordereaux/forecast/bordereaux', { params: { days } });
  return data;
}

export async function fetchEstimateStaffing(days = 7, avgPerStaffPerDay = 5) {
  const { data } = await LocalAPI.get('/bordereaux/forecast/staffing', { params: { days, avgPerStaffPerDay } });
  return data;
}

// --- AI Predict Resources (Bordereaux context) ---
export async function getPredictResourcesBordereauxAI(payload: any) {
  const { data } = await LocalAPI.post('/bordereaux/ai/predict-resources', payload);
  return data;
}

// --- Restore getReclamationSuggestions for ComplaintDetails.tsx ---
export async function getReclamationSuggestions(id: string) {
  const { data } = await LocalAPI.get(`/bordereaux/ai/reclamations/suggestions/${id}`);
  return data.suggestion || data;
}
