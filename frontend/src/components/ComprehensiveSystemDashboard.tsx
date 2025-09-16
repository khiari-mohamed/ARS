import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Dashboard,
  Warning,
  CheckCircle,
  Error,
  Speed,
  People,
  Assignment,
  Refresh
} from '@mui/icons-material';
import { LocalAPI } from '../services/axios';

interface SystemOverview {
  bo: {
    todayEntries: number;
    pendingEntries: number;
    totalEntries: number;
    avgProcessingTime: number;
    status: string;
  };
  scan: {
    pendingScan: number;
    scanningInProgress: number;
    processedToday: number;
    errorCount: number;
    totalQueue: number;
    status: string;
  };
  teams: {
    totalTeams: number;
    overloadedTeams: number;
    busyTeams: number;
    normalTeams: number;
    teams: Array<{
      id: string;
      name: string;
      totalWorkload: number;
      status: string;
    }>;
  };
  gestionnaires: {
    totalGestionnaires: number;
    overloadedGestionnaires: number;
    busyGestionnaires: number;
    normalGestionnaires: number;
    gestionnaires: Array<{
      id: string;
      name: string;
      workload: number;
      status: string;
    }>;
  };
  workflow: {
    statusDistribution: Record<string, number>;
    totalActive: number;
    bottlenecks: string[];
  };
  sla: {
    atRisk: number;
    overdue: number;
    critical: number;
    complianceRate: number;
    status: string;
  };
  alerts: {
    totalAlerts: number;
    criticalAlerts: number;
    unresolvedAlerts: number;
    status: string;
  };
}

const ComprehensiveSystemDashboard: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setError(null);
      const { data } = await LocalAPI.get('/super-admin/system-overview');
      setSystemData(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': case 'GOOD': return 'success';
      case 'BUSY': case 'WARNING': return 'warning';
      case 'OVERLOADED': case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NORMAL': case 'GOOD': return <CheckCircle color="success" />;
      case 'BUSY': case 'WARNING': return <Warning color="warning" />;
      case 'OVERLOADED': case 'CRITICAL': return <Error color="error" />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error || !systemData) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Erreur de chargement</Typography>
        <Typography>{error || 'Données système indisponibles'}</Typography>
        <Button variant="outlined" onClick={loadSystemData} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Vue d'ensemble système complète
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadSystemData}
        >
          Actualiser
        </Button>
      </Box>

      {/* Critical Alerts */}
      {(systemData.sla.status === 'CRITICAL' || systemData.alerts.status === 'CRITICAL') && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            🚨 Attention Critique Requise
          </Typography>
          {systemData.sla.critical > 0 && (
            <Typography variant="body2">
              • {systemData.sla.critical} bordereaux en dépassement SLA critique
            </Typography>
          )}
          {systemData.alerts.criticalAlerts > 0 && (
            <Typography variant="body2">
              • {systemData.alerts.criticalAlerts} alertes critiques non résolues
            </Typography>
          )}
        </Alert>
      )}

      {/* System Status Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Bureau d'Ordre
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemData.bo.pendingEntries}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    en attente (Total: {systemData.bo.totalEntries})
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={systemData.bo.status}
                      color={getStatusColor(systemData.bo.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                {getStatusIcon(systemData.bo.status)}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Service SCAN
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemData.scan.pendingScan}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    à scanner (Erreurs: {systemData.scan.errorCount})
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={systemData.scan.status}
                      color={getStatusColor(systemData.scan.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                {getStatusIcon(systemData.scan.status)}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Conformité SLA
                  </Typography>
                  <Typography variant="h4" component="div">
                    {systemData.sla.complianceRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    taux de conformité (À risque: {systemData.sla.atRisk})
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={systemData.sla.status}
                      color={getStatusColor(systemData.sla.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                {getStatusIcon(systemData.sla.status)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Views */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Équipes" />
            <Tab label="Gestionnaires" />
            <Tab label="Workflow" />
            <Tab label="Alertes SLA" />
          </Tabs>
        </Box>

        {/* Teams Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance des Équipes
            </Typography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {systemData.teams.overloadedTeams}
                    </Typography>
                    <Typography variant="body2">Surchargées</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {systemData.teams.busyTeams}
                    </Typography>
                    <Typography variant="body2">Occupées</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {systemData.teams.normalTeams}
                    </Typography>
                    <Typography variant="body2">Normales</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary.main">
                      {systemData.teams.totalTeams}
                    </Typography>
                    <Typography variant="body2">Total</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Chef d'Équipe</TableCell>
                    <TableCell>Charge de Travail</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemData.teams.teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>{team.name}</TableCell>
                      <TableCell>{team.totalWorkload || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={team.status}
                          color={getStatusColor(team.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Gestionnaires Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance des Gestionnaires
            </Typography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {systemData.gestionnaires.overloadedGestionnaires}
                    </Typography>
                    <Typography variant="body2">Surchargés</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {systemData.gestionnaires.busyGestionnaires}
                    </Typography>
                    <Typography variant="body2">Occupés</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {systemData.gestionnaires.normalGestionnaires}
                    </Typography>
                    <Typography variant="body2">Normaux</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary.main">
                      {systemData.gestionnaires.totalGestionnaires}
                    </Typography>
                    <Typography variant="body2">Total</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Gestionnaire</TableCell>
                    <TableCell>Charge de Travail</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemData.gestionnaires.gestionnaires.map((gestionnaire) => (
                    <TableRow key={gestionnaire.id}>
                      <TableCell>{gestionnaire.name}</TableCell>
                      <TableCell>{gestionnaire.workload}</TableCell>
                      <TableCell>
                        <Chip
                          label={gestionnaire.status}
                          color={getStatusColor(gestionnaire.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Workflow Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              État du Workflow
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribution par Statut
                    </Typography>
                    {Object.entries(systemData.workflow.statusDistribution).map(([status, count]) => (
                      <Box key={status} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">{status}</Typography>
                        <Chip label={count} size="small" />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Goulots d'Étranglement
                    </Typography>
                    {systemData.workflow.bottlenecks && systemData.workflow.bottlenecks.length > 0 ? (
                      systemData.workflow.bottlenecks.map((bottleneck, index) => (
                        <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                          {bottleneck === 'SCAN_QUEUE' ? 'Service SCAN - File d\'attente importante' :
                           bottleneck === 'CHEF_ASSIGNMENT' ? 'Affectation Chef - Retard d\'assignation' :
                           bottleneck === 'GESTIONNAIRE_PROCESSING' ? 'Gestionnaires - Surcharge de traitement' :
                           bottleneck === 'FINANCE_PROCESSING' ? 'Finance - Retard de virement' :
                           bottleneck}
                        </Alert>
                      ))
                    ) : (
                      systemData.scan.errorCount > 5 ? (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          Service SCAN - Erreurs multiples ({systemData.scan.errorCount} erreurs)
                        </Alert>
                      ) : (
                        <Alert severity="success">
                          Aucun goulot d'étranglement détecté
                        </Alert>
                      )
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* SLA Alerts Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Alertes SLA
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {systemData.sla.atRisk}
                    </Typography>
                    <Typography variant="body2">À Risque</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.main">
                      {systemData.sla.overdue}
                    </Typography>
                    <Typography variant="body2">En Retard</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error.dark">
                      {systemData.sla.critical}
                    </Typography>
                    <Typography variant="body2">Critiques</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ComprehensiveSystemDashboard;