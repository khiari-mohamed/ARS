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
  // ...any other fields
}

export interface DocumentUploadPayload {
  name: string;
  type: string;
  bordereauId?: string;
  clientId?: string;
}

export interface DocumentSearchParams {
  clientName?: string;
  type?: string;
  bordereauReference?: string;
  uploadedAfter?: string;
  uploadedBefore?: string;
  keywords?: string;
}
