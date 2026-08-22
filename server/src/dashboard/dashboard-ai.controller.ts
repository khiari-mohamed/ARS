import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardAiService } from './dashboard-ai.service';

// Everything AI-related that used to fire automatically on every
// /dashboard/role-based load now lives here, behind its own endpoints.
// Nothing calls these automatically anymore — they're available on demand
// (e.g. for a future explicit "refresh AI" action) without adding load to
// the main dashboard or to the new Bulletin de Soins IA module.
@Controller('dashboard-ai')
@UseGuards(JwtAuthGuard)
export class DashboardAiController {
  constructor(private readonly dashboardAiService: DashboardAiService) {}

  @Get('alerts')
  async getAiAlerts(@Query() query: any, @Req() req) {
    return this.dashboardAiService.getAIAlertsForUser(req.user, query);
  }

  @Get('performance-recommendations')
  async getPerformanceRecommendations(@Query('performanceData') performanceData: any, @Req() req) {
    // performanceData expected as a JSON string in the query, or empty to get [].
    let parsed: any[] = [];
    try {
      parsed = performanceData ? JSON.parse(performanceData) : [];
    } catch {
      parsed = [];
    }
    return this.dashboardAiService.getPerformanceRecommendations(parsed);
  }
}