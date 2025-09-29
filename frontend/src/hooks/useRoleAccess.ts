import { useAuth } from '../contexts/AuthContext';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
  RESPONSABLE_DEPARTEMENT = 'RESPONSABLE_DEPARTEMENT',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  CLIENT_SERVICE = 'CLIENT_SERVICE',
  FINANCE = 'FINANCE',
  SCAN_TEAM = 'SCAN_TEAM',
  BO = 'BO',
  BUREAU_ORDRE = 'BUREAU_ORDRE',
}

interface RolePermissions {
  // Module access
  canAccessGlobalDashboard: boolean;
  canAccessTeamDashboard: boolean;
  canAccessPersonalDashboard: boolean;
  canAccessUserManagement: boolean;
  canAccessFinance: boolean;
  canAccessAnalytics: boolean;
  canAccessContracts: boolean;
  canAccessTuniclaim: boolean;
  
  // Data access
  canViewAllBordereaux: boolean;
  canViewTeamBordereaux: boolean;
  canViewAssignedBordereaux: boolean;
  canAssignBordereaux: boolean;
  canReassignBordereaux: boolean;
  
  // Actions
  canCreateUsers: boolean;
  canManageTeam: boolean;
  canEscalateReclamations: boolean;
  canAccessGlobalReports: boolean;
  canAccessTeamReports: boolean;
  
  // Restrictions
  isRestrictedToTeam: boolean;
  isRestrictedToAssigned: boolean;
  isRestrictedToDepartment: boolean;
}

