import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduledReportsService } from './scheduled-reports.service';

@Controller('analytics/reports')
@UseGuards(JwtAuthGuard)
export class ScheduledReportsController {
  constructor(private scheduledReportsService: ScheduledReportsService) {}

  @Post('scheduled')
  async createScheduledReport(@Body() data: any) {
    return this.scheduledReportsService.createScheduledReport(data);
  }

  @Get('scheduled')
  async getScheduledReports() {
    return this.scheduledReportsService.getScheduledReports();
  }

  @Patch('scheduled/:id')
  async updateScheduledReport(@Param('id') id: string, @Body() data: any) {
    return this.scheduledReportsService.updateScheduledReport(id, data);
  }

  @Delete('scheduled/:id')
  async deleteScheduledReport(@Param('id') id: string) {
    return this.scheduledReportsService.deleteScheduledReport(id);
  }

  @Post('scheduled/:id/execute')
  async executeReport(@Param('id') id: string) {
    return this.scheduledReportsService.executeReport(id);
  }

  @Get('executions')
  async getReportExecutions() {
    return this.scheduledReportsService.getReportExecutions();
  }

  @Get('statistics')
  async getReportStatistics() {
    return this.scheduledReportsService.getReportStatistics();
  }
}