import { LocalAPI } from './axios';

// SCAN Status and Management
export const fetchScanStatus = async () => {
  const { data } = await LocalAPI.get('/scan/status');
  return data;
};

export const fetchScanners = async () => {
  const { data } = await LocalAPI.get('/scan/scanners');
  return data;
};

export const initializeScanners = async () => {
  const { data } = await LocalAPI.post('/scan/initialize');
  return data;
};

export const startScanJob = async (scannerId: string, settings: any) => {
  const { data } = await LocalAPI.post('/scan/start-job', { scannerId, settings });
  return data;
};

// Quality Management
export const validateScanQuality = async (formData: FormData) => {
  const { data } = await LocalAPI.post('/scan/validate-quality', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const enhanceImage = async (formData: FormData) => {
  const { data } = await LocalAPI.post('/scan/enhance-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

// OCR Operations
export const performMultiEngineOCR = async (formData: FormData) => {
  const { data } = await LocalAPI.post('/scan/ocr-multi-engine', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const saveOCRCorrection = async (documentId: string, originalText: string, correctedText: string) => {
  const { data } = await LocalAPI.post('/scan/ocr-correction', {
    documentId,
    originalText,
    correctedText
  });
  return data;
};

// Activity and Monitoring
export const fetchScanActivity = async (limit = 50) => {
  const { data } = await LocalAPI.get('/scan/activity', { params: { limit } });
  return data;
};

export const retryFailedScan = async (fileName: string) => {
  const { data } = await LocalAPI.post(`/scan/retry/${fileName}`);
  return data;
};

// Folder Monitoring
export const getWatchedFolders = async () => {
  const { data } = await LocalAPI.get('/scan/folders');
  return data;
};

export const addWatchedFolder = async (folderPath: string) => {
  const { data } = await LocalAPI.post('/scan/folders', { path: folderPath });
  return data;
};

export const toggleFolderWatch = async (folderPath: string, active: boolean) => {
  const { data } = await LocalAPI.put('/scan/folders', { path: folderPath, active });
  return data;
};

// Statistics and Reporting
export const getScanStatistics = async (period = 'daily') => {
  const { data } = await LocalAPI.get('/scan/statistics', { params: { period } });
  return data;
};

// Workflow integration
export const processScanQueue = async () => {
  const { data } = await LocalAPI.post('/scan/process-queue');
  return data;
};

export const triggerPaperStreamImport = async () => {
  const { data } = await LocalAPI.post('/scan/paperstream-import');
  return data;
};

export const getScanQueue = async () => {
  const { data } = await LocalAPI.get('/scan/queue');
  return data;
};

export const getBordereauForScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.get(`/scan/bordereau/${bordereauId}`);
  return data;
};

export const startScanning = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/scan/start/${bordereauId}`);
  return data;
};

export const validateScanning = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/scan/validate/${bordereauId}`);
  return data;
};

export const checkScanOverload = async () => {
  const { data } = await LocalAPI.get('/scan/overload-check');
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await LocalAPI.get('/scan/dashboard-stats');
  return data;
};

export const getScanJobStatus = async (jobId: string) => {
  const { data } = await LocalAPI.get(`/scan/job-status/${jobId}`);
  return data;
};

export const getScanActivityChart = async () => {
  const { data } = await LocalAPI.get('/scan/activity-chart');
  return data;
};

export const debugBordereaux = async () => {
  const { data } = await LocalAPI.get('/scan/debug-bordereaux');
  return data;
};

export const createTestBordereau = async () => {
  const { data } = await LocalAPI.post('/scan/create-test-bordereau');
  return data;
};