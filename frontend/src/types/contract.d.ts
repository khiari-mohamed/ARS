export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  name?: string; // For backward compatibility
  nom?: string; // For backward compatibility
  delaiReglement: number; // SLA Treatment delay in days
  delaiReclamation: number; // SLA Claims reply delay in days  
  escalationThreshold?: number; // Alert threshold
  assignedManagerId: string; // Chargé de compte
  startDate: string;
  endDate: string;
  documentPath?: string;
  signature?: string; // Notes
  createdAt: string;
  updatedAt: string;
  version?: number; // For backward compatibility
  thresholds?: any; // For backward compatibility
  
  // Relations
  client?: {
    id: string;
    name: string;
  };
  assignedManager?: {
    id: string;
    fullName: string;
    email: string;
  };
  teamLeader?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ContractStatistics {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  withDocuments: number;
  documentCoverage: number;
}

export interface SLACompliance {
  total: number;
  compliant: number;
  atRisk: number;
  breach: number;
  complianceRate: number;
}

export interface CreateContractRequest {
  clientId: string;
  contractNumber: string;
  treatmentDelay: number;
  claimsReplyDelay: number;
  paymentDelay: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  escalationChain?: string[];
  accountOwnerId: string;
  startDate: string;
  endDate: string;
  alertSettings?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    escalationEnabled: boolean;
  };
  notes?: string;
}

export interface ContractSearchFilters {
  clientId?: string;
  contractNumber?: string;
  accountOwnerId?: string;
  status?: 'active' | 'expired' | 'expiring_soon' | 'all';
  startDate?: string;
  endDate?: string;
  hasDocument?: boolean;
  slaStatus?: 'compliant' | 'at_risk' | 'breach';
}