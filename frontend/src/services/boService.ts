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

export const fetchBODashboard = async () => {
  const response = await LocalAPI.get('/bo/dashboard');
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