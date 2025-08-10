import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BOService, CreateBOEntryDto } from './bo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bo')
export class BOController {
  constructor(private readonly boService: BOService) {}

  // Generate reference number
  @Post('generate-reference')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async generateReference(
    @Body() data: { type: string; clientId?: string }
  ) {
    const reference = await this.boService.generateReference(data.type, data.clientId);
    return { reference };
  }

  // Document classification
  @Post('classify-document')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async classifyDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: { fileName?: string }
  ) {
    const fileName = data.fileName || file?.originalname || 'unknown';
    const classification = await this.boService.classifyDocument(fileName);
    return classification;
  }

  // Document quality validation
  @Post('validate-document')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async validateDocument(
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      return { isValid: false, issues: ['No file provided'], score: 0 };
    }
    return await this.boService.validateDocumentQuality(file);
  }

  // Batch document validation
  @Post('validate-documents')
  @UseInterceptors(FilesInterceptor('files', 20))
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async validateDocuments(
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) {
      return { results: [], summary: { valid: 0, invalid: 0, total: 0 } };
    }

    const results = await Promise.all(
      files.map(async (file, index) => ({
        index,
        fileName: file.originalname,
        validation: await this.boService.validateDocumentQuality(file),
        classification: await this.boService.classifyDocument(file.originalname)
      }))
    );

    const summary = {
      valid: results.filter(r => r.validation.isValid).length,
      invalid: results.filter(r => !r.validation.isValid).length,
      total: results.length
    };

    return { results, summary };
  }

  // Single entry creation
  @Post('create-entry')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async createEntry(
    @Body() entry: CreateBOEntryDto,
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    const result = await this.boService.createBatchEntry([entry], userId);
    return result.success[0] || result.errors[0];
  }

  // Batch entry creation
  @Post('create-batch')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async createBatch(
    @Body() data: { entries: CreateBOEntryDto[] },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    return await this.boService.createBatchEntry(data.entries, userId);
  }

  // BO Dashboard
  @Get('dashboard')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getDashboard(@Req() req: Request) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    return await this.boService.getBODashboard(userId);
  }

  // BO Performance metrics
  @Get('performance')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getPerformance(
    @Req() req: Request,
    @Query('period') period: string = 'daily',
    @Query('userId') targetUserId?: string
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    // Only allow viewing other users' performance for admins
    const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user?.role);
    const queryUserId = isAdmin && targetUserId ? targetUserId : userId;
    
    return await this.boService.getBOPerformance(queryUserId, period);
  }

  // Physical document tracking
  @Post('track-document')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR)
  async trackDocument(
    @Body() trackingData: {
      reference: string;
      location: string;
      status: string;
      notes?: string;
    }
  ) {
    return await this.boService.trackPhysicalDocument(trackingData);
  }

  // Get document tracking history
  @Get('tracking/:reference')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getTrackingHistory(@Param('reference') reference: string) {
    // This would typically fetch from a dedicated tracking table
    // For now, we'll use audit logs
    return { reference, history: [] };
  }

  // BO Statistics for reporting
  @Get('statistics')
  @Roles(UserRole.BO, UserRole.CUSTOMER_SERVICE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getStatistics(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('userId') userId?: string
  ) {
    const performance = await this.boService.getBOPerformance(userId, 'monthly');
    
    return {
      summary: {
        totalEntries: performance.totalEntries,
        avgProcessingTime: performance.avgProcessingTime,
        errorRate: performance.errorRate,
        entrySpeed: performance.entrySpeed
      },
      period: {
        from: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: toDate || new Date().toISOString()
      }
    };
  }
}