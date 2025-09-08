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
}