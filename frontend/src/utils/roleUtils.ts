import { User, UserRole } from '../types/user.d';

/* =========================
   User Management Module Permissions
   ========================= */

export function canCreateUser(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}

export function canEditUser(currentRole: UserRole, targetUser: User): boolean {
  // Super admin can edit anyone
  if (currentRole === 'SUPER_ADMIN') return true;
  // Admin can edit anyone except super admin
  if (currentRole === 'ADMINISTRATEUR' && targetUser.role !== 'SUPER_ADMIN') return true;
  // RESPONSABLE_DEPARTEMENT has read-only access - cannot edit
  if (currentRole === 'RESPONSABLE_DEPARTEMENT') return false;
  // Chef d'équipe can edit their team members
  if (currentRole === 'CHEF_EQUIPE' && 
      ['GESTIONNAIRE', 'CLIENT_SERVICE'].includes(targetUser.role)) return true;
  return false;
}

// Check if user has read-only access
export function isReadOnlyRole(currentRole: UserRole): boolean {
  return currentRole === 'RESPONSABLE_DEPARTEMENT';
}

export function canEditRole(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}

export function canResetPassword(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}

export function canViewUsers(currentRole: UserRole): boolean {
  // All roles can view users, but with different scopes
  return true;
}

export function canDisableUser(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}

export function canManageUser(currentRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'SUPER_ADMIN': 10,
    'ADMINISTRATEUR': 8,
    'RESPONSABLE_DEPARTEMENT': 6,
    'CHEF_EQUIPE': 5,
    'GESTIONNAIRE': 3,
    'CLIENT_SERVICE': 3,
    'FINANCE': 3,
    'SCAN_TEAM': 2,
    'BO': 2
  };
  
  return (roleHierarchy[currentRole] || 0) > (roleHierarchy[targetRole] || 0);
}

/* =========================
   Legacy Reclamation Module Permissions (for backward compatibility)
   ========================= */

export const canView = (role: string) => true;

export const canCreate = (role: string) =>
  ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE', 'SUPER_ADMIN'].includes(role) && !isReadOnlyRole(role as UserRole);

export const canAssign = (role: string) =>
  ['CHEF_EQUIPE', 'CLIENT_SERVICE', 'SUPER_ADMIN'].includes(role) && !isReadOnlyRole(role as UserRole);

export const canResolve = (role: string) =>
  ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(role) && !isReadOnlyRole(role as UserRole);

export const canDelete = (role: string) =>
  ['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(role) && !isReadOnlyRole(role as UserRole);

export const canEdit = (
  role: string,
  createdById: string,
  userId: string
) =>
  role === 'SUPER_ADMIN' ||
  role === 'CHEF_EQUIPE' ||
  (role === 'GESTIONNAIRE' && createdById === userId);