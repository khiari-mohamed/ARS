import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { TeamAnalyticsService } from './team-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/team-analytics')
export class TeamAnalyticsController {
  constructor(private readonly teamAnalytics: TeamAnalyticsService) {}

  @Get('performance/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getTeamPerformanceMetrics(
    @Param('teamId') teamId: string,
    @Query('period') period: string = '30d'
  ) {
    return this.teamAnalytics.getTeamPerformanceMetrics(teamId, period);
  }

  @Get('individual/:userId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getIndividualMetrics(
    @Param('userId') userId: string,
    @Query('period') period: string = '30d'
  ) {
    const dateRange = this.getDateRange(period);
    return this.teamAnalytics.getIndividualMetrics(userId, dateRange);
  }

  @Get('productivity/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getProductivityAnalysis(
    @Param('teamId') teamId: string,
    @Query('period') period: string = '30d'
  ) {
    return this.teamAnalytics.getProductivityAnalysis(teamId, period);
  }

  @Get('comparison/:userId/:teamId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getIndividualVsTeamComparison(
    @Param('userId') userId: string,
    @Param('teamId') teamId: string,
    @Query('period') period: string = '30d'
  ) {
    return this.teamAnalytics.getIndividualVsTeamComparison(userId, teamId, period);
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }
}