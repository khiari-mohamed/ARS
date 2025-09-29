import React, { useState } from 'react';
import { 
  Box, Paper, Tabs, Tab, useTheme, useMediaQuery, Typography
} from '@mui/material';
import GEDDashboardTab from './GEDDashboardTab';
import DocumentIngestionTab from './DocumentIngestionTab';
import CorbeilleTab from './CorbeilleTab';
import AdvancedSearchInterface from './AdvancedSearchInterface';
import DocumentWorkflowManager from './DocumentWorkflowManager';
import IntegrationManager from './IntegrationManager';
import PaperStreamDashboard from './PaperStreamDashboard';
import ReportsTab from './ReportsTab';
import GEDMobileView from './GEDMobileView';
import { useAuth } from '../../contexts/AuthContext';

const GEDModule: React.FC = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Role-based tab filtering
  const allTabs = [
    { label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM'] },
    { label: 'Ingestion', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'SCAN_TEAM'] },
    { label: 'Corbeille', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
    { label: 'Recherche', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM'] },
    // COMMENTED OUT: Extra tabs not in core requirements
    // { label: 'Workflows', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE'] },
    // { label: 'Intégrations', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR'] },
    // { label: 'PaperStream', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'SCAN_TEAM'] },
    { label: 'Rapports', roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'] }
  ];

  const availableTabs = allTabs.filter(tab => 
    !user?.role || tab.roles.includes(user.role)
  );
  
  const tabLabels = availableTabs.map(tab => tab.label);

  return (
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          GED - Gestion Électronique des Documents
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Système centralisé de gestion documentaire et workflow
        </Typography>
      </Paper>

      {/* Mobile View */}
      {isMobile && (
        <>
          <GEDMobileView onTabChange={setTab} />
          
          {/* Mobile Tab Content */}
          <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {tabLabels[tab]}
            </Typography>
            <Box>
              {tab === 0 && <GEDDashboardTab />}
              {tab === 1 && <DocumentIngestionTab />}
              {tab === 2 && <CorbeilleTab />}
              {tab === 3 && <AdvancedSearchInterface />}
              {/* COMMENTED OUT: Extra tabs not in core requirements */}
              {/* {tab === 4 && <DocumentWorkflowManager />} */}
              {/* {tab === 5 && <IntegrationManager />} */}
              {/* {tab === 6 && <PaperStreamDashboard />} */}
              {tab === 4 && <ReportsTab />}
            </Box>
          </Paper>
        </>
      )}

      {/* Desktop View */}
      {!isMobile && (
        <Paper elevation={2} sx={{ p: 3 }}>
          {/* Role-based access warnings */}
          {user?.role === 'GESTIONNAIRE' && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.dark">
                ⚠️ Accès GED limité: Vous ne pouvez consulter que les documents liés à vos dossiers assignés
              </Typography>
            </Box>
          )}
          {user?.role === 'RESPONSABLE_DEPARTEMENT' && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                ℹ️ Mode Lecture Seule: Vous avez accès à tous les modules GED en consultation uniquement
              </Typography>
            </Box>
          )}

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 3 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>

          <Box>
            {availableTabs[tab]?.label === 'Dashboard' && <GEDDashboardTab />}
            {availableTabs[tab]?.label === 'Ingestion' && <DocumentIngestionTab />}
            {availableTabs[tab]?.label === 'Corbeille' && <CorbeilleTab />}
            {availableTabs[tab]?.label === 'Recherche' && <AdvancedSearchInterface />}
            {/* COMMENTED OUT: Extra tabs not in core requirements */}
            {/* {availableTabs[tab]?.label === 'Workflows' && <DocumentWorkflowManager />} */}
            {/* {availableTabs[tab]?.label === 'Intégrations' && <IntegrationManager />} */}
            {/* {availableTabs[tab]?.label === 'PaperStream' && <PaperStreamDashboard />} */}
            {availableTabs[tab]?.label === 'Rapports' && <ReportsTab />}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GEDModule;