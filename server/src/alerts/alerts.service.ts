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
    // AI service completely disabled - use fallback only
    this.logger.log('Using fallback SLA prediction (AI service disabled)');
    return this.getBasicSlaPrediction(items);
  }

  /**
   * Fallback SLA prediction when AI service is unavailable
   */
  private getBasicSlaPrediction(items: any[]) {
    return {
      sla_predictions: items.map(item => {
        const now = new Date();
        const deadline = new Date(item.deadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const progress = item.current_progress || 0;
        const total = item.total_required || 1;
        const progressRatio = progress / total;
        
        let risk = '🟢';
        let score = 0;
        
        if (daysLeft <= 0) {
          risk = '🔴';
          score = 1.0;
        } else if (daysLeft <= 2 || progressRatio < 0.5) {
          risk = '🔴';
          score = 0.9;
        } else if (daysLeft <= 5 || progressRatio < 0.7) {
          risk = '🟠';
          score = 0.6;
        }
        
        return {
          id: item.id,
          risk,
          score,
          days_left: daysLeft,
          explanation: `${daysLeft} jours restants, progression: ${Math.round(progressRatio * 100)}%`
        };
      })
    };
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
    } else if (user.role === 'CHEF_EQUIPE') {
      where.teamId = user.id;
    }
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: { 
        courriers: true, 
        virement: true, 
        contract: true, 
        client: true,
        currentHandler: true,
        team: true
      },
      orderBy: { createdAt: 'desc' },
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
      
      return {
        bordereau: b,
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
    
    return alerts;
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
    return 5; // Default 5 days
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
    // Example: count open bordereaux per team
    const teams = await this.prisma.user.findMany({ where: { role: 'CHEF_EQUIPE' } });
    const overloads: {
      team: {
        role: string;
        createdAt: Date;
        id: string;
        email: string;
        password: string;
        fullName: string;
      };
      count: number;
      alert: string;
      reason: string;
    }[] = [];
    for (const team of teams) {
      const count = await this.prisma.bordereau.count({ where: { statut: { not: 'CLOTURE' }, teamId: team.id } });
      if (count > 50) {
        overloads.push({ team, count, alert: 'red', reason: 'Team overloaded' });
        await this.notifyRole('SUPERVISOR', { team, count, alert: 'red', reason: 'Team overloaded' });
      } else if (count > 30) {
        overloads.push({ team, count, alert: 'orange', reason: 'Team at risk' });
        await this.notifyRole('TEAM_LEADER', { team, count, alert: 'orange', reason: 'Team at risk' });
      }
    }
    return overloads;
  }

  /**
   * 3. Reclamation-based alerts
   */
  async getReclamationAlerts(user: any) {
    this.checkAlertsRole(user);
    // Find all courriers of type RECLAMATION
    const reclamations = await this.prisma.courrier.findMany({ where: { type: 'RECLAMATION' }, orderBy: { createdAt: 'desc' } });
    for (const r of reclamations) {
      await this.notifyRole('SUPERVISOR', {
        reclamation: r,
        alert: 'red',
        reason: 'Reclamation logged',
        status: r.status,
      });
    }
    return reclamations.map(r => ({
      reclamation: r,
      alert: 'red',
      reason: 'Reclamation logged',
      status: r.status,
    }));
  }

  /**
   * AI-powered delay prediction and smart recommendations
   */
  async getDelayPredictions(user: any) {
    this.checkAlertsRole(user);
    
    try {
      // Get historical data for AI analysis
      const historicalData = await this.prisma.bordereau.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        include: { client: true, contract: true },
        orderBy: { createdAt: 'asc' }
      });

      // Prepare data for AI trend forecasting
      const trendData = historicalData.map(b => ({
        date: b.createdAt.toISOString().split('T')[0],
        value: this.calculateProcessingTime(b)
      }));

      // AI service completely disabled - use fallback only
      this.logger.log('Using fallback predictions (AI service disabled)');
      const forecast = { 
        forecast: [],
        trend_direction: 'stable',
        model_performance: { trend_strength: 0.5 }
      };
      const recommendationsResponse = { data: { decisions: [] } };

      return {
        forecast: forecast.forecast || [],
        trend_direction: forecast.trend_direction || 'stable',
        recommendations: recommendationsResponse.data.decisions || [],
        ai_confidence: forecast.model_performance?.trend_strength || 0.5,
        next_week_prediction: this.calculateWeeklyPrediction(forecast.forecast)
      };
    } catch (error) {
      this.logger.error('AI delay prediction failed:', error.response?.data || error.message);
      return this.getFallbackPredictions();
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
    const teams = await this.prisma.user.count({
      where: { role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] } }
    });
    return { total_capacity: teams * 10 }; // Assume 10 bordereaux per person
  }

  private calculateWeeklyPrediction(forecast: any[]): number {
    if (!forecast || forecast.length === 0) return 0;
    return forecast.reduce((sum, f) => sum + (f.predicted_value || 0), 0);
  }

  private getFallbackPredictions() {
    return {
      forecast: [],
      trend_direction: 'stable',
      recommendations: [{
        action: 'monitor_workload',
        priority: 'medium',
        reasoning: 'AI service unavailable - manual monitoring recommended'
      }],
      ai_confidence: 0,
      next_week_prediction: 0
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
    // Log alert event
    await this.prisma.alertLog.create({
      data: {
        bordereauId: alert.bordereau?.id || alert.bordereauId,
        documentId: alert.documentId,
        userId: alert.userId,
        alertType: alert.type || 'GENERIC',
        alertLevel: alert.alertLevel || alert.level || 'info',
        message,
        notifiedRoles: [role],
      },
    });
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
    return this.prisma.alertLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { bordereau: true, document: true, user: true },
    });
  }

  /**
   * 5c. Mark alert as resolved
   */
  async resolveAlert(alertId: string, user: any) {
    this.checkAlertsRole(user);
    return this.prisma.alertLog.update({
      where: { id: alertId },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }

  /**
   * 6. Prioritization of high-risk bordereaux
   */
  async getPriorityList(user: any) {
    this.checkAlertsRole(user);
    // List bordereaux with red/orange alerts, sorted by risk
    const alerts = await this.getAlertsDashboard({}, user);
    return alerts.filter(a => a.alertLevel !== 'green').sort((a, b) => (a.alertLevel === 'red' ? -1 : 1));
  }

  /**
   * 7. Comparative analytics (planned vs actual)
   */
  async getComparativeAnalytics(user: any) {
    this.checkAlertsRole(user);
    // Compare planned (forecast) vs actual
    const data = await this.getDelayPredictions(user);
    // Actual processed in last 7 days
    const actual = data.next_week_prediction; // For demo, use forecast as actual
    const planned = data.next_week_prediction;
    return {
      planned,
      actual,
      gap: planned - actual,
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
    } else if (user.role === 'CHEF_EQUIPE') {
      const teamMembers = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE' },
        select: { id: true }
      });
      whereClause.userId = { in: teamMembers.map(m => m.id) };
    }
    
    // Get total active alerts
    const totalAlerts = await this.prisma.alertLog.count({
      where: { resolved: false, ...whereClause }
    });
    
    // Get critical alerts
    const criticalAlerts = await this.prisma.alertLog.count({
      where: { resolved: false, alertLevel: 'red', ...whereClause }
    });
    
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
      let slaThreshold = 5;
      if (b.contract?.delaiReglement) slaThreshold = b.contract.delaiReglement;
      else if (b.client?.reglementDelay) slaThreshold = b.client.reglementDelay;
      
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
    } else if (user.role === 'CHEF_EQUIPE') {
      // Get alerts for team members
      const teamMembers = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE' },
        select: { id: true }
      });
      where.userId = { in: teamMembers.map(m => m.id) };
    }
    
    return this.prisma.alertLog.findMany({
      where,
      include: { bordereau: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
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
      slaComplianceChart: Array.from(dayMap.values()).map(day => ({
        date: day.date,
        compliance: Math.max(0, 100 - (day.critical * 10 + day.warning * 5))
      }))
    };
  }
}
