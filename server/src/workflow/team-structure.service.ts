import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamStructureDto {
  name: string;
  serviceType: 'BO' | 'SCAN' | 'SANTE' | 'FINANCE';
  parentTeamId?: string;
  leaderId?: string;
  description?: string;
}

export interface TeamMemberDto {
  userId: string;
  role: string;
  permissions: string[];
  capacity?: number;
}

export interface PermissionMatrix {
  role: string;
  module: string;
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    assign: boolean;
    approve: boolean;
    export: boolean;
  };
}

@Injectable()
export class TeamStructureService {
  private readonly logger = new Logger(TeamStructureService.name);

  constructor(private prisma: PrismaService) {}

  // === TEAM STRUCTURE MANAGEMENT ===

  async createTeamStructure(dto: TeamStructureDto): Promise<any> {
    // Validate parent team if specified
    if (dto.parentTeamId) {
      const parentTeam = await this.prisma.teamStructure.findUnique({
        where: { id: dto.parentTeamId }
      });
      if (!parentTeam) {
        throw new BadRequestException('Parent team not found');
      }
    }

    // Validate leader if specified
    if (dto.leaderId) {
      const leader = await this.prisma.user.findUnique({
        where: { id: dto.leaderId, active: true }
      });
      if (!leader) {
        throw new BadRequestException('Team leader not found or inactive');
      }
    }

    return await this.prisma.teamStructure.create({
      data: {
        name: dto.name,
        serviceType: dto.serviceType,
        parentTeamId: dto.parentTeamId,
        leaderId: dto.leaderId,
        description: dto.description
      },
      include: {
        leader: { select: { fullName: true, role: true } },
        parentTeam: { select: { name: true } },
        subTeams: { select: { name: true, serviceType: true } }
      }
    });
  }

  async getTeamHierarchy(): Promise<any[]> {
    const rootTeams = await this.prisma.teamStructure.findMany({
      where: { parentTeamId: null, active: true },
      include: {
        leader: { select: { fullName: true, role: true } },
        subTeams: {
          include: {
            leader: { select: { fullName: true, role: true } },
            subTeams: {
              include: {
                leader: { select: { fullName: true, role: true } }
              }
            }
          }
        }
      },
      orderBy: { serviceType: 'asc' }
    });

    return rootTeams.map(team => this.buildTeamHierarchy(team));
  }

  private buildTeamHierarchy(team: any): any {
    return {
      id: team.id,
      name: team.name,
      serviceType: team.serviceType,
      description: team.description,
      leader: team.leader,
      memberCount: 0, // Would be calculated from actual assignments
      subTeams: team.subTeams?.map((subTeam: any) => this.buildTeamHierarchy(subTeam)) || []
    };
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    const team = await this.prisma.teamStructure.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Get users by service type and department
    const members = await this.prisma.user.findMany({
      where: {
        active: true,
        serviceType: team.serviceType,
        // Additional filtering could be added based on team assignments
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        department: true,
        capacity: true,
        createdAt: true
      }
    });

    return members.map(member => ({
      ...member,
      permissions: this.getUserPermissions(member.role, team.serviceType),
      workload: 0, // Would be calculated from actual assignments
      performance: 0 // Would be calculated from performance metrics
    }));
  }

  // === PERMISSION MATRIX MANAGEMENT ===

  getPermissionMatrix(): PermissionMatrix[] {
    return [
      // BUREAU D'ORDRE
      {
        role: 'BO',
        module: 'BORDEREAUX',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: true
        }
      },
      {
        role: 'BO',
        module: 'CLIENTS',
        permissions: {
          create: false,
          read: true,
          update: false,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      // SCAN
      {
        role: 'SCAN',
        module: 'DOCUMENTS',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      {
        role: 'SCAN',
        module: 'BORDEREAUX',
        permissions: {
          create: false,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      // CHEF D'ÉQUIPE
      {
        role: 'CHEF_EQUIPE',
        module: 'BORDEREAUX',
        permissions: {
          create: false,
          read: true,
          update: true,
          delete: false,
          assign: true,
          approve: true,
          export: true
        }
      },
      {
        role: 'CHEF_EQUIPE',
        module: 'TEAM_MANAGEMENT',
        permissions: {
          create: false,
          read: true,
          update: true,
          delete: false,
          assign: true,
          approve: true,
          export: true
        }
      },
      {
        role: 'CHEF_EQUIPE',
        module: 'RECLAMATIONS',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: true,
          approve: true,
          export: true
        }
      },
      // GESTIONNAIRE
      {
        role: 'GESTIONNAIRE',
        module: 'BORDEREAUX',
        permissions: {
          create: false,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      {
        role: 'GESTIONNAIRE',
        module: 'BULLETIN_SOINS',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      {
        role: 'GESTIONNAIRE',
        module: 'RECLAMATIONS',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: false,
          export: false
        }
      },
      // FINANCE
      {
        role: 'FINANCE',
        module: 'VIREMENTS',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: true,
          export: true
        }
      },
      {
        role: 'FINANCE',
        module: 'ORDRE_VIREMENT',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          assign: false,
          approve: true,
          export: true
        }
      },
      // SUPER ADMIN
      {
        role: 'SUPER_ADMIN',
        module: 'ALL',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: true,
          assign: true,
          approve: true,
          export: true
        }
      }
    ];
  }

  getUserPermissions(role: string, serviceType?: string): PermissionMatrix[] {
    const allPermissions = this.getPermissionMatrix();
    
    if (role === 'SUPER_ADMIN') {
      return allPermissions;
    }

    return allPermissions.filter(permission => 
      permission.role === role || 
      (serviceType && permission.role === serviceType)
    );
  }

  hasPermission(userRole: string, module: string, action: keyof PermissionMatrix['permissions']): boolean {
    const permissions = this.getUserPermissions(userRole);
    const modulePermission = permissions.find(p => p.module === module || p.module === 'ALL');
    
    return modulePermission ? modulePermission.permissions[action] : false;
  }

  // === WORKFLOW INTEGRATION ===

  async getServiceWorkflow(serviceType: 'BO' | 'SCAN' | 'SANTE' | 'FINANCE'): Promise<any> {
    const workflows = {
      BO: {
        name: 'Bureau d\'Ordre',
        description: 'Réception et saisie initiale des bordereaux',
        steps: [
          { order: 1, name: 'Réception physique', description: 'Réception des dossiers clients' },
          { order: 2, name: 'Saisie données', description: 'Saisie des informations dans le système' },
          { order: 3, name: 'Validation', description: 'Validation des données saisies' },
          { order: 4, name: 'Notification SCAN', description: 'Envoi notification au service SCAN' }
        ],
        nextService: 'SCAN',
        slaTarget: '2 heures',
        permissions: this.getUserPermissions('BO')
      },
      SCAN: {
        name: 'Service Numérisation',
        description: 'Numérisation et indexation des documents',
        steps: [
          { order: 1, name: 'Réception notification', description: 'Réception de la notification du BO' },
          { order: 2, name: 'Numérisation', description: 'Scan des documents physiques' },
          { order: 3, name: 'Indexation', description: 'Indexation et métadonnées' },
          { order: 4, name: 'Affectation équipe', description: 'Affectation automatique au chef d\'équipe' }
        ],
        nextService: 'SANTE',
        slaTarget: '4 heures',
        permissions: this.getUserPermissions('SCAN')
      },
      SANTE: {
        name: 'Équipe Santé',
        description: 'Traitement des dossiers médicaux',
        steps: [
          { order: 1, name: 'Réception dossier', description: 'Réception du dossier numérisé' },
          { order: 2, name: 'Affectation gestionnaire', description: 'Affectation par le chef d\'équipe' },
          { order: 3, name: 'Traitement médical', description: 'Analyse et traitement du dossier' },
          { order: 4, name: 'Validation', description: 'Validation et préparation virement' }
        ],
        nextService: 'FINANCE',
        slaTarget: '48 heures',
        permissions: this.getUserPermissions('CHEF_EQUIPE').concat(this.getUserPermissions('GESTIONNAIRE'))
      },
      FINANCE: {
        name: 'Service Financier',
        description: 'Gestion des virements et paiements',
        steps: [
          { order: 1, name: 'Réception OV', description: 'Réception de l\'ordre de virement' },
          { order: 2, name: 'Validation financière', description: 'Validation des montants et RIB' },
          { order: 3, name: 'Exécution virement', description: 'Exécution du virement bancaire' },
          { order: 4, name: 'Confirmation', description: 'Confirmation et clôture du dossier' }
        ],
        nextService: null,
        slaTarget: '24 heures',
        permissions: this.getUserPermissions('FINANCE')
      }
    };

    return workflows[serviceType];
  }

  async getTeamPerformanceByService(): Promise<any[]> {
    const services = ['BO', 'SCAN', 'SANTE', 'FINANCE'];
    const performance: any[] = [];

    for (const service of services) {
      const workflow = await this.getServiceWorkflow(service as any);
      const teams = await this.prisma.teamStructure.findMany({
        where: { serviceType: service, active: true },
        include: {
          leader: { select: { fullName: true } }
        }
      });

      // Calculate performance metrics (placeholder implementation)
      const metrics = await this.calculateServiceMetrics(service);

      performance.push({
        service,
        workflow,
        teams: teams.length,
        ...metrics
      });
    }

    return performance;
  }

  private async calculateServiceMetrics(serviceType: string): Promise<any> {
    // This would calculate real metrics from the database
    // Placeholder implementation
    return {
      avgProcessingTime: Math.random() * 24, // hours
      slaCompliance: 85 + Math.random() * 15, // percentage
      throughput: Math.floor(Math.random() * 100), // items per day
      backlog: Math.floor(Math.random() * 50), // pending items
      efficiency: 80 + Math.random() * 20 // percentage
    };
  }

  // === TEAM ASSIGNMENT OPTIMIZATION ===

  async optimizeTeamAssignments(): Promise<{
    recommendations: string[];
    reassignments: any[];
    estimatedImprovement: number;
  }> {
    const teams = await this.prisma.teamStructure.findMany({
      where: { active: true },
      include: {
        leader: { select: { fullName: true } }
      }
    });

    const recommendations: string[] = [];
    const reassignments: any[] = [];

    // Analyze current team distribution
    const serviceDistribution = teams.reduce((acc, team) => {
      acc[team.serviceType] = (acc[team.serviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for imbalanced services
    const totalTeams = teams.length;
    const expectedPerService = totalTeams / 4; // 4 services

    Object.entries(serviceDistribution).forEach(([service, count]) => {
      const deviation = Math.abs(count - expectedPerService);
      if (deviation > 1) {
        if (count > expectedPerService) {
          recommendations.push(`Service ${service} a ${count} équipes (${deviation} de plus que la moyenne)`);
        } else {
          recommendations.push(`Service ${service} manque d'équipes (${deviation} de moins que la moyenne)`);
        }
      }
    });

    // Check for teams without leaders
    const teamsWithoutLeaders = teams.filter(team => !team.leaderId);
    if (teamsWithoutLeaders.length > 0) {
      recommendations.push(`${teamsWithoutLeaders.length} équipe(s) sans chef d'équipe assigné`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Structure d\'équipe optimale');
    }

    return {
      recommendations,
      reassignments,
      estimatedImprovement: Math.max(0, 100 - recommendations.length * 10)
    };
  }

  async updateTeamStructure(teamId: string, updates: Partial<TeamStructureDto>): Promise<any> {
    const team = await this.prisma.teamStructure.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    return await this.prisma.teamStructure.update({
      where: { id: teamId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        leader: { select: { fullName: true, role: true } },
        parentTeam: { select: { name: true } },
        subTeams: { select: { name: true, serviceType: true } }
      }
    });
  }

  async deactivateTeam(teamId: string): Promise<any> {
    // Check if team has active members or sub-teams
    const subTeams = await this.prisma.teamStructure.findMany({
      where: { parentTeamId: teamId, active: true }
    });

    if (subTeams.length > 0) {
      throw new BadRequestException('Cannot deactivate team with active sub-teams');
    }

    return await this.prisma.teamStructure.update({
      where: { id: teamId },
      data: { active: false }
    });
  }
}