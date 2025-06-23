import { useContext } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const ctx = useAuthContext();
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function UseAuth() {
  // Replace with real auth logic
  return { user: { id: 'demo', role: 'SUPER_ADMIN', fullName: 'Demo User' } };
}