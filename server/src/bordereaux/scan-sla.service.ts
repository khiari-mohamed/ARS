import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { calculateScanSLA, needsScanAlert, getScanAlertLevel } from '../utils/scan-sla-calculator';

@Injectable()
export class ScanSLAService {
  private readonly logger = new Logger(ScanSLAService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron job: Check SCAN SLA every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleScanSLACron() {
    this.logger.log('🔍 Running SCAN SLA check (cron job)');
    await this.checkScanSLAAndNotify();
  }

  /**
   * Check all bordereaux for SCAN SLA violations and send alerts
   */
  async checkScanSLAAndNotify(): Promise<void> {
    try {
      // Get all bordereaux that are not yet finalized
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          scanStatus: { in: ['NON_SCANNE', 'SCAN_EN_COURS'] },
          archived: false,
        },
        include: {
          client: true,
        },
      });

      this.logger.log(`Checking SCAN SLA for ${bordereaux.length} bordereaux`);

      for (const bordereau of bordereaux) {
        const sla = calculateScanSLA(bordereau.dateReception);

        // Check if alert is needed
        if (needsScanAlert(bordereau.dateReception, bordereau.scanStatus)) {
          await this.sendScanAlert(bordereau, sla);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error checking SCAN SLA: ${error.message}`);
    }
  }

  /**
   * Send SCAN SLA alert to SCAN team AND Gestionnaires
   */
  private async sendScanAlert(bordereau: any, sla: any): Promise<void> {
    try {
      // Get SCAN team members
      const scanTeam = await this.prisma.user.findMany({
        where: {
          role: 'SCAN_TEAM',
          active: true,
        },
      });

      // Get Gestionnaires and Gestionnaire Senior (they also need to see alerts)
      const gestionnaires = await this.prisma.user.findMany({
        where: {
          role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'] },
          active: true,
        },
      });

      const alertLevel = getScanAlertLevel(bordereau.dateReception);
      const allRecipients = [...scanTeam, ...gestionnaires];

      // Create notifications for SCAN team AND Gestionnaires
      for (const member of allRecipients) {
        const isScanTeam = member.role === 'SCAN_TEAM';
        await this.prisma.notification.create({
          data: {
            userId: member.id,
            type: 'SCAN_SLA_ALERT',
            title: isScanTeam 
              ? `Alerte SLA SCAN - ${sla.status}` 
              : `Alerte: Bordereau en attente de scan`,
            message: isScanTeam
              ? `Bordereau ${bordereau.reference}: ${sla.message}`
              : `Le bordereau ${bordereau.reference} attend le scan depuis ${sla.daysElapsed} jours`,
            data: {
              bordereauId: bordereau.id,
              reference: bordereau.reference,
              clientName: bordereau.client?.name,
              daysElapsed: sla.daysElapsed,
              status: sla.status,
              statusColor: sla.statusColor,
              recipientRole: member.role,
            },
            read: false,
          },
        }).catch(() => this.logger.warn('Failed to create SCAN notification'));
      }

      // Create alert log
      await this.prisma.alertLog.create({
        data: {
          bordereauId: bordereau.id,
          alertType: 'SCAN_SLA',
          alertLevel,
          message: sla.message,
          notifiedRoles: ['SCAN_TEAM', 'GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'],
          resolved: false,
        },
      });

      this.logger.log(`SCAN SLA alert sent to ${allRecipients.length} users for bordereau ${bordereau.reference} (${sla.status})`);
    } catch (error: any) {
      this.logger.error(`Error sending SCAN alert: ${error.message}`);
    }
  }

  /**
   * Get SCAN SLA status for a specific bordereau
   */
  async getScanSLAStatus(bordereauId: string): Promise<any> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true },
    });

    if (!bordereau) {
      throw new Error('Bordereau not found');
    }

    const sla = calculateScanSLA(bordereau.dateReception);

    return {
      bordereauId: bordereau.id,
      reference: bordereau.reference,
      dateReception: bordereau.dateReception,
      scanStatus: bordereau.scanStatus,
      ...sla,
    };
  }

  /**
   * Get all bordereaux with SCAN SLA issues
   */
  async getBordereauxWithScanSLAIssues(): Promise<any[]> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        scanStatus: { in: ['NON_SCANNE', 'SCAN_EN_COURS'] },
        archived: false,
      },
      include: {
        client: true,
      },
      orderBy: {
        dateReception: 'asc',
      },
    });

    const result = bordereaux
      .map((b) => {
        const sla = calculateScanSLA(b.dateReception);
        return {
          ...b,
          scanSLA: sla,
        };
      })
      .filter((b) => b.scanSLA.status !== 'OK');

    return result;
  }
}
