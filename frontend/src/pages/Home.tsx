import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const sidebarLinks = [
  { to: "/home/dashboard", label: "Dashboard" },
  { to: "/home/bordereaux", label: "Bordereaux" },
  { to: "/home/bs", label: "Bulletins de Soin" },
  { to: "/home/clients", label: "Clients" },
  { to: "/home/contracts", label: "Contracts" },
  { to: "/home/analytics", label: "Analytics" },
  { to: "/home/finance", label: "Finance" },
  { to: "/home/ged", label: "GED" },
  { to: "/home/gec", label: "GEC" },
  { to: "/home/reclamations", label: "Réclamations" },
  { to: "/home/users", label: "Utilisateurs" },
  { to: "/home/workflow", label: "Workflow" },
  { to: "/home/alerts", label: "Alertes" }, // <-- ADD THIS LINE
  
];

export default function Home() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const handleToggleSidebar = () => setSidebarOpen(open => !open);

  return (
    <div className={`layout-root${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      <aside className={`sidebar${sidebarOpen ? "" : " sidebar-closed"}`}>
        <button className="sidebar-toggle" onClick={handleToggleSidebar} aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
          {sidebarOpen ? <span>&#10005;</span> : <span>&#9776;</span>}
        </button>
        <div className={`sidebar-title${sidebarOpen ? '' : ' sidebar-title-collapsed'}`}>ARS</div>
        <nav className={`sidebar-nav${sidebarOpen ? '' : ' sidebar-nav-collapsed'}`}
          style={{ pointerEvents: sidebarOpen ? 'auto' : 'none' }}>
          {sidebarLinks.map(link => {
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
        <Outlet />
      </main>
    </div>
  );
}