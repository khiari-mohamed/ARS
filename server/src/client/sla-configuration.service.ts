import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SLAThresholds {
  reglementDelay: number;
  reclamationDelay: number;
  warningThreshold: number; // % of delay before warning
  criticalThreshold: number; // % of delay before critical alert
  escalationDelay: number; // Days before escalation
}

export interface SLAAlertConfig {
  enabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  dashboardAlerts: boolean;
  recipients: string[]; // User IDs
}

export interface ClientSLAConfig {
  clientId: string;
  thresholds: SLAThresholds;
  alerts: SLAAlertConfig;
  customRules: any[];
  active: boolean;
}

@Injectable()
export class SlaConfigurationService {
  constructor(private prisma: PrismaService) {}

  async createSLAConfiguration(config: Omit<ClientSLAConfig, 'clientId'>, clientId: string): Promise<any> {
    // Verify client exists
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.prisma.slaConfiguration.create({
      data: {
        clientId,
        moduleType: 'GLOBAL',
        seuils: config.thresholds as any,
        alertes: config.alerts as any,
        active: config.active
      }
    });
  }

  async updateSLAConfiguration(clientId: string, config: Partial<ClientSLAConfig>): Promise<any> {
    const existing = await this.prisma.slaConfiguration.findFirst({
      where: { clientId, moduleType: 'GLOBAL' }
    });

    if (!existing) {
      return this.createSLAConfiguration(config as any, clientId);
    }

    return this.prisma.slaConfiguration.update({
      where: { id: existing.id },
      data: {
        seuils: (config.thresholds || existing.seuils) as any,
        alertes: (config.alerts || existing.alertes) as any,
        active: config.active !== undefined ? config.active : existing.active
      }
    });
  }

  async getSLAConfiguration(clientId: string): Promise<ClientSLAConfig | null> {
    const config = await this.prisma.slaConfiguration.findFirst({
      where: { clientId, moduleType: 'GLOBAL' }
    });

    if (!config) return null;

    return {
      clientId,
      thresholds: config.seuils as unknown as SLAThresholds,
      alerts: config.alertes as unknown as SLAAlertConfig,
      customRules: [],
      active: config.active
    };
  }

  async getConfigurableThresholds(): Promise<{
    defaultThresholds: SLAThresholds;
    availableModules: string[];
    alertTypes: string[];
  }> {
    return {
      defaultThresholds: {
        reglementDelay: 30,
        reclamationDelay: 15,
        warningThreshold: 80,
        criticalThreshold: 95,
        escalationDelay: 2
      },
      availableModules: [
        'BORDEREAUX',
        'RECLAMATIONS', 
        'VIREMENTS',
        'SCAN',
        'TRAITEMENT'
      ],
      alertTypes: [
        'SLA_WARNING',
        'SLA_BREACH',
        'VOLUME_OVERLOAD',
        'PROCESSING_DELAY',
        'ESCALATION_REQUIRED'
      ]
    };
  }

  async evaluateSLACompliance(clientId: string): Promise<{
    overallCompliance: number;
    moduleCompliance: any[];
    breaches: any[];
    recommendations: string[];
  }> {
    const config = await this.getSLAConfiguration(clientId);
    if (!config) {
      throw new NotFoundException('SLA configuration not found for client');
    }

    // Evaluate bordereaux compliance
    const bordereauxCompliance = await this.evaluateBordereauxSLA(clientId, config.thresholds);
    
    // Evaluate reclamations compliance
    const reclamationsCompliance = await this.evaluateReclamationsSLA(clientId, config.thresholds);

    const moduleCompliance = [
      { module: 'BORDEREAUX', ...bordereauxCompliance },
      { module: 'RECLAMATIONS', ...reclamationsCompliance }
    ];

    const overallCompliance = moduleCompliance.reduce((acc, m) => acc + m.complianceRate, 0) / moduleCompliance.length;

    const breaches = moduleCompliance
      .filter(m => m.complianceRate < 95)
      .map(m => ({
        module: m.module,
        complianceRate: m.complianceRate,
        breachCount: m.breachCount
      }));

    const recommendations = this.generateSLARecommendations(moduleCompliance, config.thresholds);

    return {
      overallCompliance,
      moduleCompliance,
      breaches,
      recommendations
    };
  }

