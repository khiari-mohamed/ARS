import { LocalAPI } from './axios';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  FINANCE = 'FINANCE',
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export interface PasswordResetResponse {
  message: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await LocalAPI.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
};

export const register = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<void> => {
  await LocalAPI.post('/auth/register', { email, password, fullName, role });
};

export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  const res = await LocalAPI.post<PasswordResetResponse>('/auth/password-reset-request', { email });
  return res.data;
};

export const confirmPasswordReset = async (token: string, newPassword: string): Promise<PasswordResetResponse> => {
  const res = await LocalAPI.post<PasswordResetResponse>('/auth/password-reset-confirm', { token, newPassword });
  return res.data;
};

/**
 * Logs out the user by removing the token from localStorage/sessionStorage.
 * Optionally, you can call a backend endpoint if you implement token blacklisting.
 */
export const logout = (): void => {
  localStorage.removeItem('access_token');
  // Optionally clear user info, etc.
};