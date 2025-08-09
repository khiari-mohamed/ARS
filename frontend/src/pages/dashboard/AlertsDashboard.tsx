import React, { useState } from 'react';
import {
  useAlertsDashboard,
  useDelayPredictions,
  useComparativeAnalytics,
  usePriorityList,
  useTeamOverloadAlerts,
  useReclamationAlerts,
} from '../../hooks/useAlertsQuery';
import { useAlertsKPI, useRealTimeAlerts } from '../../hooks/useAlertsKPI';
import { AlertsDashboardQuery } from '../../types/alerts.d';
import AlertCard from '../../components/analytics/AlertCard';
import AlertHistory from '../../components/analytics/AlertHistory';
import TeamOverloadPanel from '../../components/analytics/TeamOverloadPanel';
import ReclamationAlerts from '../../components/analytics/ReclamationAlerts';
import PriorityList from '../../components/analytics/PriorityList';
import AlertComparativeAnalytics from '../../components/analytics/AlertComparativeAnalytics';
import DelayPredictionPanel from '../../components/analytics/DelayPredictionPanel';
import AlertFilters from '../../components/analytics/AlertFilters';
import AlertsKPICards from '../../components/analytics/AlertsKPICards';
import AlertsCharts from '../../components/analytics/AlertsCharts';
import AlertsMobileView from '../../components/analytics/AlertsMobileView';
import RoleBasedAlerts from '../../components/analytics/RoleBasedAlerts';
import AlertsLayout from '../../components/analytics/AlertsLayout';
import { Box, Typography, Grid, Divider, Button, CircularProgress, Alert as MuiAlert, useTheme, useMediaQuery } from '@mui/material';
import { exportAlertsToCSV } from '../../utils/exportAlerts';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const AlertsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AlertsDashboardQuery>({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const {
    data: alerts,
    isLoading: loadingAlerts,
    error: errorAlerts,
  } = useAlertsDashboard(filters);
  const {
    data: delayPrediction,
    isLoading: loadingPrediction,
    error: errorPrediction,
  } = useDelayPredictions();
  const {
    data: comparativeAnalytics,
    isLoading: loadingComparative,
    error: errorComparative,
  } = useComparativeAnalytics();
  const {
    data: priorityList,
    isLoading: loadingPriority,
    error: errorPriority,
  } = usePriorityList();
  const {
    data: teamOverload,
    isLoading: loadingOverload,
    error: errorOverload,
  } = useTeamOverloadAlerts();
  const {
    data: reclamations,
    isLoading: loadingReclamations,
    error: errorReclamations,
  } = useReclamationAlerts();

  // Real-time KPI data
  const {
    data: kpiData,
    isLoading: loadingKPI,
    error: errorKPI,
  } = useAlertsKPI();

  const {
    data: realTimeAlerts,
    isLoading: loadingRealTime,
  } = useRealTimeAlerts();

  const { notify } = useNotification();

  // Export CSV handler with notification
  const handleExportAlerts = () => {
    if (alerts && alerts.length > 0) {
      exportAlertsToCSV(alerts);
      notify('Export CSV effectué avec succès !', 'success');
    } else {
      notify('Aucune alerte à exporter.', 'info');
    }
  };

  // Handler to show notification after alert resolution (passed to AlertCard)
  const handleAlertResolved = () => {
    notify('Alerte marquée comme résolue !', 'success');
  };

  // Role-based filtering
  const getFilteredAlerts = () => {
    if (!alerts) return [];
    if (user?.role === 'GESTIONNAIRE') {
      return alerts.filter((alert: any) => alert.bordereau.userId === user.id);
    }
    if (user?.role === 'CHEF_EQUIPE') {
      return alerts.filter((alert: any) => alert.bordereau.teamId === user.id);
    }
    return alerts; // SUPER_ADMIN sees all
  };

  const filteredAlerts = getFilteredAlerts();

  // Mobile view handler
  if (isMobile) {
    return (
      <RoleBasedAlerts>
        <AlertsLayout>
          <AlertsMobileView 
            alerts={filteredAlerts} 
            kpiData={kpiData}
            onResolve={handleAlertResolved}
          />
        </AlertsLayout>
      </RoleBasedAlerts>
    );
  }

  return (
    <RoleBasedAlerts>
      <AlertsLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tableau de bord des alertes
          {user?.role !== 'SUPER_ADMIN' && (
            <Typography variant="subtitle1" color="text.secondary">
              Vue {user?.role === 'CHEF_EQUIPE' ? 'Équipe' : 'Personnelle'}
            </Typography>
          )}
        </Typography>
      </Box>
      
      {/* KPI Cards Section */}
      <Box sx={{ px: 3 }}>
        <AlertsKPICards data={kpiData} loading={loadingKPI} />
      </Box>
      
      {/* Charts Section */}
      <Box sx={{ px: 3 }}>
        <AlertsCharts data={kpiData} loading={loadingKPI} />
      </Box>
      <Box sx={{ px: 3 }}>
        <AlertFilters filters={filters} setFilters={setFilters} />
      </Box>
      <Box sx={{ px: 3, mb: 2 }}>
        <>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleExportAlerts}
            disabled={!filteredAlerts || filteredAlerts.length === 0}
          >
            Exporter les alertes (CSV)
          </Button>
          {errorKPI && (
            <MuiAlert severity="warning" sx={{ mt: 1 }}>
              Erreur lors du chargement des KPI temps réel
            </MuiAlert>
          )}
        </>
      </Box>
      <Box sx={{ px: 3 }}>
        <Divider sx={{ my: 2 }} />
      </Box>
      <Box sx={{ px: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6">Alertes actives</Typography>
            {loadingAlerts && <CircularProgress size={24} />}
            {errorAlerts && (
              <MuiAlert severity="error" sx={{ my: 1 }}>
                Erreur lors du chargement des alertes : {(errorAlerts as any)?.message || 'Erreur inconnue'}
              </MuiAlert>
            )}
            {!loadingAlerts && !errorAlerts && (!filteredAlerts || filteredAlerts.length === 0) && (
              <Typography>Aucune alerte active.</Typography>
            )}
            {realTimeAlerts && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="caption" color="info.contrastText">
                  🔴 Mise à jour temps réel: {realTimeAlerts.length} nouvelles alertes
                </Typography>
              </Box>
            )}
            {filteredAlerts?.map((alert: any) => (
              <AlertCard key={alert.bordereau.id} alert={alert} onResolved={handleAlertResolved} />
            ))}
          </Grid>
        <Grid item xs={12} md={4}>
          <>
            {loadingPrediction && <CircularProgress size={20} />}
            {errorPrediction && (
              <MuiAlert severity="error" sx={{ my: 1 }}>
                Erreur lors du chargement de la prédiction IA : {(errorPrediction as any)?.message || 'Erreur inconnue'}
              </MuiAlert>
            )}
            <DelayPredictionPanel prediction={delayPrediction} />
            {loadingComparative && <CircularProgress size={20} />}
            {errorComparative && (
              <MuiAlert severity="error" sx={{ my: 1 }}>
                Erreur lors du chargement des statistiques comparatives : {(errorComparative as any)?.message || 'Erreur inconnue'}
              </MuiAlert>
            )}
            <AlertComparativeAnalytics payload={comparativeAnalytics} />
          </>
        </Grid>
        </Grid>
      </Box>
      <Box sx={{ px: 3 }}>
        <Divider sx={{ my: 2 }} />
      </Box>
      <Box sx={{ px: 3 }}>
        <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <>
            {loadingOverload && <CircularProgress size={20} />}
            {errorOverload && (
              <MuiAlert severity="error" sx={{ my: 1 }}>
                Erreur lors du chargement des surcharges équipe : {(errorOverload as any)?.message || 'Erreur inconnue'}
              </MuiAlert>
            )}
            <TeamOverloadPanel overloads={teamOverload} />
          </>
        </Grid>
        <Grid item xs={12} md={6}>
          <>
            {loadingReclamations && <CircularProgress size={20} />}
            {errorReclamations && (
              <MuiAlert severity="error" sx={{ my: 1 }}>
                Erreur lors du chargement des réclamations : {(errorReclamations as any)?.message || 'Erreur inconnue'}
              </MuiAlert>
            )}
            <ReclamationAlerts reclamations={reclamations} />
          </>
        </Grid>
        </Grid>
      </Box>
      <Box sx={{ px: 3 }}>
        <Divider sx={{ my: 2 }} />
      </Box>
      <Box sx={{ px: 3 }}>
        <>
          {loadingPriority && <CircularProgress size={20} />}
          {errorPriority && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement des bordereaux prioritaires : {(errorPriority as any)?.message || 'Erreur inconnue'}
            </MuiAlert>
          )}
          <PriorityList items={priorityList || []} />
        </>
      </Box>
      <Box sx={{ px: 3 }}>
        <Divider sx={{ my: 2 }} />
      </Box>
      <Box sx={{ px: 3 }}>
        <AlertHistory />
      </Box>
      </AlertsLayout>
    </RoleBasedAlerts>
  );
};

export default AlertsDashboard;