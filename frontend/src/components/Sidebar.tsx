import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HealingIcon from '@mui/icons-material/Healing';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FolderIcon from '@mui/icons-material/Folder';
import MailIcon from '@mui/icons-material/Mail';
import ReportIcon from '@mui/icons-material/Report';
//import GroupIcon from '@mui/icons-material/Group';

//import NotificationsIcon from '@mui/icons-material/Notifications';
import InputIcon from '@mui/icons-material/Input';
import ScannerIcon from '@mui/icons-material/Scanner';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
//import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArchiveIcon from '@mui/icons-material/Archive';
import LogoutIcon from '@mui/icons-material/Logout';
import UserBadge from './UserBadge';
import arsLogo from '../assets/ars-logo.png';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarLinks = [
  // SUPER_ADMIN: Full access to everything
  { to: "/home/dashboard", label: "Dashboard", icon: <DashboardIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] },
  { to: "/home/super-admin", label: "Interface Super Admin", icon: <SupervisorAccountIcon />, roles: ['SUPER_ADMIN'] },
  { to: "/home/archives", label: "Archives", icon: <ArchiveIcon />, roles: ['SUPER_ADMIN'] },
  { to: "/home/analytics", label: "Analytics", icon: <BarChartIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'] },
  { to: "/home/finance", label: "Finance", icon: <AccountBalanceIcon />, roles: ['SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'FINANCE'] },
  { to: "/home/sage", label: "Gestion Sage", icon: <AccountBalanceWalletIcon />, roles: ['SUPER_ADMIN', 'FINANCE', 'RESPONSABLE_DEPARTEMENT'] },
  
  // RESPONSABLE_DEPARTEMENT: Read-only access to all modules like Super Admin
  { to: "/home/contracts", label: "Contrats", icon: <DescriptionIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'] },
  { to: "/home/bordereaux", label: "Bordereaux", icon: <AssignmentIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] },
  { to: "/home/bs", label: "Bulletins de Soin", icon: <HealingIcon />, roles: [, 'ADMINISTRATEUR'] },
  { to: "/home/reclamations", label: "Réclamations", icon: <ReportIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/clients", label: "Clients", icon: <PeopleIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE', 'CLIENT_SERVICE'] },
  { to: "/home/bo", label: "Bureau d'Ordre", icon: <InputIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'BO', 'BUREAU_ORDRE'] },
  { to: "/home/scan", label: "Service SCAN", icon: <ScannerIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'SCAN_TEAM'] },
  { to: "/home/ged", label: "GED", icon: <FolderIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE', 'SCAN_TEAM'] },
  { to: "/home/gec", label: "GEC", icon: <MailIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'CLIENT_SERVICE'] },
  { to: "/home/tuniclaim", label: "MY TUNICLAIM", icon: <CloudSyncIcon />, roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'FINANCE'] },
  
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  userRole?: string;
}

const sidebarStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  .ars-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 250px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    font-family: 'DM Sans', sans-serif;

    /* Dark premium background */
    background: #0f0f0f;

    /* Subtle red glow at bottom-left */
    background-image:
      radial-gradient(ellipse 70% 40% at 0% 100%, rgba(213,43,54,0.18) 0%, transparent 70%),
      radial-gradient(ellipse 50% 30% at 100% 0%, rgba(213,43,54,0.07) 0%, transparent 60%);

    border-right: 1px solid rgba(255,255,255,0.07);
    transition: transform 0.3s ease;
    padding: 0;
  }

  .ars-sidebar-open {
    transform: translateX(0);
  }

  .ars-sidebar-closed {
    transform: translateX(-100%);
  }

  /* Faint grid texture */
  .ars-sidebar::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  /* Top red accent line */
  .ars-sidebar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #d52b36, rgba(213,43,54,0.2), transparent);
    z-index: 1;
  }

  .ars-sidebar-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0 12px 12px 12px;
  }

  /* ── LOGO AREA ── */
  .ars-sidebar-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0 12px;
    margin-bottom: 4px;
    margin-top: 2.5rem;
  }

  .ars-sidebar-logo {
    height: 36px;
    width: auto;
    filter: brightness(1.1) drop-shadow(0 0 10px rgba(213,43,54,0.35));
  }

  /* ── DIVIDER ── */
  .ars-sidebar-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    margin: 8px 4px 12px;
  }

  /* ── NAV ── */
  .ars-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 2px;
    scrollbar-width: thin;
    scrollbar-color: rgba(213,43,54,0.3) transparent;
    padding-bottom: 8px;
  }

  .ars-sidebar-nav::-webkit-scrollbar {
    width: 3px;
  }
  .ars-sidebar-nav::-webkit-scrollbar-track {
    background: transparent;
  }
  .ars-sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(213,43,54,0.3);
    border-radius: 2px;
  }

  /* ── NAV LINK ── */
  .ars-sidebar-link {
    display: flex;
    align-items: center;
    gap: 11px;
    text-decoration: none;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: rgba(255,255,255,0.45);
    transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    position: relative;
    letter-spacing: 0.1px;
  }

  .ars-sidebar-link:hover {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.85);
  }

  .ars-sidebar-link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    background: rgba(255,255,255,0.05);
    flex-shrink: 0;
    transition: background 0.18s;
    font-size: 18px !important;
  }

  .ars-sidebar-link .ars-sidebar-link-icon svg {
    font-size: 17px !important;
    color: rgba(255,255,255,0.4);
    transition: color 0.18s;
  }

  .ars-sidebar-link:hover .ars-sidebar-link-icon {
    background: rgba(213,43,54,0.12);
  }

  .ars-sidebar-link:hover .ars-sidebar-link-icon svg {
    color: #d52b36;
  }

  /* ACTIVE STATE */
  .ars-sidebar-link-active {
    background: rgba(213,43,54,0.14);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(213,43,54,0.25);
  }

  .ars-sidebar-link-active .ars-sidebar-link-icon {
    background: #d52b36;
    box-shadow: 0 3px 10px rgba(213,43,54,0.45);
  }

  .ars-sidebar-link-active .ars-sidebar-link-icon svg {
    color: #fff !important;
  }

  .ars-sidebar-link-active:hover {
    background: rgba(213,43,54,0.18);
  }

  /* Active left bar */
  .ars-sidebar-link-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: #d52b36;
    border-radius: 0 2px 2px 0;
  }

  /* ── FOOTER ── */
  .ars-sidebar-footer {
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .ars-sidebar-logout {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: rgba(213,43,54,0.75);
    background: transparent;
    border: none;
    cursor: pointer;
    width: 100%;
    transition: background 0.18s, color 0.18s;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.1px;
  }

  .ars-sidebar-logout:hover {
    background: rgba(213,43,54,0.1);
    color: #ff4d5a;
  }

  .ars-sidebar-logout-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    background: rgba(213,43,54,0.08);
    flex-shrink: 0;
    transition: background 0.18s;
  }

  .ars-sidebar-logout:hover .ars-sidebar-logout-icon {
    background: rgba(213,43,54,0.18);
  }

  .ars-sidebar-logout-icon svg {
    font-size: 17px !important;
    color: #d52b36;
  }

  .ars-sidebar-copy {
    font-size: 11px;
    color: rgba(255,255,255,0.15);
    text-align: center;
    padding: 10px 0 4px;
    letter-spacing: 0.3px;
  }

  /* ── TOGGLE BUTTON ── */
  .ars-sidebar-toggle {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 1000;
    background: #0f0f0f;
    color: rgba(255,255,255,0.7);
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 1.2rem;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    transition: background 0.18s, color 0.18s, border-color 0.18s;
  }

  .ars-sidebar-toggle:hover {
    background: #1a1a1a;
    color: #fff;
    border-color: rgba(213,43,54,0.4);
  }

  /* ── OVERLAY ── */
  .ars-sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(2px);
    z-index: 998;
  }
`;

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle, userRole }) => {
  const location = useLocation();
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{sidebarStyles}</style>

      <button className="ars-sidebar-toggle" onClick={onToggle}>
        {open ? '✖' : '☰'}
      </button>

      {open && <div className="ars-sidebar-overlay" onClick={onToggle} />}

      <aside className={`ars-sidebar ${open ? 'ars-sidebar-open' : 'ars-sidebar-closed'}`}>
        <div className="ars-sidebar-inner">

          {/* Logo */}
          <div className="ars-sidebar-logo-wrap">
            <img src={arsLogo} alt="ARS" className="ars-sidebar-logo" />
          </div>

          <div className="ars-sidebar-divider" />

          {/* UserBadge — untouched */}
          <UserBadge />

          {/* Nav */}
          <nav className="ars-sidebar-nav">
            {sidebarLinks
              .filter(link => !userRole || link.roles?.includes(userRole))
              .map(link => {
                const isActive = location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`ars-sidebar-link${isActive ? ' ars-sidebar-link-active' : ''}`}
                  >
                    <span className="ars-sidebar-link-icon">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
          </nav>

          {/* Footer */}
          <div className="ars-sidebar-footer">
            <button className="ars-sidebar-logout" onClick={handleLogout}>
              <span className="ars-sidebar-logout-icon"><LogoutIcon /></span>
              Déconnexion
            </button>
            <div className="ars-sidebar-copy">
              © {new Date().getFullYear()} ARS
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};