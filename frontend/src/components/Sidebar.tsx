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
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InputIcon from '@mui/icons-material/Input';
import ScannerIcon from '@mui/icons-material/Scanner';

const sidebarLinks = [
  { to: "/home/dashboard", label: "Dashboard", icon: <DashboardIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'FINANCE', 'CLIENT_SERVICE'] },
  { to: "/home/bo", label: "Bureau d'Ordre", icon: <InputIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'BO', 'CUSTOMER_SERVICE'] },
  { to: "/home/scan", label: "Service SCAN", icon: <ScannerIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'SCAN_TEAM'] },
  { to: "/home/bordereaux", label: "Bordereaux", icon: <AssignmentIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/bs", label: "Bulletins de Soin", icon: <HealingIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/clients", label: "Clients", icon: <PeopleIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'] },
  { to: "/home/contracts", label: "Contracts", icon: <DescriptionIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/analytics", label: "Analytics", icon: <BarChartIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/finance", label: "Finance", icon: <AccountBalanceIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'FINANCE'] },
  { to: "/home/ged", label: "GED", icon: <FolderIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM'] },
  { to: "/home/gec", label: "GEC", icon: <MailIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/reclamations", label: "Réclamations", icon: <ReportIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/users", label: "Utilisateurs", icon: <GroupIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN'] },
  { to: "/home/workflow", label: "Workflow", icon: <TimelineIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE'] },
  { to: "/home/alerts", label: "Alertes", icon: <NotificationsIcon />, roles: ['ADMINISTRATEUR', 'SUPER_ADMIN', 'CHEF_EQUIPE', 'FINANCE'] },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle, userRole }) => {
  const location = useLocation();

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
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1976d2', textAlign: 'center', marginTop: '2.5rem' }}>ARS</div>
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
        <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#cbd5e1', textAlign: 'center', paddingBottom: '1rem' }}>
          © {new Date().getFullYear()} ARS
        </div>
      </aside>
    </>
  );
};
