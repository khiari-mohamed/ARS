import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Legacy export for compatibility
export const UseAuth = useAuth;
export const useAuthContext = useAuth;