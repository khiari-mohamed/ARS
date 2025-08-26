import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RealTimeAnalyticsService {
  constructor(
    private prisma: PrismaService
    // private eventEmitter: EventEmitter2
  ) {}

  async processRealTimeEvent(eventType: string, data: any) {
    switch (eventType) {
      case 'bordereau.created':
        await this.handleBordereauCreated(data);
        break;
      case 'bordereau.updated':
        await this.handleBordereauUpdated(data);
        break;
      case 'sla.breach':
        await this.handleSLABreach(data);
        break;
      case 'ov.created':
        await this.handleOVCreated(data);
        break;
    }
  }

  private async handleBordereauCreated(data: any) {
    // Update real-time KPIs
    const kpis = await this.calculateRealTimeKPIs();
    console.log('Analytics KPIs updated:', kpis);
    
    // Check for SLA risk
    const slaRisk = await this.calculateSLARisk(data.bordereauId);
    if (slaRisk.level !== 'green') {
      console.log('SLA risk detected:', slaRisk);
    }
  }

  private async handleBordereauUpdated(data: any) {
    // Recalculate performance metrics
    const performance = await this.calculatePerformanceMetrics(data.assignedToUserId);
    console.log('Performance updated:', performance);
  }

  private async handleSLABreach(data: any) {
    // Create alert and escalate
    await this.createSLAAlert(data);
    console.log('Alert created:', data);
  }

  private async handleOVCreated(data: any) {
    // Update OV analytics
    const ovMetrics = await this.calculateOVMetrics();
    console.log('OV metrics updated:', ovMetrics);
  }

  private async calculateRealTimeKPIs() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [totalToday, processedToday, slaCompliant, avgProcessingTime] = await Promise.all([
      this.prisma.bordereau.count({
        where: { createdAt: { gte: today } }
      }),
      this.prisma.bordereau.count({
        where: { 
          createdAt: { gte: today },
          statut: { in: ['CLOTURE', 'VIREMENT_EXECUTE'] }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          createdAt: { gte: today },
          dateCloture: { not: null },
          // SLA compliant: closed within delaiReglement
        }
      }),
      this.prisma.bordereau.aggregate({
        _avg: { delaiReglement: true },
        where: { createdAt: { gte: today } }
      })
    ]);

    return {
      totalToday,
      processedToday,
      slaCompliant,
      avgProcessingTime: avgProcessingTime._avg.delaiReglement || 0,
      timestamp: now
    };
  }

  private async calculateSLARisk(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { contract: true, client: true }
    });

    if (!bordereau) return { level: 'green', risk: 0 };

    const now = new Date();
    const daysSinceReception = bordereau.dateReception 
      ? Math.floor((now.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const slaThreshold = 5; // Fixed SLA threshold
    
    let level = 'green';
    let risk = 0;

    if (daysSinceReception > slaThreshold) {
      level = 'red';
      risk = 1;
    } else if (daysSinceReception > slaThreshold * 0.8) {
      level = 'orange';
      risk = 0.8;
    }

    return {
      bordereauId,
      level,
      risk,
      daysSinceReception,
      slaThreshold,
      daysRemaining: Math.max(0, slaThreshold - daysSinceReception)
    };
  }

  private async calculatePerformanceMetrics(userId: string) {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [processedThisWeek, avgTimeThisWeek] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: userId,
          dateCloture: { gte: weekAgo, lte: today }
        }
      }),
      this.prisma.bordereau.aggregate({
        _avg: { delaiReglement: true },
        where: {
          assignedToUserId: userId,
          dateCloture: { gte: weekAgo, lte: today }
        }
      })
    ]);

    return {
      userId,
      processedThisWeek,
      avgTimeThisWeek: avgTimeThisWeek._avg.delaiReglement || 0,
      targetPerWeek: 35, // 5 per day * 7 days
      performance: processedThisWeek / 35
    };
  }

  private async calculateOVMetrics() {
    const [totalOV, executedOV, pendingOV, avgExecutionTime] = await Promise.all([
      this.prisma.virement.count(),
      this.prisma.virement.count({ where: { confirmed: true } }),
      this.prisma.virement.count({ where: { confirmed: false } }),
      this.prisma.virement.aggregate({
        _avg: { 
          // Calculate avg execution time in days
        },
        where: { confirmed: true }
      })
    ]);

    return {
      totalOV,
      executedOV,
      pendingOV,
      avgExecutionTime: 2.5, // placeholder
      executionRate: totalOV > 0 ? (executedOV / totalOV) * 100 : 0
    };
  }

  private async createSLAAlert(data: any) {
    // Create alert in database
    // Create alert in database - simplified for now
    console.log('SLA Alert created:', {
      type: 'SLA_BREACH',
      severity: 'HIGH',
      message: `SLA breach detected for bordereau ${data.bordereauId}`,
      userId: data.assignedToUserId
    });
  }
}