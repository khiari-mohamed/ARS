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