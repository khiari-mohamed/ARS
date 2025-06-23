/**
 * Maps backend roles to frontend analytics roles.
 */
export const analyticsRoleMap: Record<string, string> = {
  ADMIN: 'ADMINISTRATEUR',
  SUPER_ADMIN: 'ADMINISTRATEUR',
  ADMINISTRATEUR: 'ADMINISTRATEUR',
  CHEF_EQUIPE: 'CHEF_EQUIPE',
  GESTIONNAIRE: 'GESTIONNAIRE',
  CLIENT_SERVICE: 'CLIENT_SERVICE',
  FINANCE: 'FINANCE',
  BO: 'BO',
  SCAN: 'SCAN',
};

export function normalizeAnalyticsRole(role: string): string {
  return analyticsRoleMap[role] || role;
}