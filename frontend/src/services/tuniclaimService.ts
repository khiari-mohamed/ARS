import { LocalAPI } from './axios';

export interface TuniclaimSyncStatus {
  lastSync: string | null;
  lastResult: { imported: number; errors: number } | null;
  isHealthy: boolean | null;
  logs: Array<{
    date: string;
    imported: number;
    errors: number;
    details?: string;
  }>;
  error?: string;
}

export interface TuniclaimSyncResult {
  success: boolean;
  imported: number;
  errors: number;
  message: string;
  error?: string;
}

export interface ReclamationStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  highPriority: number;
}

export interface AnomalyDetectionResult {
  period: string;
  totalReclamations: number;
  patterns: any;
  anomalies: any[];
  recommendations: any[];
}

class TuniclaimService {
  // Sync operations
  async triggerSync(): Promise<TuniclaimSyncResult> {
    const response = await LocalAPI.post('/integrations/tuniclaim/sync');
    return response.data;
  }

  async getSyncStatus(): Promise<TuniclaimSyncStatus> {
    const response = await LocalAPI.get('/integrations/tuniclaim/status');
    return response.data;
  }

  async getSyncLogs(limit = 20): Promise<any[]> {
    const response = await LocalAPI.get(`/integrations/tuniclaim/logs?limit=${limit}`);
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const response = await LocalAPI.get('/integrations/tuniclaim/test-connection');
    return response.data;
  }

  // Push operations
  async pushStatusUpdate(bordereauId: string, statusData: any): Promise<{ success: boolean; message: string }> {
    const response = await LocalAPI.post('/integrations/tuniclaim/push-status', {
      bordereauId,
      statusData
    });
    return response.data;
  }

  async pushPaymentUpdate(bordereauId: string, paymentData: any): Promise<{ success: boolean; message: string }> {
    const response = await LocalAPI.post('/integrations/tuniclaim/push-payment', {
      bordereauId,
      paymentData
    });
    return response.data;
  }

  // Bordereau operations
  async getBordereauDetails(bordereauId: string): Promise<{ success: boolean; data: any }> {
    const response = await LocalAPI.get(`/integrations/tuniclaim/bordereau/${bordereauId}`);
    return response.data;
  }

  // Reclamations operations
  async getCentralizedReclamations(filters?: any): Promise<{ reclamations: any[]; stats: ReclamationStats }> {
    const params = new URLSearchParams(filters).toString();
    const response = await LocalAPI.get(`/reclamations/tuniclaim/centralized?${params}`);
    return response.data;
  }

  async classifyReclamation(reclamationId: string): Promise<{ success: boolean; classification: any; reclamation: any }> {
    const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/classify`);
    return response.data;
  }

  async getCompleteHistory(reclamationId: string): Promise<{ history: any[]; reclamation: any; timeline: any[] }> {
    const response = await LocalAPI.get(`/reclamations/${reclamationId}/tuniclaim/complete-history`);
    return response.data;
  }

  async setupAutomaticNotifications(reclamationId: string, config: any): Promise<{ success: boolean; notifications: any[] }> {
    const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/setup-notifications`, config);
    return response.data;
  }

  async performAnomalyDetection(period = '30d'): Promise<AnomalyDetectionResult> {
    const response = await LocalAPI.get(`/reclamations/tuniclaim/anomaly-detection?period=${period}`);
    return response.data;
  }

  async generateAutoResponse(reclamationId: string): Promise<{ success: boolean; response: any }> {
    const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/auto-response`);
    return response.data;
  }

  async getInternalIntegration(reclamationId: string): Promise<{ success: boolean; reclamation: any; integrations: any[] }> {
    const response = await LocalAPI.get(`/reclamations/${reclamationId}/tuniclaim/internal-integration`);
    return response.data;
  }

  async escalateReclamation(reclamationId: string, type: 'AUTO' | 'MANUAL' = 'AUTO'): Promise<{ success: boolean; reclamation: any; escalatedTo: any }> {
    const response = await LocalAPI.post(`/reclamations/${reclamationId}/tuniclaim/escalate`, { type });
    return response.data;
  }

  // Utility methods
  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'default' {
    switch (severity) {
      case 'HAUTE': return 'error';
      case 'MOYENNE': return 'warning';
      case 'BASSE': return 'success';
      default: return 'default';
    }
  }

  getStatusColor(status: string): 'info' | 'warning' | 'success' | 'error' | 'default' {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'ESCALATED': return 'error';
      default: return 'default';
    }
  }

  getHealthStatus(status: TuniclaimSyncStatus | null) {
    if (status?.error) {
      return { color: 'red', text: 'Erreur de connexion', icon: '❌' };
    }
    if (status?.isHealthy === null) {
      return { color: 'gray', text: 'Aucune synchronisation', icon: 'ℹ️' };
    }
    if (status?.isHealthy === false) {
      return { color: 'orange', text: 'Dernière sync avec erreurs', icon: '⚠️' };
    }
    return { color: 'green', text: 'Fonctionnel', icon: '✅' };
  }
}

export const tuniclaimService = new TuniclaimService();
export default tuniclaimService;