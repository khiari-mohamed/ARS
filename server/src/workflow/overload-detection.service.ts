import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OverloadDetectionService {
  private readonly logger = new Logger(OverloadDetectionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check for team overload every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkTeamOverload() {
    try {
      await this.detectAndNotifyOverload();
    } catch (error) {
      this.logger.error(`Scheduled overload check failed: ${error.message}`);
    }
  }

  /**
   * Detect team overload and notify Super Admin
   */
  async detectAndNotifyOverload() {
    try {
      // Get all gestionnaires with their current workload
      const gestionnaires = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        include: {
          bordereaux: {
            where: { 
              statut: { in: ['ASSIGNE', 'EN_COURS'] },
              archived: false
            }
          }
        }
      });

      const overloadThreshold = 15; // Configurable threshold
      const overloadedUsers = gestionnaires.filter(user => 
        user.bordereaux.length > overloadThreshold
      );

      if (overloadedUsers.length > 0) {
        await this.notifySuperAdminOverload(overloadedUsers, overloadThreshold);
      }

      // Check for unassigned bordereaux accumulation
      const unassignedCount = await this.prisma.bordereau.count({
        where: {
          statut: 'A_AFFECTER',
          assignedToUserId: null,
          archived: false
        }
      });

      if (unassignedCount > 10) {
        await this.notifySuperAdminUnassigned(unassignedCount);
      }

      this.logger.log(`Overload check completed: ${overloadedUsers.length} overloaded users, ${unassignedCount} unassigned bordereaux`);
    } catch (error) {
      this.logger.error(`Error detecting overload: ${error.message}`);
    }
  }

  /**
   * Notify Super Admin about overloaded team members
   */
  private async notifySuperAdminOverload(overloadedUsers: any[], threshold: number) {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', active: true }
      });

      const overloadDetails = overloadedUsers.map(user => ({
        id: user.id,
        name: user.fullName,
        workload: user.bordereaux.length
      }));

      for (const admin of superAdmins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'TEAM_OVERLOAD_ALERT',
            title: 'Alerte surcharge équipe',
            message: `${overloadedUsers.length} gestionnaire(s) en surcharge détecté(s) (seuil: ${threshold})`,
            data: { 
              overloadedUsers: overloadDetails,
              threshold,
              timestamp: new Date().toISOString()
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create overload notification'));
      }

      this.logger.log(`Notified ${superAdmins.length} Super Admin(s) about ${overloadedUsers.length} overloaded team member(s)`);
    } catch (error) {
      this.logger.error(`Error notifying Super Admin about overload: ${error.message}`);
    }
  }

  /**
   * Notify Super Admin about unassigned bordereaux accumulation
   */
  private async notifySuperAdminUnassigned(unassignedCount: number) {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', active: true }
      });

      for (const admin of superAdmins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'UNASSIGNED_ACCUMULATION',
            title: 'Accumulation de dossiers non affectés',
            message: `${unassignedCount} bordereaux en attente d'affectation - intervention requise`,
            data: { 
              unassignedCount,
              timestamp: new Date().toISOString()
            },
            read: false
          }
        }).catch(() => this.logger.warn('Failed to create unassigned notification'));
      }

      this.logger.log(`Notified Super Admin(s) about ${unassignedCount} unassigned bordereaux`);
    } catch (error) {
      this.logger.error(`Error notifying Super Admin about unassigned: ${error.message}`);
    }
  }

  /**
   * Manual trigger for overload check (for testing/admin use)
   */
  async triggerOverloadCheck() {
    await this.detectAndNotifyOverload();
    return { success: true, message: 'Overload check completed' };
  }
}