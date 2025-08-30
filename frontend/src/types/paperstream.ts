export interface PaperStreamBatch {
  batchId: string;
  operatorId: string;
  scannerModel: string;
  ingestTimestamp: string;
  ingestStatus: 'PENDING' | 'INGESTED' | 'ERROR' | 'QUARANTINED';
  documents: any[];
  totalPages: number;
  bordereauRef?: string;
  clientName?: string;
}

export interface PaperStreamStatus {
  status: 'active' | 'inactive' | 'error';
  watcherActive: boolean;
  inputFolder: string;
  processedFolder: string;
  lastProcessed: string;
  pendingBatches: number;
  totalProcessed: number;
  totalQuarantined: number;
  successRate: number;
}

export interface QuarantinedBatch {
  id: string;
  batchId: string;
  errorType: 'NO_BORDEREAU_MATCH' | 'PROCESSING_ERROR' | 'DUPLICATE' | 'INVALID_BATCH';
  errorDetails: string;
  quarantineTimestamp: string;
  retryCount: number;
  canRetry: boolean;
}

export interface PaperStreamAnalytics {
  period: string;
  totalBatches: number;
  successfulBatches: number;
  quarantinedBatches: number;
  totalDocuments: number;
  successRate: number;
  avgDocsPerBatch: number;
  processingTrend: {
    date: string;
    batches: number;
    documents: number;
    errors: number;
  }[];
  errorBreakdown: {
    type: string;
    count: number;
  }[];
}

export interface PaperStreamConfig {
  inputFolder: string;
  processedFolder: string;
  quarantineFolder: string;
  watchInterval: number;
  batchTimeout: number;
  supportedFormats: string[];
  maxFileSize: number;
  deduplicationEnabled: boolean;
  autoRetryEnabled: boolean;
  maxRetryAttempts: number;
  scannerModels: string[];
  operatorIds: string[];
}