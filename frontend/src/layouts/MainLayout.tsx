import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from '../components/BS/NotificationCenter';
import { LocalAPI } from '../services/axios';
import io from 'socket.io-client';
import { getSocketUrl } from '../utils/getSocketUrl';
import { Sidebar } from '../components/Sidebar';
import OVValidationModal from '../components/Finance/OVValidationModal';
import NotificationDetailModal from '../components/notifications/NotificationDetailModal';

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
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [playedSoundForIds, setPlayedSoundForIds] = useState<Set<string>>(new Set());
  // Managers state
  const [managers, setManagers] = useState<any[]>([]);
  
  // Notification detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [selectedNotificationIndex, setSelectedNotificationIndex] = useState<number>(-1);
  
  // Sound notification
  
  const playNotificationSound = () => {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/iphone_16_messege_tone.mp3`);
    audio.volume = 0.8;
    audio.play().catch(console.error);
  };

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
            const newNotifications = [...others, ...recNotifs];
            
            // Play sound for every new reclamation notification
            const hasNewReclamations = recNotifs.some(n => 
              !prev.find(existing => existing.id === n.id)
            );
            if (hasNewReclamations && prev.length > 0) {
              playNotificationSound();
            }
            
            return newNotifications;
          });
        }
      } catch (error) {
        // console.error('Failed to fetch reclamation alerts:', error);
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
          const newNotifications = data.map((n: any) => ({
            id: n.id,
            message: n.message || n.title,
            read: n.read,
            _type: n.type,
            title: n.title,
            createdAt: n.createdAt,
            data: n.data
          }));
          
          // console.log('📥 Fetched notifications:', newNotifications.length, 'types:', newNotifications.map(n => n._type));
          
          const newUnreadCount = newNotifications.filter(n => !n.read).length;
          
          // Play sound for every new notification (especially OV validation)
          const hasNewNotifications = newNotifications.some(n => 
            !notifications.find(existing => existing.id === n.id)
          );
          
          const newNotificationsList = newNotifications.filter(n => 
            !notifications.find(existing => existing.id === n.id)
          );
          
          if (newNotificationsList.length > 0) {
            // console.log('🆕 NEW notifications detected:', newNotificationsList.map(n => ({ id: n.id, type: n._type, title: n.title })));
          }
          
          // Also check for new unread notifications (in case of status changes)
          const hasNewUnreadNotifications = newUnreadCount > previousUnreadCount;
          
          if ((hasNewNotifications || hasNewUnreadNotifications) && notifications.length > 0) {
            const newNotificationTypes = newNotifications.filter(n => 
              !notifications.find(existing => existing.id === n.id)
            ).map(n => n._type);
            
            // console.log('🔊 Playing notification sound for:', {
            //   hasNewNotifications,
            //   hasNewUnreadNotifications,
            //   newUnreadCount,
            //   previousUnreadCount,
            //   newNotificationTypes
            // });
            
            playNotificationSound();
          }
          

          
          // Force sound for returned scan notifications (only once per notification)
          const returnedScanNotifications = newNotifications.filter(n => 
            (n._type === 'DOSSIER_RETURNED_TO_SCAN' || n._type === 'BORDEREAU_REJECTED') && 
            !n.read && 
            n.id && 
            !playedSoundForIds.has(n.id)
          );
          
          if (returnedScanNotifications.length > 0) {
            // console.log('🔄 Playing sound for new returned scan notifications:', returnedScanNotifications.length);
            playNotificationSound();
            
            // Mark these notifications as having played sound
            const newPlayedIds = new Set(playedSoundForIds);
            returnedScanNotifications.forEach(n => {
              if (n.id) newPlayedIds.add(n.id);
            });
            setPlayedSoundForIds(newPlayedIds);
          }
          
          setNotifications(newNotifications);
          setPreviousUnreadCount(newUnreadCount);
        }
      } catch (error) {
        // Fallback: continue with existing reclamation alerts
        // console.log('Using fallback notification system');
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000); // Check every 3 seconds for faster response
    
    return () => clearInterval(interval);
  }, [user?.id, notifications, previousUnreadCount]);

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
        // console.log('Failed to mark notification as read');
      }
    }
    setNotifications(prev => prev.map((n, i) => i === index ? {...n, read: true} : n));
  };
  
  // Get notification icon and color
  const getNotificationIcon = (type: string, level?: string) => {
    switch (type) {
      case 'NEW_BORDEREAU_SCAN': return '📄';
      case 'BORDEREAU_READY_ASSIGNMENT': return '📋';
      case 'BORDEREAU_RETURNED': return '↩️';
      case 'BORDEREAU_REJECTED': return '🔄';
      case 'DOSSIER_RETURNED_TO_SCAN': return '🔄';
      case 'WORKFLOW_ASSIGNMENT': return '📋';
      case 'TEAM_OVERLOAD_ALERT': return '⚠️';
      case 'ASSIGNMENT_FAILURE': return '❌';
      case 'SLA_BREACH': return '🔴';
      case 'SCAN_SLA_ALERT': return '⏰'; // SCAN SLA alert icon
      case 'CUSTOM_NOTIFICATION': return '💬';
      case 'OV_PENDING_VALIDATION': return '💰';
      case 'OV_VALIDATED': return '✅';
      case 'OV_REJECTED': return '❌';
      case 'NOUVEAU_VIREMENT': return '💰';
      case 'RIB_UPDATE': return '💳';
      case 'reclamation': 
        if (level === 'error') return '🚨';
        if (level === 'warning') return '⚠️';
        return '📝';
      default: return '🔔';
    }
  };
  
  const getNotificationColor = (type: string, data?: any) => {
    switch (type) {
      case 'SCAN_SLA_ALERT':
        if (data?.status === 'CRITICAL') return '#d32f2f'; // Red for critical
        if (data?.status === 'WARNING') return '#f57c00'; // Orange for warning
        return '#1976d2'; // Blue default
      case 'SLA_BREACH': return '#d32f2f';
      case 'TEAM_OVERLOAD_ALERT': return '#f57c00';
      case 'ASSIGNMENT_FAILURE': return '#d32f2f';
      case 'OV_PENDING_VALIDATION': return '#2e7d32';
      case 'reclamation': return '#ed6c02';
      default: return '#1976d2';
    }
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // OV Validation Modal state
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedOV, setSelectedOV] = useState<{ id: string; reference: string } | null>(null);
  
  const handleNotificationClick = async (notif: NotificationItem, index: number) => {
    // AUTOMATICALLY mark as read when clicked
    if (!notif.read && notif.id) {
      try {
        if (notif._type === 'reclamation') {
          await LocalAPI.patch(`/reclamations/alerts/${notif.id}/read`);
        } else {
          await LocalAPI.patch(`/users/${user?.id}/notifications/${notif.id}/read`);
        }
        // Update local state immediately
        setNotifications(prev => prev.map((n, i) => i === index ? {...n, read: true} : n));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    
    // EXACT SPEC: Open validation modal for OV_PENDING_VALIDATION notifications
    if (notif._type === 'OV_PENDING_VALIDATION' && notif.data?.ordreVirementId) {
      setSelectedOV({
        id: notif.data.ordreVirementId,
        reference: notif.data.reference || 'N/A'
      });
      setValidationModalOpen(true);
      setAnchorEl(null);
    } else {
      // Open detail modal for other notifications
      setSelectedNotification(notif);
      setSelectedNotificationIndex(index);
      setDetailModalOpen(true);
      setAnchorEl(null);
    }
  };
  
  const handleDetailModalMarkAsRead = () => {
    // No need to mark as read again since it's already done in handleNotificationClick
    setDetailModalOpen(false);
    setSelectedNotification(null);
    setSelectedNotificationIndex(-1);
  };

  return (
    <div className={`layout-root${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} onToggle={handleToggleSidebar} userRole={userRole} />
      

      
      {/* Header with Bell Icon */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1200, display: 'flex', gap: 1 }}>
        <IconButton onClick={playNotificationSound} size="small" title="Test Sound">
          🔊
        </IconButton>
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
                      // console.log('Failed to mark all as read');
                    }
                  }}
                  sx={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    ✓ Marquer tout comme lu ({unreadCount})
                  </Typography>
                </MenuItem>
              )}
              {notifications.map((notif, i) => {
                const notifColor = getNotificationColor(notif._type || 'default', notif.data);
                const isScanSLA = notif._type === 'SCAN_SLA_ALERT';
                const isCritical = notif.data?.status === 'CRITICAL';
                const isWarning = notif.data?.status === 'WARNING';
                
                return (
                <MenuItem 
                  key={notif.id || i} 
                  onClick={() => handleNotificationClick(notif, i)}
                  sx={{ 
                    opacity: notif.read ? 0.6 : 1,
                    backgroundColor: notif.read ? 'transparent' : `${notifColor}15`,
                    '&:hover': { backgroundColor: `${notifColor}25` },
                    borderLeft: notif.read ? 'none' : `4px solid ${notifColor}`,
                    py: 1.5,
                    px: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                    <Box sx={{ 
                      fontSize: '24px', 
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: `${notifColor}20`,
                      flexShrink: 0
                    }}>
                      {getNotificationIcon(notif._type || 'default', notif.data?.level)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {notif.title && (
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: notif.read ? 'normal' : 'bold',
                            mb: 0.5,
                            color: notif.read ? 'text.secondary' : notifColor,
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
                          WebkitBoxOrient: 'vertical',
                          fontSize: '0.875rem'
                        }}
                      >
                        {notif.message}
                      </Typography>
                      
                      {/* SCAN SLA specific info */}
                      {isScanSLA && notif.data && (
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1, 
                          mt: 1,
                          flexWrap: 'wrap'
                        }}>
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            borderRadius: '12px',
                            backgroundColor: isCritical ? '#ffebee' : isWarning ? '#fff3e0' : '#e3f2fd',
                            border: `1px solid ${isCritical ? '#ef5350' : isWarning ? '#ff9800' : '#2196f3'}`
                          }}>
                            <Typography variant="caption" sx={{ 
                              fontWeight: 'bold',
                              color: isCritical ? '#c62828' : isWarning ? '#e65100' : '#1565c0'
                            }}>
                              {isCritical ? '🔴 CRITIQUE' : isWarning ? '🟠 ATTENTION' : '🟢 OK'}
                            </Typography>
                          </Box>
                          {notif.data.daysElapsed && (
                            <Box sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              borderRadius: '12px',
                              backgroundColor: '#f5f5f5'
                            }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                📅 {notif.data.daysElapsed} jours
                              </Typography>
                            </Box>
                          )}
                          {notif.data.clientName && (
                            <Box sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              borderRadius: '12px',
                              backgroundColor: '#f5f5f5'
                            }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                🏢 {notif.data.clientName}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        {notif.createdAt && (
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
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
                              '&:hover': { textDecoration: 'underline' },
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/home/reclamations/${notif.data.reclamationId}`, '_blank');
                            }}
                          >
                            Voir réclamation →
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </MenuItem>
              );})}
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
      
      {/* OV Validation Modal */}
      {selectedOV && (
        <OVValidationModal
          open={validationModalOpen}
          onClose={() => {
            setValidationModalOpen(false);
            setSelectedOV(null);
          }}
          ovId={selectedOV.id}
          ovReference={selectedOV.reference}
          onValidated={() => {
            // Refresh notifications after validation
            if (user?.id) {
              LocalAPI.get(`/users/${user.id}/notifications`)
                .then(({ data }) => {
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
                })
                .catch(() => {});
            }
          }}
        />
      )}
      
      {/* Notification Detail Modal */}
      <NotificationDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedNotification(null);
          setSelectedNotificationIndex(-1);
        }}
        notification={selectedNotification}
        onMarkAsRead={handleDetailModalMarkAsRead}
      />
    </div>
  );
};

export default MainLayout