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
  @UseInterceptors(FilesInterceptor('files', 1000, {
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB per file (matches nginx config)
      files: 1000 // Max 1000 files
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
    @Body('fileTypes') fileTypes: string | string[],
    @Request() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // DEBUG: Log received data
    console.log('📥 Backend received:');
    console.log('  Files:', files.length);
    console.log('  FileTypes raw:', fileTypes);
    console.log('  FileTypes type:', typeof fileTypes);
    console.log('  Body:', req.body);

    // Parse fileTypes - handle both string and array from FormData
    let parsedFileTypes: string[] = [];
    if (Array.isArray(fileTypes)) {
      parsedFileTypes = fileTypes;
    } else if (typeof fileTypes === 'string') {
      parsedFileTypes = [fileTypes];
    } else if (fileTypes) {
      parsedFileTypes = [String(fileTypes)];
    }
    console.log('  Parsed fileTypes:', parsedFileTypes);

    const dto: ManualScanDto = {
      bordereauId,
      files,
      userId: req.user.id,
      notes,
      fileTypes: parsedFileTypes
    };

    return this.manualScanService.uploadScanDocuments(dto);
  }

  @Post('upload-additional/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 1000, {
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB per file (matches nginx config)
      files: 1000 // Max 1000 files
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
    @Body('fileTypes') fileTypes: string | string[],
    @Request() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // DEBUG: Log received data
    console.log('📥 Backend received (additional):');
    console.log('  Files:', files.length);
    console.log('  FileTypes raw:', fileTypes);
    console.log('  FileTypes type:', typeof fileTypes);
    console.log('  Body:', req.body);

    // Parse fileTypes - handle both string and array from FormData
    let parsedFileTypes: string[] = [];
    if (Array.isArray(fileTypes)) {
      parsedFileTypes = fileTypes;
    } else if (typeof fileTypes === 'string') {
      parsedFileTypes = [fileTypes];
    } else if (fileTypes) {
      parsedFileTypes = [String(fileTypes)];
    }
    console.log('  Parsed fileTypes:', parsedFileTypes);

    const dto: ManualScanDto = {
      bordereauId,
      files,
      userId: req.user.id,
      notes,
      fileTypes: parsedFileTypes
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