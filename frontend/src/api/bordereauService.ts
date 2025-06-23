import { LocalAPI } from '../services/axios';

export async function getBordereau(id: string) {
  const res = await LocalAPI.get(`/bordereaux/${id}`);
  return res.data;
}
