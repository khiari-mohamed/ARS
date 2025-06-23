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
  return currentRole === 'ADMINISTRATEUR';
}

export function canEditUser(currentRole: UserRole, targetUser: User): boolean {
  // Only admin can edit any user, except their own role
  if (currentRole === 'ADMINISTRATEUR') return true;
  // Chef d'équipe can edit their own profile (except role/department)
  if (currentRole === 'CHEF_EQUIPE' && targetUser.role === 'CHEF_EQUIPE') return true;
  // Gestionnaire, Service Client, Finance: only their own profile (except role/department)
  return false;
}

export function canEditRole(currentRole: UserRole): boolean {
  return currentRole === 'ADMINISTRATEUR';
}

export function canResetPassword(currentRole: UserRole): boolean {
  return currentRole === 'ADMINISTRATEUR';
}

export function canViewUsers(currentRole: UserRole): boolean {
  // Gestionnaire cannot view users at all
  return currentRole !== 'GESTIONNAIRE';
}

export function canDisableUser(currentRole: UserRole): boolean {
  return currentRole === 'ADMINISTRATEUR';
}