import { Injectable } from '@nestjs/common';

export interface PermissionMatrix {
  [module: string]: {
    [action: string]: string[];
  };
}

@Injectable()
export class PermissionMatrixService {
  private readonly permissions: PermissionMatrix = {
    BORDEREAUX: {
      CREATE: ['SUPER_ADMIN', 'ADMIN', 'BO'],
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'BO', 'SCAN'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      ASSIGN: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE']
    },
    CLIENTS: {
      CREATE: ['SUPER_ADMIN', 'ADMIN'],
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN'],
      DELETE: ['SUPER_ADMIN'],
      MANAGE_SLA: ['SUPER_ADMIN', 'ADMIN']
    },
    FINANCE: {
      CREATE_OV: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
      READ_OV: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'FINANCE', 'CHEF_EQUIPE'],
      VALIDATE_OV: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT'],
      UPDATE_OV_STATUS: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
      EXPORT_OV: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'FINANCE']
    },
    WORKFLOW: {
      VIEW_ALL: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT'],
      MANAGE_TEAMS: ['SUPER_ADMIN', 'ADMIN'],
      CONFIGURE_WORKLOAD: ['SUPER_ADMIN', 'ADMIN']
    },
    GED: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'BO', 'SCAN'],
      CREATE: ['SUPER_ADMIN', 'ADMIN', 'BO', 'SCAN'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE']
    },
    GEC: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      CREATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE']
    },
    RECLAMATIONS: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'],
      CREATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'CLIENT_SERVICE'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      DELETE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      ASSIGN: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE']
    },
    ANALYTICS: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE']
    },
    CONTRACTS: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'],
      CREATE: ['SUPER_ADMIN', 'ADMIN'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT']
    },
    USERS: {
      READ: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'],
      CREATE: ['SUPER_ADMIN', 'ADMIN'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      MANAGE_ROLES: ['SUPER_ADMIN', 'ADMIN']
    },
    DASHBOARD: {
      VIEW_GLOBAL: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT'],
      VIEW_TEAM: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'],
      VIEW_PERSONAL: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'FINANCE', 'BO', 'SCAN']
    }
  };

  hasPermission(userRole: string, module: string, action: string): boolean {
    return this.permissions[module]?.[action]?.includes(userRole) || false;
  }

  // Check if user has read-only access
  isReadOnlyRole(userRole: string): boolean {
    return userRole === 'RESPONSABLE_DEPARTEMENT';
  }

  getUserPermissions(userRole: string) {
    const result: Array<{ module: string; action: string; roles: string[]; isReadOnly?: boolean }> = [];
    const isReadOnly = this.isReadOnlyRole(userRole);
    
    Object.entries(this.permissions).forEach(([module, actions]) => {
      Object.entries(actions).forEach(([action, roles]) => {
        if (roles.includes(userRole)) {
          result.push({ 
            module, 
            action, 
            roles,
            isReadOnly: isReadOnly && !['READ', 'VIEW', 'EXPORT'].some(readAction => action.includes(readAction))
          });
        }
      });
    });
    return result;
  }

  getAllPermissions() {
    return this.permissions;
  }

  getModulePermissions(module: string) {
    return this.permissions[module] || {};
  }

  // Get modules accessible by role
  getAccessibleModules(userRole: string): string[] {
    const modules: string[] = [];
    Object.entries(this.permissions).forEach(([module, actions]) => {
      const hasAccess = Object.values(actions).some(roles => roles.includes(userRole));
      if (hasAccess) {
        modules.push(module);
      }
    });
    return modules;
  }

  // Check if role can perform any write operations on a module
  canModifyModule(userRole: string, module: string): boolean {
    if (this.isReadOnlyRole(userRole)) return false;
    
    const modulePermissions = this.permissions[module];
    if (!modulePermissions) return false;
    
    const writeActions = ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'MANAGE'];
    return Object.entries(modulePermissions).some(([action, roles]) => 
      writeActions.some(writeAction => action.includes(writeAction)) && roles.includes(userRole)
    );
  }
}