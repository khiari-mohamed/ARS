import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamWorkloadConfigDto {
  teamId: string;
  maxLoad: number;
  autoReassignEnabled: boolean;
  overflowAction: 'ROUND_ROBIN' | 'LOWEST_LOAD' | 'CAPACITY_BASED' | 'BLOCK' | 'ESCALATE';
  alertThreshold?: number;
}

export interface WorkloadAnalytics {
  teamId: string;
  teamName: string;
  currentLoad: number;
  maxLoad: number;
  utilizationRate: number;
  status: 'HEALTHY' | 'WARNING' | 'OVERLOADED' | 'CRITICAL';
  alertsTriggered: number;
  reassignmentsOut: number;
  reassignmentsIn: number;
}

@Injectable()
export class TeamWorkloadConfigService {
  private readonly logger = new Logger(TeamWorkloadConfigService.name);

  constructor(private prisma: PrismaService) {}

  async createOrUpdateConfig(dto: TeamWorkloadConfigDto): Promise<any> {
    // Validate team exists
    const team = await this.prisma.user.findUnique({
      where: { id: dto.teamId, role: 'CHEF_EQUIPE', active: true }
    });

    if (!team) {
      throw new BadRequestException('Team not found or not active');
    }

    // Validate configuration values
    if (dto.maxLoad < 1 || dto.maxLoad > 200) {
      throw new BadRequestException('Max load must be between 1 and 200');
    }

    if (dto.alertThreshold && (dto.alertThreshold < 0 || dto.alertThreshold > dto.maxLoad)) {
      throw new BadRequestException('Alert threshold must be between 0 and max load');
    }

    const existing = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId: dto.teamId }
    });

    if (existing) {
      return await this.prisma.teamWorkloadConfig.update({
        where: { id: existing.id },
        data: {
          maxLoad: dto.maxLoad,
          autoReassignEnabled: dto.autoReassignEnabled,
          overflowAction: dto.overflowAction,
          alertThreshold: dto.alertThreshold,
          updatedAt: new Date()
        }
      });
    } else {
      return await this.prisma.teamWorkloadConfig.create({
        data: {
          teamId: dto.teamId,
          maxLoad: dto.maxLoad,
          autoReassignEnabled: dto.autoReassignEnabled,
          overflowAction: dto.overflowAction,
          alertThreshold: dto.alertThreshold
        }
      });
    }
  }

  async getTeamConfig(teamId: string): Promise<any> {
    const config = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId }
    });

    if (!config) {
      // Return default configuration
      return {
        teamId,
        maxLoad: 50,
        autoReassignEnabled: true,
        overflowAction: 'LOWEST_LOAD',
        alertThreshold: 40,
        isDefault: true
      };
    }

    return { ...config, isDefault: false };
  }

  async getAllTeamConfigs(): Promise<any[]> {
    const teams = await this.prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      select: { id: true, fullName: true }
    });

    const configs = await Promise.all(
      teams.map(async (team) => {
        const config = await this.getTeamConfig(team.id);
        return {
          ...config,
          teamName: team.fullName
        };
      })
    );

    return configs;
  }

  async getWorkloadAnalytics(teamId?: string): Promise<WorkloadAnalytics[]> {
    const whereClause = teamId ? { id: teamId } : {};
    
    const teams = await this.prisma.user.findMany({
      where: { 
        role: 'CHEF_EQUIPE', 
        active: true,
        ...whereClause
      },
      include: {
        bordereauxTeam: {
          where: {
            statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] },
            archived: false
          }
        }
      }
    });

    const analytics: WorkloadAnalytics[] = [];

    for (const team of teams) {
      const config = await this.getTeamConfig(team.id);
      const currentLoad = team.bordereauxTeam.length;
      const utilizationRate = (currentLoad / config.maxLoad) * 100;

      // Determine status
      let status: 'HEALTHY' | 'WARNING' | 'OVERLOADED' | 'CRITICAL';
      if (utilizationRate >= 100) {
        status = 'CRITICAL';
      } else if (utilizationRate >= 90) {
        status = 'OVERLOADED';
      } else if (utilizationRate >= (config.alertThreshold / config.maxLoad) * 100) {
        status = 'WARNING';
      } else {
        status = 'HEALTHY';
      }

      // Get reassignment statistics (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [reassignmentsOut, reassignmentsIn, alertsTriggered] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            action: 'AUTO_REASSIGNMENT',
            timestamp: { gte: thirtyDaysAgo },
            details: {
              path: ['fromTeamId'],
              equals: team.id
            }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            action: 'AUTO_REASSIGNMENT',
            timestamp: { gte: thirtyDaysAgo },
            details: {
              path: ['toTeamId'],
              equals: team.id
            }
          }
        }),
        this.prisma.alertLog.count({
          where: {
            alertType: 'TEAM_OVERLOAD_ALERT',
            createdAt: { gte: thirtyDaysAgo },
            message: { contains: team.fullName }
          }
        })
      ]);

      analytics.push({
        teamId: team.id,
        teamName: team.fullName,
        currentLoad,
        maxLoad: config.maxLoad,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        status,
        alertsTriggered,
        reassignmentsOut,
        reassignmentsIn
      });
    }

    return analytics.sort((a, b) => b.utilizationRate - a.utilizationRate);
  }

  async optimizeWorkloadDistribution(): Promise<{
    recommendations: string[];
    potentialReassignments: any[];
    estimatedImprovement: number;
  }> {
    const analytics = await this.getWorkloadAnalytics();
    const recommendations: string[] = [];
    const potentialReassignments: any[] = [];

    // Find overloaded and underutilized teams
    const overloadedTeams = analytics.filter(t => t.status === 'OVERLOADED' || t.status === 'CRITICAL');
    const availableTeams = analytics.filter(t => t.utilizationRate < 80).sort((a, b) => a.utilizationRate - b.utilizationRate);

    if (overloadedTeams.length === 0) {
      recommendations.push('✅ Toutes les équipes fonctionnent dans des limites acceptables');
      return { recommendations, potentialReassignments, estimatedImprovement: 0 };
    }

    if (availableTeams.length === 0) {
      recommendations.push('⚠️ Toutes les équipes sont en surcharge - considérer l\'augmentation des effectifs');
      return { recommendations, potentialReassignments, estimatedImprovement: 0 };
    }

    let totalReassignments = 0;
    let totalImprovement = 0;

    for (const overloadedTeam of overloadedTeams) {
      const excessLoad = overloadedTeam.currentLoad - Math.floor(overloadedTeam.maxLoad * 0.8);
      
      if (excessLoad > 0) {
        // Find best target team
        const targetTeam = availableTeams.find(t => 
          t.currentLoad + excessLoad <= Math.floor(t.maxLoad * 0.8)
        );

        if (targetTeam) {
          potentialReassignments.push({
            fromTeam: overloadedTeam.teamName,
            toTeam: targetTeam.teamName,
            dossierCount: Math.min(excessLoad, 5), // Limit to 5 dossiers per recommendation
            currentUtilization: overloadedTeam.utilizationRate,
            projectedUtilization: ((overloadedTeam.currentLoad - excessLoad) / overloadedTeam.maxLoad) * 100
          });

          totalReassignments += Math.min(excessLoad, 5);
          totalImprovement += overloadedTeam.utilizationRate - (((overloadedTeam.currentLoad - excessLoad) / overloadedTeam.maxLoad) * 100);

          // Update target team's projected load for next iteration
          targetTeam.currentLoad += Math.min(excessLoad, 5);
          targetTeam.utilizationRate = (targetTeam.currentLoad / targetTeam.maxLoad) * 100;
        }
      }
    }

    // Generate recommendations
    if (totalReassignments > 0) {
      recommendations.push(`📊 ${totalReassignments} dossiers peuvent être redistribués pour optimiser la charge`);
      recommendations.push(`📈 Amélioration estimée: ${Math.round(totalImprovement)}% de réduction de surcharge`);
    }

    // Configuration recommendations
    const criticalTeams = overloadedTeams.filter(t => t.status === 'CRITICAL');
    if (criticalTeams.length > 0) {
      recommendations.push(`🚨 ${criticalTeams.length} équipe(s) en surcharge critique - intervention immédiate requise`);
    }

    const highReassignmentTeams = analytics.filter(t => t.reassignmentsOut > 10);
    if (highReassignmentTeams.length > 0) {
      recommendations.push(`🔄 ${highReassignmentTeams.length} équipe(s) avec beaucoup de réaffectations - revoir la capacité`);
    }

    return {
      recommendations,
      potentialReassignments,
      estimatedImprovement: Math.round(totalImprovement * 100) / 100
    };
  }

  async executeOptimization(approvedReassignments: any[]): Promise<{
    success: number;
    failed: number;
    details: any[];
  }> {
    const results = { success: 0, failed: 0, details: [] as any[] };

    for (const reassignment of approvedReassignments) {
      try {
        // Find dossiers to reassign from the overloaded team
        const dossiers = await this.prisma.bordereau.findMany({
          where: {
            teamId: reassignment.fromTeamId,
            statut: { in: ['A_AFFECTER', 'ASSIGNE'] },
            archived: false
          },
          take: reassignment.dossierCount,
          orderBy: { dateReception: 'asc' } // Oldest first
        });

        for (const dossier of dossiers) {
          await this.prisma.bordereau.update({
            where: { id: dossier.id },
            data: { 
              teamId: reassignment.toTeamId,
              statut: 'A_AFFECTER'
            }
          });

          // Log the manual optimization
          await this.prisma.auditLog.create({
            data: {
              userId: 'SYSTEM',
              action: 'WORKLOAD_OPTIMIZATION',
              details: {
                bordereauId: dossier.id,
                fromTeamId: reassignment.fromTeamId,
                toTeamId: reassignment.toTeamId,
                reason: 'MANUAL_OPTIMIZATION',
                optimizationId: reassignment.id
              }
            }
          });
        }

        results.success += dossiers.length;
        results.details.push({
          fromTeam: reassignment.fromTeam,
          toTeam: reassignment.toTeam,
          reassigned: dossiers.length,
          status: 'SUCCESS'
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          fromTeam: reassignment.fromTeam,
          toTeam: reassignment.toTeam,
          status: 'FAILED',
          error: error.message
        });
        this.logger.error(`Failed to execute reassignment: ${error.message}`);
      }
    }

    return results;
  }

  async getTeamPerformanceReport(teamId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const [team, config, workloadHistory, reassignmentHistory] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: teamId },
        select: { fullName: true }
      }),
      this.getTeamConfig(teamId),
      this.prisma.auditLog.findMany({
        where: {
          action: { in: ['BORDEREAU_ASSIGNED', 'BORDEREAU_COMPLETED'] },
          timestamp: { gte: startDate },
          details: {
            path: ['teamId'],
            equals: teamId
          }
        },
        orderBy: { timestamp: 'asc' }
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: 'AUTO_REASSIGNMENT',
          timestamp: { gte: startDate },
          OR: [
            { details: { path: ['fromTeamId'], equals: teamId } },
            { details: { path: ['toTeamId'], equals: teamId } }
          ]
        }
      })
    ]);

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Calculate daily workload trends
    const dailyStats = new Map<string, { assigned: number; completed: number; load: number }>();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.set(dateKey, { assigned: 0, completed: 0, load: 0 });
    }

    workloadHistory.forEach(log => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      const stats = dailyStats.get(dateKey);
      if (stats) {
        if (log.action === 'BORDEREAU_ASSIGNED') {
          stats.assigned++;
        } else if (log.action === 'BORDEREAU_COMPLETED') {
          stats.completed++;
        }
      }
    });

    // Calculate performance metrics
    const totalAssigned = Array.from(dailyStats.values()).reduce((sum, s) => sum + s.assigned, 0);
    const totalCompleted = Array.from(dailyStats.values()).reduce((sum, s) => sum + s.completed, 0);
    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

    const reassignmentsOut = reassignmentHistory.filter(r => 
      r.details?.fromTeamId === teamId
    ).length;
    const reassignmentsIn = reassignmentHistory.filter(r => 
      r.details?.toTeamId === teamId
    ).length;

    return {
      teamId,
      teamName: team.fullName,
      period: { days, startDate, endDate: new Date() },
      configuration: config,
      performance: {
        totalAssigned,
        totalCompleted,
        completionRate: Math.round(completionRate * 100) / 100,
        avgDailyAssignments: Math.round((totalAssigned / days) * 100) / 100,
        avgDailyCompletions: Math.round((totalCompleted / days) * 100) / 100
      },
      reassignments: {
        outgoing: reassignmentsOut,
        incoming: reassignmentsIn,
        netFlow: reassignmentsIn - reassignmentsOut
      },
      dailyTrends: Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        assigned: stats.assigned,
        completed: stats.completed,
        netChange: stats.assigned - stats.completed
      }))
    };
  }
}