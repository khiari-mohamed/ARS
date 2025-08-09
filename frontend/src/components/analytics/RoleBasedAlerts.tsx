import React from 'react';
import { Box, Typography, Chip, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

const RoleBasedAlerts: React.FC<Props> = ({ 
  children, 
  allowedRoles = ['SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'], 
  fallback 
}): JSX.Element => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Alert severity="warning">
        Authentification requise pour accéder aux alertes
      </Alert>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (fallback as JSX.Element) || (
      <Alert severity="info">
        <Typography variant="body2">
          Accès restreint. Votre rôle: <Chip size="small" label={user.role} />
        </Typography>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default RoleBasedAlerts;