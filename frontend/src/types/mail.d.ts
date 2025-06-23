export type CourrierType = 'REGLEMENT' | 'RELANCE' | 'RECLAMATION' | 'AUTRE';
export type CourrierStatus = 'DRAFT' | 'SENT' | 'FAILED' | 'PENDING_RESPONSE' | 'RESPONDED';

export interface Courrier {
  clientId: string;
  id: string;
  subject: string;
  body: string;
  type: CourrierType;
  templateUsed: string;
  status: CourrierStatus;
  sentAt?: string;
  responseAt?: string;
  createdAt: string;
  updatedAt: string;
  bordereauId?: string;
  uploadedById: string;
}

export interface CourrierCreatePayload {
  subject: string;
  body: string;
  type: CourrierType;
  templateUsed: string;
  bordereauId?: string;
}

export interface CourrierSearchParams {
  type?: CourrierType;
  status?: CourrierStatus;
  clientId?: string;
  bordereauId?: string;
  createdAfter?: string;
  createdBefore?: string;
}