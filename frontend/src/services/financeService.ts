import { LocalAPI } from './axios';

// OV Processing
export const validateOVFile = async (file: File, donneurOrdreId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('donneurOrdreId', donneurOrdreId);
  const { data } = await LocalAPI.post('/virements/ov/validate-file', formData);
  return data;
};

export const processOV = async (ovData: any) => {
  const { data } = await LocalAPI.post('/virements/ov/process', ovData);
  return data;
};

export const getOVTracking = async (filters: any = {}) => {
  const { data } = await LocalAPI.get('/virements/ov/tracking', { params: filters });
  return data;
};

export const updateOVStatus = async (id: string, statusData: any) => {
  const { data } = await LocalAPI.patch(`/virements/ov/${id}/status`, statusData);
  return data;
};

export const generateOVPDF = async (id: string) => {
  const response = await LocalAPI.get(`/virements/ov/${id}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const generateOVTXT = async (id: string) => {
  const response = await LocalAPI.get(`/virements/ov/${id}/txt`, { responseType: 'blob' });
  return response.data;
};

// Donneurs d'Ordre
export const getDonneurs = async () => {
  const { data } = await LocalAPI.get('/virements/donneurs');
  return data;
};

export const createDonneur = async (donneurData: any) => {
  const { data } = await LocalAPI.post('/virements/donneurs', donneurData);
  return data;
};

export const updateDonneur = async (id: string, donneurData: any) => {
  const { data } = await LocalAPI.patch(`/virements/donneurs/${id}`, donneurData);
  return data;
};

export const deleteDonneur = async (id: string) => {
  const { data } = await LocalAPI.delete(`/virements/donneurs/${id}`);
  return data;
};

// Adherents
export const getAdherents = async (filters: any = {}) => {
  const { data } = await LocalAPI.get('/virements/adherents', { params: filters });
  return data;
};

export const createAdherent = async (adherentData: any) => {
  const { data } = await LocalAPI.post('/virements/adherents', adherentData);
  return data;
};

export const updateAdherent = async (id: string, adherentData: any) => {
  const { data } = await LocalAPI.patch(`/virements/adherents/${id}`, adherentData);
  return data;
};

export const deleteAdherent = async (id: string) => {
  const { data } = await LocalAPI.delete(`/virements/adherents/${id}`);
  return data;
};