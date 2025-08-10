import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FinanceTracker from './pages/finance/FinanceTracker';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register'; // <-- Import Register
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/dashboard/Dashboard';
import BordereauxListPage from './pages/bordereaux/BordereauxList';
import BSListPage from './pages/bs/BSListPage';
import ClientListPage from './pages/clients/index';
import ContractList from './pages/contracts/ContractList';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import GedViewer from './pages/ged/GedViewer';
import GecManager from './pages/gec/GecManager';
import ReclamationsModule from './pages/reclamations/ReclamationsModule';
import UserManagement from './pages/users/UserManagement';
import WorkflowTimeline from './pages/workflow/WorkflowTimeline';
import WorkflowPage from './pages/workflow/WorkflowPage'; // <-- add this import
import AlertsModule from './pages/AlertsModule';
import BODashboard from './pages/BODashboard';
import ScanDashboard from './pages/ScanDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Chargement...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* <-- Add this line */}
      {user ? (
        <Route element={<MainLayout children={undefined} />}>
          <Route path="/home/dashboard" element={<Dashboard />} />
          <Route path="/home/bordereaux" element={<BordereauxListPage />} />
          <Route path="/home/bs" element={<BSListPage />} />
          <Route path="/home/clients" element={<ClientListPage />} />
          <Route path="/home/contracts" element={<ContractList />} />
          <Route path="/home/analytics" element={<AnalyticsDashboard />} />
          <Route path="/home/finance" element={<FinanceTracker />} />
          <Route path="/home/ged" element={<GedViewer />} />
          <Route path="/home/gec" element={<GecManager />} />
          <Route path="/home/reclamations" element={<ReclamationsModule />} />
          <Route path="/home/users" element={<UserManagement />} />
          <Route path="/home/workflow" element={<WorkflowPage />} />
          <Route path="/home/alerts" element={<AlertsModule />} />
          <Route path="/home/bo" element={<BODashboard />} />
          <Route path="/home/scan" element={<ScanDashboard />} />
          <Route path="/home/super-admin" element={<SuperAdminDashboard />} />
          <Route path="*" element={<Navigate to="/home/dashboard" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
};

export default App;