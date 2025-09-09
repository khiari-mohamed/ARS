import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamStructureData {
  name: string;
  serviceType: 'BUREAU_ORDRE' | 'SCAN' | 'SANTE' | 'FINANCE';
  leaderId?: string;
  parentTeamId?: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  serviceType: string;
  capacity: number;
  currentLoad: number;
  efficiency: number;
  skills: string[];
}

export interface TeamPerformanceMetrics {
  teamId: string;
  teamName: string;
  totalMembers: number;
  avgEfficiency: number;
  totalCapacity: number;
  currentLoad: number;
  utilizationRate: number;
  completedTasks: number;
  pendingTasks: number;
  overloadedMembers: number;
}

@Injectable()
export class TeamManagementService {
  private readonly logger = new Logger(TeamManagementService.name);

  constructor(private prisma: PrismaService) {}

  // === TEAM STRUCTURE MANAGEMENT ===

  async createTeamStructure(data: TeamStructureData): Promise<any> {
    return this.prisma.teamStructure.create({
      data: {
        name: data.name,
        serviceType: data.serviceType,
        leaderId: data.leaderId,
        parentTeamId: data.parentTeamId,
        description: data.description,
        active: true
      },
      include: {
        leader: { select: { id: true, fullName: true, role: true } },
        parentTeam: { select: { id: true, name: true } }
      }
    });
  }

  async getTeamHierarchy(): Promise<any[]> {
    const teams = await this.prisma.teamStructure.findMany({
      where: { active: true },
      include: {
        leader: { select: { id: true, fullName: true, role: true } },
        parentTeam: { select: { id: true, name: true } },
        subTeams: {
          include: {
            leader: { select: { id: true, fullName: true, role: true } }
          }
        }
      },
      orderBy: { serviceType: 'asc' }
    });

    // Build hierarchy structure
    const rootTeams = teams.filter(t => !t.parentTeamId);
    return this.buildTeamHierarchy(rootTeams, teams);
  }

  private buildTeamHierarchy(rootTeams: any[], allTeams: any[]): any[] {
    return rootTeams.map(team => ({
      ...team,
      subTeams: this.buildTeamHierarchy(
        allTeams.filter(t => t.parentTeamId === team.id),
        allTeams
      )
    }));
  }

  // === SERVICE TEAMS (4 services: BO, SCAN, Santé, Finance) ===

  async getServiceTeams(): Promise<any[]> {
    const services = ['BUREAU_ORDRE', 'SCAN', 'SANTE', 'FINANCE'];
    
    const serviceTeams = await Promise.all(
      services.map(async (serviceType) => {
        const team = await this.prisma.teamStructure.findFirst({
          where: { serviceType, active: true },
          include: {
            leader: { select: { id: true, fullName: true, role: true } }
          }
        });

        const members = await this.getServiceMembers(serviceType);
        const performance = await this.getTeamPerformanceMetrics(team?.id || serviceType);

        return {
          serviceType,
          team,
          members,
          performance
        };
      })
    );

    return serviceTeams;
  }

  async getServiceMembers(serviceType: string): Promise<TeamMember[]> {
    const users = await this.prisma.user.findMany({
      where: { 
        serviceType,
        active: true 
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        serviceType: true,
        capacity: true
      }
    });

    const members = await Promise.all(
      users.map(async (user) => {
        const currentLoad = await this.getCurrentUserLoad(user.id);
        const efficiency = await this.getUserEfficiency(user.id);
        const skills = await this.getUserSkills(user.id);

        return {
          id: user.id,
          fullName: user.fullName,
          role: user.role,
          serviceType: user.serviceType || serviceType,
          capacity: user.capacity,
          currentLoad,
          efficiency,
          skills
        };
      })
    );

    return members;
  }

  // === SANTÉ TEAM STRUCTURE (Chef, Gestionnaire, Prod, Tiers Payant) ===

