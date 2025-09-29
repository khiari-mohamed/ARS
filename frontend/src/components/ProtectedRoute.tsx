import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../hooks/useRoleAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/home/dashboard' 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        Chargement...
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role as UserRole;
  
  // Super Admin and RESPONSABLE_DEPARTEMENT have access to everything
  if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.RESPONSABLE_DEPARTEMENT) {
    return <>{children}</>;
  }

  // Check if user role is in allowed roles
  if (!allowedRoles.includes(userRole)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <strong>Accès refusé</strong>
          <br />
          Votre rôle ({userRole}) ne vous permet pas d'accéder à cette page.
          <br />
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;