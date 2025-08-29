import { useState, useEffect, useCallback } from 'react';
import { LocalAPI } from '../services/axios';
import AIAnalyticsService from '../services/aiAnalyticsService';

interface AnalyticsFilters {
  fromDate?: string;
  toDate?: string;
  clientId?: string;
  departmentId?: string;
  teamId?: string;
  userId?: string;
  status?: string;
  slaStatus?: string;
}

interface AnalyticsData {
  kpis: any;
  slaData: any;
  ovData: any;
  performance: any;
  alerts: any;
  recommendations: any;
  forecast: any;
  loading: boolean;
  error: string | null;
}

export const useAnalytics = (initialFilters: AnalyticsFilters = {}) => {
  const [data, setData] = useState<AnalyticsData>({
    kpis: null,
    slaData: null,
    ovData: null,
    performance: null,
    alerts: null,
    recommendations: null,
    forecast: null,
    loading: true,
    error: null
  });

  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);

  // Load all analytics data
  const loadAnalyticsData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [
        kpisResponse,
        slaResponse,
        ovResponse,
        performanceResponse,
        alertsResponse,
        recommendationsResponse,
        forecastResponse
      ] = await Promise.all([
        LocalAPI.get('/analytics/kpis/daily', { params: filters }),
        LocalAPI.get('/analytics/sla/dashboard', { params: filters }),
        LocalAPI.get('/analytics/ov/dashboard', { params: filters }),
        LocalAPI.get('/analytics/performance/by-user', { params: filters }),
        LocalAPI.get('/analytics/alerts'),
        LocalAPI.get('/analytics/recommendations/enhanced'),
        LocalAPI.get('/analytics/forecast')
      ]);

      setData(prev => ({
        ...prev,
        kpis: kpisResponse.data,
        slaData: slaResponse.data,
        ovData: ovResponse.data,
        performance: performanceResponse.data,
        alerts: alertsResponse.data,
        recommendations: recommendationsResponse.data,
        forecast: forecastResponse.data,
        loading: false
      }));
    } catch (error: any) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load analytics data'
      }));
    }
  }, [filters]);

  // Load specific analytics section
  const loadSection = useCallback(async (section: keyof AnalyticsData) => {
    try {
      let response: any;
      
      switch (section) {
        case 'kpis':
          response = await LocalAPI.get('/analytics/kpis/daily', { params: filters });
          break;
        case 'slaData':
          response = await LocalAPI.get('/analytics/sla/dashboard', { params: filters });
          break;
        case 'ovData':
          response = await LocalAPI.get('/analytics/ov/dashboard', { params: filters });
          break;
        case 'performance':
          response = await LocalAPI.get('/analytics/performance/by-user', { params: filters });
          break;
        case 'alerts':
          response = await LocalAPI.get('/analytics/alerts');
          break;
        case 'recommendations':
          response = await LocalAPI.get('/analytics/recommendations/enhanced');
          break;
        case 'forecast':
          response = await LocalAPI.get('/analytics/forecast');
          break;
        default:
          return;
      }

      setData(prev => ({
        ...prev,
        [section]: response.data
      }));
    } catch (error: any) {
      console.error(`Failed to load ${section}:`, error);
    }
  }, [filters]);

  // AI-powered analytics functions
  const aiAnalytics = {
    predictSLABreaches: useCallback(async (items: any[]) => {
      return await AIAnalyticsService.predictSLABreaches(items);
    }, []),

    getPriorities: useCallback(async (bordereaux: any[]) => {
      return await AIAnalyticsService.getPriorities(bordereaux);
    }, []),

    getReassignmentRecommendations: useCallback(async (payload: any) => {
      return await AIAnalyticsService.getReassignmentRecommendations(payload);
    }, []),

    comparePerformance: useCallback(async (planned: any[], actual: any[]) => {
      return await AIAnalyticsService.comparePerformance(planned, actual);
    }, []),

    forecastTrends: useCallback(async (historicalData: any[], forecastDays?: number) => {
      return await AIAnalyticsService.forecastTrends(historicalData, forecastDays);
    }, []),

    generateComprehensiveReport: useCallback(async () => {
      return await AIAnalyticsService.generateComprehensiveReport(filters);
    }, [filters]),

    predictRequiredResources: useCallback(async (payload: any) => {
      return await AIAnalyticsService.predictRequiredResources(payload);
    }, []),

    getSuggestedAssignment: useCallback(async (task: any) => {
      return await AIAnalyticsService.getSuggestedAssignment(task);
    }, []),

    makeAutomatedDecision: useCallback(async (context: any, decisionType: string) => {
      return await AIAnalyticsService.makeAutomatedDecision(context, decisionType);
    }, [])
  };

  // Export functions
  const exportData = useCallback(async (format: 'excel' | 'pdf' | 'csv') => {
    return await AIAnalyticsService.exportAnalyticsData(format, filters);
  }, [filters]);

  // Real-time updates
  const subscribeToRealTime = useCallback(async (callback: (data: any) => void) => {
    return await AIAnalyticsService.subscribeToRealTimeUpdates(callback);
  }, []);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Computed values
  const computedMetrics = {
    totalBordereaux: data.kpis?.bsPerDay?.reduce((sum: number, day: any) => sum + day._count.id, 0) || 0,
    slaComplianceRate: data.slaData?.overview?.complianceRate || 0,
    avgProcessingTime: data.kpis?.avgDelay || 0,
    criticalAlerts: data.alerts?.critical?.length || 0,
    ovExecutionRate: data.ovData?.overview?.executionRate || 0,
    capacityUtilization: data.performance?.processedByUser?.length || 0
  };

  return {
    // Data
    ...data,
    
    // Computed metrics
    computedMetrics,
    
    // Filters
    filters,
    updateFilters,
    resetFilters,
    
    // Actions
    loadAnalyticsData,
    loadSection,
    exportData,
    subscribeToRealTime,
    
    // AI Analytics
    aiAnalytics,
    
    // Utilities
    refresh: loadAnalyticsData,
    isLoading: data.loading,
    hasError: !!data.error
  };
};

