import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';

@Injectable()
export class TeamRoutingService {
  private readonly logger = new Logger(TeamRoutingService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async routeToTeam(bordereauId: string): Promise<string | null> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: {
            include: {
              gestionnaires: true
            }
          },
          contract: true
        }
      });

      if (!bordereau) return null;

      // Find appropriate chef d'équipe based on client's account manager
      let targetChef: any = null;

      // 1. Try to find chef based on client's account manager
      if (bordereau.client?.gestionnaires?.length > 0) {
        const accountManager = bordereau.client.gestionnaires[0];
        targetChef = await this.prisma.user.findFirst({
          where: {
            role: 'CHEF_EQUIPE',
            department: accountManager.department,
            active: true
          }
        });
      }

      // 2. Fallback: Find chef with lowest workload
      if (!targetChef) {
        const chefs = await this.prisma.user.findMany({
          where: { role: 'CHEF_EQUIPE', active: true },
          include: {
            _count: {
              select: {
                bordereauxCurrentHandler: {
                  where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
                }
              }
            }
          }
        });

        targetChef = chefs.sort((a, b) => 
          a._count.bordereauxCurrentHandler - b._count.bordereauxCurrentHandler
        )[0];
      }

      if (targetChef) {
        // Check for team overload
        const teamWorkload = await this.prisma.bordereau.count({
          where: {
            teamId: targetChef.id,
            statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER'] }
          }
        });

        // Alert if team is overloaded (>50 items)
        if (teamWorkload > 50) {
          await this.workflowNotifications.notifyTeamOverload(targetChef.id, teamWorkload);
        }

        // Update bordereau with team assignment
        await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: { 
            teamId: targetChef.id,
            statut: 'A_AFFECTER'
          }
        });

        // Notify chef of new item
        await this.workflowNotifications.notifyWorkflowTransition(
          bordereauId,
          'SCANNE',
          'A_AFFECTER'
        );

        this.logger.log(`Bordereau ${bordereau.reference} routed to team ${targetChef.fullName}`);
        return targetChef.id;
      }

      return null;
    } catch (error) {
      this.logger.error(`Team routing failed: ${error.message}`);
      return null;
    }
  }

  async autoAssignToGestionnaire(bordereauId: string, chefId: string): Promise<string | null> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });

      if (!bordereau) return null;

      // Find gestionnaires in the same team/department
      const gestionnaires = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true,
          // Add team/department filtering if available
        },
        include: {
          _count: {
            select: {
              bordereauxCurrentHandler: {
                where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
              }
            }
          }
        }
      });

      // Smart assignment based on:
      // 1. Client specialization (if available)
      // 2. Workload balancing
      // 3. Performance history

      let selectedGestionnaire: any = null;

      // Try to find gestionnaire who has handled this client before
      const clientSpecialist = await this.prisma.user.findFirst({
        where: {
          role: 'GESTIONNAIRE',
          active: true,
          bordereauxCurrentHandler: {
            some: {
              clientId: bordereau.clientId,
              statut: { in: ['TRAITE', 'CLOTURE'] }
            }
          }
        },
        include: {
          _count: {
            select: {
              bordereauxCurrentHandler: {
                where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
              }
            }
          }
        }
      });

      if (clientSpecialist && clientSpecialist._count.bordereauxCurrentHandler < 20) {
        selectedGestionnaire = clientSpecialist;
      } else {
        // Fallback: assign to gestionnaire with lowest workload
        selectedGestionnaire = gestionnaires
          .sort((a, b) => a._count.bordereauxCurrentHandler - b._count.bordereauxCurrentHandler)[0];
      }

      if (selectedGestionnaire) {
        await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: selectedGestionnaire.id,
            statut: 'ASSIGNE'
          }
        });

        await this.workflowNotifications.notifyWorkflowTransition(
          bordereauId,
          'A_AFFECTER',
          'ASSIGNE'
        );

        this.logger.log(`Bordereau ${bordereau.reference} assigned to ${selectedGestionnaire.fullName}`);
        return selectedGestionnaire.id;
      }

      return null;
    } catch (error) {
      this.logger.error(`Auto-assignment failed: ${error.message}`);
      return null;
    }
  }

  async reassignDossierToOtherTeam(bordereauId: string, fromTeamId: string, overflowAction: string): Promise<string | null> {
    // Get workload configuration for the overloaded team
    const workloadConfig = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId: fromTeamId }
    });

    // If auto-reassign is disabled, just return null
    if (workloadConfig && !workloadConfig.autoReassignEnabled) {
      this.logger.warn(`Auto-reassignment disabled for team ${fromTeamId}`);
      return null;
    }

    // Find eligible teams (excluding the overloaded team)
    const eligibleTeams = await this.prisma.user.findMany({
      where: {
        role: 'CHEF_EQUIPE',
        active: true,
        NOT: { id: fromTeamId }
      },
      include: {
        bordereauxTeam: {
          where: {
            statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] },
            archived: false
          }
        }
      }
    });

    if (eligibleTeams.length === 0) {
      this.logger.warn('No eligible teams found for reassignment');
      return null;
    }

    // Filter out teams that are also overloaded
    const availableTeams: Array<any & { currentLoad: number; maxLoad: number }> = [];
    for (const team of eligibleTeams) {
      const teamConfig = await this.prisma.teamWorkloadConfig.findFirst({
        where: { teamId: team.id }
      });
      const maxLoad = teamConfig?.maxLoad || 50; // Default threshold
      
      if (team.bordereauxTeam.length < maxLoad * 0.9) { // 90% of max load
        availableTeams.push({ ...team, currentLoad: team.bordereauxTeam.length, maxLoad });
      }
    }

    if (availableTeams.length === 0) {
      this.logger.warn('All teams are at capacity - escalating to Super Admin');
      await this.escalateToSuperAdmin(bordereauId, 'ALL_TEAMS_OVERLOADED');
      return null;
    }

    // Select team based on overflowAction from config or parameter
    const action = workloadConfig?.overflowAction || overflowAction || 'LOWEST_LOAD';
    let targetTeam: any;
    
    switch (action) {
      case 'LOWEST_LOAD':
        targetTeam = availableTeams.reduce((min, team) =>
          team.currentLoad < min.currentLoad ? team : min, availableTeams[0]);
        break;
      case 'ROUND_ROBIN':
        // Simple round-robin based on team ID hash
        const index = Math.abs(this.hashCode(fromTeamId)) % availableTeams.length;
        targetTeam = availableTeams[index];
        break;
      case 'CAPACITY_BASED':
        // Assign to team with highest remaining capacity percentage
        targetTeam = availableTeams.reduce((best, team) => {
          const bestCapacity = (best.maxLoad - best.currentLoad) / best.maxLoad;
          const teamCapacity = (team.maxLoad - team.currentLoad) / team.maxLoad;
          return teamCapacity > bestCapacity ? team : best;
        }, availableTeams[0]);
        break;
      default:
        targetTeam = availableTeams[0];
    }

    // Update the bordereau to assign to the new team
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { 
        teamId: targetTeam.id,
        statut: 'A_AFFECTER'
      }
    });

    // Log the reassignment
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'AUTO_REASSIGNMENT',
        details: {
          bordereauId,
          fromTeamId,
          toTeamId: targetTeam.id,
          reason: 'TEAM_OVERLOAD',
          action,
          fromLoad: await this.getTeamCurrentLoad(fromTeamId),
          toLoad: targetTeam.currentLoad
        }
      }
    });

    // Notify the new team chef
    await this.workflowNotifications.notifyWorkflowTransition(
      bordereauId,
      'REASSIGNED',
      'A_AFFECTER'
    );

    this.logger.log(`Bordereau ${bordereauId} auto-reassigned from team ${fromTeamId} to team ${targetTeam.id} using ${action}`);
    return targetTeam.id;
  }

  private async getTeamCurrentLoad(teamId: string): Promise<number> {
    return await this.prisma.bordereau.count({
      where: {
        teamId,
        statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] },
        archived: false
      }
    });
  }

  private async escalateToSuperAdmin(bordereauId: string, reason: string): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    for (const admin of superAdmins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ESCALATION_REQUIRED',
          title: 'Intervention requise - Surcharge générale',
          message: `Bordereau ${bordereauId} ne peut être affecté - toutes les équipes sont en surcharge`,
          data: { bordereauId, reason, timestamp: new Date().toISOString() }
        }
      });
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}