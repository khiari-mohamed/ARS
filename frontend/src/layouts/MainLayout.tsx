import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from '../components/BS/NotificationCenter';
import { LocalAPI } from '../services/axios';
import io from 'socket.io-client';
import { getSocketUrl } from '../utils/getSocketUrl';
import { Sidebar } from '../components/Sidebar';

import { IconButton, Badge, Menu, MenuItem, Typography, Box } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

const MainLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const handleToggleSidebar = () => setSidebarOpen(open => !open);
  const { user } = useAuth();
  const userRole = user?.role;

  // Global notifications state
  type NotificationItem = { 
    id?: string;
    message: string; 
    read: boolean; 
    _type?: string;
    title?: string;
    createdAt?: string;
    data?: any;
  };
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Managers state
  const [managers, setManagers] = useState<any[]>([]);

  // Fetch managers with role 'MANAGER' (adjust endpoint/role as needed)
  useEffect(() => {
    LocalAPI.get('/users', { params: { role: 'MANAGER' } })
      .then(res => setManagers(res.data || []))
      .catch(() => setManagers([]));
  }, []);

  // Aggregate notifications from various sources
  useEffect(() => {
    let mounted = true;
    // Polling for reclamation alerts
    const fetchReclamationAlerts = async () => {
      try {
        const { data } = await LocalAPI.get('/reclamations/alerts');
        if (mounted && Array.isArray(data)) {
          setNotifications(prev => {
            // Convert reclamation alerts to notification format
            const recNotifs = data.filter(a => !a.read).map(a => ({
              id: a.id,
              message: a.message,
              title: a.title,
              read: a.read,
              _type: 'reclamation',
              createdAt: a.createdAt,
              data: { reclamationId: a.reclamationId, clientName: a.clientName, level: a.level }
            }));
            // Remove old rec alerts, add new
            const others = prev.filter(n => !n._type || n._type !== 'reclamation');
            return [...others, ...recNotifs];
          });
        }
      } catch (error) {
        console.error('Failed to fetch reclamation alerts:', error);
      }
    };
    fetchReclamationAlerts();
    const interval = setInterval(fetchReclamationAlerts, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      
      try {
        // Try to get notifications from the database
        const { data } = await LocalAPI.get(`/users/${user.id}/notifications`);
        if (Array.isArray(data)) {
          setNotifications(data.map((n: any) => ({
            id: n.id,
            message: n.message || n.title,
            read: n.read,
            _type: n.type,
            title: n.title,
            createdAt: n.createdAt,
            data: n.data
          })));
        }
      } catch (error) {
        // Fallback: continue with existing reclamation alerts
        console.log('Using fallback notification system');
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  // Mark notifications as read when clicked
  const markAsRead = async (index: number) => {
    const notification = notifications[index];
    if (notification.id) {
      try {
        if (notification._type === 'reclamation') {
          await LocalAPI.patch(`/reclamations/alerts/${notification.id}/read`);
        } else {
          await LocalAPI.patch(`/users/${user?.id}/notifications/${notification.id}/read`);
        }
      } catch (error) {
        console.log('Failed to mark notification as read');
      }
    }
    setNotifications(prev => prev.map((n, i) => i === index ? {...n, read: true} : n));
  };
  
  // Get notification icon
  const getNotificationIcon = (type: string, level?: string) => {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN': return '📄';
      case 'BORDEREAU_READY_ASSIGNMENT': return '📋';
      case 'BORDEREAU_RETURNED': return '↩️';
      case 'TEAM_OVERLOAD_ALERT': return '⚠️';
      case 'ASSIGNMENT_FAILURE': return '❌';
      case 'SLA_BREACH': return '🔴';
      case 'CUSTOM_NOTIFICATION': return '💬';
      case 'reclamation': 
        if (level === 'error') return '🚨';
        if (level === 'warning') return '⚠️';
        return '📝';
      default: return '🔔';
    }
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`layout-root${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} onToggle={handleToggleSidebar} userRole={userRole} />
      

      
      {/* Header with Bell Icon */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1200 }}>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { width: 350, maxHeight: 500 } }}
        >
          {notifications.length === 0 ? (
            <MenuItem><Typography>Aucune notification</Typography></MenuItem>
          ) : (
            <>
              {unreadCount > 0 && (
                <MenuItem 
                  onClick={async () => {
                    try {
                      // Mark all user notifications as read
                      await LocalAPI.patch(`/users/${user?.id}/notifications/mark-all-read`);
                      
                      // Mark all reclamation alerts as read
                      const reclamationAlerts = notifications.filter(n => n._type === 'reclamation' && !n.read);
                      await Promise.all(
                        reclamationAlerts.map(alert => 
                          LocalAPI.patch(`/reclamations/alerts/${alert.id}/read`)
                        )
                      );
                      
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    } catch (error) {
                      console.log('Failed to mark all as read');
                    }
                  }}
                  sx={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    ✓ Marquer tout comme lu ({unreadCount})
                  </Typography>
                </MenuItem>
              )}
              {notifications.map((notif, i) => (
                <MenuItem 
                  key={notif.id || i} 
                  onClick={() => markAsRead(i)}
                  sx={{ 
                    opacity: notif.read ? 0.6 : 1,
                    backgroundColor: notif.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.12)' },
                    borderLeft: notif.read ? 'none' : '3px solid #1976d2',
                    py: 1.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                    <span style={{ fontSize: '16px', marginTop: '2px' }}>
                      {getNotificationIcon(notif._type || 'default', notif.data?.level)}
                    </span>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {notif.title && (
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: notif.read ? 'normal' : 'bold',
                            mb: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {notif.title}
                        </Typography>
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {notif.message}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        {notif.createdAt && (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {new Date(notif.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        )}
                        {notif._type === 'reclamation' && notif.data?.reclamationId && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'primary.main', 
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/home/reclamations/${notif.data.reclamationId}`, '_blank');
                            }}
                          >
                            Voir réclamation
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      </Box>

      <main style={{
        marginLeft: window.innerWidth > 900 ? (sidebarOpen ? 250 : 0) : 0,
        padding: '1rem',
        transition: 'margin-left 0.3s ease',
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout