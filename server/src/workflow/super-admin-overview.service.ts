import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminOverviewService {
  private readonly logger = new Logger(SuperAdminOverviewService.name);

  constructor(private prisma: PrismaService) {}

  async getCompleteSystemOverview() {
    try {
      const [
        boStats,
        scanStats,
        teamStats,
        gestionnaireStats,
        workflowStats,
        slaStats,
        alertStats
      ] = await Promise.all([
        this.getBOStats(),
        this.getScanStats(),
        this.getTeamStats(),
        this.getGestionnaireStats(),
        this.getWorkflowStats(),
        this.getSLAStats(),
        this.getAlertStats()
      ]);

      return {
        bo: boStats,
        scan: scanStats,
        teams: teamStats,
        gestionnaires: gestionnaireStats,
        workflow: workflowStats,
        sla: slaStats,
        alerts: alertStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`System overview failed: ${error.message}`);
      throw error;
    }
  }

  private async getBOStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayEntries, pendingEntries, totalEntries, avgProcessingTime] = await Promise.all([
      this.prisma.bordereau.count({
        where: { createdAt: { gte: today } }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'EN_ATTENTE' }
      }),
      this.prisma.bordereau.count(),
      this.getAvgProcessingTime('BO')
    ]);

    return {
      todayEntries,
      pendingEntries,
      totalEntries,
      avgProcessingTime,
      status: pendingEntries > 100 ? 'OVERLOADED' : pendingEntries > 50 ? 'BUSY' : 'NORMAL'
    };
  }

  private async getScanStats() {
    const [pendingScan, scanningInProgress, processedToday, errorCount] = await Promise.all([
      this.prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'EN_DIFFICULTE',
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const totalQueue = pendingScan + scanningInProgress;

    return {
      pendingScan,
      scanningInProgress,
      processedToday,
      errorCount,
      totalQueue,
      status: totalQueue > 50 ? 'OVERLOADED' : totalQueue > 20 ? 'BUSY' : 'NORMAL'
    };
  }

  private async getTeamStats() {
    const teams = await this.prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      include: {
        bordereauxTeam: {
          where: {
            statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] }
          }
        },
        bordereauxCurrentHandler: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    const teamPerformance = teams.map(team => {
      const workload = team.bordereauxTeam.length;
      const personalWorkload = team.bordereauxCurrentHandler.length;
      const totalWorkload = workload + personalWorkload;

      let status: 'NORMAL' | 'BUSY' | 'OVERLOADED';
      if (totalWorkload > 50) status = 'OVERLOADED';
      else if (totalWorkload > 25) status = 'BUSY';
      else status = 'NORMAL';

      return {
        id: team.id,
        name: team.fullName,
        teamWorkload: workload,
        personalWorkload,
        totalWorkload,
        status
      };
    });

    const overloadedTeams = teamPerformance.filter(t => t.status === 'OVERLOADED').length;
    const busyTeams = teamPerformance.filter(t => t.status === 'BUSY').length;

    return {
      totalTeams: teams.length,
      overloadedTeams,
      busyTeams,
      normalTeams: teams.length - overloadedTeams - busyTeams,
      teams: teamPerformance
    };
  }

  private async getGestionnaireStats() {
    const gestionnaires = await this.prisma.user.findMany({
      where: { role: 'GESTIONNAIRE', active: true },
      include: {
        bordereauxCurrentHandler: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    const gestionnairePerformance = gestionnaires.map(gestionnaire => {
      const workload = gestionnaire.bordereauxCurrentHandler.length;
      
      let status: 'NORMAL' | 'BUSY' | 'OVERLOADED';
      if (workload > 20) status = 'OVERLOADED';
      else if (workload > 10) status = 'BUSY';
      else status = 'NORMAL';

      return {
        id: gestionnaire.id,
        name: gestionnaire.fullName,
        workload,
        status
      };
    });

    const overloadedGestionnaires = gestionnairePerformance.filter(g => g.status === 'OVERLOADED').length;
    const busyGestionnaires = gestionnairePerformance.filter(g => g.status === 'BUSY').length;

    return {
      totalGestionnaires: gestionnaires.length,
      overloadedGestionnaires,
      busyGestionnaires,
      normalGestionnaires: gestionnaires.length - overloadedGestionnaires - busyGestionnaires,
      gestionnaires: gestionnairePerformance
    };
  }

  private async getWorkflowStats() {
    const statusCounts = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true }
    });

    const statusMap = Object.fromEntries(
      statusCounts.map(s => [s.statut, s._count.id])
    );

    const totalActive = statusCounts
      .filter(s => !['CLOTURE', 'VIREMENT_EXECUTE'].includes(s.statut))
      .reduce((sum, s) => sum + s._count.id, 0);

    return {
      statusDistribution: statusMap,
      totalActive,
      bottlenecks: this.identifyBottlenecks(statusMap)
    };
  }

  private async getSLAStats() {
    const now = new Date();
    
    const [atRisk, overdue, critical] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
          },
          delaiReglement: { gte: 25 }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          },
          delaiReglement: { lte: 30 }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
          }
        }
      })
    ]);

    const complianceRate = await this.calculateSLAComplianceRate();

    return {
      atRisk,
      overdue,
      critical,
      complianceRate,
      status: critical > 0 ? 'CRITICAL' : overdue > 10 ? 'WARNING' : 'GOOD'
    };
  }

  private async getAlertStats() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalAlerts, criticalAlerts, unresolvedAlerts] = await Promise.all([
      this.prisma.alertLog.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      this.prisma.alertLog.count({
        where: {
          createdAt: { gte: last24Hours },
          alertLevel: 'HIGH'
        }
      }),
      this.prisma.alertLog.count({
        where: { resolved: false }
      })
    ]);

    return {
      totalAlerts,
      criticalAlerts,
      unresolvedAlerts,
      status: criticalAlerts > 5 ? 'CRITICAL' : unresolvedAlerts > 10 ? 'WARNING' : 'GOOD'
    };
  }

  private async getAvgProcessingTime(module: string): Promise<number> {
    // Simplified calculation - in production, this would be more sophisticated
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        statut: { not: 'EN_ATTENTE' }
      },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    if (recentBordereaux.length === 0) return 0;

    const totalTime = recentBordereaux.reduce((sum, bordereau) => {
      return sum + (bordereau.updatedAt.getTime() - bordereau.createdAt.getTime());
    }, 0);

    return Math.round(totalTime / recentBordereaux.length / (1000 * 60)); // Return in minutes
  }

  private identifyBottlenecks(statusMap: Record<string, number>) {
    const bottlenecks: string[] = [];
    
    if (statusMap['A_SCANNER'] > 20) bottlenecks.push('SCAN_QUEUE');
    if (statusMap['A_AFFECTER'] > 30) bottlenecks.push('CHEF_ASSIGNMENT');
    if (statusMap['ASSIGNE'] > 50) bottlenecks.push('GESTIONNAIRE_PROCESSING');
    if (statusMap['PRET_VIREMENT'] > 10) bottlenecks.push('FINANCE_PROCESSING');

    return bottlenecks;
  }

  private async calculateSLAComplianceRate(): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [totalProcessed, onTimeProcessed] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
          updatedAt: { gte: last30Days }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
          updatedAt: { gte: last30Days },
          // Simplified SLA check - processing time within limit
          dateReceptionSante: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return totalProcessed > 0 ? Math.round((onTimeProcessed / totalProcessed) * 100) : 100;
  }

  async getTeamPerformanceDetails(teamId?: string) {
    const whereClause = teamId ? { teamId } : {};
    
    const teamBordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...whereClause,
        statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'] }
      },
      include: {
        client: { select: { name: true } },
        currentHandler: { select: { fullName: true } },
        team: { select: { fullName: true } }
      },
      orderBy: { dateReception: 'asc' }
    });

    const performance = {
      totalItems: teamBordereaux.length,
      byStatus: teamBordereaux.reduce((acc, b) => {
        acc[b.statut] = (acc[b.statut] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byHandler: teamBordereaux.reduce((acc, b) => {
        const handler = b.currentHandler?.fullName || 'Unassigned';
        acc[handler] = (acc[handler] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      oldestItem: teamBordereaux[0],
      avgAge: this.calculateAvgAge(teamBordereaux)
    };

    return performance;
  }

  private calculateAvgAge(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 0;
    
    const now = new Date();
    const totalAge = bordereaux.reduce((sum, b) => {
      return sum + (now.getTime() - new Date(b.dateReception).getTime());
    }, 0);

    return Math.round(totalAge / bordereaux.length / (1000 * 60 * 60 * 24)); // Return in days
  }
}