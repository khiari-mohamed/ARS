import React from 'react';
import { Box } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface RoleBasedAlertsProps {
  children: React.ReactNode;
}

const RoleBasedAlerts: React.FC<RoleBasedAlertsProps> = ({ children }) => {
  const { user } = useAuth();

  // Add role-based styling or behavior if needed
  const getRoleStyles = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return { borderLeft: '4px solid #1976d2' };
      case 'CHEF_EQUIPE':
        return { borderLeft: '4px solid #ed6c02' };
      case 'GESTIONNAIRE':
        return { borderLeft: '4px solid #2e7d32' };
      default:
        return {};
    }
  };

  return (
    <Box sx={getRoleStyles()}>
      {children}
    </Box>
  );
};

export default RoleBasedAlerts;