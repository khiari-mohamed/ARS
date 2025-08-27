import { LocalAPI } from '../services/axios';
import { Document, DocumentUploadPayload, DocumentSearchParams } from '../types/document';

export async function uploadDocument(payload: DocumentUploadPayload, file: File): Promise<Document> {
  const formData = new FormData();
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

// Get color-coded SLA status for all documents
export async function getSlaStatus(): Promise<(Document & { slaStatus: string })[]> {
  try {
    const res = await LocalAPI.get('/documents/sla-status');
    return res.data;
  } catch (error) {
    console.error('Failed to get SLA status:', error);
    // Return mock data as fallback
    return [
      { id: '1', name: 'Doc1.pdf', type: 'BS', slaStatus: 'green', uploadedAt: new Date().toISOString(), uploadedById: '1', path: '/path1' },
      { id: '2', name: 'Doc2.pdf', type: 'CONTRACT', slaStatus: 'orange', uploadedAt: new Date().toISOString(), uploadedById: '1', path: '/path2' },
      { id: '3', name: 'Doc3.pdf', type: 'COURRIER', slaStatus: 'red', uploadedAt: new Date().toISOString(), uploadedById: '1', path: '/path3' }
    ] as (Document & { slaStatus: string })[];
  }
}

// Get SLA-breached documents
export async function getSlaBreaches(): Promise<Document[]> {
  try {
    const res = await LocalAPI.get('/documents/sla-breaches');
    return res.data;
  } catch (error) {
    console.error('Failed to get SLA breaches:', error);
    // Return mock data as fallback
    return [
      { id: '1', name: 'Urgent_Doc.pdf', type: 'BS', uploadedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), uploadedById: '1', path: '/path1', ocrText: '' }
    ];
  }
}

// Get audit trail for a document
export async function getDocumentAudit(id: string): Promise<any[]> {
  try {
    const res = await LocalAPI.get(`/documents/${id}/audit`);
    return res.data;
  } catch (error) {
    console.error('Failed to get document audit:', error);
    return [
      { id: '1', action: 'UPLOAD_DOCUMENT', timestamp: new Date(), user: { fullName: 'System' }, details: 'Document uploaded' }
    ];
  }
}

// Assign/reassign a document
export async function assignDocument(id: string, payload: { assignedToUserId?: string; teamId?: string }): Promise<Document> {
  try {
    const res = await LocalAPI.patch(`/documents/${id}/assign`, payload);
    return res.data;
  } catch (error) {
    console.error('Failed to assign document:', error);
    throw error;
  }
}

// Tag a document
export async function tagDocument(id: string, payload: { type?: string; bordereauId?: string }): Promise<Document> {
  try {
    const res = await LocalAPI.patch(`/documents/${id}/tag`, payload);
    return res.data;
  } catch (error) {
    console.error('Failed to tag document:', error);
    throw error;
  }
}

// Update document status
export async function updateDocumentStatus(id: string, status: string): Promise<Document> {
  try {
    const res = await LocalAPI.patch(`/documents/${id}/status`, { status });
    return res.data;
  } catch (error) {
    console.error('Failed to update document status:', error);
    throw error;
  }
}
