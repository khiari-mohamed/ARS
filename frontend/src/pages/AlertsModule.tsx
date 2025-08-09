import React, { useState } from 'react';
import { Tabs, Tab, Box, Badge } from '@mui/material';
import AlertsDashboard from './dashboard/AlertsDashboard';
import ActiveAlerts from '../components/ActiveAlerts';
import ResolvedAlerts from '../components/ResolvedAlerts';
import AlertsAnalytics from '../components/AlertsAnalytics';
import { useAlertsDashboard } from '../hooks/useAlertsQuery';

const AlertsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data: alerts = [] } = useAlertsDashboard({});
  
  const activeAlertsCount = alerts.filter((a: any) => a.alertLevel === 'red' || a.alertLevel === 'orange').length;
  const urgentAlertsCount = alerts.filter((a: any) => a.alertLevel === 'red').length;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <div className="alerts-module">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
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
                Alertes Actives
              </Badge>
            } 
          />
          <Tab label="Alertes Résolues" />
          <Tab label="Analytics & Rapports" />
        </Tabs>
      </Box>

      {activeTab === 0 && <AlertsDashboard />}
      {activeTab === 1 && <ActiveAlerts />}
      {activeTab === 2 && <ResolvedAlerts />}
      {activeTab === 3 && <AlertsAnalytics />}
    </div>
  );
};

export default AlertsModule;