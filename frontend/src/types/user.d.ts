export type UserRole =
  | 'ADMINISTRATEUR'
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
  active: boolean;
  createdAt: string;
  updatedAt: string;
}