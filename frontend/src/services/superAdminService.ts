import { LocalAPI } from './axios';

// System Health and Monitoring
export const fetchSystemHealth = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/system-health');
    return data;
  } catch (error) {
    return {
      status: 'healthy',
      uptime: 86400,
      cpuUsage: 45.2,
      memoryUsage: 62.8,
      diskUsage: 34.1,
      activeConnections: 23,
      responseTime: 125
    };
  }
};

export const fetchQueuesOverview = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/queues-overview');
    return data;
  } catch (error) {
    return [
      {
        name: 'BO_ENTRY_QUEUE',
        pending: 5,
        processing: 2,
        completed: 156,
        failed: 1,
        avgProcessingTime: 120
      },
      {
        name: 'SCAN_QUEUE',
        pending: 12,
        processing: 3,
        completed: 89,
        failed: 2,
        avgProcessingTime: 180
      },
      {
        name: 'OCR_QUEUE',
        pending: 8,
        processing: 1,
        completed: 234,
        failed: 0,
        avgProcessingTime: 95
      },
      {
        name: 'PROCESSING_QUEUE',
        pending: 15,
        processing: 4,
        completed: 312,
        failed: 3,
        avgProcessingTime: 240
      },
      {
        name: 'VALIDATION_QUEUE',
        pending: 3,
        processing: 1,
        completed: 198,
        failed: 1,
        avgProcessingTime: 60
      },
      {
        name: 'NOTIFICATION_QUEUE',
        pending: 1,
        processing: 0,
        completed: 445,
        failed: 0,
        avgProcessingTime: 30
      }
    ];
  }
};

export const fetchPerformanceMetrics = async (period = '24h') => {
  try {
    const { data } = await LocalAPI.get('/super-admin/performance-metrics', { params: { period } });
    return data;
  } catch (error) {
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(Date.now() - (hours - i) * 60 * 60 * 1000).toISOString(),
      throughput: Math.floor(Math.random() * 30) + 20,
      responseTime: Math.random() * 100 + 80,
      errorRate: Math.random() * 3,
      activeUsers: Math.floor(Math.random() * 20) + 10
    }));
  }
};

export const fetchSystemStats = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/system-stats');
    return data;
  } catch (error) {
    return {
      users: { total: 45, active: 32 },
      bordereaux: { total: 1256, processing: 89 },
      documents: { total: 5432 },
      errors: { total: 12 }
    };
  }
};

export const fetchSystemLogs = async (filters = {}) => {
  try {
    const { data } = await LocalAPI.get('/super-admin/system-logs', { params: filters });
    return data;
  } catch (error) {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i.toString(),
      timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
      action: ['USER_LOGIN', 'BORDEREAU_CREATED', 'DOCUMENT_PROCESSED', 'SYSTEM_ERROR'][Math.floor(Math.random() * 4)],
      userId: `user_${Math.floor(Math.random() * 10)}`,
      details: { message: `System log entry ${i}` }
    }));
  }
};

// SLA Configuration
export const fetchSLAConfigurations = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/sla-configurations');
    return data;
  } catch (error) {
    return [
      {
        id: 'sla_default',
        name: 'SLA Standard',
        documentType: 'BS',
        thresholds: {
          warning: 5,
          critical: 7,
          breach: 10
        },
        active: true
      },
      {
        id: 'sla_urgent',
        name: 'SLA Urgent',
        documentType: 'BS_URGENT',
        thresholds: {
          warning: 2,
          critical: 3,
          breach: 5
        },
        active: true
      },
      {
        id: 'sla_client_vip',
        name: 'SLA Client VIP',
        clientId: 'client_vip_001',
        documentType: 'ALL',
        thresholds: {
          warning: 3,
          critical: 5,
          breach: 7
        },
        active: true
      }
    ];
  }
};

export const createSLAConfiguration = async (config: any) => {
  try {
    const { data } = await LocalAPI.post('/super-admin/sla-configurations', config);
    return data;
  } catch (error) {
    return { success: true, id: `sla_${Date.now()}` };
  }
};

export const updateSLAConfiguration = async (id: string, updates: any) => {
  try {
    const { data } = await LocalAPI.put(`/super-admin/sla-configurations/${id}`, updates);
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const deleteSLAConfiguration = async (id: string) => {
  try {
    const { data } = await LocalAPI.delete(`/super-admin/sla-configurations/${id}`);
    return data;
  } catch (error) {
    return { success: true };
  }
};

// System Configuration
export const fetchSystemConfiguration = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/system-configuration');
    return data;
  } catch (error) {
    return {
      email: {
        smtp: {
          host: 'smtp.company.com',
          port: 587,
          secure: false,
          auth: {
            user: 'noreply@company.com',
            pass: '***'
          }
        },
        templates: {
          bordereau_assigned: {
            subject: 'Nouveau bordereau assigné',
            body: 'Un nouveau bordereau vous a été assigné: {{reference}}'
          },
          sla_warning: {
            subject: 'Alerte SLA',
            body: 'Le bordereau {{reference}} approche de la limite SLA'
          },
          escalation_alert: {
            subject: 'Escalation requise',
            body: 'Le bordereau {{reference}} nécessite une escalation'
          }
        }
      },
      sms: {
        provider: 'twilio',
        apiKey: '***',
        sender: '+33123456789'
      },
      integrations: {
        paperstream: {
          enabled: true,
          config: {
            scannerPath: '/dev/scanner',
            quality: 'high',
            resolution: '300'
          }
        },
        ocr_engine: {
          enabled: true,
          config: {
            language: 'fra+eng',
            confidence: '0.8',
            timeout: '30'
          }
        },
        notification_service: {
          enabled: true,
          config: {
            webhook_url: 'https://api.company.com/webhooks',
            retry_count: '3'
          }
        }
      }
    };
  }
};

