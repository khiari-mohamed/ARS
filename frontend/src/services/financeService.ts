import { LocalAPI } from './axios';

export interface Adherent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  clientId: string;
  rib: string;
  statut: string;
  client?: any;
}

export interface DonneurOrdre {
  id: string;
  nom: string;
  rib: string;
  banque: string;
  structureTxt: string;
  statut: string;
}

export interface OrdreVirement {
  id: string;
  reference: string;
  donneurOrdreId: string;
  bordereauId?: string;
  dateCreation: string;
  dateTraitement?: string;
  utilisateurSante: string;
  utilisateurFinance?: string;
  etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE';
  commentaire?: string;
  montantTotal: number;
  nombreAdherents: number;
  donneurOrdre?: DonneurOrdre;
  items?: VirementItem[];
}

export interface VirementItem {
  id: string;
  adherentId: string;
  montant: number;
  statut: string;
  erreur?: string;
  adherent?: Adherent;
}

class FinanceService {
  // === ADHERENT METHODS ===
  async createAdherent(adherent: Omit<Adherent, 'id'>) {
    const { data } = await LocalAPI.post('/finance/adherents', adherent);
    return data;
  }

  async updateAdherent(id: string, adherent: Partial<Adherent>) {
    const { data } = await LocalAPI.put(`/finance/adherents/${id}`, adherent);
    return data;
  }

  async getAdherentsByClient(clientId: string) {
    const { data } = await LocalAPI.get(`/finance/adherents?clientId=${clientId}`);
    return data;
  }

  async searchAdherents(search: string, clientId?: string) {
    const params = new URLSearchParams({ search });
    if (clientId) params.append('clientId', clientId);
    const { data } = await LocalAPI.get(`/finance/adherents?${params}`);
    return data;
  }

  async deleteAdherent(id: string) {
    const { data } = await LocalAPI.delete(`/finance/adherents/${id}`);
    return data;
  }

  async validateMatricules(matricules: string[], clientId: string) {
    const { data } = await LocalAPI.post('/finance/adherents/validate', {
      matricules,
      clientId
    });
    return data;
  }

  // === DONNEUR D'ORDRE METHODS ===
  async createDonneurOrdre(donneur: Omit<DonneurOrdre, 'id'>) {
    const { data } = await LocalAPI.post('/finance/donneurs-ordre', donneur);
    return data;
  }

  async updateDonneurOrdre(id: string, donneur: Partial<DonneurOrdre>) {
    const { data } = await LocalAPI.put(`/finance/donneurs-ordre/${id}`, donneur);
    return data;
  }

  async getDonneursOrdre(activeOnly = true) {
    const { data } = await LocalAPI.get(`/finance/donneurs-ordre?activeOnly=${activeOnly}`);
    return data;
  }

  async getDonneurOrdre(id: string) {
    const { data } = await LocalAPI.get(`/finance/donneurs-ordre/${id}`);
    return data;
  }

  async deleteDonneurOrdre(id: string) {
    const { data } = await LocalAPI.delete(`/finance/donneurs-ordre/${id}`);
    return data;
  }

  async toggleDonneurStatus(id: string) {
    const { data } = await LocalAPI.put(`/finance/donneurs-ordre/${id}/toggle-status`);
    return data;
  }

  async getStructureFormats() {
    const { data } = await LocalAPI.get('/finance/donneurs-ordre/structures/formats');
    return data;
  }

