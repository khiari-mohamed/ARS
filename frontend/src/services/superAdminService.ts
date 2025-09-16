import { LocalAPI } from './axios';

// System Health and Monitoring
export const fetchSystemHealth = async () => {
  const { data } = await LocalAPI.get('/super-admin/system-health');
  return data;
};

export const fetchQueuesOverview = async () => {
  const { data } = await LocalAPI.get('/super-admin/queues-overview');
  return data;
};

export const fetchPerformanceMetrics = async (period = '24h') => {
  const { data } = await LocalAPI.get('/super-admin/performance-metrics', { params: { period } });
  return data;
};

export const fetchSystemStats = async () => {
  const { data } = await LocalAPI.get('/super-admin/system-stats');
  return data;
};

export const fetchSystemLogs = async (filters = {}) => {
  const { data } = await LocalAPI.get('/super-admin/system-logs', { params: filters });
  return data;
};

// SLA Configuration
export const fetchSLAConfigurations = async () => {
  const { data } = await LocalAPI.get('/super-admin/sla-configurations');
  return data;
};

export const createSLAConfiguration = async (config: any) => {
  const { data } = await LocalAPI.post('/super-admin/sla-configurations', config);
  return data;
};

export const updateSLAConfiguration = async (id: string, updates: any) => {
  const { data } = await LocalAPI.put(`/super-admin/sla-configurations/${id}`, updates);
  return data;
};

export const deleteSLAConfiguration = async (id: string) => {
  const { data } = await LocalAPI.delete(`/super-admin/sla-configurations/${id}`);
  return data;
};

// System Configuration
export const fetchSystemConfiguration = async () => {
  const { data } = await LocalAPI.get('/super-admin/system-configuration');
  return data;
};

export const updateSystemConfiguration = async (updates: any) => {
  const { data } = await LocalAPI.put('/super-admin/system-configuration', updates);
  return data;
};

export const testEmailConfiguration = async (config: any) => {
  const { data } = await LocalAPI.post('/super-admin/test-email-config', config);
  return data.success;
};

export const testSMSConfiguration = async (config: any) => {
  const { data } = await LocalAPI.post('/super-admin/test-sms-config', config);
  return data.success;
};

// User Management
export const fetchAllUsers = async (filters = {}) => {
  const { data } = await LocalAPI.get('/super-admin/users', { params: filters });
  return data;
};

export const bulkCreateUsers = async (users: any[]) => {
  const { data } = await LocalAPI.post('/super-admin/users/bulk-create', { users });
  return data;
};

export const bulkUpdateUsers = async (updates: { userId: string; data: any }[]) => {
  const { data } = await LocalAPI.put('/super-admin/users/bulk-update', { updates });
  return data;
};

export const bulkDeleteUsers = async (userIds: string[]) => {
  const { data } = await LocalAPI.delete('/super-admin/users/bulk-delete', { data: { userIds } });
  return data;
};

export const getRoleTemplates = async () => {
  const { data } = await LocalAPI.get('/super-admin/role-templates');
  return data;
};

export const createUserFromTemplate = async (templateId: string, userData: any) => {
  const { data } = await LocalAPI.post('/super-admin/users/from-template', { templateId, userData });
  return data;
};

// System Monitoring
export const fetchSystemAlerts = async () => {
  const { data } = await LocalAPI.get('/super-admin/system-alerts');
  return data;
};

export const acknowledgeAlert = async (alertId: string) => {
  const { data } = await LocalAPI.post(`/super-admin/alerts/${alertId}/acknowledge`);
  return data;
};

// Export Functions
export const exportDashboard = async (format = 'excel') => {
  const { data } = await LocalAPI.get('/super-admin/export/dashboard', { params: { format } });
  return data;
};

export const exportPerformanceReport = async (period = '24h', format = 'excel') => {
  const { data } = await LocalAPI.get('/super-admin/export/performance', { params: { period, format } });
  return data;
};

export const getRealTimeStats = async () => {
  const { data } = await LocalAPI.get('/super-admin/real-time-stats');
  return data;
};

// Advanced Analytics
export const getTeamPerformanceAnalytics = async (teamId?: string, period = '7d') => {
  const { data } = await LocalAPI.get('/super-admin/team-analytics', { 
    params: { teamId, period } 
  });
  return data;
};

export const getSLAComplianceReport = async (period = '30d') => {
  const { data } = await LocalAPI.get('/super-admin/sla-compliance', { 
    params: { period } 
  });
  return data;
};

export const getWorkloadPredictions = async () => {
  const { data } = await LocalAPI.get('/super-admin/workload-predictions');
  return data;
};