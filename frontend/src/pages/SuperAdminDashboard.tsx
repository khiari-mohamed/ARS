import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Dashboard,
  Settings,
  People,
  Speed,
  Security,
  Refresh
} from '@mui/icons-material';
import ConsolidatedSystemDashboard from '../components/ConsolidatedSystemDashboard';
import SLAConfigurationInterface from '../components/SLAConfigurationInterface';
import SystemConfigurationPanel from '../components/SystemConfigurationPanel';
import AdvancedUserManagement from '../components/AdvancedUserManagement';
import { fetchSystemHealth, fetchSystemStats } from '../services/superAdminService';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [health, stats] = await Promise.all([
        fetchSystemHealth(),
        fetchSystemStats()
      ]);
      setSystemHealth(health);
      setSystemStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Interface Super Admin
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
            sx={{ minWidth: 140 }}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* System Health Alert */}
      {systemHealth?.status !== 'healthy' && (
        <Alert 
          severity={systemHealth?.status === 'critical' ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2">
            Attention: Système en état {systemHealth?.status === 'critical' ? 'critique' : 'de vigilance'}
          </Typography>
          <Typography variant="body2">
            CPU: {systemHealth?.cpuUsage?.toFixed(1)}% | 
            Mémoire: {systemHealth?.memoryUsage?.toFixed(1)}% | 
            Disque: {systemHealth?.diskUsage?.toFixed(1)}%
          </Typography>
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    État Système
                  </Typography>
                  <Chip
                    label={systemHealth?.status || 'unknown'}
                    color={getHealthColor(systemHealth?.status) as any}
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Uptime: {formatUptime(systemHealth?.uptime || 0)}
                  </Typography>
                </Box>
                <Dashboard color={getHealthColor(systemHealth?.status) as any} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Utilisateurs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemStats?.users?.total || 0}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {systemStats?.users?.active || 0} actifs
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Bordereaux
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemStats?.bordereaux?.total || 0}
                  </Typography>
                  <Typography variant="caption" color="info.main">
                    {systemStats?.bordereaux?.processing || 0} en cours
                  </Typography>
                </Box>
                <Speed color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Documents
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemStats?.documents?.total || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total traités
                  </Typography>
                </Box>
                <Security color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="super admin tabs">
            <Tab label="Dashboard Système" />
            <Tab label="Configuration SLA" />
            <Tab label="Configuration Système" />
            <Tab label="Gestion Utilisateurs" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <ConsolidatedSystemDashboard />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <SLAConfigurationInterface />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <SystemConfigurationPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <AdvancedUserManagement />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SuperAdminDashboard;