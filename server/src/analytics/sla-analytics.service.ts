import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import {
  calculateSLA,
  calculateAllSLAs,
  isSLACompliant,
  isSLAAtRisk,
  isSLABreached,
  BordereauForSLA,
} from '../utils/sla-calculator';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

/** Shape shared by every bordereau query in this service that feeds the SLA calculator. */
function toSLAInput(b: any): BordereauForSLA {
  return {
    dateReception: b.dateReception,
    delaiReglement: b.delaiReglement || b.contract?.delaiReglement || b.client?.reglementDelay || 30,
    statut: b.statut,
    dateDebutScan: b.dateDebutScan,
    dateFinScan: b.dateFinScan,
    dateCloture: b.dateCloture,
    dateExecutionVirement: b.dateExecutionVirement,
    ordresVirement: b.ordresVirement,
  };
}

@Injectable()
export class SLAAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSLADashboard(user: any, filters: any = {}) {
    const where: any = {};

    if (user.role === 'GESTIONNAIRE') {
      where.assignedToUserId = user.id;
    } else if (user.role === 'CHEF_EQUIPE') {
      const teamMembers = await this.prisma.user.findMany({
        where: { id: user.id },
        select: { id: true }
      });
      where.assignedToUserId = { in: teamMembers.map(m => m.id) };
    }

    if (filters.gestionnaireId || filters.gestionnaireSeniorId || filters.chefEquipeId) {
      const userIds: string[] = [];
      if (filters.gestionnaireId) userIds.push(filters.gestionnaireId);
      if (filters.gestionnaireSeniorId) userIds.push(filters.gestionnaireSeniorId);
      if (filters.chefEquipeId) {
        const chefTeam = await this.prisma.user.findMany({
          where: {
            OR: [
              { id: filters.chefEquipeId },
              { teamLeaderId: filters.chefEquipeId }
            ]
          },
          select: { id: true }
        });
        userIds.push(...chefTeam.map(u => u.id));
      }

      if (userIds.length > 0) {
        where.OR = [
          { assignedToUserId: { in: userIds } },
          { currentHandlerId: { in: userIds } },
          { contract: { teamLeaderId: { in: userIds } } }
        ];
      }
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

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
      slaByDay,
      byIndicator,
    ] = await Promise.all([
      this.prisma.bordereau.count({ where: { ...where, archived: false } }),
      this.getSLACompliantCount(where),
      this.getAtRiskCount(where),
      this.getBreachedCount(where),
      this.getAvgProcessingTime(where),
      this.getSLAByClient(where),
      this.getSLAByUser(where),
      this.getSLAByDay(where),
      this.getComplianceByIndicator(where),
    ]);

    const complianceRate = totalBordereaux > 0 ? (slaCompliant / totalBordereaux) * 100 : 0;

