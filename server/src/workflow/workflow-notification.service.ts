import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WorkflowNotificationData {
  fromService: string;
  toService: string;
  bordereauId?: string;
  documentId?: string;
  message: string;
  type: string;
  userId?: string;
}

@Injectable()
export class WorkflowNotificationService {
  private readonly logger = new Logger(WorkflowNotificationService.name);

  constructor(private prisma: PrismaService) {}

  // BO → SCAN notification
  async notifyBOToScan(bordereauId: string, userId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    await this.createNotification({
      fromService: 'BUREAU_ORDRE',
      toService: 'SCAN',
      bordereauId,
      message: `Nouveau bordereau ${bordereau.reference} reçu de ${bordereau.client.name} - ${bordereau.nombreBS} BS à scanner`,
      type: 'BORDEREAU_RECEIVED',
      userId
    });

    // Notifier tous les utilisateurs SCAN
    await this.notifyServiceUsers('SCAN', {
      title: 'Nouveau bordereau à scanner',
      message: `Bordereau ${bordereau.reference} prêt pour numérisation`,
      data: { bordereauId, reference: bordereau.reference }
    });
  }

  // SCAN → Chef d'équipe notification
  async notifyScanToChef(bordereauId: string, userId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    await this.createNotification({
      fromService: 'SCAN',
      toService: 'SANTE',
      bordereauId,
      message: `Bordereau ${bordereau.reference} scanné - ${bordereau.nombreBS} BS prêts pour affectation`,
      type: 'BORDEREAU_SCANNED',
      userId
    });

    // Notifier tous les chefs d'équipe
    await this.notifyServiceUsers('CHEF_EQUIPE', {
      title: 'Bordereau scanné - Affectation requise',
      message: `Bordereau ${bordereau.reference} prêt pour affectation`,
      data: { bordereauId, reference: bordereau.reference }
    });
  }

  // Chef → Gestionnaire notification
  async notifyChefToGestionnaire(bordereauId: string, gestionnairId: string, chefId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    await this.createNotification({
      fromService: 'CHEF_EQUIPE',
      toService: 'GESTIONNAIRE',
      bordereauId,
      message: `Bordereau ${bordereau.reference} affecté pour traitement`,
      type: 'BORDEREAU_ASSIGNED',
      userId: chefId
    });

    await this.notifyUser(gestionnairId, {
      title: 'Nouveau bordereau affecté',
      message: `Bordereau ${bordereau.reference} de ${bordereau.client.name} vous a été affecté`,
      data: { bordereauId, reference: bordereau.reference, clientName: bordereau.client.name }
    });
  }

