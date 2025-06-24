import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsKpiDto } from './dto/analytics-kpi.dto';
import { AnalyticsPerformanceDto } from './dto/analytics-performance.dto';
import { AnalyticsExportDto } from './dto/analytics-export.dto';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import PDFDocument from 'pdfkit';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8001';


@Injectable()
export class AnalyticsService {
  async estimateResources(filters: any, user: any) {
    this.checkAnalyticsRole(user);
    // Implement your logic to estimate resources based on filters
    // This is a placeholder implementation
    const estimatedResources = await this.prisma.bordereau.count({
        where: filters,
    });
    return estimatedResources; // Return the estimated resources
}


async getPlannedPerformance(filters: any, user: any) {
    this.checkAnalyticsRole(user);
    // Implement your logic to get planned performance based on filters
    // This is a placeholder implementation
    const plannedPerformance = await this.prisma.bordereau.count({
        where: filters,
    });
    return plannedPerformance; // Return the planned performance
}

async getActualPerformance(filters: any, user: any) {
    this.checkAnalyticsRole(user);
    // Implement your logic to get actual performance based on filters
    // This is a placeholder implementation
    const actualPerformance = await this.prisma.bordereau.count({
        where: filters,
    });
    return actualPerformance; // Return the actual performance
}

  async getFilteredKpis(filters: any, user: any) {
    this.checkAnalyticsRole(user);
    const where: any = {};
    
    // Apply filters
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.managerId) where.managerId = filters.managerId;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.date) {
        where.createdAt = {};
        if (filters.date.gte) where.createdAt.gte = filters.date.gte;
        if (filters.date.lte) where.createdAt.lte = filters.date.lte;
    }

    // Fetch KPIs based on filters
    const kpis = await this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where,
    });

    return kpis;
}

  constructor(private prisma: PrismaService) {}

  // --- AI Integration ---
  async getPrioritiesAI(items: any[]) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/priorities`, items);
      return response.data;
    } catch (error) {
      throw new Error('AI priorities failed: ' + error.message);
    }
  }

  async getReassignmentAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/reassignment`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI reassignment failed: ' + error.message);
    }
  }

  async getPerformanceAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/performance`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI performance failed: ' + error.message);
    }
  }

  async getComparePerformanceAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/compare_performance`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI compare performance failed: ' + error.message);
    }
  }

  async getDiagnosticOptimisationAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/diagnostic_optimisation`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI diagnostic optimisation failed: ' + error.message);
    }
  }

  async getPredictResourcesAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/predict_resources`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI predict resources failed: ' + error.message);
    }
  }

  private checkAnalyticsRole(user: any) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'SCAN', 'BO', 'GESTIONNAIRE'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
  }

  async getDailyKpis(query: AnalyticsKpiDto, user: any) {
    this.checkAnalyticsRole(user);
    const where: any = {};
    if (query.teamId) where.teamId = query.teamId;
    if (query.userId) where.userId = query.userId;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }
    // Only include non-deleted bordereaux
    //where.deletedAt = null;
    const bsPerDay = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where,
    });
    const avgDelay = await this.prisma.bordereau.aggregate({
      _avg: { delaiReglement: true },
      where,
    });
    return {
      bsPerDay,
      avgDelay: avgDelay._avg.delaiReglement,
    };
  }

  async getPerformance(query: AnalyticsPerformanceDto, user: any) {
    this.checkAnalyticsRole(user);
    const where: any = {};
    if (query.teamId) where.teamId = query.teamId;
    if (query.userId) where.userId = query.userId;
    if (query.role) where.role = query.role;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }
    const processedByUser = await this.prisma.bordereau.groupBy({
      by: ['clientId'],
      _count: { id: true },
      where,
    });
    const slaCompliant = await this.prisma.bordereau.count({
      where: { ...where, delaiReglement: { lte: 3 } },
    });
    return {
      processedByUser,
      slaCompliant,
    };
  }

  async getAlerts(user: any) {
    this.checkAnalyticsRole(user);
    // Color-coded alerts: green (ok), orange (warning), red (critical)
    const critical = await this.prisma.bordereau.findMany({
      where: { delaiReglement: { gt: 5 } },
    });
    const warning = await this.prisma.bordereau.findMany({
      where: { delaiReglement: { gt: 3, lte: 5 } },
    });
    const ok = await this.prisma.bordereau.findMany({
      where: { delaiReglement: { lte: 3 } },
    });
    // Add statusLevel to each item
    const colorize = (arr, level) => arr.map(item => ({ ...item, statusLevel: level }));
    return {
      critical: colorize(critical, 'red'),
      warning: colorize(warning, 'orange'),
      ok: colorize(ok, 'green'),
    };
  }

  // --- SLA Compliance Rate by User ---
  async getSlaComplianceByUser(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    // Optionally filter by team, date, etc.
    const where: any = {};
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    // Group by userId
    try {
      const users = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId'] as any,
        _count: { id: true },
        where,
      });
      const sla = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId'] as any,
        where: { ...where, delaiReglement: { lte: 3 } },
        _count: { id: true },
      });
      // Map assignedToUserId to compliance %
      const slaMap = Object.fromEntries(sla.map((u: any) => [u.assignedToUserId, u._count?.id ?? 0]));
      return users.map((u: any) => ({
        userId: u.assignedToUserId,
        total: u._count?.id ?? 0,
        slaCompliant: slaMap[u.assignedToUserId] || 0,
        complianceRate: (u._count?.id ?? 0) ? Math.round(100 * (slaMap[u.assignedToUserId] || 0) / (u._count?.id ?? 1)) : 0,
      }));
    } catch (err) {
      console.error('getSlaComplianceByUser error:', err);
      throw new Error('Failed to get SLA compliance by user');
    }
  }

  // --- Reclamation Performance Analysis ---
  async getReclamationPerformance(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    // Group by user for courriers of type RECLAMATION
    const where: any = { type: 'RECLAMATION' };
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    const byUser = await this.prisma.courrier.groupBy({
      by: ['uploadedById'] as any,
      _count: { id: true },
      where,
    });
    // Sort descending by count
    return (byUser as any[]).sort((a, b) => (b._count?.id ?? 0) - (a._count?.id ?? 0));
  }

  // --- Client-wise SLA/Volume Dashboard ---
  async getClientDashboard(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    // Volume
    const volume = await this.prisma.bordereau.count({ where });
    // SLA compliance
    const sla = await this.prisma.bordereau.count({
      where: { ...where, delaiReglement: { lte: 3 } },
    });
    // SLA breaches
    const breaches = await this.prisma.bordereau.count({
      where: { ...where, delaiReglement: { gt: 3 } },
    });
    return {
      clientId: filters.clientId,
      volume,
      slaCompliant: sla,
      slaBreaches: breaches,
      complianceRate: volume ? Math.round(100 * sla / volume) : 0,
    };
  }

  // --- Per-user Daily Target Analysis ---
  async getUserDailyTargetAnalysis(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    // Target: 20 BS/day/user (example)
    const target = filters.target || 20;
    const where: any = {};
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    // Group by user and day
    try {
      const byUserDay = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId', 'createdAt'] as any,
        _count: { id: true },
        where,
      });
      // Aggregate per user
      const userMap: Record<string, { userId: string, days: number, total: number }> = {};
      for (const row of byUserDay as any[]) {
        if (!row.assignedToUserId) continue;
        if (!userMap[row.assignedToUserId]) userMap[row.assignedToUserId] = { userId: row.assignedToUserId, days: 0, total: 0 };
        userMap[row.assignedToUserId].days += 1;
        userMap[row.assignedToUserId].total += row._count?.id ?? 0;
      }
      return Object.values(userMap).map((u: any) => ({
        userId: u.userId,
        avgPerDay: u.days ? u.total / u.days : 0,
        target,
        meetsTarget: u.days ? (u.total / u.days) >= target : false,
      }));
    } catch (err) {
      console.error('getUserDailyTargetAnalysis error:', err);
      throw new Error('Failed to get user daily target analysis');
    }
  }

  // --- Priority Scoring by IA (simple heuristic) ---
  async getPriorityScoring(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    // Example: score = SLA breach + montant + age + relances
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    const items = await this.prisma.bordereau.findMany({ where, include: { client: true, contract: true } });
    // For each, compute score
    const now = new Date();
    return await Promise.all(items.map(async item => {
      let score = 0;
      let slaThreshold = 5;
      if (item.contract && typeof item.contract.delaiReglement === 'number') slaThreshold = item.contract.delaiReglement;
      else if (item.client && typeof item.client.reglementDelay === 'number') slaThreshold = item.client.reglementDelay;
      const daysSinceReception = item.dateReception ? (now.getTime() - new Date(item.dateReception).getTime()) / (1000 * 60 * 60 * 24) : 0;
      if (daysSinceReception > slaThreshold) score += 2;
      else if (daysSinceReception > slaThreshold - 2) score += 1;
      // montant scoring removed: field does not exist in model
      // Count relances (if model supports it)
      let relances = 0;
      if (item.id) {
        relances = await this.prisma.courrier.count({ where: { bordereauId: item.id, type: 'RELANCE' } });
        score += Math.min(relances, 2);
      }
      // Age in days
      score += Math.min(Math.floor(daysSinceReception / 7), 3); // up to +3 for age
      return { ...item, priorityScore: score, daysSinceReception, slaThreshold, relances };
    }));
  }

  // --- Historical Comparative Analysis ---
  async getComparativeAnalysis(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    // Compare two periods
    const { period1, period2 } = filters;
    if (!period1 || !period2) throw new Error('Both periods required');
    const getStats = async (period: any) => {
      const where: any = {};
      if (period.fromDate) where.createdAt = { ...where.createdAt, gte: new Date(period.fromDate) };
      if (period.toDate) where.createdAt = { ...where.createdAt, lte: new Date(period.toDate) };
      const total = await this.prisma.bordereau.count({ where });
      const sla = await this.prisma.bordereau.count({ where: { ...where, delaiReglement: { lte: 3 } } });
      return { total, sla };
    };
    const stats1 = await getStats(period1);
    const stats2 = await getStats(period2);
    return { period1: stats1, period2: stats2 };
  }

  // --- SLA Trend Over Time ---
  async getSlaTrend(user: any, filters: any = {}) {
    this.checkAnalyticsRole(user);
    const where: any = {};
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    // Group by day
    const all = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where,
    });
    const sla = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      where: { ...where, delaiReglement: { lte: 3 } },
      _count: { id: true },
    });
    // Map date to SLA compliance rate
    const slaMap = Object.fromEntries(sla.map(d => [d.createdAt.toISOString().slice(0,10), d._count.id]));
    return all.map(d => ({
      date: d.createdAt.toISOString().slice(0,10),
      total: d._count.id,
      slaCompliant: slaMap[d.createdAt.toISOString().slice(0,10)] || 0,
      complianceRate: d._count.id ? Math.round(100 * (slaMap[d.createdAt.toISOString().slice(0,10)] || 0) / d._count.id) : 0,
    }));
  }

  // --- Alert Escalation System (flag only) ---
  async getAlertEscalationFlag(user: any) {
    this.checkAnalyticsRole(user);
    // If any red alert, flag escalation
    const critical = await this.prisma.bordereau.count({ where: { delaiReglement: { gt: 5 } } });
    return { escalate: critical > 0 };
  }

  // --- Enhanced Recommendations ---
  async getEnhancedRecommendations(user: any) {
    this.checkAnalyticsRole(user);
    const rec = await this.getRecommendations(user);
    // Add more detailed tips
    let tips: string[] = [];
    if (rec.neededStaff > 10) tips.push('Consider hiring more staff or redistributing workload.');
    if (rec.forecast.nextWeekForecast > 100) tips.push('Prepare for high volume next week.');
    if (rec.forecast.slope > 2) tips.push('Volume is increasing rapidly. Investigate causes.');
    if (rec.forecast.slope < -2) tips.push('Volume is dropping. Check for process issues or seasonality.');
    if (tips.length === 0) tips.push('No immediate optimization needed.');
    return { ...rec, tips };
  }

  async getRecommendations(user: any) {
    this.checkAnalyticsRole(user);
    const forecast = await this.getForecast(user);
    const avgPerStaff = 20;
    const neededStaff = Math.ceil(forecast.nextWeekForecast / avgPerStaff);
    let recommendation = 'All OK';
    if (neededStaff > 10) recommendation = `Increase staff to at least ${neededStaff}`;
    return {
      forecast,
      neededStaff,
      recommendation,
    };
  }

  async getTrends(user: any, period: 'day'|'week'|'month' = 'day') {
    this.checkAnalyticsRole(user);
    let groupBy: any = 'createdAt';
    if (period === 'week') groupBy = { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } };
    if (period === 'month') groupBy = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
    const data = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return data.map(d => ({ date: d.createdAt, count: d._count.id }));
  }

  async getForecast(user: any) {
    this.checkAnalyticsRole(user);
    const data = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
      where: { createdAt: { gte: new Date(Date.now() - 30*24*60*60*1000) } },
    });
    const xs = data.map((d, i) => i);
    const ys = data.map(d => d._count.id);
    const n = xs.length;
    const sumX = xs.reduce((a,b) => a+b, 0);
    const sumY = ys.reduce((a,b) => a+b, 0);
    const sumXY = xs.reduce((a,b,i) => a + b*ys[i], 0);
    const sumXX = xs.reduce((a,b) => a + b*b, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX || 1);
    const intercept = (sumY - slope*sumX) / (n || 1);
    const nextWeekForecast = Array.from({length:7}).map((_,i) => slope*(n+i) + intercept).reduce((a,b) => a+b, 0);
    return {
      slope,
      intercept,
      nextWeekForecast: Math.round(nextWeekForecast),
      history: data.map((d,i) => ({ day: i, count: d._count.id })),
    };
  }

  async getThroughputGap(user: any) {
    this.checkAnalyticsRole(user);
    const forecast = await this.getForecast(user);
    const actual = forecast.history.slice(-7).reduce((a,b) => a+b.count, 0);
    const planned = forecast.nextWeekForecast;
    return {
      planned,
      actual,
      gap: planned - actual,
    };
  }

  async exportAnalytics(query: AnalyticsExportDto, user: any) {
    this.checkAnalyticsRole(user);
    const kpis = await this.getDailyKpis(query, user);
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    if (query.format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('KPIs');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 18 },
        { header: 'BS Count', key: 'bsCount', width: 12 },
        { header: 'Avg Delay', key: 'avgDelay', width: 12 },
      ];
      for (const k of kpis.bsPerDay) {
        sheet.addRow({
          date: k.createdAt.toISOString().slice(0, 10),
          bsCount: k._count.id,
          avgDelay: kpis.avgDelay,
        });
      }
      const filePath = path.join(exportsDir, `analytics_${Date.now()}.xlsx`);
      await workbook.xlsx.writeFile(filePath);
      return { filePath };
    } else if (query.format === 'csv') {
      // Real CSV export using fast-csv
      const filePath = path.join(exportsDir, `analytics_${Date.now()}.csv`);
      const ws = fs.createWriteStream(filePath);
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(ws);
      for (const k of kpis.bsPerDay) {
        csvStream.write({
          Date: k.createdAt.toISOString().slice(0, 10),
          'BS Count': k._count.id,
          'Avg Delay': kpis.avgDelay,
        });
      }
      csvStream.end();
      await new Promise<void>((resolve, reject) => {
  ws.on('finish', () => resolve());
  ws.on('error', (err) => reject(err));
});
      return { filePath };
    } else if (query.format === 'pdf') {
      // Real PDF export using pdfkit
      const filePath = path.join(exportsDir, `analytics_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const ws = fs.createWriteStream(filePath);
      doc.pipe(ws);

      doc.fontSize(18).text('KPI Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      // Table header
      doc.text('Date', 50, doc.y, { continued: true, width: 100 });
      doc.text('BS Count', 150, doc.y, { continued: true, width: 100 });
      doc.text('Avg Delay', 250, doc.y, { width: 100 });
      doc.moveDown(0.5);

      // Table rows
      for (const k of kpis.bsPerDay) {
        doc.text(k.createdAt.toISOString().slice(0, 10), 50, doc.y, { continued: true, width: 100 });
        doc.text(String(k._count.id), 150, doc.y, { continued: true, width: 100 });
        doc.text(String(kpis.avgDelay), 250, doc.y, { width: 100 });
        doc.moveDown(0.2);
      }

      doc.end();
      await new Promise<void>((resolve, reject) => {
  ws.on('finish', () => resolve());
  ws.on('error', (err) => reject(err));
});
      return { filePath };
    }
    throw new Error('Invalid export format');
  }

  async getTraceability(bordereauId: string, user: any) {
    this.checkAnalyticsRole(user);
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        documents: true,
        courriers: true,
        virement: true,
      },
    });
    return bordereau;
  }

  // --- Courrier Analytics ---

  async getCourrierVolume(user: any) {
    this.checkAnalyticsRole(user);
    // By status
    const byStatus = await this.prisma.courrier.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    // By type
    const byType = await this.prisma.courrier.groupBy({
      by: ['type'],
      _count: { id: true },
    });
    // By user
    const byUser = await this.prisma.courrier.groupBy({
      by: ['uploadedById'],
      _count: { id: true },
    });
    return { byStatus, byType, byUser };
  }

  async getCourrierSlaBreaches(user: any) {
    this.checkAnalyticsRole(user);
    // Example: SLA = responded after 3 days or still pending after 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const pending = await this.prisma.courrier.findMany({
      where: {
        status: 'PENDING_RESPONSE',
        sentAt: { lte: threeDaysAgo },
      },
    });
    // Fetch all responded courriers and filter in JS for late responses
    const responded = await this.prisma.courrier.findMany({
      where: {
        status: 'RESPONDED',
        sentAt: { not: null },
        responseAt: { not: null },
      },
      select: { id: true, sentAt: true, responseAt: true, subject: true },
    });
    const lateResponses = responded.filter(c =>
      c.sentAt && c.responseAt && (c.responseAt.getTime() > c.sentAt.getTime() + 3 * 24 * 60 * 60 * 1000)
    );
    return { pending, lateResponses };
  }

  async getCourrierRecurrence(user: any) {
    this.checkAnalyticsRole(user);
    // Count relances per bordereau or client
    const relances = await this.prisma.courrier.groupBy({
      by: ['bordereauId'],
      where: { type: 'RELANCE' },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    // Count reclamations per client
    const reclamations = await this.prisma.courrier.groupBy({
      by: ['bordereauId'],
      where: { type: 'RECLAMATION' },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    return { relances, reclamations };
  }

  async getCourrierEscalations(user: any) {
    this.checkAnalyticsRole(user);
    // Escalation: relances with more than 2 attempts or status escalated
    const escalatedRelances = await this.prisma.courrier.groupBy({
      by: ['bordereauId'],
      where: { type: 'RELANCE' },
      _count: { id: true },
      having: { id: { _count: { gt: 2 } } },
    });
    // Escalated by status (FAILED)
    const failed = await this.prisma.courrier.findMany({
      where: { status: 'FAILED' },
    });
    return { escalatedRelances, failed };
  }
}