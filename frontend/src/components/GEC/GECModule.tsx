import React, { useState } from 'react';
import { 
  Box, Paper, Tabs, Tab, useTheme, useMediaQuery, Typography
} from '@mui/material';
import GECDashboardTab from './GECDashboardTab';
import CreateCorrespondenceTab from './CreateCorrespondenceTab';
import InboxTab from './InboxTab';
import OutboxTab from './OutboxTab';
import SearchArchiveTab from './SearchArchiveTab';
import ReportsTab from './ReportsTab';
import OutlookIntegration from './OutlookIntegration';
import MailTrackingDashboard from './MailTrackingDashboard';
import EnhancedTemplateManager from './EnhancedTemplateManager';
import GECMobileView from './GECMobileView';
import { useAuth } from '../../contexts/AuthContext';

const GECModule: React.FC = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const tabLabels = [
    'Dashboard',
    'Créer Courrier',
    'Boîte de Réception',
    'Boîte d\'Envoi',
    'Outlook/365',
    'Suivi Emails',
    'Modèles Avancés',
    'Recherche & Archive',
    'Rapports'
  ];

  return (
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)', color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          GEC - Gestion Électronique du Courrier
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Système centralisé de gestion de correspondance
        </Typography>
      </Paper>

      {/* Mobile View */}
      {isMobile && (
        <GECMobileView onTabChange={setTab} />
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
            {tab === 0 && <GECDashboardTab />}
            {tab === 1 && <CreateCorrespondenceTab />}
            {tab === 2 && <InboxTab />}
            {tab === 3 && <OutboxTab />}
            {tab === 4 && <OutlookIntegration />}
            {tab === 5 && <MailTrackingDashboard />}
            {tab === 6 && <EnhancedTemplateManager />}
            {tab === 7 && <SearchArchiveTab />}
            {tab === 8 && <ReportsTab />}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GECModule;