import { LocalAPI } from './axios';

export interface CreateBOEntryDto {
  reference?: string;
  clientId?: string;
  contractId?: string;
  documentType?: string;
  nombreDocuments?: number;
  delaiReglement?: number;
  dateReception?: string;
  startTime?: number;
}

export const fetchBODashboard = async (filters?: {
  clientId?: string;
  chefEquipeId?: string;
  dateFrom?: string;
  dateTo?: string;
  statut?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.clientId) params.append('clientId', filters.clientId);
  if (filters?.chefEquipeId) params.append('chefEquipeId', filters.chefEquipeId);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.statut) params.append('statut', filters.statut);
  
  const response = await LocalAPI.get(`/bo/dashboard?${params.toString()}`);
  return response.data;
};

export const generateReference = async (type: string, clientId?: string) => {
  const response = await LocalAPI.post('/bo/generate-reference', { type, clientId });
  return response.data;
};

export const classifyDocument = async (fileName: string) => {
  const response = await LocalAPI.post('/bo/classify-document', { fileName });
  return response.data;
};

export const createBOEntry = async (entry: CreateBOEntryDto) => {
  const response = await LocalAPI.post('/bo/create-entry', entry);
  return response.data;
};

export const createBOBatch = async (entries: CreateBOEntryDto[]) => {
  const response = await LocalAPI.post('/bo/create-batch', { entries });
  return response.data;
};

export const getBOPerformance = async (userId?: string, period: string = 'daily') => {
  const response = await LocalAPI.get('/bo/performance', { 
    params: { userId, period } 
  });
  return response.data;
};

export const validateDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await LocalAPI.post('/bo/validate-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const validateDocuments = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  const response = await LocalAPI.post('/bo/validate-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const simulateWorkflow = async () => {
  const response = await LocalAPI.post('/bo/simulate-workflow');
  return response.data;
};

export const progressBordereauStatus = async (bordereauId: string, status: string) => {
  const response = await LocalAPI.post(`/bo/progress-status/${bordereauId}`, { status });
  return response.data;
};