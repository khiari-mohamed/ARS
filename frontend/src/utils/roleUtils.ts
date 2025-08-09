import { UserRole as ReclamationUserRole } from '../types/reclamation.d';
import { User, UserRole } from '../types/user.d';

/* =========================
   Reclamation Module Permissions
   ========================= */

export const canView = (role: ReclamationUserRole) => true;

export const canCreate = (role: ReclamationUserRole) =>
  ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE', 'SUPER_ADMIN'].includes(role);

export const canAssign = (role: ReclamationUserRole) =>
  ['CHEF_EQUIPE', 'CLIENT_SERVICE', 'SUPER_ADMIN'].includes(role);

export const canResolve = (role: ReclamationUserRole) =>
  ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(role);

export const canDelete = (role: ReclamationUserRole) =>
  ['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(role);

export const canEdit = (
  role: ReclamationUserRole,
  createdById: string,
  userId: string
) =>
  role === 'SUPER_ADMIN' ||
  role === 'CHEF_EQUIPE' ||
  (role === 'GESTIONNAIRE' && createdById === userId);

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
  // Responsable département can edit users in their department
  if (currentRole === 'RESPONSABLE_DEPARTEMENT' && 
      !['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(targetUser.role)) return true;
  // Chef d'équipe can edit their team members
  if (currentRole === 'CHEF_EQUIPE' && 
      ['GESTIONNAIRE', 'CHEF_EQUIPE'].includes(targetUser.role)) return true;
  return false;
}

export function canEditRole(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}

export function canResetPassword(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT'].includes(currentRole);
}

export function canViewUsers(currentRole: UserRole): boolean {
  // All roles can view users, but with different scopes
  return true;
}

export function canDisableUser(currentRole: UserRole): boolean {
  return ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentRole);
}