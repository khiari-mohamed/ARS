/**
 * Enum for all allowed user roles in the system.
 * Extend as needed for new roles.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  FINANCE = 'FINANCE',
  SCAN_TEAM = 'SCAN_TEAM',
  BO = 'BO',
  MANAGER = 'MANAGER',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
}

/**
 * Validate if a given role is a valid UserRole.
 * Throws an error if not valid.
 */
export function assertValidRole(role: string): asserts role is UserRole {
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new Error(`Invalid role: ${role}`);
  }
}