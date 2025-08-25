import { LocalAPI } from './axios';

export const fetchClients = async (filters?: any) => {
  const { data } = await LocalAPI.get('/clients', { params: filters });
  return data;
};

export const fetchClient = async (id: string) => {
  const { data } = await LocalAPI.get(`/clients/${id}`);
  return data;
};

export const fetchClientById = async (id: string) => {
  return await fetchClient(id);
};

export const createClient = async (clientData: any) => {
  const { data } = await LocalAPI.post('/clients', clientData);
  return data;
};

export const updateClient = async (id: string, clientData: any) => {
  const { data } = await LocalAPI.patch(`/clients/${id}`, clientData);
  return data;
};

export const deleteClient = async (id: string) => {
  await LocalAPI.delete(`/clients/${id}`);
  return { success: true };
};

export const fetchClientAnalytics = async (clientId?: string) => {
  const url = clientId ? `/clients/${clientId}/analytics` : '/clients/analytics';
  const { data } = await LocalAPI.get(url);
  return data;
};

export const fetchClientHistory = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/history`);
  return data;
};

export const fetchClientTrends = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/trends`);
  return data;
};

export const fetchClientAIRecommendations = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/ai-recommendation`);
  return data;
};

export const syncExternalClient = async (clientId: string) => {
  const { data } = await LocalAPI.post(`/clients/${clientId}/sync-external`);
  return data;
};

export const createComplaint = async (clientId: string, complaintData: any) => {
  const { data } = await LocalAPI.post(`/clients/${clientId}/complaints`, complaintData);
  return data;
};

export const fetchBordereauxByClient = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/bordereaux`);
  return data;
};

export const fetchComplaintsByClient = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/complaints`);
  return data;
};

export const exportClientsToExcel = async (params?: any) => {
  const { data } = await LocalAPI.post('/clients/export/excel', params, { responseType: 'blob' });
  return data;
};

export const exportClientsToPDF = async (params?: any) => {
  const { data } = await LocalAPI.post('/clients/export/pdf', params, { responseType: 'blob' });
  return data;
};

export interface Societe {
  id: string;
  name: string;
}

// === NEW FUNCTIONS FOR 100% COMPLETION ===

// --- Performance Analytics ---
export const fetchClientPerformanceAnalytics = async (clientId: string, period: string = 'monthly') => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/performance-analytics`, {
    params: { period }
  });
  return data;
};

// --- Bulk Import/Export ---
export const bulkImportClients = async (file: File, validateOnly: boolean = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await LocalAPI.post('/clients/bulk-import', formData, {
    params: { validateOnly: validateOnly.toString() },
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const exportClientsAdvanced = async (format: 'csv' | 'excel' | 'pdf', filters?: any) => {
  const { data } = await LocalAPI.get('/clients/export/advanced', {
    params: { format, ...filters },
    responseType: 'blob'
  });
  return data;
};

// --- Communication History ---
export const addCommunicationLog = async (clientId: string, logData: any) => {
  const { data } = await LocalAPI.post(`/clients/${clientId}/communication`, logData);
  return data;
};

export const fetchCommunicationHistory = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/communication-history`);
  return data;
};

export const fetchCommunicationTemplates = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/communication-templates`);
  return data;
};

// --- Risk Assessment ---
export const fetchClientRiskAssessment = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/risk-assessment`);
  return data;
};

export const updateClientRiskThresholds = async (clientId: string, thresholds: any) => {
  const { data } = await LocalAPI.post(`/clients/${clientId}/risk-thresholds`, thresholds);
  return data;
};

// --- SLA Management ---
export const fetchClientSLAConfig = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/sla-config`);
  return data;
};

export const updateClientSLAConfig = async (clientId: string, config: any) => {
  const { data } = await LocalAPI.patch(`/clients/${clientId}/sla-config`, config);
  return data;
};

export const fetchClientSLAStatus = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/sla-status`);
  return data;
};

// --- Contract Management ---
export const uploadClientContract = async (clientId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await LocalAPI.post(`/clients/${clientId}/upload-contract`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const downloadClientContract = async (documentId: string) => {
  const response = await LocalAPI.get(`/clients/contract/${documentId}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

// --- Performance Metrics ---
export const fetchClientPerformanceMetrics = async (clientId: string) => {
  const { data } = await LocalAPI.get(`/clients/${clientId}/performance`);
  return data;
};

// --- Users/Gestionnaires ---
export const fetchAvailableGestionnaires = async () => {
  const { data } = await LocalAPI.get('/users', {
    params: { role: 'GESTIONNAIRE' }
  });
  return data;
};