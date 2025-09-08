import { LocalAPI } from './axios';

class WorkflowService {
  // BO Workflow
  async getBOCorbeille() {
    const { data } = await LocalAPI.get('/workflow/corbeille/bo');
    return data;
  }

  async processBordereauForScan(bordereauId: string) {
    const { data } = await LocalAPI.post(`/workflow/bo/process-for-scan/${bordereauId}`);
    return data;
  }

  // SCAN Workflow
  async getScanCorbeille() {
    const { data } = await LocalAPI.get('/workflow/corbeille/scan');
    return data;
  }

  async startScan(bordereauId: string) {
    const { data } = await LocalAPI.post(`/workflow/scan/start/${bordereauId}`);
    return data;
  }

  async completeScan(bordereauId: string) {
    const { data } = await LocalAPI.post(`/workflow/scan/complete/${bordereauId}`);
    return data;
  }

  // Overload Detection
  async checkOverload() {
    const { data } = await LocalAPI.post('/workflow/check-overload');
    return data;
  }

  async getOverloadStatus() {
    const { data } = await LocalAPI.get('/workflow/overload-status');
    return data;
  }

  // Enhanced Corbeille
  async getChefCorbeille() {
    const { data } = await LocalAPI.get('/workflow/corbeille/chef');
    return data;
  }

  async getGestionnaireCorbeille() {
    const { data } = await LocalAPI.get('/workflow/corbeille/gestionnaire');
    return data;
  }

  async bulkAssignBordereaux(bordereauIds: string[], assigneeId: string) {
    const { data } = await LocalAPI.post('/workflow/corbeille/bulk-assign', {
      bordereauIds,
      assigneeId
    });
    return data;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;