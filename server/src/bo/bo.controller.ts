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
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BOService, CreateBOEntryDto } from './bo.service';
import { BOInterfaceService } from './bo-interface.service';
import { Request } from 'express';
import { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/user-role.enum';


@Controller('bo')
export class BOController {
  constructor(
    private readonly boService: BOService,
    private readonly prisma: PrismaService,
    private readonly boInterfaceService: BOInterfaceService
  ) {
    console.log('🔥 BO CONTROLLER INITIALIZED!');
  }
  
  private extractUserId(user: any): string | null {
    return user?.id || user?.userId || user?.sub || null;
  }

  // Test endpoint - NO AUTH for debugging
  @Get('test')
  async test() {
    console.log('🔥 BO TEST ENDPOINT HIT!');
    return { message: 'BO module is working', timestamp: new Date().toISOString() };
  }

  // Test endpoint with auth info
  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  async testAuth(@Req() req: Request) {
    const user = req?.['user'] as any;
    return { 
      message: 'Auth test', 
      user: {
        id: user?.id,
        role: user?.role,
        email: user?.email,
        fullName: user?.fullName
      },
      timestamp: new Date().toISOString() 
    };
  }

  // Generate reference number - NO AUTH for debugging
  @Post('generate-reference')
  async generateReference(
    @Body() data: { type: string; clientId?: string }
  ) {
    const reference = await this.boService.generateReference(data.type, data.clientId);
    return { reference };
  }

  // Generate reference with auth
  @Post('generate-reference-auth')
  @UseGuards(JwtAuthGuard)
  async generateReferenceAuth(
    @Body() data: { type: string; clientId?: string },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const reference = await this.boService.generateReference(data.type, data.clientId);
    return { 
      reference, 
      user: {
        id: user?.id,
        role: user?.role,
        email: user?.email
      }
    };
  }

  // Auto-retrieve client info for BO entry with chargé de compte integration
  @Get('client-info/:clientId')
  @UseGuards(JwtAuthGuard)
  async getClientInfo(@Param('clientId') clientId: string) {
    const clientInfo = await this.boService.getClientInfoForBO(clientId);
    console.log(`📝 BO: Retrieved client info for ${clientId}:`, {
      hasChargeDeCompte: !!clientInfo.chargeDeCompte,
      autoFillData: clientInfo.autoFillData
    });
    return clientInfo;
  }

  // Search clients for BO entry
  @Get('search-clients')
  @UseGuards(JwtAuthGuard)
  async searchClients(@Query('query') query: string) {
    return await this.boService.searchClientsForBO(query);
  }

  // Document classification
  @Post('classify-document')
  @UseGuards(JwtAuthGuard)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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

  // Single entry creation - NO AUTH for debugging
  @Post('create-entry')
  async createEntry(
    @Body() entry: CreateBOEntryDto
  ) {
    const result = await this.boService.createBatchEntry([entry], 'test-user');
    return result;
  }

  // Single entry creation with auth
  @Post('create-entry-auth')
  @UseGuards(JwtAuthGuard)
  async createEntryAuth(
    @Body() entry: CreateBOEntryDto,
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    const result = await this.boService.createBatchEntry([entry], userId);
    return {
      result,
      user: {
        id: user?.id,
        role: user?.role,
        email: user?.email
      }
    };
  }

  // Batch entry creation
  @Post('create-batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
  async createBatch(
    @Body() data: { entries: CreateBOEntryDto[] },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    return await this.boService.createBatchEntry(data.entries, userId);
  }

  // BO Dashboard with filters
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard(
    @Req() req: Request,
    @Query('clientId') clientId?: string,
    @Query('chefEquipeId') chefEquipeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('statut') statut?: string
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    const filters = {
      clientId,
      chefEquipeId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      statut
    };
    
    return await this.boService.getBODashboard(userId, filters);
  }

  // BO Performance metrics
  @Get('performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.BO, UserRole.CLIENT_SERVICE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
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

  // Upload documents and create bordereaux
  @Post('upload-documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() data: { entries: CreateBOEntryDto[] },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    try {
      // Create bordereau entries for uploaded files
      const results = await this.boService.createBatchEntryWithFiles(data.entries, files, userId);
      return results;
    } catch (error) {
      throw new BadRequestException('Failed to process uploaded documents');
    }
  }

  // Simulate workflow progression for demo
  @Post('simulate-workflow')
  @UseGuards(JwtAuthGuard)
  async simulateWorkflow() {
    return await this.boService.simulateWorkflowProgression();
  }

  // Progress specific bordereau status
  @Post('progress-status/:id')
  @UseGuards(JwtAuthGuard)
  async progressBordereauStatus(
    @Param('id') bordereauId: string,
    @Body() data: { status: string },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    
    return await this.boService.progressBordereauWorkflow(bordereauId, data.status, userId);
  }

  // === NEW BO INTERFACE ENDPOINTS ===
  
  // Manual bordereau entry with client pre-filling
  @Post('bordereau')
  @UseGuards(JwtAuthGuard)
  async createBordereauEntry(
    @Body() data: {
      typeFichier: string;
      nombreFichiers: number;
      referenceBordereau: string;
      clientId: string;
      delaiReglement?: number;
      delaiReclamation?: number;
      gestionnaire?: string;
      observations?: string;
    },
    @Req() req: Request
  ) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    return await this.boInterfaceService.createBordereauEntry(data, userId);
  }

  // Get client pre-fill data
  @Get('client/:id/prefill')
  @UseGuards(JwtAuthGuard)
  async getClientPreFillData(@Param('id') clientId: string) {
    return await this.boInterfaceService.getClientPreFillData(clientId);
  }

  // BO Dashboard with new interface
  @Get('interface-dashboard')
  @UseGuards(JwtAuthGuard)
  async getBOInterfaceDashboard(@Req() req: Request) {
    const user = req?.['user'] as any;
    const userId = this.extractUserId(user) || 'system-user';
    return await this.boInterfaceService.getBODashboard(userId);
  }

  // Get available clients
  @Get('available-clients')
  @UseGuards(JwtAuthGuard)
  async getAvailableClients() {
    return await this.boInterfaceService.getAvailableClients();
  }

  // Get available gestionnaires
  @Get('available-gestionnaires')
  @UseGuards(JwtAuthGuard)
  async getAvailableGestionnaires() {
    return await this.boInterfaceService.getAvailableGestionnaires();
  }

  // Validate bordereau reference
  @Post('validate-reference')
  @UseGuards(JwtAuthGuard)
  async validateBordereauReference(@Body() data: { reference: string }) {
    return await this.boInterfaceService.validateBordereauReference(data.reference);
  }
}