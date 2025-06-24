import {
  Controller,
  Get,
  Query,
  Req,
  Param,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsKpiDto } from './dto/analytics-kpi.dto';
import { AnalyticsPerformanceDto } from './dto/analytics-performance.dto';
import { AnalyticsExportDto } from './dto/analytics-export.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}




@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}



  // --- New Analytics Endpoints ---

  @Get('sla-compliance-by-user')
  async getSlaComplianceByUser(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getSlaComplianceByUser(user, query);
  }

  @Get('reclamation-performance')
  async getReclamationPerformance(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getReclamationPerformance(user, query);
  }

  @Get('client-dashboard')
  async getClientDashboard(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getClientDashboard(user, query);
  }

  @Get('user-daily-target')
  async getUserDailyTargetAnalysis(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getUserDailyTargetAnalysis(user, query);
  }

  @Get('priority-scoring')
  async getPriorityScoring(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getPriorityScoring(user, query);
  }

  @Get('comparative-analysis')
  async getComparativeAnalysis(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getComparativeAnalysis(user, query);
  }

  @Get('sla-trend')
  async getSlaTrend(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getSlaTrend(user, query);
  }

  @Get('alert-escalation-flag')
  async getAlertEscalationFlag(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getAlertEscalationFlag(user);
  }

  @Get('recommendations/enhanced')
  async getEnhancedRecommendations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getEnhancedRecommendations(user);
  }
  
  // Courrier analytics endpoints

  @Get('courriers/volume')
  async getCourrierVolume(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCourrierVolume(user);
  }

  @Get('courriers/sla-breaches')
  async getCourrierSlaBreaches(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCourrierSlaBreaches(user);
  }

  @Get('courriers/recurrence')
  async getCourrierRecurrence(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCourrierRecurrence(user);
  }

  @Get('courriers/escalations')
  async getCourrierEscalations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCourrierEscalations(user);
  }

  @Get('kpis/daily')
  async getDailyKpis(@Query() query: AnalyticsKpiDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    // Validate input
    if (query.fromDate && isNaN(Date.parse(query.fromDate))) throw new Error('Invalid fromDate');
    if (query.toDate && isNaN(Date.parse(query.toDate))) throw new Error('Invalid toDate');
    return this.analyticsService.getDailyKpis(query, user);
  }

  @Get('performance/by-user')
  async getPerformanceByUser(@Query() query: AnalyticsPerformanceDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getPerformance(query, user);
  }

  @Get('alerts')
  async getAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getAlerts(user);
  }

  @Get('recommendations')
  async getRecommendations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getRecommendations(user);
  }

  @Get('trends')
  async getTrends(@Query('period') period: 'day'|'week'|'month', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getTrends(user, period);
  }

  @Get('forecast')
  async getForecast(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getForecast(user);
  }

  @Get('staffing')
  async getStaffing(@Req() req: any) {
    const user = getUserFromRequest(req);
    const rec = await this.analyticsService.getRecommendations(user);
    return { neededStaff: rec.neededStaff, recommendation: rec.recommendation };
  }

  @Get('throughput-gap')
  async getThroughputGap(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getThroughputGap(user);
  }

  @Get('export')
  async exportAnalytics(@Query() query: AnalyticsExportDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.exportAnalytics(query, user);
  }

  @Get('traceability/:bordereauId')
  async getTraceability(@Param('bordereauId') bordereauId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getTraceability(bordereauId, user);
  }
}
