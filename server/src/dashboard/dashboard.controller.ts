import { Controller, Get, Post, Query, Req, UseGuards, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  async getKpis(@Req() req) {
    return this.dashboardService.getKpis(req.user);
  }

  @Get('performance')
  async getPerformance(@Req() req) {
    return this.dashboardService.getPerformance(req.user);
  }

  @Get('sla-status')
  async getSlaStatus(@Req() req) {
    return this.dashboardService.getSlaStatus(req.user);
  }

  @Get('alerts')
  async getAlerts(@Req() req) {
    return this.dashboardService.getAlerts(req.user);
  }

  @Get('charts')
  async getCharts(@Req() req) {
    return this.dashboardService.getCharts(req.user);
  }

  @Get('overview')
  async getOverview(@Query() query: any, @Req() req) {
    // Support filters: period, teamId, status, fromDate, toDate
    return this.dashboardService.getOverview(query, req.user);
  }

  @Get('alerts-summary')
  async getAlertsSummary(@Query() query: any, @Req() req) {
    // Filtered alerts summary
    return this.dashboardService.getAlertsSummary(query, req.user);
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.dashboardService.getSyncStatus();
  }

  @Get('sync-logs')
  async getSyncLogs(@Query('limit') limit: number = 20) {
    return this.dashboardService.getSyncLogs(limit);
  }

  @Get('export')
  async exportKpis(@Query() query: any, @Req() req, @Res() res: Response) {
    const result = await this.dashboardService.exportKpis(query, req.user);
    if (result && result.filePath) {
      // For Excel/PDF, stream the file if needed
      res.download(result.filePath);
    } else {
      res.json(result);
    }
  }

  @Post('sync')
  async syncBs() {
    return this.dashboardService.syncAndSaveStatus();
  }

  // New: Advanced KPI with filtering
  @Get('advanced-kpis')
  async getAdvancedKpis(@Query() query: any, @Req() req) {
    return this.dashboardService.getAdvancedKpis(query, req.user);
  }
}
