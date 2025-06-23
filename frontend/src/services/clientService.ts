import { LocalAPI, ExternalAPI } from './axios';
import { Client } from '../types/client.d';

// --- Types for External API DTOs ---
export interface Societe {
  id: number;
  name: string;
  address: string;
  email: string;
  phone: string;
  fax: string;
  website: string;
  prefix: string;
  mobile: string;
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

export interface ProduitDTO {
  id: number;
  name: string;
  discipline: string;
  price: number;
  refrenceInterne: string;
  lettreCle: string;
  codePharmacieCentrale: string;
  codeBarre: string;
  nombre: string;
  categorieReseau: boolean;
  nbJourDeDepassement: number;
  idAssuranceCampagnie: number;
  idARS: number;
  codeDCI: string;
}

export interface Pageable {
  page?: number;
  size?: number;
  sort?: string;
}

export interface Page<T> {
  totalPages: number;
  totalElements: number;
  size: number;
  content: T[];
  number: number;
  sort: any;
  first: boolean;
  numberOfElements: number;
  last: boolean;
  pageable: any;
  empty: boolean;
}

// --- Local backend endpoints ---
export const fetchClients = async (params?: any): Promise<Client[]> => {
  const res = await LocalAPI.get('/clients', { params });
  return res.data;
};

export const fetchClient = async (id: string | number): Promise<Client> => {
  return fetchClientById(id);
};

export const fetchClientById = async (id: string | number): Promise<Client> => {
  const res = await LocalAPI.get(`/clients/${id}`);
  return res.data;
};

export const createClient = async (data: Partial<Client>): Promise<Client> => {
  const res = await LocalAPI.post('/clients', data);
  return res.data;
};

export const updateClient = async (id: string | number, data: Partial<Client>): Promise<Client> => {
  const res = await LocalAPI.patch(`/clients/${id}`, data);
  return res.data;
};

export const deleteClient = async (id: string | number): Promise<void> => {
  await LocalAPI.delete(`/clients/${id}`);
};

export const fetchClientHistory = async (id: string | number): Promise<any> => {
  const res = await LocalAPI.get(`/clients/${id}/history`);
  return res.data;
};

export const fetchClientAnalytics = async (id: string | number): Promise<any> => {
  const res = await LocalAPI.get(`/clients/${id}/analytics`);
  return res.data;
};

// Client-related sub-entity endpoints
export const fetchBordereauxByClient = async (clientId: string | number): Promise<any[]> => {
  const res = await LocalAPI.get(`/clients/${clientId}/bordereaux`);
  return res.data;
};

export const fetchComplaintsByClient = async (clientId: string | number): Promise<any[]> => {
  const res = await LocalAPI.get(`/clients/${clientId}/complaints`);
  return res.data;
};

export const createComplaint = async (clientId: string | number, data: any): Promise<any> => {
  const res = await LocalAPI.post(`/clients/${clientId}/complaints`, data);
  return res.data;
};

// --- External API endpoints (ARS Assurance) ---

// Societes (Clients)
export const fetchExternalClients = async (params?: Pageable): Promise<Page<Societe>> => {
  const res = await ExternalAPI.get('/api/sociétés', { params });
  return res.data;
};

export const fetchExternalClientById = async (id: string | number): Promise<Societe> => {
  const res = await ExternalAPI.get(`/api/societes/${id}`);
  return res.data;
};

// Users
export const fetchExternalUsers = async (params?: Pageable): Promise<Page<UserDTO>> => {
  const res = await ExternalAPI.get('/api/users', { params });
  return res.data;
};

export const fetchExternalUserById = async (id: string | number): Promise<UserDTO> => {
  const res = await ExternalAPI.get(`/api/users/${id}`);
  return res.data;
};

// Produits
export const fetchExternalProduits = async (params?: Pageable): Promise<Page<ProduitDTO>> => {
  const res = await ExternalAPI.get('/api/produits', { params });
  return res.data;
};

export const fetchExternalProduitById = async (id: string | number): Promise<ProduitDTO> => {
  const res = await ExternalAPI.get(`/api/produits/${id}`);
  return res.data;
};

// Add similar wrappers for prestations, prestataires, chapitres, bulletin-soin, bordereaux, beneficiaires, adherents as needed
// Example for Bordereaux:
export const fetchExternalBordereaux = async (params?: Pageable): Promise<any> => {
  const res = await ExternalAPI.get('/api/bordereaux', { params });
  return res.data;
};

export const fetchExternalBordereauById = async (id: string | number): Promise<any> => {
  const res = await ExternalAPI.get(`/api/bordereaux/${id}`);
  return res.data;
};

// --- Export endpoints (stub for backend integration) ---
export const exportClientsToExcel = async (params?: any): Promise<Blob> => {
  const res = await LocalAPI.post('/clients/export/excel', params, { responseType: 'blob' });
  return res.data;
};

export const exportClientsToPDF = async (params?: any): Promise<Blob> => {
  const res = await LocalAPI.post('/clients/export/pdf', params, { responseType: 'blob' });
  return res.data;
};

// --- AI Recommendation endpoint (stub for backend integration) ---
export const fetchClientAIRecommendations = async (clientId: string | number): Promise<{ recommendation: string }> => {
  const res = await LocalAPI.get(`/clients/${clientId}/ai-recommendation`);
  return res.data;
};

// --- External Sync endpoint ---
export const syncExternalClient = async (clientId: string | number): Promise<any> => {
  const res = await LocalAPI.post(`/clients/${clientId}/sync-external`);
  return res.data;
};


/**
 * Fetch monthly bordereaux trends for a client.
 * Calls GET /clients/:id/trends on the backend.
 */
export const fetchClientTrends = async (clientId: string): Promise<any> => {
  const res = await LocalAPI.get(`/clients/${clientId}/trends`);
  return res.data;
};