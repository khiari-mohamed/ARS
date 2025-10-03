import React, { useState } from 'react';
import { 
  Box, Paper, Tabs, Tab, useTheme, useMediaQuery, Typography, Badge
} from '@mui/material';
import OVProcessingTab from './OVProcessingTab';
import OVValidationTab from './OVValidationTab';
import TrackingTab from './TrackingTab';
import SuiviVirementTab from './SuiviVirementTab';
import DonneursTab from './DonneursTab';
import AdherentsTab from './AdherentsTab';
import ReportsTab from './ReportsTab';
import MultiBankFormatManager from './MultiBankFormatManager';
import AutomatedReconciliation from './AutomatedReconciliation';
import FinancialReportingDashboard from './FinancialReportingDashboard';
import FinanceMobileView from './FinanceMobileView';

import FinanceAlertsTab from './FinanceAlertsTab';
import FinanceDashboard from './FinanceDashboard';
import SlaConfigurationTab from './SlaConfigurationTab';
// COMMENTED OUT: Static demo tab import - Use functional tabs instead
// import FinanceModuleOverview from './FinanceModuleOverview';
import VirementTable from './VirementTable';
import VirementFilters from './VirementFilters';
import VirementFormModal from './VirementFormModal';
import VirementHistory from './VirementHistory';
import VirementReconciliationPanel from './VirementReconciliationPanel';
import VirementStatusTag from './VirementStatusTag';

import { useAuth } from '../../contexts/AuthContext';
import { financeService } from '../../services/financeService';



const FinanceModule: React.FC = () => {
  // Read tab from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = parseInt(urlParams.get('tab') || '0', 10);
  const [tab, setTab] = useState(initialTab);
  const [selectedVirement, setSelectedVirement] = useState<string | null>(null);
  const [showVirementModal, setShowVirementModal] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Get alerts count for badge
  const [alerts, setAlerts] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    financeService.getSlaAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, []);

  const alertsCount = Array.isArray(alerts) ? alerts.filter((a: any) => a.level === 'CRITIQUE' || a.level === 'DEPASSEMENT').length : 0;

  // EXACT SPEC: 6 tabs as per requirements
  const tabLabels = [
    'Tableau de Bord',           // TAB 1: Dashboard with filters & recent OV
    'Suivi & Statut',            // TAB 2: Bordereaux Traités tracking
    'Ordre de Virement',         // TAB 3: OV Processing wizard
    'Donneur d\'Ordre',          // TAB 4: Bank account management
    'Adhérents',                 // TAB 5: Adherent database
    'Historique & Archives'      // TAB 6: Historical records
  ];

  const handleVirementSelect = (id: string) => {
    setSelectedVirement(id);
    setShowVirementModal(true);
  };

  const handleVirementEdit = (id: string) => {
    setSelectedVirement(id);
    setShowVirementModal(true);
  };

  const closeVirementModal = () => {
    setSelectedVirement(null);
    setShowVirementModal(false);
  };

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



      {/* Mobile View */}
      {isMobile && (
        <>
          <FinanceMobileView onTabChange={setTab} />
          
          {/* Mobile Tab Content */}
          <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {tabLabels[tab]}
            </Typography>
            <Box>
              {/* Mobile: Same 6 tabs */}
              {tab === 0 && <FinanceDashboard />}
              {tab === 1 && <TrackingTab />}
              {tab === 2 && <OVProcessingTab onSwitchToTab={setTab} />}
              {tab === 3 && <DonneursTab />}
              {tab === 4 && <AdherentsTab />}
              {tab === 5 && <ReportsTab />}
            </Box>
          </Paper>
        </>
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
              <Tab 
                key={index} 
                label={
                  index === 7 && alertsCount > 0 ? (
                    <Badge badgeContent={alertsCount} color="error">
                      {label}
                    </Badge>
                  ) : label
                }
              />
            ))}
          </Tabs>

          <Box>
            {/* TAB 1: Tableau de Bord Finance */}
            {tab === 0 && <FinanceDashboard />}
            
            {/* TAB 2: Suivi & Statut - Bordereaux Traités */}
            {tab === 1 && <TrackingTab />}
            
            {/* TAB 3: Ordre de Virement - Processing Wizard */}
            {tab === 2 && <OVProcessingTab onSwitchToTab={setTab} />}
            
            {/* TAB 4: Donneur d'Ordre Management */}
            {tab === 3 && <DonneursTab />}
            
            {/* TAB 5: Adhérents Database */}
            {tab === 4 && <AdherentsTab />}
            
            {/* TAB 6: Historique & Archives */}
            {tab === 5 && <ReportsTab />}
          </Box>
        </Paper>
      )}

      {/* Enhanced Virement Modal */}
      {showVirementModal && selectedVirement && (
        <VirementFormModal
          virementId={selectedVirement}
          onClose={closeVirementModal}
        />
      )}
    </Box>
  );
};

export default FinanceModule;