import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  FilterList,
  Download,
  Notifications,
  Warning,
  TrendingUp,
  Assessment,
  Settings,
  Psychology,
  Speed,
  Timeline
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Import existing components
import AlertCard from './AlertCard';
import DelayPredictionPanel from './DelayPredictionPanel';
import TeamOverloadPanel from './TeamOverloadPanel';
import AlertsKPICards from './AlertsKPICards';
import AlertsCharts from './AlertsCharts';
import PriorityList from './PriorityList';
import ReclamationAlerts from './ReclamationAlerts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComprehensiveAlertsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [filterDialog, setFilterDialog] = useState(false);
  const [filters, setFilters] = useState({
    teamId: '',
    userId: '',
    clientId: '',
    fromDate: '',
    toDate: '',
    alertLevel: ''
  });
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const queryClient = useQueryClient();

  // API calls
  const { data: alertsDashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['alerts-dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await axios.get(`/api/alerts/dashboard?${params}`);
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 30000 : false
  });

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['alerts-kpi'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/kpi');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 60000 : false
  });

  const { data: delayPredictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['delay-predictions'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/delay-predictions');
      return response.data;
    },
    refetchInterval: 300000 // 5 minutes
  });

  const { data: teamOverload, isLoading: overloadLoading } = useQuery({
    queryKey: ['team-overload'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/team-overload');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 120000 : false
  });

  const { data: priorityList, isLoading: priorityLoading } = useQuery({
    queryKey: ['priority-list'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/priority-list');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 60000 : false
  });

  const { data: reclamationAlerts, isLoading: reclamationsLoading } = useQuery({
    queryKey: ['reclamation-alerts'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/reclamations');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 30000 : false
  });

  const { data: financeAlerts, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-alerts'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/finance');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 60000 : false
  });

  const { data: realTimeAlerts, isLoading: realTimeLoading } = useQuery({
    queryKey: ['realtime-alerts'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/realtime');
      return response.data;
    },
    refetchInterval: realTimeEnabled ? 5000 : false,
    enabled: realTimeEnabled
  });

  const { data: escalationRules } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/escalation/rules');
      return response.data;
    }
  });

  const { data: escalationMetrics } = useQuery({
    queryKey: ['escalation-metrics'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/escalation/metrics');
      return response.data;
    }
  });

  const { data: notificationChannels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/notifications/channels');
      return response.data;
    }
  });

  const { data: alertAnalytics } = useQuery({
    queryKey: ['alert-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/analytics/effectiveness');
      return response.data;
    }
  });

  const { data: comparativeAnalytics } = useQuery({
    queryKey: ['comparative-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/alerts/comparative-analytics');
      return response.data;
    }
  });

  // Export functionality
  const exportMutation = useMutation({
    mutationFn: async (format: 'pdf' | 'excel') => {
      const response = await axios.get(`/api/alerts/export?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (data, format) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alerts-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFilterApply = () => {
    setFilterDialog(false);
    refetchDashboard();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const getCriticalAlertsCount = () => {
    if (!alertsDashboard) return 0;
    return alertsDashboard.filter((alert: any) => alert.alertLevel === 'red').length;
  };

  const getWarningAlertsCount = () => {
    if (!alertsDashboard) return 0;
    return alertsDashboard.filter((alert: any) => alert.alertLevel === 'orange').length;
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Tableau de Bord des Alertes IA
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Actualiser">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtres">
            <IconButton onClick={() => setFilterDialog(true)} color="primary">
              <FilterList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter PDF">
            <IconButton onClick={() => exportMutation.mutate('pdf')} color="primary">
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title={realTimeEnabled ? "Désactiver temps réel" : "Activer temps réel"}>
            <IconButton 
              onClick={() => setRealTimeEnabled(!realTimeEnabled)} 
              color={realTimeEnabled ? "success" : "default"}
            >
              <Badge badgeContent={realTimeEnabled ? "ON" : "OFF"} color={realTimeEnabled ? "success" : "error"}>
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Real-time alerts banner */}
      {realTimeEnabled && realTimeAlerts && realTimeAlerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            🚨 {realTimeAlerts.length} nouvelle(s) alerte(s) en temps réel
          </Typography>
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="error" />
                <Typography variant="h6">Alertes Critiques</Typography>
              </Box>
              <Typography variant="h3" color="error">
                {getCriticalAlertsCount()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="warning" />
                <Typography variant="h6">Alertes d'Attention</Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {getWarningAlertsCount()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Psychology color="primary" />
                <Typography variant="h6">Prédictions IA</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {delayPredictions?.next_week_prediction || 0}
              </Typography>
              <Typography variant="caption">
                bordereaux prévus
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Speed color="success" />
                <Typography variant="h6">SLA Compliance</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {kpiData?.slaCompliance || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="alert tabs">
          <Tab label="Vue d'Ensemble" icon={<Assessment />} />
          <Tab label="Alertes SLA" icon={<Warning />} />
          <Tab label="Prédictions IA" icon={<Psychology />} />
          <Tab label="Surcharge Équipes" icon={<TrendingUp />} />
          <Tab label="Réclamations" icon={<Notifications />} />
          <Tab label="Finance" icon={<Timeline />} />
          <Tab label="Escalations" icon={<Settings />} />
          <Tab label="Analytics" icon={<Assessment />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alertes Récentes
                </Typography>
                {dashboardLoading ? (
                  <CircularProgress />
                ) : (
                  <Box maxHeight={400} overflow="auto">
                    {alertsDashboard?.slice(0, 10).map((alert: any, index: number) => (
                      <AlertCard key={index} alert={alert} onResolved={refetchDashboard} />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <DelayPredictionPanel prediction={delayPredictions} />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <PriorityList alerts={priorityList} loading={priorityLoading} />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DelayPredictionPanel prediction={delayPredictions} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analytics Comparatives
                </Typography>
                {comparativeAnalytics && (
                  <Box>
                    <Typography variant="body1">
                      Planifié: {comparativeAnalytics.planned}
                    </Typography>
                    <Typography variant="body1">
                      Réalisé: {comparativeAnalytics.actual}
                    </Typography>
                    <Typography variant="body1" color={comparativeAnalytics.gap > 0 ? 'success.main' : 'error.main'}>
                      Écart: {comparativeAnalytics.gap}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <TeamOverloadPanel data={teamOverload} loading={overloadLoading} />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <ReclamationAlerts data={reclamationAlerts} loading={reclamationsLoading} />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alertes Finance (24h)
            </Typography>
            {financeLoading ? (
              <CircularProgress />
            ) : (
              <Box>
                {financeAlerts?.map((alert: any, index: number) => (
                  <Alert key={index} severity="error" sx={{ mb: 1 }}>
                    {alert.reason} - Bordereau #{alert.bordereau.id}
                  </Alert>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Règles d'Escalation
                </Typography>
                {escalationRules?.map((rule: any, index: number) => (
                  <Chip key={index} label={rule.name} sx={{ mr: 1, mb: 1 }} />
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Métriques d'Escalation
                </Typography>
                {escalationMetrics && (
                  <Box>
                    <Typography>Total: {escalationMetrics.totalEscalations}</Typography>
                    <Typography>Résolues: {escalationMetrics.resolvedEscalations}</Typography>
                    <Typography>Taux de succès: {escalationMetrics.successRate}%</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={7}>
        <AlertsCharts data={kpiData} loading={kpiLoading} />
      </TabPanel>

      {/* Filter Dialog */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtres des Alertes</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID Équipe"
                value={filters.teamId}
                onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID Utilisateur"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID Client"
                value={filters.clientId}
                onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Niveau d'Alerte</InputLabel>
                <Select
                  value={filters.alertLevel}
                  onChange={(e) => setFilters({ ...filters, alertLevel: e.target.value })}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="red">Critique</MenuItem>
                  <MenuItem value="orange">Attention</MenuItem>
                  <MenuItem value="green">Normal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de fin"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleFilterApply}>
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComprehensiveAlertsDashboard;