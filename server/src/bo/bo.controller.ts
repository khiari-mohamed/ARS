import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BOService, CreateBOEntryDto } from './bo.service';
import { Request } from 'express';
import { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('bo')
export class BOController {
  constructor(
    private readonly boService: BOService,
    private readonly prisma: PrismaService
  ) {}
  
  private extractUserId(user: any): string | null {
    return user?.id || user?.userId || user?.sub || null;
  }

  // Test endpoint
  @Get('test')
  async test() {
    return { message: 'BO module is working', timestamp: new Date().toISOString() };
  }

  // Generate reference number
  @Post('generate-reference')
  async generateReference(
    @Body() data: { type: string; clientId?: string }
  ) {
    const reference = await this.boService.generateReference(data.type, data.clientId);
    return { reference };
  }

  // Auto-retrieve client info for BO entry
  @Get('client-info/:clientId')
  async getClientInfo(@Param('clientId') clientId: string) {
    return await this.boService.getClientInfoForBO(clientId);
  }

  // Search clients for BO entry
  @Get('search-clients')
  async searchClients(@Query('query') query: string) {
    return await this.boService.searchClientsForBO(query);
  }

  // Document classification
  @Post('classify-document')
  @UseInterceptors(FileInterceptor('file'))
  async classifyDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: { fileName?: string }
  ) {
    if (!file && !data.fileName) {
      return { isValid: false, issues: ['No file or filename provided'], score: 0 };
    }
    
    const fileName = data.fileName || file?.originalname || 'unknown';
    const classification = await this.boService.classifyDocument(fileName);
    return classification;
  }

  // Document quality validation
  @Post('validate-document')
  @UseInterceptors(FileInterceptor('file'))
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
  async createEntry(
    @Body() entry: CreateBOEntryDto,
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    const result = await this.boService.createBatchEntry([entry], userId);
    return result.success[0] || result.errors[0];
  }

  // Batch entry creation
  @Post('create-batch')
  async createBatch(
    @Body() data: { entries: CreateBOEntryDto[] },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    return await this.boService.createBatchEntry(data.entries, userId);
  }

  // BO Dashboard
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    return await this.boService.getBODashboard(userId);
  }

  // BO Performance metrics
  @Get('performance')
  async getPerformance(
    @Req() req: Request,
    @Query('period') period: string = 'daily',
    @Query('userId') targetUserId?: string
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    // Only allow viewing other users' performance for admins
    const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user?.role);
    const queryUserId = isAdmin && targetUserId ? targetUserId : userId;
    
    return await this.boService.getBOPerformance(queryUserId, period);
  }

  // Physical document tracking
  @Post('track-document')
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
  async getTrackingHistory(@Param('reference') reference: string) {
    try {
      // Fetch actual tracking history from audit logs
      const history = await this.prisma.auditLog.findMany({
        where: {
          action: 'PHYSICAL_DOCUMENT_TRACKING',
          details: {
            path: ['reference'],
            equals: reference
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });
      
      return { reference, history };
    } catch (error) {
      return { reference, history: [] };
    }
  }

  // BO Statistics for reporting
  @Get('statistics')
  async getStatistics(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('userId') userId?: string
  ) {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const performance = await this.boService.getBOPerformance(userId, 'monthly');
    
    return {
      summary: {
        totalEntries: performance.totalEntries,
        avgProcessingTime: performance.avgProcessingTime,
        errorRate: performance.errorRate,
        entrySpeed: performance.entrySpeed
      },
      period: {
        from: fromDate || new Date(Date.now() - THIRTY_DAYS_MS).toISOString(),
        to: toDate || new Date().toISOString()
      }
    };
  }
}