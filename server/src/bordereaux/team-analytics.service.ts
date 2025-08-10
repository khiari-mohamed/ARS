import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamPerformanceMetrics {
  teamId: string;
  period: string;
  totalProcessed: number;
  avgProcessingTime: number;
  efficiency: number;
  qualityScore: number;
  memberMetrics: IndividualMetrics[];
  trends: PerformanceTrend[];
}

export interface IndividualMetrics {
  userId: string;
  fullName: string;
  processed: number;
  avgTime: number;
  efficiency: number;
  qualityScore: number;
  workload: number;
  capacity: number;
  skillLevel: number;
}

export interface PerformanceTrend {
  date: string;
  metric: string;
  value: number;
  change: number;
}

export interface ProductivityAnalysis {
  hourlyDistribution: { hour: number; count: number }[];
  dailyTrends: { date: string; productivity: number }[];
  bottlenecks: { stage: string; avgTime: number; impact: number }[];
  recommendations: string[];
}

@Injectable()
export class TeamAnalyticsService {
  private readonly logger = new Logger(TeamAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // === TEAM PERFORMANCE ANALYTICS ===
  async getTeamPerformanceMetrics(teamId: string, period: string = '30d'): Promise<TeamPerformanceMetrics> {
    const dateRange = this.getDateRange(period);
    const teamMembers = await this.getTeamMembers(teamId);

    // Get team-level metrics
    const totalProcessed = await this.getTotalProcessed(teamId, dateRange);
    const avgProcessingTime = await this.getAvgProcessingTime(teamId, dateRange);
    const efficiency = await this.getTeamEfficiency(teamId, dateRange);
    const qualityScore = await this.getTeamQualityScore(teamId, dateRange);

    // Get individual metrics for each team member
    const memberMetrics = await Promise.all(
      teamMembers.map(member => this.getIndividualMetrics(member.id, dateRange))
    );

    // Get performance trends
    const trends = await this.getPerformanceTrends(teamId, dateRange);

    return {
      teamId,
      period,
      totalProcessed,
      avgProcessingTime,
      efficiency,
      qualityScore,
      memberMetrics,
      trends
    };
  }

  async getIndividualMetrics(userId: string, dateRange: { start: Date; end: Date }): Promise<IndividualMetrics> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true }
    });

    const processed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    const avgTime = await this.getUserAvgProcessingTime(userId, dateRange);
    const efficiency = await this.getUserEfficiency(userId, dateRange);
    const qualityScore = await this.getUserQualityScore(userId, dateRange);
    const workload = await this.getCurrentUserWorkload(userId);
    const capacity = await this.getUserCapacity(userId);
    const skillLevel = await this.getUserSkillLevel(userId);

    return {
      userId,
      fullName: user?.fullName || 'Unknown',
      processed,
      avgTime,
      efficiency,
      qualityScore,
      workload,
      capacity,
      skillLevel
    };
  }

  async getPerformanceTrends(teamId: string, dateRange: { start: Date; end: Date }): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const dailyProcessed = await this.prisma.bordereau.count({
        where: {
          currentHandler: { department: teamId },
          statut: 'TRAITE',
          updatedAt: { gte: date, lt: nextDate }
        }
      });

      const dailyEfficiency = await this.getDailyTeamEfficiency(teamId, date, nextDate);

      trends.push(
        {
          date: date.toISOString().split('T')[0],
          metric: 'processed',
          value: dailyProcessed,
          change: i > 0 ? dailyProcessed - trends[trends.length - 2]?.value || 0 : 0
        },
        {
          date: date.toISOString().split('T')[0],
          metric: 'efficiency',
          value: dailyEfficiency,
          change: i > 0 ? dailyEfficiency - trends[trends.length - 1]?.value || 0 : 0
        }
      );
    }

    return trends;
  }

  // === PRODUCTIVITY ANALYSIS ===
  async getProductivityAnalysis(teamId: string, period: string = '30d'): Promise<ProductivityAnalysis> {
    const dateRange = this.getDateRange(period);

    const hourlyDistribution = await this.getHourlyDistribution(teamId, dateRange);
    const dailyTrends = await this.getDailyProductivityTrends(teamId, dateRange);
    const bottlenecks = await this.identifyBottlenecks(teamId, dateRange);
    const recommendations = await this.generateRecommendations(teamId, dateRange);

    return {
      hourlyDistribution,
      dailyTrends,
      bottlenecks,
      recommendations
    };
  }

  private async getHourlyDistribution(teamId: string, dateRange: { start: Date; end: Date }) {
    const distribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        currentHandler: { department: teamId },
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      },
      select: { updatedAt: true }
    });

    bordereaux.forEach(b => {
      const hour = b.updatedAt.getHours();
      distribution[hour].count++;
    });

    return distribution;
  }

  private async getDailyProductivityTrends(teamId: string, dateRange: { start: Date; end: Date }) {
    const trends: any[] = [];
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const dailyProcessed = await this.prisma.bordereau.count({
        where: {
          currentHandler: { department: teamId },
          statut: 'TRAITE',
          updatedAt: { gte: date, lt: nextDate }
        }
      });

      const teamSize = await this.getTeamSize(teamId);
      const productivity = teamSize > 0 ? dailyProcessed / teamSize : 0;

      trends.push({
        date: date.toISOString().split('T')[0],
        productivity
      });
    }

    return trends;
  }

  private async identifyBottlenecks(teamId: string, dateRange: { start: Date; end: Date }) {
    const stages = [
      { stage: 'SCAN_EN_COURS', name: 'Scanning' },
      { stage: 'ASSIGNE', name: 'Assignment' },
      { stage: 'EN_COURS', name: 'Processing' },
      { stage: 'TRAITE', name: 'Completion' }
    ];

    const bottlenecks: any[] = [];

    for (const stage of stages) {
      const avgTime = await this.getStageAvgTime(teamId, stage.stage, dateRange);
      const impact = await this.getStageImpact(teamId, stage.stage, dateRange);

      bottlenecks.push({
        stage: stage.name,
        avgTime,
        impact
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  private async generateRecommendations(teamId: string, dateRange: { start: Date; end: Date }): Promise<string[]> {
    const recommendations: string[] = [];
    const metrics = await this.getTeamPerformanceMetrics(teamId, '30d');

    // Workload balance recommendation
    const workloadVariance = this.calculateWorkloadVariance(metrics.memberMetrics);
    if (workloadVariance > 0.3) {
      recommendations.push('Rééquilibrer la charge de travail entre les membres de l\'équipe');
    }

    // Efficiency recommendation
    if (metrics.efficiency < 0.8) {
      recommendations.push('Identifier et résoudre les obstacles à la productivité');
    }

    // Quality recommendation
    if (metrics.qualityScore < 0.85) {
      recommendations.push('Mettre en place des formations pour améliorer la qualité');
    }

    // Processing time recommendation
    if (metrics.avgProcessingTime > 7) {
      recommendations.push('Optimiser les processus pour réduire les délais de traitement');
    }

    return recommendations;
  }

  // === INDIVIDUAL VS TEAM COMPARISON ===
  async getIndividualVsTeamComparison(userId: string, teamId: string, period: string = '30d') {
    const dateRange = this.getDateRange(period);
    
    const individualMetrics = await this.getIndividualMetrics(userId, dateRange);
    const teamMetrics = await this.getTeamPerformanceMetrics(teamId, period);

    const comparison = {
      individual: individualMetrics,
      team: {
        avgProcessed: teamMetrics.memberMetrics.reduce((sum, m) => sum + m.processed, 0) / teamMetrics.memberMetrics.length,
        avgTime: teamMetrics.avgProcessingTime,
        avgEfficiency: teamMetrics.efficiency,
        avgQuality: teamMetrics.qualityScore
      },
      rankings: {
        processedRank: this.getRanking(individualMetrics.processed, teamMetrics.memberMetrics.map(m => m.processed)),
        efficiencyRank: this.getRanking(individualMetrics.efficiency, teamMetrics.memberMetrics.map(m => m.efficiency)),
        qualityRank: this.getRanking(individualMetrics.qualityScore, teamMetrics.memberMetrics.map(m => m.qualityScore))
      }
    };

    return comparison;
  }

  // === HELPER METHODS ===
  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }

  private async getTeamMembers(teamId: string) {
    return this.prisma.user.findMany({
      where: { department: teamId },
      select: { id: true, fullName: true }
    });
  }

  private async getTotalProcessed(teamId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        currentHandler: { department: teamId },
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });
  }

  private async getAvgProcessingTime(teamId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        currentHandler: { department: teamId },
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      },
      select: { createdAt: true, updatedAt: true }
    });

    if (bordereaux.length === 0) return 0;

    const totalTime = bordereaux.reduce((sum, b) => {
      const assignedDate = b.createdAt;
      const completedDate = b.updatedAt;
      const diffDays = Math.ceil((completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return totalTime / bordereaux.length;
  }

  private async getTeamEfficiency(teamId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandler: { department: teamId },
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandler: { department: teamId },
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    return assigned > 0 ? completed / assigned : 0;
  }

  private async getTeamQualityScore(teamId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    // Mock quality score calculation
    return Math.random() * 0.2 + 0.8; // 0.8-1.0 range
  }

  private async getUserAvgProcessingTime(userId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      },
      select: { createdAt: true, updatedAt: true }
    });

    if (bordereaux.length === 0) return 0;

    const totalTime = bordereaux.reduce((sum, b) => {
      const assignedDate = b.createdAt;
      const completedDate = b.updatedAt;
      const diffDays = Math.ceil((completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return totalTime / bordereaux.length;
  }

  private async getUserEfficiency(userId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    return assigned > 0 ? completed / assigned : 0;
  }

  private async getUserQualityScore(userId: string, dateRange: { start: Date; end: Date }): Promise<number> {
    return Math.random() * 0.2 + 0.8;
  }

  private async getCurrentUserWorkload(userId: string): Promise<number> {
    return this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });
  }

  private async getUserCapacity(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return 20; // Default capacity since capacity field doesn't exist
  }

  private async getUserSkillLevel(userId: string): Promise<number> {
    return Math.random() * 2 + 3; // 3-5 range
  }

  private async getDailyTeamEfficiency(teamId: string, start: Date, end: Date): Promise<number> {
    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandler: { department: teamId },
        createdAt: { gte: start, lt: end }
      }
    });

    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandler: { department: teamId },
        statut: 'TRAITE',
        updatedAt: { gte: start, lt: end }
      }
    });

    return assigned > 0 ? completed / assigned : 0;
  }

  private async getTeamSize(teamId: string): Promise<number> {
    return this.prisma.user.count({
      where: { department: teamId }
    });
  }

  private async getStageAvgTime(teamId: string, stage: string, dateRange: { start: Date; end: Date }): Promise<number> {
    return Math.random() * 3 + 1; // Mock 1-4 days
  }

  private async getStageImpact(teamId: string, stage: string, dateRange: { start: Date; end: Date }): Promise<number> {
    return Math.random() * 0.5 + 0.3; // Mock 0.3-0.8 impact
  }

  private calculateWorkloadVariance(memberMetrics: IndividualMetrics[]): number {
    const workloads = memberMetrics.map(m => m.workload / m.capacity);
    const avg = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / workloads.length;
    return Math.sqrt(variance);
  }

  private getRanking(value: number, values: number[]): number {
    const sorted = [...values].sort((a, b) => b - a);
    return sorted.indexOf(value) + 1;
  }
}