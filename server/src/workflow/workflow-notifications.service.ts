import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowNotificationsService {
  private readonly logger = new Logger(WorkflowNotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async notifyWorkflowTransition(bordereauId: string, fromStatus: string, toStatus: string, userId?: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { 
          client: {
            include: {
              gestionnaires: true
            }
          },
          currentHandler: true,
          team: true
        }
      });

      if (!bordereau) return;

      // Determine who to notify based on status transition
      const notifications = await this.getNotificationTargets(toStatus, bordereau, fromStatus);
      
      for (const notification of notifications) {
        await this.createNotification(notification);
      }

      // Create audit log for workflow transition
      if (userId) {
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'WORKFLOW_TRANSITION',
            details: {
              bordereauId,
              reference: bordereau.reference,
              fromStatus,
              toStatus,
              timestamp: new Date().toISOString()
            }
          }
        }).catch(() => {}); // Silent fail for audit logs
      }

      this.logger.log(`Workflow notifications sent for bordereau ${bordereau.reference}: ${fromStatus} → ${toStatus}`);
    } catch (error) {
      this.logger.error(`Failed to send workflow notifications: ${error.message}`);
    }
  }

  private async getNotificationTargets(status: string, bordereau: any, fromStatus?: string) {
    const notifications: any[] = [];

    switch (status) {
      case 'A_SCANNER':
        // BO → SCAN notification
        const scanUsers = await this.prisma.user.findMany({
          where: { role: 'SCAN_TEAM', active: true }
        });
        if (scanUsers.length === 0) {
          // Fallback to SCAN role
          const fallbackScanUsers = await this.prisma.user.findMany({
            where: { role: 'SCAN', active: true }
          });
          notifications.push(...fallbackScanUsers.map((user: any) => ({
            userId: user.id,
            type: 'WORKFLOW_ASSIGNMENT',
            title: 'Nouveau bordereau à scanner',
            message: `Bordereau ${bordereau.reference} (${bordereau.client?.name}) prêt pour numérisation`,
            data: { bordereauId: bordereau.id, action: 'SCAN' }
          })));
        } else {
          notifications.push(...scanUsers.map((user: any) => ({
            userId: user.id,
            type: 'WORKFLOW_ASSIGNMENT',
            title: 'Nouveau bordereau à scanner',
            message: `Bordereau ${bordereau.reference} (${bordereau.client?.name}) prêt pour numérisation`,
            data: { bordereauId: bordereau.id, action: 'SCAN' }
          })));
        }
        break;

      case 'A_AFFECTER':
        // SCAN → Chef d'équipe notification - target specific chef based on client
        let targetChef = null;
        if (bordereau.client?.gestionnaires?.length > 0) {
          const accountManager = bordereau.client.gestionnaires.find((g: any) => g.role === 'CHEF_EQUIPE');
          if (accountManager) {
            targetChef = accountManager as any;
          }
        }
        
        if (!targetChef) {
          // Fallback to all chefs
          const chefUsers = await this.prisma.user.findMany({
            where: { role: 'CHEF_EQUIPE', active: true }
          });
          notifications.push(...chefUsers.map((user: any) => ({
            userId: user.id,
            type: 'WORKFLOW_ASSIGNMENT',
            title: 'Bordereau scanné à affecter',
            message: `Bordereau ${bordereau.reference} scanné, prêt pour affectation`,
            data: { bordereauId: bordereau.id, action: 'ASSIGN' }
          })));
        } else {
          notifications.push({
            userId: (targetChef as any).id,
            type: 'WORKFLOW_ASSIGNMENT',
            title: 'Bordereau scanné à affecter',
            message: `Bordereau ${bordereau.reference} de votre client ${bordereau.client?.name} prêt pour affectation`,
            data: { bordereauId: bordereau.id, action: 'ASSIGN' }
          });
        }
        break;

      case 'ASSIGNE':
        // Chef → Gestionnaire notification
        if (bordereau.assignedToUserId) {
          notifications.push({
            userId: bordereau.assignedToUserId,
            type: 'TASK_ASSIGNED',
            title: 'Nouveau dossier assigné',
            message: `Bordereau ${bordereau.reference} vous a été assigné pour traitement`,
            data: { bordereauId: bordereau.id, action: 'PROCESS' }
          });
        }
        break;

      case 'EN_DIFFICULTE':
        // Gestionnaire → Chef notification (escalation)
        if (bordereau.teamId) {
          // Notify specific chef
          notifications.push({
            userId: bordereau.teamId,
            type: 'ESCALATION',
            title: 'Dossier en difficulté',
            message: `Bordereau ${bordereau.reference} signalé en difficulté par le gestionnaire`,
            data: { bordereauId: bordereau.id, action: 'REVIEW' }
          });
        } else {
          // Fallback to all chefs
          const chefs = await this.prisma.user.findMany({
            where: { role: 'CHEF_EQUIPE', active: true }
          });
          notifications.push(...chefs.map((user: any) => ({
            userId: user.id,
            type: 'ESCALATION',
            title: 'Dossier en difficulté',
            message: `Bordereau ${bordereau.reference} signalé en difficulté par le gestionnaire`,
            data: { bordereauId: bordereau.id, action: 'REVIEW' }
          })));
        }
        break;

      case 'TRAITE':
        // Notify chef that bordereau is processed
        if (bordereau.teamId) {
          notifications.push({
            userId: bordereau.teamId,
            type: 'TASK_COMPLETED',
            title: 'Bordereau traité',
            message: `Bordereau ${bordereau.reference} a été traité avec succès`,
            data: { bordereauId: bordereau.id, action: 'COMPLETED' }
          });
        }
        break;

      case 'PRET_VIREMENT':
        // Notify finance team
        const financeUsers = await this.prisma.user.findMany({
          where: { role: 'FINANCE', active: true }
        });
        notifications.push(...financeUsers.map((user: any) => ({
          userId: user.id,
          type: 'WORKFLOW_ASSIGNMENT',
          title: 'Bordereau prêt pour virement',
          message: `Bordereau ${bordereau.reference} prêt pour traitement financier`,
          data: { bordereauId: bordereau.id, action: 'FINANCE_PROCESS' }
        })));
        break;
    }

    return notifications;
  }

  private async createNotification(notification: any) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: false
        }
      });
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
    }
  }

  async notifyTeamOverload(teamId: string, workloadCount: number) {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', active: true }
      });

      for (const admin of superAdmins) {
        await this.createNotification({
          userId: admin.id,
          type: 'TEAM_OVERLOAD',
          title: 'Équipe surchargée',
          message: `L'équipe a ${workloadCount} dossiers en attente - intervention requise`,
          data: { teamId, workloadCount, action: 'REBALANCE' }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send overload notification: ${error.message}`);
    }
  }
}