export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  contractCount?: number;
  totalValue?: number;
  reglementDelay: number;
  reclamationDelay: number;
  accountManager?: {
    fullName: string;
  };
  gestionnaires?: Array<{
    id: string;
    fullName: string;
  }>;
  contracts?: any[];
  bordereaux?: any[];
  reclamations?: any[];
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