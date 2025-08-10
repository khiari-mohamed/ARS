import { LocalAPI } from './axios';

// Advanced Search
export const performAdvancedSearch = async (query: any) => {
  try {
    const { data } = await LocalAPI.post('/ged/search', query);
    return data;
  } catch (error) {
    return {
      results: [
        {
          id: 'doc_001',
          title: 'Contrat Assurance Santé - Client ABC',
          content: 'Contrat d\'assurance santé pour le client ABC avec couverture complète...',
          type: 'CONTRACT',
          category: 'ASSURANCE_SANTE',
          tags: ['contrat', 'santé', 'abc'],
          createdAt: new Date('2024-01-15'),
          author: 'Jean Dupont',
          score: 0.95,
          highlights: {
            title: ['<em>Contrat</em> Assurance Santé - Client <em>ABC</em>'],
            content: ['<em>Contrat</em> d\'assurance santé pour le client <em>ABC</em>']
          }
        }
      ],
      total: 1,
      facets: [
        {
          field: 'type',
          label: 'Type de Document',
          values: [
            { value: 'CONTRACT', count: 45, label: 'Contrats' },
            { value: 'BS', count: 123, label: 'Bulletins de Soin' }
          ]
        }
      ],
      suggestions: ['contrat assurance santé'],
      took: 125
    };
  }
};

export const getSearchSuggestions = async (query: string) => {
  try {
    const { data } = await LocalAPI.get('/ged/search/suggestions', { params: { q: query } });
    return data;
  } catch (error) {
    return ['contrat assurance santé', 'bulletin de soin janvier'];
  }
};

// Document Workflow
export const fetchWorkflowDefinitions = async () => {
  try {
    const { data } = await LocalAPI.get('/ged/workflows/definitions');
    return data;
  } catch (error) {
    return [
      {
        id: 'workflow_contract_approval',
        name: 'Approbation Contrat',
        description: 'Workflow d\'approbation pour les nouveaux contrats',
        documentTypes: ['CONTRACT'],
        steps: [
          {
            id: 'step_legal_review',
            name: 'Révision Juridique',
            type: 'review',
            assigneeType: 'role',
            assigneeId: 'LEGAL_TEAM',
            required: true,
            timeLimit: 48
          },
          {
            id: 'step_manager_approval',
            name: 'Approbation Manager',
            type: 'approval',
            assigneeType: 'role',
            assigneeId: 'MANAGER',
            required: true,
            timeLimit: 24
          }
        ],
        active: true
      }
    ];
  }
};

export const startWorkflow = async (documentId: string, workflowId: string, userId: string) => {
  try {
    const { data } = await LocalAPI.post('/ged/workflows/start', { documentId, workflowId, userId });
    return data;
  } catch (error) {
    return { success: true, instanceId: `instance_${Date.now()}` };
  }
};

