import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlaConfigurationService } from './sla-configuration.service';

@Injectable()
export class SlaIntegrationService {
  private readonly logger = new Logger(SlaIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slaConfigService: SlaConfigurationService
  ) {}

  // === INTÉGRATION AVEC LES ALERTES EXISTANTES ===

  async enhanceFinanceAlertsWithSla() {
    try {
      const slaAlerts = await this.slaConfigService.generateSlaAlerts();

      const enhancedAlerts = slaAlerts.map((alert: any) => ({
        id: `sla-${alert.type}-${alert.bordereauId ?? alert.ordreVirementId ?? alert.reference ?? Math.random()}`,
        type: alert.type,
        level: this.mapSlaLevelToAlertLevel(alert.level),
        title: this.getSlaAlertTitle(alert),
        message: this.getSlaAlertMessage(alert),
        data: {
          ...alert,
          delayHours: this.calculateDelayHours(alert),
          bordereauId: alert.bordereauId,
          virementId: alert.ordreVirementId
        },
        createdAt: new Date().toISOString()
      }));

      return enhancedAlerts;
    } catch (error: any) {
      this.logger.error('Failed to enhance finance alerts with SLA:', error?.message ?? error);
      return [];
    }
  }

  // === INTÉGRATION AVEC LE SUIVI VIREMENT ===

  async enhanceSuiviVirementWithSla(ordreVirementId: string) {
    try {
      const slaCheck = await this.slaConfigService.checkVirementSla(ordreVirementId);

      return {
        slaStatus: slaCheck.status,
        slaPercentage: slaCheck.pourcentage,
        slaRemainingHours: slaCheck.heuresRestantes,
        slaMaxDelay: slaCheck.delaiMax,
        slaConfig: {
          seuilAlerte: typeof slaCheck?.slaConfig?.seuils === 'object' && slaCheck?.slaConfig?.seuils !== null && 'seuilAlerte' in slaCheck.slaConfig.seuils
            ? (slaCheck.slaConfig.seuils as any).seuilAlerte
            : null,
          seuilCritique: typeof slaCheck?.slaConfig?.seuils === 'object' && slaCheck?.slaConfig?.seuils !== null && 'seuilCritique' in slaCheck.slaConfig.seuils
            ? (slaCheck.slaConfig.seuils as any).seuilCritique
            : null
        }
      };
    } catch (error: any) {
      this.logger.error(`Failed to get SLA info for virement ${ordreVirementId}:`, error?.message ?? error);
      return null;
    }
  }

  // === INTÉGRATION AVEC LE TABLEAU DE BORD ===

