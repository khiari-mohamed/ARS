import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { OutlookService } from '../integrations/outlook.service';
import { EnhancedAlertsService } from './enhanced-alerts.service';
import { EscalationEngineService } from './escalation-engine.service';
import { MultiChannelNotificationsService } from './multi-channel-notifications.service';
import { AlertAnalyticsService } from './alert-analytics.service';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  
  constructor(
    private prisma: PrismaService, 
    private readonly outlook: OutlookService,
    private readonly enhancedAlerts: EnhancedAlertsService,
    public readonly escalationEngine: EscalationEngineService,
    public readonly multiChannelNotifications: MultiChannelNotificationsService,
    public readonly alertAnalytics: AlertAnalyticsService
  ) {}



  /**
   * AI-powered SLA prediction with authentication
   */
  async getSlaPredictionAI(items: any[]) {
    try {
      // Get AI service token
      const token = await this.getAIServiceToken();
      
      const response = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, items, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000
      });
      
      return response.data;
    } catch (error) {
      this.logger.warn('AI service unavailable, using fallback:', error.message);
      return this.getBasicSlaPrediction(items);
    }
  }

  /**
   * Get AI service authentication token
   */
  private async getAIServiceToken(): Promise<string> {
    const username = process.env.AI_SERVICE_USER || 'admin';
    const password = process.env.AI_SERVICE_PASSWORD || 'secret';
    
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 100000
    });
    
    return response.data.access_token;
  }

  /**
   * Fallback SLA prediction when AI service is unavailable
   */
  // private getBasicSlaPrediction(items: any[]) {
  //   return {
  //     sla_predictions: items.map(item => {
  //       const now = new Date();
  //       const deadline = new Date(item.deadline);
  //       const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  //       const progress = item.current_progress || 0;
  //       const total = item.total_required || 1;
  //       const progressRatio = progress / total;
  //       
  //       let risk = '🟢';
  //       let score = 0;
  //       
  //       if (daysLeft <= 0) {
  //         risk = '🔴';
  //         score = 1.0;
  //       } else if (daysLeft <= 2 || progressRatio < 0.5) {
  //         risk = '🔴';
  //         score = 0.9;
  //       } else if (daysLeft <= 5 || progressRatio < 0.7) {
  //         risk = '🟠';
  //         score = 0.6;
  //       }
  //       
  //       return {
  //         id: item.id,
  //         risk,
  //         score,
  //         days_left: daysLeft,
  //         explanation: `${daysLeft} jours restants, progression: ${Math.round(progressRatio * 100)}%`
  //       };
  //     })
  //   };
  // }
  private getBasicSlaPrediction(items: any[]) {
    return { sla_predictions: [] };
  } 
  // Allow all authenticated users to access dashboard alerts
  private checkAlertsRole(user: any) {
    // Implement role-based access if needed
    // Example: restrict access to certain roles
    return; // Currently allows all authenticated users
  }

  /**
   * Real-time and AI-powered alerts dashboard with dynamic color coding
   */
  async getAlertsDashboard(query: AlertsQueryDto, user: any) {
    this.checkAlertsRole(user);
    
    // this.logger.log(`🔍 Alerts Dashboard - User: ${user.id} Role: ${user.role}`);
    
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
      // this.logger.log(`🎯 Filtering for GESTIONNAIRE: ${user.id}`);
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      // Filter by contract.teamLeaderId for Chef d'équipe and GESTIONNAIRE_SENIOR
      where.contract = {
        teamLeaderId: user.id
      };
      // this.logger.log(`🎯 Filtering for CHEF_EQUIPE/GESTIONNAIRE_SENIOR by contract.teamLeaderId: ${user.id}`);
    }
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: { 
        courriers: true, 
        virement: true, 
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
        chargeCompte: true
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // this.logger.log(`📊 Found ${bordereaux.length} bordereaux after filtering`);
    // if (bordereaux.length > 0) {
    //   this.logger.log(`📊 Sample: ${bordereaux[0].reference}, contract.teamLeaderId: ${bordereaux[0].contract?.teamLeaderId}`);
    // }

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
    let aiPredictions: any[] = [];
    try {
      const aiResponse = await this.getSlaPredictionAI(aiItems);
      aiPredictions = aiResponse.sla_predictions || [];
    } catch (error) {
      this.logger.warn('AI prediction failed, using fallback');
    }

    // Generate alerts with AI-enhanced color coding
    const alerts = bordereaux.map(b => {
      const aiPrediction = (aiPredictions as unknown as any[])?.find(p => p.id === b.id);
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
        // RÈGLE SLA UNIFIÉE: Basée sur pourcentage du délai écoulé
        const slaThreshold = this.getSlaThreshold(b);
        const percentageElapsed = (daysSinceReception / slaThreshold) * 100;
        
        if (b.statut !== 'CLOTURE' && percentageElapsed > 100) {
          level = 'red';
          reason = 'SLA breach';
        } else if (b.statut !== 'CLOTURE' && percentageElapsed > 80) {
          level = 'orange';
          reason = 'Risk of delay';
        }
      }
      
      // Show assignedToName from currentHandler
      let assignedToName = 'Non assigné';
      if (b.currentHandler) {
        assignedToName = b.currentHandler.fullName;
      } else if (b.chargeCompte) {
        assignedToName = b.chargeCompte.fullName;
      }
      
      return {
        bordereau: {
          ...b,
          teamName: b.team?.fullName || 'Non assigné',
          assignedToName,
          currentHandler: b.currentHandler, // Include currentHandler in response
          contract: b.contract // Include contract with teamLeader
        },
        alertLevel: level,
        reason,
        slaThreshold: this.getSlaThreshold(b),
        daysSinceReception: Math.round(daysSinceReception),
        aiScore,
        aiPrediction: aiPrediction || null
      };
    });

    // Trigger escalations for critical alerts
    await this.processAlertEscalations(alerts);
    
    // ONLY return actual alerts (red/orange), not green ones
    return alerts.filter(a => a.alertLevel === 'red' || a.alertLevel === 'orange');
  }

  private calculateDeadline(bordereau: any): string {
    const startDate = new Date(bordereau.dateReception || bordereau.createdAt);
    const slaThreshold = this.getSlaThreshold(bordereau);
    const deadline = new Date(startDate.getTime() + slaThreshold * 24 * 60 * 60 * 1000);
    return deadline.toISOString();
  }

  private calculateProgress(bordereau: any): number {
    // Calculate progress based on status and courriers
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
    return 30; // Default 30 days
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

  /**
   * 2. Team overload detection - UNIFIED LOGIC with Super Admin
   * Uses TIME-BASED calculation with delaiReglement (durée de règlement)
   * Règle: <70% Normal | 70-89% Occupé | ≥90% Surchargé
   */
  async getTeamOverloadAlerts(user: any) {
    this.checkAlertsRole(user);
    
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

    const overloads: any[] = [];

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
      
      // this.logger.log(`Team ${chef.fullName}: ${allDocs.length} docs, ${totalCapacity} capacity, ${utilizationRate}% utilization (time-based)`);
      
      // UNIFIED THRESHOLDS: <70% Normal | 70-89% Occupé | ≥90% Surchargé
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
      
      // this.logger.log(`Individual ${user.fullName}: ${allDocs.length} docs, ${user.capacity} capacity, ${utilizationRate}% utilization (time-based)`);
      
      // UNIFIED THRESHOLDS: <70% Normal | 70-89% Occupé | ≥90% Surchargé
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
  }

  /**
   * 3. Reclamation-based alerts
   */
  async getReclamationAlerts(user: any) {
    this.checkAlertsRole(user);
    
    // Get recent reclamations from Reclamation table (last 30 days)
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
  }

  /**
   * AI-powered delay prediction and smart recommendations
   */
  async getDelayPredictions(user: any) {
    this.checkAlertsRole(user);
    
    try {
      // Get ALL historical data for AI analysis (no time limit)
      const historicalData = await this.prisma.bordereau.findMany({
        include: { client: true, contract: true },
        orderBy: { createdAt: 'asc' }
      });
      
      // this.logger.log(`📊 AI analyzing ${historicalData.length} bordereaux for predictions`);

      // Prepare data for AI trend forecasting - count bordereaux per day
      const dailyCounts = historicalData.reduce((acc, b) => {
        const date = b.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Fill missing dates with 0 to ensure continuous data
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
      
      // this.logger.log(`📊 Prepared ${trendData.length} days of historical data for AI analysis`);

      // Try AI service first
      let forecast: any = {};
      let recommendationsResponse: any = { data: { decisions: [] } };
      
      try {
        const token = await this.getAIServiceToken();
        
        // Get trend forecast - send data in correct format
        const forecastResponse = await axios.post(`${AI_MICROSERVICE_URL}/forecast_trends`, trendData, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 300000
        });
        forecast = forecastResponse.data;
        
        // this.logger.log(`🤖 AI Forecast: ${JSON.stringify(forecast.forecast?.slice(0, 3))}`);
        // this.logger.log(`📈 Trend: ${forecast.trend_direction}, Weekly prediction: ${this.calculateWeeklyPrediction(forecast.forecast || [])}`);
        
        // Get recommendations
        const workload = await this.getCurrentWorkload();
        const capacity = await this.getTeamCapacity();
        
        recommendationsResponse = await axios.post(`${AI_MICROSERVICE_URL}/automated_decisions`, {
          context: { workload, capacity, historical_data: trendData },
          decision_type: 'resource_allocation'
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 300000
        });
        
      } catch (aiError) {
        this.logger.error('AI service unavailable:', aiError.message);
        throw new Error(`AI microservice unavailable: ${aiError.message}`);
      }

      // Calculate confidence based on data quality and model performance
      const dataQuality = Math.min(1.0, trendData.length / 30); // More data = higher confidence
      const modelConfidence = forecast.model_performance?.trend_strength || 0.5;
      // Boost confidence if we have recent data
      const recencyBoost = trendData.length >= 14 ? 0.1 : 0;
      const finalConfidence = Math.min(0.95, (dataQuality * 0.4 + modelConfidence * 0.6) + recencyBoost);
      
      const weeklyPrediction = this.calculateWeeklyPrediction(forecast.forecast || []);
      
      // Generate actionable insights
      const insights = await this.generatePredictionInsights(
        weeklyPrediction,
        forecast.trend_direction,
        trendData,
        finalConfidence
      );
      
      // this.logger.log(`💡 Generated ${insights.length} insights:`);
      // insights.forEach((insight, i) => {
      //   this.logger.log(`  ${i+1}. [${insight.priority}] ${insight.message.substring(0, 50)}...`);
      // });
      
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
    } catch (error) {
      this.logger.error('AI delay prediction failed:', error.response?.data || error.message);
      throw error;
    }
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
    
    // Use a balanced approach: average of predicted_value and upper_bound
    // This gives more realistic predictions while accounting for uncertainty
    const avgDaily = forecast.reduce((sum, f) => {
      const predicted = f.predicted_value || 0;
      const upper = f.upper_bound || 0;
      // Use 70% of upper bound + 30% of predicted for better accuracy
      const estimate = Math.max(predicted, upper * 0.7 + predicted * 0.3);
      return sum + estimate;
    }, 0) / forecast.length;
    
    const weeklyPrediction = Math.round(avgDaily * 7);
    // this.logger.log(`📊 Calculated weekly prediction: ${weeklyPrediction} (avg daily: ${avgDaily.toFixed(2)})`);
    
    return Math.max(0, weeklyPrediction);
  }

  private async generatePredictionInsights(weeklyPrediction: number, trendDirection: string, historicalData: any[], confidence: number): Promise<Array<{type: string; icon: string; message: string; action: string; priority: string}>> {
    const insights: Array<{type: string; icon: string; message: string; action: string; priority: string}> = [];
    const avgHistorical = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const dailyAvg = weeklyPrediction / 7;
    const percentChange = ((dailyAvg - avgHistorical) / avgHistorical) * 100;
    
    // Get current team capacity and workload
    const teams = await this.prisma.user.findMany({
      where: { role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] } },
      select: { capacity: true, role: true, id: true }
    });
    const totalCapacity = teams.reduce((sum, t) => sum + (t.capacity || 0), 0);
    const gestionnaireCount = teams.filter(t => t.role === 'GESTIONNAIRE').length;
    
    // Get current active workload
    const activeWorkload = await this.prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE', 'PAYE'] } }
    });
    
    // Calculate capacity utilization
    const currentUtilization = totalCapacity > 0 ? (activeWorkload / totalCapacity) * 100 : 0;
    
    // Calculate required resources based on prediction
    const avgProcessingPerPerson = totalCapacity > 0 && gestionnaireCount > 0 ? (avgHistorical * 7) / gestionnaireCount : 10;
    const requiredStaff = Math.ceil(weeklyPrediction / avgProcessingPerPerson);
    const staffGap = requiredStaff - gestionnaireCount;

    // Workload prediction insights with actionable recommendations
    if (percentChange > 50) {
      const extraBordereaux = Math.round(weeklyPrediction - avgHistorical * 7);
      const hoursNeeded = Math.round(extraBordereaux * 2); // Assume 2h per bordereau
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
    
    // Capacity utilization insight
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

    // Trend-based strategic insights with specific actions
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

    // Data quality and confidence insights with improvement actions
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

  /**
   * 5. Automated notifications (real email + stub web)
   * Used by escalation logic and can be called directly.
   */
  async notify(role: string, message: string, alert: any = {}) {
    // Find users by role
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
    
    // Check if similar alert already exists to avoid duplicates
    const existingAlert = await this.prisma.alertLog.findFirst({
      where: {
        bordereauId: alert.bordereau?.id || alert.bordereauId || null,
        alertType: alert.type || 'GENERIC',
        resolved: false,
        message
      }
    });
    
    // Only create alert if it doesn't exist
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

  /**
   * Helper for escalation logic: notifyRole
   */
  async notifyRole(role: string, alert: any) {
    let message = '';
    if (alert.reason) {
      message = `[${alert.alertLevel?.toUpperCase() || alert.alert?.toUpperCase() || 'ALERT'}] ${alert.reason}`;
    } else {
      message = '[ALERT] Please check dashboard for details.';
    }
    await this.notify(role, message, alert);
  }

  /**
   * 5b. Query alert history/trends - WITH UNIFIED SLA LOGIC
   */
  async getAlertHistory(query: any, user: any) {
    this.checkAlertsRole(user);
    
    const where: any = {};
    
    // Handle resolved filter from query (convert string to boolean)
    if (query.resolved !== undefined) {
      where.resolved = query.resolved === 'true' || query.resolved === true;
    } else {
      where.resolved = false; // Default to unresolved
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
    
    // Role-based filtering AFTER fetch (to handle alerts without bordereaux)
    const filteredAlerts = alerts.filter(alert => {
      // SUPER_ADMIN sees all
      if (user.role === 'SUPER_ADMIN') return true;
      
      // Alerts without bordereau: only show if no bordereau exists
      if (!alert.bordereau) return false;
      
      // GESTIONNAIRE: only their assigned bordereaux
      if (user.role === 'GESTIONNAIRE') {
        return alert.bordereau.currentHandlerId === user.id;
      }
      
      // CHEF_EQUIPE/GESTIONNAIRE_SENIOR: only their team's bordereaux
      if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
        return alert.bordereau.contract?.teamLeaderId === user.id;
      }
      
      return false;
    });
    
    // Remove duplicates: keep only the LATEST alert per bordereau
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
    
    // this.logger.log(`🔍 Alert History - Filtered ${deduplicatedAlerts.length} alerts (${filteredAlerts.length} before deduplication) for user ${user.id} (${user.role})`);
    
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
      
      // UNIFIED SLA LOGIC: Percentage-based using delaiReglement (time factor)
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
        
        // UNIFIED RULE: ≤80% = green, >80% = orange/red
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

  /**
   * 5c. Mark alert as resolved
   */
  async resolveAlert(bordereauId: string, user: any) {
    this.checkAlertsRole(user);
    
    // Update bordereau status to resolved
    const bordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { 
        statut: 'CLOTURE',
        updatedAt: new Date()
      }
    });
    
    // Mark related alert logs as resolved with user info
    await this.prisma.alertLog.updateMany({
      where: { 
        bordereauId: bordereauId,
        resolved: false
      },
      data: { 
        resolved: true, 
        resolvedAt: new Date(),
        userId: user.id
      }
    });
    
    return bordereau;
  }

  /**
   * 6. Prioritization of high-risk bordereaux
   */
  async getPriorityList(user: any) {
    this.checkAlertsRole(user);
    // Get all alerts and return them directly (they're already prioritized)
    const alerts = await this.getAlertsDashboard({}, user);
    return alerts;
  }

  /**
   * 7. Comparative analytics (planned vs actual)
   */
  async getComparativeAnalytics(user: any) {
    this.checkAlertsRole(user);
    
    // Get actual processed bordereaux in last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const actualProcessed = await this.prisma.bordereau.count({
      where: {
        statut: 'CLOTURE',
        updatedAt: { gte: last7Days }
      }
    });
    
    // Get prediction data
    const data = await this.getDelayPredictions(user);
    const planned = Math.max(1, data.next_week_prediction || actualProcessed || 1);
    const actual = actualProcessed;
    
    return {
      planned,
      actual,
      gap: actual - planned,
    };
  }

  /**
   * Finance 24h alerts - specific implementation
   */
  async getFinanceAlerts(user: any) {
    this.checkAlertsRole(user);
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get bordereaux that have virements older than 24h
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
    
    // Create alerts for each overdue virement
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
      
      // Send notification to finance team
      await this.notifyRole('FINANCE', {
        bordereau,
        alertLevel: 'red',
        reason: `OV non traité depuis ${hoursOverdue}h`,
        hoursOverdue
      });
    }
    
    return alerts;
  }
  
  /**
   * 8. KPI Dashboard Data
   */
  async getAlertsKPI(user: any) {
    this.checkAlertsRole(user);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const whereClause: any = {};
    
    // Role-based filtering
    if (user.role === 'GESTIONNAIRE') {
      whereClause.userId = user.id;
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      // Get team members (gestionnaires) for this chef
      const teamMembers = await this.prisma.user.findMany({
        where: { 
          teamLeaderId: user.id,
          role: 'GESTIONNAIRE'
        },
        select: { id: true }
      });
      whereClause.userId = { in: [user.id, ...teamMembers.map(m => m.id)] };
    }
    
    // Get actual alerts from dashboard (only red/orange)
    const dashboardAlerts = await this.getAlertsDashboard({}, user);
    const totalAlerts = dashboardAlerts.length;
    const criticalAlerts = dashboardAlerts.filter(a => a.alertLevel === 'red').length;
    
    // Get resolved today
    const resolvedToday = await this.prisma.alertLog.count({
      where: {
        resolved: true,
        resolvedAt: { gte: today },
        ...whereClause
      }
    });
    
    // Calculate average resolution time
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
          return acc + (diff / (1000 * 60 * 60)); // Convert to hours
        }, 0) / resolvedAlerts.length
      : 0;
    
    // Calculate SLA compliance
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
    
    // Get charts data
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

  /**
   * 9. Real-time alerts (last 5 minutes)
   */
  async getRealTimeAlerts(user: any) {
    this.checkAlertsRole(user);
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const where: any = {
      createdAt: { gte: fiveMinutesAgo },
      resolved: false
    };
    
    // Role-based filtering
    if (user.role === 'GESTIONNAIRE') {
      where.userId = user.id;
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      // Get alerts for team members
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

  /**
   * Add comment to alert/bordereau
   */
  async addAlertComment(bordereauId: string, comment: string, user: any) {
    this.checkAlertsRole(user);
    
    // Create alert log entry for the comment without foreign key constraints
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

  /**
   * Trigger alert method for other services
   */
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

  /**
   * Generate SLA compliance chart data
   */
  private async generateSlaComplianceChart(last7Days: Date) {
    const slaData: { date: string; compliance: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      // Get bordereaux for this day
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

  /**
   * 10. Charts data for analytics
   */
  async getChartsData(user: any) {
    this.checkAlertsRole(user);
    
    const now = new Date();
    
    // Get ALL bordereaux with role-based filtering
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
    
    // Calculate SLA status for each bordereau
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
  }
}
