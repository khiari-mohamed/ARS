import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScanService } from './scan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';
import { Express } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Get('status')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getScanStatus() {
    return this.scanService.getScanStatus();
  }

  @Get('scanners')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getScanners() {
    return this.scanService.detectScanners();
  }

  @Post('initialize')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async initializePaperStream() {
    return this.scanService.initializePaperStreamIntegration();
  }

  @Post('start-job')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async startScanJob(
    @Body() data: { scannerId: string; settings: any }
  ) {
    return this.scanService.startScanJob(data.scannerId, data.settings);
  }

  @Post('validate-quality')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async validateQuality(
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.scanService.validateScanQuality(file.path);
  }

  @Post('enhance-image')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async enhanceImage(
    @UploadedFile() file: Express.Multer.File
  ) {
    const enhancedPath = await this.scanService.enhanceImage(file);
    return { enhancedPath };
  }

  @Post('ocr-multi-engine')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async performOCR(
    @UploadedFile() file: Express.Multer.File
  ) {
    const results = await this.scanService.performMultiEngineOCR(file.path);
    const bestResult = await this.scanService.getBestOCRResult(results);
    return { results, bestResult };
  }

  @Post('ocr-correction')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async saveOCRCorrection(
    @Body() data: {
      documentId: string;
      originalText: string;
      correctedText: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    return this.scanService.saveOCRCorrection(
      data.documentId,
      data.originalText,
      data.correctedText,
      userId
    );
  }

  @Get('activity')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getRecentActivity() {
    return this.scanService.getRecentScanActivity();
  }

  @Get('activity-chart')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getScanActivityChart() {
    return this.scanService.getScanActivityChart();
  }

  @Post('retry/:fileName')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async retryFailedScan(@Param('fileName') fileName: string) {
    return this.scanService.retryFailedScan(fileName);
  }

  @Post('process-queue')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async processScanQueue() {
    return this.scanService.processPendingScanQueue();
  }

  @Post('paperstream-import')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async triggerPaperStreamImport() {
    return this.scanService.triggerPaperStreamImport();
  }

  @Get('queue')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getScanQueue() {
    return this.scanService.getScanQueue();
  }

  @Get('bordereau/:id')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getBordereauForScan(@Param('id') id: string) {
    return this.scanService.getBordereauForScan(id);
  }

  @Post('start/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async startScanning(
    @Param('bordereauId') bordereauId: string,
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    return this.scanService.startScanning(bordereauId, userId);
  }

  @Post('validate/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async validateScanning(
    @Param('bordereauId') bordereauId: string,
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    return this.scanService.validateScanning(bordereauId, userId);
  }

  @Get('overload-check')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async checkOverload() {
    return this.scanService.checkScanOverload();
  }

  @Get('debug-bordereaux')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async debugBordereaux() {
    return this.scanService.debugBordereauxStatus();
  }

  @Post('create-test-bordereau')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async createTestBordereau(@Req() req: Request) {
    return this.scanService.createTestBordereau();
  }

  @Get('dashboard-stats')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDashboardStats() {
    return this.scanService.getScanDashboardStats();
  }

  @Get('job-status/:jobId')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getScanJobStatus(@Param('jobId') jobId: string) {
    return this.scanService.getScanJobStatus(jobId);
  }

  @Get('document-stats-by-type')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDocumentStatsByType() {
    return this.scanService.getDocumentStatsByType();
  }

  @Post('bordereau/:bordereauId/update-details')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async updateBordereauDetails(
    @Param('bordereauId') bordereauId: string,
    @Body() updateData: { type?: string; clientId?: string; reference?: string },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    return this.scanService.updateBordereauDetails(bordereauId, updateData, userId);
  }
}