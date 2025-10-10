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
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await LocalAPI.post(`/scan/manual/upload/${bordereauId}`, formData, {
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

// NEW: Validate multiple scan capability
export const validateMultipleScanCapability = async (bordereauId: string) => {
  try {
    const response = await LocalAPI.get(`/bordereaux/${bordereauId}`);
    const bordereau = response.data;
    
    return {
      canScanMultiple: bordereau.statut === 'SCAN_EN_COURS',
      currentStatus: bordereau.statut,
      documentsCount: bordereau.documents?.length || 0,
      isValid: ['A_SCANNER', 'SCAN_EN_COURS'].includes(bordereau.statut)
    };
  } catch (error) {
    console.error('Failed to validate multiple scan capability:', error);
    return {
      canScanMultiple: false,
      currentStatus: 'UNKNOWN',
      documentsCount: 0,
      isValid: false
    };
  }
};

// NEW: Upload additional documents for multiple scans
export const uploadAdditionalDocuments = async (bordereauId: string, files: File[], notes?: string) => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    formData.append('bordereauId', bordereauId);
    formData.append('scanType', 'ADDITIONAL');
    if (notes) formData.append('notes', notes);

    const response = await LocalAPI.post(`/scan/manual/upload-additional/${bordereauId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Additional document upload failed:', error);
    throw error;
  }
};