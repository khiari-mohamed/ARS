import { LocalAPI } from '../services/axios';

// --- Legacy User interface for backward compatibility ---
export interface User {
  id: string;
  fullName: string;
  role?: string;
  teamId?: string;
}

// --- Existing fetchUsers function ---
export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

// --- Fetch Gestionnaires (users with role GESTIONNAIRE) ---
export const fetchGestionnaires = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users', { params: { role: 'GESTIONNAIRE' } });
  return data;
};

// --- Extended UserRole and User interface for user management ---
export type UserRole =
  | 'ADMINISTRATEUR'
  | 'CHEF_EQUIPE'
  | 'GESTIONNAIRE'
  | 'CLIENT_SERVICE'
  | 'FINANCE';

export interface ExtendedUser extends User {
  email: string;
  department?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  role: UserRole; // override to be required
}

// --- DTOs for create/update ---
export interface CreateUserDTO {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}

export interface UpdateUserDTO {
  fullName?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  active?: boolean;
  password?: string;
}

// --- New API functions for user management ---
export const fetchUserById = async (id: string): Promise<ExtendedUser> => {
  const { data } = await LocalAPI.get<ExtendedUser>(`/users/${id}`);
  return data;
};

export const createUser = async (user: CreateUserDTO): Promise<ExtendedUser> => {
  const { data } = await LocalAPI.post<ExtendedUser>('/users', user);
  return data;
};

export const updateUser = async (id: string, updates: UpdateUserDTO): Promise<ExtendedUser> => {
  const { data } = await LocalAPI.patch<ExtendedUser>(`/users/${id}`, updates);
  return data;
};

export const resetUserPassword = async (id: string, newPassword: string): Promise<void> => {
  await LocalAPI.post(`/users/${id}/reset-password`, { password: newPassword });
};

export const disableUser = async (id: string): Promise<ExtendedUser> => {
  const { data } = await LocalAPI.patch<ExtendedUser>(`/users/${id}/disable`, {});
  return data;
};

// --- Fetch audit logs for a user ---
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details?: any;
  timestamp: string;
}

export const fetchUserAuditLogs = async (id: string): Promise<AuditLog[]> => {
  const { data } = await LocalAPI.get<AuditLog[]>(`/users/${id}/audit-logs`);
  return data;
};