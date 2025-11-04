import { LocalAPI } from './axios';

// Escalation Rules
export const getEscalationRules = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/alerts/escalation/rules', { params: filters });
    return data;
  } catch (error) {
    // Mock data commented out - return empty array
    return [];
  }
};

export const createEscalationRule = async (rule: any) => {
  try {
    const { data } = await LocalAPI.post('/alerts/escalation/rules', rule);
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateEscalationRule = async (ruleId: string, updates: any) => {
  try {
    const { data } = await LocalAPI.put(`/alerts/escalation/rules/${ruleId}`, updates);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getActiveEscalations = async () => {
  try {
    const { data } = await LocalAPI.get('/alerts/escalation/active');
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const getEscalationMetrics = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/escalation/metrics', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return {
      totalEscalations: 0,
      acknowledgedEscalations: 0,
      resolvedEscalations: 0,
      avgEscalationTime: 0,
      escalationsByLevel: {},
      escalationsByRule: {},
      successRate: 0,
      period
    };
  }
};

// Multi-Channel Notifications
export const getNotificationChannels = async () => {
  try {
    const { data } = await LocalAPI.get('/alerts/notifications/channels');
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const createNotificationChannel = async (channel: any) => {
  try {
    const { data } = await LocalAPI.post('/alerts/notifications/channels', channel);
    return data;
  } catch (error) {
    throw error;
  }
};

export const testNotificationChannel = async (channelId: string) => {
  try {
    const { data } = await LocalAPI.post(`/alerts/notifications/channels/${channelId}/test`);
    return data;
  } catch (error) {
    throw error;
  }
};

export const sendNotification = async (request: any) => {
  try {
    const { data } = await LocalAPI.post('/alerts/notifications/send', request);
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const getDeliveryStatistics = async (period = '24h') => {
  try {
    const { data } = await LocalAPI.get('/alerts/notifications/delivery-stats', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
      byChannel: {},
      period
    };
  }
};

// Alert Analytics
export const getAlertEffectiveness = async (alertType?: string, period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/analytics/effectiveness', { 
      params: { alertType, period } 
    });
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const trackFalsePositive = async (alertId: string, reason: string, category: string) => {
  try {
    const { data } = await LocalAPI.post('/alerts/analytics/false-positive', {
      alertId,
      reason,
      category
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export const getFalsePositiveAnalysis = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/analytics/false-positives', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const getAlertTrends = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/analytics/trends', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const generateAlertRecommendations = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/analytics/recommendations', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return [];
  }
};

export const getAlertPerformanceReport = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/analytics/performance-report', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return {
      period,
      overview: {
        totalAlerts: 0,
        resolvedAlerts: 0,
        avgResolutionTime: 0,
        falsePositiveRate: 0,
        escalationRate: 0
      },
      effectiveness: [],
      trends: [],
      falsePositives: [],
      recommendations: []
    };
  }
};

// General Alert Services
export const getAlerts = async (filters = {}) => {
  try {
    const { data } = await LocalAPI.get('/alerts', { params: filters });
    return data;
  } catch (error) {
    // Mock data commented out
    return {
      alerts: [],
      total: 0
    };
  }
};

export const createAlert = async (alertData: any) => {
  try {
    const { data } = await LocalAPI.post('/alerts', alertData);
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateAlert = async (alertId: string, updates: any) => {
  try {
    const { data } = await LocalAPI.put(`/alerts/${alertId}`, updates);
    return data;
  } catch (error) {
    throw error;
  }
};

export const acknowledgeAlert = async (alertId: string, userId: string) => {
  try {
    const { data } = await LocalAPI.post(`/alerts/${alertId}/acknowledge`, { userId });
    return data;
  } catch (error) {
    throw error;
  }
};

export const resolveAlert = async (alertId: string, resolution: string, userId: string) => {
  try {
    const { data } = await LocalAPI.post(`/alerts/${alertId}/resolve`, { resolution, userId });
    return data;
  } catch (error) {
    throw error;
  }
};

export const getAlertStatistics = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/alerts/statistics', { params: { period } });
    return data;
  } catch (error) {
    // Mock data commented out
    return {
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      escalatedAlerts: 0,
      avgResolutionTime: 0,
      alertsByType: {},
      alertsBySeverity: {},
      trends: [],
      period
    };
  }
};
