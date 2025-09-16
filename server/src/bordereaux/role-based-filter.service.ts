import { Injectable } from '@nestjs/common';
import { UserRole } from '../auth/user-role.enum';

@Injectable()
export class RoleBasedFilterService {
  
  /**
   * Get data filters based on user role
   */
  getDataFilters(user: any, baseFilters: any = {}) {
    const role = user?.role;
    const userId = user?.id;
    
    switch (role) {
      case UserRole.SUPER_ADMIN:
        // Super Admin sees everything - no additional filters
        return baseFilters;
        
      case UserRole.ADMINISTRATEUR:
        // Admin sees everything - no additional filters
        return baseFilters;
        
      case UserRole.CHEF_EQUIPE:
        // Chef d'équipe sees:
        // 1. Unassigned bordereaux (for assignment)
        // 2. Bordereaux assigned to their team members
        // 3. Bordereaux they personally handle
        return {
          ...baseFilters,
          OR: [
            { assignedToUserId: null }, // Unassigned
            { assignedToUserId: userId }, // Personally assigned
            { 
              assignedTo: {
                teamId: user?.teamId // Team members (if team structure exists)
              }
            }
          ]
        };
        
      case UserRole.GESTIONNAIRE:
        // Gestionnaire only sees their assigned bordereaux
        return {
          ...baseFilters,
          assignedToUserId: userId
        };
        
      case UserRole.FINANCE:
        // Finance sees bordereaux in financial stages
        return {
          ...baseFilters,
          statut: {
            in: ['VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'TRAITE', 'CLOTURE']
          }
        };
        
      case UserRole.SCAN_TEAM:
        // Scan team sees bordereaux in scan stages
        return {
          ...baseFilters,
          statut: {
            in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE']
          }
        };
        
      case UserRole.BO:
      case UserRole.BUREAU_ORDRE:
        // BO sees new and initial stage bordereaux
        return {
          ...baseFilters,
          statut: {
            in: ['EN_ATTENTE', 'A_SCANNER', 'RECU']
          }
        };
        
      default:
        // Restrictive default - only user's own data
        return {
          ...baseFilters,
          assignedToUserId: userId
        };
    }
  }
  
  /**
   * Check if user can access specific bordereau
   */
  canAccessBordereau(user: any, bordereau: any): boolean {
    const role = user?.role;
    const userId = user?.id;
    
    switch (role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.ADMINISTRATEUR:
        return true;
        
      case UserRole.CHEF_EQUIPE:
        return (
          !bordereau.assignedToUserId || // Unassigned
          bordereau.assignedToUserId === userId || // Personally assigned
          bordereau.assignedTo?.teamId === user?.teamId // Team member
        );
        
      case UserRole.GESTIONNAIRE:
        return bordereau.assignedToUserId === userId;
        
      case UserRole.FINANCE:
        return ['VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'TRAITE', 'CLOTURE'].includes(bordereau.statut);
        
      case UserRole.SCAN_TEAM:
        return ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'].includes(bordereau.statut);
        
      case UserRole.BO:
      case UserRole.BUREAU_ORDRE:
        return ['EN_ATTENTE', 'A_SCANNER', 'RECU'].includes(bordereau.statut);
        
      default:
        return bordereau.assignedToUserId === userId;
    }
  }
  
  /**
   * Get role-specific dashboard data filters
   */
  getDashboardFilters(user: any) {
    const role = user?.role;
    const userId = user?.id;
    
    const filters: any = {
      kpis: {},
      performance: {},
      alerts: {}
    };
    
    switch (role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.ADMINISTRATEUR:
        // No restrictions - see all data
        break;
        
      case UserRole.CHEF_EQUIPE:
        // Team-specific data only
        filters.kpis.teamFilter = user?.teamId;
        filters.performance.teamFilter = user?.teamId;
        filters.alerts.teamFilter = user?.teamId;
        break;
        
      case UserRole.GESTIONNAIRE:
        // Personal data only
        filters.kpis.userFilter = userId;
        filters.performance.userFilter = userId;
        filters.alerts.userFilter = userId;
        break;
        
      case UserRole.FINANCE:
        // Financial data only
        filters.kpis.moduleFilter = 'FINANCE';
        filters.performance.moduleFilter = 'FINANCE';
        break;
        
      default:
        // Restrictive default
        filters.kpis.userFilter = userId;
        filters.performance.userFilter = userId;
        filters.alerts.userFilter = userId;
    }
    
    return filters;
  }
}