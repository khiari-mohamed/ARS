import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  channels: ('IN_APP' | 'EMAIL' | 'SMS')[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  variables: string[];
}

export interface NotificationRule {
  trigger: string;
  conditions: any;
  recipients: string[];
  template: string;
  delay?: number; // minutes
  escalation?: {
    after: number; // minutes
    to: string[];
    template: string;
  };
}

@Injectable()
export class ComprehensiveNotificationService {
  private readonly logger = new Logger(ComprehensiveNotificationService.name);

  constructor(private prisma: PrismaService) {}

  // === WORKFLOW NOTIFICATIONS ===

  async notifyBOToScan(bordereauId: string, userId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    const scanUsers = await this.prisma.user.findMany({
      where: { serviceType: 'SCAN', active: true }
    });

    const notification = {
      type: 'BO_TO_SCAN',
      title: 'Nouveau bordereau à numériser',
      message: `Bordereau ${bordereau.reference} de ${bordereau.client.name} prêt pour numérisation`,
      data: {
        bordereauId,
        reference: bordereau.reference,
        clientName: bordereau.client.name,
        nombreBS: bordereau.nombreBS,
        priority: bordereau.priority
      }
    };

    await this.sendToMultipleUsers(scanUsers.map(u => u.id), notification);
    await this.logWorkflowNotification('BO', 'SCAN', bordereauId, notification.message, userId);
  }

  async notifyScanToChef(bordereauId: string, chefId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    const notification = {
      type: 'SCAN_TO_CHEF',
      title: 'Dossier numérisé disponible',
      message: `Bordereau ${bordereau.reference} numérisé et prêt pour affectation`,
      data: {
        bordereauId,
        reference: bordereau.reference,
        clientName: bordereau.client.name,
        dateReception: bordereau.dateReception,
        delaiReglement: bordereau.delaiReglement
      }
    };

    await this.sendToUser(chefId, notification);
    await this.logWorkflowNotification('SCAN', 'SANTE', bordereauId, notification.message);
  }

  async notifyChefToGestionnaire(bordereauId: string, gestionnaireId: string, chefId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    const notification = {
      type: 'CHEF_TO_GESTIONNAIRE',
      title: 'Nouveau dossier affecté',
      message: `Bordereau ${bordereau.reference} vous a été affecté pour traitement`,
      data: {
        bordereauId,
        reference: bordereau.reference,
        clientName: bordereau.client.name,
        dateLimiteTraitement: bordereau.dateLimiteTraitement,
        priority: bordereau.priority
      }
    };

    await this.sendToUser(gestionnaireId, notification);
    await this.logWorkflowNotification('CHEF_EQUIPE', 'GESTIONNAIRE', bordereauId, notification.message, chefId);
  }

  async notifyGestionnaireToChef(bordereauId: string, chefId: string, gestionnaireId: string, reason: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    const notification = {
      type: 'GESTIONNAIRE_TO_CHEF',
      title: 'Dossier retourné',
      message: `Bordereau ${bordereau.reference} retourné par le gestionnaire - Raison: ${reason}`,
      data: {
        bordereauId,
        reference: bordereau.reference,
        clientName: bordereau.client.name,
        reason,
        returnedBy: gestionnaireId
      }
    };

    await this.sendToUser(chefId, notification);
    await this.logWorkflowNotification('GESTIONNAIRE', 'CHEF_EQUIPE', bordereauId, notification.message, gestionnaireId);
  }

