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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Get('status')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getScanStatus() {
    return this.scanService.getScanStatus();
  }

  @Get('scanners')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
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
    const enhancedPath = await this.scanService.enhanceImage(file.path);
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
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getRecentActivity() {
    return this.scanService.getRecentScanActivity();
  }

  @Post('retry/:fileName')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async retryFailedScan(@Param('fileName') fileName: string) {
    return this.scanService.retryFailedScan(fileName);
  }
}