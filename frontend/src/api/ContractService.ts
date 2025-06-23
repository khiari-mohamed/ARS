import { LocalAPI } from '../services/axios'; // Adjust the import path if needed
import { Contract } from '../types/ContractType';

const API_URL = '/contracts'; // Plural, no /api prefix

export const ContractService = {
  async getAll(params?: any): Promise<Contract[]> {
    const res = await LocalAPI.get(API_URL, { params });
    return res.data;
  },
  async getById(id: string): Promise<Contract> {
    const res = await LocalAPI.get(`${API_URL}/${id}`);
    return res.data;
  },
  async create(data: any, file?: File): Promise<Contract> {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v as any));
    if (file) formData.append('file', file);
    const res = await LocalAPI.post(API_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async update(id: string, data: any): Promise<Contract> {
    const res = await LocalAPI.patch(`${API_URL}/${id}`, data);
    return res.data;
  },
  async delete(id: string): Promise<void> {
    await LocalAPI.delete(`${API_URL}/${id}`);
  },
  async downloadDocument(path: string): Promise<Blob> {
    const res = await LocalAPI.get(path, { responseType: 'blob' });
    return res.data;
  },
  async search(params: any): Promise<Contract[]> {
    const res = await LocalAPI.get(API_URL, { params });
    return res.data;
  },
  // --- New API calls for full compliance ---
  async exportExcel(params?: any): Promise<Blob> {
    const res = await LocalAPI.get(`${API_URL}/export/excel`, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
  async exportPdf(params?: any): Promise<Blob> {
    const res = await LocalAPI.get(`${API_URL}/export/pdf`, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
  async checkSla(): Promise<any> {
    const res = await LocalAPI.post(`${API_URL}/sla/check`);
    return res.data;
  },
  async indexGed(): Promise<any> {
    const res = await LocalAPI.post(`${API_URL}/ged/index`);
    return res.data;
  },
  async associateBordereaux(): Promise<any> {
    const res = await LocalAPI.post(`${API_URL}/associate-bordereaux`);
    return res.data;
  },
  async triggerReminders(): Promise<any> {
    const res = await LocalAPI.post(`${API_URL}/reminders/trigger`);
    return res.data;
  },
  async linkComplaints(): Promise<any> {
    const res = await LocalAPI.post(`${API_URL}/link-complaints`);
    return res.data;
  },
  async getStatistics(): Promise<any> {
    const res = await LocalAPI.get(`${API_URL}/dashboard/statistics`);
    return res.data;
  },
  async getHistory(id: string): Promise<any[]> {
    const res = await LocalAPI.get(`${API_URL}/${id}/history`);
    return res.data;
  },
};
