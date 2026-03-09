import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

@Injectable()
export class SLAAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSLADashboard(user: any, filters: any = {}) {
    const where: any = {};
    
    // Apply role-based filtering
    if (user.role === 'GESTIONNAIRE') {
      where.assignedToUserId = user.id;
    } else if (user.role === 'CHEF_EQUIPE') {
      // Get team members
      // Get team members - simplified for now
      const teamMembers = await this.prisma.user.findMany({
        where: { id: user.id }, // Just current user for now
        select: { id: true }
      });
      where.assignedToUserId = { in: teamMembers.map(m => m.id) };
    }

    // Apply clientId filter
    if (filters.clientId) {
      where.clientId = filters.clientId;
      // console.log('✅ SLA Dashboard applying clientId filter:', filters.clientId);
    }

    // Apply date filters
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const [
      totalBordereaux,
      slaCompliant,
      atRisk,
      breached,
      avgProcessingTime,
      slaByClient,
      slaByUser,
      slaByDay
    ] = await Promise.all([
      this.prisma.bordereau.count({ where: { ...where, archived: false } }),
      this.getSLACompliantCount(where),
      this.getAtRiskCount(where),
      this.getBreachedCount(where),
      this.getAvgProcessingTime(where),
      this.getSLAByClient(where),
      this.getSLAByUser(where),
      this.getSLAByDay(where)
    ]);

    const complianceRate = totalBordereaux > 0 ? (slaCompliant / totalBordereaux) * 100 : 0;

    // console.log(`📊 SLA Dashboard: ${slaCompliant} compliant / ${totalBordereaux} total = ${Math.round(complianceRate)}%`);

