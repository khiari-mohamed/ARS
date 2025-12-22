import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertSchedulerService } from './alert-scheduler.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

// For alert history query
interface AlertHistoryQuery {
  bordereauId?: string;
  userId?: string;
  alertLevel?: string;
  fromDate?: string;
  toDate?: string;
}

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'SYSTEM', role: 'SUPER_ADMIN' };
}


import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

// @UseGuards(JwtAuthGuard, RolesGuard) - Temporarily disabled for alerts module
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly scheduler: AlertSchedulerService
  ) {}

  @Get('dashboard')
  async getAlertsDashboard(@Query() query: AlertsQueryDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    // Validate input
    if (query.fromDate && isNaN(Date.parse(query.fromDate))) throw new Error('Invalid fromDate');
    if (query.toDate && isNaN(Date.parse(query.toDate))) throw new Error('Invalid toDate');
    return this.alertsService.getAlertsDashboard(query, user);
  }

  @Get('team-overload')
  async getTeamOverloadAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getTeamOverloadAlerts(user);
  }

  @Get('reclamations')
  async getReclamationAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getReclamationAlerts(user);
  }

  @Get('delay-predictions')
  async getDelayPredictions(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getDelayPredictions(user);
  }

  @Get('priority-list')
  async getPriorityList(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getPriorityList(user);
  }

  @Get('comparative-analytics')
  async getComparativeAnalytics(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getComparativeAnalytics(user);
  }

  @Get('history')
  async getAlertHistory(@Query() query: AlertHistoryQuery, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getAlertHistory(query, user);
  }

  @Get('resolve')
  async resolveAlert(@Query('alertId') alertId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.resolveAlert(alertId, user);
  }

  @Get('kpi')
  async getAlertsKPI(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getAlertsKPI(user);
  }

  @Get('realtime')
  async getRealTimeAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getRealTimeAlerts(user);
  }

  // AI-powered SLA prediction
  @Get('sla-prediction')
  async getSlaPredictionAI(@Query('items') items: string) {
    // items should be a JSON stringified array
    let parsedItems: any[] = [];
    try {
      parsedItems = JSON.parse(items);
    } catch {
      throw new Error('Invalid items format. Must be JSON array.');
    }
    return this.alertsService.getSlaPredictionAI(parsedItems);
  }

  @Get('charts-data')
  async getChartsData(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getChartsData(user);
  }

  @Get('finance')
  async getFinanceAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.getFinanceAlerts(user);
  }

  @Get('escalation/rules')
  async getEscalationRules(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.getEscalationRules();
  }

  @Post('escalation/rules')
  async createEscalationRule(@Body() ruleData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.createEscalationRule(ruleData);
  }

  @Patch('escalation/rules/:id')
  async updateEscalationRule(@Param('id') id: string, @Body() updates: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.updateEscalationRule(id, updates);
  }

  @Delete('escalation/rules/:id')
  async deleteEscalationRule(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.deleteEscalationRule(id);
  }

  @Get('escalation/active')
  async getActiveEscalations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.getActiveEscalations();
  }

  @Get('escalation/metrics')
  async getEscalationMetrics(@Query('period') period: string = '30d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.escalationEngine.getEscalationMetrics(period);
  }

  @Get('notifications/channels')
  async getNotificationChannels(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.getChannels();
  }

  @Post('notifications/channels')
  async createNotificationChannel(@Body() channelData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.createChannel(channelData);
  }

  @Patch('notifications/channels/:id')
  async updateNotificationChannel(@Param('id') id: string, @Body() updates: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.updateChannel(id, updates);
  }

  @Delete('notifications/channels/:id')
  async deleteNotificationChannel(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.deleteChannel(id);
  }

  @Post('notifications/channels/:id/test')
  async testNotificationChannel(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.testChannel(id);
  }

  @Get('notifications/templates')
  async getNotificationTemplates(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.getTemplates();
  }

  @Get('notifications/stats')
  async getNotificationStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.multiChannelNotifications.getDeliveryStats();
  }



  @Get('analytics/effectiveness')
  async getAlertEffectiveness(
    @Query('alertType') alertType: string = '',
    @Query('period') period: string = '30d',
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.alertsService.alertAnalytics.calculateAlertEffectiveness(alertType, period);
  }

  @Get('analytics/false-positives')
  async getFalsePositiveAnalysis(@Query('period') period: string = '30d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.alertAnalytics.getFalsePositiveAnalysis(period);
  }

  @Get('analytics/trends')
  async getAlertTrends(@Query('period') period: string = '30d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.alertAnalytics.getAlertTrends(period);
  }

  @Get('analytics/recommendations')
  async generateAlertRecommendations(@Query('period') period: string = '30d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.alertAnalytics.generateRecommendations(period);
  }

  @Get('analytics/performance-report')
  async getAlertPerformanceReport(@Query('period') period: string = '30d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.alertAnalytics.generatePerformanceReport(period);
  }

  @Post('comments')
  async addAlertComment(@Body() body: { alertId: string; comment: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.addAlertComment(body.alertId, body.comment, user);
  }

  @Post('trigger')
  async triggerAlert(@Body() alertData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.alertsService.triggerAlert(alertData);
  }

  @Post('escalate')
  async escalateAlert(@Body() body: { alertId: string; escalationLevel: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    // Escalation logic here
    return { success: true, message: 'Alert escalated successfully' };
  }

  @Get('export')
  async exportAlerts(@Query('format') format: string = 'pdf', @Req() req: any) {
    const user = getUserFromRequest(req);
    // Export logic here - would generate PDF/Excel
    return { success: true, message: `Export in ${format} format initiated` };
  }
  
  @Post('test/team-overload')
  async testTeamOverload(@Req() req: any) {
    await this.scheduler.triggerTeamOverloadCheck();
    return { success: true, message: 'Team overload check triggered - check logs' };
  }
}
