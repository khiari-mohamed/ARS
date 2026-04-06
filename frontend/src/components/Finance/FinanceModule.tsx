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

  // Clear OV sessionStorage when manually switching tabs (not from redirect)
  const handleTabChange = (newTab: number) => {
    // If switching away from tab 2 and not coming from a redirect, clear OV data
    if (tab === 2 && newTab !== 2) {
      const urlParams = new URLSearchParams(window.location.search);
      const isFromRedirect = urlParams.get('tab') === '2';
      
      if (!isFromRedirect) {
        console.log('🧽 Clearing OV sessionStorage (manual tab switch)');
        sessionStorage.removeItem('manualOVData');
        sessionStorage.removeItem('selectedBordereaux');
      }
    }
    
    // If manually clicking tab 2 for CHEF_EQUIPE, clear OV data to show Donneur tab
    if (newTab === 2 && (user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR')) {
      console.log('🧽 Clearing OV sessionStorage (manual click on Donneur tab)');
      sessionStorage.removeItem('manualOVData');
      sessionStorage.removeItem('selectedBordereaux');
    }
    
    setTab(newTab);
  };

  // Get alerts count for badge
  const [alerts, setAlerts] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    financeService.getSlaAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, []);

  const alertsCount = Array.isArray(alerts) ? alerts.filter((a: any) => a.level === 'CRITIQUE' || a.level === 'DEPASSEMENT').length : 0;

  // EXACT SPEC: 6 tabs as per requirements (hide OV tab for GESTIONNAIRE_SENIOR and CHEF_EQUIPE)
  const tabLabels = [
    'Tableau de Bord',           // TAB 1: Dashboard with filters & recent OV
    'Suivi & Statut',            // TAB 2: Bordereaux Traités tracking
    ...(user?.role !== 'GESTIONNAIRE_SENIOR' && user?.role !== 'CHEF_EQUIPE' ? ['Ordre de Virement'] : []),         // TAB 3: OV Processing wizard
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
          <FinanceMobileView onTabChange={handleTabChange} />
          
          {/* Mobile Tab Content */}
          <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {tabLabels[tab]}
            </Typography>
            <Box>
              {/* Mobile: Same 6 tabs */}
              {tab === 0 && <FinanceDashboard />}
              {tab === 1 && <TrackingTab />}
              {/* TAB 3: OV Processing - accessible via redirect only for CHEF_EQUIPE/GESTIONNAIRE_SENIOR */}
              {tab === 2 && <OVProcessingTab onSwitchToTab={handleTabChange} />}
              {tab === (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE' ? 2 : 3) && <DonneursTab />}
              {tab === (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE' ? 3 : 4) && <AdherentsTab />}
              {tab === (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE' ? 4 : 5) && <ReportsTab />}
            </Box>
          </Paper>
        </>
      )}

      {/* Desktop View */}
      {!isMobile && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => handleTabChange(v)}
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
            
            {/* TAB 2/3: Smart routing based on role and context */}
            {tab === 2 && (() => {
              // Check if coming from OV creation flow (manual OV or bordereau OV)
              const hasManualOVData = sessionStorage.getItem('manualOVData');
              const hasSelectedBordereaux = sessionStorage.getItem('selectedBordereaux');
              const isOVFlow = hasManualOVData || hasSelectedBordereaux;
              
              console.log('🔍 TAB 2 RENDER:', {
                role: user?.role,
                hasManualOVData: !!hasManualOVData,
                hasSelectedBordereaux: !!hasSelectedBordereaux,
                isOVFlow,
                willShow: (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE') 
                  ? (isOVFlow ? 'OVProcessingTab' : 'DonneursTab')
                  : 'OVProcessingTab'
              });
              
              // For CHEF_EQUIPE/GESTIONNAIRE_SENIOR:
              // - If coming from OV flow: show OV tab
              // - Otherwise: show Donneur d'Ordre tab
              if (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE') {
                return isOVFlow ? <OVProcessingTab onSwitchToTab={setTab} /> : <DonneursTab />;
              }
              
              // For other roles: always show OV tab at index 2
              return <OVProcessingTab onSwitchToTab={handleTabChange} />;
            })()}
            
            {/* TAB 3: Donneur d'Ordre Management - only for non-CHEF/SENIOR roles */}
            {tab === 3 && (user?.role !== 'GESTIONNAIRE_SENIOR' && user?.role !== 'CHEF_EQUIPE') && <DonneursTab />}
            
            {/* TAB 3/4: Adhérents Database */}
            {tab === (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE' ? 3 : 4) && <AdherentsTab />}
            
            {/* TAB 4/5: Historique & Archives */}
            {tab === (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE' ? 4 : 5) && <ReportsTab />}
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