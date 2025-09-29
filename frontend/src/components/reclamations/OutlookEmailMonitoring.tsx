import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Error,
  Schedule,
  Business,
  Refresh,
  Assignment
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface EmailMonitoringStatus {
  isActive: boolean;
  lastCheck: string;
  monitoredEmails: string[];
  recentReclamations: {
    id: string;
    fromEmail: string;
    companyName: string;
    assignedTo: string;
    createdAt: string;
  }[];
  stats: {
    totalProcessed: number;
    todayProcessed: number;
    successRate: number;
  };
}

const OutlookEmailMonitoring: React.FC = () => {
  const [status, setStatus] = useState<EmailMonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringStatus();
    const interval = setInterval(fetchMonitoringStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringStatus = async () => {
    try {
      const { data } = await LocalAPI.get('/reclamations/outlook/status');
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      await LocalAPI.post('/reclamations/outlook/check');
      await fetchMonitoringStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la vérification manuelle');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Chargement du statut de surveillance des emails...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" display="flex" alignItems="center">
          <Email sx={{ mr: 1, color: 'primary.main' }} />
          Surveillance des Emails Outlook
        </Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          onClick={handleManualCheck}
          disabled={loading}
          size="small"
        >
          {loading ? 'Vérification...' : 'Vérifier Maintenant'}
        </Button>
      </Box>

      {/* Status Alert */}
      <Alert 
        severity={status?.isActive ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        icon={status?.isActive ? <CheckCircle /> : <Error />}
      >
        <Typography variant="subtitle2">
          Surveillance des emails: {status?.isActive ? 'Active' : 'Inactive'}
        </Typography>
        <Typography variant="body2">
          Dernière vérification: {status?.lastCheck ? new Date(status.lastCheck).toLocaleString('fr-FR') : 'Jamais'}
        </Typography>
      </Alert>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Traités
                  </Typography>
                  <Typography variant="h4" component="div">
                    {status?.stats.totalProcessed || 0}
                  </Typography>
                </Box>
                <Email color="primary" sx={{ fontSize: 40 }} />
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
                    Aujourd'hui
                  </Typography>
                  <Typography variant="h4" component="div">
                    {status?.stats.todayProcessed || 0}
                  </Typography>
                </Box>
                <Schedule color="info" sx={{ fontSize: 40 }} />
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
                    Taux de Succès
                  </Typography>
                  <Typography variant="h4" component="div">
                    {status?.stats.successRate || 0}%
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monitored Emails */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Email sx={{ mr: 1 }} />
                Emails Surveillés
              </Typography>
              <List dense>
                {status?.monitoredEmails.map((email, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={email}
                      secondary="Surveillance active"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reclamations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Assignment sx={{ mr: 1 }} />
                Réclamations Récentes (Email)
              </Typography>
              {status?.recentReclamations && status.recentReclamations.length > 0 ? (
                <List dense>
                  {status.recentReclamations.map((rec, index) => (
                    <React.Fragment key={rec.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Business fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={rec.companyName}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                De: {rec.fromEmail}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Assigné à: {rec.assignedTo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(rec.createdAt).toLocaleString('fr-FR')}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label="EMAIL" 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </ListItem>
                      {index < status.recentReclamations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  Aucune réclamation récente depuis les emails
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OutlookEmailMonitoring;