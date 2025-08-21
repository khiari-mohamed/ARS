import { LocalAPI } from './axios';

// BO Dashboard
export const fetchBODashboard = async () => {
  const { data } = await LocalAPI.get('/bo/dashboard');
  return data;
};

// Reference Generation
export const generateReference = async (type: string, clientId?: string) => {
  const { data } = await LocalAPI.post('/bo/generate-reference', { type, clientId });
  return data;
};

// Document Classification
export const classifyDocument = async (fileName: string) => {
  const { data } = await LocalAPI.post('/bo/classify-document', { fileName });
  return data;
};

// Document Validation
export const validateDocuments = async (formData: FormData) => {
  const { data } = await LocalAPI.post('/bo/validate-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

// Define proper interfaces
interface CreateBOEntryDto {
  reference?: string;
  clientId?: string;
  contractId?: string;
  documentType?: string;
  nombreDocuments?: number;
  delaiReglement?: number;
  dateReception?: string;
  startTime?: number;
}

// Single Entry Creation
export const createBOEntry = async (entry: CreateBOEntryDto) => {
  const { data } = await LocalAPI.post('/bo/create-entry', entry);
  return data;
};

// Batch Entry Creation
export const createBOBatch = async (entries: CreateBOEntryDto[]) => {
  const { data } = await LocalAPI.post('/bo/create-batch', { entries });
  return data;
};

// BO Performance
export const fetchBOPerformance = async (userId?: string, period: string = 'daily') => {
  const params: { period: string; userId?: string } = { period };
  if (userId) params.userId = userId;
  
  const { data } = await LocalAPI.get('/bo/performance', { params });
  return data;
};

// Physical Document Tracking
export const trackPhysicalDocument = async (trackingData: {
  reference: string;
  location: string;
  status: string;
  notes?: string;
}) => {
  const { data } = await LocalAPI.post('/bo/track-document', trackingData);
  return data;
};

// Get Tracking History
export const getTrackingHistory = async (reference: string) => {
  const { data } = await LocalAPI.get(`/bo/tracking/${reference}`);
  return data;
};

// BO Statistics
export const fetchBOStatistics = async (filters?: {
  from?: string;
  to?: string;
  userId?: string;
}) => {
  const { data } = await LocalAPI.get('/bo/statistics', { params: filters });
  return data;
};