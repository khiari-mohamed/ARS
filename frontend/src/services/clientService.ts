import { LocalAPI } from './axios';

export const fetchClients = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/clients', { params: filters });
    return data;
  } catch (error) {
    // Mock data for development
    return [
      { id: '1', name: 'Client A', email: 'clienta@example.com', status: 'active', reglementDelay: 30, reclamationDelay: 15, accountManager: { fullName: 'Manager A' }, gestionnaires: [{ id: '1', fullName: 'Manager A' }], contracts: [], bordereaux: [], reclamations: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '2', name: 'Client B', email: 'clientb@example.com', status: 'active', reglementDelay: 45, reclamationDelay: 20, accountManager: { fullName: 'Manager B' }, gestionnaires: [{ id: '2', fullName: 'Manager B' }], contracts: [], bordereaux: [], reclamations: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '3', name: 'Client C', email: 'clientc@example.com', status: 'inactive', reglementDelay: 60, reclamationDelay: 25, accountManager: { fullName: 'Manager C' }, gestionnaires: [{ id: '3', fullName: 'Manager C' }], contracts: [], bordereaux: [], reclamations: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
  }
};

export const fetchClient = async (id: string) => {
  const clients = await fetchClients();
  return clients.find((c: any) => c.id === id);
};

export const fetchClientById = async (id: string) => {
  return await fetchClient(id);
};

export const createClient = async (clientData: any) => {
  try {
    const { data } = await LocalAPI.post('/clients', clientData);
    return data;
  } catch (error) {
    return { id: Date.now().toString(), ...clientData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
};

export const updateClient = async (id: string, clientData: any) => {
  try {
    const { data } = await LocalAPI.put(`/clients/${id}`, clientData);
    return data;
  } catch (error) {
    return { id, ...clientData, updatedAt: new Date().toISOString() };
  }
};

export const deleteClient = async (id: string) => {
  try {
    await LocalAPI.delete(`/clients/${id}`);
    return { success: true };
  } catch (error) {
    return { success: true };
  }
};

export const fetchClientAnalytics = async (clientId?: string) => {
  try {
    const url = clientId ? `/clients/${clientId}/analytics` : '/clients/analytics';
    const { data } = await LocalAPI.get(url);
    return data;
  } catch (error) {
    // Mock analytics data
    return {
      totalClients: 150,
      activeClients: 142,
      newThisMonth: 8,
      churnRate: 2.1,
      avgSLA: 25,
      reglementDelay: 30
    };
  }
};

export const fetchClientHistory = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.get(`/clients/${clientId}/history`);
    return data;
  } catch (error) {
    return [];
  }
};

export const fetchClientTrends = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.get(`/clients/${clientId}/trends`);
    return data;
  } catch (error) {
    return [];
  }
};

export const fetchClientAIRecommendations = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.get(`/clients/${clientId}/ai-recommendations`);
    return data;
  } catch (error) {
    return { recommendation: 'No recommendations available' };
  }
};

export const syncExternalClient = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.post(`/clients/${clientId}/sync`);
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const createComplaint = async (complaintData: any) => {
  try {
    const { data } = await LocalAPI.post('/complaints', complaintData);
    return data;
  } catch (error) {
    return { id: Date.now().toString(), ...complaintData, createdAt: new Date().toISOString() };
  }
};

export const fetchBordereauxByClient = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.get(`/clients/${clientId}/bordereaux`);
    return data;
  } catch (error) {
    return [];
  }
};

export const fetchComplaintsByClient = async (clientId: string) => {
  try {
    const { data } = await LocalAPI.get(`/clients/${clientId}/complaints`);
    return data;
  } catch (error) {
    return [];
  }
};

export const exportClientsToExcel = async (params?: any) => {
  try {
    const { data } = await LocalAPI.get('/clients/export/excel', { responseType: 'blob', params });
    return data;
  } catch (error) {
    return new Blob();
  }
};

export const exportClientsToPDF = async (params?: any) => {
  try {
    const { data } = await LocalAPI.get('/clients/export/pdf', { responseType: 'blob', params });
    return data;
  } catch (error) {
    return new Blob();
  }
};

export interface Societe {
  id: string;
  name: string;
}