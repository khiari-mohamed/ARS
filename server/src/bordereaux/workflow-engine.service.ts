import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { Statut } from '@prisma/client';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Complete workflow progression according to cahier de charges
   */
  async progressBordereauWorkflow(bordereauId: string, trigger: string, userId?: string): Promise<any> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true, contract: true }
      });
      
      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      let newStatus: Statut | null = null;
      let updateData: any = {};
      let notifications: string[] = [];

      switch (trigger) {
        case 'BO_CREATED':
          // Bureau d'Ordre creates -> ready for scan
          newStatus = Statut.A_SCANNER;
          notifications.push('SCAN_TEAM');
          this.logger.log(`BO created bordereau ${bordereauId}, notifying SCAN team`);
          break;
          
        case 'SCAN_STARTED':
          // Scan service starts processing
          newStatus = Statut.SCAN_EN_COURS;
          updateData.dateDebutScan = new Date();
          break;
          
        case 'SCAN_COMPLETED':
          // Scan completed -> ready for assignment to health team
          newStatus = Statut.A_AFFECTER;
          updateData.dateFinScan = new Date();
          notifications.push('CHEF_EQUIPE');
          // Auto-assign to available gestionnaire
          setTimeout(() => this.autoAssignToGestionnaire(bordereauId), 1000);
          this.logger.log(`Scan completed for ${bordereauId}, notifying Chef d'équipe`);
          break;
          
        case 'CHEF_ASSIGNED':
          // Chef d'équipe assigned to gestionnaire -> in progress
          newStatus = Statut.ASSIGNE;
          updateData.dateReceptionSante = new Date();
          updateData.assignedToUserId = userId;
          notifications.push('GESTIONNAIRE');
          break;
          
        case 'GESTIONNAIRE_STARTED':
          newStatus = Statut.EN_COURS;
          break;
          
        case 'GESTIONNAIRE_COMPLETED':
          // Gestionnaire completed -> ready for payment
          newStatus = Statut.TRAITE;
          notifications.push('FINANCE');
          break;

        case 'GESTIONNAIRE_INSTANCE':
          // Gestionnaire puts in instance
          newStatus = Statut.MIS_EN_INSTANCE;
          notifications.push('CHEF_EQUIPE');
          break;

        case 'GESTIONNAIRE_REJECTED':
          // Gestionnaire rejects
          newStatus = Statut.REJETE;
          notifications.push('CHEF_EQUIPE');
          break;

        case 'GESTIONNAIRE_RETURNED':
          // Gestionnaire returns to chef
          newStatus = Statut.EN_DIFFICULTE;
          updateData.assignedToUserId = null; // Clear assignment
          notifications.push('CHEF_EQUIPE');
          break;
          
        case 'PAYMENT_INITIATED':
          newStatus = Statut.VIREMENT_EN_COURS;
          updateData.dateDepotVirement = new Date();
          break;
          
        case 'PAYMENT_EXECUTED':
          newStatus = Statut.VIREMENT_EXECUTE;
          updateData.dateExecutionVirement = new Date();
          break;
          
        case 'CLOSED':
          newStatus = Statut.CLOTURE;
          updateData.dateCloture = new Date();
          break;
      }
      
      if (newStatus && newStatus !== bordereau.statut) {
        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            statut: newStatus,
            ...updateData
          }
        });
        
        // Send notifications
        for (const role of notifications) {
          await this.sendWorkflowNotification(bordereauId, role, newStatus);
        }
        
        // Log workflow action
        await this.logWorkflowAction(bordereauId, bordereau.statut, newStatus, trigger, userId);
        
        this.logger.log(`Workflow progression: ${bordereau.statut} -> ${newStatus} for bordereau ${bordereauId}`);
        
        return updated;
      }
      
      return bordereau;
    } catch (error) {
      this.logger.error(`Error in workflow progression for ${bordereauId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-assign to available gestionnaire after scan
   */
  private async autoAssignToGestionnaire(bordereauId: string): Promise<void> {
    try {
      const availableUsers = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true,
        },
      });
      
      if (availableUsers.length === 0) {
        this.logger.warn('No available gestionnaires for auto-assignment');
        return;
      }
      
      // Find user with lowest workload
      const workloads = await Promise.all(availableUsers.map(async user => {
        const count = await this.prisma.bordereau.count({
          where: { assignedToUserId: user.id, statut: { not: 'CLOTURE' } },
        });
        return { user, count };
      }));
      
      workloads.sort((a, b) => a.count - b.count);
      const selectedUser = workloads[0].user;
      
      await this.progressBordereauWorkflow(bordereauId, 'CHEF_ASSIGNED', selectedUser.id);
      
      this.logger.log(`Auto-assigned bordereau ${bordereauId} to gestionnaire ${selectedUser.id}`);
    } catch (error) {
      this.logger.error(`Error auto-assigning to gestionnaire: ${error.message}`);
    }
  }

  /**
   * Send workflow-based notifications
   */
  private async sendWorkflowNotification(bordereauId: string, targetRole: string, newStatus: Statut): Promise<void> {
    try {
      let alertType = 'WORKFLOW_NOTIFICATION';
      let message = `Bordereau ${bordereauId} status changed to ${newStatus}`;

      switch (targetRole) {
        case 'SCAN_TEAM':
          alertType = 'NEW_BORDEREAU';
          message = `New bordereau ${bordereauId} ready for scanning`;
          break;
        case 'CHEF_EQUIPE':
          alertType = 'READY_FOR_ASSIGNMENT';
          message = `Bordereau ${bordereauId} ready for assignment`;
          break;
        case 'GESTIONNAIRE':
          alertType = 'ASSIGNED_BORDEREAU';
          message = `Bordereau ${bordereauId} assigned to you`;
          break;
        case 'FINANCE':
          alertType = 'READY_FOR_PAYMENT';
          message = `Bordereau ${bordereauId} ready for payment processing`;
          break;
      }

      await this.alertsService.triggerAlert({
        type: alertType,
        bsId: bordereauId,
      });

    } catch (error) {
      this.logger.error(`Error sending workflow notification: ${error.message}`);
    }
  }

  /**
   * Log workflow actions for audit trail
   */
  private async logWorkflowAction(
    bordereauId: string, 
    fromStatus: Statut, 
    toStatus: Statut, 
    trigger: string, 
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.actionLog.create({
        data: {
          bordereauId,
          action: `WORKFLOW_${trigger}`,
          timestamp: new Date(),
          details: {
            fromStatus,
            toStatus,
            trigger,
            userId,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error logging workflow action: ${error.message}`);
    }
  }

  /**
   * Get workflow statistics for dashboard
   */
  async getWorkflowStatistics(): Promise<any> {
    try {
      const stats = await this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: {
          id: true
        }
      });

      const workflowStats = {
        bureauOrdre: {
          total: stats.find(s => s.statut === 'EN_ATTENTE')?._count.id || 0,
          readyForScan: stats.find(s => s.statut === 'A_SCANNER')?._count.id || 0
        },
        scanTeam: {
          toScan: stats.find(s => s.statut === 'A_SCANNER')?._count.id || 0,
          scanning: stats.find(s => s.statut === 'SCAN_EN_COURS')?._count.id || 0,
          completed: stats.find(s => s.statut === 'SCANNE')?._count.id || 0
        },
        chefEquipe: {
          toAssign: stats.find(s => s.statut === 'A_AFFECTER')?._count.id || 0,
          assigned: stats.find(s => s.statut === 'ASSIGNE')?._count.id || 0,
          inProgress: stats.find(s => s.statut === 'EN_COURS')?._count.id || 0,
          difficulties: stats.find(s => s.statut === 'EN_DIFFICULTE')?._count.id || 0
        },
        gestionnaires: {
          assigned: stats.find(s => s.statut === 'ASSIGNE')?._count.id || 0,
          inProgress: stats.find(s => s.statut === 'EN_COURS')?._count.id || 0,
          processed: stats.find(s => s.statut === 'TRAITE')?._count.id || 0,
          instance: stats.find(s => s.statut === 'MIS_EN_INSTANCE')?._count.id || 0,
          rejected: stats.find(s => s.statut === 'REJETE')?._count.id || 0
        },
        finance: {
          readyForPayment: stats.find(s => s.statut === 'PRET_VIREMENT')?._count.id || 0,
          paymentInProgress: stats.find(s => s.statut === 'VIREMENT_EN_COURS')?._count.id || 0,
          paymentExecuted: stats.find(s => s.statut === 'VIREMENT_EXECUTE')?._count.id || 0,
          paymentRejected: stats.find(s => s.statut === 'VIREMENT_REJETE')?._count.id || 0
        },
        global: {
          total: stats.reduce((sum, s) => sum + s._count.id, 0),
          closed: stats.find(s => s.statut === 'CLOTURE')?._count.id || 0
        }
      };

      return workflowStats;
    } catch (error) {
      this.logger.error(`Error getting workflow statistics: ${error.message}`);
      return {};
    }
  }

  /**
   * Check for SLA breaches and send alerts
   */
  async checkSLABreaches(): Promise<void> {
    try {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          statut: { not: 'CLOTURE' }
        },
        include: { client: true, contract: true }
      });

      const today = new Date();
      
      for (const bordereau of bordereaux) {
        const daysElapsed = Math.floor(
          (today.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const slaThreshold = bordereau.delaiReglement;
        
        if (daysElapsed > slaThreshold) {
          await this.alertsService.triggerAlert({
            type: 'SLA_BREACH',
            bsId: bordereau.id,
          });
        } else if (daysElapsed > slaThreshold - 3) {
          await this.alertsService.triggerAlert({
            type: 'SLA_WARNING',
            bsId: bordereau.id,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error checking SLA breaches: ${error.message}`);
    }
  }
}