  async enhanceDashboardWithSlaMetrics() {
    try {
      const slaAlerts = await this.slaConfigService.generateSlaAlerts();

      const slaMetrics = {
        totalSlaAlerts: slaAlerts.length,
        criticalSlaAlerts: slaAlerts.filter((a: any) => a.level === 'CRITIQUE' || a.level === 'DEPASSEMENT').length,
        warningSlaAlerts: slaAlerts.filter((a: any) => a.level === 'ALERTE').length,
        slaCompliance: await this.calculateSlaCompliance(),
        averageProcessingTime: await this.calculateAverageProcessingTime()
      };

      return slaMetrics;
    } catch (error: any) {
      this.logger.error('Failed to enhance dashboard with SLA metrics:', error?.message ?? error);
      return {
        totalSlaAlerts: 0,
        criticalSlaAlerts: 0,
        warningSlaAlerts: 0,
        slaCompliance: 100,
        averageProcessingTime: 0
      };
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private mapSlaLevelToAlertLevel(slaLevel: string): 'info' | 'warning' | 'error' {
    switch (slaLevel) {
      case 'DEPASSEMENT':
      case 'CRITIQUE':
        return 'error';
      case 'ALERTE':
        return 'warning';
      default:
        return 'info';
    }
  }

  private getSlaAlertTitle(alert: any): string {
    const type = alert.type === 'BORDEREAU_SLA' ? 'Bordereau' : 'Virement';

    switch (alert.level) {
      case 'DEPASSEMENT':
        return `SLA Dépassé - ${type} ${alert.reference}`;
      case 'CRITIQUE':
        return `SLA Critique - ${type} ${alert.reference}`;
      case 'ALERTE':
        return `SLA Alerte - ${type} ${alert.reference}`;
      default:
        return `SLA - ${type} ${alert.reference}`;
    }
  }

  private getSlaAlertMessage(alert: any): string {
    const type = alert.type === 'BORDEREAU_SLA' ? 'bordereau' : 'virement';
    const client = alert.client || 'Client inconnu';

    if (typeof alert.heuresRestantes === 'number' && alert.heuresRestantes <= 0) {
      const heuresDepassement = Math.abs(alert.heuresRestantes);
      return `Le ${type} ${alert.reference} de ${client} a dépassé son SLA de ${Math.round(heuresDepassement)}h (${alert.pourcentage}%)`;
    } else {
      return `Le ${type} ${alert.reference} de ${client} approche de son SLA limite. Temps restant: ${Math.round(alert.heuresRestantes ?? 0)}h (${alert.pourcentage}%)`;
    }
  }

  private calculateDelayHours(alert: any): number {
    if (typeof alert.heuresRestantes === 'number' && alert.heuresRestantes <= 0) {
      return Math.abs(alert.heuresRestantes);
    }
    return 0;
  }

  private async calculateSlaCompliance(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalBordereaux, totalVirements] = await Promise.all([
        this.prisma.bordereau.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            statut: { in: ['TRAITE', 'PRET_VIREMENT', 'VIREMENT_EXECUTE', 'CLOTURE', 'PAYE'] }
          }
        }),
        this.prisma.ordreVirement.count({
          where: {
            dateCreation: { gte: thirtyDaysAgo },
            etatVirement: { in: ['EXECUTE', 'REJETE'] }
          }
        })
      ]);

      const totalProcessed = totalBordereaux + totalVirements;
      if (totalProcessed === 0) return 100;

      const slaAlerts = await this.slaConfigService.generateSlaAlerts();
      const violationsEstimated = slaAlerts.filter((a: any) => a.level === 'DEPASSEMENT').length;

      const compliance = Math.max(0, ((totalProcessed - violationsEstimated) / totalProcessed) * 100);
      return Math.round(compliance);
    } catch (error: any) {
      this.logger.error('Failed to calculate SLA compliance:', error?.message ?? error);
      return 100;
    }
  }

  private async calculateAverageProcessingTime(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const completedBordereaux = await this.prisma.bordereau.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          dateCloture: { not: null }
        },
        select: {
          dateReception: true,
          dateCloture: true
        }
      });

      if (completedBordereaux.length === 0) return 0;

      const totalHours = completedBordereaux.reduce((sum, bordereau) => {
        if (bordereau.dateCloture && bordereau.dateReception) {
          const hours = (bordereau.dateCloture.getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      return Math.round(totalHours / completedBordereaux.length);
    } catch (error: any) {
      this.logger.error('Failed to calculate average processing time:', error?.message ?? error);
      return 0;
    }
  }

  // === NOTIFICATIONS SLA ===

  async createSlaNotification(alert: any, userId: string) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SLA_ALERT',
          title: this.getSlaAlertTitle(alert),
          message: this.getSlaAlertMessage(alert),
          data: {
            slaLevel: alert.level,
            slaPercentage: alert.pourcentage,
            remainingHours: alert.heuresRestantes,
            bordereauId: alert.bordereauId,
            virementId: alert.ordreVirementId
          }
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to create SLA notification:', error?.message ?? error);
    }
  }

  // === MÉTHODE POUR SCHEDULER LES VÉRIFICATIONS SLA ===

  async scheduledSlaCheck() {
    try {
      this.logger.log('Starting scheduled SLA check...');

      const slaAlerts = await this.slaConfigService.generateSlaAlerts();

      const criticalAlerts = slaAlerts.filter((a: any) => a.level === 'CRITIQUE' || a.level === 'DEPASSEMENT');

      const usersToNotify = await this.prisma.user.findMany({
        where: {
          role: { in: ['FINANCE', 'SUPER_ADMIN'] },
          active: true
        }
      });

      for (const alert of criticalAlerts) {
        for (const user of usersToNotify) {
          await this.createSlaNotification(alert, user.id);
        }
      }

      this.logger.log(`SLA check completed. ${criticalAlerts.length} critical alerts processed.`);

      return {
        totalAlerts: slaAlerts.length,
        criticalAlerts: criticalAlerts.length,
        notificationsCreated: criticalAlerts.length * usersToNotify.length
      };
    } catch (error: any) {
      this.logger.error('Failed to perform scheduled SLA check:', error?.message ?? error);
      return { totalAlerts: 0, criticalAlerts: 0, notificationsCreated: 0 };
    }
  }
}