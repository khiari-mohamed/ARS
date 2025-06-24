import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from '../components/BS/NotificationCenter';
import { LocalAPI } from '../services/axios';
import io from 'socket.io-client';

const sidebarLinks = [
  { to: "/home/dashboard", label: "Dashboard", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'FINANCE', 'CLIENT_SERVICE'] },
  { to: "/home/bordereaux", label: "Bordereaux", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/bs", label: "Bulletins de Soin", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/clients", label: "Clients", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/contracts", label: "Contracts", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/analytics", label: "Analytics", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/finance", label: "Finance", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'FINANCE'] },
  { to: "/home/ged", label: "GED", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM'] },
  { to: "/home/gec", label: "GEC", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/reclamations", label: "Réclamations", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/users", label: "Utilisateurs", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN'] },
  { to: "/home/workflow", label: "Workflow", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/alerts", label: "Alertes", roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'FINANCE'] },
];

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
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000');
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
      <aside className={`sidebar${sidebarOpen ? "" : " sidebar-closed"}`}>
        <button className="sidebar-toggle" onClick={handleToggleSidebar} aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
          {sidebarOpen ? <span>&#10005;</span> : <span>&#9776;</span>}
        </button>
        <div className={`sidebar-title${sidebarOpen ? '' : ' sidebar-title-collapsed'}`}>ARS</div>
        <nav className={`sidebar-nav${sidebarOpen ? '' : ' sidebar-nav-collapsed'}`}
          style={{ pointerEvents: sidebarOpen ? 'auto' : 'none' }}>
          {sidebarLinks
            .filter(link => !userRole || link.roles?.includes(userRole))
            .map(link => {
              const isActive = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`sidebar-link${isActive ? " sidebar-link-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>
        <div className={`sidebar-footer${sidebarOpen ? '' : ' sidebar-footer-collapsed'}`}>© {new Date().getFullYear()} ARS</div>
      </aside>
      <main className="main-content">
        {/* Global Notification Center */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, width: 350 }}>
          <NotificationCenter notifications={notifications} />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;