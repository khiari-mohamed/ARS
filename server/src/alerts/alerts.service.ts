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
    
    this.logger.log(`🔍 Alerts Dashboard - User: ${user.id} Role: ${user.role}`);
    
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
      this.logger.log(`🎯 Filtering for GESTIONNAIRE: ${user.id}`);
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      // Filter by contract.teamLeaderId for Chef d'équipe
      where.contract = {
        teamLeaderId: user.id
      };
      this.logger.log(`🎯 Filtering for CHEF_EQUIPE/GESTIONNAIRE_SENIOR by contract.teamLeaderId: ${user.id}`);
    }
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: { 
        courriers: true, 
        virement: true, 
        contract: true, 
        client: true,
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
    
    this.logger.log(`📊 Found ${bordereaux.length} bordereaux after filtering`);
    if (bordereaux.length > 0) {
      this.logger.log(`📊 Sample: ${bordereaux[0].reference}, contract.teamLeaderId: ${bordereaux[0].contract?.teamLeaderId}`);
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
        // Fallback logic
        const slaThreshold = this.getSlaThreshold(b);
        if (b.statut !== 'CLOTURE' && daysSinceReception > slaThreshold) {
          level = 'red';
          reason = 'SLA breach';
        } else if (b.statut !== 'CLOTURE' && daysSinceReception > slaThreshold - 2) {
          level = 'orange';
          reason = 'Risk of delay';
        }
      }
      
      // Show assignedToName from currentHandler
      let assignedToName = 'Non assigné';
      if (b.currentHandler) {
        assignedToName = b.currentHandler.fullName;
      }
      
      return {
        bordereau: {
          ...b,
          teamName: b.team?.fullName || 'Non assigné',
          assignedToName
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
   * 2. Team overload detection
   */
  async getTeamOverloadAlerts(user: any) {
    this.checkAlertsRole(user);
    
    const chefs = await this.prisma.user.findMany({ 
      where: { role: 'CHEF_EQUIPE' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        capacity: true
      }
    });
    
    const overloads: any[] = [];
    
    for (const chef of chefs) {
      // Find gestionnaires using teamLeaderId relationship
      const gestionnaires = await this.prisma.user.findMany({
        where: { 
          teamLeaderId: chef.id,
          role: 'GESTIONNAIRE'
        },
        select: { id: true, capacity: true }
      });
      
      const gestionnaireIds = gestionnaires.map(g => g.id);
      
      const chefCapacity = chef.capacity || 0;
      const gestionnairesCapacity = gestionnaires.reduce((sum, g) => sum + (g.capacity || 0), 0);
      const totalCapacity = chefCapacity + gestionnairesCapacity;
      
      if (totalCapacity === 0) continue;
      
      const count = await this.prisma.bordereau.count({ 
        where: { 
          statut: { notIn: ['CLOTURE', 'PAYE'] },
          OR: [
            { teamId: chef.id },
            { currentHandlerId: { in: [chef.id, ...gestionnaireIds] } }
          ]
        }
      });
      
      const utilizationRate = (count / totalCapacity) * 100;
      const teamSize = 1 + gestionnaires.length;
      
      this.logger.log(`Team ${chef.fullName}: ${count} dossiers, ${totalCapacity} capacity (Chef: ${chefCapacity}, ${gestionnaires.length} gestionnaires: ${gestionnairesCapacity}), ${Math.round(utilizationRate)}% utilization`);
      
      if (utilizationRate > 120) {
        overloads.push({ 
          team: {
            id: chef.id,
            fullName: chef.fullName,
            email: chef.email,
            role: chef.role,
            createdAt: chef.createdAt,
            password: ''
          }, 
          count, 
          alert: 'red', 
          reason: `Surcharge critique: ${count} dossiers / ${totalCapacity} capacité (${teamSize} membres) - +${Math.round((count / totalCapacity - 1) * 100)}%` 
        });
      } else if (utilizationRate > 80) {
        overloads.push({ 
          team: {
            id: chef.id,
            fullName: chef.fullName,
            email: chef.email,
            role: chef.role,
            createdAt: chef.createdAt,
            password: ''
          }, 
          count, 
          alert: 'orange', 
          reason: `Charge élevée: ${count} dossiers / ${totalCapacity} capacité (${teamSize} membres) - ${Math.round(utilizationRate)}%` 
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
      
      this.logger.log(`📊 AI analyzing ${historicalData.length} bordereaux for predictions`);

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
      
      this.logger.log(`📊 Prepared ${trendData.length} days of historical data for AI analysis`);

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
        
        this.logger.log(`🤖 AI Forecast: ${JSON.stringify(forecast.forecast?.slice(0, 3))}`);
        this.logger.log(`📈 Trend: ${forecast.trend_direction}, Weekly prediction: ${this.calculateWeeklyPrediction(forecast.forecast || [])}`);
        
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
      const insights = this.generatePredictionInsights(
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
    this.logger.log(`📊 Calculated weekly prediction: ${weeklyPrediction} (avg daily: ${avgDaily.toFixed(2)})`);
    
    return Math.max(0, weeklyPrediction);
  }

  private generatePredictionInsights(weeklyPrediction: number, trendDirection: string, historicalData: any[], confidence: number): Array<{type: string; icon: string; message: string; action: string}> {
    const insights: Array<{type: string; icon: string; message: string; action: string}> = [];
    const avgHistorical = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const percentChange = ((weeklyPrediction / 7 - avgHistorical) / avgHistorical) * 100;

    // Workload insight
    if (weeklyPrediction > avgHistorical * 7 * 1.2) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `Charge prévue +${Math.round(percentChange)}% supérieure à la moyenne`,
        action: 'Prévoir des ressources supplémentaires'
      });
    } else if (weeklyPrediction < avgHistorical * 7 * 0.8) {
      insights.push({
        type: 'info',
        icon: '📉',
        message: `Charge prévue ${Math.round(Math.abs(percentChange))}% inférieure à la moyenne`,
        action: 'Opportunité pour formation ou maintenance'
      });
    } else {
      insights.push({
        type: 'success',
        icon: '✅',
        message: 'Charge prévue dans les normes habituelles',
        action: 'Maintenir les ressources actuelles'
      });
    }

    // Trend insight
    if (trendDirection === 'increasing') {
      insights.push({
        type: 'warning',
        icon: '📈',
        message: 'Tendance croissante détectée',
        action: 'Anticiper une augmentation continue'
      });
    } else if (trendDirection === 'decreasing') {
      insights.push({
        type: 'info',
        icon: '📉',
        message: 'Tendance décroissante observée',
        action: 'Charge de travail en diminution'
      });
    }

    // Confidence insight
    if (confidence < 0.6) {
      insights.push({
        type: 'warning',
        icon: '⚡',
        message: 'Prévision basée sur données limitées',
        action: 'Surveiller de près les variations'
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
   * 5b. Query alert history/trends
   */
  async getAlertHistory(query: any, user: any) {
    this.checkAlertsRole(user);
    const where: any = {};
    if (query.bordereauId) where.bordereauId = query.bordereauId;
    if (query.userId) where.userId = query.userId;
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
            client: true
          } 
        }, 
        document: true, 
        user: true 
      },
    });
    
    return alerts.map(alert => {
      let resolutionTime: number | null = null;
      if (alert.resolved && alert.resolvedAt) {
        // Calculate from bordereau dateReception to resolution
        const startTime = alert.bordereau?.dateReception 
          ? new Date(alert.bordereau.dateReception).getTime()
          : new Date(alert.createdAt).getTime();
        const endTime = new Date(alert.resolvedAt).getTime();
        const hours = Math.round((endTime - startTime) / (1000 * 60 * 60));
        resolutionTime = hours > 0 ? hours : null;
      }
      
      return {
        ...alert,
        clientName: alert.bordereau?.client?.name || null,
        bordereauReference: alert.bordereau?.reference || null,
        resolvedBy: alert.user?.fullName || (alert.userId ? 'Utilisateur' : null),
        resolutionTime
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
    
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Alerts by day
    const alertsByDay = await this.prisma.alertLog.groupBy({
      by: ['createdAt', 'alertLevel'],
      where: { createdAt: { gte: last7Days } },
      _count: { id: true }
    });
    
    // Process data for charts
    const dayMap = new Map();
    alertsByDay.forEach(item => {
      const date = new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!dayMap.has(date)) {
        dayMap.set(date, { date, critical: 0, warning: 0, normal: 0 });
      }
      const dayData = dayMap.get(date);
      if (item.alertLevel === 'red') dayData.critical += item._count.id;
      else if (item.alertLevel === 'orange') dayData.warning += item._count.id;
      else dayData.normal += item._count.id;
    });
    
    // Alerts by type
    const alertsByType = await this.prisma.alertLog.groupBy({
      by: ['alertType'],
      where: { createdAt: { gte: last7Days } },
      _count: { id: true }
    });
    
    const typeColors = {
      'SLA_BREACH': '#ff4d4f',
      'PERFORMANCE': '#faad14',
      'WORKLOAD': '#722ed1',
      'CLAIM': '#1890ff',
      'SYSTEM': '#52c41a'
    };
    
    return {
      alertsByDay: Array.from(dayMap.values()),
      alertsByType: alertsByType.map(item => ({
        name: item.alertType.replace('_', ' '),
        value: item._count.id,
        color: typeColors[item.alertType] || '#d9d9d9'
      })),
      slaComplianceChart: await this.generateSlaComplianceChart(last7Days)
    };
  }
}
