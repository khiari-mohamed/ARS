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
  type NotificationItem = { message: string; read: boolean; _type?: string };
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
        const { data } = await LocalAPI.get('/alerts/reclamations');
        if (mounted && Array.isArray(data)) {
          setNotifications(prev => {
            // Merge with other notifications later
            const recNotifs = data.filter(a => !a.resolved).map(a => ({ message: a.message, read: false }));
            // Remove old rec alerts, add new
            const others = prev.filter(n => !n._type || n._type !== 'reclamation');
            return [...others, ...recNotifs.map(n => ({ ...n, _type: 'reclamation' }))];
          });
        }
      } catch {}
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
        const { data } = await LocalAPI.get('/notifications');
        if (Array.isArray(data)) {
          setNotifications(data.map((n: any) => ({
            message: n.message,
            read: n.read,
            _type: n.type
          })));
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  // Mark notifications as read when clicked
  const markAsRead = async (index: number) => {
    setNotifications(prev => prev.map((n, i) => i === index ? {...n, read: true} : n));
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
          PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
        >
          {notifications.length === 0 ? (
            <MenuItem><Typography>Aucune notification</Typography></MenuItem>
          ) : (
            notifications.map((notif, i) => (
              <MenuItem key={i} sx={{ opacity: notif.read ? 0.6 : 1 }}>
                <Typography variant="body2">{notif.message}</Typography>
              </MenuItem>
            ))
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