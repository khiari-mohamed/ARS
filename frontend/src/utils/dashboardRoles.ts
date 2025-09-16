/**
 * Frontend dashboard role utilities
 * Mirrors the backend role constants for consistent access control
 */

export const DASHBOARD_ROLES = {
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

  ADMIN_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR'
  ],

  MANAGEMENT_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR',
    'CHEF_EQUIPE',
    'RESPONSABLE_DEPARTEMENT'
  ],

  FINANCIAL_ROLES: [
    'SUPER_ADMIN',
    'ADMINISTRATEUR',
    'FINANCE'
  ]
} as const;

/**
 * Check if a role has dashboard access
 */
export function hasDashboardAccess(role?: string): boolean {
  if (!role) return false;
  return DASHBOARD_ROLES.ALL_DASHBOARD_ACCESS.includes(role as any);
}

/**
 * Check if a role has administrative privileges
 */
export function hasAdminAccess(role?: string): boolean {
  if (!role) return false;
  return DASHBOARD_ROLES.ADMIN_ROLES.includes(role as any);
}

/**
 * Check if a role has management privileges
 */
export function hasManagementAccess(role?: string): boolean {
  if (!role) return false;
  return DASHBOARD_ROLES.MANAGEMENT_ROLES.includes(role as any);
}

/**
 * Check if a role has financial access
 */
export function hasFinancialAccess(role?: string): boolean {
  if (!role) return false;
  return DASHBOARD_ROLES.FINANCIAL_ROLES.includes(role as any);
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role?: string): string {
  const roleNames: Record<string, string> = {
    'SUPER_ADMIN': 'Super Administrateur',
    'ADMINISTRATEUR': 'Administrateur',
    'CHEF_EQUIPE': 'Chef d\'Équipe',
    'GESTIONNAIRE': 'Gestionnaire',
    'FINANCE': 'Finance',
    'BO': 'Bureau d\'Ordre',
    'BUREAU_ORDRE': 'Bureau d\'Ordre',
    'SCAN_TEAM': 'Équipe Scan',
    'CLIENT_SERVICE': 'Service Client',
    'RESPONSABLE_DEPARTEMENT': 'Responsable Département'
  };
  
  return roleNames[role || ''] || role || 'Utilisateur';
}

/**
 * Check if user should see specific dashboard features
 */
export function canViewFeature(role?: string, feature?: string): boolean {
  if (!role || !feature) return false;
  
  switch (feature) {
    case 'department_stats':
    case 'client_stats':
    case 'global_corbeille':
    case 'workforce_estimator':
      return hasAdminAccess(role);
    
    case 'team_management':
    case 'assign_tasks':
      return hasManagementAccess(role);
    
    case 'financial_data':
    case 'virements':
      return hasFinancialAccess(role);
    
    case 'personal_tasks':
      return role === 'GESTIONNAIRE';
    
    case 'scan_queue':
      return role === 'SCAN_TEAM';
    
    case 'bo_queue':
      return role === 'BO' || role === 'BUREAU_ORDRE';
    
    case 'reclamations':
      return role === 'CLIENT_SERVICE' || hasManagementAccess(role);
    
    default:
      return hasDashboardAccess(role);
  }
}