import React, { useState, useEffect } from 'react';
import { fetchUserNotifications, markNotificationRead } from '../../api/usersApi';
import { UserNotification } from '../../types/user.d';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Visibility,
  MarkEmailRead,
  Delete,
  FilterList,
  MoreVert,
  Info,
  Warning,
  Error,
  CheckCircle,
  Person,
  Assignment,
  AccountBalance,
  Security
} from '@mui/icons-material';

interface Props {
  userId: string;
  showHeader?: boolean;
  maxHeight?: number;
  onNotificationClick?: (notification: UserNotification) => void;
}

const notificationIcons: Record<string, React.ReactElement> = {
  'WELCOME': <Person color="primary" />,
  'ROLE_CHANGE': <Security color="warning" />,
  'ACCOUNT_DISABLED': <Error color="error" />,
  'ACCOUNT_ENABLED': <CheckCircle color="success" />,
  'PASSWORD_RESET': <Security color="warning" />,
  'TASK_ASSIGNED': <Assignment color="info" />,
  'TASK_COMPLETED': <CheckCircle color="success" />,
  'PAYMENT_PROCESSED': <AccountBalance color="success" />,
  'SYSTEM_ALERT': <Warning color="warning" />,
  'INFO': <Info color="info" />,
  'WARNING': <Warning color="warning" />,
  'ERROR': <Error color="error" />,
  'SUCCESS': <CheckCircle color="success" />
};

const notificationColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'WELCOME': 'primary',
  'ROLE_CHANGE': 'warning',
  'ACCOUNT_DISABLED': 'error',
  'ACCOUNT_ENABLED': 'success',
  'PASSWORD_RESET': 'warning',
  'TASK_ASSIGNED': 'info',
  'TASK_COMPLETED': 'success',
  'PAYMENT_PROCESSED': 'success',
  'SYSTEM_ALERT': 'warning',
  'INFO': 'info',
  'WARNING': 'warning',
  'ERROR': 'error',
  'SUCCESS': 'success'
};

const UserNotifications: React.FC<Props> = ({ 
  userId, 
  showHeader = true, 
  maxHeight = 400,
  onNotificationClick 
}) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserNotifications(userId);
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage comme lu');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    try {
      await Promise.all(
        unreadNotifications.map(n => markNotificationRead(n.id))
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage de toutes les notifications');
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else {
      setSelectedNotification(notification);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    switch (filter) {
      case 'unread': return !n.read;
      case 'read': return n.read;
      default: return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        {showHeader && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Badge badgeContent={unreadCount} color="error">
                <Notifications />
              </Badge>
              <Typography variant="h6">
                Notifications ({notifications.length})
              </Typography>
            </Box>
            
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={<FilterList />}
              >
                {filter === 'all' ? 'Toutes' : filter === 'unread' ? 'Non lues' : 'Lues'}
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleMarkAllAsRead}
                  startIcon={<MarkEmailRead />}
                >
                  Tout marquer lu
                </Button>
              )}
            </Box>
          </Box>
        )}

        <Box sx={{ maxHeight: maxHeight, overflow: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <NotificationsOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                {filter === 'unread' 
                  ? 'Aucune notification non lue'
                  : filter === 'read'
                  ? 'Aucune notification lue'
                  : 'Aucune notification'
                }
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <ListItemIcon>
                      {notificationIcons[notification.type] || <Info />}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: notification.read ? 'normal' : 'bold',
                              flex: 1
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Chip 
                              label="Nouveau" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={notification.type}
                          size="small"
                          color={notificationColors[notification.type] || 'default'}
                          variant="outlined"
                        />
                        
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotification(notification);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < filteredNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </CardContent>

      {/* Filter Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setFilter('all'); setAnchorEl(null); }}>
          Toutes les notifications
        </MenuItem>
        <MenuItem onClick={() => { setFilter('unread'); setAnchorEl(null); }}>
          Non lues ({unreadCount})
        </MenuItem>
        <MenuItem onClick={() => { setFilter('read'); setAnchorEl(null); }}>
          Lues ({notifications.length - unreadCount})
        </MenuItem>
      </Menu>

      {/* Notification Details Dialog */}
      <Dialog
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {selectedNotification && notificationIcons[selectedNotification.type]}
            <Typography variant="h6">
              {selectedNotification?.title}
            </Typography>
            {selectedNotification && !selectedNotification.read && (
              <Chip label="Non lu" size="small" color="primary" />
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedNotification.message}
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                <Chip
                  label={selectedNotification.type}
                  color={notificationColors[selectedNotification.type] || 'default'}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </Typography>
              </Box>
              
              {selectedNotification.data && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Données additionnelles:
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedNotification.data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          {selectedNotification && !selectedNotification.read && (
            <Button
              onClick={() => {
                handleMarkAsRead(selectedNotification.id);
                setSelectedNotification(null);
              }}
              startIcon={<MarkEmailRead />}
            >
              Marquer comme lu
            </Button>
          )}
          <Button onClick={() => setSelectedNotification(null)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UserNotifications;