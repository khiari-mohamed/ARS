import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';

@Injectable()
export class ScanWorkflowService {
  private readonly logger = new Logger(ScanWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  /**
   * Get SCAN team corbeille - bordereaux ready for scanning
   */
  async getScanCorbeille(userId: string) {
    try {
      const [toScan, scanning, completed] = await Promise.all([
        // Ready to scan
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'A_SCANNER',
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateReception: 'asc' }
        }),

        // Currently scanning
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'SCAN_EN_COURS',
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateDebutScan: 'asc' }
        }),

        // Recently completed
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'SCANNE',
            dateFinScan: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            },
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateFinScan: 'desc' }
        })
      ]);

      const processItems = (items: any[], status: string) => items.map(item => ({
        id: item.id,
        type: 'bordereau',
        reference: item.reference,
        clientName: item.client?.name || 'Unknown',
        subject: `${item.nombreBS || 0} BS à scanner`,
        priority: 'NORMAL',
        status,
        createdAt: item.dateReception,
        slaStatus: 'ON_TIME',
        remainingTime: 24
      }));

      return {
        toScan: processItems(toScan, 'A_SCANNER'),
        scanning: processItems(scanning, 'SCAN_EN_COURS'),
        completed: processItems(completed, 'SCANNE'),
        stats: {
          toScan: toScan.length,
          scanning: scanning.length,
          completed: completed.length
        }
      };
    } catch (error) {
      this.logger.error(`Error getting SCAN corbeille: ${error.message}`);
      return { 
        toScan: [], 
        scanning: [], 
        completed: [],
        stats: { toScan: 0, scanning: 0, completed: 0 } 
      };
    }
  }

  /**
   * Start scanning a bordereau
   */
  async startScan(bordereauId: string, userId: string) {
    try {
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'SCAN_EN_COURS',
          dateDebutScan: new Date(),
          currentHandlerId: userId
        },
        include: { client: true }
      });

      // Log activity for chart
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'SCAN_STARTED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            client: bordereau.client?.name
          }
        }
      });

      this.logger.log(`Started scanning bordereau ${bordereau.reference}`);
      return { success: true, bordereau };
    } catch (error) {
      this.logger.error(`Error starting scan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete scanning and auto-assign to chef d'équipe
   */
  async completeScan(bordereauId: string, userId: string) {
    try {
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'SCANNE',
          dateFinScan: new Date()
        },
        include: { client: { include: { gestionnaires: true } } }
      });

      // Log activity for chart
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'SCAN_COMPLETED',
          details: {
            bordereauId,
            reference: bordereau.reference,
            client: bordereau.client?.name
          }
        }
      });

      // Auto-progress to A_AFFECTER and notify chef
      await this.autoProgressToAssignment(bordereau);

      this.logger.log(`Completed scanning bordereau ${bordereau.reference}`);
      return { success: true, bordereau };
    } catch (error) {
      this.logger.error(`Error completing scan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-progress to assignment stage and notify chef d'équipe
   */
  private async autoProgressToAssignment(bordereau: any) {
    try {
      // Update status to ready for assignment
      await this.prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { statut: 'A_AFFECTER' }
      });

      // Notify chef d'équipe based on client's chargé de compte
      await this.notifyChefForAssignment(bordereau.id, bordereau.reference, bordereau.client);

      this.logger.log(`Auto-progressed bordereau ${bordereau.reference} to assignment stage`);
    } catch (error) {
      this.logger.error(`Error auto-progressing to assignment: ${error.message}`);
    }
  }

  /**
   * Notify chef d'équipe when bordereau is ready for assignment
   */
  private async notifyChefForAssignment(bordereauId: string, reference: string, client: any) {
    try {
      let targetChefs: any[] = [];

      // Find chefs responsible for this client's gestionnaires
      if (client?.gestionnaires && client.gestionnaires.length > 0) {
        targetChefs = await this.prisma.user.findMany({
          where: { 
            role: 'CHEF_EQUIPE', 
            active: true 
          }
        });
      } else {
        // Fallback: notify all chefs
        targetChefs = await this.prisma.user.findMany({
          where: { role: 'CHEF_EQUIPE', active: true }
        });
      }

      for (const chef of targetChefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'BORDEREAU_READY_ASSIGNMENT',
            title: 'Bordereau prêt pour affectation',
            message: `Bordereau ${reference} (${client?.name}) scanné et prêt pour affectation`,
            data: { bordereauId, reference, clientName: client?.name },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create Chef notification'));
      }

      this.logger.log(`Notified ${targetChefs.length} Chef(s) about scanned bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying Chef for assignment: ${error.message}`);
    }
  }
}