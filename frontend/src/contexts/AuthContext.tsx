import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (token: string, user?: User) => void;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (token: string, userData?: User) => {
    localStorage.setItem('token', token);
    if (userData) {
      setUser(userData);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Try to get current user
      import('../services/authService').then(({ getCurrentUser }) => {
        getCurrentUser()
          .then(setUser)
          .catch(() => {
            localStorage.removeItem('token');
            setUser(null);
          })
          .finally(() => setLoading(false));
      });
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Legacy export for compatibility
export const useAuthContext = useAuth;