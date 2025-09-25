import { LocalAPI } from './axios';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
  VIEWER = 'VIEWER',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  FINANCE = 'FINANCE',
  SCAN_TEAM = 'SCAN_TEAM',
  BO = 'BO'
}

export const login = async (email: string, password: string) => {
  const { data } = await LocalAPI.post('/auth/login', { email, password });
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
};

export const register = async (userData: any) => {
  const { data } = await LocalAPI.post('/auth/register', userData);
  return data;
};

export const requestPasswordReset = async (email: string) => {
  try {
    const { data } = await LocalAPI.post('/auth/password-reset', { email });
    return data;
  } catch (error) {
    return { success: true, message: 'Password reset email sent' };
  }
};

export const logout = async () => {
  localStorage.removeItem('token');
  return { success: true };
};

export const getCurrentUser = async () => {
  try {
    const { data } = await LocalAPI.get('/auth/me');
    return data;
  } catch (error: any) {
    // If token is invalid, remove it
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    throw error;
  }
};

// === PERMISSION MANAGEMENT ===
export const getUserPermissions = async (userRole: string) => {
  const { data } = await LocalAPI.get(`/auth/permissions/${userRole}`);
  return data;
};

export const checkPermission = async (userRole: string, module: string, action: string) => {
  const { data } = await LocalAPI.get(`/auth/permissions/check`, {
    params: { userRole, module, action }
  });
  return data;
};

export const getAllPermissions = async () => {
  const { data } = await LocalAPI.get('/auth/permissions');
  return data;
};

export const getModulePermissions = async (module: string) => {
  const { data } = await LocalAPI.get(`/auth/permissions/module/${module}`);
  return data;
};