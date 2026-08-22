import { Injectable, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { OutlookService } from '../integrations/outlook.service';
import { EnhancedAlertsService } from './enhanced-alerts.service';
import { EscalationEngineService } from './escalation-engine.service';
import { MultiChannelNotificationsService } from './multi-channel-notifications.service';
import { AlertAnalyticsService } from './alert-analytics.service';
import { RedisService } from '../shared/redis.service';
import axios from 'axios';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  // --- AI service auth/perf tuning -----------------------------------
  private readonly AI_TOKEN_CACHE_KEY = 'ai:service:token';
  private readonly AI_TOKEN_TTL = 25 * 60; // 25 minutes

  private readonly AI_CIRCUIT_KEY = 'ai:service:circuit:open';
  private readonly AI_CIRCUIT_TTL = 30; // seconds

  // --- Background AI predictions cache --------------------------------
  // The dashboard's AI-derived alert level NEVER calls the AI service
  // inline anymore. A background job refreshes this Redis map on a
  // fixed interval; the request path only ever reads it. This is what
  // decouples "dashboard load time" from "AI service availability/speed".
  private readonly AI_PREDICTIONS_CACHE_KEY = 'ai:predictions:sla:map';
  private readonly AI_PREDICTIONS_REFRESH_MS = 60_000; // background refresh cadence
  private readonly AI_PREDICTIONS_CACHE_TTL = 90; // seconds — > refresh interval so a slow tick doesn't blank the cache
  private aiRefreshInFlight = false;

  constructor(
    private prisma: PrismaService,
    private readonly outlook: OutlookService,
    private readonly enhancedAlerts: EnhancedAlertsService,
    public readonly escalationEngine: EscalationEngineService,
    public readonly multiChannelNotifications: MultiChannelNotificationsService,
    public readonly alertAnalytics: AlertAnalyticsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * IMPORTANT: this deliberately does NOT await the first AI refresh.
   * Nest awaits every module's onModuleInit before the app starts
   * listening — if we awaited an AI call here, a slow/down AI service
   * would delay server boot itself, not just the dashboard. Firing it
   * without awaiting means boot proceeds immediately; the cache just
   * fills in a few seconds later, in the background.
   */
  onModuleInit() {
    setTimeout(() => {
      this.refreshAiPredictionsCache().catch(err =>
        this.logger.warn(`Initial AI predictions warm-up failed: ${err.message}`)
      );
    }, 5000); // small delay to let DB pool / AI service finish their own startup
  }

  /**
   * Background job: recompute AI SLA predictions for active bordereaux
   * and cache them as a { [bordereauId]: prediction } map in Redis.
   * Runs on a fixed interval, completely independent of any HTTP request.
   * Never throws — a failed tick just leaves the previous cache in place
   * (or lets it expire) rather than breaking anything downstream.
   */
  @Interval(60_000)
  private async refreshAiPredictionsCache(): Promise<void> {
    if (this.aiRefreshInFlight) return; // don't overlap ticks if a previous run is still going
    this.aiRefreshInFlight = true;

    try {
      // Same "active" filter as the dashboard uses, so we only ever
      // request predictions for bordereaux that could actually show up
      // as an alert — no wasted AI calls on closed/paid items.
      const bordereaux = await this.prisma.bordereau.findMany({
        where: { statut: { notIn: ['CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'] } },
        select: {
          id: true,
          statut: true,
          dateReception: true,
          createdAt: true,
          delaiReglement: true,
          courriers: { select: { id: true } },
          virement: { select: { id: true } },
          contract: { select: { delaiReglement: true } },
          client: { select: { reglementDelay: true } },
        },
      });

      if (bordereaux.length === 0) {
        await this.redis.set(this.AI_PREDICTIONS_CACHE_KEY, {}, this.AI_PREDICTIONS_CACHE_TTL);
        return;
      }

      const aiItems = bordereaux.map(b => ({
        id: b.id,
        start_date: b.dateReception || b.createdAt,
        deadline: this.calculateDeadline(b),
        current_progress: this.calculateProgress(b),
        total_required: this.calculateTotalRequired(b),
        sla_days: this.getSlaThreshold(b),
        complexity: this.calculateComplexity(b),
        client_priority: this.getClientPriority(b),
      }));

      const aiResponse = await this.getSlaPredictionAI(aiItems);
      const predictions: any[] = aiResponse?.sla_predictions || [];

      // FIX: the AI microservice returns `bordereau_id`, not `id`.
      // The old inline matching used `p.id`, which never matched anything.
      const predictionsMap: Record<string, any> = {};
      for (const p of predictions) {
        const key = p.bordereau_id ?? p.id; // tolerate either shape defensively
        if (key) predictionsMap[key] = p;
      }

      await this.redis.set(this.AI_PREDICTIONS_CACHE_KEY, predictionsMap, this.AI_PREDICTIONS_CACHE_TTL);
      this.logger.debug(`AI predictions cache refreshed: ${Object.keys(predictionsMap).length}/${bordereaux.length} bordereaux matched`);
    } catch (error: any) {
      // Background failure — log and move on. The existing cache (if any)
      // simply ages out after AI_PREDICTIONS_CACHE_TTL, at which point the
      // dashboard falls back to defaults rather than ever blocking.
      this.logger.warn(`Background AI predictions refresh failed: ${error.message}`);
    } finally {
      this.aiRefreshInFlight = false;
    }
  }

  // ---------------------------------------------------------------------
  // Generic cache-aside helper
  // ---------------------------------------------------------------------
  private async cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
    const result = await compute();
    await this.redis.set(key, result, ttlSeconds);
    return result;
  }

  // ---------------------------------------------------------------------
  // AI service access — token cache + circuit breaker.
  // Only ever called from the background refresh job (and from
  // getDelayPredictions, which is its own separately-cached, explicitly
  // user-triggered forecast feature) — never from the dashboard hot path.
  // ---------------------------------------------------------------------

  private async isAiCircuitOpen(): Promise<boolean> {
    const open = await this.redis.get<boolean>(this.AI_CIRCUIT_KEY);
    return open === true;
  }

  private async tripAiCircuit(): Promise<void> {
    await this.redis.set(this.AI_CIRCUIT_KEY, true, this.AI_CIRCUIT_TTL);
  }

  private async callAiService<T>(fn: () => Promise<T>): Promise<T> {
    if (await this.isAiCircuitOpen()) {
      throw new Error('AI microservice circuit breaker open - skipping call');
    }
    try {
      return await fn();
    } catch (error) {
      await this.tripAiCircuit();
      throw error;
    }
  }

  private async getAIServiceToken(): Promise<string> {
    const cachedToken = await this.redis.get<string>(this.AI_TOKEN_CACHE_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    const username = process.env.AI_SERVICE_USER || 'admin';
    const password = process.env.AI_SERVICE_PASSWORD || 'secret';

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const token = response.data.access_token;
    await this.redis.set(this.AI_TOKEN_CACHE_KEY, token, this.AI_TOKEN_TTL);
    return token;
  }

  /**
   * AI-powered SLA prediction with authentication.
   * No fallback — throws if the AI service is unavailable. Only called
   * from refreshAiPredictionsCache() (background) — never inline in a
   * user request.
   */
  async getSlaPredictionAI(items: any[]) {
    return this.callAiService(async () => {
      const token = await this.getAIServiceToken();

      const response = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, items, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      return response.data;
    });
  }

  // Allow all authenticated users to access dashboard alerts
  private checkAlertsRole(user: any) {
    return; // Currently allows all authenticated users
  }

  /**
   * Pure computation for the alerts dashboard (DB fetch + Redis-cached AI
   * prediction lookup + alert level assignment). No network calls to the
   * AI service happen here — predictions come from the background-refreshed
   * Redis map only, so this is fast regardless of AI service health.
   */
  private async computeAlertsDashboard(query: AlertsQueryDto, user: any) {
    const where: any = {};
    if (query.teamId) where.teamId = query.teamId;
    if (query.userId) where.currentHandlerId = query.userId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    // Role-based filtering
    if (user.role === 'GESTIONNAIRE') {
      where.currentHandlerId = user.id;
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      where.contract = {
        teamLeaderId: user.id
      };
    }

    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        courriers: true,
        virement: true,
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            status: true
          }
        },
        contract: {
          include: {
            teamLeader: {
              select: { id: true, fullName: true, role: true }
            },
            client: {
              select: { id: true, name: true }
            }
          }
        },
        client: {
          select: { id: true, name: true }
        },
        currentHandler: {
          select: {
            id: true,
            fullName: true,
            role: true,
            teamLeaderId: true
          }
        },
        team: true,
        chargeCompte: true,
        AlertLog: {
          where: { resolved: false },
          select: { id: true, resolved: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Read AI predictions from the background-refreshed cache — no network
    // call, no timeout risk, no dependency on AI service health.
    const predictionsMap = (await this.redis.get<Record<string, any>>(this.AI_PREDICTIONS_CACHE_KEY)) || {};

    // Generate alerts with AI-enhanced color coding
    let missingPredictionCount = 0;

    const alerts = bordereaux
      .filter(b => !['CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'].includes(b.statut))
      .filter(b => {
        if (!b.AlertLog || b.AlertLog.length === 0) return true;
        return b.AlertLog.some(log => !log.resolved);
      })
      .map(b => {
        const aiPrediction = predictionsMap[b.id];
        const daysSinceReception = b.dateReception ?
          (Date.now() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24) : 0;

        let level: 'green' | 'orange' | 'red' = 'green';
        let reason = 'On time';
        let aiScore = 0;

        if (aiPrediction) {
          level = aiPrediction.risk === '🔴' ? 'red' : aiPrediction.risk === '🟠' ? 'orange' : 'green';
          aiScore = aiPrediction.score;
          reason = aiPrediction.explanation || this.generateReasonFromScore(aiScore, daysSinceReception);
        } else {
          // AI is the sole source of truth for alert level — no local
          // recomputation. Without a cached prediction (still warming up,
          // or bordereau created since the last refresh tick) we simply
          // stay at the default (green) rather than fabricating a level.
          missingPredictionCount++;
        }

        let assignedToName = 'Non assigné';
        if (b.currentHandler) {
          assignedToName = b.currentHandler.fullName;
        } else if (b.chargeCompte) {
          assignedToName = b.chargeCompte.fullName;
        }

        let slaInfo: any = {
          threshold: this.getSlaThreshold(b),
          daysSince: Math.round(daysSinceReception),
          phase: 'GESTIONNAIRE'
        };

        if (b.statut === 'TRAITE' || b.statut === 'PRET_VIREMENT') {
          const dateTraite = b.dateReceptionSante || b.updatedAt;
          const daysSinceTraite = dateTraite ?
            (Date.now() - new Date(dateTraite).getTime()) / (1000 * 60 * 60 * 24) : 0;

          slaInfo = {
            threshold: 3,
            daysSince: Math.round(daysSinceTraite),
            phase: 'FINANCE',
            gestionnaireSla: {
              threshold: this.getSlaThreshold(b),
              daysSince: Math.round(daysSinceReception),
              completed: true
            }
          };
        }

        return {
          bordereau: {
            ...b,
            teamName: b.team?.fullName || 'Non assigné',
            assignedToName,
            currentHandler: b.currentHandler,
            contract: b.contract
          },
          alertLevel: level,
          reason,
          slaThreshold: slaInfo.threshold,
          daysSinceReception: slaInfo.daysSince,
          slaPhase: slaInfo.phase,
          slaInfo: slaInfo,
          aiScore,
          aiPrediction: aiPrediction || null
        };
      });

    if (missingPredictionCount > 0) {
      this.logger.debug(`${missingPredictionCount}/${bordereaux.length} bordereaux had no cached AI prediction this request`);
    }

    return alerts;
  }

  /**
   * Real-time and AI-powered alerts dashboard with dynamic color coding.
   * Pure computation (DB + Redis-cached AI lookup) is cached for 30s;
   * escalations still run on every call so critical alerts are never
   * delayed by the cache.
   */
  async getAlertsDashboard(query: AlertsQueryDto, user: any) {
    this.checkAlertsRole(user);

    const cacheKey = `alerts:dashboard:${user.id}:${user.role}:${JSON.stringify(query)}`;
    const alerts = await this.cached(cacheKey, 30, () => this.computeAlertsDashboard(query, user));

    await this.processAlertEscalations(alerts);

    return alerts.filter(a => a.alertLevel === 'red' || a.alertLevel === 'orange');
  }

  private calculateDeadline(bordereau: any): string {
    const startDate = new Date(bordereau.dateReception || bordereau.createdAt);
    const slaThreshold = this.getSlaThreshold(bordereau);
    const deadline = new Date(startDate.getTime() + slaThreshold * 24 * 60 * 60 * 1000);
    return deadline.toISOString();
  }

  private calculateProgress(bordereau: any): number {
    const statusProgress = {
      'RECU': 0.1,
      'SCANNE': 0.3,
      'EN_COURS': 0.6,
      'TRAITE': 0.9,
      'CLOTURE': 1.0
    };
    return statusProgress[bordereau.statut] || 0;
  }

  private calculateTotalRequired(bordereau: any): number {
    return bordereau.courriers?.length || 1;
  }

  private getSlaThreshold(bordereau: any): number {
    if (bordereau.contract?.delaiReglement) return bordereau.contract.delaiReglement;
    if (bordereau.client?.reglementDelay) return bordereau.client.reglementDelay;
    if (bordereau.delaiReglement) return bordereau.delaiReglement;
    return 30;
  }

  private calculateComplexity(bordereau: any): number {
    let complexity = 1;
    if (bordereau.courriers?.length > 10) complexity += 0.5;
    if (bordereau.virement) complexity += 0.3;
    return Math.min(complexity, 3);
  }

  private getClientPriority(bordereau: any): number {
    return bordereau.client?.priority || 1;
  }

  private generateReasonFromScore(score: number, daysSince: number): string {
    if (score > 0.8) return `Risque critique - ${Math.round(daysSince)} jours écoulés`;
    if (score > 0.5) return `Attention requise - ${Math.round(daysSince)} jours écoulés`;
    return `Traitement normal - ${Math.round(daysSince)} jours écoulés`;
  }

  private async processAlertEscalations(alerts: any[]) {
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'red');

    for (const alert of criticalAlerts) {
      try {
        await this.escalationEngine.processAlert(alert.bordereau.id, {
          type: 'SLA_BREACH',
          severity: 'high',
          bordereauId: alert.bordereau.id,
          delayHours: alert.daysSinceReception * 24,
          clientId: alert.bordereau.clientId
        });
      } catch (error) {
        this.logger.error(`Failed to process escalation for ${alert.bordereau.id}:`, error);
      }
    }
  }

  async getTeamOverloadAlerts(user: any) {
    this.checkAlertsRole(user);

    return this.cached('alerts:team-overload', 30, async () => {
      const now = new Date();

      const chefEquipes = await this.prisma.user.findMany({
        where: {
          role: 'CHEF_EQUIPE',
          active: true
        },
        include: {
          teamMembers: {
            where: { active: true },
            include: {
              assignedDocuments: {
                include: {
                  bordereau: {
                    select: {
                      dateReception: true,
                      delaiReglement: true,
                      contract: {
                        select: { delaiReglement: true }
                      }
                    }
                  }
                }
              }
            }
          },
          assignedDocuments: {
            include: {
              bordereau: {
                select: {
                  dateReception: true,
                  delaiReglement: true,
                  contract: {
                    select: { delaiReglement: true }
                  }
                }
              }
            }
          }
        }
      });

      const individualTeams = await this.prisma.user.findMany({
        where: {
          role: { in: ['GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'] },
          active: true
        },
        include: {
          assignedDocuments: {
            include: {
              bordereau: {
                select: {
                  dateReception: true,
                  delaiReglement: true,
                  contract: {
                    select: { delaiReglement: true }
                  }
                }
              }
            }
          },
          contractsAsTeamLeader: {
            include: {
              bordereaux: {
                where: { archived: false },
                include: {
                  documents: true,
                  contract: true
                }
              }
            }
          }
        }
      });

      const overloads: any[] = [];

      const calculateTimeBasedUtilization = (documents: any[], capacity: number) => {
        let totalRequiredPerDay = 0;

        for (const doc of documents) {
          const bordereau = doc.bordereau || doc;
          const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
          const dateReception = bordereau?.dateReception || now;

          const deadlineDate = new Date(dateReception);
          deadlineDate.setDate(deadlineDate.getDate() + delaiReglement);

          const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          totalRequiredPerDay += 1 / remainingDays;
        }

        const utilizationRate = capacity > 0 ? Math.round((totalRequiredPerDay / capacity) * 100) : 0;
        return { utilizationRate, requiredPerDay: totalRequiredPerDay };
      };

      for (const chef of chefEquipes) {
        const teamMembers = chef.teamMembers || [];
        const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(m => m.assignedDocuments)];
        const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);

        const { utilizationRate } = calculateTimeBasedUtilization(allDocs, totalCapacity);
        const teamSize = teamMembers.length + 1;

        if (utilizationRate >= 90) {
          overloads.push({
            team: { id: chef.id, fullName: chef.fullName, email: chef.email, role: chef.role, createdAt: chef.createdAt, password: '' },
            count: allDocs.length,
            alert: 'red',
            reason: `Surcharge critique: ${allDocs.length} docs / ${totalCapacity} capacité (${teamSize} membres) - ${utilizationRate}%`
          });
        } else if (utilizationRate >= 70) {
          overloads.push({
            team: { id: chef.id, fullName: chef.fullName, email: chef.email, role: chef.role, createdAt: chef.createdAt, password: '' },
            count: allDocs.length,
            alert: 'orange',
            reason: `Charge élevée: ${allDocs.length} docs / ${totalCapacity} capacité (${teamSize} membres) - ${utilizationRate}%`
          });
        }
      }

      for (const user of individualTeams) {
        let allDocs = user.assignedDocuments;

        if (user.role === 'GESTIONNAIRE_SENIOR' && user.contractsAsTeamLeader) {
          allDocs = user.contractsAsTeamLeader.flatMap(contract =>
            contract.bordereaux.flatMap(bordereau =>
              bordereau.documents.map(doc => ({ ...doc, bordereau }))
            )
          );
        }

        const { utilizationRate } = calculateTimeBasedUtilization(allDocs, user.capacity);

        if (utilizationRate >= 90) {
          overloads.push({
            team: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, createdAt: user.createdAt, password: '' },
            count: allDocs.length,
            alert: 'red',
            reason: `${user.fullName} surchargé - ${allDocs.length} docs (${utilizationRate}% time-based)`
          });
        } else if (utilizationRate >= 70) {
          overloads.push({
            team: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, createdAt: user.createdAt, password: '' },
            count: allDocs.length,
            alert: 'orange',
            reason: `${user.fullName} charge élevée - ${allDocs.length} docs (${utilizationRate}% time-based)`
          });
        }
      }

      return overloads;
    });
  }

  async getReclamationAlerts(user: any) {
    this.checkAlertsRole(user);

    return this.cached('alerts:reclamations', 30, async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const reclamations = await this.prisma.reclamation.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ['SENT', 'DRAFT', 'PENDING'] }
        },
        include: {
          client: true,
          bordereau: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      return reclamations.map(r => ({
        reclamation: r,
        alert: r.severity === 'HIGH' ? 'red' : 'orange',
        reason: `Réclamation du ${new Date(r.createdAt).toLocaleDateString('fr-FR')}`,
        status: r.status,
      }));
    });
  }

  /**
   * AI-powered delay prediction and smart recommendations.
   * NOTE: No fallback — throws if the AI service is unavailable. This is
   * a separate, explicitly user-triggered forecast feature (not part of
   * dashboard initial load), so an inline AI call here is acceptable —
   * it's already isolated behind its own 300s cache.
   */
  async getDelayPredictions(user: any) {
    this.checkAlertsRole(user);

    return this.cached('alerts:delay-predictions', 300, async () => {
      const historicalData = await this.prisma.bordereau.findMany({
        include: { client: true, contract: true },
        orderBy: { createdAt: 'asc' }
      });

      const dailyCounts = historicalData.reduce((acc, b) => {
        const date = b.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sortedDates = Object.keys(dailyCounts).sort();
      if (sortedDates.length > 0) {
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (!dailyCounts[dateStr]) {
            dailyCounts[dateStr] = 0;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      const trendData = Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date,
          value: count
        }));

      let forecast: any = {};
      let recommendationsResponse: any = { data: { decisions: [] } };

      try {
        await this.callAiService(async () => {
          const token = await this.getAIServiceToken();

          const forecastResponse = await axios.post(`${AI_MICROSERVICE_URL}/forecast_trends`, trendData, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 20000
          });
          forecast = forecastResponse.data;

          const workload = await this.getCurrentWorkload();
          const capacity = await this.getTeamCapacity();

          recommendationsResponse = await axios.post(`${AI_MICROSERVICE_URL}/automated_decisions`, {
            context: { workload, capacity, historical_data: trendData },
            decision_type: 'resource_allocation'
          }, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 20000
          });
        });
      } catch (aiError: any) {
        this.logger.error('AI service unavailable:', aiError.message);
        throw new Error(`AI microservice unavailable: ${aiError.message}`);
      }

      const dataQuality = Math.min(1.0, trendData.length / 30);
      const modelConfidence = forecast.model_performance?.trend_strength || 0.5;
      const recencyBoost = trendData.length >= 14 ? 0.1 : 0;
      const finalConfidence = Math.min(0.95, (dataQuality * 0.4 + modelConfidence * 0.6) + recencyBoost);

      const weeklyPrediction = this.calculateWeeklyPrediction(forecast.forecast || []);

      const insights = await this.generatePredictionInsights(
        weeklyPrediction,
        forecast.trend_direction,
        trendData,
        finalConfidence
      );

      return {
        forecast: forecast.forecast || [],
        trend_direction: forecast.trend_direction || 'stable',
        recommendations: recommendationsResponse.data.decisions || [],
        ai_confidence: finalConfidence,
        next_week_prediction: weeklyPrediction,
        insights: insights,
        data_points_analyzed: trendData.length,
        forecast_reliability: this.assessForecastReliability(forecast.forecast || [], trendData)
      };
    });
  }

  private calculateProcessingTime(bordereau: any): number {
    if (bordereau.statut === 'CLOTURE' && bordereau.dateReception) {
      return (new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24);
    }
    return 0;
  }

  private async getCurrentWorkload(): Promise<any> {
    const openBordereaux = await this.prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE'] } }
    });
    return { total_open: openBordereaux };
  }

  private async getTeamCapacity(): Promise<any> {
    const teams = await this.prisma.user.findMany({
      where: { role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] } },
      select: { capacity: true }
    });
    const totalCapacity = teams.reduce((sum, t) => sum + (t.capacity || 0), 0);
    return { total_capacity: totalCapacity };
  }

  private calculateWeeklyPrediction(forecast: any[]): number {
    if (!forecast || forecast.length === 0) return 0;

    const avgDaily = forecast.reduce((sum, f) => {
      const predicted = f.predicted_value || 0;
      const upper = f.upper_bound || 0;
      const estimate = Math.max(predicted, upper * 0.7 + predicted * 0.3);
      return sum + estimate;
    }, 0) / forecast.length;

    const weeklyPrediction = Math.round(avgDaily * 7);

    return Math.max(0, weeklyPrediction);
  }

  private async generatePredictionInsights(weeklyPrediction: number, trendDirection: string, historicalData: any[], confidence: number): Promise<Array<{type: string; icon: string; message: string; action: string; priority: string}>> {
    const insights: Array<{type: string; icon: string; message: string; action: string; priority: string}> = [];
    const avgHistorical = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const dailyAvg = weeklyPrediction / 7;
    const percentChange = ((dailyAvg - avgHistorical) / avgHistorical) * 100;

    const teams = await this.prisma.user.findMany({
      where: { role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] } },
      select: { capacity: true, role: true, id: true }
    });
    const totalCapacity = teams.reduce((sum, t) => sum + (t.capacity || 0), 0);
    const gestionnaireCount = teams.filter(t => t.role === 'GESTIONNAIRE').length;

    const activeWorkload = await this.prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE', 'PAYE'] } }
    });

    const currentUtilization = totalCapacity > 0 ? (activeWorkload / totalCapacity) * 100 : 0;

    const avgProcessingPerPerson = totalCapacity > 0 && gestionnaireCount > 0 ? (avgHistorical * 7) / gestionnaireCount : 10;
    const requiredStaff = Math.ceil(weeklyPrediction / avgProcessingPerPerson);
    const staffGap = requiredStaff - gestionnaireCount;

    if (percentChange > 50) {
      const extraBordereaux = Math.round(weeklyPrediction - avgHistorical * 7);
      const hoursNeeded = Math.round(extraBordereaux * 2);
      insights.push({
        type: 'critical',
        icon: '🚨',
        message: `Surcharge critique: +${Math.round(percentChange)}% (${Math.round(weeklyPrediction)} bordereaux prévus vs ${Math.round(avgHistorical * 7)} habituels)`,
        action: staffGap > 0
          ? `ACTION URGENTE: Recruter ${staffGap} gestionnaire(s) OU mobiliser ${Math.ceil(hoursNeeded / 40)} ressources temporaires (${hoursNeeded}h nécessaires)`
          : `PLAN D'URGENCE: Activer heures supplémentaires (${hoursNeeded}h), prioriser dossiers critiques, reporter tâches non-urgentes`,
        priority: 'high'
      });
    } else if (percentChange > 20) {
      const extraBordereaux = Math.round(weeklyPrediction - avgHistorical * 7);
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `Charge élevée: +${Math.round(percentChange)}% (${Math.round(dailyAvg)} bordereaux/jour vs ${Math.round(avgHistorical)} habituels)`,
        action: staffGap > 0
          ? `RECOMMANDATION: Prévoir ${staffGap} ressource(s) temporaire(s) OU réduire congés planifiés pour absorber ${extraBordereaux} dossiers supplémentaires`
          : `OPTIMISATION: Automatiser tâches répétitives, réduire réunions non-essentielles, focus sur productivité`,
        priority: 'medium'
      });
    } else if (percentChange < -20) {
      const savedHours = Math.round((avgHistorical * 7 - weeklyPrediction) * 2);
      insights.push({
        type: 'info',
        icon: '💡',
        message: `Charge réduite: ${Math.round(Math.abs(percentChange))}% (${Math.round(weeklyPrediction)} bordereaux vs ${Math.round(avgHistorical * 7)} habituels)`,
        action: `OPPORTUNITÉ: Utiliser ${savedHours}h libérées pour formation équipe, audit qualité, amélioration processus, ou maintenance système`,
        priority: 'low'
      });
    } else {
      insights.push({
        type: 'success',
        icon: '✅',
        message: `Charge stable: ${Math.round(weeklyPrediction)} bordereaux prévus (variation: ${Math.round(Math.abs(percentChange))}%)`,
        action: `MAINTIEN: Équipe actuelle (${gestionnaireCount} gestionnaires, capacité ${totalCapacity}) adaptée. Continuer surveillance quotidienne`,
        priority: 'low'
      });
    }

    if (currentUtilization > 90) {
      insights.push({
        type: 'critical',
        icon: '🔴',
        message: `Capacité saturée: ${Math.round(currentUtilization)}% (${activeWorkload}/${totalCapacity} dossiers actifs)`,
        action: `CRITIQUE: Système proche de la saturation. Augmenter capacité de ${Math.ceil((weeklyPrediction - totalCapacity) / 10)} gestionnaires OU clôturer ${activeWorkload - Math.floor(totalCapacity * 0.8)} dossiers en urgence`,
        priority: 'high'
      });
    } else if (currentUtilization > 75) {
      insights.push({
        type: 'warning',
        icon: '🟠',
        message: `Capacité élevée: ${Math.round(currentUtilization)}% (${activeWorkload}/${totalCapacity} dossiers actifs)`,
        action: `ATTENTION: Préparer plan de contingence. Capacité disponible: ${totalCapacity - activeWorkload} dossiers. Anticiper renforcement si tendance continue`,
        priority: 'medium'
      });
    } else if (currentUtilization < 50) {
      const availableCapacity = totalCapacity - activeWorkload;
      insights.push({
        type: 'info',
        icon: '🟢',
        message: `Capacité disponible: ${Math.round(currentUtilization)}% (${activeWorkload}/${totalCapacity} dossiers actifs)`,
        action: `OPPORTUNITÉ: ${availableCapacity} dossiers de capacité libre. Accepter nouveaux clients OU accélérer traitement dossiers en attente`,
        priority: 'low'
      });
    }

    if (trendDirection === 'increasing') {
      const projectedIncrease = Math.round(weeklyPrediction * 0.15);
      const weeksUntilCapacity = totalCapacity > 0 ? Math.floor((totalCapacity - activeWorkload) / (weeklyPrediction / 4)) : 0;
      insights.push({
        type: 'warning',
        icon: '📈',
        message: `Tendance croissante: +${projectedIncrease} bordereaux prévus dans 2 semaines (analyse sur ${historicalData.length} jours)`,
        action: weeksUntilCapacity > 0 && weeksUntilCapacity < 4
          ? `URGENT: Capacité saturée dans ${weeksUntilCapacity} semaine(s). Lancer recrutement MAINTENANT ou refuser nouveaux contrats`
          : `PLANIFICATION: Préparer scaling (recrutement, formation, processus). Budget: ${Math.ceil(projectedIncrease / 50)} gestionnaires supplémentaires`,
        priority: 'high'
      });
    } else if (trendDirection === 'decreasing') {
      const projectedDecrease = Math.round(weeklyPrediction * 0.15);
      insights.push({
        type: 'info',
        icon: '📉',
        message: `Tendance décroissante: -${projectedDecrease} bordereaux prévus dans 2 semaines`,
        action: `OPTIMISATION: Période calme idéale pour audit qualité (${Math.round(projectedDecrease * 0.5)}h disponibles), formation équipe, refonte processus inefficaces`,
        priority: 'low'
      });
    } else {
      insights.push({
        type: 'info',
        icon: '➡️',
        message: `Tendance stable: variation <5% sur ${historicalData.length} jours`,
        action: `MAINTIEN: Processus actuels efficaces. Surveillance quotidienne + revue hebdomadaire des KPIs. Pas d'action immédiate requise`,
        priority: 'low'
      });
    }

    if (confidence < 0.6) {
      const daysNeeded = Math.max(0, 30 - historicalData.length);
      insights.push({
        type: 'warning',
        icon: '⚡',
        message: `Fiabilité limitée: ${historicalData.length} jours de données (${Math.round(confidence * 100)}% confiance)`,
        action: daysNeeded > 0
          ? `AMÉLIORATION: Collecter ${daysNeeded} jours supplémentaires (ETA: ${Math.ceil(daysNeeded / 7)} semaines). En attendant: valider prévisions manuellement + marge sécurité +20%`
          : `QUALITÉ DONNÉES: Vérifier cohérence saisies, éliminer anomalies, augmenter fréquence mise à jour (quotidienne recommandée)`,
        priority: 'medium'
      });
    } else if (confidence > 0.8) {
      const nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
      insights.push({
        type: 'success',
        icon: '🎯',
        message: `Haute fiabilité: ${historicalData.length} jours de données (${Math.round(confidence * 100)}% confiance)`,
        action: `PLANIFICATION STRATÉGIQUE: Prévisions fiables pour budgets, recrutement, contrats clients. Prochaine revue: ${nextReviewDate}`,
        priority: 'low'
      });
    } else {
      insights.push({
        type: 'info',
        icon: '📊',
        message: `Fiabilité moyenne: ${historicalData.length} jours de données (${Math.round(confidence * 100)}% confiance)`,
        action: `AMÉLIORATION CONTINUE: Prévisions utilisables avec marge prudence ±15%. Continuer collecte données pour précision accrue`,
        priority: 'low'
      });
    }

    return insights;
  }

  private assessForecastReliability(forecast: any[], historicalData: any[]) {
    const dataPoints = historicalData.length;
    const forecastVariance = forecast.length > 0
      ? forecast.reduce((sum, f) => sum + (f.upper_bound - f.lower_bound), 0) / forecast.length
      : 0;

    let reliability = 'medium';
    let score = 0.5;

    if (dataPoints >= 30 && forecastVariance < 10) {
      reliability = 'high';
      score = 0.85;
    } else if (dataPoints < 14 || forecastVariance > 20) {
      reliability = 'low';
      score = 0.35;
    }

    return {
      level: reliability,
      score: score,
      reason: dataPoints < 14
        ? 'Données historiques insuffisantes'
        : forecastVariance > 20
        ? 'Forte variabilité dans les prévisions'
        : 'Prévisions basées sur données solides'
    };
  }

  async notify(role: string, message: string, alert: any = {}) {
    const users = await this.prisma.user.findMany({ where: { role } });
    for (const user of users) {
      if (user.email) {
        try {
          await this.outlook.sendMail(
            user.email,
            '[ALERT] Notification',
            message + '\n' + JSON.stringify(alert, null, 2)
          );
        } catch (err) {
          console.error(`[ALERT][EMAIL] Failed to send to ${user.email}:`, err);
        }
      }
    }

    const existingAlert = await this.prisma.alertLog.findFirst({
      where: {
        bordereauId: alert.bordereau?.id || alert.bordereauId || null,
        alertType: alert.type || 'GENERIC',
        resolved: false,
        message
      }
    });

    if (!existingAlert) {
      await this.prisma.alertLog.create({
        data: {
          bordereauId: alert.bordereau?.id || alert.bordereauId || null,
          documentId: alert.documentId || null,
          userId: alert.userId || null,
          alertType: alert.type || 'GENERIC',
          alertLevel: alert.alertLevel || alert.level || 'info',
          message,
          notifiedRoles: [role],
        },
      });
    }
    return { role, message, sent: true };
  }

  async notifyRole(role: string, alert: any) {
    let message = '';
    if (alert.reason) {
      message = `[${alert.alertLevel?.toUpperCase() || alert.alert?.toUpperCase() || 'ALERT'}] ${alert.reason}`;
    } else {
      message = '[ALERT] Please check dashboard for details.';
    }
    await this.notify(role, message, alert);
  }

  async getAlertHistory(query: any, user: any) {
    this.checkAlertsRole(user);

    const where: any = {};

    if (query.resolved !== undefined) {
      where.resolved = query.resolved === 'true' || query.resolved === true;
    } else {
      where.resolved = false;
    }

    if (query.bordereauId) where.bordereauId = query.bordereauId;
    if (query.alertLevel) where.alertLevel = query.alertLevel;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const alerts = await this.prisma.alertLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        },
        document: true,
        user: true
      },
    });

    const filteredAlerts = alerts.filter(alert => {
      if (user.role === 'SUPER_ADMIN') return true;
      if (!alert.bordereau) return false;

      if (user.role === 'GESTIONNAIRE') {
        return alert.bordereau.currentHandlerId === user.id;
      }

      if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
        return alert.bordereau.contract?.teamLeaderId === user.id;
      }

      return false;
    });

    const uniqueAlerts = new Map();
    filteredAlerts.forEach(alert => {
      const bordereauId = alert.bordereauId;
      if (!uniqueAlerts.has(bordereauId) ||
          new Date(alert.createdAt) > new Date(uniqueAlerts.get(bordereauId).createdAt)) {
        uniqueAlerts.set(bordereauId, alert);
      }
    });
    const deduplicatedAlerts = Array.from(uniqueAlerts.values());

    const now = new Date();

    return deduplicatedAlerts.map(alert => {
      let resolutionTime: number | null = null;
      if (alert.resolved && alert.resolvedAt) {
        const startTime = alert.bordereau?.dateReception
          ? new Date(alert.bordereau.dateReception).getTime()
          : new Date(alert.createdAt).getTime();
        const endTime = new Date(alert.resolvedAt).getTime();
        const hours = Math.round((endTime - startTime) / (1000 * 60 * 60));
        resolutionTime = hours > 0 ? hours : null;
      }

      let calculatedAlertLevel = alert.alertLevel;
      let daysSinceReception = 0;
      let slaThreshold = 30;
      let percentElapsed = 0;

      if (alert.bordereau && alert.bordereau.dateReception) {
        daysSinceReception = Math.round(
          (now.getTime() - new Date(alert.bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        slaThreshold = this.getSlaThreshold(alert.bordereau);
        percentElapsed = (daysSinceReception / slaThreshold) * 100;

        if (alert.bordereau.statut !== 'CLOTURE') {
          if (percentElapsed > 100) {
            calculatedAlertLevel = 'red';
          } else if (percentElapsed > 80) {
            calculatedAlertLevel = 'orange';
          } else {
            calculatedAlertLevel = 'green';
          }
        }
      }

      return {
        ...alert,
        alertLevel: calculatedAlertLevel,
        clientName: alert.bordereau?.client?.name || null,
        bordereauReference: alert.bordereau?.reference || null,
        resolvedBy: alert.user?.fullName || (alert.userId ? 'Utilisateur' : null),
        resolutionTime,
        daysSinceReception,
        slaThreshold,
        percentElapsed: Math.round(percentElapsed)
      };
    });
  }

  async resolveAlert(bordereauId: string, user: any, actionTaken?: string) {
    this.checkAlertsRole(user);

    const now = new Date();

    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      select: { id: true, reference: true, statut: true }
    });

    if (!bordereau) {
      throw new Error(`Bordereau ${bordereauId} not found`);
    }

    const updatedAlerts = await this.prisma.alertLog.updateMany({
      where: {
        bordereauId: bordereauId,
        resolved: false
      },
      data: {
        resolved: true,
        resolvedAt: now,
        userId: user.id,
        ...(actionTaken && {
          message: `[RESOLVED] ${actionTaken}`
        })
      }
    });

    this.logger.log(`✅ Alert resolved for bordereau ${bordereau.reference} by ${user.fullName || user.email}. Action: ${actionTaken || 'Not specified'}. Alerts updated: ${updatedAlerts.count}`);

    await this.redis.invalidatePrefix('alerts:dashboard:');

    return {
      success: true,
      bordereau: bordereau,
      alertsResolved: updatedAlerts.count,
      resolvedBy: user.fullName || user.email,
      actionTaken: actionTaken || 'Alert acknowledged',
      message: `Alert resolved. Bordereau status remains ${bordereau.statut}. Closure must be done through Finance workflow.`
    };
  }

  async getPriorityList(user: any) {
    this.checkAlertsRole(user);
    const alerts = await this.getAlertsDashboard({}, user);
    return alerts;
  }

  async getComparativeAnalytics(user: any) {
    this.checkAlertsRole(user);

    return this.cached('alerts:comparative', 30, async () => {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const actualProcessed = await this.prisma.bordereau.count({
        where: {
          statut: 'CLOTURE',
          updatedAt: { gte: last7Days }
        }
      });

      const data = await this.getDelayPredictions(user);
      const planned = Math.max(1, data.next_week_prediction || actualProcessed || 1);
      const actual = actualProcessed;

      return {
        planned,
        actual,
        gap: actual - planned,
      };
    });
  }

  async getFinanceAlerts(user: any) {
    this.checkAlertsRole(user);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const overdueVirements = await this.prisma.bordereau.findMany({
      where: {
        virement: {
          createdAt: { lte: twentyFourHoursAgo }
        }
      },
      include: {
        virement: true,
        client: true
      }
    });

    const alerts: any[] = [];
    for (const bordereau of overdueVirements) {
      const hoursOverdue = Math.floor(
        (Date.now() - bordereau.virement!.createdAt.getTime()) / (1000 * 60 * 60)
      );

      alerts.push({
        bordereau,
        alertLevel: 'red' as const,
        reason: `OV non traité depuis ${hoursOverdue}h`,
        alertType: 'OV_NOT_PROCESSED_24H',
        hoursOverdue
      });

      await this.notifyRole('FINANCE', {
        bordereau,
        alertLevel: 'red',
        reason: `OV non traité depuis ${hoursOverdue}h`,
        hoursOverdue
      });
    }

    return alerts;
  }

  async getAlertsKPI(user: any) {
    this.checkAlertsRole(user);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const whereClause: any = {};

    if (user.role === 'GESTIONNAIRE') {
      whereClause.userId = user.id;
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      const teamMembers = await this.prisma.user.findMany({
        where: {
          teamLeaderId: user.id,
          role: 'GESTIONNAIRE'
        },
        select: { id: true }
      });
      whereClause.userId = { in: [user.id, ...teamMembers.map(m => m.id)] };
    }

    const dashboardAlerts = await this.getAlertsDashboard({}, user);
    const totalAlerts = dashboardAlerts.length;
    const criticalAlerts = dashboardAlerts.filter(a => a.alertLevel === 'red').length;

    const resolvedToday = await this.prisma.alertLog.count({
      where: {
        resolved: true,
        resolvedAt: { gte: today },
        ...whereClause
      }
    });

    const resolvedAlerts = await this.prisma.alertLog.findMany({
      where: {
        resolved: true,
        resolvedAt: { gte: last7Days }
      },
      select: { createdAt: true, resolvedAt: true }
    });

    const avgResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((acc, alert) => {
          const diff = new Date(alert.resolvedAt!).getTime() - new Date(alert.createdAt).getTime();
          return acc + (diff / (1000 * 60 * 60));
        }, 0) / resolvedAlerts.length
      : 0;

    const bordereaux = await this.prisma.bordereau.findMany({
      where: { createdAt: { gte: last7Days } },
      include: { client: true, contract: true }
    });

    let compliantCount = 0;
    bordereaux.forEach(b => {
      const daysSinceReception = b.dateReception
        ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const slaThreshold = this.getSlaThreshold(b);

      if (b.statut === 'CLOTURE' || daysSinceReception <= slaThreshold) {
        compliantCount++;
      }
    });

    const slaCompliance = bordereaux.length > 0
      ? Math.round((compliantCount / bordereaux.length) * 100)
      : 100;

    const chartsData = await this.getChartsData(user);

    return {
      totalAlerts,
      criticalAlerts,
      resolvedToday,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      slaCompliance,
      ...chartsData
    };
  }

  async getRealTimeAlerts(user: any) {
    this.checkAlertsRole(user);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const where: any = {
      createdAt: { gte: fiveMinutesAgo },
      resolved: false
    };

    if (user.role === 'GESTIONNAIRE') {
      where.userId = user.id;
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      const teamMembers = await this.prisma.user.findMany({
        where: {
          teamLeaderId: user.id,
          role: 'GESTIONNAIRE'
        },
        select: { id: true }
      });
      where.userId = { in: [user.id, ...teamMembers.map(m => m.id)] };
    }

    return this.prisma.alertLog.findMany({
      where,
      include: { bordereau: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  async addAlertComment(bordereauId: string, comment: string, user: any) {
    this.checkAlertsRole(user);

    const alertComment = await this.prisma.alertLog.create({
      data: {
        bordereauId: null,
        userId: null,
        documentId: null,
        alertType: 'COMMENT',
        alertLevel: 'info',
        message: `Comment on ${bordereauId}: ${comment}`,
        notifiedRoles: [],
        resolved: false
      }
    });

    return {
      success: true,
      message: 'Comment added successfully',
      comment: {
        id: alertComment.id,
        message: comment,
        createdAt: alertComment.createdAt,
        user: { fullName: user.fullName || user.email || 'User' }
      }
    };
  }

  async triggerAlert(alertData: any) {
    try {
      await this.prisma.alertLog.create({
        data: {
          bordereauId: alertData.bordereauId || null,
          userId: alertData.userId || null,
          alertType: alertData.type || alertData.alertType || 'GENERIC',
          alertLevel: alertData.level || alertData.alertLevel || 'info',
          message: alertData.message || 'Alert triggered',
          notifiedRoles: alertData.notifiedRoles || ['SUPER_ADMIN'],
          createdAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Failed to trigger alert:', error);
    }
  }

  private async generateSlaComplianceChart(last7Days: Date) {
    const slaData: { date: string; compliance: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const dayBordereaux = await this.prisma.bordereau.findMany({
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay }
        },
        include: { client: true, contract: true }
      });

      if (dayBordereaux.length === 0) {
        slaData.push({
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          compliance: 100
        });
        continue;
      }

      let compliantCount = 0;
      const now = new Date();

      dayBordereaux.forEach(b => {
        const daysSinceReception = b.dateReception
          ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        const slaThreshold = this.getSlaThreshold(b);

        if (b.statut === 'CLOTURE' || daysSinceReception <= slaThreshold) {
          compliantCount++;
        }
      });

      const compliance = Math.round((compliantCount / dayBordereaux.length) * 100);
      slaData.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        compliance
      });
    }

    return slaData;
  }

  async getChartsData(user: any) {
    this.checkAlertsRole(user);

    const cacheKey = `alerts:charts:${user.role}:${user.id}`;
    return this.cached(cacheKey, 30, async () => {
      const now = new Date();

      const where: any = { archived: false };
      if (user.role === 'GESTIONNAIRE') {
        where.currentHandlerId = user.id;
      } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
        where.contract = { teamLeaderId: user.id };
      }

      const bordereaux = await this.prisma.bordereau.findMany({
        where,
        include: { contract: true, client: true }
      });

      let ontimeCount = 0;
      let atriskCount = 0;
      let overdueCount = 0;

      bordereaux.forEach(b => {
        const daysSinceReception = b.dateReception
          ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        const slaThreshold = this.getSlaThreshold(b);
        const percentElapsed = (daysSinceReception / slaThreshold) * 100;

        if (percentElapsed > 100) {
          overdueCount++;
        } else if (percentElapsed > 80) {
          atriskCount++;
        } else {
          ontimeCount++;
        }
      });

      return {
        alertsByDay: [],
        alertsByType: [
          { name: 'À temps', value: ontimeCount, color: '#52c41a' },
          { name: 'À risque', value: atriskCount, color: '#faad14' },
          { name: 'En retard', value: overdueCount, color: '#ff4d4f' }
        ],
        slaComplianceChart: await this.generateSlaComplianceChart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      };
    });
  }
}