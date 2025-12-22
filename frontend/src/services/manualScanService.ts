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

export const uploadManualDocuments = async (bordereauId: string, files: File[], fileTypes?: Record<number, string>) => {
  try {
    const formData = new FormData();
    
    console.log('📦 Building FormData with fileTypes:', fileTypes);
    
    files.forEach((file, index) => {
      formData.append('files', file);
      // Append document type for each file
      if (fileTypes && fileTypes[index]) {
        console.log(`✅ Appending fileType for file ${index}: ${fileTypes[index]}`);
        formData.append('fileTypes', fileTypes[index]);
      } else {
        console.warn(`⚠️ No fileType for file ${index}`);
      }
    });

    // Debug: Log FormData contents
    console.log('📦 FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? value.name : value);
    }

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
export const uploadAdditionalDocuments = async (bordereauId: string, files: File[], notes?: string, fileTypes?: Record<number, string>) => {
  try {
    const formData = new FormData();
    
    console.log('📦 Building FormData for additional upload with fileTypes:', fileTypes);
    
    files.forEach((file, index) => {
      formData.append('files', file);
      // Append document type for each file
      if (fileTypes && fileTypes[index]) {
        console.log(`✅ Appending fileType for file ${index}: ${fileTypes[index]}`);
        formData.append('fileTypes', fileTypes[index]);
      } else {
        console.warn(`⚠️ No fileType for file ${index}`);
      }
    });
    formData.append('bordereauId', bordereauId);
    formData.append('scanType', 'ADDITIONAL');
    if (notes) formData.append('notes', notes);

    // Debug: Log FormData contents
    console.log('📦 FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? value.name : value);
    }

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