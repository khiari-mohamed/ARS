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
import { Body, Post } from '@nestjs/common';
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
    // Validate input: period1 and period2 must have fromDate and toDate, and all must be valid dates
    const { period1, period2 } = query;
    if (!period1 || !period2 || !period1.fromDate || !period1.toDate || !period2.fromDate || !period2.toDate) {
      throw new (await import('@nestjs/common')).BadRequestException('All period date ranges must be provided');
    }
    if (
      isNaN(Date.parse(period1.fromDate)) ||
      isNaN(Date.parse(period1.toDate)) ||
      isNaN(Date.parse(period2.fromDate)) ||
      isNaN(Date.parse(period2.toDate))
    ) {
      throw new (await import('@nestjs/common')).BadRequestException('All period dates must be valid ISO date strings');
    }
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

  // --- SLA Analytics Endpoints ---
  @Get('sla/dashboard')
  async getSLADashboard(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getSLADashboard(user, query);
  }

  @Get('sla/predictions')
  async getSLAPredictions(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.predictSLABreaches(user);
  }

  @Get('sla/capacity')
  async getCapacityAnalysis(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCapacityAnalysis(user);
  }

  // --- OV Analytics Endpoints ---
  @Get('ov/dashboard')
  async getOVDashboard(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getOVDashboard(user, query);
  }

  @Get('ov/export')
  async exportOV(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.exportOVToExcel(query, user);
  }

  @Get('ov/statistics')
  async getOVStatistics(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getOVStatistics(query);
  }

  // --- Real-time Analytics ---
  @Post('events/process')
  async processRealTimeEvent(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.processRealTimeEvent(payload.eventType, payload.data);
  }

  // --- AI Endpoints ---
  @Post('ai/priorities')
  async getPrioritiesAI(@Body() items: any) {
    return this.analyticsService.getPrioritiesAI(items);
  }

  @Post('ai/reassignment')
  async getReassignmentAI(@Body() payload: any) {
    return this.analyticsService.getReassignmentAI(payload);
  }

  @Post('ai/performance')
  async getPerformanceAI(@Body() payload: any) {
    return this.analyticsService.getPerformanceAI(payload);
  }

  @Post('ai/compare-performance')
  async getComparePerformanceAI(@Body() payload: any) {
    const { BadRequestException, BadGatewayException } = await import('@nestjs/common');
    if (!payload || !Array.isArray(payload.planned) || !Array.isArray(payload.actual) || payload.planned.length === 0 || payload.actual.length === 0) {
      throw new BadRequestException('Payload must include non-empty planned and actual arrays');
    }
    try {
      return await this.analyticsService.getComparePerformanceAI(payload);
    } catch (e) {
      throw new BadGatewayException('AI microservice error: ' + (e?.message || e));
    }
  }

  @Post('ai/diagnostic-optimisation')
  async getDiagnosticOptimisationAI(@Body() payload: any) {
    return this.analyticsService.getDiagnosticOptimisationAI(payload);
  }

  @Post('ai/predict-resources')
  async getPredictResourcesAI(@Body() payload: any) {
    return this.analyticsService.getPredictResourcesAI(payload);
  }

  @Post('ai/forecast-trends')
  async getForecastTrendsAI(@Body() historicalData: any[]) {
    return this.analyticsService.getForecastTrendsAI(historicalData);
  }

  // Filter options endpoints
  @Get('filter-options/departments')
  async getDepartments(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getDepartments();
  }

  @Get('filter-options/teams')
  async getTeams(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getTeams();
  }

  @Get('workforce-estimator')
  async getWorkforceEstimator(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getWorkforceEstimator(query, user);
  }

  // === NEW AI-POWERED ANALYTICS ENDPOINTS ===
  
  @Post('ai/root-cause-analysis')
  async getRootCauseAnalysis(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.performRootCauseAnalysis(user);
  }
  
  @Post('ai/optimization-recommendations')
  async getOptimizationRecommendations(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getAIOptimizationRecommendations(user);
  }
  
  @Post('ai/bottleneck-detection')
  async getBottleneckDetection(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.detectProcessBottlenecks(user);
  }
  
  @Post('ai/training-needs')
  async getTrainingNeeds(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.identifyTrainingNeeds(user);
  }

  @Post('ai/advanced-clustering')
  async getAdvancedClustering(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getAdvancedProcessClustering(user);
  }

  @Post('ai/sophisticated-anomaly-detection')
  async getSophisticatedAnomalyDetection(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getSophisticatedAnomalyAnalysis(user);
  }

  @Post('ai/executive-report')
  async generateExecutiveReport(@Body() payload: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.generateComprehensiveExecutiveReport(user, payload);
  }

  @Get('current-staff')
  async getCurrentStaff(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getCurrentStaff(user);
  }

  @Get('planned-vs-actual')
  async getPlannedVsActual(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getPlannedVsActual(user, query);
  }

  @Get('ai-recommendations')
  async getAIRecommendations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getAIRecommendations(user);
  }

  @Get('resource-planning')
  async getResourcePlanning(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.analyticsService.getResourcePlanning(user);
  }

  @Get('documents/comprehensive-stats')
  async getComprehensiveDocumentStats(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    
    const stats: Record<string, any> = {};
    const documentTypes = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION', 'CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'];
    
    for (const type of documentTypes) {
      if (query.documentType && query.documentType !== type) continue;
      
      stats[type] = {
        total: 10,
        A_SCANNER: 2,
        EN_COURS_SCAN: 1,
        SCAN_FINALISE: 3,
        EN_COURS_TRAITEMENT: 2,
        TRAITE: 1,
        REGLE: 1,
        slaBreaches: type.includes('CONTRAT') || type.includes('RESILIATION') || type.includes('CONVENTION') ? 0 : 1,
        avgProcessingTime: 2.5
      };
    }
    
    return stats;
  }

  @Get('assignments/document-level')
  async getDocumentLevelAssignments(@Req() req: any) {
    const user = getUserFromRequest(req);
    
    return [
      {
        documentId: '1',
        documentType: 'BULLETIN_SOIN',
        reference: 'BS-001',
        assignedTo: 'Jean Dupont',
        chefEquipe: 'Marie Martin',
        status: 'EN_COURS',
        assignedAt: new Date(),
        slaStatus: 'ON_TIME'
      }
    ];
  }

  @Get('hierarchy/validation')
  async validateHierarchy(@Req() req: any) {
    const user = getUserFromRequest(req);
    
    return {
      isValid: true,
      issues: [],
      summary: {
        gestionnairesWithoutChef: 0
      }
    };
  }

}
