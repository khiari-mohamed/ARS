import { LocalAPI, ExternalAPI } from '../services/axios';
import {
  Virement,
  VirementSearchParams,
  Bordereau,
  VirementHistoryEntry,
} from '../types/finance';

// Local backend API
const BASE_URL = '/virements';

// Virements
export const fetchVirements = async (params: VirementSearchParams): Promise<Virement[]> => {
  const { data } = await LocalAPI.get(`${BASE_URL}/search`, { params });
  return data;
};

export const fetchVirementById = async (id: string): Promise<Virement> => {
  const { data } = await LocalAPI.get(`${BASE_URL}/${id}`);
  return data;
};

export const confirmVirement = async (id: string, confirmationNote?: string): Promise<Virement> => {
  const { data } = await LocalAPI.patch(`${BASE_URL}/${id}/confirm`, { confirmationNote });
  return data;
};

export const exportVirements = async (
  format: 'excel' | 'pdf',
  params: VirementSearchParams
): Promise<Blob> => {
  const { data } = await LocalAPI.get(`${BASE_URL}/export`, {
    params: { ...params, format },
    responseType: 'blob',
  });
  return data;
};

export const fetchVirementHistory = async (id: string): Promise<VirementHistoryEntry[]> => {
  const { data } = await LocalAPI.get(`${BASE_URL}/${id}/history`);
  return data;
};

export const linkBordereauxToVirement = async (
  virementId: string,
  bordereauIds: string[]
): Promise<Virement> => {
  const { data } = await LocalAPI.post(`${BASE_URL}/${virementId}/bordereaux`, { bordereauIds });
  return data;
};

// External API: Fetch clients
export const fetchClients = async (): Promise<{ id: string; name: string }[]> => {
  const { data } = await ExternalAPI.get('/api/sociétés');
  return data.content.map((societe: any) => ({
    id: societe.id,
    name: societe.name,
  }));
};

// External API: Fetch bordereaux for a client
export const fetchBordereauxByClient = async (clientId: string): Promise<Bordereau[]> => {
  const { data } = await ExternalAPI.get('/api/bordereaux', {
    params: { clientId },
  });
  return data.content.map((b: any) => ({
    id: b.id,
    reference: b.code,
    clientId: clientId,
    clientName: b.nomSociete,
    totalAmount: b.totalAmount || 0,
    status: b.status,
  }));
};

// Auto-confirm virements (new endpoint)
export const autoConfirmVirements = async (): Promise<{ autoConfirmed: number }> => {
  const { data } = await LocalAPI.post(`${BASE_URL}/auto-confirm`);
  return data;
};