    return {
      overview: {
        totalBordereaux,
        slaCompliant,
        atRisk,
        breached,
        complianceRate,
        avgProcessingTime
      },
      // ✅ The four company-mandated indicators, each with its own compliance rate.
      // "overview" above stays as "SLA de règlement BO" for backward compatibility
      // with existing dashboard widgets — byIndicator is the new, complete picture.
      byIndicator,
      byClient: slaByClient,
      byUser: slaByUser,
      trend: slaByDay,
      alerts: await this.getSLAAlerts(where)
    };
  }

  /**
   * ✅ NEW: compliance rate for each of the four company SLA indicators,
   * computed from the single unified calculator (calculateAllSLAs).
   * A bordereau counts toward an indicator's total only once that
   * indicator is `applicable` (e.g. Finance SLA only counts once
   * dateCloture exists) — matching the calculator's own semantics.
   */
  private async getComplianceByIndicator(where: any) {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { ...where, archived: false },
      include: { contract: true, client: true, ordresVirement: true },
    });

    const buckets = {
      scan: { total: 0, compliant: 0, atRisk: 0, breached: 0 },
      traitement: { total: 0, compliant: 0, atRisk: 0, breached: 0 },
      reglementBO: { total: 0, compliant: 0, atRisk: 0, breached: 0 },
      reglementFinance: { total: 0, compliant: 0, atRisk: 0, breached: 0 },
    };

    for (const b of bordereaux) {
      const all = calculateAllSLAs(toSLAInput(b));
      (['scan', 'traitement', 'reglementBO', 'reglementFinance'] as const).forEach((key) => {
        const metric = all[key];
        if (!metric.applicable || metric.percentElapsed === null) return;
        buckets[key].total++;
        if (metric.percentElapsed <= 80) buckets[key].compliant++;
        else if (metric.percentElapsed <= 100) buckets[key].atRisk++;
        else buckets[key].breached++;
      });
    }

    const withRate = (b: { total: number; compliant: number; atRisk: number; breached: number }) => ({
      ...b,
      complianceRate: b.total > 0 ? (b.compliant / b.total) * 100 : 0,
    });

    return {
      scan: withRate(buckets.scan),
      traitement: withRate(buckets.traitement),
      reglementBO: withRate(buckets.reglementBO),
      reglementFinance: withRate(buckets.reglementFinance),
    };
  }

  private async getSLACompliantCount(where: any) {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true, ordresVirement: true }
    });

    // ✅ USE CENTRALIZED SLA CALCULATOR (SLA de règlement BO)
    return bordereaux.filter(b => isSLACompliant(toSLAInput(b))).length;
  }

  private async getAtRiskCount(where: any) {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true, ordresVirement: true }
    });

    return bordereaux.filter(b => isSLAAtRisk(toSLAInput(b))).length;
  }

  private async getBreachedCount(where: any) {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        ...where,
        archived: false,
      },
      include: { contract: true, client: true, ordresVirement: true }
    });

    return bordereaux.filter(b => isSLABreached(toSLAInput(b))).length;
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
        statut: true,
        dateExecutionVirement: true,
        contract: { select: { delaiReglement: true } },
        client: { select: { reglementDelay: true } },
        ordresVirement: { select: { etatVirement: true, dateEtatFinal: true, dateTraitement: true } }
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

      if (isSLACompliant(toSLAInput(bordereau))) {
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

  /**
   * ✅ FIXED: alerts now cover all four indicators, not just règlement BO.
   * A bordereau can raise more than one alert (e.g. late on scan AND on
   * traitement) — each is reported separately with its own indicator label.
   */
  private async getSLAAlerts(where: any) {
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
        },
        _count: {
          select: {
            documents: true
          }
        },
        ordresVirement: { select: { etatVirement: true, dateEtatFinal: true, dateTraitement: true } }
      }
    });

    const INDICATOR_LABELS: Record<string, string> = {
      scan: 'SLA de scan',
      traitement: 'SLA de traitement',
      reglementBO: 'SLA de règlement BO',
      reglementFinance: 'SLA de règlement Finance',
    };

    const alerts: any[] = [];

    for (const bordereau of bordereaux) {
      const all = calculateAllSLAs(toSLAInput(bordereau));

      let assignedTo = 'Non assigné';
      if (bordereau.contract?.teamLeader && bordereau.contract.teamLeader.role === 'GESTIONNAIRE_SENIOR') {
        assignedTo = bordereau.contract.teamLeader.fullName;
      } else {
        const gestionnaires = bordereau.documents
          .filter(d => d.assignedTo && d.assignedTo.role === 'GESTIONNAIRE')
          .map(d => d.assignedTo!.fullName);

        if (gestionnaires.length > 0) {
          const counts = gestionnaires.reduce((acc, name) => {
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          assignedTo = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        } else if (bordereau.currentHandler) {
          assignedTo = bordereau.currentHandler.fullName;
        }
      }

      const documentsByType = bordereau.documents.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      (['scan', 'traitement', 'reglementBO', 'reglementFinance'] as const).forEach((key) => {
        const metric = all[key];
        // Not applicable yet (no start date), or already frozen (finished) → no live alert needed
        if (!metric.applicable || metric.isFrozen) return;
        if (metric.percentElapsed === null || metric.percentElapsed <= 80) return;

        const alertLevel = metric.percentElapsed > 100 ? 'critical' : 'warning';
        const message =
          alertLevel === 'critical'
            ? `${INDICATOR_LABELS[key]} dépassé de ${Math.abs(metric.daysRemaining ?? 0)} jour(s) (${Math.round(metric.percentElapsed)}% écoulé)`
            : `${INDICATOR_LABELS[key]} à risque - ${metric.daysRemaining} jour(s) restant(s) (${Math.round(metric.percentElapsed)}% écoulé)`;

        alerts.push({
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          clientName: bordereau.client?.name,
          type: bordereau.type,
          indicator: key,
          indicatorLabel: INDICATOR_LABELS[key],
          nombreDocuments: bordereau._count.documents,
          documentsByType,
          assignedTo,
          alertLevel,
          message,
          daysSinceReception: metric.daysElapsed,
          slaThreshold: metric.thresholdDays,
          daysOverdue: Math.max(0, -(metric.daysRemaining ?? 0)),
        });
      });
    }

    return alerts.sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);
  }

  async predictSLABreaches(user: any) {
    try {
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

      const weeklyTarget = member.capacity || 35;
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