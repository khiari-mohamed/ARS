export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMINISTRATEUR'
  | 'RESPONSABLE_DEPARTEMENT'
  | 'CHEF_EQUIPE'
  | 'GESTIONNAIRE'
  | 'CLIENT_SERVICE'
  | 'FINANCE'
  | 'SCAN_TEAM'
  | 'BO';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  team?: string;
  phone?: string;
  photo?: string;
  position?: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
  assignedClients?: string[];
  performanceStats?: {
    processedDocuments: number;
    slaCompliance: number;
    avgProcessingTime: number;
  };
}