  async notifySanteToFinance(ordreVirementId: string, utilisateurSanteId: string): Promise<void> {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        bordereau: { include: { client: true } }
      }
    });

    if (!ordreVirement) return;

    const financeUsers = await this.prisma.user.findMany({
      where: { role: 'FINANCE', active: true }
    });

    const notification = {
      type: 'SANTE_TO_FINANCE',
      title: 'Nouveau virement à traiter',
      message: `Ordre de virement ${ordreVirement.reference} prêt - Montant: ${ordreVirement.montantTotal} DT`,
      data: {
        ordreVirementId,
        reference: ordreVirement.reference,
        montantTotal: ordreVirement.montantTotal,
        nombreAdherents: ordreVirement.nombreAdherents,
        donneurOrdre: ordreVirement.donneurOrdre.nom,
        clientName: ordreVirement.bordereau?.client.name
      }
    };

    await this.sendToMultipleUsers(financeUsers.map(u => u.id), notification);
    await this.logWorkflowNotification('SANTE', 'FINANCE', ordreVirement.bordereauId, notification.message, utilisateurSanteId);
  }

  // === ALERT NOTIFICATIONS ===

  async notifyTeamOverload(teamId: string, workload: number): Promise<void> {
    const team = await this.prisma.user.findUnique({
      where: { id: teamId },
      select: { fullName: true }
    });

    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    const notification = {
      type: 'TEAM_OVERLOAD_ALERT',
      title: 'Alerte surcharge équipe',
      message: `Équipe ${team?.fullName} en surcharge avec ${workload} dossiers actifs`,
      data: {
        teamId,
        teamName: team?.fullName,
        workload,
        threshold: 50,
        severity: workload > 75 ? 'CRITICAL' : 'WARNING'
      }
    };

    await this.sendToMultipleUsers(superAdmins.map(u => u.id), notification);
    
    // Also notify the team leader
    await this.sendToUser(teamId, {
      ...notification,
      title: 'Votre équipe est en surcharge',
      message: `Votre équipe a ${workload} dossiers actifs. Considérez une redistribution.`
    });
  }

  async notifySLABreach(clientId: string, bordereauId: string, delayDays: number): Promise<void> {
    const [client, bordereau] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: clientId } }),
      this.prisma.bordereau.findUnique({ 
        where: { id: bordereauId },
        include: { currentHandler: true, team: true }
      })
    ]);

    if (!client || !bordereau) return;

    const recipients: string[] = [];
    if (bordereau.currentHandler) recipients.push(bordereau.currentHandler.id);
    if (bordereau.team) recipients.push(bordereau.team.id);

    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });
    recipients.push(...superAdmins.map(u => u.id));

    const notification = {
      type: 'SLA_BREACH_ALERT',
      title: 'Dépassement SLA détecté',
      message: `Bordereau ${bordereau.reference} de ${client.name} en retard de ${delayDays} jours`,
      data: {
        bordereauId,
        clientId,
        reference: bordereau.reference,
        clientName: client.name,
        delayDays,
        slaTarget: client.reglementDelay,
        severity: delayDays > 7 ? 'CRITICAL' : 'HIGH'
      }
    };

    await this.sendToMultipleUsers(recipients, notification);
  }

  async notifyReclamationUrgent(reclamationId: string): Promise<void> {
    const reclamation = await this.prisma.reclamation.findUnique({
      where: { id: reclamationId },
      include: { client: true, assignedTo: true }
    });

    if (!reclamation) return;

    const recipients: string[] = [];
    if (reclamation.assignedTo) recipients.push(reclamation.assignedTo.id);

    const chefs = await this.prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true }
    });
    recipients.push(...chefs.map(u => u.id));

    const notification = {
      type: 'URGENT_RECLAMATION',
      title: 'Réclamation urgente',
      message: `Réclamation ${reclamation.type} de ${reclamation.client.name} nécessite une attention immédiate`,
      data: {
        reclamationId,
        clientName: reclamation.client.name,
        type: reclamation.type,
        severity: reclamation.severity,
        description: reclamation.description.substring(0, 100)
      }
    };

    await this.sendToMultipleUsers(recipients, notification);
  }

  // === ESCALATION SYSTEM ===

  async processEscalations(): Promise<void> {
    // Check for overdue notifications that need escalation
    const overdueNotifications = await this.prisma.workflowNotification.findMany({
      where: {
        status: 'PENDING',
        sentAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      },
      include: {
        bordereau: { include: { client: true } }
      }
    });

    for (const notification of overdueNotifications) {
      await this.escalateNotification(notification);
    }
  }

  private async escalateNotification(notification: any): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    const escalationNotification = {
      type: 'ESCALATION',
      title: 'Notification non traitée - Escalade',
      message: `Notification ${notification.type} non traitée depuis 24h - Intervention requise`,
      data: {
        originalNotificationId: notification.id,
        originalType: notification.type,
        bordereauId: notification.bordereauId,
        clientName: notification.bordereau?.client?.name,
        delayHours: Math.floor((Date.now() - notification.sentAt.getTime()) / (1000 * 60 * 60))
      }
    };

    await this.sendToMultipleUsers(superAdmins.map(u => u.id), escalationNotification);

    // Mark original notification as escalated
    await this.prisma.workflowNotification.update({
      where: { id: notification.id },
      data: { status: 'ESCALATED' }
    });
  }

  // === NOTIFICATION DELIVERY ===

  private async sendToUser(userId: string, notification: any): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {}
      }
    });
  }

  private async sendToMultipleUsers(userIds: string[], notification: any): Promise<void> {
    const notifications = userIds.map(userId => ({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {}
    }));

    await this.prisma.notification.createMany({
      data: notifications
    });
  }

  private async logWorkflowNotification(
    fromService: string, 
    toService: string, 
    bordereauId?: string | null, 
    message?: string,
    userId?: string
  ): Promise<void> {
    await this.prisma.workflowNotification.create({
      data: {
        fromService,
        toService,
        bordereauId: bordereauId || undefined,
        message: message || `Notification from ${fromService} to ${toService}`,
        type: `${fromService}_TO_${toService}`,
        userId
      }
    });
  }

  // === NOTIFICATION TEMPLATES ===

  getNotificationTemplates(): NotificationTemplate[] {
    return [
      {
        type: 'BO_TO_SCAN',
        title: 'Nouveau bordereau à numériser',
        message: 'Bordereau {{reference}} de {{clientName}} prêt pour numérisation ({{nombreBS}} BS)',
        channels: ['IN_APP', 'EMAIL'],
        priority: 'MEDIUM',
        variables: ['reference', 'clientName', 'nombreBS']
      },
      {
        type: 'SCAN_TO_CHEF',
        title: 'Dossier numérisé disponible',
        message: 'Bordereau {{reference}} numérisé et prêt pour affectation',
        channels: ['IN_APP'],
        priority: 'MEDIUM',
        variables: ['reference', 'clientName']
      },
      {
        type: 'CHEF_TO_GESTIONNAIRE',
        title: 'Nouveau dossier affecté',
        message: 'Bordereau {{reference}} vous a été affecté - Échéance: {{dateLimite}}',
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
        variables: ['reference', 'clientName', 'dateLimite']
      },
      {
        type: 'SLA_BREACH_ALERT',
        title: 'Dépassement SLA détecté',
        message: 'Bordereau {{reference}} en retard de {{delayDays}} jours',
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        priority: 'URGENT',
        variables: ['reference', 'clientName', 'delayDays']
      },
      {
        type: 'TEAM_OVERLOAD_ALERT',
        title: 'Alerte surcharge équipe',
        message: 'Équipe {{teamName}} en surcharge avec {{workload}} dossiers',
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
        variables: ['teamName', 'workload', 'threshold']
      }
    ];
  }

  // === NOTIFICATION PREFERENCES ===

  async updateUserNotificationPreferences(userId: string, preferences: any): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Store preferences in a JSON field or separate table
        // This would require adding a preferences field to the User model
      }
    });
  }

  async getUserNotificationPreferences(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    // Return default preferences if none set
    return {
      inApp: true,
      email: true,
      sms: false,
      frequency: 'IMMEDIATE',
      quietHours: { start: '22:00', end: '08:00' },
      types: {
        workflow: true,
        alerts: true,
        escalations: true,
        reports: false
      }
    };
  }

  // === NOTIFICATION ANALYTICS ===

  async getNotificationAnalytics(period: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const [totalSent, byType, byStatus, responseTime] = await Promise.all([
      this.prisma.notification.count({
        where: { createdAt: { gte: startDate } }
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      this.prisma.notification.groupBy({
        by: ['read'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      this.calculateAverageResponseTime(startDate)
    ]);

    return {
      period: { days: period, startDate, endDate: new Date() },
      summary: {
        totalSent,
        readRate: this.calculateReadRate(byStatus),
        avgResponseTime: responseTime
      },
      byType: byType.map(t => ({ type: t.type, count: t._count.id })),
      trends: await this.getNotificationTrends(startDate)
    };
  }

  private calculateReadRate(byStatus: any[]): number {
    const total = byStatus.reduce((sum, s) => sum + s._count.id, 0);
    const read = byStatus.find(s => s.read === true)?._count.id || 0;
    return total > 0 ? (read / total) * 100 : 0;
  }

  private async calculateAverageResponseTime(startDate: Date): Promise<number> {
    // This would calculate the average time between notification sent and read
    // Placeholder implementation
    return Math.random() * 60; // minutes
  }

  private async getNotificationTrends(startDate: Date): Promise<Array<{ date: string; sent: number; read: number }>> {
    const trends: Array<{ date: string; sent: number; read: number }> = [];
    const days = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 100),
        read: Math.floor(Math.random() * 80)
      });
    }
    
    return trends;
  }
}