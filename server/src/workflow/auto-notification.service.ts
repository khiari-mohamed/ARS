import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutoNotificationService {
  private readonly logger = new Logger(AutoNotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * BO → SCAN: Notify SCAN team when new bordereau is created
   */
  async notifyBOToScan(bordereauId: string, reference: string): Promise<void> {
    try {
      const scanUsers = await this.prisma.user.findMany({
        where: { role: 'SCAN_TEAM', active: true }
      });

      for (const user of scanUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'NEW_BORDEREAU_SCAN',
            title: 'Nouveau bordereau à scanner',
            message: `Bordereau ${reference} prêt pour numérisation`,
            data: { bordereauId, reference, source: 'BO' },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create SCAN notification'));
      }

      // Create workflow notification for system tracking
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'BO',
          toService: 'SCAN',
          bordereauId,
          message: `Bordereau ${reference} créé par BO, prêt pour scan`,
          type: 'BORDEREAU_READY_SCAN',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`✅ Notified ${scanUsers.length} SCAN team members about new bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying SCAN team: ${error.message}`);
    }
  }

  /**
   * SCAN → CHEF: Notify Chef when scan is completed and bordereau needs assignment
   */
  async notifyScanToChef(bordereauId: string, reference: string, clientId: string): Promise<void> {
    try {
      // Get client with account managers
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: { gestionnaires: true }
      });

      // Find responsible chefs based on account managers
      let targetChefs: any[] = [];
      
      if (client?.gestionnaires && client.gestionnaires.length > 0) {
        // Find chefs who manage these account managers
        const accountManagerIds = client.gestionnaires.map(g => g.id);
        targetChefs = await this.prisma.user.findMany({
          where: { 
            role: 'CHEF_EQUIPE', 
            active: true,
            // Add team relationship logic here if needed
          }
        });
      } else {
        // Fallback: notify all active chefs
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
            data: { 
              bordereauId, 
              reference, 
              clientName: client?.name,
              accountManagers: client?.gestionnaires?.map(g => g.fullName) || []
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create Chef notification'));
      }

      // Create workflow notification
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'SCAN',
          toService: 'CHEF_EQUIPE',
          bordereauId,
          message: `Bordereau ${reference} scanné, prêt pour affectation`,
          type: 'BORDEREAU_SCANNED',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`✅ Notified ${targetChefs.length} Chef(s) about scanned bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying Chef for assignment: ${error.message}`);
    }
  }

  /**
   * CHEF → GESTIONNAIRE: Notify gestionnaire when bordereau is assigned
   */
  async notifyChefToGestionnaire(bordereauId: string, reference: string, gestionnaireId: string, chefName?: string): Promise<void> {
    try {
      const gestionnaire = await this.prisma.user.findUnique({
        where: { id: gestionnaireId }
      });

      if (!gestionnaire) {
        this.logger.warn(`Gestionnaire ${gestionnaireId} not found`);
        return;
      }

      await this.prisma.notification.create({
        data: {
          userId: gestionnaireId,
          type: 'BORDEREAU_ASSIGNED',
          title: 'Nouveau bordereau assigné',
          message: `Bordereau ${reference} vous a été assigné${chefName ? ` par ${chefName}` : ''}`,
          data: { 
            bordereauId, 
            reference,
            assignedBy: chefName
          },
          read: false
        }
      }).catch(() => this.logger.warn('Failed to create gestionnaire notification'));

      // Create workflow notification
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'CHEF_EQUIPE',
          toService: 'GESTIONNAIRE',
          bordereauId,
          userId: gestionnaireId,
          message: `Bordereau ${reference} assigné à ${gestionnaire.fullName}`,
          type: 'BORDEREAU_ASSIGNED',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`✅ Notified gestionnaire ${gestionnaire.fullName} about assigned bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying gestionnaire: ${error.message}`);
    }
  }

  /**
   * GESTIONNAIRE → CHEF: Notify Chef when gestionnaire returns a bordereau
   */
  async notifyGestionnaireToChef(bordereauId: string, reference: string, reason: string, gestionnaireId: string): Promise<void> {
    try {
      const gestionnaire = await this.prisma.user.findUnique({
        where: { id: gestionnaireId }
      });

      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true }
      });

      for (const chef of chefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'BORDEREAU_RETURNED',
            title: 'Bordereau retourné',
            message: `Bordereau ${reference} retourné par ${gestionnaire?.fullName || 'gestionnaire'}: ${reason}`,
            data: { 
              bordereauId, 
              reference, 
              reason, 
              returnedBy: gestionnaire?.fullName,
              returnedById: gestionnaireId
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create return notification'));
      }

      // Create workflow notification
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'GESTIONNAIRE',
          toService: 'CHEF_EQUIPE',
          bordereauId,
          userId: gestionnaireId,
          message: `Bordereau ${reference} retourné: ${reason}`,
          type: 'BORDEREAU_RETURNED',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`✅ Notified ${chefs.length} Chef(s) about returned bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying Chef of return: ${error.message}`);
    }
  }

  /**
   * AUTO-ASSIGNMENT FAILURE: Notify Super Admin when auto-assignment fails
   */
  async notifyAssignmentFailure(bordereauId: string, reference: string, reason: string): Promise<void> {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', active: true }
      });

      for (const admin of superAdmins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'ASSIGNMENT_FAILURE',
            title: 'Échec d\'affectation automatique',
            message: `Impossible d'affecter automatiquement le bordereau ${reference}: ${reason}`,
            data: { 
              bordereauId, 
              reference, 
              reason,
              severity: 'HIGH'
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create assignment failure notification'));
      }

      // Create workflow notification
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'SYSTEM',
          toService: 'SUPER_ADMIN',
          bordereauId,
          message: `Échec affectation automatique: ${reference} - ${reason}`,
          type: 'ASSIGNMENT_FAILURE',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`🚨 Notified ${superAdmins.length} Super Admin(s) about assignment failure for bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying Super Admin of assignment failure: ${error.message}`);
    }
  }

  /**
   * TEAM OVERLOAD: Check and notify Super Admin about team overload
   */
  async checkAndNotifyTeamOverload(): Promise<void> {
    try {
      // Get all chefs with their team workload
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true },
        include: {
          bordereauxTeam: {
            where: { 
              statut: { notIn: ['CLOTURE', 'TRAITE'] },
              archived: false
            }
          }
        }
      });

      const overloadThreshold = 50; // Configurable threshold
      const overloadedTeams = chefs.filter(chef => chef.bordereauxTeam.length > overloadThreshold);

      if (overloadedTeams.length > 0) {
        const superAdmins = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', active: true }
        });

        for (const admin of superAdmins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'TEAM_OVERLOAD_ALERT',
              title: 'Alerte surcharge équipe',
              message: `${overloadedTeams.length} équipe(s) en surcharge détectée(s)`,
              data: { 
                overloadedTeams: overloadedTeams.map(chef => ({ 
                  id: chef.id, 
                  name: chef.fullName, 
                  workload: chef.bordereauxTeam.length,
                  threshold: overloadThreshold
                })),
                severity: 'HIGH'
              },
              read: false
            }
          }).catch(() => this.logger.warn('Failed to create overload notification'));
        }

        // Create workflow notification
        await this.prisma.workflowNotification.create({
          data: {
            fromService: 'SYSTEM',
            toService: 'SUPER_ADMIN',
            message: `${overloadedTeams.length} équipe(s) en surcharge détectée(s)`,
            type: 'TEAM_OVERLOAD',
            status: 'SENT'
          }
        }).catch(() => this.logger.warn('Failed to create workflow notification'));

        this.logger.log(`⚠️ Notified Super Admins about ${overloadedTeams.length} overloaded team(s)`);
      }
    } catch (error) {
      this.logger.error(`Error checking team overload: ${error.message}`);
    }
  }

  /**
   * SLA BREACH: Notify relevant users about SLA breaches
   */
  async notifySLABreach(bordereauId: string, reference: string, daysOverdue: number): Promise<void> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { 
          currentHandler: true,
          client: true
        }
      });

      if (!bordereau) return;

      // Escalation chain
      const notificationTargets: string[] = [];
      
      // 1. Current handler
      if (bordereau.currentHandler) {
        notificationTargets.push(bordereau.currentHandler.id);
      }

      // 2. Chef d'équipe
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true }
      });
      notificationTargets.push(...chefs.map(c => c.id));

      // 3. Super Admin if severely overdue
      if (daysOverdue > 7) {
        const superAdmins = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', active: true }
        });
        notificationTargets.push(...superAdmins.map(s => s.id));
      }

      // Send notifications
      for (const userId of notificationTargets) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'SLA_BREACH',
            title: 'Alerte SLA dépassé',
            message: `Bordereau ${reference} en retard de ${daysOverdue} jour(s)`,
            data: { 
              bordereauId, 
              reference,
              daysOverdue,
              clientName: bordereau.client?.name,
              severity: daysOverdue > 7 ? 'CRITICAL' : 'HIGH'
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create SLA breach notification'));
      }

      // Create workflow notification
      await this.prisma.workflowNotification.create({
        data: {
          fromService: 'SYSTEM',
          toService: 'ALL',
          bordereauId,
          message: `SLA dépassé: ${reference} (${daysOverdue} jours de retard)`,
          type: 'SLA_BREACH',
          status: 'SENT'
        }
      }).catch(() => this.logger.warn('Failed to create workflow notification'));

      this.logger.log(`🚨 Notified ${notificationTargets.length} users about SLA breach for bordereau ${reference}`);
    } catch (error) {
      this.logger.error(`Error notifying SLA breach: ${error.message}`);
    }
  }

  /**
   * Get workflow notifications for a specific service or user
   */
  async getWorkflowNotifications(filters: {
    toService?: string;
    userId?: string;
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};
    
    if (filters.toService) where.toService = filters.toService;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    return this.prisma.workflowNotification.findMany({
      where,
      include: {
        bordereau: {
          select: { reference: true }
        },
        document: {
          select: { name: true }
        }
      },
      orderBy: { sentAt: 'desc' },
      take: filters.limit || 50
    });
  }

  /**
   * Mark workflow notification as read
   */
  async markWorkflowNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.prisma.workflowNotification.update({
        where: { id: notificationId },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Error marking workflow notification as read: ${error.message}`);
    }
  }
}