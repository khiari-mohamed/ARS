import React, { useEffect } from 'react';
import { Box, Typography, Alert, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess, UserRole } from '../hooks/useRoleAccess';
import { useNavigate } from 'react-router-dom';
import EnhancedDashboard from './EnhancedDashboard';
import ChefEquipePage from '../pages/ChefEquipePage';

const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  const permissions = useRoleAccess();
  const userRole = user?.role as UserRole;
  const navigate = useNavigate();

  // Auto-redirect to role-specific module on mount
  useEffect(() => {
    if (!user) return;
    
    // Skip auto-redirect for roles that should see the enhanced dashboard
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.RESPONSABLE_DEPARTEMENT) {
      return; // Let them see the enhanced dashboard
    }
    
    // Auto-redirect other roles to their primary module
    switch (userRole) {
      case UserRole.FINANCE:
        navigate('/home/finance', { replace: true });
        return;
      case UserRole.CHEF_EQUIPE:
      case UserRole.GESTIONNAIRE_SENIOR:
      case UserRole.GESTIONNAIRE:
        // Keep existing dashboard behavior for these roles
        return;
      case UserRole.BO:
      case UserRole.BUREAU_ORDRE:
        navigate('/home/bo', { replace: true });
        return;
      case UserRole.SCAN_TEAM:
        navigate('/home/scan', { replace: true });
        return;
      case UserRole.ADMINISTRATEUR:
        // Keep existing dashboard for admin
        return;
      default:
        // For other roles, redirect to bordereaux as default
        navigate('/home/bordereaux', { replace: true });
        return;
    }
  }, [user, userRole, navigate]);

  if (!user) {
    return (
      <Alert severity="error">
        Utilisateur non authentifié
      </Alert>
    );
  }

  // Super Admin - Full system access - show enhanced dashboard
  if (userRole === UserRole.SUPER_ADMIN) {
    return <EnhancedDashboard />;
  }

  // Administrateur - Keep existing dashboard (not auto-redirected)
  if (userRole === UserRole.ADMINISTRATEUR) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard Administrateur
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Gestion complète du système et paramètres
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Modules Accessibles</Typography>
                <ul>
                  <li>Tous les modules système</li>
                  <li>Gestion des utilisateurs</li>
                  <li>Configuration globale</li>
                  <li>Rapports et analytics</li>
                  <li>Module financier</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Permissions</Typography>
                <ul>
                  <li>Vue globale du système</li>
                  <li>Création/modification utilisateurs</li>
                  <li>Accès à tous les bordereaux</li>
                  <li>Réaffectation globale</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Responsable Département - Same view as Super Admin but read-only
  if (userRole === UserRole.RESPONSABLE_DEPARTEMENT) {
    return <EnhancedDashboard />;
  }

  // Chef d'Équipe - Team management, global inbox, team dashboard
  if (userRole === UserRole.CHEF_EQUIPE) {
    const ChefEquipeDashboard = React.lazy(() => import('../pages/dashboard/ChefEquipeDashboard'));
    return (
      <React.Suspense fallback={<div>Chargement...</div>}>
        <ChefEquipeDashboard />
      </React.Suspense>
    );
  }

  // Gestionnaire Senior - Same view as Chef d'Équipe but shows ONLY their own data
  if (userRole === UserRole.GESTIONNAIRE_SENIOR) {
    const GestionnaireSeniorDashboard = React.lazy(() => import('../pages/dashboard/GestionnaireSeniorDashboard'));
    return (
      <React.Suspense fallback={<div>Chargement...</div>}>
        <GestionnaireSeniorDashboard />
      </React.Suspense>
    );
  }

  // Gestionnaire - Same interface as Chef d'équipe but filtered to show only assigned data
  if (userRole === UserRole.GESTIONNAIRE) {
    const GestionnaireDashboardNew = React.lazy(() => import('../pages/dashboard/GestionnaireDashboardNew'));
    return (
      <React.Suspense fallback={<div>Chargement...</div>}>
        <GestionnaireDashboardNew />
      </React.Suspense>
    );
  }

  // Finance - Auto-redirected to /home/finance, this fallback should not be reached
  if (userRole === UserRole.FINANCE) {
    // Fallback UI in case redirect fails
    return (
      <Box>
        <Typography variant="h6">Redirection vers le module Finance...</Typography>
      </Box>
    );
  }

  // Default fallback for other roles (should not be reached due to auto-redirect)
  return (
    <Box>
      <Typography variant="h6">Redirection en cours...</Typography>
    </Box>
  );
};

export default RoleBasedDashboard;