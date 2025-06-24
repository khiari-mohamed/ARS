import React, { useState } from 'react';
import {
  useAlertsDashboard,
  useDelayPredictions,
  useComparativeAnalytics,
  usePriorityList,
  useTeamOverloadAlerts,
  useReclamationAlerts,
} from '../../hooks/useAlertsQuery';
import { AlertsDashboardQuery } from '../../types/alerts.d';
import AlertCard from '../../components/analytics/AlertCard';
import AlertHistory from '../../components/analytics/AlertHistory';
import TeamOverloadPanel from '../../components/analytics/TeamOverloadPanel';
import ReclamationAlerts from '../../components/analytics/ReclamationAlerts';
import PriorityList from '../../components/analytics/PriorityList';
import AlertComparativeAnalytics from '../../components/analytics/AlertComparativeAnalytics';
import DelayPredictionPanel from '../../components/analytics/DelayPredictionPanel';
import AlertFilters from '../../components/analytics/AlertFilters';
import { Box, Typography, Grid, Divider, Button, CircularProgress, Alert as MuiAlert } from '@mui/material';
import { exportAlertsToCSV } from '../../utils/exportAlerts';
import { useNotification } from '../../contexts/NotificationContext';

const AlertsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<AlertsDashboardQuery>({});
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

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Tableau de bord des alertes
      </Typography>
      <AlertFilters filters={filters} setFilters={setFilters} />
      <Box mb={2}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportAlerts}
          disabled={!alerts || alerts.length === 0}
        >
          Exporter les alertes (CSV)
        </Button>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6">Alertes actives</Typography>
          {loadingAlerts && <CircularProgress size={24} />}
          {errorAlerts && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement des alertes : {errorAlerts.message}
            </MuiAlert>
          )}
          {!loadingAlerts && !errorAlerts && (!alerts || alerts.length === 0) && (
            <Typography>Aucune alerte active.</Typography>
          )}
          {alerts?.map((alert) => (
            <AlertCard key={alert.bordereau.id} alert={alert} onResolved={handleAlertResolved} />
          ))}
        </Grid>
        <Grid item xs={12} md={4}>
          {loadingPrediction && <CircularProgress size={20} />}
          {errorPrediction && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement de la prédiction IA : {errorPrediction.message}
            </MuiAlert>
          )}
          <DelayPredictionPanel prediction={delayPrediction} />
          {loadingComparative && <CircularProgress size={20} />}
          {errorComparative && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement des statistiques comparatives : {errorComparative.message}
            </MuiAlert>
          )}
          <AlertComparativeAnalytics payload={comparativeAnalytics} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {loadingOverload && <CircularProgress size={20} />}
          {errorOverload && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement des surcharges équipe : {errorOverload.message}
            </MuiAlert>
          )}
          <TeamOverloadPanel overloads={teamOverload} />
        </Grid>
        <Grid item xs={12} md={6}>
          {loadingReclamations && <CircularProgress size={20} />}
          {errorReclamations && (
            <MuiAlert severity="error" sx={{ my: 1 }}>
              Erreur lors du chargement des réclamations : {errorReclamations.message}
            </MuiAlert>
          )}
          <ReclamationAlerts reclamations={reclamations} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      {loadingPriority && <CircularProgress size={20} />}
      {errorPriority && (
        <MuiAlert severity="error" sx={{ my: 1 }}>
          Erreur lors du chargement des bordereaux prioritaires : {errorPriority.message}
        </MuiAlert>
      )}
      <PriorityList items={priorityList} />
      <Divider sx={{ my: 2 }} />
      <AlertHistory />
    </Box>
  );
};

export default AlertsDashboard;