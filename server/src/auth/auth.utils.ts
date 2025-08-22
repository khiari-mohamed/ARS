import { UserRole } from './user-role.enum';

/**
 * Check if user has SUPER_ADMIN role
 */
export function isSuperAdmin(user: any): boolean {
  return user?.role === 'SUPER_ADMIN' || user?.role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user has any of the specified roles or is SUPER_ADMIN
 */
export function hasRole(user: any, ...roles: string[]): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }
  return roles.includes(user?.role);
}