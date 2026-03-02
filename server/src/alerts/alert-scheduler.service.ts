import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { EnhancedAlertsService } from './enhanced-alerts.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

@Injectable()
export class AlertSchedulerService {
  private readonly logger = new Logger(AlertSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
    private enhancedAlerts: EnhancedAlertsService
  ) {}

  private isProcessingSLA = false;
  
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processSLAAlerts() {
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

      // Get AI predictions
      let aiPredictions = null;
      try {
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, {
          username: process.env.AI_SERVICE_USER || 'ai_service',
          password: process.env.AI_SERVICE_PASSWORD || 'ai_secure_2024'
        });
        
        const token = tokenResponse.data.access_token;
        
        const aiResponse = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, 
          { items: aiItems, explain: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        aiPredictions = aiResponse.data.sla_predictions;
      } catch (error) {
        this.logger.warn('AI prediction failed, using fallback logic');
      }

      // Process each bordereau for alerts
      for (const bordereau of bordereaux) {
        const aiPrediction = (aiPredictions as unknown as any[])?.find(p => p.id === bordereau.id);
        const daysSinceReception = bordereau.dateReception ? 
          (Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24) : 0;
        
        let alertLevel: 'green' | 'orange' | 'red' = 'green';
        let alertType = 'SLA_MONITORING';
        
        if (aiPrediction) {
          alertLevel = aiPrediction.risk === '🔴' ? 'red' : aiPrediction.risk === '🟠' ? 'orange' : 'green';
        } else {
          // RÈGLE SLA UNIFIÉE: Basée sur pourcentage du délai écoulé
          const slaThreshold = this.getSlaThreshold(bordereau);
          const percentageElapsed = (daysSinceReception / slaThreshold) * 100;
          
          if (percentageElapsed > 100) {
            alertLevel = 'red';
            alertType = 'SLA_BREACH';
          } else if (percentageElapsed > 80) {
            alertLevel = 'orange';
            alertType = 'SLA_RISK';
          }
        }

        // Create alert if critical or warning
        if (alertLevel !== 'green') {
          await this.createOrUpdateAlert({
            bordereauId: bordereau.id,
            alertType,
            alertLevel,
            message: this.generateAlertMessage(alertType, bordereau, daysSinceReception),
            userId: bordereau.assignedToUserId || undefined,
            aiPrediction
          });
        }
      }

      this.logger.log(`Processed ${bordereaux.length} bordereaux for SLA alerts`);
    } catch (error) {
      this.logger.error('Failed to process SLA alerts:', error);
    } finally {
      this.isProcessingSLA = false;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processFinanceAlerts() {
    this.logger.log('Processing finance alerts...');
    
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get overdue virements
      const overdueVirements = await this.prisma.wireTransferBatch.findMany({
        where: {
          status: 'CREATED',
          createdAt: { lte: twentyFourHoursAgo }
        }
      });

      for (const virement of overdueVirements) {
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

        // Notify finance team
        await this.alertsService.notifyRole('FINANCE', {
          alertType: 'OV_NOT_PROCESSED_24H',
          alertLevel: 'red',
          reason: `OV non traité depuis ${hoursOverdue}h`,
          virement,
          hoursOverdue
        });
      }

      this.logger.log(`Processed ${overdueVirements.length} overdue virements`);
    } catch (error) {
      this.logger.error('Failed to process finance alerts:', error);
    }
  }

  private isProcessingTeamOverload = false;
  
  // Manual trigger for testing
  async triggerTeamOverloadCheck() {
    return this.processTeamOverloadAlerts();
  }
  
