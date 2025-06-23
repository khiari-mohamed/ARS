import { LocalAPI } from './axios';

export const createCourrier = async (payload: any) => {
  const { data } = await LocalAPI.post('/courriers', payload);
  return data;
};

export const sendCourrier = async (id: string, payload: any) => {
  const { data } = await LocalAPI.post(`/courriers/${id}/send`, payload);
  return data;
};

export const searchCourriers = async (params?: Record<string, any>) => {
  const { data } = await LocalAPI.get('/courriers/search', { params });
  return data;
};

export const getCourrier = async (id: string) => {
  const { data } = await LocalAPI.get(`/courriers/${id}`);
  return data;
};

export const updateCourrierStatus = async (id: string, payload: any) => {
  const { data } = await LocalAPI.patch(`/courriers/${id}/status`, payload);
  return data;
};

export const deleteCourrier = async (id: string) => {
  const { data } = await LocalAPI.delete(`/courriers/${id}`);
  return data;
};