// Specialized hooks for specific analytics sections
export const useSLAAnalytics = (filters: AnalyticsFilters = {}) => {
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSLAData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResponse, predictionsResponse, capacityResponse] = await Promise.all([
        LocalAPI.get('/analytics/sla/dashboard', { params: filters }),
        LocalAPI.get('/analytics/sla/predictions'),
        LocalAPI.get('/analytics/sla/capacity')
      ]);

      setSlaData({
        dashboard: dashboardResponse.data,
        predictions: predictionsResponse.data,
        capacity: capacityResponse.data
      });
    } catch (error) {
      console.error('Failed to load SLA data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSLAData();
  }, [loadSLAData]);

  return {
    slaData,
    loading,
    refresh: loadSLAData
  };
};

export const useOVAnalytics = (filters: AnalyticsFilters = {}) => {
  const [ovData, setOvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadOVData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResponse, statisticsResponse] = await Promise.all([
        LocalAPI.get('/analytics/ov/dashboard', { params: filters }),
        LocalAPI.get('/analytics/ov/statistics', { params: filters })
      ]);

      setOvData({
        dashboard: dashboardResponse.data,
        statistics: statisticsResponse.data
      });
    } catch (error) {
      console.error('Failed to load OV data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportOV = useCallback(async () => {
    try {
      const response = await LocalAPI.get('/analytics/ov/export', { 
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `ov_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('OV export failed:', error);
      return false;
    }
  }, [filters]);

  useEffect(() => {
    loadOVData();
  }, [loadOVData]);

  return {
    ovData,
    loading,
    refresh: loadOVData,
    exportOV
  };
};

export const useRealTimeAnalytics = () => {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupSubscription = async () => {
      unsubscribe = await AIAnalyticsService.subscribeToRealTimeUpdates((data) => {
        setRealTimeData(data);
        setConnected(true);
      });
    };
    
    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setConnected(false);
    };
  }, []);

  return {
    realTimeData,
    connected
  };
};

// Additional specialized hooks for backward compatibility
export const useDailyKpis = (params: any = {}) => {
  const { kpis, loading } = useAnalytics(params);
  return { data: kpis, isLoading: loading, error: null };
};

export const useAlerts = () => {
  const { alerts, loading } = useAnalytics();
  return { data: alerts, isLoading: loading, error: null };
};

export const useRecommendations = () => {
  const { recommendations, loading } = useAnalytics();
  return { data: recommendations, isLoading: loading, error: null };
};

export const useEnhancedRecommendations = () => {
  const { recommendations, loading } = useAnalytics();
  return { data: recommendations, isLoading: loading, error: null };
};

export const useSlaComplianceByUser = (params: any = {}) => {
  const { slaData, loading } = useAnalytics(params);
  return { data: slaData?.byUser, isLoading: loading, error: null };
};

export const useReclamationPerformance = (params: any = {}) => {
  const { performance, loading } = useAnalytics(params);
  return { data: performance, isLoading: loading, error: null };
};

export const useClientDashboard = (filters: any) => {
  const { slaData, loading } = useAnalytics(filters);
  return { data: slaData?.byClient?.find((c: any) => c.clientId === filters.clientId), isLoading: loading, error: null };
};

export const useUserDailyTargetAnalysis = (params: any = {}) => {
  const { performance, loading } = useAnalytics(params);
  return { data: performance, isLoading: loading, error: null };
};

export const usePriorityScoring = (filters: any = {}) => {
  const { alerts, loading } = useAnalytics(filters);
  return { data: alerts, isLoading: loading, error: null };
};

export const useComparativeAnalysis = (period1: any, period2: any) => {
  const { kpis, loading } = useAnalytics();
  return { data: { period1: kpis, period2: kpis }, isLoading: loading, error: null };
};

export const useSlaTrend = (params: any = {}) => {
  const { slaData, loading } = useAnalytics(params);
  return { data: slaData?.trend, isLoading: loading, error: null };
};

export const useAlertEscalationFlag = () => {
  const { alerts, loading } = useAnalytics();
  return { data: { escalate: alerts?.critical?.length > 0 }, isLoading: loading, error: null };
};

export const useStaffing = () => {
  const { recommendations, loading } = useAnalytics();
  return { data: recommendations, isLoading: loading, error: null };
};

export const useThroughputGap = () => {
  const { forecast, loading } = useAnalytics();
  return { data: forecast, isLoading: loading, error: null };
};

export const useTrends = (period: string = 'day') => {
  const { forecast, loading } = useAnalytics();
  return { data: forecast?.history, isLoading: loading, error: null };
};

export default useAnalytics;