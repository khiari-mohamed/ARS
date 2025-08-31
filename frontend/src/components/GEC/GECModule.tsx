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
import GECAIInsights from './GECAIInsights';
import RelanceManager from './RelanceManager';
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
    'Relances',
    'Outlook/365',
    'Suivi Emails',
    'Modèles Avancés',
    'Insights IA',
    'Recherche & Archive',
    'Rapports'
  ];

  const renderTabContent = () => {
    switch (tab) {
      case 0: return <GECDashboardTab />;
      case 1: return <CreateCorrespondenceTab />;
      case 2: return <InboxTab />;
      case 3: return <OutboxTab />;
      case 4: return <RelanceManager />;
      case 5: return <OutlookIntegration />;
      case 6: return <MailTrackingDashboard />;
      case 7: return <EnhancedTemplateManager />;
      case 8: return <GECAIInsights />;
      case 9: return <SearchArchiveTab />;
      case 10: return <ReportsTab />;
      default: return <GECDashboardTab />;
    }
  };

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
        <Box>
          <GECMobileView onTabChange={setTab} />
          <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            {renderTabContent()}
          </Paper>
        </Box>
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
            {renderTabContent()}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GECModule;