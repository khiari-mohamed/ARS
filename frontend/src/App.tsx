import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FinanceTracker from './pages/finance/FinanceTracker';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register'; // <-- Import Register
import MainLayout from './layouts/MainLayout';
import RoleBasedDashboard from './components/RoleBasedDashboard';
import BordereauxListPage from './pages/bordereaux/BordereauxList';
import BSModule from './pages/bs/BSModule';
import ClientListPage from './pages/clients/index';
import ContractList from './pages/contracts/ContractList';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import GedViewer from './pages/ged/GedViewer';
import GecManager from './pages/gec/GecManager';
import ReclamationsModule from './pages/reclamations/ReclamationsModule';
import ReclamationDetail from './components/reclamations/ReclamationDetail';
// COMMENTED OUT: Redundant user management import - Use Super Admin interface instead
// import UserManagement from './pages/users/UserManagement';

import AlertsModule from './pages/AlertsModule';
import BODashboard from './pages/BODashboard';
import ScanDashboard from './pages/ScanDashboard';
import ChefEquipePage from './pages/ChefEquipePage';
import ChefEquipeTableauBordNew from './pages/dashboard/ChefEquipeTableauBordNew';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TuniclaimManager from './pages/TuniclaimManager';
import GuideFlowPage from './components/guide/GuideFlowPage';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from './hooks/useRoleAccess';

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
          <Route path="/home/dashboard" element={<RoleBasedDashboard />} />
          
          {/* Protected Routes with Role-Based Access */}
          <Route path="/home/super-admin" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* COMMENTED OUT: Redundant user management - Use Super Admin interface instead */}
          {/* <Route path="/home/users" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR]}>
              <UserManagement />
            </ProtectedRoute>
          } /> */}
          
          <Route path="/home/analytics" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.RESPONSABLE_DEPARTEMENT]}>
              <AnalyticsDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/home/finance" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE]}>
              <FinanceTracker />
            </ProtectedRoute>
          } />
          
          <Route path="/home/contracts" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.RESPONSABLE_DEPARTEMENT]}>
              <ContractList />
            </ProtectedRoute>
          } />
          
          {/* COMMENTED OUT: Redundant Chef d'Équipe dashboard - Use main dashboard instead */}
          {/* <Route path="/home/chef-equipe" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE]}>
              <ChefEquipeTableauBordNew />
            </ProtectedRoute>
          } /> */}
          
          {/* Legacy route redirect */}
          {/* <Route path="/home/chef-equipe-dashboard" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE]}>
              <ChefEquipeTableauBordNew />
            </ProtectedRoute>
          } /> */}
          
          <Route path="/home/tuniclaim" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE, UserRole.FINANCE, UserRole.GESTIONNAIRE]}>
              <TuniclaimManager />
            </ProtectedRoute>
          } />
          
          <Route path="/home/bo" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.BUREAU_ORDRE]}>
              <BODashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/home/scan" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.SCAN_TEAM]}>
              <ScanDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/home/alerts" element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.RESPONSABLE_DEPARTEMENT, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE]}>
              <AlertsModule />
            </ProtectedRoute>
          } />
          
          {/* Common Access Routes */}
          <Route path="/home/bordereaux" element={<BordereauxListPage />} />
          <Route path="/home/bs/*" element={<BSModule />} />
          <Route path="/home/clients" element={<ClientListPage />} />
          <Route path="/home/ged" element={<GedViewer />} />
          <Route path="/home/gec" element={<GecManager />} />
          <Route path="/home/reclamations" element={<ReclamationsModule />} />
          <Route path="/reclamations/detail/:id" element={<ReclamationDetail />} />
          <Route path="/home/guide" element={<GuideFlowPage />} />
          <Route path="*" element={<Navigate to="/home/dashboard" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
};

export default App;