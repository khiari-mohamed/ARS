import { LocalAPI } from '../services/axios';
import { User, UserRole, UserFilters, CreateUserDto, UpdateUserDto, UserPerformanceStats, UserActivitySummary, UserDashboardStats, AuditLog, BulkActionResult, UserNotification } from '../types/user.d';

// Legacy User interface for backward compatibility
export interface LegacyUser {
  id: string;
  fullName: string;
  role?: string;
  teamId?: string;
}

// Re-export types for backward compatibility
export type { User, AuditLog } from '../types/user.d';

// Legacy fetchUsers without filters for backward compatibility
export const fetchUsersLegacy = async (): Promise<User[]> => {
  const { data } = await LocalAPI.get<User[]>('/users');
  return data;
};

// Main API functions
export const fetchUsers = async (filters?: UserFilters): Promise<User[]> => {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.active !== undefined) params.append('active', filters.active.toString());
  if (filters?.search) params.append('search', filters.search);

  const { data } = await LocalAPI.get<User[]>(`/users?${params.toString()}`);
  return data;
};

export const fetchUserById = async (id: string): Promise<User> => {
  const { data } = await LocalAPI.get<User>(`/users/${id}`);
  return data;
};

export const createUser = async (user: CreateUserDto): Promise<User> => {
  const { data } = await LocalAPI.post<User>('/users', user);
  return data;
};

export const updateUser = async (id: string, updates: UpdateUserDto): Promise<User> => {
  const { data } = await LocalAPI.put<User>(`/users/${id}`, updates);
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await LocalAPI.delete(`/users/${id}`);
};

export const activateUser = async (id: string): Promise<User> => {
  const { data } = await LocalAPI.patch<User>(`/users/${id}/activate`, {});
  return data;
};

export const deactivateUser = async (id: string): Promise<User> => {
  const { data } = await LocalAPI.patch<User>(`/users/${id}/disable`, {});
  return data;
};

export const resetUserPassword = async (id: string, newPassword: string): Promise<void> => {
  await LocalAPI.post(`/users/${id}/reset-password`, { password: newPassword });
};

export const fetchUserAuditLogs = async (id: string): Promise<AuditLog[]> => {
  const { data } = await LocalAPI.get<AuditLog[]>(`/users/${id}/audit-logs`);
  return data;
};

export const fetchUserPerformance = async (id: string): Promise<UserPerformanceStats> => {
  const { data } = await LocalAPI.get<UserPerformanceStats>(`/users/${id}/performance`);
  return data;
};

export const fetchUserActivity = async (id: string): Promise<UserActivitySummary> => {
  const { data } = await LocalAPI.get<UserActivitySummary>(`/users/${id}/activity`);
  return data;
};

export const fetchUserDashboardStats = async (): Promise<UserDashboardStats> => {
  const { data } = await LocalAPI.get<UserDashboardStats>('/users/dashboard/stats');
  return data;
};

export const bulkUserAction = async (userIds: string[], action: string, data?: any): Promise<BulkActionResult[]> => {
  const { data: result } = await LocalAPI.post<BulkActionResult[]>('/users/bulk-action', {
    userIds,
    action,
    data
  });
  return result;
};

export const exportUserData = async (userIds: string[], format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
  const response = await LocalAPI.post('/users/export', {
    userIds,
    format
  }, {
    responseType: 'blob'
  });
  return response.data;
};

export const fetchUserNotifications = async (userId: string): Promise<UserNotification[]> => {
  const { data } = await LocalAPI.get<UserNotification[]>(`/users/${userId}/notifications`);
  return data;
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await LocalAPI.patch(`/notifications/${notificationId}/read`);
};

// Role and permission utilities
export const canUserManageRole = (currentRole: UserRole, targetRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    'SUPER_ADMIN': 10,
    'ADMINISTRATEUR': 8,
    'RESPONSABLE_DEPARTEMENT': 6,
    'CHEF_EQUIPE': 5,
    'GESTIONNAIRE': 3,
    'CLIENT_SERVICE': 3,
    'FINANCE': 3,
    'SCAN_TEAM': 2,
    'BO': 2
  };
  
  return (roleHierarchy[currentRole] || 0) > (roleHierarchy[targetRole] || 0);
};

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  return { isValid: true, message: 'Mot de passe valide' };
};

export const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = 'Temp';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + '1';
};

// Fetch Gestionnaires (users with role GESTIONNAIRE) - for backward compatibility
export const fetchGestionnaires = async (): Promise<User[]> => {
  return fetchUsers({ role: 'GESTIONNAIRE' });
};