  async getSanteTeamStructure(): Promise<any> {
    const santeRoles = ['CHEF_EQUIPE', 'GESTIONNAIRE', 'PRODUCTEUR', 'TIERS_PAYANT'];
    
    const roleStructure = await Promise.all(
      santeRoles.map(async (role) => {
        const members = await this.prisma.user.findMany({
          where: {
            role,
            serviceType: 'SANTE',
            active: true
          },
          select: {
            id: true,
            fullName: true,
            role: true,
            capacity: true,
            teamLeaderId: true
          }
        });

        const performance = await Promise.all(
          members.map(async (member) => {
            const currentLoad = await this.getCurrentUserLoad(member.id);
            const efficiency = await this.getUserEfficiency(member.id);
            
            return {
              ...member,
              currentLoad,
              efficiency,
              utilizationRate: member.capacity > 0 ? (currentLoad / member.capacity) * 100 : 0
            };
          })
        );

        return {
          role,
          members: performance,
          totalMembers: members.length,
          avgUtilization: performance.length > 0 
            ? performance.reduce((acc, m) => acc + m.utilizationRate, 0) / performance.length 
            : 0
        };
      })
    );

    return {
      serviceType: 'SANTE',
      roles: roleStructure,
      hierarchy: {
        chef: roleStructure.find(r => r.role === 'CHEF_EQUIPE'),
        gestionnaires: roleStructure.find(r => r.role === 'GESTIONNAIRE'),
        producteurs: roleStructure.find(r => r.role === 'PRODUCTEUR'),
        tiersPayant: roleStructure.find(r => r.role === 'TIERS_PAYANT')
      }
    };
  }

  // === PERFORMANCE ANALYTICS ===

  async getTeamPerformanceMetrics(teamId: string): Promise<TeamPerformanceMetrics> {
    const team = await this.prisma.teamStructure.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      // Fallback for service-level metrics
      return this.getServicePerformanceMetrics(teamId);
    }

    const members = await this.getServiceMembers(team.serviceType);
    
    const totalCapacity = members.reduce((acc, m) => acc + m.capacity, 0);
    const currentLoad = members.reduce((acc, m) => acc + m.currentLoad, 0);
    const avgEfficiency = members.length > 0 
      ? members.reduce((acc, m) => acc + m.efficiency, 0) / members.length 
      : 0;

    const completedTasks = await this.getCompletedTasksCount(team.serviceType);
    const pendingTasks = await this.getPendingTasksCount(team.serviceType);
    const overloadedMembers = members.filter(m => m.currentLoad > m.capacity * 0.9).length;

