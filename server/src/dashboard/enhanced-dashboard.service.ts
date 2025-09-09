import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardConfig {
  userId: string;
  role: string;
  serviceType?: string;
  preferences?: any;
}

export interface KPIData {
  label: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical';
}

@Injectable()
export class EnhancedDashboardService {
  private readonly logger = new Logger(EnhancedDashboardService.name);

  constructor(private prisma: PrismaService) {}

  // === CORBEILLES SPÉCIALISÉES ===

  async getBOCorbeille(userId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [
      pendingEntries,
      todayEntries,
      urgentEntries,
      recentActivity
    ] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          statut: 'EN_ATTENTE',
          dateReceptionBO: { not: null }
        },
        include: {
          client: { select: { name: true } }
        },
        orderBy: { dateReceptionBO: 'desc' },
        take: 20
      }),
      this.prisma.bordereau.count({
        where: {
          dateReceptionBO: { gte: startOfDay }
        }
      }),
      this.prisma.bordereau.findMany({
        where: {
          delaiReglement: { lt: 10 },
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] }
        },
        include: {
          client: { select: { name: true } }
        },
        take: 10
      }),
      this.getRecentBOActivity(userId)
    ]);

    return {
      type: 'BO_CORBEILLE',
      summary: {
        pendingCount: pendingEntries.length,
        todayEntries,
        urgentCount: urgentEntries.length
      },
      pendingEntries: pendingEntries.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateReception: entry.dateReceptionBO,
        delaiReglement: entry.delaiReglement,
        priority: entry.delaiReglement < 10 ? 'HIGH' : entry.delaiReglement < 20 ? 'MEDIUM' : 'LOW'
      })),
      urgentEntries: urgentEntries.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        delaiReglement: entry.delaiReglement,
        daysSinceReception: Math.floor((new Date().getTime() - entry.dateReception.getTime()) / (1000 * 60 * 60 * 24))
      })),
      recentActivity
    };
  }

  async getScanCorbeille(userId: string): Promise<any> {
    const [
      toScan,
      inProgress,
      completed,
      recentActivity
    ] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          statut: 'A_SCANNER'
        },
        include: {
          client: { select: { name: true } }
        },
        orderBy: { dateReception: 'asc' },
        take: 20
      }),
      this.prisma.bordereau.findMany({
        where: {
          statut: 'SCAN_EN_COURS',
          currentHandlerId: userId
        },
        include: {
          client: { select: { name: true } }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      this.getRecentScanActivity(userId)
    ]);

    return {
      type: 'SCAN_CORBEILLE',
      summary: {
        toScanCount: toScan.length,
        inProgressCount: inProgress.length,
        completedToday: completed
      },
      toScan: toScan.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateReception: entry.dateReception,
        priority: this.calculateScanPriority(entry)
      })),
      inProgress: inProgress.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateDebutScan: entry.dateDebutScan,
        estimatedCompletion: this.estimateScanCompletion(entry)
      })),
      recentActivity
    };
  }

  async getChefCorbeille(userId: string): Promise<any> {
    const [
      toAssign,
      teamWorkload,
      overloadedMembers,
      recentAssignments,
      escalations
    ] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          statut: 'A_AFFECTER'
        },
        include: {
          client: { select: { name: true, chargeCompteId: true } }
        },
        orderBy: { dateReception: 'asc' },
        take: 20
      }),
      this.getTeamWorkloadSummary(userId),
      this.getOverloadedTeamMembers(userId),
      this.getRecentAssignments(userId),
      this.getPendingEscalations(userId)
    ]);

    return {
      type: 'CHEF_CORBEILLE',
      summary: {
        toAssignCount: toAssign.length,
        teamSize: teamWorkload.totalMembers,
        avgUtilization: teamWorkload.avgUtilization,
        overloadedCount: overloadedMembers.length
      },
      toAssign: toAssign.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateReception: entry.dateReception,
        suggestedAssignee: this.suggestAssignee(entry, teamWorkload.members),
        priority: this.calculateAssignmentPriority(entry)
      })),
      teamWorkload,
      overloadedMembers,
      recentAssignments,
      escalations
    };
  }

  async getGestionnaireCorbeille(userId: string): Promise<any> {
    const [
      assigned,
      inProgress,
      completed,
      performance,
      clientDistribution
    ] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          currentHandlerId: userId,
          statut: 'ASSIGNE'
        },
        include: {
          client: { select: { name: true } }
        },
        orderBy: { dateReception: 'asc' },
        take: 20
      }),
      this.prisma.bordereau.findMany({
        where: {
          currentHandlerId: userId,
          statut: 'EN_COURS'
        },
        include: {
          client: { select: { name: true } }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          currentHandlerId: userId,
          statut: 'TRAITE',
          dateCloture: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      this.getGestionnairePerformance(userId),
      this.getGestionnaireClientDistribution(userId)
    ]);

    return {
      type: 'GESTIONNAIRE_CORBEILLE',
      summary: {
        assignedCount: assigned.length,
        inProgressCount: inProgress.length,
        completedWeek: completed,
        efficiency: performance.efficiency
      },
      assigned: assigned.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateReception: entry.dateReception,
        delaiReglement: entry.delaiReglement,
        daysRemaining: this.calculateDaysRemaining(entry),
        priority: this.calculateProcessingPriority(entry)
      })),
      inProgress: inProgress.map(entry => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        dateReceptionSante: entry.dateReceptionSante,
        progress: this.estimateProgress(entry)
      })),
      performance,
      clientDistribution
    };
  }

  // === TABLEAUX DE BORD RÔLE-SPÉCIFIQUES ===

  async getBODashboard(userId: string): Promise<any> {
    const kpis = await this.getBOKPIs();
    const corbeille = await this.getBOCorbeille(userId);
    const analytics = await this.getBOAnalytics();

    return {
      role: 'BUREAU_ORDRE',
      kpis,
      corbeille,
      analytics,
      quickActions: [
        { label: 'Nouvelle saisie', action: 'CREATE_ENTRY', icon: 'plus' },
        { label: 'Saisie par lot', action: 'BATCH_ENTRY', icon: 'upload' },
        { label: 'Rechercher client', action: 'SEARCH_CLIENT', icon: 'search' }
      ]
    };
  }

  async getScanDashboard(userId: string): Promise<any> {
    const kpis = await this.getScanKPIs(userId);
    const corbeille = await this.getScanCorbeille(userId);
    const analytics = await this.getScanAnalytics(userId);

    return {
      role: 'SCAN',
      kpis,
      corbeille,
      analytics,
      quickActions: [
        { label: 'Démarrer scan', action: 'START_SCAN', icon: 'play' },
        { label: 'Reprendre scan', action: 'RESUME_SCAN', icon: 'resume' },
        { label: 'Qualité scan', action: 'QUALITY_CHECK', icon: 'check' }
      ]
    };
  }

  async getChefDashboard(userId: string): Promise<any> {
    const kpis = await this.getChefKPIs(userId);
    const corbeille = await this.getChefCorbeille(userId);
    const analytics = await this.getChefAnalytics(userId);

    return {
      role: 'CHEF_EQUIPE',
      kpis,
      corbeille,
      analytics,
      quickActions: [
        { label: 'Affecter par lot', action: 'BATCH_ASSIGN', icon: 'users' },
        { label: 'Rééquilibrer charge', action: 'REBALANCE', icon: 'balance' },
        { label: 'Vue équipe', action: 'TEAM_VIEW', icon: 'team' }
      ]
    };
  }

  async getGestionnaireDashboard(userId: string): Promise<any> {
    const kpis = await this.getGestionnaireKPIs(userId);
    const corbeille = await this.getGestionnaireCorbeille(userId);
    const analytics = await this.getGestionnaireAnalytics(userId);

    return {
      role: 'GESTIONNAIRE',
      kpis,
      corbeille,
      analytics,
      quickActions: [
        { label: 'Traiter BS', action: 'PROCESS_BS', icon: 'edit' },
        { label: 'Valider lot', action: 'VALIDATE_BATCH', icon: 'check-circle' },
        { label: 'Créer réclamation', action: 'CREATE_CLAIM', icon: 'alert' }
      ]
    };
  }

  async getSuperAdminDashboard(userId: string): Promise<any> {
    const kpis = await this.getSuperAdminKPIs();
    const systemHealth = await this.getSystemHealth();
    const alerts = await this.getSystemAlerts();
    const performance = await this.getGlobalPerformance();

    return {
      role: 'SUPER_ADMIN',
      kpis,
      systemHealth,
      alerts,
      performance,
      quickActions: [
        { label: 'Gestion utilisateurs', action: 'MANAGE_USERS', icon: 'users' },
        { label: 'Configuration SLA', action: 'SLA_CONFIG', icon: 'settings' },
        { label: 'Rapports système', action: 'SYSTEM_REPORTS', icon: 'chart' },
        { label: 'Alertes critiques', action: 'CRITICAL_ALERTS', icon: 'warning' }
      ]
    };
  }

  // === KPI CALCULATIONS ===

  private async getBOKPIs(): Promise<KPIData[]> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    const [todayEntries, yesterdayEntries, pendingScan, avgProcessingTime] = await Promise.all([
      this.prisma.bordereau.count({ where: { dateReceptionBO: { gte: startOfDay } } }),
      this.prisma.bordereau.count({ 
        where: { 
          dateReceptionBO: { 
            gte: startOfYesterday, 
            lt: startOfDay 
          } 
        } 
      }),
      this.prisma.bordereau.count({ where: { statut: { in: ['EN_ATTENTE', 'A_SCANNER'] } } }),
      this.getAverageProcessingTime('BO')
    ]);

    return [
      {
        label: 'Saisies aujourd\'hui',
        value: todayEntries,
        change: yesterdayEntries > 0 ? ((todayEntries - yesterdayEntries) / yesterdayEntries) * 100 : 0,
        trend: todayEntries > yesterdayEntries ? 'up' : todayEntries < yesterdayEntries ? 'down' : 'stable',
        status: 'good'
      },
      {
        label: 'En attente scan',
        value: pendingScan,
        status: pendingScan > 50 ? 'critical' : pendingScan > 20 ? 'warning' : 'good'
      },
      {
        label: 'Temps moyen traitement (h)',
        value: Math.round(avgProcessingTime),
        status: avgProcessingTime > 24 ? 'warning' : 'good'
      }
    ];
  }

  private async getScanKPIs(userId: string): Promise<KPIData[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [todayScanned, inProgress, avgScanTime, quality] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: startOfDay }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCAN_EN_COURS',
          currentHandlerId: userId
        }
      }),
      this.getAverageScanTime(userId),
      this.getScanQuality(userId)
    ]);

    return [
      {
        label: 'Scannés aujourd\'hui',
        value: todayScanned,
        status: 'good'
      },
      {
        label: 'En cours',
        value: inProgress,
        status: inProgress > 5 ? 'warning' : 'good'
      },
      {
        label: 'Temps moyen scan (min)',
        value: Math.round(avgScanTime),
        status: avgScanTime > 30 ? 'warning' : 'good'
      },
      {
        label: 'Qualité (%)',
        value: Math.round(quality),
        status: quality < 95 ? 'warning' : 'good'
      }
    ];
  }

  private async getChefKPIs(userId: string): Promise<KPIData[]> {
    const [toAssign, teamUtilization, slaCompliance, escalations] = await Promise.all([
      this.prisma.bordereau.count({ where: { statut: 'A_AFFECTER' } }),
      this.getTeamUtilization(userId),
      this.getTeamSLACompliance(userId),
      this.prisma.alertLog.count({
        where: {
          alertType: 'ESCALATION',
          resolved: false
        }
      })
    ]);

    return [
      {
        label: 'À affecter',
        value: toAssign,
        status: toAssign > 20 ? 'critical' : toAssign > 10 ? 'warning' : 'good'
      },
      {
        label: 'Utilisation équipe (%)',
        value: Math.round(teamUtilization),
        status: teamUtilization > 90 ? 'critical' : teamUtilization > 80 ? 'warning' : 'good'
      },
      {
        label: 'Conformité SLA (%)',
        value: Math.round(slaCompliance),
        status: slaCompliance < 90 ? 'critical' : slaCompliance < 95 ? 'warning' : 'good'
      },
      {
        label: 'Escalations',
        value: escalations,
        status: escalations > 0 ? 'warning' : 'good'
      }
    ];
  }

  private async getGestionnaireKPIs(userId: string): Promise<KPIData[]> {
    const [assigned, completed, efficiency, avgTime] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          currentHandlerId: userId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          currentHandlerId: userId,
          statut: 'TRAITE',
          dateCloture: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.getUserEfficiency(userId),
      this.getUserAverageProcessingTime(userId)
    ]);

    return [
      {
        label: 'Dossiers actifs',
        value: assigned,
        status: assigned > 15 ? 'warning' : 'good'
      },
      {
        label: 'Traités (7j)',
        value: completed,
        status: 'good'
      },
      {
        label: 'Efficacité (%)',
        value: Math.round(efficiency),
        status: efficiency < 80 ? 'warning' : 'good'
      },
      {
        label: 'Temps moyen (j)',
        value: Math.round(avgTime),
        status: avgTime > 5 ? 'warning' : 'good'
      }
    ];
  }

  private async getSuperAdminKPIs(): Promise<KPIData[]> {
    const [totalActive, systemLoad, slaGlobal, criticalAlerts] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          statut: { not: { in: ['TRAITE', 'CLOTURE'] } }
        }
      }),
      this.getSystemLoad(),
      this.getGlobalSLACompliance(),
      this.prisma.alertLog.count({
        where: {
          alertLevel: 'CRITICAL',
          resolved: false
        }
      })
    ]);

    return [
      {
        label: 'Dossiers actifs',
        value: totalActive,
        status: 'good'
      },
      {
        label: 'Charge système (%)',
        value: Math.round(systemLoad),
        status: systemLoad > 90 ? 'critical' : systemLoad > 80 ? 'warning' : 'good'
      },
      {
        label: 'SLA global (%)',
        value: Math.round(slaGlobal),
        status: slaGlobal < 90 ? 'critical' : slaGlobal < 95 ? 'warning' : 'good'
      },
      {
        label: 'Alertes critiques',
        value: criticalAlerts,
        status: criticalAlerts > 0 ? 'critical' : 'good'
      }
    ];
  }

  // === HELPER METHODS ===

  private async getRecentBOActivity(userId: string): Promise<any[]> {
    const activities = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['BO_MANUAL_ENTRY', 'BO_BATCH_ENTRY'] }
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    return activities.map(activity => ({
      timestamp: activity.timestamp,
      action: activity.action,
      details: activity.details
    }));
  }

  private async getRecentScanActivity(userId: string): Promise<any[]> {
    const activities = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['SCAN_STARTED', 'SCAN_COMPLETED', 'SCAN_QUALITY_CHECK'] }
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    return activities.map(activity => ({
      timestamp: activity.timestamp,
      action: activity.action,
      details: activity.details
    }));
  }

  private calculateScanPriority(bordereau: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const daysSinceReception = Math.floor((new Date().getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceReception > bordereau.delaiReglement * 0.8) return 'HIGH';
    if (daysSinceReception > bordereau.delaiReglement * 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private estimateScanCompletion(bordereau: any): Date {
    const avgScanTimePerBS = 2; // minutes per BS
    const remainingTime = bordereau.nombreBS * avgScanTimePerBS;
    return new Date(Date.now() + remainingTime * 60 * 1000);
  }

  private async getTeamWorkloadSummary(chefId: string): Promise<any> {
    const teamMembers = await this.prisma.user.findMany({
      where: {
        teamLeaderId: chefId,
        active: true
      }
    });

    const workloads = await Promise.all(
      teamMembers.map(async (member) => {
        const currentLoad = await this.prisma.bordereau.count({
          where: {
            currentHandlerId: member.id,
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        });

        return {
          id: member.id,
          name: member.fullName,
          currentLoad,
          capacity: member.capacity,
          utilizationRate: member.capacity > 0 ? (currentLoad / member.capacity) * 100 : 0
        };
      })
    );

    const avgUtilization = workloads.length > 0 
      ? workloads.reduce((sum, w) => sum + w.utilizationRate, 0) / workloads.length 
      : 0;

    return {
      totalMembers: teamMembers.length,
      avgUtilization,
      members: workloads
    };
  }

  private async getOverloadedTeamMembers(chefId: string): Promise<any[]> {
    const teamWorkload = await this.getTeamWorkloadSummary(chefId);
    return teamWorkload.members.filter((member: any) => member.utilizationRate > 90);
  }

  private async getRecentAssignments(chefId: string): Promise<any[]> {
    const assignments = await this.prisma.auditLog.findMany({
      where: {
        userId: chefId,
        action: 'BORDEREAU_ASSIGNED'
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    return assignments.map(assignment => ({
      timestamp: assignment.timestamp,
      details: assignment.details
    }));
  }

  private async getPendingEscalations(chefId: string): Promise<any[]> {
    return this.prisma.alertLog.findMany({
      where: {
        alertType: 'ESCALATION',
        resolved: false
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
  }

  private suggestAssignee(bordereau: any, teamMembers: any[]): string | null {
    if (!teamMembers || teamMembers.length === 0) return null;

    // Find member with lowest utilization rate
    const optimal = teamMembers.reduce((best, current) => 
      current.utilizationRate < best.utilizationRate ? current : best
    );

    return optimal.id;
  }

  private calculateAssignmentPriority(bordereau: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const daysSinceReception = Math.floor((new Date().getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24));
    
    if (bordereau.delaiReglement < 10 || daysSinceReception > 2) return 'HIGH';
    if (bordereau.delaiReglement < 20 || daysSinceReception > 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculateDaysRemaining(bordereau: any): number {
    const daysSinceReception = Math.floor((new Date().getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, bordereau.delaiReglement - daysSinceReception);
  }

  private calculateProcessingPriority(bordereau: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const daysRemaining = this.calculateDaysRemaining(bordereau);
    
    if (daysRemaining <= 2) return 'HIGH';
    if (daysRemaining <= 5) return 'MEDIUM';
    return 'LOW';
  }

  private estimateProgress(bordereau: any): number {
    // This would be based on actual processing stages
    // For now, return a simple estimate based on time
    const daysSinceStart = bordereau.dateReceptionSante 
      ? Math.floor((new Date().getTime() - bordereau.dateReceptionSante.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const estimatedDuration = Math.max(1, bordereau.delaiReglement * 0.8);
    return Math.min(100, (daysSinceStart / estimatedDuration) * 100);
  }

  // Additional helper methods would be implemented here...
  private async getAverageProcessingTime(service: string): Promise<number> { return 12; }
  private async getAverageScanTime(userId: string): Promise<number> { return 25; }
  private async getScanQuality(userId: string): Promise<number> { return 97; }
  private async getTeamUtilization(userId: string): Promise<number> { return 75; }
  private async getTeamSLACompliance(userId: string): Promise<number> { return 92; }
  private async getUserEfficiency(userId: string): Promise<number> { return 85; }
  private async getUserAverageProcessingTime(userId: string): Promise<number> { return 4.2; }
  private async getSystemLoad(): Promise<number> { return 68; }
  private async getGlobalSLACompliance(): Promise<number> { return 94; }
  private async getBOAnalytics(): Promise<any> { return {}; }
  private async getScanAnalytics(userId: string): Promise<any> { return {}; }
  private async getChefAnalytics(userId: string): Promise<any> { return {}; }
  private async getGestionnaireAnalytics(userId: string): Promise<any> { return {}; }
  private async getGestionnairePerformance(userId: string): Promise<any> { return { efficiency: 85 }; }
  private async getGestionnaireClientDistribution(userId: string): Promise<any> { return {}; }
  private async getSystemHealth(): Promise<any> { return {}; }
  private async getSystemAlerts(): Promise<any> { return {}; }
  private async getGlobalPerformance(): Promise<any> { return {}; }
}