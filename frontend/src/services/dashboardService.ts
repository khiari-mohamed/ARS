import { LocalAPI } from './axios';

export const getKPIs = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/kpis', { params: filters });
    return data;
  } catch (error) {
    console.error('KPIs fetch failed:', error);
    throw new Error('Impossible de récupérer les indicateurs ARS - Vérifiez votre connexion');
  }
};

export const getPerformance = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/performance', { params: filters });
    return data;
  } catch (error) {
    console.error('Performance fetch failed:', error);
    throw new Error('Impossible de récupérer les données de performance ARS');
  }
};

export const getSLAStatus = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/sla-status', { params: filters });
    return data;
  } catch (error) {
    console.error('SLA status fetch failed:', error);
    throw new Error('Impossible de récupérer le statut SLA ARS');
  }
};

export const getAlerts = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/alerts', { params: filters });
    return data;
  } catch (error) {
    console.error('Alerts fetch failed:', error);
    throw new Error('Impossible de récupérer les alertes ARS');
  }
};

export const getCharts = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/charts', { params: filters });
    return data;
  } catch (error) {
    console.error('Charts fetch failed:', error);
    throw new Error('Impossible de récupérer les graphiques ARS');
  }
};

export const getDepartments = async () => {
  try {
    const { data } = await LocalAPI.get('/dashboard/departments');
    return data;
  } catch (error) {
    console.error('Departments fetch failed:', error);
    // Return real ARS departments as fallback
    return [
      { id: 'bureau-ordre', name: "Bureau d'Ordre", details: "Réception et enregistrement des dossiers" },
      { id: 'scan', name: "Service SCAN", details: "Numérisation et indexation des documents" },
      { id: 'sante', name: "Équipe Santé", details: "Traitement des bordereaux et bulletins de soins" },
      { id: 'production', name: "Équipe Production", details: "Partie de l'équipe Santé" },
      { id: 'finance', name: "Finance", details: "Suivi et exécution des virements" },
      { id: 'client', name: "Service Client", details: "Gestion des réclamations et interaction client" }
    ];
  }
};

export const getRoleBasedDashboard = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/role-based', { params: filters });
    return data;
  } catch (error) {
    console.error('Role-based dashboard error:', error);
    throw error;
  }
};

export const getRealTimeData = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/real-time', { params: filters });
    return data;
  } catch (error) {
    console.error('Real-time data error:', error);
    throw error;
  }
};

export const exportDashboard = async (filters?: any, format: 'excel' | 'pdf' = 'excel') => {
  try {
    const response = await LocalAPI.get('/dashboard/export', {
      params: { ...filters, format },
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};