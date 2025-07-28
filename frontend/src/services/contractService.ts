import { LocalAPI } from './axios';

export interface Contract {
  assignedManagerId: string;
  delaiReglement: any;
  name: string;
  id: string | number;
  nom: string;
  numero: string;
  nomSociete: string;
  nomAssurance: string;
  dateEffet: string;
  dateFin: string;
  plafond: string;
  contractNotes: string;
  nbMintutesDelaiObservation: number;
  participationAdherent: string;
}

// Local backend endpoints
export const fetchContracts = async (): Promise<Contract[]> => {
  const res = await LocalAPI.get('/contracts');
  return res.data;
};

export const fetchContractById = async (id: string | number): Promise<Contract> => {
  const res = await LocalAPI.get(`/contracts/${id}`);
  return res.data;
};

// External API endpoints
export const fetchExternalContracts = async (): Promise<Contract[]> => {
  const res = await LocalAPI.get('https://197.14.56.112:8083/api/prestations');
  return res.data.content || res.data;
};

export const fetchExternalContractById = async (id: string | number): Promise<Contract> => {
  const res = await LocalAPI.get(`https://197.14.56.112:8083/api/prestations/${id}`);
  return res.data;
};

// By client
export const fetchContractsByClient = async (clientId: string | number): Promise<any[]> => {
  const res = await LocalAPI.get(`/contracts?clientId=${clientId}`);
  return res.data;
};

// GED Upload (Contract Document Upload)
export const uploadContractDocument = async (clientId: string | number, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await LocalAPI.post(`/contracts/upload?clientId=${clientId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Update contract (for inline edit)
export const updateContract = async (id: string | number, data: Partial<Contract>): Promise<Contract> => {
  const res = await LocalAPI.patch(`/contracts/${id}`, data);
  return res.data;
};


export const getContract = async (id: string) => {
  const { data } = await LocalAPI.get(`/contracts/${id}`);
  return data;
};

export const updateContractThresholds = async (id: string, thresholds: any) => {
  const { data } = await LocalAPI.patch(`/contracts/${id}/thresholds`, thresholds);
  return data;
};