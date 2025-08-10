import React, { useState } from 'react';
import { 
  Box, Paper, Tabs, Tab, useTheme, useMediaQuery, Typography
} from '@mui/material';
import OVProcessingTab from './OVProcessingTab';
import TrackingTab from './TrackingTab';
import DonneursTab from './DonneursTab';
import AdherentsTab from './AdherentsTab';
import ReportsTab from './ReportsTab';
import MultiBankFormatManager from './MultiBankFormatManager';
import AutomatedReconciliation from './AutomatedReconciliation';
import FinancialReportingDashboard from './FinancialReportingDashboard';
import FinanceMobileView from './FinanceMobileView';
import FinanceTestPanel from './FinanceTestPanel';
import { useAuth } from '../../contexts/AuthContext';

const FinanceModule: React.FC = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const tabLabels = [
    'Ordre de Virement',
    'Suivi & Statut',
    'Donneurs d\'Ordre',
    'Adhérents',
    'Formats Bancaires',
    'Rapprochement Auto',
    'Rapports Financiers',
    'Rapports'
  ];

  return (
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Module Finance - Gestion des Virements
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Traitement des ordres de virement et suivi des paiements
        </Typography>
      </Paper>

      {/* API Test Panel (for development) */}
      <FinanceTestPanel />

      {/* Mobile View */}
      {isMobile && (
        <FinanceMobileView onTabChange={setTab} />
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
            {tab === 0 && <OVProcessingTab />}
            {tab === 1 && <TrackingTab />}
            {tab === 2 && <DonneursTab />}
            {tab === 3 && <AdherentsTab />}
            {tab === 4 && <MultiBankFormatManager />}
            {tab === 5 && <AutomatedReconciliation />}
            {tab === 6 && <FinancialReportingDashboard />}
            {tab === 7 && <ReportsTab />}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default FinanceModule;