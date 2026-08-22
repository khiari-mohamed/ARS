// src/alerts/alert-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { EnhancedAlertsService } from './enhanced-alerts.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

@Injectable()
export class AlertSchedulerService {
  private readonly logger = new Logger(AlertSchedulerService.name);

  // ==========================================
  // 🚀 Environment Variable Controls
  // ==========================================
  private readonly LOG_ALERT_DEBUG = process.env.LOG_ALERT_DEBUG === 'true';
  private readonly ENABLE_SLA_ALERTS = process.env.ENABLE_SLA_ALERTS !== 'false';
  private readonly ENABLE_FINANCE_ALERTS = process.env.ENABLE_FINANCE_ALERTS !== 'false';
  private readonly ENABLE_TEAM_OVERLOAD_ALERTS = process.env.ENABLE_TEAM_OVERLOAD_ALERTS !== 'false';
  private readonly ENABLE_RECLAMATION_ALERTS = process.env.ENABLE_RECLAMATION_ALERTS !== 'false';

  // AI microservice request timeouts (ms)
  private readonly AI_TOKEN_TIMEOUT_MS = 5000;
  private readonly AI_PREDICTION_TIMEOUT_MS = 15000;

  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
    private enhancedAlerts: EnhancedAlertsService
  ) {}

  private isProcessingSLA = false;

  // 🚀 NEW: cached AI auth token, avoids a /token round-trip on every cron tick
  private aiToken: string | null = null;
  private aiTokenExpiresAt = 0;

  /**
   * Returns a valid AI microservice bearer token, fetching a fresh one only
   * when the cached one is missing or about to expire.
   */
  private async getAiToken(): Promise<string> {
    const now = Date.now();
    if (this.aiToken && now < this.aiTokenExpiresAt) {
      return this.aiToken;
    }

    const tokenResponse = await axios.post(
      `${AI_MICROSERVICE_URL}/token`,
      {
        username: process.env.AI_SERVICE_USER || 'ai_service',
        password: process.env.AI_SERVICE_PASSWORD || 'ai_secure_2024'
      },
      { timeout: this.AI_TOKEN_TIMEOUT_MS }
    );

    const token = tokenResponse.data.access_token as string;
    this.aiToken = token;
    // Default to a 5 min lifetime if the service doesn't return expires_in;
    // refresh 30s before actual expiry to avoid using a stale token mid-request.
    const expiresInSeconds = tokenResponse.data.expires_in ?? 300;
    this.aiTokenExpiresAt = now + Math.max(expiresInSeconds - 30, 30) * 1000;

    return token;
  }

  // Changed Cron to use .env variable with a fallback
  @Cron(process.env.CRON_SLA_ALERTS || '0 */10 * * * *')
  async processSLAAlerts() {
    // 🛑 If disabled in .env, skip immediately
    if (!this.ENABLE_SLA_ALERTS) return;

    if (this.isProcessingSLA) {
      this.logger.debug('SLA alerts processing already in progress, skipping...');
      return;
    }

    this.isProcessingSLA = true;
    this.logger.log('Processing SLA alerts...');

    try {
      // Get all active bordereaux
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          statut: { notIn: ['CLOTURE', 'TRAITE'] },
          archived: false
        },
        include: {
          client: true,
          contract: true,
          currentHandler: true,
          team: true
        }
      });

      if (bordereaux.length === 0) {
        this.logger.log('No active bordereaux to process for SLA alerts');
        return;
      }

      // Prepare data for AI SLA prediction
      const aiItems = bordereaux.map(b => ({
        id: b.id,
        start_date: b.dateReception || b.createdAt,
        deadline: this.calculateDeadline(b),
        current_progress: this.calculateProgress(b),
        total_required: this.calculateTotalRequired(b),
        sla_days: this.getSlaThreshold(b),
        complexity: this.calculateComplexity(b),
        client_priority: this.getClientPriority(b)
      }));

      // ⚠️ AI-ONLY: no local fallback logic. If the AI microservice is
      // unavailable, we abort this cycle entirely and retry on the next
      // scheduled run rather than approximating risk locally.
      let aiPredictions: any[];
      try {
        const token = await this.getAiToken();

        const aiResponse = await axios.post(
          `${AI_MICROSERVICE_URL}/sla_prediction`,
          { items: aiItems, explain: true },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: this.AI_PREDICTION_TIMEOUT_MS
          }
        );
        aiPredictions = aiResponse.data.sla_predictions;
      } catch (error) {
        // Force a token refresh next attempt in case this was an auth failure
        this.aiToken = null;
        this.aiTokenExpiresAt = 0;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `AI SLA prediction unavailable — skipping this cycle (no fallback): ${errorMessage}`
        );
        return;
      }

      const predictionMap = new Map<string, any>((aiPredictions || []).map(p => [p.id, p]));

      const alertOps: Array<{
        bordereauId: string;
        alertType: string;
        alertLevel: string;
        message: string;
        userId?: string;
        aiPrediction: any;
      }> = [];

      for (const bordereau of bordereaux) {
        const aiPrediction = predictionMap.get(bordereau.id);

        if (!aiPrediction) {
          this.logger.warn(`No AI prediction returned for bordereau ${bordereau.id}, skipping`);
          continue;
        }

        const daysSinceReception = bordereau.dateReception
          ? (Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
          : 0;

        // NOTE: matches original behavior — alertType stays 'SLA_MONITORING'
        // in the AI-prediction path; only alertLevel varies with the risk.
        const alertType = 'SLA_MONITORING';
        const alertLevel: 'green' | 'orange' | 'red' =
          aiPrediction.risk === '🔴' ? 'red' : aiPrediction.risk === '🟠' ? 'orange' : 'green';

        // Create alert if critical or warning
        if (alertLevel !== 'green') {
          alertOps.push({
            bordereauId: bordereau.id,
            alertType,
            alertLevel,
            message: this.generateAlertMessage(alertType, bordereau, daysSinceReception),
            userId: bordereau.assignedToUserId || undefined,
            aiPrediction
          });
        }
      }

      // Independent writes (different bordereauId keys) — safe to run concurrently
      await Promise.all(alertOps.map(op => this.createOrUpdateAlert(op)));

      this.logger.log(
        `Processed ${bordereaux.length} bordereaux for SLA alerts (${alertOps.length} alerts raised)`
      );
    } catch (error) {
      this.logger.error('Failed to process SLA alerts:', error);
    } finally {
      this.isProcessingSLA = false;
    }
  }

  // Changed Cron to use .env (default: Every hour)
  @Cron(process.env.CRON_FINANCE_ALERTS || '0 0 * * * *')
  async processFinanceAlerts() {
    if (!this.ENABLE_FINANCE_ALERTS) return;
    this.logger.log('Processing finance alerts...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const overdueVirements = await this.prisma.wireTransferBatch.findMany({
        where: {
          status: 'CREATED',
          createdAt: { lte: twentyFourHoursAgo }
        }
      });

      await Promise.all(
        overdueVirements.map(async virement => {
          const hoursOverdue = Math.floor(
            (Date.now() - virement.createdAt.getTime()) / (1000 * 60 * 60)
          );

          await this.createOrUpdateAlert({
            bordereauId: undefined,
            alertType: 'OV_NOT_PROCESSED_24H',
            alertLevel: 'red',
            message: `OV non traité depuis ${hoursOverdue}h - ${virement.fileName}`,
            metadata: { hoursOverdue, virementId: virement.id }
          });

          await this.alertsService.notifyRole('FINANCE', {
            alertType: 'OV_NOT_PROCESSED_24H',
            alertLevel: 'red',
            reason: `OV non traité depuis ${hoursOverdue}h`,
            virement,
            hoursOverdue
          });
        })
      );

      this.logger.log(`Processed ${overdueVirements.length} overdue virements`);
    } catch (error) {
      this.logger.error('Failed to process finance alerts:', error);
    }
  }

  private isProcessingTeamOverload = false;

  async triggerTeamOverloadCheck() {
    return this.processTeamOverloadAlerts();
  }

  // Changed Cron to use .env (default: Every 30 mins)
  @Cron(process.env.CRON_TEAM_OVERLOAD_ALERTS || '0 */30 * * * *')
  async processTeamOverloadAlerts() {
    if (!this.ENABLE_TEAM_OVERLOAD_ALERTS) return;

    if (this.isProcessingTeamOverload) {
      this.logger.debug('Team overload processing already in progress, skipping...');
      return;
    }

    this.isProcessingTeamOverload = true;
    this.logger.log('Processing team overload alerts...');

    try {
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
                      contract: { select: { delaiReglement: true } }
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
                  contract: { select: { delaiReglement: true } }
                }
              }
            }
          }
        }
      });

      const individualTeams = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE_SENIOR',
          active: true
        },
        include: {
          assignedDocuments: {
            include: {
              bordereau: {
                select: {
                  dateReception: true,
                  delaiReglement: true,
                  contract: { select: { delaiReglement: true } }
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

      await Promise.all(
        chefEquipes.map(async chef => {
          const teamMembers = chef.teamMembers || [];
          const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(m => m.assignedDocuments)];
          const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);
          const { utilizationRate } = calculateTimeBasedUtilization(allDocs, totalCapacity);

          if (utilizationRate >= 90) {
            await this.createOrUpdateAlert({
              alertType: 'TEAM_OVERLOAD',
              alertLevel: 'red',
              message: `Équipe surchargée - ${chef.fullName} - ${allDocs.length} docs (${utilizationRate}% time-based)`,
              userId: chef.id,
              metadata: { workload: allDocs.length, capacity: totalCapacity, utilizationRate }
            });
          } else if (utilizationRate >= 70) {
            await this.createOrUpdateAlert({
              alertType: 'TEAM_OVERLOAD',
              alertLevel: 'orange',
              message: `Charge élevée - ${chef.fullName} - ${allDocs.length} docs (${utilizationRate}% time-based)`,
              userId: chef.id,
              metadata: { workload: allDocs.length, capacity: totalCapacity, utilizationRate }
            });
          } else {
            await this.prisma.alertLog.updateMany({
              where: { userId: chef.id, alertType: 'TEAM_OVERLOAD', resolved: false },
              data: { resolved: true, resolvedAt: new Date() }
            });
          }
        })
      );

      await Promise.all(
        individualTeams.map(async user => {
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
            await this.createOrUpdateAlert({
              alertType: 'TEAM_OVERLOAD',
              alertLevel: 'red',
              message: `${user.fullName} surchargé - ${allDocs.length} docs (${utilizationRate}% time-based)`,
              userId: user.id,
              metadata: { workload: allDocs.length, capacity: user.capacity, utilizationRate }
            });
          } else if (utilizationRate >= 70) {
            await this.createOrUpdateAlert({
              alertType: 'TEAM_OVERLOAD',
              alertLevel: 'orange',
              message: `${user.fullName} charge élevée - ${allDocs.length} docs (${utilizationRate}% time-based)`,
              userId: user.id,
              metadata: { workload: allDocs.length, capacity: user.capacity, utilizationRate }
            });
          } else {
            await this.prisma.alertLog.updateMany({
              where: { userId: user.id, alertType: 'TEAM_OVERLOAD', resolved: false },
              data: { resolved: true, resolvedAt: new Date() }
            });
          }
        })
      );

      this.logger.log(`Processed ${chefEquipes.length + individualTeams.length} teams for overload alerts`);
    } catch (error) {
      this.logger.error('Failed to process team overload alerts:', error);
    } finally {
      this.isProcessingTeamOverload = false;
    }
  }

  // Changed Cron to use .env (default: Every 5 mins)
  @Cron(process.env.CRON_RECLAMATION_ALERTS || '*/5 * * * *')
  async processReclamationAlerts() {
    if (!this.ENABLE_RECLAMATION_ALERTS) return;

    this.logger.log('Processing reclamation alerts...');

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const newReclamations = await this.prisma.courrier.findMany({
        where: {
          type: 'RECLAMATION',
          createdAt: { gte: fiveMinutesAgo }
        },
        include: {
          bordereau: { include: { client: true } }
        }
      });

      await Promise.all(
        newReclamations.map(async reclamation => {
          await this.createOrUpdateAlert({
            bordereauId: reclamation.bordereauId || undefined,
            alertType: 'NEW_RECLAMATION',
            alertLevel: 'red',
            message: `Nouvelle réclamation - Client`,
            metadata: { reclamationId: reclamation.id }
          });

          await this.alertsService.notifyRole('SUPERVISOR', {
            alertType: 'NEW_RECLAMATION',
            alertLevel: 'red',
            reason: 'Nouvelle réclamation enregistrée',
            reclamation,
            status: reclamation.status
          });
        })
      );

      this.logger.log(`Processed ${newReclamations.length} new reclamations`);
    } catch (error) {
      this.logger.error('Failed to process reclamation alerts:', error);
    }
  }

  private async createOrUpdateAlert(alertData: {
    bordereauId?: string;
    alertType: string;
    alertLevel: string;
    message: string;
    userId?: string;
    metadata?: any;
    aiPrediction?: any;
  }) {
    try {
      const whereClause: any = {
        alertType: alertData.alertType,
        resolved: false
      };

      if (alertData.bordereauId) {
        whereClause.bordereauId = alertData.bordereauId;
      } else {
        whereClause.bordereauId = null;
      }

      if (alertData.userId) {
        whereClause.userId = alertData.userId;
      } else {
        whereClause.userId = null;
      }

      const existingAlert = await this.prisma.alertLog.findFirst({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      if (existingAlert) {
        if (existingAlert.message !== alertData.message || existingAlert.alertLevel !== alertData.alertLevel) {
          await this.prisma.alertLog.update({
            where: { id: existingAlert.id },
            data: {
              message: alertData.message,
              alertLevel: alertData.alertLevel
            }
          });
          this.logger.debug(`Updated existing alert ${existingAlert.id} for ${alertData.alertType}`);
        } else {
          // 🛑 FIXED: STOPS LOG SPAMMING
          if (this.LOG_ALERT_DEBUG) {
            this.logger.debug(`Alert already exists and unchanged: ${existingAlert.id}`);
          }
        }
      } else {
        const newAlert = await this.prisma.alertLog.create({
          data: {
            bordereauId: alertData.bordereauId || null,
            userId: alertData.userId || null,
            alertType: alertData.alertType,
            alertLevel: alertData.alertLevel,
            message: alertData.message,
            notifiedRoles: this.getNotificationRoles(alertData.alertType, alertData.alertLevel)
          }
        });
        this.logger.log(`✅ Created new alert ${newAlert.id} for ${alertData.alertType}`);
      }
    } catch (error) {
      this.logger.error('Failed to create/update alert:', error);
    }
  }

  private getNotificationRoles(alertType: string, alertLevel: string): string[] {
    const roleMap = {
      'SLA_BREACH': ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'],
      'SLA_RISK': ['GESTIONNAIRE', 'CHEF_EQUIPE'],
      'TEAM_OVERLOAD': ['CHEF_EQUIPE', 'SUPER_ADMIN'],
      'OV_NOT_PROCESSED_24H': ['FINANCE', 'SUPER_ADMIN'],
      'NEW_RECLAMATION': ['SUPERVISOR', 'SUPER_ADMIN']
    };
    return roleMap[alertType] || ['SUPER_ADMIN'];
  }

  private generateAlertMessage(alertType: string, bordereau: any, daysSince: number): string {
    const messages = {
      'SLA_BREACH': `SLA dépassé - Bordereau ${bordereau.reference || bordereau.id} - ${Math.round(daysSince)} jours écoulés`,
      'SLA_RISK': `Risque SLA - Bordereau ${bordereau.reference || bordereau.id} - ${Math.round(daysSince)} jours écoulés`,
      'SLA_MONITORING': `Surveillance SLA - Bordereau ${bordereau.reference || bordereau.id}`
    };
    return messages[alertType] || `Alert: ${alertType}`;
  }

  private calculateDeadline(bordereau: any): string {
    const startDate = new Date(bordereau.dateReception || bordereau.createdAt);
    const slaThreshold = this.getSlaThreshold(bordereau);
    const deadline = new Date(startDate.getTime() + slaThreshold * 24 * 60 * 60 * 1000);
    return deadline.toISOString();
  }

  private calculateProgress(bordereau: any): number {
    const statusProgress = {
      'RECU': 0.1, 'SCANNE': 0.3, 'EN_COURS': 0.6, 'TRAITE': 0.9, 'CLOTURE': 1.0
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
}