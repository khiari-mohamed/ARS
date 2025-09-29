import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import EnhancedDashboard from '../../components/EnhancedDashboard';
import ChefEquipeDashboard from './ChefEquipeDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'CHEF_EQUIPE') {
    return <ChefEquipeDashboard />;
  }
  
  // RESPONSABLE_DEPARTEMENT gets same view as SUPER_ADMIN but read-only
  return <EnhancedDashboard />;
};

export default Dashboard;
