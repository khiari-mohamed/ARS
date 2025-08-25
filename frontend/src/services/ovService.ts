import { LocalAPI } from './axios';

export interface OVGenerationRequest {
  bordereauIds: string[];
  format: 'PDF' | 'EXCEL';
  includeDetails: boolean;
}

export const generateOV = async (request: OVGenerationRequest) => {
  const response = await LocalAPI.post('/finance/generate-ov', request, {
    responseType: 'blob'
  });
  return response.data;
};

export const importBordereauxFromExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await LocalAPI.post('/bordereaux/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};