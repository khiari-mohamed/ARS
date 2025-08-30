export interface Document {
  ocrText: string;
  id: string;
  name: string;
  type: string;
  path: string;
  uploadedAt: string;
  uploadedById: string;
  bordereauId?: string;
  bordereau?: any;
  uploader?: any;
  ocrResult?: any;
  status?: string;      // Added for workflow status
  slaStatus?: string;   // Added for SLA color status
  
  // PaperStream-specific fields
  batchId?: string;
  barcodeValues?: string[];
  pageCount?: number;
  resolution?: number;
  colorMode?: string;
  operatorId?: string;
  scannerModel?: string;
  imprinterIds?: string[];
  ingestStatus?: 'PENDING' | 'INGESTED' | 'ERROR' | 'QUARANTINED';
  ingestTimestamp?: string;
  hash?: string;
}

export interface DocumentUploadPayload {
  name: string;
  type: string;
  bordereauId?: string;
  clientId?: string;
  gestionnaireIds?: string[];
}

export interface DocumentSearchParams {
  clientName?: string;
  type?: string;
  bordereauReference?: string;
  uploadedAfter?: string;
  uploadedBefore?: string;
  keywords?: string;
  
  // PaperStream search parameters
  batchId?: string;
  operatorId?: string;
  scannerModel?: string;
  ingestStatus?: string;
  barcodeValue?: string;
}
