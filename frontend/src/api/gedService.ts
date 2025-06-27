import { LocalAPI } from '../services/axios';
import { Document, DocumentUploadPayload, DocumentSearchParams } from '../types/document';

export async function uploadDocument(payload: DocumentUploadPayload, file: File): Promise<Document> {
  const formData = new FormData();
  //formData.append('file', file);
  formData.append('files', file);
  formData.append('name', payload.name);
  formData.append('type', payload.type);
  if (payload.bordereauId) formData.append('bordereauId', payload.bordereauId);
  const res = await LocalAPI.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function searchDocuments(params: DocumentSearchParams): Promise<Document[]> {
  const res = await LocalAPI.get('/documents/search', { params });
  return res.data;
}

export async function getDocumentById(id: string): Promise<Document> {
  const res = await LocalAPI.get(`/documents/${id}`);
  return res.data;
}

// New: Get color-coded SLA status for all documents
export async function getSlaStatus(): Promise<(Document & { slaStatus: string })[]> {
  const res = await LocalAPI.get('/documents/sla-status');
  return res.data;
}

// New: Get SLA-breached documents
export async function getSlaBreaches(): Promise<Document[]> {
  const res = await LocalAPI.get('/documents/sla-breaches');
  return res.data;
}

// New: Get audit trail for a document
export async function getDocumentAudit(id: string): Promise<any[]> {
  const res = await LocalAPI.get(`/documents/${id}/audit`);
  return res.data;
}

// New: Assign/reassign a document
export async function assignDocument(id: string, payload: { assignedToUserId?: string; teamId?: string }): Promise<Document> {
  const res = await LocalAPI.patch(`/documents/${id}/assign`, payload);
  return res.data;
}

// New: Tag a document
export async function tagDocument(id: string, payload: { type?: string; bordereauId?: string }): Promise<Document> {
  const res = await LocalAPI.patch(`/documents/${id}/tag`, payload);
  return res.data;
}

// New: Update document status
export async function updateDocumentStatus(id: string, status: string): Promise<Document> {
  const res = await LocalAPI.patch(`/documents/${id}/status`, { status });
  return res.data;
}
