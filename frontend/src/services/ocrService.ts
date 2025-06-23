import { LocalAPI } from './axios';

export const processOcr = async (file: File, documentId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentId', documentId);
  const { data } = await LocalAPI.post('/ocr/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getOcrResult = async (docId: string) => {
  const { data } = await LocalAPI.get(`/ocr/${docId}`);
  return data;
};

export const patchOcrResult = async (docId: string, correction: any) => {
  const { data } = await LocalAPI.patch(`/ocr/${docId}`, correction);
  return data;
};

export const getOcrLogs = async () => {
  const { data } = await LocalAPI.get('/ocr/logs');
  return data;
};