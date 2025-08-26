import { LocalAPI } from './axios';
import { Contract, ContractStatistics, SLACompliance, CreateContractRequest, ContractSearchFilters } from '../types/contract.d';

// Get all contracts with filters
export const fetchContracts = async (filters?: ContractSearchFilters): Promise<Contract[]> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await LocalAPI.get(`/contracts?${params.toString()}`);
  return response.data;
};

// Get single contract
export const fetchContract = async (id: string): Promise<Contract> => {
  const response = await LocalAPI.get(`/contracts/${id}`);
  return response.data;
};

// Create contract
export const createContract = async (data: CreateContractRequest, file?: File): Promise<Contract> => {
  const formData = new FormData();
  
  // Append contract data
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    }
  });
  
  // Append file if provided
  if (file) {
    formData.append('file', file);
  }
  
  const response = await LocalAPI.post('/contracts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Update contract
export const updateContract = async (id: string, data: Partial<CreateContractRequest>): Promise<Contract> => {
  const response = await LocalAPI.patch(`/contracts/${id}`, data);
  return response.data;
};

// Delete contract
export const deleteContract = async (id: string): Promise<void> => {
  await LocalAPI.delete(`/contracts/${id}`);
};

// Upload contract document
export const uploadContractDocument = async (id: string, file: File): Promise<Contract> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await LocalAPI.post(`/contracts/${id}/upload-document`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Download contract document
export const downloadContractDocument = async (id: string): Promise<Blob> => {
  const response = await LocalAPI.get(`/contracts/${id}/download-document`, {
    responseType: 'blob'
  });
  return response.data;
};

// Get contract statistics
export const fetchContractStatistics = async (): Promise<ContractStatistics> => {
  const response = await LocalAPI.get('/contracts/statistics');
  return response.data;
};

// Get SLA compliance for contract
export const fetchSLACompliance = async (id: string): Promise<SLACompliance> => {
  const response = await LocalAPI.get(`/contracts/${id}/sla-compliance`);
  return response.data;
};

// Export contracts to Excel
export const exportContractsToExcel = async (filters?: ContractSearchFilters): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await LocalAPI.get(`/contracts/export/excel?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

// Check SLA breaches
export const checkSLABreaches = async (): Promise<any> => {
  const response = await LocalAPI.post('/contracts/check-sla-breaches');
  return response.data;
};

// Get available clients for contract creation
export const fetchAvailableClients = async (): Promise<any[]> => {
  const response = await LocalAPI.get('/clients');
  return response.data;
};

// Get available users for account owner assignment
export const fetchAvailableUsers = async (): Promise<any[]> => {
  const response = await LocalAPI.get('/users');
  return response.data;
};

// Legacy exports for backward compatibility
export const fetchContractsByClient = async (clientId: string): Promise<Contract[]> => {
  const response = await LocalAPI.get(`/contracts?clientId=${clientId}`);
  return response.data.map((contract: any) => ({
    ...contract,
    name: contract.clientName,
    nom: contract.clientName
  }));
};

export const fetchContractById = fetchContract;
export const getContract = fetchContract;

export const updateContractThresholds = async (id: string, thresholds: any): Promise<Contract> => {
  const response = await LocalAPI.patch(`/contracts/${id}`, { thresholds });
  return response.data;
};

// Export Contract type
export type { Contract } from '../types/contract.d';