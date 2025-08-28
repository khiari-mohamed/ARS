import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Notifications,
  Close,
  ExpandMore,
  ExpandLess,
  NotificationsActive
} from '@mui/icons-material';

interface ReclamationAlert {
  id: string;
  type: 'NEW_RECLAMATION' | 'SLA_BREACH' | 'SLA_CRITICAL' | 'SLA_AT_RISK' | 'ESCALATED';
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  reclamationId?: string;
  clientName?: string;
  createdAt: string;
  read: boolean;
}

const fetchAlerts = async () => {
  const { data } = await LocalAPI.get('/reclamations/alerts');
  return data;
};

const markAlertAsRead = async (alertId: string) => {
  const { data } = await LocalAPI.patch(`/alerts/${alertId}/read`);
  return data;
};

const getAlertIcon = (type: string, level: string) => {
  switch (level) {
    case 'error':
      return <Error color="error" />;
    case 'warning':
      return <Warning color="warning" />;
    case 'success':
      return <CheckCircle color="success" />;
    default:
      return <Info color="info" />;
  }
};

const getAlertColor = (level: string): 'error' | 'warning' | 'info' | 'success' => {
  return level as any;
};

export const RealTimeAlerts: React.FC = () => {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const { data: alertsData = [], refetch } = useQuery<ReclamationAlert[]>(
    ['reclamation-alerts'],
    fetchAlerts,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      refetchOnWindowFocus: true
    }
  );

  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const unreadCount = alerts.filter(alert => !alert.read).length;
  const criticalAlerts = alerts.filter(alert => alert.level === 'error' && !alert.read);
  const warningAlerts = alerts.filter(alert => alert.level === 'warning' && !alert.read);

  const handleToggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      refetch();
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleViewReclamation = (reclamationId: string) => {
    window.open(`/reclamations/${reclamationId}`, '_blank');
  };

  // Show critical alerts as persistent banners
  const renderCriticalBanners = () => {
    if (criticalAlerts.length === 0) return null;

    return (
      <Box sx={{ position: 'fixed', top: 80, left: 0, right: 0, zIndex: 1200, p: 2 }}>
        {criticalAlerts.slice(0, 3).map((alert) => (
          <Alert
            key={alert.id}
            severity="error"
            sx={{ mb: 1 }}
            action={
              <Box>
                {alert.reclamationId && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => handleViewReclamation(alert.reclamationId!)}
                  >
                    Voir
                  </Button>
                )}
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => handleMarkAsRead(alert.id)}
                >
                  <Close />
                </IconButton>
              </Box>
            }
          >
            <AlertTitle>{alert.title}</AlertTitle>
            {alert.message}
            {alert.clientName && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Client: <strong>{alert.clientName}</strong>
              </Typography>
            )}
          </Alert>
        ))}
      </Box>
    );
  };

  // Floating action button for alerts
  const renderFloatingButton = () => (
    <Fab
      color={criticalAlerts.length > 0 ? 'error' : warningAlerts.length > 0 ? 'warning' : 'primary'}
      sx={{ position: 'fixed', bottom: 16, right: 16 }}
      onClick={() => setAlertsOpen(true)}
    >
      <Badge badgeContent={unreadCount} color="error">
        {criticalAlerts.length > 0 ? <NotificationsActive /> : <Notifications />}
      </Badge>
    </Fab>
  );

  // Alerts dialog
  const renderAlertsDialog = () => (
    <Dialog
      open={alertsOpen}
      onClose={() => setAlertsOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Alertes Réclamations ({unreadCount} non lues)
          </Typography>
          <IconButton onClick={() => setAlertsOpen(false)}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <List>
          {alerts.length === 0 ? (
            <ListItem>
              <ListItemText primary="Aucune alerte" />
            </ListItem>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                sx={{
                  mb: 1,
                  opacity: alert.read ? 0.7 : 1,
                  border: alert.read ? 'none' : `2px solid ${
                    alert.level === 'error' ? '#f44336' :
                    alert.level === 'warning' ? '#ff9800' :
                    alert.level === 'info' ? '#2196f3' : '#4caf50'
                  }`
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="flex-start" gap={1} flex={1}>
                      {getAlertIcon(alert.type, alert.level)}
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={alert.read ? 'normal' : 'bold'}>
                          {alert.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(alert.createdAt).toLocaleString('fr-FR')}
                        </Typography>
                        {alert.clientName && (
                          <Chip
                            label={alert.clientName}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      {alert.reclamationId && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewReclamation(alert.reclamationId!)}
                        >
                          Voir
                        </Button>
                      )}
                      {!alert.read && (
                        <Button
                          size="small"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          Marquer lu
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpand(alert.id)}
                      >
                        {expandedAlerts.has(alert.id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Collapse in={expandedAlerts.has(alert.id)}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2">
                        {alert.message}
                      </Typography>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {renderCriticalBanners()}
      {renderFloatingButton()}
      {renderAlertsDialog()}
    </>
  );
};

export default RealTimeAlerts;