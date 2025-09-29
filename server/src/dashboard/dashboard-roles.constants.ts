/**
 * Dashboard role-based access constants
 * Defines which roles can access different dashboard features
 */

export const DASHBOARD_ROLES = {
  // All roles that can access the dashboard
  ALL_DASHBOARD_ACCESS: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR', 
    'CHEF_EQUIPE',
    'GESTIONNAIRE',
    'FINANCE',
    'BO',
    'BUREAU_ORDRE',
    'SCAN_TEAM',
    'CLIENT_SERVICE',
    'RESPONSABLE_DEPARTEMENT'
  ],

  // Roles with full administrative access
  ADMIN_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR'
  ],

  // Roles with team management capabilities
  MANAGEMENT_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR',
    'CHEF_EQUIPE',
    'RESPONSABLE_DEPARTEMENT'
  ],

  // Roles with operational access
  OPERATIONAL_ROLES: [
    'GESTIONNAIRE',
    'BO',
    'BUREAU_ORDRE',
    'SCAN_TEAM',
    'CLIENT_SERVICE'
  ],

  // Roles with financial access
  FINANCIAL_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR',
    'RESPONSABLE_DEPARTEMENT', // Read-only financial access
    'FINANCE'
  ],

  // Roles with Super Admin level access (same view as Super Admin)
  SUPER_ADMIN_LEVEL_ACCESS: [
    'SUPER_ADMIN',
    'RESPONSABLE_DEPARTEMENT' // Same visibility as Super Admin but read-only
  ]
} as const;

/**
 * Check if a role has dashboard access
 */
export function hasDashboardAccess(role: string): boolean {
  return DASHBOARD_ROLES.ALL_DASHBOARD_ACCESS.includes(role as any);
}

/**
 * Check if a role has administrative privileges
 */
export function hasAdminAccess(role: string): boolean {
  return DASHBOARD_ROLES.ADMIN_ROLES.includes(role as any);
}

/**
 * Check if a role has management privileges
 */
export function hasManagementAccess(role: string): boolean {
  return DASHBOARD_ROLES.MANAGEMENT_ROLES.includes(role as any);
}

/**
 * Check if a role has financial access
 */
export function hasFinancialAccess(role: string): boolean {
  return DASHBOARD_ROLES.FINANCIAL_ROLES.includes(role as any);
}

/**
 * Check if a role has Super Admin level access
 */
export function hasSuperAdminLevelAccess(role: string): boolean {
  return DASHBOARD_ROLES.SUPER_ADMIN_LEVEL_ACCESS.includes(role as any);
}

/**
 * Get role-specific permissions
 */
export function getRolePermissions(role: string): string[] {
  const permissions: string[] = ['VIEW_DASHBOARD'];

  if (hasAdminAccess(role)) {
    permissions.push('VIEW_ALL', 'EXPORT', 'MANAGE_USERS', 'SYSTEM_CONFIG');
  }

  if (hasSuperAdminLevelAccess(role)) {
    permissions.push('VIEW_ALL', 'EXPORT');
    // RESPONSABLE_DEPARTEMENT gets read-only access to everything
    if (role === 'RESPONSABLE_DEPARTEMENT') {
      permissions.push('READ_only');
    }
  }

  if (hasManagementAccess(role)) {
    permissions.push('VIEW_TEAM', 'ASSIGN_TASKS', 'VIEW_PERFORMANCE');
  }

  if (hasFinancialAccess(role)) {
    permissions.push('VIEW_FINANCE');
    // Only actual finance role and admins can confirm virements
    if (role === 'FINANCE' || hasAdminAccess(role)) {
      permissions.push('CONFIRM_VIREMENTS', 'EXPORT_FINANCE');
    }
  }

  // Role-specific permissions
  switch (role) {
    case 'RESPONSABLE_DEPARTEMENT':
      // Same view as Super Admin but read-only
      permissions.push('VIEW_ALL', 'VIEW_TEAM', 'VIEW_PERFORMANCE', 'VIEW_FINANCE', 'VIEW_BO', 'VIEW_SCAN', 'VIEW_CLIENT_SERVICE');
      break;
    case 'GESTIONNAIRE':
      permissions.push('VIEW_PERSONAL', 'PROCESS_TASKS');
      break;
    case 'BO':
    case 'BUREAU_ORDRE':
      permissions.push('VIEW_BO', 'CREATE_BORDEREAU', 'NOTIFY_SCAN');
      break;
    case 'SCAN_TEAM':
      permissions.push('VIEW_SCAN', 'UPLOAD_DOCUMENTS', 'MARK_SCANNED');
      break;
    case 'CLIENT_SERVICE':
      permissions.push('VIEW_CLIENT_SERVICE', 'MANAGE_RECLAMATIONS', 'CONTACT_CLIENTS');
      break;
  }

  return permissions;
}