import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';

@Injectable()
export class BOWorkflowService {
  private readonly logger = new Logger(BOWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  /**
   * Get BO corbeille - documents waiting to be processed
   */
  async getBOCorbeille(userId: string) {
    try {
      // Get bordereaux that need BO processing
      const items = await this.prisma.bordereau.findMany({
        where: { 
          statut: 'EN_ATTENTE'
        },
        include: { 
          client: true, 
          contract: true 
        },
        orderBy: { dateReception: 'desc' }
      });

      const processedItems = items.map(item => ({
        id: item.id,
        type: 'bordereau',
        reference: item.reference,
        clientName: item.client?.name || 'Unknown',
        subject: `Nouveau bordereau - ${item.nombreBS || 0} BS`,
        priority: 'NORMAL',
        status: item.statut,
        createdAt: item.dateReception,
        slaStatus: 'ON_TIME',
        remainingTime: 24
      }));

      return {
        items: processedItems,
        stats: {
          pending: items.length
        }
      };
    } catch (error) {
      this.logger.error(`Error getting BO corbeille: ${error.message}`);
      return { items: [], stats: { pending: 0 } };
    }
  }

  /**
   * Process bordereau from BO - mark as ready for scan and notify SCAN team
   */
  async processBordereauForScan(bordereauId: string, userId: string) {
    try {
      // Update bordereau status to A_SCANNER
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'A_SCANNER',
          updatedAt: new Date()
        },
        include: { client: true }
      });

      // Notify SCAN team
      await this.notifyScanTeam(bordereau.id, bordereau.reference);

      this.logger.log(`BO processed bordereau ${bordereau.reference} for scan`);
      
      return { success: true, bordereau };
    } catch (error) {
      this.logger.error(`Error processing bordereau for scan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify SCAN team when bordereau is ready for scanning
   */
  private async notifyScanTeam(bordereauId: string, reference: string) {
    try {
      const scanUsers = await this.prisma.user.findMany({
        where: { role: 'SCAN', active: true }
      });

      for (const user of scanUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'NEW_BORDEREAU_SCAN',
            title: 'Nouveau bordereau à scanner',
            message: `Bordereau ${reference} prêt pour numérisation`,
            data: { bordereauId, reference },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create SCAN notification'));
      }

      this.logger.log(`Notified ${scanUsers.length} SCAN users about bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying SCAN team: ${error.message}`);
    }
  }
}