export const useRoleAccess = (): RolePermissions => {
  const { user } = useAuth();
  const userRole = user?.role as UserRole;

  const getPermissions = (role: UserRole): RolePermissions => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return {
          // Full access to everything
          canAccessGlobalDashboard: true,
          canAccessTeamDashboard: true,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: true,
          canAccessFinance: true,
          canAccessAnalytics: true,
          canAccessContracts: true,
          canAccessTuniclaim: true,
          canViewAllBordereaux: true,
          canViewTeamBordereaux: true,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: true,
          canReassignBordereaux: true,
          canCreateUsers: true,
          canManageTeam: true,
          canEscalateReclamations: true,
          canAccessGlobalReports: true,
          canAccessTeamReports: true,
          isRestrictedToTeam: false,
          isRestrictedToAssigned: false,
          isRestrictedToDepartment: false,
        };

      case UserRole.ADMINISTRATEUR:
        return {
          // All modules + system parameters
          canAccessGlobalDashboard: true,
          canAccessTeamDashboard: true,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: true,
          canAccessFinance: true,
          canAccessAnalytics: true,
          canAccessContracts: true,
          canAccessTuniclaim: true,
          canViewAllBordereaux: true,
          canViewTeamBordereaux: true,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: true,
          canReassignBordereaux: true,
          canCreateUsers: true,
          canManageTeam: true,
          canEscalateReclamations: true,
          canAccessGlobalReports: true,
          canAccessTeamReports: true,
          isRestrictedToTeam: false,
          isRestrictedToAssigned: false,
          isRestrictedToDepartment: false,
        };

      case UserRole.RESPONSABLE_DEPARTEMENT:
        return {
          // Same view as Super Admin but read-only
          canAccessGlobalDashboard: true,
          canAccessTeamDashboard: true,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: true, // Can view users but read-only
          canAccessFinance: true,
          canAccessAnalytics: true,
          canAccessContracts: true,
          canAccessTuniclaim: true,
          canViewAllBordereaux: true,
          canViewTeamBordereaux: true,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: false, // Read-only: cannot assign
          canReassignBordereaux: false, // Read-only: cannot reassign
          canCreateUsers: false, // Read-only: cannot create users
          canManageTeam: false, // Read-only: cannot manage team
          canEscalateReclamations: false, // Read-only: cannot escalate
          canAccessGlobalReports: true,
          canAccessTeamReports: true,
          isRestrictedToTeam: false,
          isRestrictedToAssigned: false,
          isRestrictedToDepartment: false, // Can see all departments like Super Admin
        };

      case UserRole.CHEF_EQUIPE:
        return {
          // Team management, global inbox, team dashboard
          canAccessGlobalDashboard: false,
          canAccessTeamDashboard: true,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: false,
          canAccessFinance: true,
          canAccessAnalytics: false,
          canAccessContracts: false,
          canAccessTuniclaim: true,
          canViewAllBordereaux: false,
          canViewTeamBordereaux: true,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: true,
          canReassignBordereaux: true,
          canCreateUsers: false,
          canManageTeam: true,
          canEscalateReclamations: true,
          canAccessGlobalReports: false,
          canAccessTeamReports: true,
          isRestrictedToTeam: true,
          isRestrictedToAssigned: false,
          isRestrictedToDepartment: false,
        };

      case UserRole.GESTIONNAIRE:
        return {
          // Same access as Chef d'équipe but read-only (except for assigned dossiers)
          canAccessGlobalDashboard: false,
          canAccessTeamDashboard: true,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: false,
          canAccessFinance: false,
          canAccessAnalytics: false,
          canAccessContracts: false,
          canAccessTuniclaim: true,
          canViewAllBordereaux: true, // Can see all bordereaux (read-only)
          canViewTeamBordereaux: true,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: false, // Read-only: cannot assign
          canReassignBordereaux: false, // Read-only: cannot reassign
          canCreateUsers: false,
          canManageTeam: false, // Read-only: cannot manage team
          canEscalateReclamations: false, // Can only modify assigned reclamations
          canAccessGlobalReports: false,
          canAccessTeamReports: true,
          isRestrictedToTeam: true,
          isRestrictedToAssigned: true, // Can only modify assigned dossiers
          isRestrictedToDepartment: false,
        };

      case UserRole.FINANCE:
        return {
          // Finance modules only
          canAccessGlobalDashboard: false,
          canAccessTeamDashboard: false,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: false,
          canAccessFinance: true,
          canAccessAnalytics: false,
          canAccessContracts: false,
          canAccessTuniclaim: true,
          canViewAllBordereaux: false,
          canViewTeamBordereaux: false,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: false,
          canReassignBordereaux: false,
          canCreateUsers: false,
          canManageTeam: false,
          canEscalateReclamations: false,
          canAccessGlobalReports: false,
          canAccessTeamReports: false,
          isRestrictedToTeam: false,
          isRestrictedToAssigned: true,
          isRestrictedToDepartment: false,
        };

      default:
        // Minimal access for other roles
        return {
          canAccessGlobalDashboard: false,
          canAccessTeamDashboard: false,
          canAccessPersonalDashboard: true,
          canAccessUserManagement: false,
          canAccessFinance: false,
          canAccessAnalytics: false,
          canAccessContracts: false,
          canAccessTuniclaim: false,
          canViewAllBordereaux: false,
          canViewTeamBordereaux: false,
          canViewAssignedBordereaux: true,
          canAssignBordereaux: false,
          canReassignBordereaux: false,
          canCreateUsers: false,
          canManageTeam: false,
          canEscalateReclamations: false,
          canAccessGlobalReports: false,
          canAccessTeamReports: false,
          isRestrictedToTeam: false,
          isRestrictedToAssigned: true,
          isRestrictedToDepartment: false,
        };
    }
  };

  return getPermissions(userRole);
};

// Helper functions for common permission checks
export const useCanAccess = (module: string): boolean => {
  const permissions = useRoleAccess();
  
  switch (module) {
    case 'global-dashboard': return permissions.canAccessGlobalDashboard;
    case 'team-dashboard': return permissions.canAccessTeamDashboard;
    case 'user-management': return permissions.canAccessUserManagement;
    case 'finance': return permissions.canAccessFinance;
    case 'analytics': return permissions.canAccessAnalytics;
    case 'contracts': return permissions.canAccessContracts;
    case 'tuniclaim': return permissions.canAccessTuniclaim;
    default: return false;
  }
};

export const useCanManage = (action: string): boolean => {
  const permissions = useRoleAccess();
  
  switch (action) {
    case 'assign-bordereaux': return permissions.canAssignBordereaux;
    case 'reassign-bordereaux': return permissions.canReassignBordereaux;
    case 'manage-team': return permissions.canManageTeam;
    case 'escalate-reclamations': return permissions.canEscalateReclamations;
    case 'create-users': return permissions.canCreateUsers;
    default: return false;
  }
};