  // Gestionnaire → Chef (retour) notification
  async notifyGestionnaireToChef(bordereauId: string, gestionnairId: string, reason: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true, currentHandler: true }
    });

    if (!bordereau) return;

    await this.createNotification({
      fromService: 'GESTIONNAIRE',
      toService: 'CHEF_EQUIPE',
      bordereauId,
      message: `Bordereau ${bordereau.reference} retourné - ${reason}`,
      type: 'BORDEREAU_RETURNED',
      userId: gestionnairId
    });

    // Trouver le chef d'équipe du gestionnaire
    const gestionnaire = await this.prisma.user.findUnique({
      where: { id: gestionnairId }
    });

    if (gestionnaire) {
      const chefEquipe = await this.prisma.user.findFirst({
        where: { role: 'CHEF_EQUIPE', active: true }
      });

      if (chefEquipe) {
        await this.notifyUser(chefEquipe.id, {
          title: 'Bordereau retourné',
          message: `${gestionnaire.fullName} a retourné le bordereau ${bordereau.reference} - ${reason}`,
          data: { bordereauId, reference: bordereau.reference, reason }
        });
      }
    }
  }

  // Santé → Finance notification
  async notifySanteToFinance(bordereauId: string, userId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    await this.createNotification({
      fromService: 'SANTE',
      toService: 'FINANCE',
      bordereauId,
      message: `Bordereau ${bordereau.reference} traité - Prêt pour virement`,
      type: 'BORDEREAU_READY_PAYMENT',
      userId
    });

    // Notifier l'équipe finance
    await this.notifyServiceUsers('FINANCE', {
      title: 'Nouveau bordereau prêt pour virement',
      message: `Bordereau ${bordereau.reference} de ${bordereau.client.name} prêt pour traitement financier`,
      data: { bordereauId, reference: bordereau.reference, clientName: bordereau.client.name }
    });
  }

  // Détection de surcharge et alerte Super Admin
  async checkTeamOverloadAndAlert(): Promise<void> {
    const services = ['BUREAU_ORDRE', 'SCAN', 'SANTE', 'FINANCE'];

    for (const service of services) {
      const workload = await this.calculateServiceWorkload(service);
      const thresholds = await this.getServiceThresholds(service);
      
      if (workload.overloadPercentage > thresholds.critical) {
        await this.alertSuperAdminOverload(service, workload, 'CRITICAL');
      } else if (workload.overloadPercentage > thresholds.warning) {
        await this.alertSuperAdminOverload(service, workload, 'WARNING');
      }

      // Check for performance degradation
      const perfDegradation = await this.checkPerformanceDegradation(service);
      if (perfDegradation.detected) {
        await this.alertSuperAdminPerformance(service, perfDegradation);
      }

      // Check for SLA delays
      const slaDelays = await this.checkSLADelays(service);
      if (slaDelays.breachCount > thresholds.slaBreachLimit) {
        await this.alertSuperAdminSLA(service, slaDelays);
      }
    }
  }

  private async getServiceThresholds(serviceType: string): Promise<{
    warning: number;
    critical: number;
    slaBreachLimit: number;
  }> {
    // These could be configurable per service
    return {
      warning: 85,
      critical: 95,
      slaBreachLimit: 5
    };
  }

  private async checkPerformanceDegradation(serviceType: string): Promise<{
    detected: boolean;
    currentEfficiency: number;
    previousEfficiency: number;
    degradationPercentage: number;
  }> {
    const currentPeriod = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const previousPeriod = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const currentEfficiency = await this.getServiceEfficiency(serviceType, currentPeriod);
    const previousEfficiency = await this.getServiceEfficiency(serviceType, previousPeriod, currentPeriod);

    const degradationPercentage = previousEfficiency > 0 
      ? ((previousEfficiency - currentEfficiency) / previousEfficiency) * 100 
      : 0;

    return {
      detected: degradationPercentage > 10, // 10% degradation threshold
      currentEfficiency,
      previousEfficiency,
      degradationPercentage
    };
  }

  private async checkSLADelays(serviceType: string): Promise<{
    breachCount: number;
    totalCount: number;
    breachPercentage: number;
    avgDelay: number;
  }> {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateReception: { gte: last7Days },
        currentHandler: {
          serviceType
        }
      },
      include: {
        client: { select: { reglementDelay: true } }
      }
    });

    let breachCount = 0;
    let totalDelay = 0;

    bordereaux.forEach(b => {
      const daysSinceReception = Math.floor((new Date().getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
      const slaLimit = b.client?.reglementDelay || 30;
      
      if (daysSinceReception > slaLimit) {
        breachCount++;
      }
      totalDelay += daysSinceReception;
    });

    return {
      breachCount,
      totalCount: bordereaux.length,
      breachPercentage: bordereaux.length > 0 ? (breachCount / bordereaux.length) * 100 : 0,
      avgDelay: bordereaux.length > 0 ? totalDelay / bordereaux.length : 0
    };
  }

  private async getServiceEfficiency(serviceType: string, startDate: Date, endDate?: Date): Promise<number> {
    const where: any = {
      serviceType,
      active: true
    };

    const users = await this.prisma.user.findMany({ where });
    let totalEfficiency = 0;

    for (const user of users) {
      const efficiency = await this.getUserEfficiencyForPeriod(user.id, startDate, endDate);
      totalEfficiency += efficiency;
    }

    return users.length > 0 ? totalEfficiency / users.length : 0;
  }

  private async getUserEfficiencyForPeriod(userId: string, startDate: Date, endDate?: Date): Promise<number> {
    const dateFilter: any = { gte: startDate };
    if (endDate) dateFilter.lt = endDate;

    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: dateFilter
      }
    });

    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        updatedAt: dateFilter
      }
    });

    return assigned > 0 ? (completed / assigned) * 100 : 80;
  }

  private async alertSuperAdminPerformance(serviceType: string, perfData: any): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    const message = `Dégradation performance équipe ${serviceType} (-${perfData.degradationPercentage.toFixed(1)}%)`;

    for (const admin of superAdmins) {
      await this.notifyUser(admin.id, {
        title: 'Alerte Performance - Dégradation détectée',
        message,
        data: {
          serviceType,
          type: 'PERFORMANCE_DEGRADATION',
          ...perfData
        }
      });
    }
  }

  private async alertSuperAdminSLA(serviceType: string, slaData: any): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    const message = `Dépassements SLA équipe ${serviceType}: ${slaData.breachCount} cas (${slaData.breachPercentage.toFixed(1)}%)`;

    for (const admin of superAdmins) {
      await this.notifyUser(admin.id, {
        title: 'Alerte SLA - Dépassements détectés',
        message,
        data: {
          serviceType,
          type: 'SLA_BREACH',
          ...slaData
        }
      });
    }
  }

  private generateOverloadRecommendations(serviceType: string, workload: any, severity: string): string[] {
    const recommendations: string[] = [];

    if (severity === 'CRITICAL') {
      recommendations.push('Action immédiate requise - Redistribuer la charge de travail');
      recommendations.push('Considérer l\'ajout de ressources temporaires');
    }

    if (workload.overloadedMembers > 0) {
      recommendations.push(`${workload.overloadedMembers} membres surchargés - Rééquilibrage nécessaire`);
    }

    if (workload.avgEfficiency < 70) {
      recommendations.push('Efficacité faible - Formation ou support technique requis');
    }

    if (workload.pendingTasks > 20) {
      recommendations.push('Backlog important - Prioriser les tâches urgentes');
    }

    return recommendations;
  }

  private async calculateServiceWorkload(serviceType: string): Promise<{
    currentLoad: number;
    capacity: number;
    overloadPercentage: number;
    pendingTasks: number;
  }> {
    const serviceUsers = await this.prisma.user.findMany({
      where: { role: serviceType, active: true }
    });

    const totalCapacity = serviceUsers.length * 20; // Assuming 20 tasks per user capacity
    
    let currentLoad = 0;
    switch (serviceType) {
      case 'SCAN':
        currentLoad = await this.prisma.bordereau.count({
          where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS'] } }
        });
        break;
      case 'SANTE':
        currentLoad = await this.prisma.bordereau.count({
          where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
        });
        break;
      case 'FINANCE':
        currentLoad = await this.prisma.bordereau.count({
          where: { statut: { in: ['PRET_VIREMENT', 'VIREMENT_EN_COURS'] } }
        });
        break;
    }

    const pendingTasks = await this.prisma.bordereau.count({
      where: { statut: 'A_AFFECTER' }
    });

    return {
      currentLoad,
      capacity: totalCapacity,
      overloadPercentage: totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0,
      pendingTasks
    };
  }

  private async alertSuperAdminOverload(serviceType: string, workload: any, severity: 'WARNING' | 'CRITICAL'): Promise<void> {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    const message = `Équipe ${serviceType} en ${severity.toLowerCase()} de surcharge (${workload.overloadPercentage.toFixed(1)}%)`;
    const recommendations = this.generateOverloadRecommendations(serviceType, workload, severity);

    for (const admin of superAdmins) {
      await this.notifyUser(admin.id, {
        title: `Alerte ${severity} - Surcharge équipe ${serviceType}`,
        message,
        data: {
          serviceType,
          severity,
          overloadPercentage: workload.overloadPercentage,
          currentLoad: workload.currentLoad,
          capacity: workload.capacity,
          pendingTasks: workload.pendingTasks,
          overloadedMembers: workload.overloadedMembers,
          recommendations
        }
      });
    }

    await this.createNotification({
      fromService: 'SYSTEM',
      toService: 'SUPER_ADMIN',
      message,
      type: `TEAM_OVERLOAD_${severity}`
    });
  }

  private async createNotification(data: WorkflowNotificationData): Promise<void> {
    try {
      // Since WorkflowNotification table might not exist, we'll use the existing Notification table
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || 'SYSTEM',
          action: 'WORKFLOW_NOTIFICATION',
          details: {
            fromService: data.fromService,
            toService: data.toService,
            bordereauId: data.bordereauId,
            documentId: data.documentId,
            message: data.message,
            type: data.type
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to create workflow notification:', error);
    }
  }

  private async notifyServiceUsers(serviceType: string, notification: {
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { 
        role: serviceType,
        active: true 
      }
    });

    for (const user of users) {
      await this.notifyUser(user.id, notification);
    }
  }

  private async notifyUser(userId: string, notification: {
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'WORKFLOW',
          title: notification.title,
          message: notification.message,
          data: notification.data || {}
        }
      });
    } catch (error) {
      this.logger.error('Failed to create user notification:', error);
    }
  }

  async getNotificationHistory(filters: {
    fromService?: string;
    toService?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any[]> {
    const where: any = {
      action: 'WORKFLOW_NOTIFICATION'
    };

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) where.timestamp.gte = filters.dateFrom;
      if (filters.dateTo) where.timestamp.lte = filters.dateTo;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { timestamp: 'desc' }
    });

    return logs
      .filter(log => {
        const details = log.details as any;
        if (filters.fromService && details?.fromService !== filters.fromService) return false;
        if (filters.toService && details?.toService !== filters.toService) return false;
        if (filters.type && details?.type !== filters.type) return false;
        return true;
      })
      .map(log => ({
        id: log.id,
        fromService: (log.details as any)?.fromService,
        toService: (log.details as any)?.toService,
        message: (log.details as any)?.message,
        type: (log.details as any)?.type,
        sentAt: log.timestamp,
        user: log.user
      }));
  }
}