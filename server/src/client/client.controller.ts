import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientDto } from './dto/search-client.dto';
import { ClientAnalyticsDto, CommunicationLogDto, RiskThresholdsDto } from './dto/client-analytics.dto';
import { Response, Request } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '../auth/user-role.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}



  @Post()
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateClientDto) {
    // Validate input
    if (!dto.name || typeof dto.reglementDelay !== 'number' || typeof dto.reclamationDelay !== 'number' ) {
      throw new Error('All fields (name, reglementDelay, reclamationDelay, accountManagerId) are required.');
    }
    // Check for unique client name
    const existing = await this.clientService.findByName(dto.name);
    if (existing) {
      throw new Error('A client with this name already exists.');
    }
    return this.clientService.create(dto);
  }

  @Get()
  findAll(@Query() query: SearchClientDto, @Req() req: Request) {
    // Pass user info for role-based filtering
    return this.clientService.findAll(query, req['user']);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.clientService.getHistory(id);
  }

  @Get(':id/analytics')
  analytics(@Param('id') id: string) {
    return this.clientService.analytics(id);
  }

  // Export clients to Excel
  @Post('export/excel')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async exportExcel(@Body() query: SearchClientDto, @Res() res: Response) {
    const buffer = await this.clientService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="clients.xlsx"',
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  // Export clients to PDF
  @Post('export/pdf')
 @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async exportPDF(@Body() query: SearchClientDto, @Res() res: Response) {
    const buffer = await this.clientService.exportToPDF(query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="clients.pdf"',
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  // AI Recommendation endpoint (stub)
  @Get(':id/ai-recommendation')
  analyticsAI(@Param('id') id: string) {
    return this.clientService.getAIRecommendation(id);
  }

  // External API sync endpoint (stub)
  @Post(':id/sync-external')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async syncExternal(@Param('id') id: string) {
    return this.clientService.syncWithExternal(id);
  }

  // Analytics trends endpoint
  @Get(':id/trends')
  trends(@Param('id') id: string) {
    return this.clientService.analyticsTrends(id);
  }

  // --- ARS Assurance Webhook Endpoint ---
  @Post('webhook/ars')
  async handleArsWebhook(@Body() payload: any, @Res() res: Response) {
    try {
      await this.clientService.handleArsWebhook(payload);
      res.status(HttpStatus.OK).json({ status: 'success', message: 'Webhook processed' });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error', message: error.message });
    }
  }

  // --- GED: Upload contract document ---
  @Post(':id/upload-contract')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async uploadContract(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    // File validation: only PDF, max 10MB
    if (!file) throw new Error('No file uploaded');
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Only PDF files are allowed');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB');
    }
    const user = req['user'] as any;
    const uploaderId = user?.id || user?.userId || user?.sub;
    if (!uploaderId) {
      throw new Error('Uploader user id not found in request');
    }
    return this.clientService.uploadContract(id, file, uploaderId);
  }

  // --- GED: Download contract document ---
  @Get('contract/:documentId/download')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async downloadContract(
    @Param('documentId') documentId: string,
    @Res() res: Response
  ) {
    return this.clientService.downloadContract(documentId, res);
  }

  // --- SLA Config ---
  @Patch(':id/sla-config')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateSlaConfig(@Param('id') id: string, @Body() config: any) {
    return this.clientService.updateSlaConfig(id, config);
  }
  @Get(':id/sla-config')
  getSlaConfig(@Param('id') id: string) {
    return this.clientService.getSlaConfig(id);
  }

  // --- Complaints by client ---
  @Get(':id/complaints')
  getComplaints(@Param('id') id: string) {
    return this.clientService.getComplaintsByClient(id);
  }

  // --- Create complaint for client ---
  @Post(':id/complaints')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  createComplaint(@Param('id') id: string, @Body() data: any) {
    return this.clientService.createComplaintForClient(id, data);
  }

  // --- Bordereaux by client ---
  @Get(':id/bordereaux')
  getBordereaux(@Param('id') id: string) {
    return this.clientService.getBordereauxByClient(id);
  }

  // --- SLA Status ---
  @Get(':id/sla-status')
  getSlaStatus(@Param('id') id: string) {
    return this.clientService.getSlaStatus(id);
  }

  // --- Reclamation SLA ---
  @Get(':id/reclamation-sla')
  reclamationSla(@Param('id') id: string) {
    return this.clientService.reclamationSlaStats(id);
  }

  // --- Prioritized view ---
  @Get('prioritized')
  prioritized() {
    return this.clientService.prioritizedClients();
  }

  // --- Workflow autofill ---
  @Get(':id/autofill')
  autofill(@Param('id') id: string) {
    return this.clientService.autofillData(id);
  }

  // --- Client performance metrics ---
  @Get(':id/performance')
  getPerformanceMetrics(@Param('id') id: string) {
    return this.clientService.getPerformanceMetrics(id);
  }

  // --- Update SLA alerts ---
  @Post(':id/alerts')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateSLAAlerts(@Param('id') id: string, @Body() alertConfig: any) {
    return this.clientService.updateSLAAlerts(id, alertConfig);
  }

  // === NEW ENDPOINTS FOR 100% COMPLETION ===

  // --- Performance Analytics Dashboard ---
  @Get(':id/performance-analytics')
  getPerformanceAnalytics(
    @Param('id') id: string,
    @Query() query: ClientAnalyticsDto
  ) {
    return this.clientService.getPerformanceAnalytics(id, query.period);
  }

  // --- Bulk Import/Export ---
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Query('validateOnly') validateOnly?: string
  ) {
    if (!file) throw new Error('No file uploaded');
    const csvContent = file.buffer.toString('utf-8');
    return this.clientService.bulkImportClients(csvContent, validateOnly === 'true');
  }

  @Get('export/advanced')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async exportAdvanced(
    @Query('format') format: 'csv' | 'excel' | 'pdf' = 'csv',
    @Query() filters: any,
    @Res() res: Response
  ) {
    const data = await this.clientService.exportClientsAdvanced(format, filters);
    
    if (format === 'csv') {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="clients-advanced.csv"'
      });
      res.send(data);
    } else {
      const contentType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const filename = `clients-advanced.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      res.send(data);
    }
  }

  // --- Communication History ---
  @Post(':id/communication')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  addCommunicationLog(
    @Param('id') id: string,
    @Body() logData: CommunicationLogDto,
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    return this.clientService.addCommunicationLog(id, logData, userId);
  }

  @Get(':id/communication-history')
  getCommunicationHistory(@Param('id') id: string) {
    return this.clientService.getCommunicationHistory(id);
  }

  @Get(':id/communication-templates')
  getCommunicationTemplates(@Param('id') id: string) {
    return this.clientService.getCommunicationTemplates(id);
  }

  // --- Risk Assessment ---
  @Get(':id/risk-assessment')
  getRiskAssessment(@Param('id') id: string) {
    return this.clientService.getRiskAssessment(id);
  }

  @Post(':id/risk-thresholds')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateRiskThresholds(
    @Param('id') id: string,
    @Body() thresholds: RiskThresholdsDto
  ) {
    return this.clientService.updateRiskThresholds(id, thresholds);
  }
}
