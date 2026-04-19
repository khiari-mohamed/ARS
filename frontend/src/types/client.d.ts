export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  reglementDelay: number;
  reclamationDelay: number;
  slaConfig?: any;
  modeRecuperation?: 'VIREMENT' | 'CHEQUE' | 'FEUILLE_CAISSE';
  chargeCompte?: {
    id: string;
    fullName: string;
    email?: string;
    role?: string;
  };
  compagnieAssurance?: {
    id: string;
    nom: string;
    code: string;
  };
  gestionnaires?: Array<{
    id: string;
    fullName: string;
    email?: string;
    role?: string;
  }>;
  contracts?: Array<{
    id: string;
    delaiReglement: number;
    delaiReclamation: number;
    startDate: string;
    endDate: string;
    documentPath?: string;
  }>;
  bordereaux?: Array<{
    id: string;
    reference: string;
    statut: string;
    dateReception: string;
    dateCloture?: string;
  }>;
  reclamations?: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    severity: string;
  }>;
  adherents?: Array<{
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
  }>;
}

export interface ClientKPI {
  totalClients: number;
  activeClients: number;
  newThisMonth: number;
  churnRate: number;
}

export interface ClientAnalytics {
  kpis: ClientKPI;
  trends: {
    date: string;
    newClients: number;
    churnedClients: number;
  }[];
}