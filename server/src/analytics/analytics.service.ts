// D:\ARS\server\src\analytics\analytics.service.ts
import { Injectable, ForbiddenException, BadGatewayException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';
import { RedisService } from '../shared/redis.service';
import { AnalyticsKpiDto } from './dto/analytics-kpi.dto';
import { AnalyticsPerformanceDto } from './dto/analytics-performance.dto';
import { RealTimeAnalyticsService } from './real-time-analytics.service';
import { SLAAnalyticsService } from './sla-analytics.service';
import { OVAnalyticsService } from './ov-analytics.service';
import { calculateSLA, calculateAllSLAs } from '../utils/sla-calculator';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';
const AI_USERNAME = process.env.AI_USERNAME || 'admin';
const AI_PASSWORD = process.env.AI_PASSWORD || 'secret';

const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'SCAN', 'BO', 'GESTIONNAIRE'];
const STAFF_ROLES = ['GESTIONNAIRE', 'CHEF_EQUIPE'];
const STAFF_ROLES_WITH_SENIOR = ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'];
const ACTIVE_WORKLOAD_STATUSES: Statut[] = [Statut.ASSIGNE, Statut.EN_COURS];
const ERROR_STATUSES = ['REJETE', 'EN_DIFFICULTE', 'VIREMENT_REJETE'];
const DOCUMENT_TYPES = [
  'BULLETIN_SOIN',
  'COMPLEMENT_INFORMATION',
  'ADHESION',
  'RECLAMATION',
  'CONTRAT_AVENANT',
  'DEMANDE_RESILIATION',
  'CONVENTION_TIERS_PAYANT',
];
const SLA_APPLICABLE_TYPES = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION'];
const RESOLVED_RECLAMATION_STATUSES = ['RESOLU', 'RESOLVED', 'CLOTURE', 'TRAITE', 'FERME'];

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // AI microservice tuning
  private readonly AI_TIMEOUT_MS = 20000;
  private readonly AI_TOKEN_CACHE_KEY = 'analytics:ai:token';
  private readonly AI_CIRCUIT_BREAKER_KEY = 'analytics:ai:circuit_breaker';
  private readonly AI_CIRCUIT_BREAKER_TTL_SECONDS = 30;
  private readonly AI_TOKEN_DEFAULT_TTL_SECONDS = 3600;

  // 🚀 NEW: dashboard read-query caching (Redis-backed, shared across the
  // PM2 cluster). Short TTL for "live" dashboard numbers, longer TTL for
  // trend/forecast data that doesn't need to be second-accurate. This does
  // NOT change any computed value — it only avoids recomputing the exact
  // same result multiple times within the TTL window, which is the common
  // case when a dashboard mounts several widgets that call overlapping
  // endpoints at once, or when the page auto-refreshes.
  private readonly DASHBOARD_CACHE_TTL_SECONDS = 30;
  private readonly FORECAST_CACHE_TTL_SECONDS = 300;

  constructor(
    private prisma: PrismaService,
    private realTimeService: RealTimeAnalyticsService,
    private slaService: SLAAnalyticsService,
    private ovService: OVAnalyticsService,
    private redis: RedisService,
  ) {}

  // ============================================================
  // 🚀 NEW: generic cache-or-compute helper
  // ============================================================
  /**
   * Returns the cached value for `key` if present, otherwise computes it via
   * `compute()`, caches it for `ttlSeconds`, and returns it. Redis failures
   * (read or write) never break the caller — they just mean we compute
   * directly, same as if there were no cache at all.
   *
   * IMPORTANT: callers must run any authorization check (checkAnalyticsRole)
   * BEFORE calling this helper, never inside `compute()` — a cache hit must
   * never skip the permission check.
   */
  private async getOrSetCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (err) {
      this.logger.warn(`Cache read failed for key "${key}", computing directly: ${(err as Error)?.message || err}`);
    }

    const result = await compute();

    try {
      await this.redis.set(key, result, ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache write failed for key "${key}": ${(err as Error)?.message || err}`);
    }

    return result;
  }

  // ============================================================
  // Delegates to specialized services
  // ============================================================
  async getSLADashboard(user: any, filters: any) {
    return this.slaService.getSLADashboard(user, filters);
  }

  async getOVDashboard(user: any, filters: any) {
    return this.ovService.getOVDashboard(user, filters);
  }

  async exportOVToExcel(filters: any, user: any) {
    return this.ovService.exportOVToExcel(filters, user);
  }

  async getOVStatistics(filters: any) {
    return this.ovService.getOVStatistics(filters);
  }

  async processRealTimeEvent(eventType: string, data: any) {
    return this.realTimeService.processRealTimeEvent(eventType, data);
  }

  // ============================================================
  // Access control
  // ============================================================
  private checkAnalyticsRole(user: any) {
    if (!ANALYTICS_ROLES.includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
  }

  // ============================================================
  // SLA prediction (AI-only — cached, no local fallback)
  // ============================================================
  async predictSLABreaches(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:sla-predictions`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const bordereaux = await this.prisma.bordereau.findMany({
          where: { statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER'] } },
          include: {
            client: { select: { name: true } },
            currentHandler: { select: { fullName: true } },
          },
          take: 50,
        });

        if (bordereaux.length === 0) {
          return [];
        }

        const aiData = bordereaux.map((b) => {
          const now = new Date();
          let daysSinceReception = 0;

          try {
            if (b.dateReception) {
              daysSinceReception = Math.floor((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
            }
          } catch (error) {
            this.logger.warn(`Date parsing error for bordereau ${b.id}: ${error}`);
            daysSinceReception = 2;
          }

          const slaDeadline = Math.max(1, b.delaiReglement || 30);
          const deadline = new Date(now.getTime() + slaDeadline * 24 * 60 * 60 * 1000);

          return {
            id: b.id,
            start_date: b.dateReception ? new Date(b.dateReception).toISOString() : now.toISOString(),
            deadline: deadline.toISOString(),
            current_progress: ['TRAITE', 'CLOTURE'].includes(b.statut)
              ? 100
              : ['EN_COURS', 'ASSIGNE'].includes(b.statut)
                ? 50
                : 10,
            total_required: 100,
            sla_days: slaDeadline,
          };
        });

        try {
          const token = await this.getAIToken();
          const aiResponse = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, aiData, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            timeout: this.AI_TIMEOUT_MS,
          });

          const aiPredictions = aiResponse.data.sla_predictions || [];

          if (aiPredictions.length === 0) {
            throw new Error('AI service returned no predictions');
          }

          return aiPredictions.map((pred: any) => {
            const bordereau = bordereaux.find((b) => b.id === pred.bordereau_id);
            return {
              id: pred.bordereau_id,
              risk: pred.status_color || '🟡',
              score: pred.risk_score || 0.5,
              days_left: pred.days_remaining || 0,
              bordereau: {
                reference: bordereau?.reference || pred.reference || pred.bordereau_id,
                clientName: bordereau?.client?.name || 'Client inconnu',
                assignedTo: bordereau?.currentHandler?.fullName || 'Non assigné',
              },
            };
          });
        } catch (aiError) {
          this.logger.error('AI SLA prediction failed', aiError as Error);
          throw new Error('AI SLA prediction service unavailable');
        }
      } catch (error) {
        this.logger.error('SLA prediction failed', error as Error);
        throw error;
      }
    });
  }

  // ============================================================
  // Capacity analysis (batched — no N+1, cached)
  // ============================================================
  async getCapacityAnalysis(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:capacity`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const users = await this.prisma.user.findMany({
          where: { active: true, role: { in: STAFF_ROLES } },
          select: { id: true, fullName: true, capacity: true },
        });

        if (users.length === 0) {
          throw new Error('No user data available for capacity analysis');
        }

        const userIds = users.map((u) => u.id);

        const [documentCounts, completedBordereaux] = await Promise.all([
          this.prisma.document.groupBy({
            by: ['assignedToUserId'],
            _count: { id: true },
            where: { assignedToUserId: { in: userIds } },
          }),
          this.prisma.bordereau.findMany({
            where: { assignedToUserId: { in: userIds }, dateCloture: { not: null } },
            select: { assignedToUserId: true, dateReception: true, dateCloture: true },
          }),
        ]);

        const documentCountMap = new Map(documentCounts.map((d) => [d.assignedToUserId, d._count.id]));

        const processingTimeMap = new Map<string, { totalDays: number; count: number }>();
        for (const b of completedBordereaux) {
          if (!b.assignedToUserId || !b.dateCloture) continue;
          const days = (new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24);
          const entry = processingTimeMap.get(b.assignedToUserId) || { totalDays: 0, count: 0 };
          entry.totalDays += days;
          entry.count += 1;
          processingTimeMap.set(b.assignedToUserId, entry);
        }

        const capacityAnalysis: Array<{
          userId: string;
          userName: string;
          activeBordereaux: number;
          avgProcessingTime: number;
          dailyCapacity: number;
          daysToComplete: number;
          capacityStatus: 'available' | 'at_capacity' | 'overloaded';
          recommendation: string;
        }> = [];

        for (const user of users) {
          const activeDocuments = documentCountMap.get(user.id) || 0;
          const dailyCapacity = user.capacity || 20;
          const utilizationRate = (activeDocuments / dailyCapacity) * 100;
          const daysToComplete = activeDocuments > 0 ? activeDocuments / dailyCapacity : 0;
          const timing = processingTimeMap.get(user.id);
          const avgProcessingTime = timing && timing.count > 0 ? Number((timing.totalDays / timing.count).toFixed(2)) : 0;

          let capacityStatus: 'available' | 'at_capacity' | 'overloaded';
          let recommendation: string;

          if (utilizationRate > 120) {
            capacityStatus = 'overloaded';
            recommendation = `Surcharge critique: ${activeDocuments} dossiers / ${dailyCapacity} capacité - +${Math.round((activeDocuments / dailyCapacity - 1) * 100)}%`;
          } else if (utilizationRate > 80) {
            capacityStatus = 'at_capacity';
            recommendation = `Charge élevée: ${activeDocuments} dossiers / ${dailyCapacity} capacité - ${Math.round(utilizationRate)}%`;
          } else {
            capacityStatus = 'available';
            recommendation = 'Capacité disponible pour nouvelles tâches';
          }

          capacityAnalysis.push({
            userId: user.id,
            userName: user.fullName,
            activeBordereaux: activeDocuments,
            avgProcessingTime,
            dailyCapacity,
            daysToComplete,
            capacityStatus,
            recommendation,
          });
        }

        return capacityAnalysis;
      } catch (error) {
        this.logger.error('Capacity analysis failed', error as Error);
        throw error;
      }
    });
  }

  private async getSystemMetricsForOptimization() {
    try {
      const [metrics, currentWorkload, staff] = await Promise.all([
        this.prisma.bordereau.aggregate({
          _avg: { delaiReglement: true },
          _count: { id: true },
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        this.prisma.bordereau.count({ where: { statut: { in: ACTIVE_WORKLOAD_STATUSES } } }),
        this.prisma.user.aggregate({
          _sum: { capacity: true },
          where: { active: true, role: { in: STAFF_ROLES_WITH_SENIOR } },
        }),
      ]);

      const totalCapacity = staff._sum.capacity || 0;
      const resourceUtilization = totalCapacity > 0 ? Math.min(1, currentWorkload / totalCapacity) : 0;

      return {
        avg_processing_time: metrics._avg.delaiReglement || 0,
        total_volume: metrics._count.id || 0,
        system_load: Number(resourceUtilization.toFixed(2)),
        resource_utilization: Number(resourceUtilization.toFixed(2)),
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics', error as Error);
      return { avg_processing_time: 0, total_volume: 0, system_load: 0, resource_utilization: 0 };
    }
  }

  private async getPerformanceDataForAnalysis() {
    try {
      const users = await this.prisma.user.findMany({
        where: { active: true, role: { in: STAFF_ROLES } },
        include: {
          bordereauxCurrentHandler: { where: { statut: { in: ACTIVE_WORKLOAD_STATUSES } } },
        },
      });

      const userIds = users.map((u) => u.id);
      const allAssigned = await this.prisma.bordereau.findMany({
        where: { assignedToUserId: { in: userIds } },
        select: { assignedToUserId: true, delaiReglement: true, dateReception: true, dateCloture: true },
      });

      const complianceMap = new Map<string, { total: number; compliant: number }>();
      for (const b of allAssigned) {
        if (!b.assignedToUserId) continue;
        const entry = complianceMap.get(b.assignedToUserId) || { total: 0, compliant: 0 };
        entry.total += 1;
        const endDate = b.dateCloture ? new Date(b.dateCloture) : new Date();
        const daysElapsed = (endDate.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24);
        if (daysElapsed <= (b.delaiReglement || 30)) entry.compliant += 1;
        complianceMap.set(b.assignedToUserId, entry);
      }

      return users.map((user) => {
        const compliance = complianceMap.get(user.id);
        const performanceScore =
          compliance && compliance.total > 0 ? Number((compliance.compliant / compliance.total).toFixed(2)) : 1;

        return {
          user_id: user.id,
          user_name: user.fullName,
          role: user.role,
          active_workload: user.bordereauxCurrentHandler.length,
          capacity: user.capacity || 20,
          performance_score: performanceScore,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get performance data', error as Error);
      return [];
    }
  }

  // ============================================================
  // KPIs (cached — role check always runs fresh, never cached)
  // ============================================================
  async getDailyKpis(query: AnalyticsKpiDto, user: any) {
    this.checkAnalyticsRole(user);
    this.logger.debug(`getDailyKpis filters: ${JSON.stringify(query)}`);

    const cacheKey = `analytics:kpis:${user.id}:${user.role}:${JSON.stringify(query)}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const where: any = { archived: false };

      if (user.role === 'GESTIONNAIRE') {
        where.assignedToUserId = user.id;
      } else if (user.role === 'CHEF_EQUIPE') {
        const teamMembers = await this.prisma.user.findMany({ where: { id: user.id }, select: { id: true } });
        where.assignedToUserId = { in: teamMembers.map((m) => m.id) };
      }

      if (query.clientId) {
        where.clientId = query.clientId;
      }

      if ((query as any).gestionnaireId) {
        where.assignedToUserId = (query as any).gestionnaireId;
      }
      if ((query as any).gestionnaireSeniorId) {
        const contracts = await this.prisma.contract.findMany({
          where: { teamLeaderId: (query as any).gestionnaireSeniorId },
          select: { id: true },
        });
        if (contracts.length > 0) {
          where.contractId = { in: contracts.map((c) => c.id) };
        }
      }
      if ((query as any).chefEquipeId) {
        const teamMembers = await this.prisma.user.findMany({
          where: { OR: [{ id: (query as any).chefEquipeId }, { teamLeaderId: (query as any).chefEquipeId }] },
          select: { id: true },
        });
        if (teamMembers.length > 0) {
          where.assignedToUserId = { in: teamMembers.map((m) => m.id) };
        }
      }

      if (query.teamId) where.teamId = query.teamId;
      if (query.userId) where.assignedToUserId = query.userId;
      if (query.fromDate || query.toDate) {
        where.createdAt = {};
        if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
        if (query.toDate) where.createdAt.lte = new Date(query.toDate);
      }

      const allBordereaux = await this.prisma.bordereau.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          dateReception: true,
          delaiReglement: true,
          statut: true,
          contract: { select: { delaiReglement: true } },
          client: { select: { reglementDelay: true } },
        },
      });

      let filteredBordereaux = allBordereaux;
      if (query.slaStatus) {
        const now = new Date();
        filteredBordereaux = allBordereaux.filter((b) => {
          const slaThreshold = b.delaiReglement || b.contract?.delaiReglement || b.client?.reglementDelay || 30;
          const validDate = b.dateReception || b.createdAt;
          const daysElapsed = Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24));
          const percentElapsed = (daysElapsed / slaThreshold) * 100;

          if (query.slaStatus === 'overdue') return percentElapsed > 100;
          if (query.slaStatus === 'atrisk') return percentElapsed > 80 && percentElapsed <= 100;
          if (query.slaStatus === 'ontime') return percentElapsed <= 80;
          return true;
        });
      }

      const totalCount = filteredBordereaux.length;
      const processedCount = filteredBordereaux.filter((b) => ['CLOTURE', 'TRAITE'].includes(b.statut)).length;
      const enAttenteCount = filteredBordereaux.filter((b) =>
        ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'A_AFFECTER', 'ASSIGNE'].includes(b.statut),
      ).length;

      const avgDelay = filteredBordereaux.reduce((sum, b) => sum + (b.delaiReglement || 0), 0) / Math.max(filteredBordereaux.length, 1);

      const dateMap = new Map<string, number>();
      for (const b of filteredBordereaux) {
        const date = new Date(b.createdAt).toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }

      const bsPerDay = Array.from(dateMap.entries())
        .map(([date, count]) => ({ createdAt: new Date(date), _count: { id: count } }))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return {
        bsPerDay,
        avgDelay,
        totalCount,
        processedCount,
        enAttenteCount,
        timestamp: new Date().toISOString(),
      };
    });
  }

  async getPerformance(query: AnalyticsPerformanceDto, user: any) {
    this.checkAnalyticsRole(user);
    const where: any = { archived: false };

    if (query.clientId) where.clientId = query.clientId;
    if (query.teamId) where.teamId = query.teamId;
    if (query.userId) where.assignedToUserId = query.userId;

    if ((query as any).gestionnaireId) {
      where.assignedToUserId = (query as any).gestionnaireId;
    }
    if ((query as any).gestionnaireSeniorId) {
      const contracts = await this.prisma.contract.findMany({
        where: { teamLeaderId: (query as any).gestionnaireSeniorId },
        select: { id: true },
      });
      if (contracts.length > 0) {
        where.contractId = { in: contracts.map((c) => c.id) };
      }
    }
    if ((query as any).chefEquipeId) {
      const teamMembers = await this.prisma.user.findMany({
        where: { OR: [{ id: (query as any).chefEquipeId }, { teamLeaderId: (query as any).chefEquipeId }] },
        select: { id: true },
      });
      if (teamMembers.length > 0) {
        where.assignedToUserId = { in: teamMembers.map((m) => m.id) };
      }
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [processedByUser, slaCompliant] = await Promise.all([
      this.prisma.bordereau.groupBy({ by: ['clientId'], _count: { id: true }, where }),
      this.prisma.bordereau.count({ where: { ...where, delaiReglement: { lte: 3 } } }),
    ]);

    return { processedByUser, slaCompliant };
  }

  // ============================================================
  // Alerts — unchanged behaviour, still règlement-BO based (this endpoint
  // is consumed by the legacy single-SLA alert widget). For the full
  // four-indicator alert feed, see SLAAnalyticsService.getSLADashboard().
  // Cached — role check always runs fresh.
  // ============================================================
  async getAlerts(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    this.logger.debug(`getAlerts filters: ${JSON.stringify(filters)}`);

    const cacheKey = `analytics:alerts:${user.id}:${user.role}:${JSON.stringify(filters)}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const where: any = { archived: false };

      if (filters.clientId) {
        where.clientId = filters.clientId;
      }

      if (filters.gestionnaireId) {
        where.assignedToUserId = filters.gestionnaireId;
      }
      if (filters.gestionnaireSeniorId) {
        const contracts = await this.prisma.contract.findMany({
          where: { teamLeaderId: filters.gestionnaireSeniorId },
          select: { id: true },
        });
        if (contracts.length > 0) {
          where.contractId = { in: contracts.map((c) => c.id) };
        }
      }
      if (filters.chefEquipeId) {
        const teamMembers = await this.prisma.user.findMany({
          where: { OR: [{ id: filters.chefEquipeId }, { teamLeaderId: filters.chefEquipeId }] },
          select: { id: true },
        });
        if (teamMembers.length > 0) {
          where.assignedToUserId = { in: teamMembers.map((m) => m.id) };
        }
      }

      if (filters.fromDate || filters.toDate) {
        where.createdAt = {};
        if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
        if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
      }

      const allBordereaux = await this.prisma.bordereau.findMany({
        where,
        select: {
          id: true,
          reference: true,
          dateReception: true,
          dateReceptionBO: true,
          delaiReglement: true,
          statut: true,
          clientId: true,
          assignedToUserId: true,
          createdAt: true,
          dateCloture: true,
          dateExecutionVirement: true,
          ordresVirement: true,
        },
      });

      const critical: any[] = [];
      const warning: any[] = [];
      const ok: any[] = [];

      for (const bordereau of allBordereaux) {
        // ✅ calculateSLA() = "SLA de règlement BO" from the unified calculator (unchanged call site)
        const slaData = calculateSLA(bordereau);

        if (slaData.isFrozen) continue;

        if (slaData.percentElapsed > 100) {
          critical.push({ ...bordereau, statusLevel: 'red', daysSinceReception: slaData.daysElapsed, slaThreshold: bordereau.delaiReglement });
        } else if (slaData.percentElapsed > 80) {
          warning.push({ ...bordereau, statusLevel: 'orange', daysSinceReception: slaData.daysElapsed, slaThreshold: bordereau.delaiReglement });
        } else {
          ok.push({ ...bordereau, statusLevel: 'green', daysSinceReception: slaData.daysElapsed, slaThreshold: bordereau.delaiReglement });
        }
      }

      let filteredCritical = critical;
      let filteredWarning = warning;
      let filteredOk = ok;

      if (filters.slaStatus) {
        if (filters.slaStatus === 'overdue') {
          filteredWarning = [];
          filteredOk = [];
        } else if (filters.slaStatus === 'atrisk') {
          filteredCritical = [];
          filteredOk = [];
        } else if (filters.slaStatus === 'ontime') {
          filteredCritical = [];
          filteredWarning = [];
        }
      }

      return { critical: filteredCritical, warning: filteredWarning, ok: filteredOk };
    });
  }

  async getSlaComplianceByUser(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    const where: any = { archived: false };

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    try {
      const [users, sla] = await Promise.all([
        this.prisma.bordereau.groupBy({ by: ['assignedToUserId'] as any, _count: { id: true }, where }),
        this.prisma.bordereau.groupBy({
          by: ['assignedToUserId'] as any,
          where: { ...where, delaiReglement: { lte: 3 } },
          _count: { id: true },
        }),
      ]);

      const slaMap = Object.fromEntries(sla.map((u: any) => [u.assignedToUserId, u._count?.id ?? 0]));

      const userIds = users.map((u: any) => u.assignedToUserId).filter((id) => id);
      const userDetails = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true, department: true },
      });
      const userMap = Object.fromEntries(userDetails.map((u) => [u.id, u]));

      return users
        .filter((u: any) => u.assignedToUserId)
        .map((u: any) => {
          const userInfo = userMap[u.assignedToUserId];
          return {
            userId: u.assignedToUserId,
            userName: userInfo?.fullName || userInfo?.email || null,
            department: userInfo?.department || null,
            total: u._count?.id ?? 0,
            slaCompliant: slaMap[u.assignedToUserId] || 0,
            complianceRate: (u._count?.id ?? 0) > 0 ? ((slaMap[u.assignedToUserId] || 0) / (u._count?.id ?? 0)) * 100 : 0,
          };
        })
        .filter((u) => u.userName !== null);
    } catch (error) {
      this.logger.error('Error getting SLA compliance by user', error as Error);
      return [];
    }
  }

  // ============================================================
  // AI Integration — all AI-only, no local fallback substitutes.
  // ============================================================
  async getPrioritiesAI(items: any[]) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/priorities`, items, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI priorities failed: ${error.message}`);
      throw new Error('AI priorities failed: ' + error.message);
    }
  }

  async getReassignmentAI(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/reassignment`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('AI reassignment failed', error.response?.data || error.message);
      throw new Error('AI reassignment failed: ' + (error.response?.data?.detail || error.message));
    }
  }

  async getAIReassignSuggestion(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/analytics/ai/reassign-suggestion`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('AI reassign suggestion failed', error.response?.data || error.message);
      throw new Error('AI reassign suggestion failed: ' + (error.response?.data?.detail || error.message));
    }
  }

  /**
   * Fetches an AI microservice bearer token. Cached in Redis for its lifetime,
   * and gated by a circuit breaker so a downed AI service fails fast (no
   * repeated network calls / log spam) for AI_CIRCUIT_BREAKER_TTL_SECONDS.
   * This is resilience, not a fallback: on failure we throw, we never
   * substitute a locally-computed answer for the AI's.
   */
  private async getAIToken(): Promise<string> {
    const breakerTripped = await this.redis.get<boolean>(this.AI_CIRCUIT_BREAKER_KEY);
    if (breakerTripped) {
      throw new Error('AI authentication failed');
    }

    const cachedToken = await this.redis.get<string>(this.AI_TOKEN_CACHE_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', AI_USERNAME);
      formData.append('password', AI_PASSWORD);

      const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: this.AI_TIMEOUT_MS,
      });

      const token = tokenResponse.data.access_token;
      const expiresIn = Number(tokenResponse.data.expires_in) || this.AI_TOKEN_DEFAULT_TTL_SECONDS;
      const cacheTtl = Math.max(30, expiresIn - 30);

      await this.redis.set(this.AI_TOKEN_CACHE_KEY, token, cacheTtl);
      return token;
    } catch (error: any) {
      this.logger.error('AI Token Error - authentication failed');
      await this.redis.set(this.AI_CIRCUIT_BREAKER_KEY, true, this.AI_CIRCUIT_BREAKER_TTL_SECONDS);
      throw new Error('AI authentication failed');
    }
  }

  async getPerformanceAI(payload: any) {
    try {
      const performanceData = await this.getPerformanceDataForAnalysis();
      const token = await this.getAIToken();

      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/performance`,
        {
          users: payload.users || [],
          analysis_type: payload.analysis_type || 'standard',
          performance_data: performanceData,
        },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          timeout: this.AI_TIMEOUT_MS,
        },
      );

      await this.saveAIAnalysisResult('performance_analysis', payload, response.data, { id: 'system' });

      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Performance analysis failed: ${error.message || error}`);
      throw new Error('AI performance analysis unavailable');
    }
  }

  async getComparePerformanceAI(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/compare_performance`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('AI compare performance error', error?.response?.data || error?.message || error);
      throw new BadGatewayException('AI compare performance failed: ' + (error?.response?.data?.error || error?.message || error));
    }
  }

  async getDiagnosticOptimisationAI(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/diagnostic_optimisation`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      throw new Error('AI diagnostic optimisation failed: ' + error.message);
    }
  }

  async getPredictResourcesAI(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/predict_resources`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      throw new Error('AI predict resources failed: ' + error.message);
    }
  }

  async getForecastTrendsAI(historicalData: any[]) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/forecast_trends`, historicalData, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('AI forecast trends failed', error as Error);
      throw new Error('AI forecast trends failed: ' + error.message);
    }
  }

  // ============================================================
  // Reclamations / courriers
  // ============================================================
  async getReclamationPerformance(user: any, query: any) {
    this.checkAnalyticsRole(user);
    try {
      const [totalReclamations, totalCourriers, resolvedReclamations, byStatus, resolvedDurations] = await Promise.all([
        this.prisma.reclamation.count(),
        this.prisma.courrier.count(),
        this.prisma.reclamation.count({ where: { status: { in: RESOLVED_RECLAMATION_STATUSES } } }),
        this.prisma.reclamation.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
        this.prisma.reclamation.findMany({
          where: { status: { in: RESOLVED_RECLAMATION_STATUSES } },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

      const totalClaims = totalReclamations + totalCourriers;
      const resolutionRate = totalReclamations > 0 ? Number(((resolvedReclamations / totalReclamations) * 100).toFixed(1)) : 0;
      const avgResolutionTime =
        resolvedDurations.length > 0
          ? Number(
              (
                resolvedDurations.reduce(
                  (sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24),
                  0,
                ) / resolvedDurations.length
              ).toFixed(2),
            )
          : 0;

      return {
        totalReclamations: totalClaims,
        resolvedReclamations,
        resolutionRate,
        avgResolutionTime,
        byStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting reclamation performance', error as Error);
      return {
        totalReclamations: 0,
        resolvedReclamations: 0,
        resolutionRate: 0,
        avgResolutionTime: 0,
        byStatus: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getClientDashboard(user: any, query: any) {
    this.checkAnalyticsRole(user);
    return { clients: [], metrics: {} };
  }

  async getUserDailyTargetAnalysis(user: any, query: any) {
    this.checkAnalyticsRole(user);
    return { targets: [], analysis: {} };
  }

  async getPriorityScoring(user: any, query: any) {
    this.checkAnalyticsRole(user);
    return { priorities: [] };
  }

  async getComparativeAnalysis(user: any, query: any) {
    this.checkAnalyticsRole(user);
    return { comparison: {} };
  }

  async getSlaTrend(user: any, query: any) {
    this.checkAnalyticsRole(user);
    return { trend: [] };
  }

  async getAlertEscalationFlag(user: any) {
    this.checkAnalyticsRole(user);
    return { escalate: false };
  }

  async getEnhancedRecommendations(user: any) {
    try {
      this.checkAnalyticsRole(user);

      const [alerts, capacityAnalysis, throughputGap] = await Promise.all([
        this.getAlerts(user, {}),
        this.getCapacityAnalysis(user),
        this.getThroughputGap(user),
      ]);

      const recommendations: any[] = [];
      const now = new Date().toISOString();

      const overloaded = capacityAnalysis.filter((c) => c.capacityStatus === 'overloaded');
      if (overloaded.length > 0) {
        recommendations.push({
          type: 'reassignment',
          priority: 'high',
          title: 'Réassignation Optimale Suggérée',
          description: `${overloaded.length} gestionnaire(s) surchargé(s) détecté(s) - réassignation recommandée`,
          impact: 'Réduction potentielle du délai de traitement',
          actionRequired: true,
          aiGenerated: false,
          confidence: 1,
          timestamp: now,
        });
      }

      if (alerts.critical.length > 0) {
        recommendations.push({
          type: 'process',
          priority: 'high',
          title: 'Risque SLA Critique Détecté',
          description: `${alerts.critical.length} bordereau(x) en dépassement de SLA`,
          impact: 'Probabilité élevée de non-conformité contractuelle',
          actionRequired: true,
          aiGenerated: false,
          confidence: 1,
          timestamp: now,
        });
      }

      if (throughputGap.gap > 0) {
        recommendations.push({
          type: 'staffing',
          priority: 'medium',
          title: "Renforcement d'Équipe Recommandé",
          description: `Écart de capacité détecté: ${throughputGap.gap} dossier(s) au-delà de la capacité actuelle`,
          impact: 'Anticipation des besoins en personnel',
          actionRequired: false,
          aiGenerated: false,
          confidence: 1,
          timestamp: now,
        });
      }

      if (alerts.warning.length > 0) {
        recommendations.push({
          type: 'process',
          priority: 'medium',
          title: 'Bordereaux à Risque',
          description: `${alerts.warning.length} bordereau(x) approchant leur échéance SLA`,
          impact: 'Investigation recommandée pour éviter un dépassement',
          actionRequired: false,
          aiGenerated: false,
          confidence: 1,
          timestamp: now,
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Enhanced recommendations failed', error as Error);
      throw error;
    }
  }

  async getCourrierVolume(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:courrier-volume`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const [byType, totalVolume] = await Promise.all([
          this.prisma.courrier.groupBy({ by: ['type'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
          this.prisma.courrier.count(),
        ]);

        return { byType, totalVolume, timestamp: new Date().toISOString() };
      } catch (error) {
        this.logger.error('Error getting courrier volume', error as Error);
        return { byType: [], totalVolume: 0, timestamp: new Date().toISOString() };
      }
    });
  }

  async getCourrierSlaBreaches(user: any) {
    this.checkAnalyticsRole(user);
    return { breaches: [] };
  }

  async getCourrierRecurrence(user: any) {
    this.checkAnalyticsRole(user);
    return { recurrence: [] };
  }

  async getCourrierEscalations(user: any) {
    this.checkAnalyticsRole(user);
    return { escalations: [] };
  }

  async getRecommendations(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:recommendations-basic`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const [currentWorkload, currentStaff] = await Promise.all([
          this.prisma.bordereau.count({ where: { statut: { in: ACTIVE_WORKLOAD_STATUSES } } }),
          this.prisma.user.count({ where: { role: { in: STAFF_ROLES }, active: true } }),
        ]);

        const neededStaff = Math.ceil(currentWorkload / 10);

        return {
          recommendations: [],
          neededStaff,
          recommendation: neededStaff > currentStaff ? 'INCREASE_STAFF' : 'OK',
        };
      } catch (error) {
        this.logger.error('Recommendations calculation failed', error as Error);
        throw error;
      }
    });
  }

  async getTrends(user: any, period: string) {
    this.checkAnalyticsRole(user);
    return [];
  }

  // ============================================================
  // Forecasting (AI-only — no local override of the AI's output;
  // cached with a longer TTL since trend data doesn't need to be
  // second-fresh).
  // ============================================================
  async getForecast(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:forecast`;
    return this.getOrSetCache(cacheKey, this.FORECAST_CACHE_TTL_SECONDS, async () => {
      try {
        const historicalBordereaux = await this.prisma.bordereau.findMany({
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        });

        const dailyCounts = new Map<string, number>();
        historicalBordereaux.forEach((b) => {
          const dateStr = new Date(b.createdAt).toISOString().split('T')[0];
          dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
        });

        const forecastData = Array.from(dailyCounts.entries())
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (forecastData.length === 0) {
          throw new Error('No historical data available for forecasting');
        }

        const token = await this.getAIToken();

        const aiResponse = await axios.post(`${AI_MICROSERVICE_URL}/forecast_trends`, forecastData, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          timeout: this.AI_TIMEOUT_MS,
        });

        const forecast = aiResponse.data.forecast || [];
        // AI-only: trust the AI's aggregated forecast directly — no local
        // sanity-clamp recomputation standing in for it.
        const nextWeekForecast = forecast.reduce((sum: number, day: any) => sum + (day.predicted_value || 0), 0);

        const history = forecast.map((day: any, index: number) => ({
          day: index + 1,
          count: Math.round(day.predicted_value || 0),
        }));

        const monthlyForecast = Math.round(nextWeekForecast * 4.3);

        return {
          nextWeekForecast: Math.round(nextWeekForecast),
          nextMonthForecast: monthlyForecast,
          slope: this.sanitizeNumber(this.calculateTrendSlope(forecast)),
          history: Array.isArray(history) ? history : [],
          aiGenerated: true,
          modelPerformance: aiResponse.data.model_performance,
          trendDirection: aiResponse.data.trend_direction || 'stable',
          dataSource: 'real',
          dataPoints: forecastData.length,
          avgPerDay: Math.round((forecastData.reduce((sum, d) => sum + d.value, 0) / forecastData.length) * 10) / 10,
        };
      } catch (error: any) {
        this.logger.error('AI Forecast failed', error);
        throw new Error(`AI forecasting failed: ${error.message}`);
      }
    });
  }

  private calculateTrendSlope(forecast: any[]): number {
    if (!Array.isArray(forecast) || forecast.length < 2) return 0;
    const firstValue = forecast[0]?.predicted_value || 0;
    const lastValue = forecast[forecast.length - 1]?.predicted_value || 0;
    return forecast.length > 0 ? (lastValue - firstValue) / forecast.length : 0;
  }

  private sanitizeNumber(value: number): number {
    if (!isFinite(value) || isNaN(value)) return 0;
    return value;
  }

  async getThroughputGap(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:throughput-gap`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const [currentWorkload, activeStaff] = await Promise.all([
          this.prisma.bordereau.count({ where: { statut: { in: ACTIVE_WORKLOAD_STATUSES } } }),
          this.prisma.user.count({ where: { role: { in: STAFF_ROLES }, active: true } }),
        ]);

        const capacity = activeStaff * 10;
        const gap = currentWorkload - capacity;

        return {
          gap,
          currentWorkload,
          capacity,
          utilizationRate: capacity > 0 ? (currentWorkload / capacity) * 100 : 0,
        };
      } catch (error) {
        this.logger.error('Throughput gap calculation failed', error as Error);
        return { gap: 0, currentWorkload: 0, capacity: 0, utilizationRate: 0 };
      }
    });
  }

  async exportAnalytics(query: any, user: any) {
    this.checkAnalyticsRole(user);
    return { filePath: '/tmp/export.xlsx' };
  }

  async getTraceability(bordereauId: string, user: any) {
    this.checkAnalyticsRole(user);
    return { trace: [] };
  }

  async getFilteredKpis(filters: any, user: any) {
    return {
      total: 0,
      processed: 0,
      rejected: 0,
      slaBreaches: 0,
      overdueVirements: 0,
      pendingReclamations: 0,
      appliedFilters: filters,
    };
  }

  async estimateResources(filters: any, user: any) {
    return { estimatedResources: 0, details: [], appliedFilters: filters };
  }

  async getCurrentStaff(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:current-staff`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const count = await this.prisma.user.count({ where: { role: { in: STAFF_ROLES }, active: true } });
      return { count };
    });
  }

  async getPlannedVsActual(user: any, dateRange: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:planned-vs-actual:${JSON.stringify(dateRange || {})}`;
    return this.getOrSetCache(cacheKey, this.FORECAST_CACHE_TTL_SECONDS, async () => {
      let forecast: any = { history: [] };
      try {
        forecast = await this.getForecast(user);
      } catch (err) {
        forecast = { history: [] };
      }

      const history = Array.isArray(forecast?.history) ? forecast.history : [];

      const defaultBuckets = 8;
      const bucketCount = Number(dateRange?.bucketCount) || (history.length > 0 ? history.length : defaultBuckets);

      const now = new Date();
      const to = dateRange?.toDate ? new Date(dateRange.toDate) : now;
      let from = dateRange?.fromDate ? new Date(dateRange.fromDate) : new Date(to.getTime() - bucketCount * 7 * 24 * 60 * 60 * 1000);
      if (from.getTime() > to.getTime()) {
        from = new Date(to.getTime() - bucketCount * 7 * 24 * 60 * 60 * 1000);
      }

      const totalMs = Math.max(1, to.getTime() - from.getTime());
      const bucketMs = Math.ceil(totalMs / bucketCount);
      const msPerDay = 24 * 60 * 60 * 1000;

      const rows = await this.prisma.bordereau.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      });

      const buckets: number[] = new Array(bucketCount).fill(0);
      for (const r of rows) {
        const ts = new Date(r.createdAt).getTime();
        let idx = Math.floor((ts - from.getTime()) / bucketMs);
        if (idx < 0) idx = 0;
        if (idx >= bucketCount) idx = bucketCount - 1;
        buckets[idx] = (buckets[idx] || 0) + 1;
      }

      const planned: number[] = [];
      if (history.length === bucketCount) {
        for (let i = 0; i < bucketCount; i++) planned.push(history[i]?.count || 0);
      } else if (history.length > 0) {
        const totalForecast = history.reduce((s: number, h: any) => s + (h.count || 0), 0);
        const avgPerDay = totalForecast / Math.max(1, history.length);
        const daysPerBucket = Math.max(1, Math.round(bucketMs / msPerDay));
        for (let i = 0; i < bucketCount; i++) planned.push(Math.round(avgPerDay * daysPerBucket));
      } else {
        for (let i = 0; i < bucketCount; i++) planned.push(0);
      }

      const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil(((date.getTime() - yearStart.getTime()) / msPerDay + 1) / 7);
      };

      const formatLabel = (start: Date, end: Date) => {
        if (bucketMs >= 27 * msPerDay) {
          return start.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
        }
        if (bucketMs >= 6 * msPerDay) {
          return `Sem ${getWeekNumber(start)} ${start.getFullYear()}`;
        }
        const s = start.toLocaleDateString('fr-FR');
        const e = end.toLocaleDateString('fr-FR');
        return s === e ? s : `${s} → ${e}`;
      };

      const result: any[] = [];
      for (let i = 0; i < bucketCount; i++) {
        const start = new Date(from.getTime() + i * bucketMs);
        const end = new Date(Math.min(to.getTime(), from.getTime() + (i + 1) * bucketMs - 1));
        const plannedVal = planned[i] || 0;
        const actualVal = buckets[i] || 0;
        const variance = plannedVal ? Math.round(((actualVal - plannedVal) / Math.max(plannedVal, 1)) * 100) : 0;
        result.push({ period: formatLabel(start, end), planned: plannedVal, actual: actualVal, variance });
      }

      return result;
    });
  }

  // ============================================================
  // AI recommendations — AI-only: on failure/empty response we now
  // return an empty list instead of a hardcoded canned list that used
  // to masquerade as AI output.
  // ============================================================
  async getAIRecommendations(user: any) {
    this.checkAnalyticsRole(user);

    try {
      const token = await this.getAIToken();

      const [currentWorkload, staffCount, slaBreaches, systemMetrics] = await Promise.all([
        this.prisma.bordereau.count({ where: { statut: { in: ACTIVE_WORKLOAD_STATUSES } } }),
        this.prisma.user.count({ where: { active: true, role: { in: STAFF_ROLES } } }),
        this.prisma.bordereau.count({ where: { delaiReglement: { lt: 0 } } }),
        this.getSystemMetricsForOptimization(),
      ]);

      const systemData = {
        optimization_focus: ['forecasting', 'resource_planning', 'capacity'],
        current_workload: currentWorkload,
        staff_count: staffCount,
        sla_breaches: slaBreaches,
        avg_processing_time: systemMetrics.avg_processing_time,
        capacity_utilization: systemMetrics.resource_utilization,
        trend_analysis: 'workload_stable',
      };

      const response = await axios.post(`${AI_MICROSERVICE_URL}/recommendations`, systemData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });

      if (!response.data || !response.data.recommendations) {
        this.logger.warn('AI returned no recommendations');
        return { recommendations: [] };
      }

      const recommendations = response.data.recommendations.map((rec: any) => rec.title || rec.description || rec);
      return { recommendations };
    } catch (error: any) {
      this.logger.error(`AI recommendations failed: ${error.message}`);
      return { recommendations: [] };
    }
  }

  async getResourcePlanning(user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:resource-planning`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const currentStaff = await this.getCurrentStaff(user);
      const recommendations = await this.getRecommendations(user);
      const neededStaff = recommendations.neededStaff || currentStaff.count;

      return [
        { resource: 'Gestionnaires', current: currentStaff.count, needed: neededStaff, gap: neededStaff - currentStaff.count },
        {
          resource: 'Superviseurs',
          current: Math.ceil(currentStaff.count / 4),
          needed: Math.ceil(neededStaff / 4),
          gap: Math.ceil(neededStaff / 4) - Math.ceil(currentStaff.count / 4),
        },
        {
          resource: 'Support',
          current: Math.ceil(currentStaff.count / 2),
          needed: Math.ceil(neededStaff / 2),
          gap: Math.ceil(neededStaff / 2) - Math.ceil(currentStaff.count / 2),
        },
      ];
    });
  }

  // ============================================================
  // Filter options
  // ============================================================
  async getDepartments() {
    try {
      const departments = await this.prisma.department.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return departments.map((d) => ({ id: d.id, name: d.name }));
    } catch (error) {
      this.logger.error('Error getting departments', error as Error);
      return [];
    }
  }

  async getTeams() {
    try {
      const teamLeaders = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true },
        select: { id: true, fullName: true, department: true },
      });

      return teamLeaders.map((leader) => ({
        id: leader.id,
        name: `Équipe ${leader.fullName}${leader.department ? ` (${leader.department})` : ''}`,
      }));
    } catch (error) {
      this.logger.error('Error getting teams', error as Error);
      return [];
    }
  }

  async getWorkforceEstimator(query: any, user: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:workforce-estimator:${JSON.stringify(query || {})}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const [currentStaff, currentWorkload, departments] = await Promise.all([
          this.prisma.user.count({ where: { role: { in: STAFF_ROLES_WITH_SENIOR }, active: true } }),
          this.prisma.bordereau.count({ where: { statut: { notIn: ['CLOTURE', 'PAYE', 'REJETE'] } } }),
          this.prisma.department.findMany({
            where: { active: true },
            include: { users: { where: { active: true, role: { in: STAFF_ROLES_WITH_SENIOR } } } },
          }),
        ]);

        const requiredStaff = Math.ceil(currentWorkload / 10);
        const requiredStaffCalculation = `${currentWorkload} bordereaux ÷ 10 bordereaux/personne = ${requiredStaff} personnes`;

        const targetWorkload = currentStaff * 10;
        const targetWorkloadCalculation = `${currentStaff} personnes × 10 bordereaux/personne = ${targetWorkload} bordereaux`;
        const currentWorkloadCalculation = `Bordereaux actifs (hors archivés/clôturés) = ${currentWorkload}`;

        const departmentAnalysis = departments
          .filter((dept) => dept.users.length > 0)
          .map((dept) => {
            const deptStaff = dept.users.length;
            const deptWorkload = Math.floor(currentWorkload * (deptStaff / Math.max(currentStaff, 1)));
            const deptRequired = Math.ceil(deptWorkload / 10);
            const deptEfficiency = Math.min(100, ((deptStaff * 10) / Math.max(deptWorkload, 1)) * 100);

            return {
              department: dept.name,
              currentStaff: deptStaff,
              requiredStaff: deptRequired,
              workload: deptWorkload,
              efficiency: Math.round(deptEfficiency),
              status: deptStaff < deptRequired ? ('understaffed' as const) : deptStaff > deptRequired ? ('overstaffed' as const) : ('optimal' as const),
            };
          });

        return {
          currentStaff,
          requiredStaff,
          requiredStaffCalculation,
          currentWorkload,
          currentWorkloadCalculation,
          targetWorkload,
          targetWorkloadCalculation,
          efficiency: Math.min(100, ((currentStaff * 10) / Math.max(currentWorkload, 1)) * 100),
          recommendations: await this.getAIWorkforceRecommendations(currentStaff, requiredStaff, currentWorkload),
          departmentAnalysis,
        };
      } catch (error) {
        this.logger.error('Error getting workforce estimator', error as Error);
        return {
          currentStaff: 0,
          requiredStaff: 0,
          currentWorkload: 0,
          targetWorkload: 0,
          efficiency: 0,
          recommendations: [],
          departmentAnalysis: [],
        };
      }
    });
  }

  private async getAIWorkforceRecommendations(currentStaff: number, requiredStaff: number, currentWorkload: number): Promise<string[]> {
    try {
      const token = await this.getAIToken();

      // 🚀 NEW: these two reads are independent — run them concurrently
      // instead of one-after-the-other.
      const [slaItems, agents] = await Promise.all([
        this.prisma.bordereau.findMany({
          where: { statut: { notIn: ['CLOTURE', 'PAYE', 'REJETE'] } },
          select: {
            id: true,
            statut: true,
            delaiReglement: true,
            dateReception: true,
            dateReceptionBO: true,
            createdAt: true,
          },
        }),
        this.prisma.user.findMany({
          where: { active: true, role: { in: STAFF_ROLES_WITH_SENIOR } },
        }),
      ]);

      const now = new Date();
      const bordereaux = slaItems.map((b) => {
        const receptionDate = b.dateReceptionBO || b.dateReception || b.createdAt;
        const slaThreshold = b.delaiReglement || 30;
        const deadline = new Date(receptionDate);
        deadline.setDate(deadline.getDate() + slaThreshold);
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return { id: b.id, status: b.statut, days_remaining: daysRemaining, sla_days: slaThreshold };
      });

      const agentIds = agents.map((a) => a.id);

      const [activeCounts, completed] = await Promise.all([
        this.prisma.bordereau.groupBy({
          by: ['assignedToUserId'],
          _count: { id: true },
          where: { assignedToUserId: { in: agentIds }, statut: { in: ACTIVE_WORKLOAD_STATUSES } },
        }),
        this.prisma.bordereau.findMany({
          where: { assignedToUserId: { in: agentIds }, dateCloture: { not: null } },
          select: { assignedToUserId: true, dateReception: true, dateCloture: true, delaiReglement: true },
        }),
      ]);

      const activeCountMap = new Map(
        activeCounts.map((c) => [
          c.assignedToUserId,
          typeof c._count === 'object' ? c._count.id ?? 0 : 0,
        ]),
      );

      const complianceMap = new Map<string, { total: number; compliant: number; totalHours: number }>();
      for (const b of completed) {
        if (!b.assignedToUserId || !b.dateCloture) continue;
        const entry = complianceMap.get(b.assignedToUserId) || { total: 0, compliant: 0, totalHours: 0 };
        const hours = (new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60);
        entry.total += 1;
        entry.totalHours += hours;
        if (hours / 24 <= (b.delaiReglement || 30)) entry.compliant += 1;
        complianceMap.set(b.assignedToUserId, entry);
      }

      const agentsData = agents.map((a) => {
        const compliance = complianceMap.get(a.id);
        return {
          id: a.id,
          firstName: a.fullName.split(' ')[0],
          lastName: a.fullName.split(' ').slice(1).join(' '),
          total_bordereaux: activeCountMap.get(a.id) || 0,
          sla_compliant: compliance?.compliant || 0,
          avg_hours: compliance && compliance.total > 0 ? Number((compliance.totalHours / compliance.total).toFixed(1)) : 0,
        };
      });

      const payload = {
        bordereaux,
        agents: agentsData,
        currentStaff,
        requiredStaff,
        currentWorkload,
        staff_count: currentStaff,
        sla_breaches: bordereaux.filter((b) => b.days_remaining < 0).length,
        capacity_utilization: currentStaff > 0 ? currentWorkload / (currentStaff * 10) : 0,
      };

      const response = await axios.post(`${AI_MICROSERVICE_URL}/recommendations`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });

      const aiRecommendations = response.data?.recommendations || [];

      if (!Array.isArray(aiRecommendations) || aiRecommendations.length === 0) {
        this.logger.warn('AI returned invalid/empty workforce recommendations');
        return [];
      }

      return aiRecommendations;
    } catch (error) {
      this.logger.error('AI workforce recommendations failed', error as Error);
      return [];
    }
  }

  // ============================================================
  // AI-powered performance analytics
  // ============================================================
  async getAIAlertSolution(payload: any): Promise<any> {
    const token = await this.getAIToken();

    let documents: Array<{ id: string; name: string; type: any; status: any }> = [];
    let documentCount = 0;
    let documentTypes: string[] = [];

    try {
      documents = (await this.prisma.document.findMany({
        where: { bordereauId: payload.bordereau.id },
        select: { id: true, name: true, type: true, status: true },
        orderBy: { uploadedAt: 'asc' },
      })) as Array<{ id: string; name: string; type: any; status: any }>;
      documentCount = documents.length;
      documentTypes = [...new Set(documents.map((d) => d.type))].filter(Boolean) as string[];
    } catch (error: any) {
      this.logger.error('Failed to fetch documents for bordereau', error);
    }

    const aiPayload = {
      bordereau_id: payload.bordereau.id,
      reference: payload.bordereau.reference,
      client: payload.bordereau.contract?.client?.name || payload.bordereau.client?.name,
      statut: payload.bordereau.statut,
      date_reception: payload.bordereau.dateReception,
      sla_days: payload.slaDays,
      alert_level: payload.alertLevel,
      reason: payload.reason,
      current_handler: payload.bordereau.currentHandler?.fullName,
      team_leader: payload.bordereau.contract?.teamLeader?.fullName,
      document_count: documentCount,
      document_types: documentTypes,
      documents: documents.map((d) => ({ id: d.id, name: d.name, type: d.type, status: d.status })),
    };

    const response = await axios.post(`${AI_MICROSERVICE_URL}/alert_solution`, aiPayload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      timeout: this.AI_TIMEOUT_MS,
    });

    return {
      rootCause: response.data.root_cause,
      actions: response.data.recommended_actions,
      priority: response.data.priority,
      reasoning: response.data.reasoning,
      document_details: {
        count: documentCount,
        types: documentTypes,
        summary: `${documentCount} document(s)${documentTypes.length > 0 ? ' - Types: ' + documentTypes.join(', ') : ''}`,
        documents: documents.map((d) => ({ id: d.id, name: d.name, type: d.type, status: d.status })),
      },
    };
  }

  async performRootCauseAnalysis(user: any): Promise<any[]> {
    try {
      this.checkAnalyticsRole(user);

      const performanceData = await this.getPerformanceDataForAnalysis();

      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/diagnostic_optimisation`,
        { performance_data: performanceData, analysis_type: 'root_cause' },
        { headers: { Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );

      return response.data.root_causes || [];
    } catch (error: any) {
      this.logger.error(`Root cause analysis failed: ${error.message || error}`);
      return [];
    }
  }

  async getAIOptimizationRecommendations(user: any): Promise<any[]> {
    try {
      this.checkAnalyticsRole(user);

      const metrics = await this.getSystemMetricsForOptimization();

      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/recommendations`,
        { metrics, optimization_focus: ['performance', 'efficiency', 'quality'] },
        { headers: { Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );

      const aiRecommendations = response.data.recommendations || [];
      return aiRecommendations.map((rec: any) => ({
        type: 'ai_optimization',
        priority: rec.priority || 'medium',
        title: rec.title || 'Optimisation IA',
        description: rec.description || rec.recommendation,
        impact: rec.impact || 'Amélioration des performances',
        actionRequired: rec.actionable !== false,
        aiGenerated: true,
        confidence: rec.confidence || 0.8,
      }));
    } catch (error) {
      this.logger.error('AI optimization recommendations failed', error as Error);
      return [];
    }
  }

  async detectProcessBottlenecks(user: any): Promise<any[]> {
    try {
      this.checkAnalyticsRole(user);

      const processData = await this.getProcessFlowDataWithRealTimes();

      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/pattern_recognition/process_anomalies`,
        { process_data: processData, detection_type: 'bottleneck' },
        { headers: { Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );

      return response.data.bottlenecks || [];
    } catch (error) {
      this.logger.error('Bottleneck detection failed', error as Error);
      return [];
    }
  }

  async identifyTrainingNeeds(user: any): Promise<any[]> {
    try {
      this.checkAnalyticsRole(user);

      const userPerformance = await this.getUserPerformanceForTraining();
      const learningInsights = await this.getAILearningInsights('training_needs');

      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/performance`,
        { users: userPerformance, analysis_type: 'training_needs', learning_context: learningInsights },
        { headers: { Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );

      const result = response.data.training_needs || [];

      await this.saveAIAnalysisResult('training_needs', { userPerformance }, { training_needs: result, confidence: 0.85 }, user);

      return result;
    } catch (error) {
      this.logger.error('Training needs identification failed', error as Error);
      throw new Error('AI training needs analysis unavailable');
    }
  }

  private async getProcessFlowDataWithRealTimes(): Promise<any[]> {
    const processSteps = await this.prisma.traitementHistory.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      include: {
        bordereau: { select: { statut: true, delaiReglement: true, updatedAt: true } },
        user: { select: { role: true, department: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return processSteps.map((step) => ({
      step_name: step.action,
      from_status: step.fromStatus,
      to_status: step.toStatus,
      processing_time: this.calculateStepProcessingTime({
        createdAt: step.createdAt,
        updatedAt: step.bordereau?.updatedAt || step.createdAt,
      }),
      user_role: step.user?.role,
      department: step.user?.department,
      timestamp: step.createdAt,
      real_time_calculated: true,
    }));
  }

  private async getUserPerformanceForTraining(): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, active: true },
      include: {
        bordereauxCurrentHandler: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        reclamations: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      },
    });

    return users.map((user) => ({
      user_id: user.id,
      role: user.role,
      department: user.department,
      processed_count: user.bordereauxCurrentHandler.length,
      error_rate: user.reclamations.length / Math.max(user.bordereauxCurrentHandler.length, 1),
      avg_processing_time: this.calculateUserAvgProcessingTime(user.bordereauxCurrentHandler),
      complexity_handled: this.calculateComplexityScore(user.bordereauxCurrentHandler),
    }));
  }

  // ============================================================
  // AI learning & persistence
  // ============================================================
  private async saveAIAnalysisResult(analysisType: string, inputData: any, result: any, user: any) {
    try {
      await this.prisma.aiOutput.create({
        data: {
          endpoint: `analytics_${analysisType}`,
          inputData: JSON.stringify(inputData),
          result: JSON.stringify(result),
          userId: user.id,
          confidence: result.confidence || 0.8,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save AI analysis result', error as Error);
    }
  }

  private async getAILearningInsights(analysisType: string): Promise<any> {
    try {
      const recentAnalyses = await this.prisma.aiOutput.findMany({
        where: { endpoint: `analytics_${analysisType}`, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return {
        total_analyses: recentAnalyses.length,
        avg_confidence:
          recentAnalyses.length > 0
            ? recentAnalyses.reduce((sum, a) => sum + Number(a.confidence || 0), 0) / recentAnalyses.length
            : 0,
        learning_data: recentAnalyses.map((a) => ({
          input: JSON.parse(a.inputData as string),
          output: JSON.parse(a.result as string),
          confidence: a.confidence,
          timestamp: a.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get AI learning insights', error as Error);
      return { total_analyses: 0, avg_confidence: 0, learning_data: [] };
    }
  }

  // ============================================================
  // Calculation helpers
  // ============================================================
  private calculateStepProcessingTime(step: any): number {
    try {
      const createdAt = new Date(step.createdAt);
      const updatedAt = step.updatedAt ? new Date(step.updatedAt) : new Date();
      const diffHours = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return Math.max(0.1, diffHours);
    } catch (error) {
      this.logger.error('Error calculating step processing time', error as Error);
      return 24;
    }
  }

  private calculateUserAvgProcessingTime(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 0;
    return (
      bordereaux.reduce((sum, b) => {
        const created = new Date(b.createdAt);
        const now = new Date();
        return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0) / bordereaux.length
    );
  }

  private calculateComplexityScore(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 0;
    return bordereaux.reduce((sum, b) => sum + (b.nombreBS || 1), 0) / bordereaux.length;
  }

  // ============================================================
  // Advanced AI methods
  // ============================================================
  async getAdvancedClusteringAI(processData: any[]) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/advanced_clustering`,
        { process_data: processData },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('AI advanced clustering failed', error as Error);
      throw new Error('AI advanced clustering failed: ' + error.message);
    }
  }

  async getSophisticatedAnomalyDetectionAI(performanceData: any[]) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(
        `${AI_MICROSERVICE_URL}/anomaly_detection`,
        { detection_type: 'performance', performance_data: performanceData },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, timeout: this.AI_TIMEOUT_MS },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('AI sophisticated anomaly detection failed', error as Error);
      throw new Error('AI sophisticated anomaly detection failed: ' + error.message);
    }
  }

  async generateExecutiveReportAI(reportParams: any) {
    try {
      const token = await this.getAIToken();
      const response = await axios.post(`${AI_MICROSERVICE_URL}/generate_executive_report`, reportParams, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: this.AI_TIMEOUT_MS,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('AI executive report generation failed', error as Error);
      throw new Error('AI executive report generation failed: ' + error.message);
    }
  }

  async getAdvancedProcessClustering(user: any): Promise<any> {
    try {
      this.checkAnalyticsRole(user);

      const processData = await this.getProcessDataForClustering();

      if (processData.length < 3) {
        return { clusters: [], summary: 'Insufficient process data for clustering' };
      }

      const clusteringResult = await this.getAdvancedClusteringAI(processData);
      await this.saveAIAnalysisResult('advanced_clustering', { processData }, clusteringResult, user);

      return clusteringResult;
    } catch (error) {
      this.logger.error('Advanced process clustering failed', error as Error);
      return { clusters: [], summary: 'Advanced clustering service unavailable' };
    }
  }

  async getSophisticatedAnomalyAnalysis(user: any): Promise<any> {
    try {
      this.checkAnalyticsRole(user);

      const performanceData = await this.getPerformanceDataForAnomalyDetection();

      if (performanceData.length < 5) {
        return { anomalies: [], summary: 'Insufficient performance data for anomaly detection' };
      }

      const anomalyResult = await this.getSophisticatedAnomalyDetectionAI(performanceData);
      await this.saveAIAnalysisResult('sophisticated_anomaly_detection', { performanceData }, anomalyResult, user);

      return anomalyResult;
    } catch (error) {
      this.logger.error('Sophisticated anomaly analysis failed', error as Error);
      return { anomalies: [], summary: 'Anomaly detection service unavailable' };
    }
  }

  async generateComprehensiveExecutiveReport(user: any, reportParams: any): Promise<any> {
    try {
      this.checkAnalyticsRole(user);

      const executiveReport = await this.generateExecutiveReportAI({
        report_type: reportParams.report_type || 'comprehensive',
        time_period: reportParams.time_period || '30d',
        include_forecasts: reportParams.include_forecasts !== false,
      });

      await this.saveAIAnalysisResult('executive_report', reportParams, executiveReport, user);

      return executiveReport;
    } catch (error) {
      this.logger.error('Executive report generation failed', error as Error);
      return {
        executive_summary: {
          overall_health_score: null,
          critical_anomalies: 0,
          problematic_clusters: 0,
          total_bordereaux: 0,
          key_recommendations: [],
          status: 'unavailable',
        },
      };
    }
  }

  private async getProcessDataForClustering(): Promise<any[]> {
    try {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        include: {
          client: { select: { name: true } },
          currentHandler: { select: { fullName: true } },
        },
        take: 100,
      });

      return bordereaux.map((b) => ({
        process_name: `Bordereau_${b.reference}`,
        processing_time: this.calculateProcessingTime(b),
        error_rate: this.calculateErrorRate(b),
        delay_frequency: this.calculateDelayFrequency(b),
        resource_utilization: 0.7,
        complexity_score: b.nombreBS || 1,
        sla_breach_rate: this.calculateSLABreachRate(b),
      }));
    } catch (error) {
      this.logger.error('Failed to get process data for clustering', error as Error);
      return [];
    }
  }

  private async getPerformanceDataForAnomalyDetection(): Promise<any[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { role: { in: STAFF_ROLES }, active: true },
        include: {
          bordereauxCurrentHandler: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          reclamations: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        },
      });

      return users.map((user) => ({
        id: user.id,
        processing_time: this.calculateUserAvgProcessingTime(user.bordereauxCurrentHandler),
        throughput: user.bordereauxCurrentHandler.length,
        error_rate: this.calculateUserErrorRate(user),
        resource_utilization: Math.min(1.0, user.bordereauxCurrentHandler.length / (user.capacity || 20)),
        sla_compliance: this.calculateUserSLACompliance(user.bordereauxCurrentHandler),
        queue_length: user.bordereauxCurrentHandler.filter((b) => b.statut === 'EN_ATTENTE').length,
        response_time: this.calculateUserAvgProcessingTime(user.bordereauxCurrentHandler),
      }));
    } catch (error) {
      this.logger.error('Failed to get performance data for anomaly detection', error as Error);
      return [];
    }
  }

  private calculateProcessingTime(bordereau: any): number {
    try {
      const created = new Date(bordereau.createdAt);
      const now = new Date();
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    } catch {
      return 24;
    }
  }

  private calculateErrorRate(bordereau: any): number {
    return ERROR_STATUSES.includes(bordereau.statut) ? 0.1 : 0.02;
  }

  private calculateDelayFrequency(bordereau: any): number {
    const daysSinceCreation = (new Date().getTime() - new Date(bordereau.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation > bordereau.delaiReglement ? 0.3 : 0.05;
  }

  private calculateSLABreachRate(bordereau: any): number {
    const daysSinceCreation = (new Date().getTime() - new Date(bordereau.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation > bordereau.delaiReglement ? 1.0 : 0.0;
  }

  private calculateUserErrorRate(user: any): number {
    const processed = user.bordereauxCurrentHandler?.length || 0;
    const errors = user.reclamations?.length || 0;
    if (processed === 0) return 0;
    return Number(Math.min(1, errors / processed).toFixed(3));
  }

  private calculateUserSLACompliance(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 1.0;
    const compliant = bordereaux.filter((b) => {
      const daysSinceCreation = (new Date().getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation <= b.delaiReglement;
    }).length;
    return compliant / bordereaux.length;
  }

  // ============================================================
  // Department / role performance (cached)
  // ============================================================
  async getPerformanceByDepartment(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:perf-dept:${JSON.stringify(filters || {})}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      try {
        const departments = await this.prisma.department.findMany({
          where: { active: true },
          select: { id: true, name: true, code: true },
        });

        if (departments.length === 0) {
          return this.getPerformanceByRole(user, filters);
        }

        const results = await Promise.all(
          departments.map(async (dept) => {
            const deptUsers = await this.prisma.user.findMany({
              where: { departmentId: dept.id, active: true },
              select: { id: true },
            });

            if (deptUsers.length === 0) return null;

            const userIds = deptUsers.map((u) => u.id);
            const [totalProcessed, slaCompliant, avgDelayResult] = await Promise.all([
              this.prisma.bordereau.count({ where: { assignedToUserId: { in: userIds } } }),
              this.prisma.bordereau.count({ where: { assignedToUserId: { in: userIds }, delaiReglement: { lte: 3 } } }),
              this.prisma.bordereau.aggregate({ where: { assignedToUserId: { in: userIds } }, _avg: { delaiReglement: true } }),
            ]);

            if (totalProcessed === 0) return null;

            return {
              department: dept.name,
              slaCompliance: Math.round((slaCompliant / totalProcessed) * 100),
              avgTime: Number((avgDelayResult._avg.delaiReglement || 0).toFixed(1)),
              workload: totalProcessed,
            };
          }),
        );

        return results.filter((r): r is NonNullable<typeof r> => r !== null);
      } catch (error) {
        this.logger.error('Error getting department performance', error as Error);
        return [];
      }
    });
  }

  private async getPerformanceByRole(user: any, filters: any = {}): Promise<any[]> {
    const roles = ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SCAN_TEAM', 'BO', 'FINANCE'];
    const roleNames: Record<string, string> = {
      GESTIONNAIRE: 'Gestionnaires',
      CHEF_EQUIPE: "Chefs d'Équipe",
      SCAN_TEAM: 'Équipe Scan',
      BO: "Bureau d'Ordre",
      FINANCE: 'Finance',
    };

    const results = await Promise.all(
      roles.map(async (role) => {
        const users = await this.prisma.user.findMany({ where: { role, active: true }, select: { id: true } });
        if (users.length === 0) return null;

        const userIds = users.map((u) => u.id);
        const [totalProcessed, slaCompliant, avgDelayResult] = await Promise.all([
          this.prisma.bordereau.count({ where: { assignedToUserId: { in: userIds } } }),
          this.prisma.bordereau.count({ where: { assignedToUserId: { in: userIds }, delaiReglement: { lte: 3 } } }),
          this.prisma.bordereau.aggregate({ where: { assignedToUserId: { in: userIds } }, _avg: { delaiReglement: true } }),
        ]);

        if (totalProcessed === 0) return null;

        return {
          department: roleNames[role],
          slaCompliance: Math.round((slaCompliant / totalProcessed) * 100),
          avgTime: Number((avgDelayResult._avg.delaiReglement || 0).toFixed(1)),
          workload: totalProcessed,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  // ============================================================
  // Document breakdowns (batched — single groupBy shared between the two
  // endpoints via a cached helper instead of each running its own query)
  // ============================================================
  private async getDocumentTypeStatusCounts() {
    const cacheKey = `analytics:doc-type-status-groupby`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      return this.prisma.document.groupBy({ by: ['type', 'status'], _count: true });
    });
  }

  async getDocumentTypesBreakdown(user: any, query: any) {
    this.checkAnalyticsRole(user);

    const statusCounts = await this.getDocumentTypeStatusCounts();

    const result: any = {};
    for (const type of DOCUMENT_TYPES) {
      const rows = statusCounts.filter((r) => r.type === type);
      const total = rows.reduce((sum, r) => sum + r._count, 0);
      const traite = rows.find((r) => r.status === 'TRAITE')?._count || 0;
      const enCours = rows.filter((r) => ['EN_COURS', 'SCANNE', 'UPLOADED'].includes(r.status || '')).reduce((sum, r) => sum + r._count, 0);
      const rejete = rows.find((r) => r.status === 'REJETE')?._count || 0;

      result[type] = { total, traite, enCours, rejete };
    }

    return result;
  }

  async getDocumentStatusByType(user: any, query: any) {
    this.checkAnalyticsRole(user);

    const statusCounts = await this.getDocumentTypeStatusCounts();

    const result: any = {};
    for (const type of DOCUMENT_TYPES) {
      const rows = statusCounts.filter((r) => r.type === type);
      if (rows.length > 0) {
        result[type] = {};
        rows.forEach((r) => {
          result[type][r.status || 'UNKNOWN'] = r._count;
        });
      }
    }

    return result;
  }

  async getGestionnairesDailyPerformance(
    user: any,
    query: any,
  ): Promise<Array<{ id: string; name: string; documentsProcessed: number; documentsTraites: number; documentsLast24h: number }>> {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:gest-daily-perf:${JSON.stringify(query || {})}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const gestionnaireWhere: any = { role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'] }, active: true };

      if (query.gestionnaireId) {
        gestionnaireWhere.id = query.gestionnaireId;
      }
      if (query.gestionnaireSeniorId) {
        gestionnaireWhere.id = query.gestionnaireSeniorId;
      }
      if (query.chefEquipeId) {
        const teamMembers = await this.prisma.user.findMany({
          where: { OR: [{ id: query.chefEquipeId }, { teamLeaderId: query.chefEquipeId }] },
          select: { id: true },
        });
        if (teamMembers.length > 0) {
          gestionnaireWhere.id = { in: teamMembers.map((m) => m.id) };
        }
      }

      const gestionnaires = await this.prisma.user.findMany({
        where: gestionnaireWhere,
        select: { id: true, fullName: true, email: true, role: true },
      });

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const buildDateFilter = () => {
        const dateFilter: any = {};
        if (query.fromDate) {
          const fromDate = new Date(query.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          dateFilter.gte = fromDate;
        }
        if (query.toDate) {
          const toDate = new Date(query.toDate);
          toDate.setHours(23, 59, 59, 999);
          dateFilter.lte = toDate;
        }
        return Object.keys(dateFilter).length > 0 ? { uploadedAt: dateFilter } : {};
      };

      const results = await Promise.all(
        gestionnaires.map(async (gest) => {
          let documentsProcessed = 0;
          let documentsTraites = 0;
          let documentsLast24h = 0;

          if (gest.role === 'GESTIONNAIRE_SENIOR') {
            const contractWhere: any = { teamLeaderId: gest.id };
            if (query.clientId) contractWhere.clientId = query.clientId;

            const contracts = await this.prisma.contract.findMany({ where: contractWhere, select: { id: true } });
            const contractIds = contracts.map((c) => c.id);

            if (contractIds.length > 0) {
              const baseWhere: any = { bordereau: { contractId: { in: contractIds } } };
              const filteredWhere = { ...baseWhere, ...buildDateFilter() };

              [documentsProcessed, documentsTraites, documentsLast24h] = await Promise.all([
                this.prisma.document.count({ where: filteredWhere }),
                this.prisma.document.count({ where: { ...filteredWhere, status: 'TRAITE' } }),
                this.prisma.document.count({ where: { ...baseWhere, uploadedAt: { gte: last24h } } }),
              ]);
            }
          } else {
            const docWhere: any = { assignedToUserId: gest.id };
            if (query.clientId) docWhere.bordereau = { clientId: query.clientId };

            const filteredWhere = { ...docWhere, ...buildDateFilter() };

            [documentsProcessed, documentsTraites, documentsLast24h] = await Promise.all([
              this.prisma.document.count({ where: filteredWhere }),
              this.prisma.document.count({ where: { ...filteredWhere, status: 'TRAITE' } }),
              this.prisma.document.count({ where: { ...docWhere, uploadedAt: { gte: last24h } } }),
            ]);
          }

          return {
            id: gest.id,
            name: gest.fullName || gest.email,
            documentsProcessed,
            documentsTraites,
            documentsLast24h,
          };
        }),
      );

      return results.sort((a, b) => b.documentsProcessed - a.documentsProcessed);
    });
  }

  // ============================================================
  // ✅ FIXED: was hand-computing (dateCloture − dateReception) inline —
  // a second, disconnected implementation of "SLA de traitement" that
  // could drift from the centralized calculator (e.g. it never checked
  // whether dateCloture had actually been reached, just whether it was
  // non-null, and used a different threshold-resolution order). Now
  // delegates entirely to calculateAllSLAs().traitement. Cached.
  // ============================================================
  async getSLAComplianceByType(user: any, query: any) {
    this.checkAnalyticsRole(user);

    const cacheKey = `analytics:sla-compliance-type:${JSON.stringify(query || {})}`;
    return this.getOrSetCache(cacheKey, this.DASHBOARD_CACHE_TTL_SECONDS, async () => {
      const where: any = { type: { in: SLA_APPLICABLE_TYPES }, dateCloture: { not: null } };
      if (query.fromDate || query.toDate) {
        where.createdAt = {};
        if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
        if (query.toDate) where.createdAt.lte = new Date(query.toDate);
      }

      const bordereaux = await this.prisma.bordereau.findMany({
        where,
        select: {
          type: true,
          statut: true,
          dateCloture: true,
          dateReception: true,
          dateExecutionVirement: true,
          ordresVirement: { select: { etatVirement: true, dateEtatFinal: true, dateTraitement: true } },
          client: { select: { reglementDelay: true } },
          contract: { select: { delaiReglement: true } },
        },
      });

      const results: any = {};
      for (const docType of SLA_APPLICABLE_TYPES) {
        const typeBordereaux = bordereaux.filter((b) => b.type === docType);
        if (typeBordereaux.length === 0) {
          results[docType] = { total: 0, compliant: 0, complianceRate: 0 };
          continue;
        }

        let compliantCount = 0;
        let applicableCount = 0;
        for (const b of typeBordereaux) {
          const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
          const { traitement } = calculateAllSLAs({
            dateReception: b.dateReception,
            delaiReglement: slaThreshold,
            statut: b.statut,
            dateCloture: b.dateCloture,
            dateExecutionVirement: b.dateExecutionVirement,
            ordresVirement: b.ordresVirement,
          });

          if (!traitement.applicable || traitement.percentElapsed === null) continue;

          applicableCount++;
          if (traitement.percentElapsed <= 100) compliantCount++;
        }

        results[docType] = {
          total: applicableCount,
          compliant: compliantCount,
          complianceRate: applicableCount > 0 ? Math.round((compliantCount / applicableCount) * 100) : 0,
        };
      }

      return results;
    });
  }
}