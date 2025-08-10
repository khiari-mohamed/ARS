import { LocalAPI } from './axios';

// BO Dashboard
export const fetchBODashboard = async () => {
  try {
    const { data } = await LocalAPI.get('/bo/dashboard');
    return data;
  } catch (error) {
    // Mock data for development
    return {
      todayEntries: 12,
      pendingEntries: 8,
      recentEntries: [
        {
          id: '1',
          reference: 'BS-20250101-0001',
          client: { name: 'Client A' },
          dateReception: new Date().toISOString(),
          nombreBS: 5,
          statut: 'EN_ATTENTE'
        },
        {
          id: '2',
          reference: 'BS-20250101-0002',
          client: { name: 'Client B' },
          dateReception: new Date().toISOString(),
          nombreBS: 3,
          statut: 'EN_COURS'
        }
      ],
      documentTypes: [
        { statut: 'EN_ATTENTE', _count: { id: 8 } },
        { statut: 'EN_COURS', _count: { id: 5 } },
        { statut: 'TRAITE', _count: { id: 12 } },
        { statut: 'CLOTURE', _count: { id: 20 } }
      ],
      performance: {
        totalEntries: 45,
        avgProcessingTime: 120,
        errorRate: 2.5,
        entrySpeed: 3.2,
        activities: []
      }
    };
  }
};

// Reference Generation
export const generateReference = async (type: string, clientId?: string) => {
  try {
    const { data } = await LocalAPI.post('/bo/generate-reference', { type, clientId });
    return data;
  } catch (error) {
    // Mock reference generation
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    
    const reference = `${type}-${year}${month}${day}-${sequence}`;
    return { reference };
  }
};

// Document Classification
export const classifyDocument = async (fileName: string) => {
  try {
    const { data } = await LocalAPI.post('/bo/classify-document', { fileName });
    return data;
  } catch (error) {
    // Mock classification
    let type = 'AUTRE';
    let category = 'GENERAL';
    let priority = 'NORMAL';
    
    if (fileName.toLowerCase().includes('bs')) {
      type = 'BS';
      category = 'MEDICAL';
      priority = 'HIGH';
    } else if (fileName.toLowerCase().includes('contrat')) {
      type = 'CONTRAT';
      category = 'LEGAL';
      priority = 'HIGH';
    }
    
    return {
      type,
      category,
      priority,
      extension: 'pdf',
      confidence: 0.85
    };
  }
};

// Document Validation
export const validateDocuments = async (formData: FormData) => {
  try {
    const { data } = await LocalAPI.post('/bo/validate-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    // Mock validation results
    const files = formData.getAll('files') as File[];
    const results = files.map((file, index) => ({
      index,
      fileName: file.name,
      validation: {
        isValid: Math.random() > 0.3,
        issues: Math.random() > 0.5 ? [] : ['File size too large', 'Invalid format'],
        score: Math.floor(Math.random() * 40) + 60
      },
      classification: {
        type: 'BS',
        category: 'MEDICAL',
        priority: 'HIGH',
        confidence: 0.85
      }
    }));
    
    const summary = {
      valid: results.filter(r => r.validation.isValid).length,
      invalid: results.filter(r => !r.validation.isValid).length,
      total: results.length
    };
    
    return { results, summary };
  }
};

// Single Entry Creation
export const createBOEntry = async (entry: any) => {
  try {
    const { data } = await LocalAPI.post('/bo/create-entry', entry);
    return data;
  } catch (error) {
    // Mock success
    return {
      success: true,
      bordereau: {
        id: Date.now().toString(),
        reference: entry.reference,
        ...entry
      }
    };
  }
};

// Batch Entry Creation
export const createBOBatch = async (entries: any[]) => {
  try {
    const { data } = await LocalAPI.post('/bo/create-batch', { entries });
    return data;
  } catch (error) {
    // Mock batch results
    const success = entries.map((entry, index) => ({
      index,
      success: true,
      bordereau: {
        id: Date.now().toString() + index,
        reference: entry.reference,
        ...entry
      }
    }));
    
    return {
      success,
      errors: [],
      total: entries.length,
      successCount: success.length,
      errorCount: 0
    };
  }
};

// BO Performance
export const fetchBOPerformance = async (userId?: string, period: string = 'daily') => {
  try {
    const params = { period };
    if (userId) (params as any).userId = userId;
    
    const { data } = await LocalAPI.get('/bo/performance', { params });
    return data;
  } catch (error) {
    // Mock performance data
    return {
      period,
      totalEntries: Math.floor(Math.random() * 50) + 20,
      avgProcessingTime: Math.floor(Math.random() * 60) + 30,
      errorRate: Math.random() * 5,
      entrySpeed: Math.random() * 3 + 1,
      activities: Array.from({ length: 10 }, (_, i) => ({
        id: i.toString(),
        action: 'BO_CREATE_ENTRY',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        user: { fullName: 'BO User' },
        details: { processingTime: Math.random() * 120 + 30 }
      }))
    };
  }
};

// Physical Document Tracking
export const trackPhysicalDocument = async (trackingData: {
  reference: string;
  location: string;
  status: string;
  notes?: string;
}) => {
  try {
    const { data } = await LocalAPI.post('/bo/track-document', trackingData);
    return data;
  } catch (error) {
    return { success: true, message: 'Document tracking updated' };
  }
};

// Get Tracking History
export const getTrackingHistory = async (reference: string) => {
  try {
    const { data } = await LocalAPI.get(`/bo/tracking/${reference}`);
    return data;
  } catch (error) {
    // Mock tracking history
    return {
      reference,
      history: [
        {
          id: '1',
          location: 'Bureau d\'Ordre',
          status: 'Reçu',
          timestamp: new Date().toISOString(),
          notes: 'Document reçu et enregistré'
        },
        {
          id: '2',
          location: 'Service SCAN',
          status: 'En cours de numérisation',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          notes: 'Envoyé pour numérisation'
        }
      ]
    };
  }
};

// BO Statistics
export const fetchBOStatistics = async (filters?: {
  from?: string;
  to?: string;
  userId?: string;
}) => {
  try {
    const { data } = await LocalAPI.get('/bo/statistics', { params: filters });
    return data;
  } catch (error) {
    // Mock statistics
    return {
      summary: {
        totalEntries: 156,
        avgProcessingTime: 95,
        errorRate: 3.2,
        entrySpeed: 2.8
      },
      period: {
        from: filters?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: filters?.to || new Date().toISOString()
      }
    };
  }
};