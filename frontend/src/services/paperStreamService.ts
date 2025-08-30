import { LocalAPI } from './axios';
import { 
  PaperStreamStatus, 
  PaperStreamBatch, 
  QuarantinedBatch, 
  PaperStreamAnalytics, 
  PaperStreamConfig 
} from '../types/paperstream';

export const paperStreamService = {
  // Status and monitoring
  async getStatus(): Promise<PaperStreamStatus> {
    try {
      const { data } = await LocalAPI.get('/documents/paperstream/status');
      return data;
    } catch (error) {
      console.error('Failed to fetch PaperStream status:', error);
      throw error;
    }
  },

  // Batch management
  async getBatches(params?: {
    status?: string;
    operatorId?: string;
    scannerModel?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<PaperStreamBatch[]> {
    try {
      const { data } = await LocalAPI.get('/documents/paperstream/batches', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch PaperStream batches:', error);
      throw error;
    }
  },

  // Quarantine management
  async getQuarantinedBatches(): Promise<QuarantinedBatch[]> {
    try {
      const { data } = await LocalAPI.get('/documents/paperstream/quarantine');
      return data;
    } catch (error) {
      console.error('Failed to fetch quarantined batches:', error);
      throw error;
    }
  },

  async retryQuarantinedBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data } = await LocalAPI.post(`/documents/paperstream/quarantine/${batchId}/retry`);
      return data;
    } catch (error) {
      console.error('Failed to retry quarantined batch:', error);
      throw error;
    }
  },

  // Analytics
  async getAnalytics(period: '7d' | '30d' = '7d'): Promise<PaperStreamAnalytics> {
    try {
      const { data } = await LocalAPI.get('/documents/paperstream/analytics', { 
        params: { period } 
      });
      return data;
    } catch (error) {
      console.error('Failed to fetch PaperStream analytics:', error);
      throw error;
    }
  },

  // Configuration
  async getConfig(): Promise<PaperStreamConfig> {
    try {
      const { data } = await LocalAPI.get('/documents/paperstream/config');
      return data;
    } catch (error) {
      console.error('Failed to fetch PaperStream config:', error);
      throw error;
    }
  },

  async updateConfig(config: Partial<PaperStreamConfig>): Promise<{ success: boolean; message: string }> {
    try {
      const { data } = await LocalAPI.post('/documents/paperstream/config', config);
      return data;
    } catch (error) {
      console.error('Failed to update PaperStream config:', error);
      throw error;
    }
  },

  // Document search with PaperStream fields
  async searchDocuments(params: {
    batchId?: string;
    operatorId?: string;
    scannerModel?: string;
    ingestStatus?: string;
    barcodeValue?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const { data } = await LocalAPI.get('/documents/search', { params });
      return data;
    } catch (error) {
      console.error('Failed to search PaperStream documents:', error);
      throw error;
    }
  }
};