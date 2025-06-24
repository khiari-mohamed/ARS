import { LocalAPI } from './axios';

// Call backend for AI SLA prediction
export async function getSlaPredictionAI(items: any) {
  const params = new URLSearchParams({ items: JSON.stringify(items) });
  const { data } = await LocalAPI.get(`/alerts/sla-prediction?${params.toString()}`);
  return data;
}
