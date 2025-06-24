import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
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
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}


import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

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
}
