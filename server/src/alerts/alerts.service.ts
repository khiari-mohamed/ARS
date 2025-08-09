import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { OutlookService } from '../integrations/outlook.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8001';

@Injectable()
export class AlertsService {
  triggerAlert(arg0: { type: string; bsId: string; }) {
    throw new Error('Method not implemented.');
  }
  constructor(private prisma: PrismaService, private readonly outlook: OutlookService) {}



    /**
   * AI-powered SLA prediction
   */
  async getSlaPredictionAI(items: any[]) {
    // items: [{ id, start_date, deadline, current_progress, total_required, sla_days }]
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, items);
      return response.data;
    } catch (error) {
      throw new Error('AI SLA prediction failed: ' + error.message);
    }
  } 
  // Allow all authenticated users to access dashboard alerts
  private checkAlertsRole(user: any) {
    // Implement role-based access if needed
    // Example: restrict access to certain roles
    return; // Currently allows all authenticated users
  }

  /**
   * 1. Real-time and predictive alerts (SLA, delay, overload, reclamation)
   * Includes escalation and notification logic.
   */
  async getAlertsDashboard(query: AlertsQueryDto, user: any) {
    this.checkAlertsRole(user);
    // Get all bordereaux in scope
    const where: any = {};
    if (query.teamId) where.teamId = query.teamId;
    if (query.userId) where.clientId = query.userId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }
    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: { courriers: true, virement: true, contract: true, client: true },
      orderBy: { createdAt: 'desc' },
    });

    // Color code and alert logic
    const now = new Date();
    const alerts = bordereaux.map(b => {
      const daysSinceReception = b.dateReception ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24) : 0;
      let level: 'green' | 'orange' | 'red' = 'green';
      let reason = 'On time';
      // Use SLA threshold from client or contract if available
      let slaThreshold = 5;
      if (b.contract && typeof b.contract.delaiReglement === 'number') slaThreshold = b.contract.delaiReglement;
      else if (b.client && typeof b.client.reglementDelay === 'number') slaThreshold = b.client.reglementDelay;
      if (b.statut !== 'CLOTURE' && daysSinceReception > slaThreshold) {
        level = 'red';
        reason = 'SLA breach';
      } else if (b.statut !== 'CLOTURE' && daysSinceReception > slaThreshold - 2) {
        level = 'orange';
        reason = 'Risk of delay';
      }
      return {
        bordereau: b,
        alertLevel: level,
        reason,
        slaThreshold,
        daysSinceReception,
      };
    });

    // Escalation logic: notify roles based on alert level (safe parallel execution for demo)
    await Promise.allSettled(alerts.map(async (alert) => {
    try {
    if (alert.alertLevel === 'red') {
    await this.notifyRole('SUPERVISOR', alert);
    } else if (alert.alertLevel === 'orange') {
    await this.notifyRole('TEAM_LEADER', alert);
    } else if (alert.alertLevel === 'green') {
    await this.notifyRole('MANAGER', alert);
    }
    } catch (e) {
    console.error('Notification error:', e);
    }
    }));
    
    return alerts;
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
   * 4. AI-powered delay prediction and recommendations
   */
  async getDelayPredictions(user: any) {
    this.checkAlertsRole(user);
    // Use simple regression on last 30 days
    const data = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });
    const xs = data.map((d, i) => i);
    const ys = data.map(d => d._count.id);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
    const sumXX = xs.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / (n || 1);
    // Predict next 7 days
    const nextWeekForecast = Array.from({ length: 7 }).map((_, i) => slope * (n + i) + intercept).reduce((a, b) => a + b, 0);
    let recommendation = 'All OK';
    if (nextWeekForecast > 100) recommendation = 'Increase staff or reallocate workload';
    return {
      slope,
      intercept,
      nextWeekForecast: Math.round(nextWeekForecast),
      recommendation,
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
    const actual = data.nextWeekForecast; // For demo, use forecast as actual
    const planned = data.nextWeekForecast;
    return {
      planned,
      actual,
      gap: planned - actual,
    };
  }

  /**
   * 8. KPI Dashboard Data
   */
  async getAlertsKPI(user: any) {
    this.checkAlertsRole(user);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get total active alerts
    const totalAlerts = await this.prisma.alertLog.count({
      where: { resolved: false }
    });
    
    // Get critical alerts
    const criticalAlerts = await this.prisma.alertLog.count({
      where: { resolved: false, alertLevel: 'red' }
    });
    
    // Get resolved today
    const resolvedToday = await this.prisma.alertLog.count({
      where: {
        resolved: true,
        resolvedAt: { gte: today }
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
    
    return this.prisma.alertLog.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        resolved: false
      },
      include: { bordereau: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
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
