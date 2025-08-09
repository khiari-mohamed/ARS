import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';

interface AlertRule {
  type: string;
  condition: (data: any) => boolean;
  escalationChain: string[];
  repeatInterval: number; // hours
  maxRepeats: number;
}

@Injectable()
export class EnhancedAlertsService {
  private readonly logger = new Logger(EnhancedAlertsService.name);
  private emailTransporter: nodemailer.Transporter;

  private alertRules: AlertRule[] = [
    {
      type: 'SLA_RISK',
      condition: (bordereau) => bordereau.daysRemaining <= 3 && bordereau.daysRemaining > 0,
      escalationChain: ['GESTIONNAIRE', 'CHEF_EQUIPE'],
      repeatInterval: 24,
      maxRepeats: 3
    },
    {
      type: 'SLA_BREACH',
      condition: (bordereau) => bordereau.daysRemaining <= 0,
      escalationChain: ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'],
      repeatInterval: 12,
      maxRepeats: 10
    },
    {
      type: 'TEAM_OVERLOAD',
      condition: (team) => team.workload > team.capacity * 1.2,
      escalationChain: ['CHEF_EQUIPE', 'SUPER_ADMIN'],
      repeatInterval: 24,
      maxRepeats: 5
    },
    {
      type: 'OV_NOT_PROCESSED_24H',
      condition: (ov) => ov.hoursOld >= 24,
      escalationChain: ['FINANCE', 'SUPER_ADMIN'],
      repeatInterval: 6,
      maxRepeats: 8
    }
  ];

  constructor(private prisma: PrismaService) {
    this.setupEmailTransporter();
  }

  private setupEmailTransporter() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processAlerts() {
    this.logger.log('Processing scheduled alerts...');

    // Check SLA alerts
    await this.checkSLAAlerts();
    
    // Check team overload alerts
    await this.checkTeamOverloadAlerts();
    
    // Check OV processing alerts
    await this.checkOVProcessingAlerts();
    
    // Process escalations
    await this.processEscalations();
  }

