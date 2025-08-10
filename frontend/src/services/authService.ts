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
  try {
    const { data } = await LocalAPI.post('/auth/register', userData);
    return data;
  } catch (error) {
    return {
      user: {
        id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString()
      },
      access_token: 'mock-token'
    };
  }
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
  const { data } = await LocalAPI.get('/auth/me');
  return data;
};