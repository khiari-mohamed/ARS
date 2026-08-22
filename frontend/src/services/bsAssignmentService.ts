import { LocalAPI } from './axios';

export type AssignmentEntityType = 'BS' | 'BORDEREAU' | 'DOCUMENT';
export type AssignmentDocumentType =
  | 'BULLETIN_SOIN'
  | 'COMPLEMENT_INFORMATION'
  | 'ADHESION'
  | 'RECLAMATION'
  | 'CONTRAT_AVENANT'
  | 'DEMANDE_RESILIATION'
  | 'CONVENTION_TIERS_PAYANT';

export interface EligibleAssignee {
  id: string;
  fullName: string;
  role: string;
  department?: string;
  capacity: number;
  teamLeaderId?: string | null;
  currentLoad: number;
  utilizationRate: number;
}

export interface DossierBS {
  id: string;
  entityType?: AssignmentEntityType;
  numBs: string;
  etat: string;
  codeAssure: string;
  nomAssure: string;
  nomSociete: string;
  totalPec: number;
  montant?: number | null;
  dateCreation: string;
  createdAt: string;
  assignedAt?: string | null;
  bordereauReference?: string | null;
  clientName?: string | null;
  owner: { id: string; fullName: string; role: string } | null;
  name?: string;
  type?: string;
  reference?: string | null;
  status?: string | null;
  statut?: string | null;
}

export const fetchEligibleAssignees = async (excludeUserId?: string): Promise<EligibleAssignee[]> => {
  const { data } = await LocalAPI.get('/bs-assignment/eligible-users', { params: { excludeUserId } });
  return data;
};

export const fetchDossiers = async (params: {
  entityType?: AssignmentEntityType;
  ownerId?: string;
  ownerRole?: string;
  documentType?: AssignmentDocumentType;
  etat?: string;
  search?: string;
  unassignedOnly?: boolean;
  page?: number;
  pageSize?: number;
}) => {
  const { data } = await LocalAPI.get('/bs-assignment/dossiers', { params });
  return data as { total: number; page: number; pageSize: number; dossiers: DossierBS[] };
};

export const reassignDossiers = async (payload: {
  entityType?: AssignmentEntityType;
  bulletinSoinIds: string[];
  targetUserId: string;
  performedByUserId: string;
  reason?: string;
}) => {
  const { data } = await LocalAPI.post('/bs-assignment/reassign', payload);
  return data;
};

export const fetchDossierHistory = async (bulletinSoinId: string) => {
  const { data } = await LocalAPI.get(`/bs-assignment/history/${bulletinSoinId}`);
  return data;
};