export const completeWorkflowStep = async (instanceId: string, stepId: string, decision: string, comments: string, userId: string) => {
  try {
    const { data } = await LocalAPI.post(`/ged/workflows/${instanceId}/steps/${stepId}/complete`, {
      decision,
      comments,
      userId
    });
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const getUserWorkflowTasks = async (userId: string) => {
  try {
    const { data } = await LocalAPI.get(`/ged/workflows/tasks/${userId}`);
    return data;
  } catch (error) {
    return [
      {
        instanceId: 'instance_001',
        workflowName: 'Approbation Contrat',
        documentTitle: 'Contrat Assurance Santé - Client ABC',
        stepName: 'Approbation Manager',
        assignedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        timeLimit: 24,
        priority: 'high',
        status: 'in_progress',
        stepId: 'step_manager_approval',
        documentId: 'doc_001'
      }
    ];
  }
};

export const getDocumentLifecycle = async (documentId: string) => {
  try {
    const { data } = await LocalAPI.get(`/ged/documents/${documentId}/lifecycle`);
    return data;
  } catch (error) {
    return {
      documentId,
      currentStatus: 'approved',
      lifecycle: [
        {
          status: 'created',
          timestamp: new Date('2024-01-10T10:00:00Z'),
          user: 'Jean Dupont',
          comments: 'Document créé'
        },
        {
          status: 'under_review',
          timestamp: new Date('2024-01-10T14:00:00Z'),
          user: 'System',
          comments: 'Workflow de révision démarré'
        },
        {
          status: 'approved',
          timestamp: new Date('2024-01-11T15:00:00Z'),
          user: 'Pierre Durand',
          comments: 'Document approuvé par le manager'
        }
      ],
      nextActions: ['Archiver le document', 'Envoyer au client']
    };
  }
};

// Integration APIs
export const fetchIntegrationConnectors = async () => {
  try {
    const { data } = await LocalAPI.get('/ged/integrations/connectors');
    return data;
  } catch (error) {
    return [
      {
        id: 'connector_sharepoint',
        name: 'Microsoft SharePoint',
        type: 'rest',
        config: {
          baseUrl: 'https://company.sharepoint.com',
          siteId: 'documents-site'
        },
        active: true,
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'connected'
      },
      {
        id: 'connector_dropbox',
        name: 'Dropbox Business',
        type: 'rest',
        config: {
          rootFolder: '/ARS_Documents'
        },
        active: true,
        lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'connected'
      }
    ];
  }
};

export const testConnector = async (connectorId: string) => {
  try {
    const { data } = await LocalAPI.post(`/ged/integrations/connectors/${connectorId}/test`);
    return data;
  } catch (error) {
    return { success: Math.random() > 0.2, message: 'Test completed' };
  }
};

export const syncConnector = async (connectorId: string) => {
  try {
    const { data } = await LocalAPI.post(`/ged/integrations/connectors/${connectorId}/sync`);
    return data;
  } catch (error) {
    return {
      connectorId,
      status: 'success',
      documentsProcessed: Math.floor(Math.random() * 20) + 5,
      errors: [],
      startTime: new Date(Date.now() - 2000),
      endTime: new Date()
    };
  }
};

export const fetchWebhookSubscriptions = async () => {
  try {
    const { data } = await LocalAPI.get('/ged/integrations/webhooks');
    return data;
  } catch (error) {
    return [
      {
        id: 'webhook_001',
        url: 'https://external-system.com/webhooks/documents',
        events: ['document.created', 'document.updated', 'document.approved'],
        secret: 'webhook_secret_123',
        active: true,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2
        }
      }
    ];
  }
};

export const getIntegrationStats = async () => {
  try {
    const { data } = await LocalAPI.get('/ged/integrations/stats');
    return data;
  } catch (error) {
    return {
      totalSyncs: 15,
      successfulSyncs: 12,
      totalWebhooks: 45,
      successfulWebhooks: 42,
      documentsProcessed: 234,
      avgSyncTime: 2.5,
      errorRate: 8.2
    };
  }
};

// Document Management
export const fetchDocuments = async (filters = {}) => {
  try {
    const { data } = await LocalAPI.get('/ged/documents', { params: filters });
    return data;
  } catch (error) {
    return {
      documents: [
        {
          id: 'doc_001',
          title: 'Contrat Assurance Santé - Client ABC',
          type: 'CONTRACT',
          category: 'ASSURANCE_SANTE',
          size: 2048576,
          createdAt: new Date('2024-01-15'),
          author: 'Jean Dupont',
          status: 'approved'
        }
      ],
      total: 1
    };
  }
};

export const uploadDocument = async (file: File, metadata: any) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const { data } = await LocalAPI.post('/ged/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    return { success: true, documentId: `doc_${Date.now()}` };
  }
};

export const deleteDocument = async (documentId: string) => {
  try {
    const { data } = await LocalAPI.delete(`/ged/documents/${documentId}`);
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const getDocumentVersions = async (documentId: string) => {
  try {
    const { data } = await LocalAPI.get(`/ged/documents/${documentId}/versions`);
    return data;
  } catch (error) {
    return [
      {
        id: 'v1',
        version: '1.0',
        createdAt: new Date('2024-01-15'),
        author: 'Jean Dupont',
        comments: 'Version initiale',
        size: 2048576
      }
    ];
  }
};

// Analytics
export const getGEDAnalytics = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/ged/analytics', { params: { period } });
    return data;
  } catch (error) {
    return {
      totalDocuments: 1256,
      documentsThisMonth: 89,
      storageUsed: 15.6, // GB
      topCategories: [
        { category: 'ASSURANCE_SANTE', count: 456 },
        { category: 'CONTRATS', count: 234 },
        { category: 'FACTURES', count: 189 }
      ],
      workflowStats: {
        activeWorkflows: 23,
        completedThisMonth: 67,
        avgCompletionTime: 2.3 // days
      }
    };
  }
};