  @Cron(CronExpression.EVERY_30_MINUTES)
  async processTeamOverloadAlerts() {
    if (this.isProcessingTeamOverload) {
      this.logger.debug('Team overload processing already in progress, skipping...');
      return;
    }
    
    this.isProcessingTeamOverload = true;
    this.logger.log('Processing team overload alerts...');
    
    try {
      const now = new Date();
      
      // Get all CHEF_EQUIPE with their team members (EXACT SAME QUERY AS SUPER ADMIN)
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

      // Get GESTIONNAIRE_SENIOR and RESPONSABLE_DEPARTEMENT (EXACT SAME AS SUPER ADMIN)
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

      // Helper function: EXACT SAME TIME-BASED CALCULATION AS SUPER ADMIN
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

      // Process Chef d'Équipe teams (EXACT SAME LOGIC AS SUPER ADMIN)
      for (const chef of chefEquipes) {
        const teamMembers = chef.teamMembers || [];
        const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(m => m.assignedDocuments)];
        const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);
        
        const { utilizationRate } = calculateTimeBasedUtilization(allDocs, totalCapacity);
        const teamSize = teamMembers.length + 1;

        // UNIFIED THRESHOLDS: <70% Normal | 70-89% Occupé | ≥90% Surchargé
        if (utilizationRate >= 90) {
          await this.createOrUpdateAlert({
            alertType: 'TEAM_OVERLOAD',
            alertLevel: 'red',
            message: `Équipe surchargée - ${chef.fullName} - ${allDocs.length} docs (${utilizationRate}% time-based)`,
            userId: chef.id,
            metadata: { workload: allDocs.length, capacity: totalCapacity, teamSize, utilizationRate }
          });
        } else if (utilizationRate >= 70) {
          await this.createOrUpdateAlert({
            alertType: 'TEAM_OVERLOAD',
            alertLevel: 'orange',
            message: `Charge élevée - ${chef.fullName} - ${allDocs.length} docs (${utilizationRate}% time-based)`,
            userId: chef.id,
            metadata: { workload: allDocs.length, capacity: totalCapacity, teamSize, utilizationRate }
          });
        } else {
          await this.prisma.alertLog.updateMany({
            where: { userId: chef.id, alertType: 'TEAM_OVERLOAD', resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
          });
        }
      }

      // Process individual teams (EXACT SAME LOGIC AS SUPER ADMIN)
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

        // UNIFIED THRESHOLDS: <70% Normal | 70-89% Occupé | ≥90% Surchargé
        if (utilizationRate >= 90) {
          await this.createOrUpdateAlert({
            alertType: 'TEAM_OVERLOAD',
            alertLevel: 'red',
            message: `${user.fullName} surchargé - ${allDocs.length} docs (${utilizationRate}% time-based)`,
            userId: user.id,
            metadata: { workload: allDocs.length, capacity: user.capacity, teamSize: 1, utilizationRate }
          });
        } else if (utilizationRate >= 70) {
          await this.createOrUpdateAlert({
            alertType: 'TEAM_OVERLOAD',
            alertLevel: 'orange',
            message: `${user.fullName} charge élevée - ${allDocs.length} docs (${utilizationRate}% time-based)`,
            userId: user.id,
            metadata: { workload: allDocs.length, capacity: user.capacity, teamSize: 1, utilizationRate }
          });
        } else {
          await this.prisma.alertLog.updateMany({
            where: { userId: user.id, alertType: 'TEAM_OVERLOAD', resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
          });
        }
      }

      this.logger.log(`Processed ${chefEquipes.length + individualTeams.length} teams for overload alerts`);
    } catch (error) {
      this.logger.error('Failed to process team overload alerts:', error);
    } finally {
      this.isProcessingTeamOverload = false;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReclamationAlerts() {
    this.logger.log('Processing reclamation alerts...');
    
    try {
      // Get new reclamations (created in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const newReclamations = await this.prisma.courrier.findMany({
        where: {
          type: 'RECLAMATION',
          createdAt: { gte: fiveMinutesAgo }
        },
        include: {
          bordereau: {
            include: { client: true }
          }
        }
      });

      for (const reclamation of newReclamations) {
        await this.createOrUpdateAlert({
          bordereauId: reclamation.bordereauId || undefined,
          alertType: 'NEW_RECLAMATION',
          alertLevel: 'red',
          message: `Nouvelle réclamation - Client`,
          metadata: { reclamationId: reclamation.id }
        });

        // Notify supervisors
        await this.alertsService.notifyRole('SUPERVISOR', {
          alertType: 'NEW_RECLAMATION',
          alertLevel: 'red',
          reason: 'Nouvelle réclamation enregistrée',
          reclamation,
          status: reclamation.status
        });
      }

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
      // Build strict unique constraint - FIXED to prevent duplicates
      const whereClause: any = {
        alertType: alertData.alertType,
        resolved: false
      };
      
      // Ensure exact match for bordereau OR user OR neither
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
      
      // Find existing alert with exact match
      const existingAlert = await this.prisma.alertLog.findFirst({ 
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      if (existingAlert) {
        // Only update if message or level changed
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
          this.logger.debug(`Alert already exists and unchanged: ${existingAlert.id}`);
        }
      } else {
        // Create new alert only if no existing one found
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

  // Helper methods (same as in AlertsService)
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
}