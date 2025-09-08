import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';
import { TeamRoutingService } from './team-routing.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AutomaticWorkflowService {
  private readonly logger = new Logger(AutomaticWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService,
    private teamRouting: TeamRoutingService
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processWorkflowQueue() {
    try {
      await this.processBOToScanTransitions();
      await this.processScanToChefTransitions();
      await this.processOverloadAlerts();
    } catch (error) {
      this.logger.error(`Workflow queue processing failed: ${error.message}`);
    }
  }

  private async processBOToScanTransitions() {
    const pendingBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: 'EN_ATTENTE',
        createdAt: {
          lte: new Date(Date.now() - 30000) // Older than 30 seconds
        }
      },
      take: 10
    });

    for (const bordereau of pendingBordereaux) {
      try {
        await this.prisma.bordereau.update({
          where: { id: bordereau.id },
          data: { statut: 'A_SCANNER' }
        });

        await this.workflowNotifications.notifyWorkflowTransition(
          bordereau.id,
          'EN_ATTENTE',
          'A_SCANNER'
        );

        this.logger.log(`Auto-transitioned bordereau ${bordereau.reference} to A_SCANNER`);
      } catch (error) {
        this.logger.error(`Failed to transition bordereau ${bordereau.id}: ${error.message}`);
      }
    }
  }

  private async processScanToChefTransitions() {
    const scannedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: 'SCANNE',
        teamId: null
      },
      include: {
        client: {
          include: {
            gestionnaires: true
          }
        }
      },
      take: 10
    });

    for (const bordereau of scannedBordereaux) {
      try {
        const assignedTeamId = await this.teamRouting.routeToTeam(bordereau.id);
        
        if (assignedTeamId) {
          this.logger.log(`Auto-routed bordereau ${bordereau.reference} to team ${assignedTeamId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to route bordereau ${bordereau.id}: ${error.message}`);
      }
    }
  }

  private async processOverloadAlerts() {
    const teams = await this.prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      include: {
        bordereauxTeam: {
          where: {
            statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    for (const team of teams) {
      const workload = team.bordereauxTeam.length;
      const overloadThreshold = 50;

      if (workload > overloadThreshold) {
        await this.workflowNotifications.notifyTeamOverload(team.id, workload);
        this.logger.warn(`Team ${team.fullName} is overloaded with ${workload} items`);
      }
    }
  }

  async forceWorkflowProgression(bordereauId: string, targetStatus: string, userId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      const currentStatus = bordereau.statut;
      const updateData: any = { statut: targetStatus };

      // Set appropriate dates based on target status
      switch (targetStatus) {
        case 'SCAN_EN_COURS':
          updateData.dateDebutScan = new Date();
          break;
        case 'SCANNE':
          updateData.dateFinScan = new Date();
          break;
        case 'TRAITE':
          updateData.dateReceptionSante = new Date();
          break;
        case 'VIREMENT_EXECUTE':
          updateData.dateExecutionVirement = new Date();
          break;
        case 'CLOTURE':
          updateData.dateCloture = new Date();
          break;
      }

      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: updateData
      });

      await this.workflowNotifications.notifyWorkflowTransition(
        bordereauId,
        currentStatus,
        targetStatus,
        userId
      );

      this.logger.log(`Force progressed bordereau ${bordereau.reference}: ${currentStatus} → ${targetStatus}`);

      return {
        success: true,
        message: `Bordereau progressed to ${targetStatus}`,
        previousStatus: currentStatus,
        newStatus: targetStatus
      };
    } catch (error) {
      this.logger.error(`Force workflow progression failed: ${error.message}`);
      throw error;
    }
  }

  async getSLABreaches() {
    const now = new Date();
    
    const breaches = await this.prisma.bordereau.findMany({
      where: {
        statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER'] },
        OR: [
          {
            dateReception: {
              lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            },
            delaiReglement: { lte: 30 }
          },
          {
            dateReception: {
              lte: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
            },
            delaiReglement: { lte: 15 }
          },
          {
            dateReception: {
              lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            },
            delaiReglement: { lte: 7 }
          }
        ]
      },
      include: {
        client: { select: { name: true } },
        currentHandler: { select: { fullName: true } }
      },
      orderBy: { dateReception: 'asc' }
    });

    return breaches.map(bordereau => {
      const daysSinceReception = Math.floor(
        (now.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysOverdue = daysSinceReception - bordereau.delaiReglement;

      return {
        id: bordereau.id,
        reference: bordereau.reference,
        clientName: bordereau.client?.name,
        assignedTo: bordereau.currentHandler?.fullName,
        daysSinceReception,
        slaLimit: bordereau.delaiReglement,
        daysOverdue,
        severity: daysOverdue > 10 ? 'CRITICAL' : daysOverdue > 5 ? 'HIGH' : 'MEDIUM'
      };
    });
  }

  async escalateSLABreaches() {
    const breaches = await this.getSLABreaches();
    const criticalBreaches = breaches.filter(b => b.severity === 'CRITICAL');

    for (const breach of criticalBreaches) {
      try {
        // Escalate to Super Admin
        const superAdmins = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', active: true }
        });

        for (const admin of superAdmins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SLA_CRITICAL_BREACH',
              title: 'Dépassement SLA Critique',
              message: `Bordereau ${breach.reference} en retard de ${breach.daysOverdue} jours`,
              data: {
                bordereauId: breach.id,
                severity: breach.severity,
                daysOverdue: breach.daysOverdue
              }
            }
          });
        }

        this.logger.warn(`Escalated critical SLA breach for bordereau ${breach.reference}`);
      } catch (error) {
        this.logger.error(`Failed to escalate SLA breach for ${breach.reference}: ${error.message}`);
      }
    }

    return {
      totalBreaches: breaches.length,
      criticalEscalated: criticalBreaches.length
    };
  }
}