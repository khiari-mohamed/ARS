import { LocalAPI } from './axios';

// New AI services to use real backend features - separate from existing aiService
export const performAIAnalysis = async (type: string, parameters: any) => {
  const { data } = await LocalAPI.post('/reclamations/ai/analyze', { type, parameters });
  return data;
};

export const predictTrends = async (period: string, categories?: string[]) => {
  const { data } = await LocalAPI.post('/reclamations/ai/predict-trends', { period, categories });
  return data;
};

export const getLearningStats = async () => {
  const { data } = await LocalAPI.get('/reclamations/ai/learning-stats');
  return data;
};

export const forceLearningUpdate = async () => {
  const { data } = await LocalAPI.post('/reclamations/ai/force-learning');
  return data;
};

export const generateAIReport = async (reportType: string, period: string) => {
  const { data } = await LocalAPI.post('/reclamations/ai/generate-report', { reportType, period });
  return data;
};

export const performCostAnalysis = async (period: string, currency = 'TND') => {
  const { data } = await LocalAPI.post('/reclamations/ai/cost-analysis', { period, currency });
  return data;
};

export const generateActionPlan = async (rootCause: any, period: string, currency = 'TND') => {
  const { data } = await LocalAPI.post('/reclamations/ai/generate-action-plan', { rootCause, period, currency });
  return data;
};

export const getAIRecommendations = async (period = '30d') => {
  const { data } = await LocalAPI.get('/reclamations/classification/recommendations', { params: { period } });
  return data;
};