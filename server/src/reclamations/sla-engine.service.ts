import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SLAConfig {
  clientId: string;
  delaiReclamation: number; // in days
  escalationThresholds: {
    warning: number; // percentage of SLA time
    critical: number;
  };
}

export interface SLAStatus {
  reclamationId: string;
  status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number; // in hours
  percentageUsed: number;
  escalationLevel: number;
}

@Injectable()
export class SLAEngineService {
  private readonly logger = new Logger(SLAEngineService.name);

  constructor(private prisma: PrismaService) {}

  // Calculate SLA deadline for a reclamation
  async calculateSLADeadline(reclamationId: string): Promise<Date | null> {
    try {
      const reclamation = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        include: {
          client: true,
          contract: true
        }
      });

      if (!reclamation) return null;

      // Get SLA days from contract first, then client, then default
      let slaDays = 7; // default
      if (reclamation.contract?.delaiReclamation) {
        slaDays = reclamation.contract.delaiReclamation;
      } else if (reclamation.client?.reclamationDelay) {
        slaDays = reclamation.client.reclamationDelay;
      }

      const deadline = new Date(reclamation.createdAt);
      deadline.setDate(deadline.getDate() + slaDays);
      
      return deadline;
    } catch (error) {
      this.logger.error(`Failed to calculate SLA deadline for ${reclamationId}:`, error);
      return null;
    }
  }

  // Get SLA status for a reclamation
  async getSLAStatus(reclamationId: string): Promise<SLAStatus | null> {
    try {
      const deadline = await this.calculateSLADeadline(reclamationId);
      if (!deadline) return null;

      const now = new Date();
      const createdAt = await this.prisma.reclamation.findUnique({
        where: { id: reclamationId },
        select: { createdAt: true }
      });

      if (!createdAt) return null;

      const totalTime = deadline.getTime() - createdAt.createdAt.getTime();
      const elapsedTime = now.getTime() - createdAt.createdAt.getTime();
      const remainingTime = deadline.getTime() - now.getTime();
      
      const percentageUsed = (elapsedTime / totalTime) * 100;
      
      let status: SLAStatus['status'] = 'ON_TIME';
      let escalationLevel = 0;

      if (remainingTime <= 0) {
        status = 'OVERDUE';
        escalationLevel = 3;
      } else if (percentageUsed >= 90) {
        status = 'CRITICAL';
        escalationLevel = 2;
      } else if (percentageUsed >= 70) {
        status = 'AT_RISK';
        escalationLevel = 1;
      }

      return {
        reclamationId,
        status,
        remainingTime: Math.max(0, Math.floor(remainingTime / (1000 * 60 * 60))), // hours
        percentageUsed: Math.min(100, percentageUsed),
        escalationLevel
      };
    } catch (error) {
      this.logger.error(`Failed to get SLA status for ${reclamationId}:`, error);
      return null;
    }
  }

  // Get all SLA breaches
  async getSLABreaches(): Promise<SLAStatus[]> {
    try {
      const openReclamations = await this.prisma.reclamation.findMany({
        where: {
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        },
        select: { id: true }
      });

      const breaches: SLAStatus[] = [];
      
      for (const rec of openReclamations) {
        const slaStatus = await this.getSLAStatus(rec.id);
        if (slaStatus && (slaStatus.status === 'OVERDUE' || slaStatus.status === 'CRITICAL')) {
          breaches.push(slaStatus);
        }
      }

      return breaches;
    } catch (error) {
      this.logger.error('Failed to get SLA breaches:', error);
      return [];
    }
  }

  // Automated SLA monitoring (runs every hour)
  @Cron(CronExpression.EVERY_HOUR)
  async monitorSLAs() {
    try {
      this.logger.log('Starting SLA monitoring...');
      
      const openReclamations = await this.prisma.reclamation.findMany({
        where: {
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        },
        include: {
          assignedTo: true,
          client: true
        }
      });

      let alertsCreated = 0;

      for (const reclamation of openReclamations) {
        const slaStatus = await this.getSLAStatus(reclamation.id);
        
        if (!slaStatus) continue;

        // Create alerts based on SLA status
        if (slaStatus.status === 'OVERDUE') {
          await this.createSLAAlert(reclamation, 'SLA_BREACH', 'critical');
          alertsCreated++;
        } else if (slaStatus.status === 'CRITICAL') {
          await this.createSLAAlert(reclamation, 'SLA_CRITICAL', 'warning');
          alertsCreated++;
        } else if (slaStatus.status === 'AT_RISK') {
          await this.createSLAAlert(reclamation, 'SLA_AT_RISK', 'info');
          alertsCreated++;
        }
      }

      this.logger.log(`SLA monitoring completed. Created ${alertsCreated} alerts.`);
    } catch (error) {
      this.logger.error('SLA monitoring failed:', error);
    }
  }

  // Create SLA alert
  private async createSLAAlert(reclamation: any, alertType: string, level: string) {
    try {
      // Check if alert already exists for this reclamation
      const existingAlert = await this.prisma.alertLog.findFirst({
        where: {
          alertType,
          message: { contains: reclamation.id },
          resolved: false
        }
      });

      if (existingAlert) return; // Don't create duplicate alerts

      await this.prisma.alertLog.create({
        data: {
          alertType,
          alertLevel: level,
          message: `Réclamation ${reclamation.id} - SLA ${alertType.toLowerCase().replace('_', ' ')}`,
          notifiedRoles: ['CHEF_EQUIPE', 'SUPER_ADMIN'],
          userId: reclamation.assignedToId
        }
      });

      // Create notification for assigned user
      if (reclamation.assignedToId) {
        await this.prisma.notification.create({
          data: {
            userId: reclamation.assignedToId,
            type: 'SLA_ALERT',
            title: `Alerte SLA - ${reclamation.client?.name || 'Client'}`,
            message: `La réclamation ${reclamation.id} nécessite une attention immédiate`,
            data: {
              reclamationId: reclamation.id,
              alertType,
              level
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to create SLA alert:', error);
    }
  }

  // Escalate overdue reclamations
  async escalateOverdueReclamations(): Promise<number> {
    try {
      const breaches = await this.getSLABreaches();
      let escalated = 0;

      for (const breach of breaches) {
        if (breach.status === 'OVERDUE') {
          await this.prisma.reclamation.update({
            where: { id: breach.reclamationId },
            data: { status: 'ESCALATED' }
          });

          await this.prisma.reclamationHistory.create({
            data: {
              reclamationId: breach.reclamationId,
              userId: 'SYSTEM',
              action: 'AUTO_ESCALATE',
              fromStatus: 'IN_PROGRESS',
              toStatus: 'ESCALATED',
              description: 'Escalade automatique due au dépassement SLA'
            }
          });

          escalated++;
        }
      }

      return escalated;
    } catch (error) {
      this.logger.error('Failed to escalate overdue reclamations:', error);
      return 0;
    }
  }

  // Get SLA performance metrics
  async getSLAMetrics(period = '30d'): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      const [total, onTime, atRisk, overdue] = await Promise.all([
        this.prisma.reclamation.count({
          where: { createdAt: { gte: startDate } }
        }),
        this.getReclamationsByStatus('ON_TIME', startDate),
        this.getReclamationsByStatus('AT_RISK', startDate),
        this.getReclamationsByStatus('OVERDUE', startDate)
      ]);

      const compliance = total > 0 ? ((onTime / total) * 100).toFixed(1) : '0';

      return {
        total,
        onTime,
        atRisk,
        overdue,
        compliance: parseFloat(compliance),
        period
      };
    } catch (error) {
      this.logger.error('Failed to get SLA metrics:', error);
      return {
        total: 0,
        onTime: 0,
        atRisk: 0,
        overdue: 0,
        compliance: 0,
        period
      };
    }
  }

  private async getReclamationsByStatus(status: string, startDate: Date): Promise<number> {
    const reclamations = await this.prisma.reclamation.findMany({
      where: { createdAt: { gte: startDate } },
      select: { id: true }
    });

    let count = 0;
    for (const rec of reclamations) {
      const slaStatus = await this.getSLAStatus(rec.id);
      if (slaStatus?.status === status) {
        count++;
      }
    }

    return count;
  }
}