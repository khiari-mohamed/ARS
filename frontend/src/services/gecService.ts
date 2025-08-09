import { LocalAPI } from './axios';

// Correspondence CRUD
export const createCorrespondence = async (data: any) => {
  const { data: result } = await LocalAPI.post('/courriers', data);
  return result;
};

export const sendCorrespondence = async (id: string, data: any) => {
  const { data: result } = await LocalAPI.post(`/courriers/${id}/send`, data);
  return result;
};

export const searchCorrespondence = async (params: any = {}) => {
  const { data } = await LocalAPI.get('/courriers/search', { params });
  return data;
};

export const getCorrespondenceById = async (id: string) => {
  const { data } = await LocalAPI.get(`/courriers/${id}`);
  return data;
};

export const updateCorrespondenceStatus = async (id: string, status: string) => {
  const { data } = await LocalAPI.patch(`/courriers/${id}/status`, { status });
  return data;
};

export const deleteCorrespondence = async (id: string) => {
  const { data } = await LocalAPI.delete(`/courriers/${id}`);
  return data;
};

// Templates
export const getTemplates = async () => {
  const { data } = await LocalAPI.get('/courriers/templates');
  return data;
};

export const getTemplate = async (id: string) => {
  const { data } = await LocalAPI.get(`/courriers/templates/${id}`);
  return data;
};

export const renderTemplate = async (id: string, variables: any) => {
  const { data } = await LocalAPI.post(`/courriers/templates/${id}/render`, variables);
  return data;
};

// Legacy function names for compatibility
export const searchCourriers = searchCorrespondence;
export const createCourrier = createCorrespondence;
export const deleteCourrier = deleteCorrespondence;

export const editCourrier = async (id: string, data: any) => {
  const { data: result } = await LocalAPI.patch(`/courriers/${id}`, data);
  return result;
};

export const respondCourrier = async (id: string, response: any) => {
  const { data } = await LocalAPI.post(`/courriers/${id}/respond`, response);
  return data;
};