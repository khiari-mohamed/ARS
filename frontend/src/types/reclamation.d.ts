import { Document } from './document';
export type ReclamationStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'PENDING_CLIENT_REPLY'
  | 'RESOLVED'
  | 'CLOSED';

export type ReclamationSeverity = 'low' | 'medium' | 'critical';

export type ReclamationType =
  | 'retard'
  | 'document manquant'
  | 'erreur traitement'
  | 'autre';

export type UserRole =
  | 'GESTIONNAIRE'
  | 'CHEF_EQUIPE'
  | 'SUPER_ADMIN'
  | 'CLIENT_SERVICE';

export interface Reclamation {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  documentId?: string;
  bordereauId?: string;
  type: string;
  severity: ReclamationSeverity;
  status: ReclamationStatus;
  description: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string };
  createdById: string;
  createdBy?: { id: string; fullName: string };
  evidencePath?: string;
  createdAt: string;
  updatedAt: string;
  document?: Document;
  documentId?: string;
}

export interface ReclamationHistory {
  id: string;
  reclamationId: string;
  userId: string;
  user?: { id: string; fullName: string };
  action: string;
  fromStatus?: ReclamationStatus;
  toStatus?: ReclamationStatus;
  description?: string;
  createdAt: string;
}

export interface CreateReclamationDTO {
  clientId: string;
  documentId?: string;
  bordereauId?: string;
  type: string;
  severity: ReclamationSeverity;
  description: string;
  assignedToId?: string;
  file?: File;
}

export interface UpdateReclamationDTO {
  status?: ReclamationStatus;
  description?: string;
  assignedToId?: string;
}

export interface SearchReclamationDTO {
  clientId?: string;
  status?: ReclamationStatus;
  severity?: ReclamationSeverity;
  type?: string;
  assignedToId?: string;
  take?: number;
  skip?: number;
  orderBy?: string;
}

export interface ReclamationStats {
  total: number;
  open: number;
  resolved: number;
  byType: { type: string; _count: { id: number } }[];
  bySeverity: { severity: string; _count: { id: number } }[];
  avgResolution: number;
  minResolution: number;
  maxResolution: number;
}