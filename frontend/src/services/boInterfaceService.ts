import { LocalAPI } from './axios';

export interface BOEntryData {
  typeFichier: string;
  nombreFichiers: number;
  referenceBordereau: string;
  clientId: string;
  delaiReglement?: number;
  delaiReclamation?: number;
  gestionnaire?: string;
  observations?: string;
}

export interface ClientPreFillData {
  clientName: string;
  reglementDelay: number;
  reclamationDelay: number;
  activeContract?: {
    id: string;
    delaiReglement: number;
    delaiReclamation: number;
  };
}

class BOInterfaceService {
  // Create bordereau entry with client pre-filling
  async createBordereauEntry(data: BOEntryData) {
    const { data: result } = await LocalAPI.post('/bo/bordereau', data);
    return result;
  }

  // Get client pre-fill data
  async getClientPreFillData(clientId: string): Promise<ClientPreFillData> {
    const { data } = await LocalAPI.get(`/bo/client/${clientId}/prefill`);
    return data;
  }

  // Get BO dashboard
  async getBODashboard() {
    const { data } = await LocalAPI.get('/bo/interface-dashboard');
    return data;
  }

  // Get available clients
  async getAvailableClients() {
    const { data } = await LocalAPI.get('/bo/available-clients');
    return data;
  }

  // Get available gestionnaires
  async getAvailableGestionnaires() {
    const { data } = await LocalAPI.get('/bo/available-gestionnaires');
    return data;
  }

  // Validate bordereau reference
  async validateBordereauReference(reference: string) {
    const { data } = await LocalAPI.post('/bo/validate-reference', { reference });
    return data;
  }
}

export const boInterfaceService = new BOInterfaceService();
export default boInterfaceService;