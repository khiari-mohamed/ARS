import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Warning,
  Error,
  Notifications,
  People,
  Assignment,
  Refresh,
  Info
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';
import { getWorkloadPredictions } from '../../services/superAdminService';

interface OverloadAlert {
  team: {
    id: string;
    fullName: string;
    role: string;
  };
  count: number;
  alert: 'red' | 'orange';
  reason: string;
}

interface DelayPrediction {
  forecast: any[];
  trend_direction: string;
  recommendations: any[];
  ai_confidence: number;
  next_week_prediction: number;
}

const SuperAdminAlerts: React.FC = () => {
  const [overloadAlerts, setOverloadAlerts] = useState<OverloadAlert[]>([]);
  const [delayPredictions, setDelayPredictions] = useState<DelayPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<OverloadAlert | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      // Use the new team-alerts endpoint
      const response = await LocalAPI.get('/super-admin/team-alerts');
      const alertsData = response.data;

      console.log('🚨 Team Alerts:', alertsData);

      // Get team workload for display
      const teamResponse = await LocalAPI.get('/super-admin/team-workload');
      setTeamWorkload(teamResponse.data);

      // Transform alerts to overload format
      const overloadData = alertsData.alerts
        .filter((alert: any) => alert.type === 'TEAM_OVERLOAD' || alert.type === 'TEAM_BUSY')
        .map((alert: any) => ({
          team: {
            id: alert.teamId,
            fullName: alert.teamName,
            role: alert.teamName.includes('Chef') ? 'CHEF_EQUIPE' : 'GESTIONNAIRE'
          },
          count: alert.workload || 0,
          alert: alert.level === 'CRITICAL' ? 'red' : 'orange',
          reason: alert.message
        }));

      setOverloadAlerts(overloadData);
      
      // Get real workload predictions from API
      try {
        const predictions = await getWorkloadPredictions();
        setDelayPredictions({
          forecast: predictions.forecast || [],
          trend_direction: predictions.trend || 'stable',
          recommendations: predictions.recommendations || [],
          ai_confidence: predictions.confidence || 0,
          next_week_prediction: predictions.nextWeek || 0
        });
      } catch (error) {
        console.error('Failed to load predictions:', error);
        setDelayPredictions(null);
      }
    } catch (error) {
      console.error('Failed to load super admin alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (alert: OverloadAlert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };

  const getCriticalCount = () => overloadAlerts.filter(a => a.alert === 'red').length;
  const getWarningCount = () => overloadAlerts.filter(a => a.alert === 'orange').length;

  const renderOverloadCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <People color="error" />
            Surcharge des Équipes
          </Typography>
          <IconButton onClick={loadAlerts} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
              <Typography variant="h3" color="error.main">
                {getCriticalCount()}
              </Typography>
              <Typography variant="body2" color="error.dark" fontWeight={600}>
                🔴 Surchargés
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes ≥90% capacité
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
              <Typography variant="h3" color="warning.main">
                {getWarningCount()}
              </Typography>
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                🟠 Occupés
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes 70-89% capacité
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
              <Typography variant="h3" color="success.main">
                {Math.max(0, (teamWorkload?.length || 0) - overloadAlerts.length)}
              </Typography>
              <Typography variant="body2" color="success.dark" fontWeight={600}>
                🟢 Normaux
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Équipes &lt;70% capacité
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {overloadAlerts.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Équipe/Gestionnaire</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Charge</TableCell>
                  <TableCell>Niveau</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overloadAlerts.map((alert, index) => (
                  <TableRow key={index}>
                    <TableCell>{alert.team.fullName}</TableCell>
                    <TableCell>{alert.team.role}</TableCell>
                    <TableCell>{alert.count} dossiers</TableCell>
                    <TableCell>
                      <Chip
                        label={alert.alert === 'red' ? 'Critique' : 'Élevé'}
                        color={alert.alert === 'red' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewDetails(alert)}
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderPredictionsCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <Assignment color="info" />
          Prédictions IA
        </Typography>

        {delayPredictions && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={1}>
                <Typography variant="h4" color="primary.main">
                  {delayPredictions.next_week_prediction}
                </Typography>
                <Typography variant="body2">
                  Dossiers prévus (7j)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={1}>
                <Typography variant="h4" color="info.main">
                  {Math.round(delayPredictions.ai_confidence * 100)}%
                </Typography>
                <Typography variant="body2">
                  Confiance IA
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {delayPredictions?.recommendations && delayPredictions.recommendations.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" mb={1}>
              Recommandations IA:
            </Typography>
            {delayPredictions.recommendations.slice(0, 3).map((rec: any, index: number) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {rec.reasoning || rec.action || 'Recommandation disponible'}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={3} textAlign="center">
        <Typography>Chargement des alertes...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" display="flex" alignItems="center" gap={1}>
          <Warning color="error" />
          Alertes Équipes
        </Typography>
        <Chip 
          label="Règles: ≥90% Critique | 70-89% Avertissement" 
          color="info" 
          variant="outlined"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Types d'alertes surveillées:</strong> Surcharge équipe (≥90%), Équipe occupée (70-89%), 
          Files d'attente critiques, Dépassements SLA, Gestionnaires sans chef d'équipe
        </Typography>
      </Alert>

      {overloadAlerts.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body1">
            ✅ Aucune surcharge détectée - Toutes les équipes fonctionnent normalement
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderOverloadCard()}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderPredictionsCard()}
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Détails de la Surcharge
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="body1" mb={2}>
                <strong>Équipe:</strong> {selectedAlert.team.fullName}
              </Typography>
              <Typography variant="body1" mb={2}>
                <strong>Rôle:</strong> {selectedAlert.team.role}
              </Typography>
              <Typography variant="body1" mb={2}>
                <strong>Charge actuelle:</strong> {selectedAlert.count} dossiers ouverts
              </Typography>
              <Typography variant="body1" mb={2}>
                <strong>Raison:</strong> {selectedAlert.reason}
              </Typography>
              
              <Alert severity={selectedAlert.alert === 'red' ? 'error' : 'warning'} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {selectedAlert.alert === 'red' 
                    ? 'Action immédiate requise - Risque de dépassement SLA'
                    : 'Surveillance recommandée - Charge élevée détectée'
                  }
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Fermer
          </Button>
          <Button variant="contained" onClick={() => setDetailsOpen(false)}>
            Prendre des mesures
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAlerts;