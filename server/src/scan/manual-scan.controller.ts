import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ManualScanService, ManualScanDto } from './manual-scan.service';

@Controller('scan/manual')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManualScanController {
  constructor(private readonly manualScanService: ManualScanService) {}

  @Get('queue')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async getScannableQueue(@Request() req: any) {
    return this.manualScanService.getScannableQueue(req.user.id);
  }

  @Post('start/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async startManualScan(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.manualScanService.startManualScan(bordereauId, req.user.id);
  }

  @Post('upload/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 100, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
      files: 100 // Max 100 files
    },
    fileFilter: (req, file, callback) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
      if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Unsupported file type'), false);
      }
    }
  }))
  async uploadScanDocuments(
    @Param('bordereauId') bordereauId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const dto: ManualScanDto = {
      bordereauId,
      files,
      userId: req.user.id,
      notes
    };

    return this.manualScanService.uploadScanDocuments(dto);
  }

  @Post('upload-additional/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 100, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
      files: 100 // Max 100 files
    },
    fileFilter: (req, file, callback) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
      if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Unsupported file type'), false);
      }
    }
  }))
  async uploadAdditionalScanDocuments(
    @Param('bordereauId') bordereauId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('notes') notes: string,
    @Request() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const dto: ManualScanDto = {
      bordereauId,
      files,
      userId: req.user.id,
      notes
    };

    return this.manualScanService.uploadAdditionalDocuments(dto);
  }

  @Put('validate/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async validateAndCompleteScan(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.manualScanService.validateAndCompleteScan(bordereauId, req.user.id);
  }

  @Put('cancel/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async cancelScan(
    @Param('bordereauId') bordereauId: string,
    @Body('reason') reason: string,
    @Request() req: any
  ) {
    return this.manualScanService.cancelScan(bordereauId, req.user.id, reason);
  }

  @Get('statistics')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async getScanStatistics(@Request() req: any) {
    return this.manualScanService.getScanStatistics(req.user.id);
  }

  @Get('validate-multiple/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  async validateMultipleScanCapability(
    @Param('bordereauId') bordereauId: string
  ) {
    return this.manualScanService.validateMultipleScanCapability(bordereauId);
  }
}