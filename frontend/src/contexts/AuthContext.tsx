import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Helper to decode JWT (without verifying signature, just for payload extraction)
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Map backend roles to frontend roles
const roleMap: Record<string, string> = {
  ADMIN: 'ADMINISTRATEUR',
  SUPER_ADMIN: 'ADMINISTRATEUR',
  ADMINISTRATEUR: 'ADMINISTRATEUR',
  CHEF_EQUIPE: 'CHEF_EQUIPE',
  GESTIONNAIRE: 'GESTIONNAIRE',
  CLIENT_SERVICE: 'CLIENT_SERVICE',
  FINANCE: 'FINANCE',
};

interface User {
  id: string;
  username: string;
  role: string;
  // Add other user fields as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // On mount, restore token and user from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      const payload = parseJwt(storedToken);
      if (payload) {
        setUser({
          id: payload.sub || payload.id,
          username: payload.username || payload.email || '',
          role: roleMap[payload.role] || payload.role || '',
        });
      }
    }
  }, []);

  // Login: store token, extract user, set state
  const login = (jwtToken: string) => {
    localStorage.setItem('access_token', jwtToken);
    setToken(jwtToken);
    const payload = parseJwt(jwtToken);
    if (payload) {
      setUser({
        id: payload.sub || payload.id,
        username: payload.username || payload.email || '',
        role: roleMap[payload.role] || payload.role || '',
      });
    }
  };

  // Logout: clear everything
  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Compatibility hook for legacy code
export const useAuth = useAuthContext;