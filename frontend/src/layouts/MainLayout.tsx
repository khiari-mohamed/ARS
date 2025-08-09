import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from '../components/BS/NotificationCenter';
import { LocalAPI } from '../services/axios';
import io from 'socket.io-client';
import { getSocketUrl } from '../utils/getSocketUrl';
import { Sidebar } from '../components/Sidebar';

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

  // Listen for SLA alerts via socket.io
  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });
    socket.on('sla_alert', (data: any) => {
      setNotifications(prev => [
        { message: data.message, read: false, _type: 'sla' },
        ...prev.filter(n => n._type !== 'sla')
      ]);
    });
    return () => { socket.disconnect(); };
  }, []);

  // TODO: Add more sources (finance, virement, etc.) as needed, following the same pattern

  return (
    <div className={`layout-root${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} onToggle={handleToggleSidebar} userRole={userRole} />
      <main className="main-content   style={{
    marginLeft: sidebarOpen ? 250 : 0,
    padding: '1rem',
    transition: 'margin-left 0.3s ease',
  }}">
        {/* Global Notification Center */}
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, width: 350 }}>
          <NotificationCenter notifications={notifications} />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout