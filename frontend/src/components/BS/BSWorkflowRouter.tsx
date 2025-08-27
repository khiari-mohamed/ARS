import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BODashboard from '../../pages/dashboard/BODashboard';
import ScanDashboard from '../../pages/dashboard/ScanDashboard';
import ChefDashboard from '../../pages/dashboard/ChefDashboard';
import GestionnaireDashboard from '../../pages/dashboard/GestionnaireDashboard';
import { Alert } from 'antd';

/**
 * Routes users to the appropriate BS workflow dashboard based on their role
 */
export const BSWorkflowRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Alert
        type="warning"
        message="Authentification requise"
        description="Veuillez vous connecter pour accéder au module BS."
      />
    );
  }

  // Route based on user role
  switch (user.role?.toLowerCase()) {
    case 'bo':
    case 'bureau_ordre':
      return <BODashboard />;
    
    case 'scan':
    case 'scanner':
      return <ScanDashboard />;
    
    case 'chef':
    case 'chef_equipe':
    case 'team_leader':
      return <ChefDashboard />;
    
    case 'gestionnaire':
    case 'processor':
      return <GestionnaireDashboard />;
    
    case 'finance':
      // Finance users see their own dashboard (not implemented here)
      return (
        <Alert
          type="info"
          message="Module Finance"
          description="Accédez au module Finance pour le suivi des virements BS."
          action={
            <a href="/finance">Aller au module Finance</a>
          }
        />
      );
    
    case 'super_admin':
    case 'admin':
      // Super admin can see all dashboards - default to Chef view
      return <ChefDashboard />;
    
    default:
      return (
        <Alert
          type="error"
          message="Rôle non reconnu"
          description={`Votre rôle "${user.role}" n'est pas configuré pour le module BS. Contactez l'administrateur.`}
        />
      );
  }
};