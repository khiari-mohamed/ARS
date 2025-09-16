import { LocalAPI } from './axios';

export const getBordereauForManualScan = async () => {
  try {
    const response = await LocalAPI.get('/bordereaux/scan/ready-for-import');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch bordereaux for manual scan:', error);
    return [];
  }
};

export const uploadManualDocuments = async (bordereauId: string, files: File[]) => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`documents`, file);
    });
    formData.append('bordereauId', bordereauId);
    formData.append('scanType', 'MANUAL');

    const response = await LocalAPI.post(`/bordereaux/${bordereauId}/manual-scan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Manual document upload failed:', error);
    throw error;
  }
};

export const finalizeScanProcess = async (bordereauId: string) => {
  try {
    const response = await LocalAPI.post(`/bordereaux/${bordereauId}/finalize-scan`);
    return response.data;
  } catch (error) {
    console.error('Failed to finalize scan:', error);
    throw error;
  }
};