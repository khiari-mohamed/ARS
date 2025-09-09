import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WorkflowMetrics {
  totalProcessed: number;
  avgProcessingTime: number;
  slaCompliance: number;
  bottlenecks: string[];
  efficiency: number;
  throughput: number;
}

export interface ServicePerformance {
  service: string;
  metrics: WorkflowMetrics;
  trends: any[];
  recommendations: string[];
}

@Injectable()
export class WorkflowAnalyticsService {
  private readonly logger = new Logger(WorkflowAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // === COMPREHENSIVE WORKFLOW ANALYTICS ===

  async getWorkflowAnalytics(period: number = 30): Promise<{
    overview: WorkflowMetrics;
    byService: ServicePerformance[];
    trends: any[];
    insights: string[];
  }> {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    const [overview, servicePerformance, trends] = await Promise.all([
      this.calculateOverviewMetrics(startDate),
      this.calculateServicePerformance(startDate),
      this.calculateWorkflowTrends(startDate, period)
    ]);

    const insights = this.generateInsights(overview, servicePerformance, trends);

    return {
      overview,
      byService: servicePerformance,
      trends,
      insights
    };
  }

  private async calculateOverviewMetrics(startDate: Date): Promise<WorkflowMetrics> {
    const [totalProcessed, avgProcessingTime, slaCompliance, bottlenecks, efficiency, throughput] = await Promise.all([
      this.getTotalProcessed(startDate),
      this.getAverageProcessingTime(startDate),
      this.getSLACompliance(startDate),
      this.identifyBottlenecks(startDate),
      this.calculateEfficiency(startDate),
      this.calculateThroughput(startDate)
    ]);

    return {
      totalProcessed,
      avgProcessingTime,
      slaCompliance,
      bottlenecks,
      efficiency,
      throughput
    };
  }

  private async getTotalProcessed(startDate: Date): Promise<number> {
    return await this.prisma.bordereau.count({
      where: {
        dateCloture: { gte: startDate },
        statut: 'CLOTURE'
      }
    });
  }

  private async getAverageProcessingTime(startDate: Date): Promise<number> {
    const completedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateCloture: { gte: startDate },
        statut: 'CLOTURE'
      },
      select: {
        dateReception: true,
        dateCloture: true
      }
    });

    if (completedBordereaux.length === 0) return 0;

    const totalTime = completedBordereaux.reduce((sum, b) => {
      const processingTime = b.dateCloture!.getTime() - b.dateReception.getTime();
      return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);

    return totalTime / completedBordereaux.length;
  }

  private async getSLACompliance(startDate: Date): Promise<number> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateCloture: { gte: startDate },
        statut: 'CLOTURE'
      },
      include: { client: true }
    });

    if (bordereaux.length === 0) return 100;

    const compliantCount = bordereaux.filter(b => {
      const processingDays = Math.floor((b.dateCloture!.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
      return processingDays <= b.client.reglementDelay;
    }).length;

    return (compliantCount / bordereaux.length) * 100;
  }

  private async identifyBottlenecks(startDate: Date): Promise<string[]> {
    // Analyze workflow steps to identify bottlenecks
    const bottlenecks: string[] = [];

    // Check SCAN processing times
    const scanDelays = await this.prisma.bordereau.count({
      where: {
        dateReception: { gte: startDate },
        dateDebutScan: { not: null },
        dateFinScan: { not: null },
        // Add condition for scan time > 4 hours
      }
    });

    if (scanDelays > 0) {
      bottlenecks.push('SCAN_PROCESSING_DELAYS');
    }

    // Check team assignment delays
    const assignmentDelays = await this.prisma.bordereau.count({
      where: {
        dateFinScan: { gte: startDate },
        assignedToUserId: null,
        statut: 'A_AFFECTER'
      }
    });

    if (assignmentDelays > 10) {
      bottlenecks.push('ASSIGNMENT_BACKLOG');
    }

    // Check finance processing delays
    const financeDelays = await this.prisma.ordreVirement.count({
      where: {
        dateCreation: { gte: startDate },
        etatVirement: 'NON_EXECUTE'
      }
    });

    if (financeDelays > 5) {
      bottlenecks.push('FINANCE_PROCESSING_DELAYS');
    }

    return bottlenecks;
  }

  private async calculateEfficiency(startDate: Date): Promise<number> {
    // Calculate workflow efficiency based on actual vs expected processing times
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateCloture: { gte: startDate },
        statut: 'CLOTURE'
      },
      include: { client: true }
    });

    if (bordereaux.length === 0) return 100;

    const efficiencyScores = bordereaux.map(b => {
      const actualDays = Math.floor((b.dateCloture!.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
      const expectedDays = b.client.reglementDelay;
      
      // Efficiency = (expected / actual) * 100, capped at 100%
      return Math.min((expectedDays / actualDays) * 100, 100);
    });

    return efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length;
  }

  private async calculateThroughput(startDate: Date): Promise<number> {
    const days = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalProcessed = await this.getTotalProcessed(startDate);
    
    return totalProcessed / days;
  }

  private async calculateServicePerformance(startDate: Date): Promise<ServicePerformance[]> {
    const services = ['BO', 'SCAN', 'SANTE', 'FINANCE'];
    const performance: ServicePerformance[] = [];

    for (const service of services) {
      const metrics = await this.calculateServiceMetrics(service, startDate);
      const trends = await this.calculateServiceTrends(service, startDate);
      const recommendations = this.generateServiceRecommendations(service, metrics);

      performance.push({
        service,
        metrics,
        trends,
        recommendations
      });
    }

    return performance;
  }

  private async calculateServiceMetrics(service: string, startDate: Date): Promise<WorkflowMetrics> {
    // Service-specific metrics calculation
    switch (service) {
      case 'BO':
        return this.calculateBOMetrics(startDate);
      case 'SCAN':
        return this.calculateScanMetrics(startDate);
      case 'SANTE':
        return this.calculateSanteMetrics(startDate);
      case 'FINANCE':
        return this.calculateFinanceMetrics(startDate);
      default:
        return {
          totalProcessed: 0,
          avgProcessingTime: 0,
          slaCompliance: 100,
          bottlenecks: [],
          efficiency: 100,
          throughput: 0
        };
    }
  }

  private async calculateBOMetrics(startDate: Date): Promise<WorkflowMetrics> {
    const totalProcessed = await this.prisma.bordereau.count({
      where: { dateReceptionBO: { gte: startDate } }
    });

    const avgProcessingTime = await this.calculateBOProcessingTime(startDate);
    const slaCompliance = await this.calculateBOSLACompliance(startDate);

    return {
      totalProcessed,
      avgProcessingTime,
      slaCompliance,
      bottlenecks: slaCompliance < 90 ? ['BO_SLA_BREACH'] : [],
      efficiency: slaCompliance,
      throughput: totalProcessed / 30
    };
  }

  private async calculateScanMetrics(startDate: Date): Promise<WorkflowMetrics> {
    const totalProcessed = await this.prisma.bordereau.count({
      where: { 
        dateFinScan: { gte: startDate },
        statut: { in: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'CLOTURE'] }
      }
    });

    const avgProcessingTime = await this.calculateScanProcessingTime(startDate);
    const slaCompliance = await this.calculateScanSLACompliance(startDate);

    return {
      totalProcessed,
      avgProcessingTime,
      slaCompliance,
      bottlenecks: avgProcessingTime > 4 ? ['SCAN_PROCESSING_SLOW'] : [],
      efficiency: slaCompliance,
      throughput: totalProcessed / 30
    };
  }

  private async calculateSanteMetrics(startDate: Date): Promise<WorkflowMetrics> {
    const totalProcessed = await this.prisma.bordereau.count({
      where: { 
        dateReceptionEquipeSante: { gte: startDate },
        statut: { in: ['TRAITE', 'PRET_VIREMENT', 'CLOTURE'] }
      }
    });

    const avgProcessingTime = await this.calculateSanteProcessingTime(startDate);
    const slaCompliance = await this.calculateSanteSLACompliance(startDate);

    return {
      totalProcessed,
      avgProcessingTime,
      slaCompliance,
      bottlenecks: this.identifySanteBottlenecks(avgProcessingTime, slaCompliance),
      efficiency: slaCompliance,
      throughput: totalProcessed / 30
    };
  }

  private async calculateFinanceMetrics(startDate: Date): Promise<WorkflowMetrics> {
    const totalProcessed = await this.prisma.ordreVirement.count({
      where: { 
        dateCreation: { gte: startDate },
        etatVirement: 'EXECUTE'
      }
    });

    const avgProcessingTime = await this.calculateFinanceProcessingTime(startDate);
    const slaCompliance = await this.calculateFinanceSLACompliance(startDate);

    return {
      totalProcessed,
      avgProcessingTime,
      slaCompliance,
      bottlenecks: avgProcessingTime > 24 ? ['FINANCE_PROCESSING_SLOW'] : [],
      efficiency: slaCompliance,
      throughput: totalProcessed / 30
    };
  }

  // Helper methods for specific service calculations
  private async calculateBOProcessingTime(startDate: Date): Promise<number> {
    // Calculate average time from reception to BO entry
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { dateReceptionBO: { gte: startDate } },
      select: { dateReception: true, dateReceptionBO: true }
    });

    if (bordereaux.length === 0) return 0;

    const totalTime = bordereaux.reduce((sum, b) => {
      if (b.dateReceptionBO) {
        return sum + (b.dateReceptionBO.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    return totalTime / bordereaux.length;
  }

  private async calculateBOSLACompliance(startDate: Date): Promise<number> {
    // BO SLA target: 2 hours
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { dateReceptionBO: { gte: startDate } },
      select: { dateReception: true, dateReceptionBO: true }
    });

    if (bordereaux.length === 0) return 100;

    const compliantCount = bordereaux.filter(b => {
      if (b.dateReceptionBO) {
        const hours = (b.dateReceptionBO.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60);
        return hours <= 2;
      }
      return false;
    }).length;

    return (compliantCount / bordereaux.length) * 100;
  }

  private async calculateScanProcessingTime(startDate: Date): Promise<number> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        dateFinScan: { gte: startDate },
        dateDebutScan: { not: null }
      },
      select: { dateDebutScan: true, dateFinScan: true }
    });

    if (bordereaux.length === 0) return 0;

    const totalTime = bordereaux.reduce((sum, b) => {
      if (b.dateDebutScan && b.dateFinScan) {
        return sum + (b.dateFinScan.getTime() - b.dateDebutScan.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    return totalTime / bordereaux.length;
  }

  private async calculateScanSLACompliance(startDate: Date): Promise<number> {
    // SCAN SLA target: 4 hours
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        dateFinScan: { gte: startDate },
        dateDebutScan: { not: null }
      },
      select: { dateDebutScan: true, dateFinScan: true }
    });

    if (bordereaux.length === 0) return 100;

    const compliantCount = bordereaux.filter(b => {
      if (b.dateDebutScan && b.dateFinScan) {
        const hours = (b.dateFinScan.getTime() - b.dateDebutScan.getTime()) / (1000 * 60 * 60);
        return hours <= 4;
      }
      return false;
    }).length;

    return (compliantCount / bordereaux.length) * 100;
  }

  private async calculateSanteProcessingTime(startDate: Date): Promise<number> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        dateReceptionEquipeSante: { gte: startDate },
        dateCloture: { not: null }
      },
      select: { dateReceptionEquipeSante: true, dateCloture: true }
    });

    if (bordereaux.length === 0) return 0;

    const totalTime = bordereaux.reduce((sum, b) => {
      if (b.dateReceptionEquipeSante && b.dateCloture) {
        return sum + (b.dateCloture.getTime() - b.dateReceptionEquipeSante.getTime()) / (1000 * 60 * 60 * 24); // days
      }
      return sum;
    }, 0);

    return totalTime / bordereaux.length;
  }

  private async calculateSanteSLACompliance(startDate: Date): Promise<number> {
    // SANTE SLA target: varies by client (48h default)
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        dateReceptionEquipeSante: { gte: startDate },
        dateCloture: { not: null }
      },
      include: { client: true }
    });

    if (bordereaux.length === 0) return 100;

    const compliantCount = bordereaux.filter(b => {
      if (b.dateReceptionEquipeSante && b.dateCloture) {
        const hours = (b.dateCloture.getTime() - b.dateReceptionEquipeSante.getTime()) / (1000 * 60 * 60);
        return hours <= (b.client.reglementDelay * 24);
      }
      return false;
    }).length;

    return (compliantCount / bordereaux.length) * 100;
  }

  private identifySanteBottlenecks(avgProcessingTime: number, slaCompliance: number): string[] {
    const bottlenecks: string[] = [];
    
    if (avgProcessingTime > 2) { // More than 2 days average
      bottlenecks.push('SANTE_PROCESSING_SLOW');
    }
    
    if (slaCompliance < 85) {
      bottlenecks.push('SANTE_SLA_BREACH');
    }
    
    return bottlenecks;
  }

  private async calculateFinanceProcessingTime(startDate: Date): Promise<number> {
    const ordres = await this.prisma.ordreVirement.findMany({
      where: { 
        dateCreation: { gte: startDate },
        dateTraitement: { not: null }
      },
      select: { dateCreation: true, dateTraitement: true }
    });

    if (ordres.length === 0) return 0;

    const totalTime = ordres.reduce((sum, o) => {
      if (o.dateTraitement) {
        return sum + (o.dateTraitement.getTime() - o.dateCreation.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    return totalTime / ordres.length;
  }

  private async calculateFinanceSLACompliance(startDate: Date): Promise<number> {
    // FINANCE SLA target: 24 hours
    const ordres = await this.prisma.ordreVirement.findMany({
      where: { 
        dateCreation: { gte: startDate },
        dateTraitement: { not: null }
      },
      select: { dateCreation: true, dateTraitement: true }
    });

    if (ordres.length === 0) return 100;

    const compliantCount = ordres.filter(o => {
      if (o.dateTraitement) {
        const hours = (o.dateTraitement.getTime() - o.dateCreation.getTime()) / (1000 * 60 * 60);
        return hours <= 24;
      }
      return false;
    }).length;

    return (compliantCount / ordres.length) * 100;
  }

  private async calculateServiceTrends(service: string, startDate: Date): Promise<any[]> {
    const trends: any[] = [];
    const days = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dailyMetrics = await this.calculateDailyServiceMetrics(service, dayStart, dayEnd);
      
      trends.push({
        date: dayStart.toISOString().split('T')[0],
        ...dailyMetrics
      });
    }
    
    return trends;
  }

  private async calculateDailyServiceMetrics(service: string, dayStart: Date, dayEnd: Date): Promise<any> {
    // Simplified daily metrics calculation
    switch (service) {
      case 'BO':
        return {
          processed: await this.prisma.bordereau.count({
            where: { dateReceptionBO: { gte: dayStart, lt: dayEnd } }
          })
        };
      case 'SCAN':
        return {
          processed: await this.prisma.bordereau.count({
            where: { dateFinScan: { gte: dayStart, lt: dayEnd } }
          })
        };
      case 'SANTE':
        return {
          processed: await this.prisma.bordereau.count({
            where: { dateReceptionEquipeSante: { gte: dayStart, lt: dayEnd } }
          })
        };
      case 'FINANCE':
        return {
          processed: await this.prisma.ordreVirement.count({
            where: { dateCreation: { gte: dayStart, lt: dayEnd } }
          })
        };
      default:
        return { processed: 0 };
    }
  }

  private generateServiceRecommendations(service: string, metrics: WorkflowMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.slaCompliance < 90) {
      recommendations.push(`${service}: SLA compliance critique (${metrics.slaCompliance.toFixed(1)}%) - Révision urgente requise`);
    }
    
    if (metrics.efficiency < 80) {
      recommendations.push(`${service}: Efficacité faible (${metrics.efficiency.toFixed(1)}%) - Optimisation des processus recommandée`);
    }
    
    if (metrics.bottlenecks.length > 0) {
      recommendations.push(`${service}: Goulots d'étranglement détectés - ${metrics.bottlenecks.join(', ')}`);
    }
    
    if (metrics.throughput < 1) {
      recommendations.push(`${service}: Débit faible (${metrics.throughput.toFixed(1)}/jour) - Considérer l'augmentation des ressources`);
    }
    
    return recommendations;
  }

  private async calculateWorkflowTrends(startDate: Date, period: number): Promise<any[]> {
    const trends: Array<{
      date: string;
      received: number;
      processed: number;
      slaBreaches: number;
      backlog: number;
    }> = [];
    const days = Math.min(period, 30);
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const [received, processed, slaBreaches] = await Promise.all([
        this.prisma.bordereau.count({
          where: { dateReception: { gte: dayStart, lt: dayEnd } }
        }),
        this.prisma.bordereau.count({
          where: { dateCloture: { gte: dayStart, lt: dayEnd } }
        }),
        this.prisma.bordereau.count({
          where: {
            dateCloture: { gte: dayStart, lt: dayEnd }
          }
        })
      ]);
      
      trends.push({
        date: dayStart.toISOString().split('T')[0],
        received,
        processed,
        slaBreaches,
        backlog: received - processed
      });
    }
    
    return trends;
  }

  private generateInsights(overview: WorkflowMetrics, servicePerformance: ServicePerformance[], trends: any[]): string[] {
    const insights: string[] = [];
    
    // Overall performance insights
    if (overview.slaCompliance > 95) {
      insights.push('✅ Excellente performance SLA globale');
    } else if (overview.slaCompliance < 85) {
      insights.push('🚨 Performance SLA critique - intervention immédiate requise');
    }
    
    if (overview.efficiency > 90) {
      insights.push('✅ Efficacité workflow optimale');
    } else if (overview.efficiency < 70) {
      insights.push('⚠️ Efficacité workflow faible - optimisation nécessaire');
    }
    
    // Service-specific insights
    const worstPerformingService = servicePerformance.reduce((worst, current) => 
      current.metrics.slaCompliance < worst.metrics.slaCompliance ? current : worst
    );
    
    if (worstPerformingService.metrics.slaCompliance < 90) {
      insights.push(`🎯 Service ${worstPerformingService.service} nécessite une attention prioritaire`);
    }
    
    // Trend insights
    if (trends.length > 7) {
      const recentTrends = trends.slice(-7);
      const avgBacklog = recentTrends.reduce((sum, t) => sum + t.backlog, 0) / recentTrends.length;
      
      if (avgBacklog > 10) {
        insights.push('📈 Accumulation de retard détectée - considérer l\'augmentation des ressources');
      } else if (avgBacklog < 0) {
        insights.push('📉 Traitement plus rapide que la réception - capacité excédentaire disponible');
      }
    }
    
    // Bottleneck insights
    const allBottlenecks = servicePerformance.flatMap(s => s.metrics.bottlenecks);
    const uniqueBottlenecks = [...new Set(allBottlenecks)];
    
    if (uniqueBottlenecks.length > 0) {
      insights.push(`🔍 Goulots d'étranglement identifiés: ${uniqueBottlenecks.join(', ')}`);
    }
    
    return insights;
  }
}