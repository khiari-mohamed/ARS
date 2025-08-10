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
import ReportsTab from './ReportsTab';
import GEDMobileView from './GEDMobileView';
import { useAuth } from '../../contexts/AuthContext';

const GEDModule: React.FC = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const tabLabels = [
    'Dashboard',
    'Ingestion',
    'Corbeille',
    'Recherche',
    'Workflows',
    'Intégrations',
    'Rapports'
  ];

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
        <GEDMobileView onTabChange={setTab} />
      )}

      {/* Desktop View */}
      {!isMobile && (
        <Paper elevation={2} sx={{ p: 3 }}>
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
            {tab === 0 && <GEDDashboardTab />}
            {tab === 1 && <DocumentIngestionTab />}
            {tab === 2 && <CorbeilleTab />}
            {tab === 3 && <AdvancedSearchInterface />}
            {tab === 4 && <DocumentWorkflowManager />}
            {tab === 5 && <IntegrationManager />}
            {tab === 6 && <ReportsTab />}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GEDModule;