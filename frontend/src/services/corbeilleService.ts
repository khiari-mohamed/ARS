import { LocalAPI } from './axios';

export interface CorbeilleItem {
  id: string;
  type: 'bordereau' | 'reclamation';
  reference: string;
  clientName: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
  assignedTo?: string;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number;
}

export interface CorbeilleStats {
  nonAffectes?: number;
  enCours: number;
  traites: number;
  retournes?: number;
  enRetard: number;
  critiques: number;
}

export interface CorbeilleResponse {
  nonAffectes?: CorbeilleItem[];
  enCours: CorbeilleItem[];
  traites: CorbeilleItem[];
  retournes?: CorbeilleItem[];
  stats: CorbeilleStats;
}

class CorbeilleService {
  // Chef d'équipe corbeille - complete workflow visibility
  async getChefCorbeille(): Promise<CorbeilleResponse> {
    try {
      const { data } = await LocalAPI.get('/workflow/corbeille/chef');
      return data;
    } catch (error) {
      console.error('Error fetching chef corbeille:', error);
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { enCours: 0, traites: 0, enRetard: 0, critiques: 0, nonAffectes: 0 }
      };
    }
  }

  // Gestionnaire personal corbeille
  async getGestionnaireCorbeille(): Promise<CorbeilleResponse> {
    try {
      const { data } = await LocalAPI.get('/workflow/corbeille/gestionnaire');
      return data;
    } catch (error) {
      console.error('Error fetching gestionnaire corbeille:', error);
      return {
        enCours: [],
        traites: [],
        retournes: [],
        stats: { enCours: 0, traites: 0, retournes: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  // Reclamations chef corbeille
  async getReclamationsChefCorbeille(): Promise<CorbeilleResponse> {
    try {
      const { data } = await LocalAPI.get('/reclamations/corbeille/chef');
      return data;
    } catch (error) {
      console.error('Error fetching reclamations chef corbeille:', error);
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { enCours: 0, traites: 0, enRetard: 0, critiques: 0, nonAffectes: 0 }
      };
    }
  }

  // Reclamations gestionnaire corbeille
  async getReclamationsGestionnaireCorbeille(): Promise<CorbeilleResponse> {
    try {
      const { data } = await LocalAPI.get('/reclamations/corbeille/gestionnaire');
      return data;
    } catch (error) {
      console.error('Error fetching reclamations gestionnaire corbeille:', error);
      return {
        enCours: [],
        traites: [],
        retournes: [],
        stats: { enCours: 0, traites: 0, retournes: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  // Bulk assignment for bordereaux
  async bulkAssignBordereaux(bordereauIds: string[], assigneeId: string) {
    const { data } = await LocalAPI.post('/workflow/corbeille/bulk-assign', {
      bordereauIds,
      assigneeId
    });
    return data;
  }

  // Single assignment for bordereau
  async assignSingleBordereau(bordereauId: string, assigneeId: string) {
    const { data } = await LocalAPI.post('/workflow/corbeille/bulk-assign', {
      bordereauIds: [bordereauId],
      assigneeId
    });
    return data;
  }

  // Reject bordereau
  async rejectBordereau(bordereauId: string, reason: string) {
    const { data } = await LocalAPI.post(`/workflow/bordereau/${bordereauId}/reject`, {
      reason
    });
    return data;
  }

  // Treat bordereau personally (assign to chef)
  async treatBordereauPersonally(bordereauId: string) {
    const { data } = await LocalAPI.post(`/workflow/bordereau/${bordereauId}/treat-personally`);
    return data;
  }

  // Bulk assignment for reclamations
  async bulkAssignReclamations(reclamationIds: string[], assigneeId: string) {
    const { data } = await LocalAPI.post('/reclamations/corbeille/bulk-assign', {
      reclamationIds,
      assigneeId
    });
    return data;
  }

  // Return reclamation to chef
  async returnReclamationToChef(reclamationId: string, reason: string) {
    const { data } = await LocalAPI.post(`/reclamations/${reclamationId}/return`, {
      reason
    });
    return data;
  }

  // Get available gestionnaires for assignment
  async getAvailableGestionnaires() {
    try {
      const { data } = await LocalAPI.get('/users?role=GESTIONNAIRE&active=true');
      return data.filter((user: any) => user.active !== false);
    } catch (error) {
      console.error('Error fetching gestionnaires:', error);
      return [];
    }
  }

  // Auto-assign single item
  async autoAssignItem(itemId: string, itemType: 'bordereau' | 'reclamation') {
    if (itemType === 'bordereau') {
      const { data } = await LocalAPI.post(`/workflow/auto-assign`, { taskId: itemId });
      return data;
    } else {
      const { data } = await LocalAPI.post(`/reclamations/${itemId}/auto-assign`);
      return data;
    }
  }

  // Get corbeille statistics
  async getCorbeilleStats() {
    try {
      const { data } = await LocalAPI.get('/workflow/corbeille/stats');
      return data;
    } catch (error) {
      console.error('Error fetching corbeille stats:', error);
      return { totalItems: 0, urgentItems: 0, role: 'UNKNOWN' };
    }
  }

  // Update item status
  async updateItemStatus(itemId: string, itemType: 'bordereau' | 'reclamation', newStatus: string, comment?: string) {
    if (itemType === 'bordereau') {
      const { data } = await LocalAPI.patch(`/bordereaux/${itemId}`, { statut: newStatus });
      return data;
    } else {
      const { data } = await LocalAPI.patch(`/reclamations/${itemId}`, { 
        status: newStatus,
        ...(comment && { description: comment })
      });
      return data;
    }
  }

  // Escalate item
  async escalateItem(itemId: string, itemType: 'bordereau' | 'reclamation') {
    if (itemType === 'bordereau') {
      const { data } = await LocalAPI.patch(`/bordereaux/${itemId}`, { statut: 'EN_DIFFICULTE' });
      return data;
    } else {
      const { data } = await LocalAPI.patch(`/reclamations/${itemId}/escalate`);
      return data;
    }
  }

  // Get item details
  async getItemDetails(itemId: string, itemType: 'bordereau' | 'reclamation') {
    if (itemType === 'bordereau') {
      const { data } = await LocalAPI.get(`/bordereaux/${itemId}`);
      return data;
    } else {
      const { data } = await LocalAPI.get(`/reclamations/${itemId}`);
      return data;
    }
  }

  // Get SLA status for item
  getSLAColor(slaStatus: string): 'success' | 'warning' | 'error' | 'info' {
    switch (slaStatus) {
      case 'OVERDUE': return 'error';
      case 'CRITICAL': return 'warning';
      case 'AT_RISK': return 'info';
      default: return 'success';
    }
  }

  // Format remaining time
  formatRemainingTime(remainingTime: number): string {
    if (remainingTime <= 0) return 'Dépassé';
    if (remainingTime < 1) return `${Math.round(remainingTime * 60)}min`;
    if (remainingTime < 24) return `${Math.round(remainingTime)}h`;
    return `${Math.round(remainingTime / 24)}j`;
  }

  // Get priority color
  getPriorityColor(priority: string): 'success' | 'warning' | 'error' | 'info' {
    switch (priority.toUpperCase()) {
      case 'URGENT':
      case 'HAUTE': return 'error';
      case 'HIGH':
      case 'MOYENNE': return 'warning';
      case 'NORMAL':
      case 'BASSE': return 'info';
      default: return 'success';
    }
  }
}

export const corbeilleService = new CorbeilleService();
export default corbeilleService;