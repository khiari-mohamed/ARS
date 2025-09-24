import React, { useState } from 'react';
import { Tabs, Tab, Box, Badge, useTheme, useMediaQuery } from '@mui/material';
import AlertsDashboard from './dashboard/AlertsDashboard';
import ActiveAlerts from '../components/ActiveAlerts';
import ResolvedAlerts from '../components/ResolvedAlerts';
import AlertsAnalytics from '../components/AlertsAnalytics';
import EscalationRulesManager from '../components/EscalationRulesManager';
import MultiChannelNotifications from '../components/MultiChannelNotifications';
import AlertAnalyticsDashboard from '../components/AlertAnalyticsDashboard';
import { useAlertsDashboard } from '../hooks/useAlertsQuery';

const AlertsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: alerts = [] } = useAlertsDashboard({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const activeAlertsCount = alerts.filter((a: any) => a.alertLevel === 'red' || a.alertLevel === 'orange').length;
  const urgentAlertsCount = alerts.filter((a: any) => a.alertLevel === 'red').length;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        flexShrink: 0,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minWidth: isMobile ? 120 : 'auto',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              padding: isMobile ? '6px 8px' : '12px 16px'
            }
          }}
        >
          <Tab 
            label={
              <Badge badgeContent={urgentAlertsCount} color="error">
                Dashboard
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={activeAlertsCount} color="warning">
                {isMobile ? 'Actives' : 'Alertes Actives'}
              </Badge>
            } 
          />
          <Tab label={isMobile ? 'Résolues' : 'Alertes Résolues'} />
          <Tab label={isMobile ? 'Escalade' : 'Règles d\'Escalade'} />
          {/* COMMENTED OUT: Extra tabs not in core requirements */}
          {/* <Tab label={isMobile ? 'Notifications' : 'Notifications Multi-Canaux'} /> */}
          {/* <Tab label={isMobile ? 'Analyses' : 'Analyses Avancées'} /> */}
          {/* <Tab label={isMobile ? 'Analytics' : 'Analytics & Rapports'} /> */}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: isMobile ? 1 : 2 }}>
        {activeTab === 0 && <AlertsDashboard />}
        {activeTab === 1 && <ActiveAlerts />}
        {activeTab === 2 && <ResolvedAlerts />}
        {activeTab === 3 && <EscalationRulesManager />}
        {/* COMMENTED OUT: Extra tabs not in core requirements */}
        {/* {activeTab === 4 && <MultiChannelNotifications />} */}
        {/* {activeTab === 5 && <AlertAnalyticsDashboard />} */}
        {/* {activeTab === 6 && <AlertsAnalytics />} */}
      </Box>
    </Box>
  );
};

export default AlertsModule;