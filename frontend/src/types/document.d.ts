// --- Document Types for GED and OCR ---

export type DocumentType = 'BS' | 'contrat' | 'justificatif' | 'reçu' | 'courrier';

// OCR result structure based on backend (ocr-response.dto.ts)
export interface OcrResult {
  rawText: string;
  extracted: {
    reference?: string;
    client?: string;
    date?: string;
    montant?: number;
    [key: string]: any;
  };
  corrected?: {
    reference?: string;
    client?: string;
    date?: string;
    montant?: number;
    [key: string]: any;
  };
  ocrAt: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

// Main Document interface (legacy + GED + OCR)
export interface Document {
  id: string;
  name: string;
  // For GED: type is DocumentType; for legacy: can be 'pdf' | 'image' | 'other'
  type: DocumentType | 'pdf' | 'image' | 'other';
  path: string;
  uploadedAt: string;
  uploadedById: string;
  bordereauId?: string;
  ocrResult?: OcrResult; // Now strongly typed
  size?: number;
  mimeType?: string;
  status?: string;
  slaStatus?: string;
  // GED-specific relations (optional for backward compatibility)
  bordereau?: {
    id: string;
    reference: string;
    statut?: string;
  };
  uploader?: {
    id: string;
    fullName: string;
  };
}

// For document preview modals/components
export interface DocumentPreviewProps {
  document: Document;
  onClose: () => void;
}

// For upload API responses
export interface DocumentUploadResponse {
  id: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
}

// For GED upload payloads
export interface DocumentUploadPayload {
  name: string;
  type: DocumentType;
  bordereauId?: string;
}

// For GED search queries
export interface DocumentSearchParams {
  clientName?: string;
  prestataire?: string;
  type?: DocumentType;
  uploadedAfter?: string;
  uploadedBefore?: string;
  keywords?: string;
  bordereauReference?: string;
}
