// frontend/src/hooks/useAnalytics.mock.ts// Accept filters but ignore them
export const useDailyKpis = (_filters?: any) => ({
  data: {
    bsPerDay: [
      { createdAt: new Date().toISOString(), _count: { id: 10 } },
      { createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { id: 15 } },
      { createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), _count: { id: 8 } },
    ],
    avgDelay: 2.5,
  },
  isLoading: false,
  error: null,
});

export const usePerformanceByUser = (_filters?: any) => ({
  data: {
    processedByUser: [
      { clientId: 'user1', _count: { id: 12 } },
      { clientId: 'user2', _count: { id: 8 } },
    ],
    slaCompliant: 18,
  },
  isLoading: false,
  error: null,
});

export const useAlerts = () => ({
  data: {
    critical: [{ id: 1, nomSociete: 'Societe A', delaiReglement: 7 }],
    warning: [{ id: 2, nomSociete: 'Societe B', delaiReglement: 4 }],
    ok: [],
  },
  isLoading: false,
  error: null,
});

export const useRecommendations = () => ({
  data: {
    forecast: { nextWeekForecast: 50, slope: 1, intercept: 10, history: [] },
    neededStaff: 3,
    recommendation: 'All OK',
  },
  isLoading: false,
  error: null,
});

export const useTrends = () => ({
  data: [
    { date: '2024-06-01', count: 10 },
    { date: '2024-06-02', count: 15 },
    { date: '2024-06-03', count: 8 },
  ],
  isLoading: false,
  error: null,
});