/**
 * Enum for all allowed user roles in the system.
 * Extend as needed for new roles.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
  RESPONSABLE_DEPARTEMENT = 'RESPONSABLE_DEPARTEMENT',
  CHEF_EQUIPE = 'CHEF_EQUIPE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  CLIENT_SERVICE = 'CLIENT_SERVICE',
  SERVICE_CLIENT = 'SERVICE_CLIENT', // Service client profile as gestionnaire role
  FINANCE = 'FINANCE',
  SCAN_TEAM = 'SCAN_TEAM',
  BO = 'BO',
  BUREAU_ORDRE = 'BUREAU_ORDRE', // Alternative name for BO
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