  // === ORDRE VIREMENT METHODS ===
  async importExcel(file: File, clientId: string, donneurOrdreId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('donneurOrdreId', donneurOrdreId);

    const { data } = await LocalAPI.post('/finance/ordres-virement/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  }

  async createOrdreVirement(ordre: {
    donneurOrdreId: string;
    bordereauId?: string;
    virementData: any[];
  }) {
    const { data } = await LocalAPI.post('/finance/ordres-virement', ordre);
    return data;
  }

  async updateEtatVirement(id: string, etat: {
    etatVirement: string;
    commentaire?: string;
  }) {
    const { data } = await LocalAPI.put(`/finance/ordres-virement/${id}/etat`, etat);
    return data;
  }

  async getOrdresVirement(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const { data } = await LocalAPI.get(`/finance/ordres-virement?${params}`);
    return data;
  }

  async getOrdreVirement(id: string) {
    const { data } = await LocalAPI.get(`/finance/ordres-virement/${id}`);
    return data;
  }

  // View PDF in popup (from database)
  getPDFViewUrl(id: string): string {
    const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
    return `${serverBaseUrl}/api/finance/ordres-virement/${id}/pdf`;
  }

  // View TXT in popup (from database)
  getTXTViewUrl(id: string): string {
    const serverBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
    return `${serverBaseUrl}/api/finance/ordres-virement/${id}/txt`;
  }

  async downloadPDF(id: string) {
    const response = await LocalAPI.get(`/finance/ordres-virement/${id}/pdf`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `virement_${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async downloadTXT(id: string) {
    const response = await LocalAPI.get(`/finance/ordres-virement/${id}/txt`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `virement_${id}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // === DASHBOARD METHODS ===
  async getFinanceDashboard(queryParams?: string) {
    const url = queryParams ? `/finance/dashboard?${queryParams}` : '/finance/dashboard';
    const { data } = await LocalAPI.get(url);
    return data;
  }

  // NEW: Excel export for dashboard
  async exportDashboardExcel(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await LocalAPI.get(`/finance/dashboard/export?${params}`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tableau_bord_finance_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async getFinanceStats(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const { data } = await LocalAPI.get(`/finance/dashboard/stats?${params}`);
    return data;
  }
  
  // === RECOVERY METHODS ===
  async createManualOV(ovData: {
    reference: string;
    clientData: any;
    donneurOrdreId: string;
    montantTotal: number;
    nombreAdherents: number;
  }) {
    const { data } = await LocalAPI.post('/finance/ordres-virement/create-manual', ovData);
    return data;
  }

  // === SUIVI METHODS ===
  async getSuiviBordereaux(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const { data } = await LocalAPI.get(`/finance/suivi/bordereaux?${params}`);
    return data;
  }

  async getSuiviNotifications() {
    const { data } = await LocalAPI.get('/finance/suivi/notifications');
    return data;
  }

  // === HISTORIQUE METHODS ===
  async getHistorique(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const { data } = await LocalAPI.get(`/finance/historique?${params}`);
    return data;
  }

  async getHistoriqueOrdre(id: string) {
    const { data } = await LocalAPI.get(`/finance/historique/${id}`);
    return data;
  }

  // === NEW FEATURES ===
  
  // Excel validation with new backend service
  async validateExcelFile(file: File, clientId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);

    const { data } = await LocalAPI.post('/finance/validate-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  }

  // Generate PDF with new backend service (stores in database)
  async generateOVPDFNew(id: string) {
    const { data } = await LocalAPI.post(`/finance/ordres-virement/${id}/generate-pdf`);
    return data;
  }

  // Generate TXT with new backend service (stores in database)
  async generateOVTXTNew(id: string) {
    const { data } = await LocalAPI.post(`/finance/ordres-virement/${id}/generate-txt`);
    return data;
  }

  // Suivi virement methods
  async getSuiviVirements(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const { data } = await LocalAPI.get(`/finance/suivi-virement?${params}`);
    return data;
  }

  async getSuiviVirementById(id: string) {
    const { data } = await LocalAPI.get(`/finance/suivi-virement/${id}`);
    return data;
  }

  // === UTILITY METHODS ===
  getEtatVirementLabel(etat: string): string {
    const labels: Record<string, string> = {
      'NON_EXECUTE': 'Virement non exécuté',
      'EN_COURS_EXECUTION': 'Virement en cours d\'exécution',
      'EXECUTE_PARTIELLEMENT': 'Virement exécuté partiellement',
      'REJETE': 'Virement rejeté',
      'BLOQUE': 'Virement bloqué',
      'EXECUTE': 'Virement exécuté'
    };
    return labels[etat] || etat;
  }

  getEtatVirementColor(etat: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'NON_EXECUTE': 'default',
      'EN_COURS_EXECUTION': 'info',
      'EXECUTE_PARTIELLEMENT': 'warning',
      'REJETE': 'error',
      'BLOQUE': 'error',
      'EXECUTE': 'success'
    };
    return colors[etat] || 'default';
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2
    }).format(montant);
  }

  // NEW: Export recent orders to Excel
  async exportRecentOrdersExcel(data: any[]) {
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    
    const worksheetData = [
      ['Référence OV', 'Référence Bordereau', 'Compagnie d\'Assurance', 'Client/Société', 'Bordereau', 'Montant (TND)', 'Statut', 'Date d\'Exécution', 'Motif/Observations', 'Demande Récupération', 'Montant Récupéré'],
      ...data.map(ordre => [
        ordre.reference || '',
        ordre.referenceBordereau || '',
        ordre.compagnieAssurance || '',
        ordre.client || '',
        ordre.bordereau || '',
        ordre.montant || 0,
        ordre.statut || '',
        ordre.dateExecution ? new Date(ordre.dateExecution).toLocaleDateString('fr-FR') : '',
        ordre.motifObservation || '',
        ordre.demandeRecuperation ? 'Oui' : 'Non',
        ordre.montantRecupere ? 'Oui' : 'Non'
      ])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordres de Virement');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordres_virement_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // === BANK FORMAT CONFIGURATION ===
  async getBankFormats() {
    const { data } = await LocalAPI.get('/finance/bank-formats');
    return data;
  }

  async getBankFormat(formatId: string) {
    const { data } = await LocalAPI.get(`/finance/bank-formats/${formatId}`);
    return data;
  }

  async updateBankFormat(formatId: string, config: any) {
    const { data } = await LocalAPI.put(`/finance/bank-formats/${formatId}`, config);
    return data;
  }

  async validateBankFormat(formatType: string, specifications: any) {
    const { data } = await LocalAPI.post('/finance/bank-formats/validate', {
      formatType,
      specifications
    });
    return data;
  }

  // === BORDEREAUX TRAITÉS METHODS ===
  async getBordereauxTraites(filters: any = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const url = params.toString() ? `/finance/bordereaux-traites?${params}` : '/finance/bordereaux-traites';
    const { data } = await LocalAPI.get(url);
    return data;
  }

  // === SLA CONFIGURATION METHODS ===
  async getSlaConfigs(clientId?: string, moduleType?: string) {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (moduleType) params.append('moduleType', moduleType);
    
    const { data } = await LocalAPI.get(`/finance/sla/configurations?${params}`);
    return data;
  }

  async createSlaConfig(config: any) {
    const { data } = await LocalAPI.post('/finance/sla/configurations', config);
    return data;
  }

  async updateSlaConfig(id: string, config: any) {
    const { data } = await LocalAPI.put(`/finance/sla/configurations/${id}`, config);
    return data;
  }

  async deleteSlaConfig(id: string) {
    const { data } = await LocalAPI.delete(`/finance/sla/configurations/${id}`);
    return data;
  }

  async getSlaAlerts() {
    const { data } = await LocalAPI.get('/finance/sla/alerts');
    return data;
  }

  async checkBordereauSla(bordereauId: string) {
    const { data } = await LocalAPI.get(`/finance/sla/check/bordereau/${bordereauId}`);
    return data;
  }

  async checkVirementSla(virementId: string) {
    const { data } = await LocalAPI.get(`/finance/sla/check/virement/${virementId}`);
    return data;
  }

  // === RECOVERY & REINJECT METHODS ===
  async updateRecoveryInfo(id: string, data: {
    demandeRecuperation?: boolean;
    dateDemandeRecuperation?: string | null;
    montantRecupere?: boolean;
    dateMontantRecupere?: string | null;
    motifObservation?: string;
  }) {
    const { data: result } = await LocalAPI.put(`/finance/ordres-virement/${id}/recovery`, data);
    return result;
  }

  async updateBordereauTraite(id: string, data: {
    statutVirement?: string;
    dateTraitementVirement?: string;
    motifObservation?: string;
    demandeRecuperation?: boolean;
    dateDemandeRecuperation?: string;
    montantRecupere?: boolean;
    dateMontantRecupere?: string;
  }) {
    const { data: result } = await LocalAPI.put(`/finance/bordereaux-traites/${id}`, data);
    return result;
  }

  async reinjectOV(id: string) {
    const { data } = await LocalAPI.put(`/finance/ordres-virement/${id}/reinject`);
    return data;
  }

  // === NOTIFICATION METHODS ===
  async notifyResponsableEquipe(notificationData: {
    ovId: string;
    reference: string;
    message: string;
    createdBy: string;
  }) {
    const { data } = await LocalAPI.post('/finance/notify-responsable-equipe', notificationData);
    return data;
  }

  // === OV VALIDATION METHODS ===
  async getPendingValidationOVs() {
    const { data } = await LocalAPI.get('/finance/validation/pending');
    return data;
  }

  async validateOV(id: string, approved: boolean, comment?: string) {
    const { data } = await LocalAPI.put(`/finance/validation/${id}`, {
      approved,
      comment
    });
    return data;
  }

  // === CREATE OV FROM BORDEREAU ===
  async createOVFromBordereau(bordereauId: string, donneurOrdreId: string) {
    const { data } = await LocalAPI.post(`/finance/ordres-virement/from-bordereau/${bordereauId}`, {
      donneurOrdreId
    });
    return data;
  }

  // === UPDATE OV STATUS DIRECTLY (FINANCE WORKFLOW) ===
  async updateOVStatus(id: string, statusData: {
    etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE';
    motifObservation?: string;
    demandeRecuperation?: boolean;
    dateDemandeRecuperation?: string;
    montantRecupere?: boolean;
    dateMontantRecupere?: string;
  }) {
    const { data } = await LocalAPI.put(`/finance/ordres-virement/${id}/status`, statusData);
    return data;
  }
}

export const financeService = new FinanceService();

// Export individual methods for named imports
export const getAdherents = (search?: string) => financeService.searchAdherents(search || 'all');
export const createAdherent = (adherent: Omit<Adherent, 'id'>) => financeService.createAdherent(adherent);
export const updateAdherent = (id: string, adherent: Partial<Adherent>) => financeService.updateAdherent(id, adherent);
export const deleteAdherent = (id: string) => financeService.deleteAdherent(id);

export const getDonneurs = () => financeService.getDonneursOrdre();
export const createDonneur = (donneur: Omit<DonneurOrdre, 'id'>) => financeService.createDonneurOrdre(donneur);
export const updateDonneur = (id: string, donneur: Partial<DonneurOrdre>) => financeService.updateDonneurOrdre(id, donneur);
export const deleteDonneur = (id: string) => financeService.deleteDonneurOrdre(id);

export const getOVTracking = (filters: any = {}) => financeService.getSuiviVirements(filters);
export const updateOVStatus = (id: string, status: any) => financeService.updateEtatVirement(id, status);
export const validateOVFile = (file: File, donneurId: string) => financeService.importExcel(file, '', donneurId);
export const processOV = (data: any) => financeService.createOrdreVirement(data);
export const generateOVPDF = (id: string) => financeService.downloadPDF(id);
export const generateOVTXT = (id: string) => financeService.downloadTXT(id);

export const getFinanceAlerts = () => financeService.getSlaAlerts();
export const notifyFinanceTeam = (data: any) => Promise.resolve({ success: true });

export default financeService;