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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Dashboard,
  Settings,
  People,
  Speed,
  Security,
  Refresh,
  Info
} from '@mui/icons-material';
import RealTimeSuperAdminDashboard from '../components/RealTimeSuperAdminDashboard';
import ComprehensiveSystemDashboard from '../components/ComprehensiveSystemDashboard';
import SLAConfigurationInterface from '../components/SLAConfigurationInterface';
import SystemConfigurationPanel from '../components/SystemConfigurationPanel';
import AdvancedUserManagement from '../components/AdvancedUserManagement';
import SuperAdminAlerts from '../components/analytics/SuperAdminAlerts';
import AssignmentCriteria from '../components/Workflow/AssignmentCriteria';
import TeamWorkloadConfig from '../components/Workflow/TeamWorkloadConfig';
import DocumentAssignmentManager from '../components/DocumentAssignmentManager';
import DocumentAnalyticsDashboard from '../components/analytics/DocumentAnalyticsDashboard';
import OutlookEmailMonitoring from '../components/reclamations/OutlookEmailMonitoring';
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
  const [teamRulesDialog, setTeamRulesDialog] = useState(false);

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

      {/* System Health Alert - COMMENTED OUT (Client request: too technical) */}
      {false && systemHealth?.status !== 'healthy' && (
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

      {/* Quick Stats - COMMENTED OUT (moved to Temps Réel tab) */}
      {false && (
      <Grid container spacing={3} mb={4}>
        {/* État Système Card - COMMENTED OUT (Client request: too technical) */}
        {false && (
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
        )}

        {/* Utilisateurs Card - COMMENTED OUT (Client request: not needed for bordereau tracking) */}
        {false && (
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
        )}

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

        {/* Documents Card - COMMENTED OUT (Client request: focus on bordereaux only) */}
        {false && (
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
        )}
      </Grid>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="super admin tabs">
            <Tab label="Temps Réel" />
            {/* <Tab label="Emails Outlook" /> */}
            <Tab label="Alertes Équipes" />
            <Tab label="Analytics Documents" />
            {/* <Tab label="Affectation Documents" /> */}
            {/* <Tab label="Affectation Avancée" /> */}
            {/* <Tab label="Config Équipes" /> */}
            {/* <Tab label="Dashboard Système" /> */}
            {/* <Tab label="Configuration SLA" /> */}
            {/* <Tab label="Configuration Système" /> */}
            <Tab label="Gestion Utilisateurs" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <RealTimeSuperAdminDashboard onTeamRulesClick={() => setTeamRulesDialog(true)} />
        </TabPanel>

        {/* <TabPanel value={activeTab} index={1}>
          <OutlookEmailMonitoring />
        </TabPanel> */}

        <TabPanel value={activeTab} index={1}>
          <SuperAdminAlerts />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <DocumentAnalyticsDashboard />
        </TabPanel>

        {/* <TabPanel value={activeTab} index={2}>
          <DocumentAssignmentManager />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <AssignmentCriteria />
        </TabPanel> */}

        {/* <TabPanel value={activeTab} index={2}>
          <TeamWorkloadConfig />
        </TabPanel> */}

        {/* <TabPanel value={activeTab} index={3}>
          <ComprehensiveSystemDashboard />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SLAConfigurationInterface />
        </TabPanel> */}

        {/* <TabPanel value={activeTab} index={3}>
          <SystemConfigurationPanel />
        </TabPanel> */}

        <TabPanel value={activeTab} index={3}>
          <AdvancedUserManagement />
        </TabPanel>
      </Paper>

      {/* Team Rules Dialog */}
      <Dialog open={teamRulesDialog} onClose={() => setTeamRulesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="primary" />
            <Typography variant="h6">Règles de Calcul des Équipes</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
{`╔════════════════════════════════════════════════════════════════╗
║              STRUCTURE HIÉRARCHIQUE DES ÉQUIPES                ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  ÉQUIPE = Chef d'Équipe + Gestionnaires sous sa direction  │
└─────────────────────────────────────────────────────────────┘

   Chef d'Équipe (1)
        │
        ├─── Gestionnaire 1
        ├─── Gestionnaire 2
        ├─── Gestionnaire 3
        └─── Gestionnaire N
        
   = 1 ÉQUIPE (capacité totale = somme de tous)

┌─────────────────────────────────────────────────────────────┐
│  ÉQUIPE INDIVIDUELLE = Gestionnaire Senior ou Responsable   │
└─────────────────────────────────────────────────────────────┘

   Gestionnaire Senior → 1 ÉQUIPE
   Responsable Département → 1 ÉQUIPE`}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            📊 Calcul de la Charge de Travail (BASÉ SUR LE TEMPS)
          </Typography>
          <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
              <strong>Formule:</strong> Taux d'Utilisation = (Charge Requise par Jour / Capacité Totale) × 100
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              Où: Charge Requise par Jour = Σ (1 / jours restants avant deadline)
            </Typography>
          </Box>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Exemple pour une équipe Chef d'Équipe:
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
{`Chef: 3 docs (2j, 5j, 10j restants), Capacité: 1.0
Membre 1: 2 docs (1j, 3j restants), Capacité: 1.0  
Membre 2: 1 doc (7j restants), Capacité: 1.0

Charge Chef = 1/2 + 1/5 + 1/10 = 0.5 + 0.2 + 0.1 = 0.8
Charge Membre 1 = 1/1 + 1/3 = 1.0 + 0.33 = 1.33
Charge Membre 2 = 1/7 = 0.14

Charge Totale = 0.8 + 1.33 + 0.14 = 2.27 par jour
Capacité Totale = 1.0 + 1.0 + 1.0 = 3.0
Taux = (2.27 / 3.0) × 100 = 76% → 🟠 OCCUPÉ`}
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Le calcul utilise le <strong>délai de règlement (delaiReglement)</strong> du contrat 
              pour calculer les jours restants avant deadline. Les documents urgents (peu de jours restants) ont plus de poids.
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            🚦 Seuils d'Alerte
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🟢</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>NORMAL</Typography>
                <Typography variant="body2">Utilisation &lt; 70%</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🟠</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>OCCUPÉ</Typography>
                <Typography variant="body2">Utilisation 70% - 89%</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#ffebee', borderRadius: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>🔴</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>SURCHARGÉ</Typography>
                <Typography variant="body2">Utilisation ≥ 90%</Typography>
              </Box>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> La charge de travail est calculée en temps réel en fonction des documents assignés, 
              en tenant compte du <strong>délai de règlement</strong> et du <strong>temps restant</strong> avant deadline.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamRulesDialog(false)} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminDashboard;