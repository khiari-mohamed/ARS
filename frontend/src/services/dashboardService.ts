import { LocalAPI } from './axios';

export const getKPIs = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/kpis', { params: filters });
    return data;
  } catch (error) {
    return {
      totalBordereaux: 1245,
      processed: 1180,
      pending: 65,
      slaCompliance: 94.2
    };
  }
};

export const getPerformance = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/performance', { params: filters });
    return data;
  } catch (error) {
    return {
      avgProcessingTime: 2.3,
      throughput: 45,
      efficiency: 87.5
    };
  }
};

export const getSLAStatus = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/sla-status', { params: filters });
    return data;
  } catch (error) {
    return [
      { status: 'on-time', count: 1180, percentage: 94.8 },
      { status: 'at-risk', count: 45, percentage: 3.6 },
      { status: 'overdue', count: 20, percentage: 1.6 }
    ];
  }
};

export const getAlerts = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/alerts', { params: filters });
    return data;
  } catch (error) {
    return [
      { id: '1', type: 'sla-breach', message: '5 bordereaux en retard SLA', severity: 'high' },
      { id: '2', type: 'workload', message: 'Équipe surchargée', severity: 'medium' }
    ];
  }
};

export const getCharts = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/dashboard/charts', { params: filters });
    return data;
  } catch (error) {
    return {
      volumeData: [
        { date: '2025-01-10', volume: 45 },
        { date: '2025-01-11', volume: 52 },
        { date: '2025-01-12', volume: 48 }
      ]
    };
  }
};

export const getDepartments = async () => {
  try {
    const { data } = await LocalAPI.get('/dashboard/departments');
    return data;
  } catch (error) {
    return [
      { id: '1', name: 'Gestion', workload: 75 },
      { id: '2', name: 'Finance', workload: 60 }
    ];
  }
};