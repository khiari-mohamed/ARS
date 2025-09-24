import React from 'react';
import { Box, Typography, Alert, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess, UserRole } from '../hooks/useRoleAccess';
import EnhancedDashboard from './EnhancedDashboard';
import ChefEquipePage from '../pages/ChefEquipePage';

const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  const permissions = useRoleAccess();
  const userRole = user?.role as UserRole;

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

  // Administrateur - All modules + system parameters
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

  // Responsable Département - Department dashboards and team data only
  if (userRole === UserRole.RESPONSABLE_DEPARTEMENT) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard Responsable de Département
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Accès limité aux données de votre département
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Votre accès est restreint aux équipes et données de votre département uniquement
        </Alert>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Modules Accessibles</Typography>
                <ul>
                  <li>Tableaux de bord département</li>
                  <li>Données équipes département</li>
                  <li>Contrats département</li>
                  <li>Analytics département</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Limitations</Typography>
                <ul>
                  <li>Pas d'accès aux autres départements</li>
                  <li>Pas de gestion globale</li>
                  <li>Pas d'accès aux modules financiers</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
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

  // Gestionnaire - Same interface as Chef d'équipe but with read-only restrictions
  if (userRole === UserRole.GESTIONNAIRE) {
    const ChefEquipeTableauBordNew = React.lazy(() => import('../pages/dashboard/ChefEquipeTableauBordNew'));
    return (
      <React.Suspense fallback={<div>Chargement...</div>}>
        <ChefEquipeTableauBordNew />
      </React.Suspense>
    );
  }

  // Finance - Finance modules only
  if (userRole === UserRole.FINANCE) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard Finance
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Accès aux modules financiers et MY TUNICLAIM
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Modules Accessibles</Typography>
                <ul>
                  <li>Module Finance</li>
                  <li>MY TUNICLAIM</li>
                  <li>Virements</li>
                  <li>Rapprochements</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Limitations</Typography>
                <ul>
                  <li>Pas d'accès aux tableaux globaux</li>
                  <li>Pas de gestion d'équipe</li>
                  <li>Accès limité aux bordereaux</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Default for other roles
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard - {userRole}
      </Typography>
      <Alert severity="info">
        Tableau de bord spécialisé pour votre rôle: {userRole}
      </Alert>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Accès Limité</Typography>
              <Typography variant="body2" color="text.secondary">
                Votre rôle a un accès restreint aux fonctionnalités du système.
                Contactez votre administrateur pour plus d'informations.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RoleBasedDashboard;