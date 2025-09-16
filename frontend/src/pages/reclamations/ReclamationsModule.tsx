import React, { useState } from 'react';
import { Tabs, Tab, Box, useTheme, useMediaQuery, Paper, Typography } from '@mui/material';
import ReclamationDashboard from '../../components/reclamations/ReclamationDashboard';
import ReclamationForm from '../../components/reclamations/ReclamationForm';
import { ReclamationsList } from '../../components/reclamations/ReclamationsList';
import ReclamationSearch from '../../components/reclamations/ReclamationSearch';
import { Reporting } from '../../components/reclamations/Reporting';
import AIClassificationPanel from '../../components/reclamations/AIClassificationPanel';
import CustomerPortalInterface from '../../components/reclamations/CustomerPortalInterface';
import AdvancedAnalyticsPanel from '../../components/reclamations/AdvancedAnalyticsPanel';
import ChefCorbeille from '../../components/reclamations/ChefCorbeille';
import GestionnaireCorbeille from '../../components/reclamations/GestionnaireCorbeille';
import BOReclamationForm from '../../components/reclamations/BOReclamationForm';
import RealTimeAlerts from '../../components/reclamations/RealTimeAlerts';
import { useAuth } from '../../contexts/AuthContext';

const ReclamationsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
          { label: 'Analyses Avancées', component: <AdvancedAnalyticsPanel /> },
          { label: 'Rapports', component: <Reporting /> }
        ];
      
      case 'GESTIONNAIRE':
        return [
          { label: 'Ma Corbeille', component: <GestionnaireCorbeille /> }
          // { label: 'Nouvelle Réclamation', component: <ReclamationForm onSuccess={() => setActiveTab(0)} /> },
          // { label: 'Recherche', component: <ReclamationSearch /> }
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
          { label: 'Analyses Avancées', component: <AdvancedAnalyticsPanel /> },
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
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)', color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestion des Réclamations
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Système de traitement et suivi des réclamations
        </Typography>
      </Paper>

      <RealTimeAlerts />
      
      {/* Role-based access warning for Gestionnaire */}
      {user?.role === 'GESTIONNAIRE' && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
          <Typography variant="body2" color="warning.dark">
            ⚠️ Accès Gestionnaire: Vous ne pouvez voir que les réclamations qui vous sont assignées
          </Typography>
        </Paper>
      )}
      
      <Paper elevation={2} sx={{ p: { xs: 1, sm: 3 } }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 3,
          width: '100%',
          overflowX: 'auto'
        }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            sx={{
              minHeight: { xs: 48, sm: 48 },
              '& .MuiTab-root': {
                minWidth: { xs: 120, sm: 160 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                padding: { xs: '8px 12px', sm: '12px 16px' },
                textTransform: 'none',
                fontWeight: 500
              },
              '& .MuiTabs-scrollButtons': {
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          {tabs[activeTab]?.component}
        </Box>
      </Paper>
    </Box>
  );
};

export default ReclamationsModule;