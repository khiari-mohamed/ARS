import { LocalAPI } from './axios';

// AI Correlation
export async function getCorrelationAI(payload: any) {
  const { data } = await LocalAPI.post('/reclamations/ai/correlation', payload);
  return data;
}