    return {
      teamId,
      teamName: team.name,
      totalMembers: members.length,
      avgEfficiency,
      totalCapacity,
      currentLoad,
      utilizationRate: totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0,
      completedTasks,
      pendingTasks,
      overloadedMembers
    };
  }

  private async getServicePerformanceMetrics(serviceType: string): Promise<TeamPerformanceMetrics> {
    const members = await this.getServiceMembers(serviceType);
    
    const totalCapacity = members.reduce((acc, m) => acc + m.capacity, 0);
    const currentLoad = members.reduce((acc, m) => acc + m.currentLoad, 0);
    const avgEfficiency = members.length > 0 
      ? members.reduce((acc, m) => acc + m.efficiency, 0) / members.length 
      : 0;

    const completedTasks = await this.getCompletedTasksCount(serviceType);
    const pendingTasks = await this.getPendingTasksCount(serviceType);
    const overloadedMembers = members.filter(m => m.currentLoad > m.capacity * 0.9).length;

    return {
      teamId: serviceType,
      teamName: serviceType,
      totalMembers: members.length,
      avgEfficiency,
      totalCapacity,
      currentLoad,
      utilizationRate: totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0,
      completedTasks,
      pendingTasks,
      overloadedMembers
    };
  }

  async getPerformanceEvolution(teamId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<any[]> {
    const days = period === 'daily' ? 30 : period === 'weekly' ? 84 : 365;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get historical performance data
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'PERFORMANCE_SNAPSHOT',
        timestamp: { gte: startDate },
        details: {
          path: ['teamId'],
          equals: teamId
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // If no historical data, create current snapshot
    if (auditLogs.length === 0) {
      const currentMetrics = await this.getTeamPerformanceMetrics(teamId);
      await this.createPerformanceSnapshot(teamId, currentMetrics);
      
      return [{
        date: new Date(),
        ...currentMetrics
      }];
    }

    return auditLogs.map(log => ({
      date: log.timestamp,
      ...(log.details as any)
    }));
  }

  private async createPerformanceSnapshot(teamId: string, metrics: TeamPerformanceMetrics): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'PERFORMANCE_SNAPSHOT',
        details: {
          teamId,
          timestamp: new Date().toISOString(),
          utilizationRate: metrics.utilizationRate,
          avgEfficiency: metrics.avgEfficiency,
          completedTasks: metrics.completedTasks,
          pendingTasks: metrics.pendingTasks,
          overloadedMembers: metrics.overloadedMembers
        }
      }
    });
  }

  // === OVERLOAD DETECTION & ALERTS ===

  async detectTeamOverload(): Promise<any[]> {
    const services = ['BUREAU_ORDRE', 'SCAN', 'SANTE', 'FINANCE'];
    const overloadAlerts: any[] = [];

    for (const serviceType of services) {
      const metrics = await this.getServicePerformanceMetrics(serviceType);
      
      // Configurable thresholds
      const warningThreshold = 85; // 85% utilization
      const criticalThreshold = 95; // 95% utilization

      if (metrics.utilizationRate >= criticalThreshold) {
        overloadAlerts.push({
          teamId: serviceType,
          teamName: serviceType,
          severity: 'CRITICAL',
          utilizationRate: metrics.utilizationRate,
          overloadedMembers: metrics.overloadedMembers,
          message: `Équipe ${serviceType} en surcharge critique (${metrics.utilizationRate.toFixed(1)}%)`
        });

        await this.alertSuperAdminOverload(serviceType, metrics, 'CRITICAL');
      } else if (metrics.utilizationRate >= warningThreshold) {
        overloadAlerts.push({
          teamId: serviceType,
          teamName: serviceType,
          severity: 'WARNING',
          utilizationRate: metrics.utilizationRate,
          overloadedMembers: metrics.overloadedMembers,
          message: `Équipe ${serviceType} approche la surcharge (${metrics.utilizationRate.toFixed(1)}%)`
        });

        await this.alertSuperAdminOverload(serviceType, metrics, 'WARNING');
      }
    }

    return overloadAlerts;
  }

  private async alertSuperAdminOverload(serviceType: string, metrics: TeamPerformanceMetrics, severity: string): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    for (const admin of superAdmins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'TEAM_OVERLOAD',
          title: `Alerte surcharge équipe ${serviceType}`,
          message: `L'équipe ${serviceType} est en ${severity.toLowerCase()} (${metrics.utilizationRate.toFixed(1)}% d'utilisation)`,
          data: {
            serviceType,
            severity,
            utilizationRate: metrics.utilizationRate,
            avgEfficiency: metrics.avgEfficiency,
            overloadedMembers: metrics.overloadedMembers
          }
        }
      });
    }

    // Create alert log
    await this.prisma.alertLog.create({
      data: {
        alertType: 'TEAM_OVERLOAD',
        alertLevel: severity,
        message: `Équipe ${serviceType} - ${severity} overload detected`,
        notifiedRoles: ['SUPER_ADMIN'],
        resolved: false
      }
    });
  }

  // === AUTOMATIC REAFFECTATION ===

  async handleTeamOverload(serviceType: string): Promise<any> {
    const metrics = await this.getServicePerformanceMetrics(serviceType);
    
    if (metrics.utilizationRate < 90) {
      return { message: 'No overload detected', action: 'none' };
    }

    // Try automatic rebalancing first
    const rebalanceResult = await this.rebalanceServiceWorkload(serviceType);
    
    if (rebalanceResult.rebalanced > 0) {
      return {
        message: `Automatic rebalancing completed: ${rebalanceResult.rebalanced} tasks redistributed`,
        action: 'automatic_rebalance',
        details: rebalanceResult
      };
    }

    // If automatic rebalancing not sufficient, alert for manual intervention
    await this.alertSuperAdminOverload(serviceType, metrics, 'MANUAL_INTERVENTION_REQUIRED');
    
    return {
      message: 'Automatic rebalancing insufficient - Manual intervention required',
      action: 'manual_intervention_required',
      metrics
    };
  }

  private async rebalanceServiceWorkload(serviceType: string): Promise<any> {
    const members = await this.getServiceMembers(serviceType);
    const overloaded = members.filter(m => m.currentLoad > m.capacity * 0.9);
    const underloaded = members.filter(m => m.currentLoad < m.capacity * 0.7);

    let rebalanced = 0;
    const actions: any[] = [];

    for (const overloadedMember of overloaded) {
      const excessLoad = Math.ceil(overloadedMember.currentLoad - (overloadedMember.capacity * 0.8));
      
      // Find tasks to redistribute
      const tasks = await this.getReassignableTasks(overloadedMember.id, excessLoad);
      
      for (const task of tasks) {
        const bestAssignee = underloaded.find(u => u.currentLoad < u.capacity * 0.8);
        if (bestAssignee) {
          await this.reassignTask(task.id, task.type, overloadedMember.id, bestAssignee.id);
          
          actions.push({
            taskId: task.id,
            taskType: task.type,
            fromUserId: overloadedMember.id,
            toUserId: bestAssignee.id
          });
          
          bestAssignee.currentLoad++;
          rebalanced++;
        }
      }
    }

    return { rebalanced, actions };
  }

  private async getReassignableTasks(userId: string, limit: number): Promise<any[]> {
    // Get bordereaux that can be reassigned
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return bordereaux.map(b => ({ id: b.id, type: 'bordereau' }));
  }

  private async reassignTask(taskId: string, taskType: string, fromUserId: string, toUserId: string): Promise<void> {
    if (taskType === 'bordereau') {
      await this.prisma.bordereau.update({
        where: { id: taskId },
        data: { currentHandlerId: toUserId }
      });
    }

    // Log the reassignment
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'AUTOMATIC_REASSIGNMENT',
        details: {
          taskId,
          taskType,
          fromUserId,
          toUserId,
          reason: 'workload_rebalancing'
        }
      }
    });
  }

  // === HELPER METHODS ===

  private async getCurrentUserLoad(userId: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });
  }

  private async getUserEfficiency(userId: string): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: last30Days }
      }
    });

    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        updatedAt: { gte: last30Days }
      }
    });

    return assigned > 0 ? (completed / assigned) * 100 : 80;
  }

  private async getUserSkills(userId: string): Promise<string[]> {
    // This would typically come from a skills assessment system
    // For now, return default skills based on role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    const roleSkills = {
      'CHEF_EQUIPE': ['MANAGEMENT', 'ASSIGNMENT', 'ESCALATION'],
      'GESTIONNAIRE': ['BS_PROCESSING', 'CLIENT_COMMUNICATION', 'QUALITY_CONTROL'],
      'PRODUCTEUR': ['DATA_ENTRY', 'DOCUMENT_PROCESSING', 'VERIFICATION'],
      'TIERS_PAYANT': ['PAYMENT_PROCESSING', 'RECONCILIATION', 'COMPLIANCE']
    };

    return roleSkills[user?.role as keyof typeof roleSkills] || ['GENERAL'];
  }

  private async getCompletedTasksCount(serviceType: string): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prisma.bordereau.count({
      where: {
        statut: 'TRAITE',
        updatedAt: { gte: last30Days },
        currentHandler: {
          serviceType
        }
      }
    });
  }

  private async getPendingTasksCount(serviceType: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER'] },
        currentHandler: {
          serviceType
        }
      }
    });
  }
}