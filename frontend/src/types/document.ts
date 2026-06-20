// src/types/document.ts  ← KEEP THIS, delete document.d.ts

// --- Document Types for GED, OCR, and PaperStream ---

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

// Main Document interface (GED + OCR + PaperStream)
export interface Document {
  id: string;
  name: string;
  // GED: use DocumentType; legacy/PaperStream: 'pdf' | 'image' | 'other'
  type: DocumentType | 'pdf' | 'image' | 'other';
  path: string;
  uploadedAt: string;
  uploadedById: string;
  bordereauId?: string;
  ocrText?: string;         // Raw OCR text — optional (only present after OCR)
  ocrResult?: OcrResult;    // Strongly-typed OCR result
  size?: number;
  mimeType?: string;
  status?: string;
  slaStatus?: string;
  // GED-specific relations
  bordereau?: {
    id: string;
    reference: string;
    statut?: string;
  };
  uploader?: {
    id: string;
    fullName: string;
  };
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

// For GED and PaperStream upload payloads
export interface DocumentUploadPayload {
  name: string;
  type: DocumentType;         // GED uploads — cast to string for PaperStream if needed
  bordereauId?: string;
  clientId?: string;
  gestionnaireIds?: string[];
}

// For GED and PaperStream search queries
export interface DocumentSearchParams {
  clientName?: string;
  prestataire?: string;
  // DocumentType for GED, arbitrary string for PaperStream
  type?: DocumentType | string;
  uploadedAfter?: string;
  uploadedBefore?: string;
  keywords?: string;
  bordereauReference?: string;
  // PaperStream search parameters
  batchId?: string;
  operatorId?: string;
  scannerModel?: string;
  ingestStatus?: string;
  barcodeValue?: string;
}