import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ScanSLAService } from './scan-sla.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('scan-sla')
@UseGuards(JwtAuthGuard)
export class ScanSLAController {
  constructor(private readonly scanSLAService: ScanSLAService) {}

  /**
   * Manually trigger SCAN SLA check and notifications
   */
  @Post('check')
  async checkScanSLA() {
    await this.scanSLAService.checkScanSLAAndNotify();
    return { message: 'SCAN SLA check completed' };
  }

  /**
   * Get SCAN SLA status for a specific bordereau
   */
  @Get('status/:bordereauId')
  async getScanSLAStatus(@Param('bordereauId') bordereauId: string) {
    return this.scanSLAService.getScanSLAStatus(bordereauId);
  }

  /**
   * Get all bordereaux with SCAN SLA issues
   */
  @Get('issues')
  async getScanSLAIssues() {
    return this.scanSLAService.getBordereauxWithScanSLAIssues();
  }
}
