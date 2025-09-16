import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, List, ListItem, ListItemIcon, ListItemText, 
  Chip, Box, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getFinanceAlerts, notifyFinanceTeam } from '../../services/financeService';

interface FinanceAlert {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data: any;
  createdAt: string;
}

const FinanceAlertsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyDialog, setNotifyDialog] = useState<{open: boolean, bordereauId?: string}>({
    open: false
  });
  const [notifyForm, setNotifyForm] = useState({
    message: ''
  });

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Get real alerts from new alerts endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/alerts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load alerts data');
      }
      
      const alertsData = await response.json();
      console.log('Loaded alerts data:', alertsData);
      
      // Transform real data into alerts
      const alerts: FinanceAlert[] = [];
      
      // Add delayed bordereaux alerts
      if (alertsData.delayedBordereaux) {
        alertsData.delayedBordereaux.forEach((bordereau: any) => {
          const delayHours = Math.floor((Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60));
          alerts.push({
            id: `delayed-${bordereau.id}`,
            type: 'BORDEREAU_DELAY',
            level: delayHours > 72 ? 'error' : 'warning',
            title: `Bordereau en retard: ${bordereau.reference}`,
            message: `Le bordereau ${bordereau.reference} de ${bordereau.client?.name || 'Client'} est en retard de ${Math.floor(delayHours / 24)} jours`,
            data: {
              bordereauId: bordereau.id,
              delayHours: delayHours,
              client: bordereau.client?.name
            },
            createdAt: bordereau.dateReception
          });
        });
      }
      
      // Add overdue virements alerts
      if (alertsData.overdueVirements) {
        alertsData.overdueVirements.forEach((virement: any) => {
          alerts.push({
            id: `overdue-${virement.id}`,
            type: 'VIREMENT_OVERDUE',
            level: 'error',
            title: `Virement non exécuté: ${virement.reference}`,
            message: `L'ordre de virement ${virement.reference} n'a pas été exécuté`,
            data: {
              virementId: virement.id,
              montant: virement.montantTotal
            },
            createdAt: virement.createdAt
          });
        });
      }
      

      
      setAlerts(alerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const handleNotifyTeam = async () => {
    if (!notifyDialog.bordereauId) return;
    
    try {
      // Send notification to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'FINANCE_ALERT',
          title: 'Alerte Finance',
          message: notifyForm.message || 'Alerte générée depuis le module Finance',
          data: {
            bordereauId: notifyDialog.bordereauId,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        setNotifyDialog({open: false});
        setNotifyForm({message: ''});
        await loadAlerts();
        alert('Notification envoyée avec succès!');
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to notify team:', error);
      alert('Erreur lors de l\'envoi de la notification');
    }
  };

  const openNotifyDialog = (bordereauId: string) => {
    setNotifyDialog({open: true, bordereauId});
    setNotifyForm({message: ''});
  };

  const formatDelay = (hours: number) => {
    if (hours < 24) return `${Math.floor(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
  };

  const getAlertPriority = (alert: FinanceAlert) => {
    if (alert.level === 'error') return 3;
    if (alert.level === 'warning') return 2;
    return 1;
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    // Sort by priority first, then by creation date
    const priorityDiff = getAlertPriority(b) - getAlertPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Box>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Alertes Finance ({alerts.length})
        </Typography>
        <Tooltip title="Actualiser">
          <IconButton onClick={loadAlerts} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Alerts Summary */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<ErrorIcon />}
            label={`${alerts.filter(a => a.level === 'error').length} Critiques`}
            color="error"
            variant={alerts.some(a => a.level === 'error') ? 'filled' : 'outlined'}
          />
          <Chip 
            icon={<WarningIcon />}
            label={`${alerts.filter(a => a.level === 'warning').length} Avertissements`}
            color="warning"
            variant={alerts.some(a => a.level === 'warning') ? 'filled' : 'outlined'}
          />
          <Chip 
            icon={<InfoIcon />}
            label={`${alerts.filter(a => a.level === 'info').length} Informations`}
            color="info"
            variant={alerts.some(a => a.level === 'info') ? 'filled' : 'outlined'}
          />
        </Box>
      </Paper>

      {/* Alerts List */}
      <Paper elevation={2} sx={{ p: 3 }}>
        {loading ? (
          <Typography>Chargement des alertes...</Typography>
        ) : alerts.length === 0 ? (
          <Alert severity="success">
            <Typography>Aucune alerte active. Tous les virements sont à jour !</Typography>
          </Alert>
        ) : sortedAlerts.length === 0 ? (
          <Alert severity="success">
            <Typography>Aucune alerte active. Tous les virements sont à jour !</Typography>
          </Alert>
        ) : (
          <List>
            {sortedAlerts.map((alert, index) => (
              <ListItem 
                key={alert.id}
                divider={index < sortedAlerts.length - 1}
                sx={{ 
                  bgcolor: alert.level === 'error' ? 'error.light' : 
                           alert.level === 'warning' ? 'warning.light' : 
                           'info.light',
                  mb: 1,
                  borderRadius: 1,
                  opacity: 0.9
                }}
              >
                <ListItemIcon>
                  {getAlertIcon(alert.level)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {alert.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {alert.data?.delayHours && (
                          <Chip 
                            label={formatDelay(alert.data.delayHours)}
                            size="small"
                            color={getAlertColor(alert.level) as any}
                          />
                        )}
                        {alert.data?.bordereauId && (
                          <Button
                            size="small"
                            startIcon={<NotificationsIcon />}
                            onClick={() => openNotifyDialog(alert.data.bordereauId)}
                            variant="outlined"
                          >
                            Notifier
                          </Button>
                        )}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(alert.createdAt).toLocaleString('fr-FR')}
                      </Typography>
                      {alert.data?.delayHours && (
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                          • Retard: {formatDelay(alert.data.delayHours)}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Notify Team Dialog */}
      <Dialog 
        open={notifyDialog.open} 
        onClose={() => setNotifyDialog({open: false})} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Notifier l'Équipe Finance</DialogTitle>
        <DialogContent>
          <TextField
            label="Message (optionnel)"
            multiline
            rows={3}
            value={notifyForm.message}
            onChange={(e) => setNotifyForm({...notifyForm, message: e.target.value})}
            fullWidth
            sx={{ mt: 1 }}
            placeholder="Ajouter un message personnalisé pour l'équipe finance..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyDialog({open: false})}>
            Annuler
          </Button>
          <Button onClick={handleNotifyTeam} variant="contained">
            Envoyer Notification
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceAlertsTab;