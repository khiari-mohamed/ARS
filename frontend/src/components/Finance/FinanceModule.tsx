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
  const [tab, setTab] = useState(0);
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

  const tabLabels = [
    // COMMENTED OUT: Static demo tab - Use functional tabs instead
    // 'Vue d\'Ensemble',
    'Tableau de Bord',
    'Ordre de Virement',
    ...(user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? ['Validation OV'] : []),
    'Suivi & Statut',
    'Suivi Virement',
    'Donneurs d\'Ordre',
    'Adhérents',
    'Alertes & Retards',
    'Formats Bancaires',
    'Configuration SLA',
    'Rapprochement Auto',
    'Rapports Financiers',
    'Rapports & Export'
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
              {/* COMMENTED OUT: Static demo tab - Use functional tabs instead */}
              {/* {tab === 0 && <FinanceModuleOverview />} */}
              {tab === 0 && <FinanceDashboard />}
              {tab === 1 && <OVProcessingTab onSwitchToTab={setTab} />}
              {(user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN') && tab === 2 && <OVValidationTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 3 : 2) && <TrackingTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 4 : 3) && <SuiviVirementTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 5 : 4) && <DonneursTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 6 : 5) && <AdherentsTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 7 : 6) && (
                <Badge badgeContent={alertsCount} color="error">
                  <FinanceAlertsTab />
                </Badge>
              )}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 8 : 7) && <MultiBankFormatManager />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 9 : 8) && <SlaConfigurationTab />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 10 : 9) && <AutomatedReconciliation />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 11 : 10) && <FinancialReportingDashboard />}
              {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 12 : 11) && <ReportsTab />}
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
            {/* COMMENTED OUT: Static demo tab - Use functional tabs instead */}
            {/* {tab === 0 && <FinanceModuleOverview />} */}
            {tab === 0 && <FinanceDashboard />}
            {tab === 1 && <OVProcessingTab onSwitchToTab={setTab} />}
            {(user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN') && tab === 2 && <OVValidationTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 3 : 2) && <TrackingTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 4 : 3) && <SuiviVirementTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 5 : 4) && <DonneursTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 6 : 5) && <AdherentsTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 7 : 6) && <FinanceAlertsTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 8 : 7) && <MultiBankFormatManager />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 9 : 8) && <SlaConfigurationTab />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 10 : 9) && <AutomatedReconciliation />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 11 : 10) && <FinancialReportingDashboard />}
            {tab === (user?.role === 'RESPONSABLE_EQUIPE' || user?.role === 'SUPER_ADMIN' ? 12 : 11) && <ReportsTab />}
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