  private async evaluateBordereauxSLA(clientId: string, thresholds: SLAThresholds): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        clientId,
        dateReception: { gte: last30Days }
      }
    });

    let compliantCount = 0;
    let breachCount = 0;

    bordereaux.forEach(b => {
      const processingDays = b.dateCloture 
        ? Math.floor((b.dateCloture.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date().getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));

      if (processingDays <= thresholds.reglementDelay) {
        compliantCount++;
      } else {
        breachCount++;
      }
    });

    const complianceRate = bordereaux.length > 0 ? (compliantCount / bordereaux.length) * 100 : 100;

    return {
      totalCount: bordereaux.length,
      compliantCount,
      breachCount,
      complianceRate,
      avgProcessingTime: bordereaux.length > 0 
        ? bordereaux.reduce((acc, b) => {
            const days = b.dateCloture 
              ? Math.floor((b.dateCloture.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24))
              : Math.floor((new Date().getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
            return acc + days;
          }, 0) / bordereaux.length
        : 0
    };
  }

  private async evaluateReclamationsSLA(clientId: string, thresholds: SLAThresholds): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const reclamations = await this.prisma.reclamation.findMany({
      where: {
        clientId,
        createdAt: { gte: last30Days }
      }
    });

    let compliantCount = 0;
    let breachCount = 0;

    reclamations.forEach(r => {
      const processingDays = r.updatedAt 
        ? Math.floor((r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date().getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (processingDays <= thresholds.reclamationDelay) {
        compliantCount++;
      } else {
        breachCount++;
      }
    });

    const complianceRate = reclamations.length > 0 ? (compliantCount / reclamations.length) * 100 : 100;

    return {
      totalCount: reclamations.length,
      compliantCount,
      breachCount,
      complianceRate,
      avgProcessingTime: reclamations.length > 0 
        ? reclamations.reduce((acc, r) => {
            const days = Math.floor((r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return acc + days;
          }, 0) / reclamations.length
        : 0
    };
  }

  private generateSLARecommendations(moduleCompliance: any[], thresholds: SLAThresholds): string[] {
    const recommendations: string[] = [];

    moduleCompliance.forEach(module => {
      if (module.complianceRate < 90) {
        recommendations.push(`${module.module}: Compliance critique (${module.complianceRate.toFixed(1)}%) - Révision urgente des processus requise`);
      } else if (module.complianceRate < 95) {
        recommendations.push(`${module.module}: Compliance sous le seuil (${module.complianceRate.toFixed(1)}%) - Optimisation recommandée`);
      }

      if (module.avgProcessingTime > thresholds.reglementDelay * 0.8) {
        recommendations.push(`${module.module}: Temps de traitement élevé (${module.avgProcessingTime.toFixed(1)} jours) - Considérer l'augmentation des ressources`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Performance SLA satisfaisante - Continuer le monitoring');
    }

    return recommendations;
  }

  async triggerSLAAlert(clientId: string, alertType: string, details: any): Promise<void> {
    const config = await this.getSLAConfiguration(clientId);
    if (!config || !config.alerts.enabled) return;

    // Create alert log
    await this.prisma.alertLog.create({
      data: {
        alertType: `SLA_${alertType}`,
        alertLevel: details.severity || 'WARNING',
        message: details.message,
        notifiedRoles: ['SUPER_ADMIN', 'CHEF_EQUIPE'],
        resolved: false
      }
    });

    // Send notifications based on config
    if (config.alerts.emailNotifications) {
      // Email notification logic would go here
    }

    if (config.alerts.dashboardAlerts) {
      // Dashboard notification logic would go here
      for (const userId of config.alerts.recipients) {
        await this.prisma.notification.create({
          data: {
            userId: userId,
            type: 'SLA_ALERT',
            title: `Alerte SLA - ${alertType}`,
            message: details.message,
            data: { clientId, alertType, ...details }
          }
        });
      }
    }
  }

  async getSLADashboardData(clientId?: string): Promise<any> {
    const where = clientId ? { clientId } : {};
    
    const configurations = await this.prisma.slaConfiguration.findMany({
      where,
      include: { client: true }
    });

    const dashboardData = await Promise.all(
      configurations.map(async (config) => {
        const compliance = await this.evaluateSLACompliance(config.clientId!);
        return {
          clientId: config.clientId,
          clientName: config.client?.name,
          overallCompliance: compliance.overallCompliance,
          status: compliance.overallCompliance >= 95 ? 'HEALTHY' : 
                  compliance.overallCompliance >= 90 ? 'WARNING' : 'CRITICAL',
          breachCount: compliance.breaches.length,
          lastUpdated: new Date()
        };
      })
    );

    return {
      summary: {
        totalClients: dashboardData.length,
        healthyClients: dashboardData.filter(d => d.status === 'HEALTHY').length,
        warningClients: dashboardData.filter(d => d.status === 'WARNING').length,
        criticalClients: dashboardData.filter(d => d.status === 'CRITICAL').length,
        avgCompliance: dashboardData.reduce((acc, d) => acc + d.overallCompliance, 0) / (dashboardData.length || 1)
      },
      clients: dashboardData
    };
  }
}