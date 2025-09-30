import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HealingIcon from '@mui/icons-material/Healing';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FolderIcon from '@mui/icons-material/Folder';
import MailIcon from '@mui/icons-material/Mail';
import ReportIcon from '@mui/icons-material/Report';
import GroupIcon from '@mui/icons-material/Group';

import NotificationsIcon from '@mui/icons-material/Notifications';
import InputIcon from '@mui/icons-material/Input';
import ScannerIcon from '@mui/icons-material/Scanner';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LogoutIcon from '@mui/icons-material/Logout';
import UserBadge from './UserBadge';
import arsLogo from '../assets/ars-logo.png';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarLinks = [
  // SUPER_ADMIN: Full access to everything
  { to: "/home/dashboard", label: "Dashboard", icon: <DashboardIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/super-admin", label: "Interface Super Admin", icon: <SupervisorAccountIcon />, roles: ['SUPER_ADMIN'] },
  
  // ADMINISTRATEUR: All modules + system parameters
  // COMMENTED OUT: Redundant user management - Use Super Admin interface instead
  // { to: "/home/users", label: "Utilisateurs", icon: <GroupIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR'] },
  { to: "/home/analytics", label: "Analytics", icon: <BarChartIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'] },
  { to: "/home/finance", label: "Finance", icon: <AccountBalanceIcon />, roles: ['SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'FINANCE'] },
  
  // RESPONSABLE_DEPARTEMENT: Read-only access to all modules like Super Admin
  { to: "/home/contracts", label: "Contrats", icon: <DescriptionIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'] },
  { to: "/home/bordereaux", label: "Bordereaux", icon: <AssignmentIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/bs", label: "Bulletins de Soin", icon: <HealingIcon />, roles: [, 'ADMINISTRATEUR'] },
  { to: "/home/reclamations", label: "Réclamations", icon: <ReportIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/clients", label: "Clients", icon: <PeopleIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/bo", label: "Bureau d'Ordre", icon: <InputIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'BO', 'BUREAU_ORDRE'] },
  { to: "/home/scan", label: "Service SCAN", icon: <ScannerIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'SCAN_TEAM'] },
  { to: "/home/ged", label: "GED", icon: <FolderIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM'] },
  { to: "/home/gec", label: "GEC", icon: <MailIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'CLIENT_SERVICE'] },
  { to: "/home/tuniclaim", label: "MY TUNICLAIM", icon: <CloudSyncIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'FINANCE'] },
  
  // CHEF_EQUIPE: Team management, global inbox, team dashboard
  { to: "/home/chef-equipe", label: "Chef d'Équipe", icon: <SupervisorAccountIcon />, roles: ['SUPER_ADMIN', 'CHEF_EQUIPE'] },
  
  // Common access
  { to: "/home/alerts", label: "Alertes", icon: <NotificationsIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'FINANCE'] },
  { to: "/home/guide", label: "📘 Guide & Flux", icon: <MenuBookIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'FINANCE', 'CLIENT_SERVICE', 'BO', 'BUREAU_ORDRE', 'SCAN_TEAM'] },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle, userRole }) => {
  const location = useLocation();
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: 250,
    backgroundColor: '#fff',
    color: '#263238',
    padding: '1rem',
    zIndex: 999,
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 998,
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: 10,
    left: 10,
    zIndex: 1000,
    background: '#fff',
    color: '#1976d2',
    border: 'none',
    fontSize: '1.5rem',
    padding: '0.5rem',
    cursor: 'pointer',
    borderRadius: 4,
    boxShadow: '0 1px 4px 0 rgba(25, 118, 210, 0.10)',
  };

  const linkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    color: '#1976d2',
    textDecoration: 'none',
    padding: '0.8rem',
    borderRadius: 4,
    marginBottom: '0.5rem',
    fontWeight: 500,
    fontSize: '1.08rem',
    gap: '1rem',
    transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
  };

  const activeLinkStyle: React.CSSProperties = {
    backgroundColor: '#1976d2',
    color: '#fff',
    boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.18)',
  };

  return (
    <>
      <button style={toggleButtonStyle} onClick={onToggle}>
        {open ? '✖' : '☰'}
      </button>

      {open && <div style={overlayStyle} onClick={onToggle}></div>}

      <aside style={sidebarStyle}>
        <div style={{ marginBottom: '1rem', textAlign: 'center', marginTop: '2.5rem' }}>
          <img src={arsLogo} alt="ARS" style={{ height: '40px', width: 'auto' }} />
        </div>
        <UserBadge />
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {sidebarLinks
            .filter(link => !userRole || link.roles?.includes(userRole))
            .map(link => {
              const isActive = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    ...linkStyle,
                    ...(isActive ? activeLinkStyle : {}),
                  }}
                >
                  <span style={{ marginRight: 8, color: isActive ? '#fff' : '#1976d2', display: 'flex', alignItems: 'center' }}>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{
              ...linkStyle,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '1rem',
              color: '#d32f2f',
            }}
          >
            <span style={{ marginRight: 8, color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
              <LogoutIcon />
            </span>
            Déconnexion
          </button>
          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', textAlign: 'center', paddingBottom: '1rem' }}>
            © {new Date().getFullYear()} ARS
          </div>
        </div>
      </aside>
    </>
  );
};
