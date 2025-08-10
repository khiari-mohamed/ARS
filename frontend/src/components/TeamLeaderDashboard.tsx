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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Assignment,
  Analytics,
  Warning,
  TrendingUp,
  People,
  Settings,
  Refresh
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import AssignmentRulesManager from './AssignmentRulesManager';
import TeamPerformanceAnalytics from './TeamPerformanceAnalytics';
import EscalationManager from './EscalationManager';
import WorkloadBalancer from './WorkloadBalancer';
import { fetchTeamMetrics, fetchEscalationCases, rebalanceWorkload } from '../services/teamLeaderService';

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
      id={`team-tabpanel-${index}`}
      aria-labelledby={`team-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeamLeaderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [teamMetrics, setTeamMetrics] = useState<any>(null);
  const [escalationCases, setEscalationCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebalanceDialogOpen, setRebalanceDialogOpen] = useState(false);
  const [rebalanceResults, setRebalanceResults] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metrics, escalations] = await Promise.all([
        fetchTeamMetrics(),
        fetchEscalationCases()
      ]);
      setTeamMetrics(metrics);
      setEscalationCases(escalations);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRebalanceWorkload = async () => {
    try {
      const results = await rebalanceWorkload();
      setRebalanceResults(results);
      setRebalanceDialogOpen(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Workload rebalancing failed:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
          Interface Chef d'Équipe
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Assignment />}
            onClick={handleRebalanceWorkload}
            sx={{ minWidth: 140 }}
          >
            Rééquilibrer
          </Button>
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

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Membres d'Équipe
                  </Typography>
                  <Typography variant="h4" component="div">
                    {teamMetrics?.memberCount || 0}
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
                    Efficacité Équipe
                  </Typography>
                  <Typography variant="h4" component="div">
                    {((teamMetrics?.efficiency || 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
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
                    Escalations Actives
                  </Typography>
                  <Typography variant="h4" component="div">
                    {escalationCases.filter(e => e.status === 'PENDING').length}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
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
                    Charge Moyenne
                  </Typography>
                  <Typography variant="h4" component="div">
                    {teamMetrics?.avgWorkload?.toFixed(1) || '0.0'}
                  </Typography>
                </Box>
                <Analytics color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="team leader tabs">
            <Tab label="Vue d'Ensemble" />
            <Tab label="Règles d'Affectation" />
            <Tab label="Analytics Équipe" />
            <Tab label="Gestion Escalations" />
            <Tab label="Équilibrage Charge" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Overview Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Équipe (7 derniers jours)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={teamMetrics?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="efficiency" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="processed" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Charge de Travail par Membre
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamMetrics?.memberWorkloads || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="workload" fill="#8884d8" />
                    <Bar dataKey="capacity" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Escalations Récentes
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Bordereau</TableCell>
                        <TableCell>Règle</TableCell>
                        <TableCell>Déclenché</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {escalationCases.slice(0, 5).map((escalation) => (
                        <TableRow key={escalation.id}>
                          <TableCell>{escalation.bordereauId}</TableCell>
                          <TableCell>{escalation.ruleId}</TableCell>
                          <TableCell>
                            {new Date(escalation.triggeredAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={escalation.status}
                              color={escalation.status === 'PENDING' ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <Settings />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <AssignmentRulesManager />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <TeamPerformanceAnalytics />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <EscalationManager />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <WorkloadBalancer />
        </TabPanel>
      </Paper>

      {/* Rebalance Results Dialog */}
      <Dialog open={rebalanceDialogOpen} onClose={() => setRebalanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Résultats du Rééquilibrage</DialogTitle>
        <DialogContent>
          {rebalanceResults && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {rebalanceResults.length} réaffectations effectuées
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bordereau</TableCell>
                      <TableCell>De</TableCell>
                      <TableCell>Vers</TableCell>
                      <TableCell>Raison</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rebalanceResults.map((result: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{result.bordereauId}</TableCell>
                        <TableCell>{result.fromUserId}</TableCell>
                        <TableCell>{result.toUserId}</TableCell>
                        <TableCell>{result.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRebalanceDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamLeaderDashboard;