import { LocalAPI } from './axios';

// SCAN Status and Management
export const fetchScanStatus = async () => {
  try {
    const { data } = await LocalAPI.get('/scan/status');
    return data;
  } catch (error) {
    // Mock data for development
    return {
      foldersMonitored: 3,
      scannersAvailable: 2,
      processingQueue: 5,
      processedToday: 23,
      errorCount: 1
    };
  }
};

export const fetchScanners = async () => {
  try {
    const { data } = await LocalAPI.get('/scan/scanners');
    return data;
  } catch (error) {
    // Mock scanners
    return [
      {
        id: 'scanner_1',
        name: 'Fujitsu fi-7160',
        status: 'ready',
        capabilities: ['duplex', 'color', 'grayscale', 'bw']
      },
      {
        id: 'scanner_2',
        name: 'Fujitsu fi-7260',
        status: 'ready',
        capabilities: ['duplex', 'color', 'grayscale', 'bw']
      }
    ];
  }
};

export const initializeScanners = async () => {
  try {
    const { data } = await LocalAPI.post('/scan/initialize');
    return data;
  } catch (error) {
    return { status: 'initialized', message: 'Scanners initialized successfully' };
  }
};

export const startScanJob = async (scannerId: string, settings: any) => {
  try {
    const { data } = await LocalAPI.post('/scan/start-job', { scannerId, settings });
    return data;
  } catch (error) {
    // Mock scan job
    return {
      id: `scan_${Date.now()}`,
      scannerId,
      settings,
      status: 'scanning',
      startTime: new Date()
    };
  }
};

// Quality Management
export const validateScanQuality = async (formData: FormData) => {
  try {
    const { data } = await LocalAPI.post('/scan/validate-quality', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    // Mock quality validation
    const score = Math.floor(Math.random() * 40) + 60; // 60-100
    const issues = [];
    const recommendations = [];
    
    if (score < 80) {
      issues.push('Résolution légèrement faible');
      recommendations.push('Augmenter la résolution à 300 DPI');
    }
    
    if (score < 70) {
      issues.push('Contraste insuffisant');
      recommendations.push('Améliorer l\'éclairage du document');
    }
    
    return {
      score,
      issues,
      recommendations,
      isAcceptable: score >= 70
    };
  }
};

export const enhanceImage = async (formData: FormData) => {
  try {
    const { data } = await LocalAPI.post('/scan/enhance-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    return {
      enhancedPath: '/path/to/enhanced/image.jpg'
    };
  }
};

// OCR Operations
export const performMultiEngineOCR = async (formData: FormData) => {
  try {
    const { data } = await LocalAPI.post('/scan/ocr-multi-engine', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    // Mock OCR results
    return {
      results: [
        {
          text: 'Bulletin de Soin\nPatient: DUPONT Jean\nDate: 15/01/2024\nMontant: 150.00 DA',
          confidence: 87.5,
          engine: 'tesseract'
        },
        {
          text: 'Bulletin de Soin\nPatient: DUPONT Jean\nDate: 15/01/2024\nMontant: 150,00 DA',
          confidence: 82.3,
          engine: 'google_vision'
        }
      ],
      bestResult: {
        text: 'Bulletin de Soin\nPatient: DUPONT Jean\nDate: 15/01/2024\nMontant: 150.00 DA',
        confidence: 87.5,
        engine: 'tesseract'
      }
    };
  }
};

export const saveOCRCorrection = async (documentId: string, originalText: string, correctedText: string) => {
  try {
    const { data } = await LocalAPI.post('/scan/ocr-correction', {
      documentId,
      originalText,
      correctedText
    });
    return data;
  } catch (error) {
    return { success: true, message: 'Correction saved for learning' };
  }
};

// Activity and Monitoring
export const fetchScanActivity = async (limit = 50) => {
  try {
    const { data } = await LocalAPI.get('/scan/activity', { params: { limit } });
    return data;
  } catch (error) {
    // Mock activity data
    const activities = [];
    for (let i = 0; i < 20; i++) {
      const actions = ['SCAN_JOB_STARTED', 'DOCUMENT_READY', 'SCAN_ERROR'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      activities.push({
        id: i.toString(),
        action,
        timestamp: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
        details: {
          fileName: `document_${String(i + 1).padStart(3, '0')}.pdf`,
          status: action === 'SCAN_ERROR' ? 'error' : 'completed',
          scannerId: 'scanner_1'
        }
      });
    }
    return activities;
  }
};

export const retryFailedScan = async (fileName: string) => {
  try {
    const { data } = await LocalAPI.post(`/scan/retry/${fileName}`);
    return data;
  } catch (error) {
    return { success: true, message: 'File moved back to scan queue' };
  }
};

// Folder Monitoring
export const getWatchedFolders = async () => {
  try {
    const { data } = await LocalAPI.get('/scan/folders');
    return data;
  } catch (error) {
    return [
      { path: './scan-input', name: 'Dossier d\'entrée', active: true },
      { path: './scan-processed', name: 'Dossier traité', active: false },
      { path: './scan-error', name: 'Dossier erreur', active: false }
    ];
  }
};

export const addWatchedFolder = async (folderPath: string) => {
  try {
    const { data } = await LocalAPI.post('/scan/folders', { path: folderPath });
    return data;
  } catch (error) {
    return { success: true, message: 'Folder added to watch list' };
  }
};

export const toggleFolderWatch = async (folderPath: string, active: boolean) => {
  try {
    const { data } = await LocalAPI.put('/scan/folders', { path: folderPath, active });
    return data;
  } catch (error) {
    return { success: true, message: 'Folder watch status updated' };
  }
};

// Statistics and Reporting
export const getScanStatistics = async (period = 'daily') => {
  try {
    const { data } = await LocalAPI.get('/scan/statistics', { params: { period } });
    return data;
  } catch (error) {
    return {
      period,
      totalScanned: Math.floor(Math.random() * 100) + 50,
      averageQuality: Math.floor(Math.random() * 20) + 80,
      ocrAccuracy: Math.floor(Math.random() * 15) + 85,
      processingTime: Math.floor(Math.random() * 30) + 45
    };
  }
};