    return {
      overview: {
        totalBordereaux,
        slaCompliant,
        atRisk,
        breached,
        complianceRate,
        avgProcessingTime
      },
      byClient: slaByClient,
      byUser: slaByUser,
      trend: slaByDay,
      alerts: await this.getSLAAlerts(where)
    };
  }

  private async getSLACompliantCount(where: any) {
    const now = new Date();
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true }
    });

    let compliantCount = 0;
    
    for (const bordereau of bordereaux) {
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24));
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      if (percentElapsed <= 80) {
        compliantCount++;
      }
    }

    return compliantCount;
  }

  private async getAtRiskCount(where: any) {
    const now = new Date();
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true }
    });

    let atRiskCount = 0;
    
    for (const bordereau of bordereaux) {
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24));
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      if (percentElapsed > 80 && percentElapsed <= 100) {
        atRiskCount++;
      }
    }

    return atRiskCount;
  }

  private async getBreachedCount(where: any) {
    const now = new Date();
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true }
    });

    let breachedCount = 0;
    
    for (const bordereau of bordereaux) {
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24));
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      if (percentElapsed > 100) {
        breachedCount++;
      }
    }

    return breachedCount;
  }

  private async getAvgProcessingTime(where: any) {
    const result = await this.prisma.bordereau.aggregate({
      _avg: { delaiReglement: true },
      where: {
        ...where,
        dateCloture: { not: null }
      }
    });

    return result._avg.delaiReglement || 0;
  }

  private async getSLAByClient(where: any) {
    const clients = await this.prisma.bordereau.groupBy({
      by: ['clientId'],
      _count: { id: true },
      where
    });

    const results: any[] = [];
    
    for (const client of clients) {
      const clientWhere = { ...where, clientId: client.clientId };
      const [total, compliant] = await Promise.all([
        this.prisma.bordereau.count({ where: clientWhere }),
        this.getSLACompliantCount(clientWhere)
      ]);

      const clientInfo = await this.prisma.client.findUnique({
        where: { id: client.clientId },
        select: { name: true }
      });

      results.push({
        clientId: client.clientId,
        clientName: clientInfo?.name || 'Unknown',
        total,
        compliant,
        complianceRate: total > 0 ? (compliant / total) * 100 : 0
      });
    }

    return results.sort((a: any, b: any) => b.complianceRate - a.complianceRate);
  }

  private async getSLAByUser(where: any) {
    const users = await this.prisma.bordereau.groupBy({
      by: ['assignedToUserId'],
      _count: { id: true },
      where: {
        ...where,
        assignedToUserId: { not: null }
      }
    });

    const results: any[] = [];
    
    for (const user of users) {
      if (!user.assignedToUserId) continue;
      
      const userWhere = { ...where, assignedToUserId: user.assignedToUserId };
      const [total, compliant] = await Promise.all([
        this.prisma.bordereau.count({ where: userWhere }),
        this.getSLACompliantCount(userWhere)
      ]);

      const userInfo = await this.prisma.user.findUnique({
        where: { id: user.assignedToUserId },
        select: { fullName: true }
      });

      results.push({
        userId: user.assignedToUserId,
        userName: userInfo?.fullName || 'Unknown',
        total,
        compliant,
        complianceRate: total > 0 ? (compliant / total) * 100 : 0
      });
    }

    return results.sort((a: any, b: any) => b.complianceRate - a.complianceRate);
  }

  private async getSLAByDay(where: any) {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        createdAt: { gte: last30Days }
      },
      select: {
        createdAt: true,
        dateCloture: true,
        dateReception: true,
        delaiReglement: true,
        contract: { select: { delaiReglement: true } },
        client: { select: { reglementDelay: true } }
      }
    });

    const dailyStats = new Map();
    
    for (const bordereau of bordereaux) {
      const date = bordereau.createdAt.toISOString().split('T')[0];
      
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { total: 0, compliant: 0 });
      }
      
      const stats = dailyStats.get(date);
      stats.total++;
      
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = Math.floor(
        (now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      if (percentElapsed <= 80) {
        stats.compliant++;
      }
    }

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      total: stats.total,
      compliant: stats.compliant,
      complianceRate: stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getSLAAlerts(where: any) {
    const now = new Date();
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        },
        client: true,
        currentHandler: {
          select: {
            fullName: true,
            role: true
          }
        },
        documents: {
          include: {
            assignedTo: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        }
      }
    });

    const alerts: any[] = [];
    
    for (const bordereau of bordereaux) {
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = validDate
        ? Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      let alertLevel: string | null = null;
      let message = '';
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      if (percentElapsed > 100) {
        alertLevel = 'critical';
        const daysOverdue = Math.floor(daysElapsed - slaThreshold);
        message = `SLA breached by ${daysOverdue} days (${Math.round(percentElapsed)}% elapsed)`;
      } else if (percentElapsed > 80) {
        alertLevel = 'warning';
        const daysRemaining = Math.ceil(slaThreshold - daysElapsed);
        message = `SLA at risk - ${daysRemaining} days remaining (${Math.round(percentElapsed)}% elapsed)`;
      }
      
      if (alertLevel) {
        let assignedTo = 'Non assigné';
        
        // Priority 1: Get GESTIONNAIRE_SENIOR from contract teamLeader (CORRECT)
        if (bordereau.contract?.teamLeader && bordereau.contract.teamLeader.role === 'GESTIONNAIRE_SENIOR') {
          assignedTo = bordereau.contract.teamLeader.fullName;
        }
        // Priority 2: Get gestionnaire from documents
        else {
          const gestionnaires = bordereau.documents
            .filter(d => d.assignedTo && d.assignedTo.role === 'GESTIONNAIRE')
            .map(d => d.assignedTo!.fullName);
          
          if (gestionnaires.length > 0) {
            const counts = gestionnaires.reduce((acc, name) => {
              acc[name] = (acc[name] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            assignedTo = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          }
          // Priority 3: currentHandler as fallback (might be scan team/admin)
          else if (bordereau.currentHandler) {
            assignedTo = bordereau.currentHandler.fullName;
          }
        }
        
        alerts.push({
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          clientName: bordereau.client?.name,
          assignedTo,
          alertLevel,
          message,
          daysSinceReception: daysElapsed,
          slaThreshold,
          daysOverdue: Math.max(0, daysElapsed - slaThreshold)
        });
      }
    }

    return alerts.sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
  }

  async predictSLABreaches(user: any) {
    try {
      // Get active bordereaux for prediction
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          dateCloture: null,
          assignedToUserId: user.role === 'GESTIONNAIRE' ? user.id : undefined
        },
        include: {
          contract: true,
          client: true
        }
      });

      // Prepare data for AI prediction
      const predictionData = bordereaux.map(b => ({
        id: b.id,
        start_date: b.dateReception?.toISOString() || new Date().toISOString(),
        deadline: b.dateReception 
          ? new Date(new Date(b.dateReception).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
          : new Date().toISOString(),
        current_progress: b.statut === 'EN_COURS' ? 50 : 10,
        total_required: 100,
        sla_days: 5
      }));

      // Call AI microservice for prediction
      const response = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, predictionData);
      
      return response.data.sla_predictions.map((pred: any) => {
        const bordereau = bordereaux.find(b => b.id === pred.id);
        return {
          ...pred,
          bordereau: {
            reference: bordereau?.reference,
            clientName: 'Client',
            assignedTo: 'Unknown'
          }
        };
      });
    } catch (error) {
      console.error('SLA prediction failed:', error);
      return [];
    }
  }

  async getCapacityAnalysis(user: any) {
    // Get all active users with gestionnaire roles
    const teamMembers = await this.prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'] }
      }
    });

    const analysis: any[] = [];
    
    for (const member of teamMembers) {
      const [activeBordereaux, avgProcessingTime] = await Promise.all([
        this.prisma.bordereau.count({
          where: {
            OR: [
              { currentHandlerId: member.id },
              { assignedToUserId: member.id }
            ],
            dateCloture: null
          }
        }),
        this.prisma.bordereau.aggregate({
          _avg: { delaiReglement: true },
          where: {
            OR: [
              { currentHandlerId: member.id },
              { assignedToUserId: member.id }
            ],
            dateCloture: { not: null }
          }
        })
      ]);

      const weeklyTarget = member.capacity || 35; // Use user capacity or default
      const dailyCapacity = weeklyTarget / 7;
      const daysToComplete = activeBordereaux / Math.max(dailyCapacity, 1);
      
      analysis.push({
        userId: member.id,
        userName: member.fullName,
        activeBordereaux,
        avgProcessingTime: avgProcessingTime._avg.delaiReglement || 3,
        dailyCapacity,
        daysToComplete,
        capacityStatus: daysToComplete > 7 ? 'overloaded' : daysToComplete > 5 ? 'at_capacity' : 'available',
        recommendation: daysToComplete > 7 
          ? `Réassigner ${Math.ceil(activeBordereaux - (dailyCapacity * 7))} bordereaux`
          : daysToComplete > 5 ? 'Surveiller la charge de travail' : 'Capacité disponible pour nouvelles tâches'
      });
    }

    return analysis;
  }
}