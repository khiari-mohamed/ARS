import React, { useState, useEffect } from 'react';
import { Client } from '../../types/client.d';
import { Tabs, Tab, Box, Paper, Grid, Typography, Button, Snackbar, Alert, useTheme, useMediaQuery } from '@mui/material';
import OverviewTab from './ClientTabs/OverviewTab';
import ContractsTab from './ClientTabs/ContractsTab';
import SLATab from './ClientTabs/SLATab';
import ComplaintsTab from './ClientTabs/ComplaintsTab';
import KPITab from './ClientTabs/KPITab';
import BordereauxTab from './ClientTabs/BordereauxTab';
import HistoryTab from './ClientTabs/HistoryTab';
import TrendsTab from './ClientTabs/TrendsTab';
import PerformanceDashboard from './ClientTabs/PerformanceDashboard';
import ClientProfileHeader from './ClientProfileHeader';
import ClientQuickActions from './ClientQuickActions';
import ClientMobileView from './ClientMobileView';
import ClientPerformanceAnalytics from './ClientPerformanceAnalytics';
import ClientCommunicationHistory from './ClientCommunicationHistory';
import ClientRiskAssessment from './ClientRiskAssessment';
import { syncExternalClient, fetchClientById, fetchClientAIRecommendations, fetchClientAnalytics } from '../../services/clientService';

interface Props {
  client: Client;
}

const featureList = [
  { label: 'Overview', anchor: 'overview' },
  { label: 'Contracts', anchor: 'contracts' },
  { label: 'SLA Parameters', anchor: 'sla' },
  { label: 'Complaints', anchor: 'complaints' },
  { label: 'KPIs', anchor: 'kpi' },
  { label: 'Bordereaux', anchor: 'bordereaux' },
  { label: 'Performance', anchor: 'performance' },
  { label: 'Analytics', anchor: 'analytics' },
  { label: 'Communication', anchor: 'communication' },
  { label: 'Risk Assessment', anchor: 'risk' },
  { label: 'History', anchor: 'history' },
  { label: 'Trends', anchor: 'trends' },
];

const ClientDetail: React.FC<Props> = ({ client }) => {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [currentClient, setCurrentClient] = useState<Client>(client);
  const [syncing, setSyncing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [avgSLA, setAvgSLA] = useState<number | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Summary counts (fallback to 0 if undefined)
  const contractsCount = currentClient.contracts?.length ?? 0;
  const bordereauxCount = currentClient.bordereaux?.length ?? 0;
  const complaintsCount = currentClient.reclamations?.length ?? 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aiRes, analyticsRes] = await Promise.all([
          fetchClientAIRecommendations(currentClient.id),
          fetchClientAnalytics(currentClient.id)
        ]);
        setAiRecommendation(aiRes.recommendation);
        setAvgSLA(analyticsRes.avgSLA);
      } catch {
        setAiRecommendation(null);
        setAvgSLA(null);
      }
    };
    fetchData();
  }, [currentClient.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncExternalClient(currentClient.id);
      // Refresh client data
      const updated = await fetchClientById(currentClient.id);
      setCurrentClient(updated);
      setSnackbar({ open: true, message: 'Client synced with external system.', severity: 'success' });
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Sync failed', severity: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      {/* Mobile View */}
      {isMobile && (
        <ClientMobileView 
          client={currentClient} 
          avgSLA={avgSLA}
          onTabChange={setTab}
        />
      )}
      
      {/* Desktop View */}
      {!isMobile && (
        <>
          {/* Client Profile Header */}
          <ClientProfileHeader client={currentClient} avgSLA={avgSLA} />
      
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} lg={9}>
          <Paper elevation={2} sx={{ p: 3 }}>
            {/* Persistent AI Recommendation */}
            {aiRecommendation && (
              <Alert severity={aiRecommendation.startsWith('⚠️') ? 'warning' : 'success'} sx={{ mb: 2 }}>
                <strong>AI Recommendation:</strong> {aiRecommendation}
              </Alert>
            )}
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleSync}
              disabled={syncing}
              sx={{ mb: 2 }}
              aria-label="Sync client with external system"
            >
              {syncing ? 'Syncing...' : 'Sync with External'}
            </Button>
            {/* Main Tabs */}
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ mb: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label="Contracts" />
              <Tab label="SLA Parameters" />
              <Tab label="Complaints" />
              <Tab label="KPIs" />
              <Tab label="Bordereaux" />
              <Tab label="Performance" />
              <Tab label="Analytics" />
              <Tab label="Communication" />
              <Tab label="Risk Assessment" />
              <Tab label="History" />
              <Tab label="Trends" />
            </Tabs>
            
            <Box>
              {tab === 0 && <OverviewTab client={currentClient} />}
              {tab === 1 && <ContractsTab clientId={currentClient.id} />}
              {tab === 2 && <SLATab client={currentClient} avgSLA={avgSLA} />}
              {tab === 3 && <ComplaintsTab clientId={currentClient.id} />}
              {tab === 4 && <KPITab clientId={currentClient.id} />}
              {tab === 5 && <BordereauxTab clientId={currentClient.id} />}
              {tab === 6 && <PerformanceDashboard clientId={currentClient.id} />}
              {tab === 7 && <ClientPerformanceAnalytics clientId={currentClient.id} />}
              {tab === 8 && <ClientCommunicationHistory clientId={currentClient.id} clientName={currentClient.name} />}
              {tab === 9 && <ClientRiskAssessment clientId={currentClient.id} />}
              {tab === 10 && <HistoryTab clientId={currentClient.id} />}
              {tab === 11 && <TrendsTab clientId={currentClient.id} />}
            </Box>
          </Paper>
        </Grid>
        
        {/* Quick Actions Sidebar */}
        <Grid item xs={12} lg={3}>
          <ClientQuickActions 
            clientId={currentClient.id} 
            clientName={currentClient.name}
            onComplaintCreated={() => {
              // Refresh client data if needed
            }}
          />
        </Grid>
      </Grid>
        </>
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientDetail;
