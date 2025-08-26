import { Controller, Get, Post, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('analytics/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('generate')
  async generateReport(@Body() params: any) {
    return this.reportsService.generateReport(params);
  }

  @Get('recent')
  async getRecentReports() {
    return this.reportsService.getRecentReports();
  }

  @Get('stats')
  async getReportStats() {
    return this.reportsService.getReportStats();
  }

  @Get(':id/download')
  async downloadReport(@Param('id') id: string, @Res() res: Response) {
    try {
      const report = await this.reportsService.downloadReport(id);
      
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.send(report.data);
    } catch (error) {
      res.status(404).json({ error: 'Report not found' });
    }
  }
}