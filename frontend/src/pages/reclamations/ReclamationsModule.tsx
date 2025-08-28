import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import ReclamationDashboard from '../../components/reclamations/ReclamationDashboard';
import ReclamationForm from '../../components/reclamations/ReclamationForm';
import { ReclamationsList } from '../../components/reclamations/ReclamationsList';
import ReclamationSearch from '../../components/reclamations/ReclamationSearch';
import { Reporting } from '../../components/reclamations/Reporting';
import AIClassificationPanel from '../../components/reclamations/AIClassificationPanel';
import CustomerPortalInterface from '../../components/reclamations/CustomerPortalInterface';
import AdvancedAnalyticsDashboard from '../../components/reclamations/AdvancedAnalyticsDashboard';
import ChefCorbeille from '../../components/reclamations/ChefCorbeille';
import GestionnaireCorbeille from '../../components/reclamations/GestionnaireCorbeille';
import BOReclamationForm from '../../components/reclamations/BOReclamationForm';
import RealTimeAlerts from '../../components/reclamations/RealTimeAlerts';
import { useAuth } from '../../contexts/AuthContext';

const ReclamationsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Role-specific tab configurations
  const getTabsForRole = () => {
    switch (user?.role) {
      case 'CHEF_EQUIPE':
        return [
          { label: 'Corbeille Chef', component: <ChefCorbeille /> },
          { label: 'Dashboard', component: <ReclamationDashboard /> },
          { label: 'Liste Complète', component: <ReclamationsList /> },
          { label: 'Analyses Avancées', component: <AdvancedAnalyticsDashboard /> },
          { label: 'Rapports', component: <Reporting /> }
        ];
      
      case 'GESTIONNAIRE':
        return [
          { label: 'Ma Corbeille', component: <GestionnaireCorbeille /> },
          { label: 'Nouvelle Réclamation', component: <ReclamationForm onSuccess={() => setActiveTab(0)} /> },
          { label: 'Recherche', component: <ReclamationSearch /> }
        ];
      
      case 'BUREAU_ORDRE':
        return [
          { label: 'Nouvelle Réclamation', component: <BOReclamationForm onSuccess={() => setActiveTab(1)} /> },
          { label: 'Dashboard BO', component: <ReclamationDashboard /> },
          { label: 'Liste', component: <ReclamationsList /> }
        ];
      
      case 'CLIENT_SERVICE':
        return [
          { label: 'Dashboard', component: <ReclamationDashboard /> },
          { label: 'Liste des Réclamations', component: <ReclamationsList /> },
          { label: 'Portail Client', component: <CustomerPortalInterface /> },
          { label: 'Recherche', component: <ReclamationSearch /> }
        ];
      
      case 'SUPER_ADMIN':
        return [
          { label: 'Dashboard', component: <ReclamationDashboard /> },
          { label: 'Corbeille Chef', component: <ChefCorbeille /> },
          { label: 'Liste Complète', component: <ReclamationsList /> },
          { label: 'Classification IA', component: <AIClassificationPanel /> },
          { label: 'Portail Client', component: <CustomerPortalInterface /> },
          { label: 'Analyses Avancées', component: <AdvancedAnalyticsDashboard /> },
          { label: 'Rapports', component: <Reporting /> }
        ];
      
      default:
        return [
          { label: 'Dashboard', component: <ReclamationDashboard /> },
          { label: 'Liste des Réclamations', component: <ReclamationsList /> }
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <div className="reclamations-module">
      <RealTimeAlerts />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {tabs[activeTab]?.component}
    </div>
  );
};

export default ReclamationsModule;