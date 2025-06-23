import { LocalAPI, ExternalAPI } from './axios';

// Local backend endpoints
export const fetchBordereaux = async (params?: Record<string, any>) => {
  const { data } = await LocalAPI.get('/bordereaux', { params });
  return data;
};

export const fetchBordereau = async (id: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/${id}`);
  return data;
};

export const createBordereau = async (payload: any) => {
  const { data } = await LocalAPI.post('/bordereaux', payload);
  return data;
};

export const updateBordereau = async (id: string, payload: any) => {
  const { data } = await LocalAPI.patch(`/bordereaux/${id}`, payload);
  return data;
};

export const deleteBordereau = async (id: string) => {
  const { data } = await LocalAPI.delete(`/bordereaux/${id}`);
  return data;
};

export const assignBordereau = async (payload: any) => {
  const { data } = await LocalAPI.post('/bordereaux/assign', payload);
  return data;
};

export const fetchBSList = async (bordereauId: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/bs`);
  return data;
};

export const fetchDocuments = async (bordereauId: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/documents`);
  return data;
};

export const fetchVirement = async (bordereauId: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/virement`);
  return data;
};

export const fetchAlerts = async (bordereauId: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/${bordereauId}/alerts`);
  return data;
};

export const fetchKPIs = async () => {
  const { data } = await LocalAPI.get('/bordereaux/kpis');
  return data;
};

export const fetchApproachingDeadlines = async () => {
  const { data } = await LocalAPI.get('/bordereaux/approaching-deadlines');
  return data;
};

export const fetchOverdueBordereaux = async () => {
  const { data } = await LocalAPI.get('/bordereaux/overdue');
  return data;
};

// Export CSV
export const exportCSV = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/export/csv', { responseType: 'blob' });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export Excel
export const exportExcel = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/export/excel', { responseType: 'blob' });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export PDF
export const exportPDF = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/export/pdf', { responseType: 'blob' });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Upload Document
export const uploadDocument = async (bordereauId: string, formData: FormData) => {
  try {
    const response = await LocalAPI.post(`/bordereaux/${bordereauId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// External API endpoints
export const fetchExternalBordereaux = async (params?: Record<string, any>) => {
  const { data } = await ExternalAPI.get('/bordereaux', { params });
  return data.content || data;
};

export const fetchExternalBordereau = async (id: string) => {
  const { data } = await ExternalAPI.get(`/bordereaux/${id}`);
  return data;
};

export const fetchForecastBordereaux = async (days = 7) => {
  const { data } = await LocalAPI.get('/bordereaux/forecast/bordereaux', { params: { days } });
  return data;
};

export const fetchEstimateStaffing = async (days = 7, avgPerStaffPerDay = 5) => {
  const { data } = await LocalAPI.get('/bordereaux/forecast/staffing', { params: { days, avgPerStaffPerDay } });
  return data;
};

// Real AI analysis endpoint
export const analyzeComplaintsAI = async () => {
  const { data } = await LocalAPI.get('/bordereaux/ai/reclamations/analyze');
  return data;
};

// Real AI recommendations endpoint
export const getAIRecommendations = async () => {
  const { data } = await LocalAPI.get('/bordereaux/ai/teams/recommendations');
  return data;
};

export const getAIAlerts = async () => {
  const { data } = await LocalAPI.get('/bordereaux/ai/alerts');
  return data;
};
export const searchBordereauxAndDocuments = async (query: string) => {
  const { data } = await LocalAPI.get('/bordereaux/search', { params: { query } });
  return data;
};

export const analyzeReclamationsAI = async () => {
  const { data } = await LocalAPI.get('/bordereaux/ai/reclamations/analyze');
  return data;
};
export const getReclamationSuggestions = async (id: string) => {
  const { data } = await LocalAPI.get(`/bordereaux/ai/reclamations/suggestions/${id}`);
  return data;
};
export const getTeamRecommendations = async () => {
  const { data } = await LocalAPI.get('/bordereaux/ai/teams/recommendations');
  return data;
};
