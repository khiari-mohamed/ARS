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
      READ: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE', 'BO', 'SCAN'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      DELETE: ['SUPER_ADMIN', 'ADMIN'],
      ASSIGN: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE'],
      EXPORT: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE']
    },
    CLIENTS: {
      CREATE: ['SUPER_ADMIN', 'ADMIN'],
      READ: ['SUPER_ADMIN', 'ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'],
      UPDATE: ['SUPER_ADMIN', 'ADMIN'],
      DELETE: ['SUPER_ADMIN'],
      MANAGE_SLA: ['SUPER_ADMIN', 'ADMIN']
    },
    FINANCE: {
      CREATE_OV: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
      READ_OV: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CHEF_EQUIPE'],
      UPDATE_OV_STATUS: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
      EXPORT_OV: ['SUPER_ADMIN', 'ADMIN', 'FINANCE']
    },
    WORKFLOW: {
      VIEW_ALL: ['SUPER_ADMIN', 'ADMIN'],
      MANAGE_TEAMS: ['SUPER_ADMIN', 'ADMIN'],
      CONFIGURE_WORKLOAD: ['SUPER_ADMIN', 'ADMIN']
    }
  };

  hasPermission(userRole: string, module: string, action: string): boolean {
    return this.permissions[module]?.[action]?.includes(userRole) || false;
  }

  getUserPermissions(userRole: string) {
    const result: Array<{ module: string; action: string; roles: string[] }> = [];
    Object.entries(this.permissions).forEach(([module, actions]) => {
      Object.entries(actions).forEach(([action, roles]) => {
        if (roles.includes(userRole)) {
          result.push({ module, action, roles });
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
}