  private async checkSLAAlerts() {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: { notIn: ['CLOTURE', 'TRAITE'] },
        archived: false
      },
      include: { client: true, currentHandler: true }
    });

    for (const bordereau of bordereaux) {
      const daysElapsed = Math.floor(
        (Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = bordereau.delaiReglement - daysElapsed;

      const bordereauWithDays = { ...bordereau, daysRemaining, daysElapsed };

      // Check SLA risk
      if (daysRemaining <= 3 && daysRemaining > 0) {
        await this.triggerAlert('SLA_RISK', {
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          daysRemaining,
          clientName: bordereau.client?.name
        });
      }

      // Check SLA breach
      if (daysRemaining <= 0) {
        await this.triggerAlert('SLA_BREACH', {
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          daysOverdue: Math.abs(daysRemaining),
          clientName: bordereau.client?.name
        });
      }
    }
  }

  private async checkTeamOverloadAlerts() {
    // Get team workloads
    const teams = await this.prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      include: {
        bordereauxTeam: {
          where: { statut: { notIn: ['CLOTURE'] } }
        }
      }
    });

    for (const team of teams) {
      const workload = team.bordereauxTeam.length;
      const capacity = 50; // Default capacity, should come from team settings

      if (workload > capacity * 1.2) {
        await this.triggerAlert('TEAM_OVERLOAD', {
          teamId: team.id,
          teamName: team.fullName,
          workload,
          capacity,
          overloadPercentage: Math.round((workload / capacity - 1) * 100)
        });
      }
    }
  }

  private async checkOVProcessingAlerts() {
    const ovBatches = await this.prisma.wireTransferBatch.findMany({
      where: {
        status: 'CREATED',
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    });

    for (const batch of ovBatches) {
      const hoursOld = Math.floor(
        (Date.now() - batch.createdAt.getTime()) / (1000 * 60 * 60)
      );

      await this.triggerAlert('OV_NOT_PROCESSED_24H', {
        batchId: batch.id,
        fileName: batch.fileName,
        hoursOld
      });
    }
  }

  async triggerAlert(type: string, details: any) {
    const rule = this.alertRules.find(r => r.type === type);
    if (!rule) {
      this.logger.warn(`No rule found for alert type: ${type}`);
      return;
    }

    // Check if alert already exists and is not resolved
    const existingAlert = await this.prisma.alertLog.findFirst({
      where: {
        alertType: type,
        resolved: false,
        ...(details.bordereauId && { bordereauId: details.bordereauId }),
        ...(details.batchId && { 
          message: { contains: details.batchId }
        })
      }
    });

    if (existingAlert) {
      // Update repeat count
      await this.updateAlertRepeat(existingAlert.id);
      return;
    }

    // Create new alert
    const alert = await this.prisma.alertLog.create({
      data: {
        alertType: type,
        alertLevel: this.getAlertLevel(type),
        message: this.formatAlertMessage(type, details),
        notifiedRoles: rule.escalationChain,
        bordereauId: details.bordereauId || null,
        createdAt: new Date()
      }
    });

    // Send notifications
    await this.sendNotifications(alert, rule, details);

    this.logger.log(`Alert triggered: ${type} - ${alert.id}`);
  }

  private async updateAlertRepeat(alertId: string) {
    // Implementation for tracking repeat alerts
    await this.prisma.alertLog.update({
      where: { id: alertId },
      data: { 
        createdAt: new Date() // Update timestamp for repeat
      }
    });
  }

  private getAlertLevel(type: string): string {
    const levels = {
      'SLA_RISK': 'WARNING',
      'SLA_BREACH': 'CRITICAL',
      'TEAM_OVERLOAD': 'HIGH',
      'OV_NOT_PROCESSED_24H': 'HIGH',
      'SCAN_IMPORT_ERROR': 'MEDIUM'
    };
    return levels[type] || 'MEDIUM';
  }

  private formatAlertMessage(type: string, details: any): string {
    const messages = {
      'SLA_RISK': `SLA à risque - Bordereau ${details.reference} (${details.clientName}) - ${details.daysRemaining} jours restants`,
      'SLA_BREACH': `SLA dépassé - Bordereau ${details.reference} (${details.clientName}) - ${details.daysOverdue} jours de retard`,
      'TEAM_OVERLOAD': `Équipe surchargée - ${details.teamName} - ${details.workload}/${details.capacity} (+${details.overloadPercentage}%)`,
      'OV_NOT_PROCESSED_24H': `OV non traité depuis ${details.hoursOld}h - ${details.fileName}`,
      'SCAN_IMPORT_ERROR': `Erreur d'import SCAN - ${details.filename}: ${details.error}`
    };
    return messages[type] || `Alert: ${type}`;
  }

  private async sendNotifications(alert: any, rule: AlertRule, details: any) {
    // Get users to notify based on escalation chain
    const usersToNotify = await this.prisma.user.findMany({
      where: {
        role: { in: rule.escalationChain },
        active: true
      }
    });

    // Send email notifications
    for (const user of usersToNotify) {
      if (user.email) {
        await this.sendEmailNotification(user.email, alert, details);
      }
    }

    // Send in-app notifications (WebSocket would be ideal)
    // For now, we'll create notification records
    for (const user of usersToNotify) {
      await this.createInAppNotification(user.id, alert);
    }
  }

  private async sendEmailNotification(email: string, alert: any, details: any) {
    try {
      const subject = `[ARS Alert] ${alert.alertLevel} - ${alert.alertType}`;
      const html = this.generateEmailTemplate(alert, details);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@ars.com',
        to: email,
        subject,
        html
      });

      this.logger.log(`Email sent to ${email} for alert ${alert.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
    }
  }

  private generateEmailTemplate(alert: any, details: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #dc3545;">
          <h2 style="color: #dc3545; margin: 0;">⚠️ Alerte ARS</h2>
        </div>
        <div style="padding: 20px;">
          <h3>${alert.message}</h3>
          <p><strong>Type:</strong> ${alert.alertType}</p>
          <p><strong>Niveau:</strong> ${alert.alertLevel}</p>
          <p><strong>Date:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
          
          ${details.bordereauId ? `
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h4>Détails du Bordereau</h4>
              <p><strong>Référence:</strong> ${details.reference}</p>
              <p><strong>Client:</strong> ${details.clientName}</p>
              ${details.daysRemaining !== undefined ? `<p><strong>Jours restants:</strong> ${details.daysRemaining}</p>` : ''}
              ${details.daysOverdue !== undefined ? `<p><strong>Jours de retard:</strong> ${details.daysOverdue}</p>` : ''}
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              Cet email a été généré automatiquement par le système ARS.
              <br>Connectez-vous à l'application pour plus de détails.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private async createInAppNotification(userId: string, alert: any) {
    // Create in-app notification record
    // This would typically be consumed by WebSocket or polling
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'NOTIFICATION_CREATED',
        details: {
          alertId: alert.id,
          type: alert.alertType,
          message: alert.message,
          level: alert.alertLevel
        }
      }
    }).catch(() => {
      this.logger.warn(`Failed to create in-app notification for user ${userId}`);
    });
  }

  private async processEscalations() {
    // Find unresolved alerts older than escalation threshold
    const escalationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    const alertsToEscalate = await this.prisma.alertLog.findMany({
      where: {
        resolved: false,
        createdAt: { lte: escalationThreshold },
        alertLevel: { in: ['HIGH', 'CRITICAL'] }
      }
    });

    for (const alert of alertsToEscalate) {
      await this.escalateAlert(alert);
    }
  }

  private async escalateAlert(alert: any) {
    // Escalate to higher level (SUPER_ADMIN)
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    for (const admin of superAdmins) {
      if (admin.email) {
        await this.sendEmailNotification(admin.email, {
          ...alert,
          message: `[ESCALATED] ${alert.message}`,
          alertLevel: 'CRITICAL'
        }, {});
      }
    }

    this.logger.log(`Alert escalated: ${alert.id}`);
  }

  async resolveAlert(alertId: string, userId: string) {
    await this.prisma.alertLog.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ALERT_RESOLVED',
        details: { alertId }
      }
    });

    this.logger.log(`Alert resolved: ${alertId} by user ${userId}`);
  }
}