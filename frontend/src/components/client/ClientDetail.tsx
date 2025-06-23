import React, { useState, useEffect } from 'react';
import { Client } from '../../types/client.d';
import { Tabs, Tab, Box, Paper, Grid, Typography, Button, Snackbar, Alert, Card, CardContent, Link as MuiLink } from '@mui/material';
import OverviewTab from './ClientTabs/OverviewTab';
import ContractsTab from './ClientTabs/ContractsTab';
import SLATab from './ClientTabs/SLATab';
import ComplaintsTab from './ClientTabs/ComplaintsTab';
import KPITab from './ClientTabs/KPITab';
import BordereauxTab from './ClientTabs/BordereauxTab';
import HistoryTab from './ClientTabs/HistoryTab';
import TrendsTab from './ClientTabs/TrendsTab';
import { syncExternalClient, fetchClientById, fetchClientAIRecommendations } from '../../services/clientService';

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
  { label: 'History', anchor: 'history' },
  { label: 'Trends', anchor: 'trends' },
];

const ClientDetail: React.FC<Props> = ({ client }) => {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [currentClient, setCurrentClient] = useState<Client>(client);
  const [syncing, setSyncing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  // Summary counts (fallback to 0 if undefined)
  const contractsCount = currentClient.contracts?.length ?? 0;
  const bordereauxCount = currentClient.bordereaux?.length ?? 0;
  const complaintsCount = currentClient.reclamations?.length ?? 0;

  useEffect(() => {
    const fetchAI = async () => {
      try {
        const res = await fetchClientAIRecommendations(currentClient.id);
        setAiRecommendation(res.recommendation);
      } catch {
        setAiRecommendation(null);
      }
    };
    fetchAI();
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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>{currentClient.name}</Typography>
      {/* Feature Summary Section */}
      <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Features & Quick Navigation:</Typography>
          <Grid container spacing={1}>
            {featureList.map((f, idx) => (
              <Grid item key={f.anchor}>
                <MuiLink
                  component="button"
                  variant="body2"
                  onClick={() => setTab(idx)}
                  underline="hover"
                  aria-label={`Go to ${f.label}`}
                >
                  {f.label}
                </MuiLink>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
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
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', minWidth: 140 }}>
            <Typography variant="subtitle2" color="primary">Bordereaux</Typography>
            <Typography variant="h6">{bordereauxCount}</Typography>
          </Paper>
        </Grid>
        <Grid item>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', minWidth: 140 }}>
            <Typography variant="subtitle2" color="success.main">Complaints</Typography>
            <Typography variant="h6">{complaintsCount}</Typography>
          </Paper>
        </Grid>
        <Grid item>
          <Paper sx={{ p: 2, bgcolor: '#fffde7', minWidth: 140 }}>
            <Typography variant="subtitle2" color="warning.main">Contracts</Typography>
            <Typography variant="h6">{contractsCount}</Typography>
          </Paper>
        </Grid>
      </Grid>
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
        <Tab label="History" />
        <Tab label="Trends" />
      </Tabs>
      <Box>
        {tab === 0 && <OverviewTab client={currentClient} />}
        {tab === 1 && <ContractsTab clientId={currentClient.id} />}
        {tab === 2 && <SLATab client={currentClient} />}
        {tab === 3 && <ComplaintsTab clientId={currentClient.id} />}
        {tab === 4 && <KPITab clientId={currentClient.id} />}
        {tab === 5 && <BordereauxTab clientId={currentClient.id} />}
        {tab === 6 && <HistoryTab clientId={currentClient.id} />}
        {tab === 7 && <TrendsTab clientId={currentClient.id} />}
      </Box>
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
    </Paper>
  );
};

export default ClientDetail;