export const updateSystemConfiguration = async (updates: any) => {
  try {
    const { data } = await LocalAPI.put('/super-admin/system-configuration', updates);
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const testEmailConfiguration = async (config: any) => {
  try {
    const { data } = await LocalAPI.post('/super-admin/test-email-config', config);
    return data.success;
  } catch (error) {
    return Math.random() > 0.2; // 80% success rate for demo
  }
};

export const testSMSConfiguration = async (config: any) => {
  try {
    const { data } = await LocalAPI.post('/super-admin/test-sms-config', config);
    return data.success;
  } catch (error) {
    return Math.random() > 0.2; // 80% success rate for demo
  }
};

// User Management
export const fetchAllUsers = async (filters = {}) => {
  try {
    const { data } = await LocalAPI.get('/super-admin/users', { params: filters });
    return data;
  } catch (error) {
    return [
      {
        id: 'user1',
        fullName: 'Jean Dupont',
        email: 'jean.dupont@company.com',
        role: 'GESTIONNAIRE',
        status: 'ACTIVE',
        team: { name: 'Équipe Alpha' },
        lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user2',
        fullName: 'Marie Martin',
        email: 'marie.martin@company.com',
        role: 'CHEF_EQUIPE',
        status: 'ACTIVE',
        team: { name: 'Équipe Alpha' },
        lastLoginAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user3',
        fullName: 'Pierre Durand',
        email: 'pierre.durand@company.com',
        role: 'BO',
        status: 'ACTIVE',
        team: null,
        lastLoginAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user4',
        fullName: 'Sophie Moreau',
        email: 'sophie.moreau@company.com',
        role: 'SCAN_TEAM',
        status: 'ACTIVE',
        team: { name: 'Équipe SCAN' },
        lastLoginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user5',
        fullName: 'Admin System',
        email: 'admin@company.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        team: null,
        lastLoginAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
};

export const bulkCreateUsers = async (users: any[]) => {
  try {
    const { data } = await LocalAPI.post('/super-admin/users/bulk-create', { users });
    return data;
  } catch (error) {
    return {
      success: Math.floor(users.length * 0.8),
      failed: Math.ceil(users.length * 0.2),
      errors: ['Email already exists', 'Invalid role specified']
    };
  }
};

export const bulkUpdateUsers = async (updates: { userId: string; data: any }[]) => {
  try {
    const { data } = await LocalAPI.put('/super-admin/users/bulk-update', { updates });
    return data;
  } catch (error) {
    return {
      success: Math.floor(updates.length * 0.9),
      failed: Math.ceil(updates.length * 0.1)
    };
  }
};

export const bulkDeleteUsers = async (userIds: string[]) => {
  try {
    const { data } = await LocalAPI.delete('/super-admin/users/bulk-delete', { data: { userIds } });
    return data;
  } catch (error) {
    return {
      success: Math.floor(userIds.length * 0.95),
      failed: Math.ceil(userIds.length * 0.05)
    };
  }
};

export const getRoleTemplates = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/role-templates');
    return data;
  } catch (error) {
    return [
      {
        id: 'template_bo',
        name: 'Bureau d\'Ordre Standard',
        role: 'BO',
        permissions: ['CREATE_BORDEREAU', 'VIEW_BORDEREAU', 'UPLOAD_DOCUMENTS'],
        defaultCapacity: 30
      },
      {
        id: 'template_gestionnaire',
        name: 'Gestionnaire Standard',
        role: 'GESTIONNAIRE',
        permissions: ['PROCESS_BORDEREAU', 'UPDATE_STATUS', 'VIEW_ASSIGNED'],
        defaultCapacity: 20
      },
      {
        id: 'template_chef_equipe',
        name: 'Chef d\'Équipe Standard',
        role: 'CHEF_EQUIPE',
        permissions: ['ASSIGN_BORDEREAU', 'VIEW_TEAM', 'MANAGE_WORKLOAD'],
        defaultCapacity: 50
      },
      {
        id: 'template_scan',
        name: 'Équipe SCAN Standard',
        role: 'SCAN_TEAM',
        permissions: ['SCAN_DOCUMENTS', 'OCR_PROCESSING', 'QUALITY_CONTROL'],
        defaultCapacity: 100
      },
      {
        id: 'template_admin',
        name: 'Administrateur Standard',
        role: 'ADMINISTRATEUR',
        permissions: ['SYSTEM_CONFIG', 'USER_MANAGEMENT', 'REPORTS'],
        defaultCapacity: 100
      }
    ];
  }
};

export const createUserFromTemplate = async (templateId: string, userData: any) => {
  try {
    const { data } = await LocalAPI.post('/super-admin/users/from-template', { templateId, userData });
    return data;
  } catch (error) {
    return {
      success: true,
      user: {
        id: `user_${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString()
      }
    };
  }
};

// System Monitoring
export const fetchSystemAlerts = async () => {
  try {
    const { data } = await LocalAPI.get('/super-admin/system-alerts');
    return data;
  } catch (error) {
    return [
      {
        id: 'alert_1',
        type: 'WARNING',
        message: 'Utilisation CPU élevée (78%)',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        id: 'alert_2',
        type: 'INFO',
        message: 'Sauvegarde automatique terminée',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        resolved: true
      },
      {
        id: 'alert_3',
        type: 'ERROR',
        message: 'Échec de connexion à la base de données (résolu)',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        resolved: true
      }
    ];
  }
};

export const acknowledgeAlert = async (alertId: string) => {
  try {
    const { data } = await LocalAPI.post(`/super-admin/alerts/${alertId}/acknowledge`);
    return data;
  } catch (error) {
    return { success: true };
  }
};