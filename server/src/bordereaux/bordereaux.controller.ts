import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { BordereauxService } from './bordereaux.service';
import { CreateBordereauDto } from './dto/create-bordereau.dto';
import { UpdateBordereauDto } from './dto/update-bordereau.dto';
import { AssignBordereauDto } from './dto/assign-bordereau.dto';
import { BordereauResponseDto } from './dto/bordereau-response.dto';
import { BordereauKPI } from './interfaces/kpi.interface';
import { CreateBSDto, UpdateBSDto } from './dto/bs.dto';
import { AuditLogService } from './audit-log.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';
import { UpdateBulletinSoinDto } from '../bulletin-soin/dto/update-bulletin-soin.dto';
import { Express } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux')
export class BordereauxController {
  contractsService: any;
  constructor(
    private readonly bordereauxService: BordereauxService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() createBordereauDto: CreateBordereauDto): Promise<BordereauResponseDto> {
    // Validate input
    if (!createBordereauDto.reference || !createBordereauDto.dateReception || !createBordereauDto.clientId || typeof createBordereauDto.delaiReglement !== 'number' || typeof createBordereauDto.nombreBS !== 'number') {
      throw new Error('All required fields must be provided.');
    }
    // Validate client and contract linkage
    const bordereau = await this.bordereauxService.create(createBordereauDto);
    return bordereau;
  }

  @Get(':id/audit-log')
  getAuditLog(@Param('id') id: string) {
    return this.auditLogService.getBordereauHistory(id);
  }

  @Patch(':id/thresholds')
  updateThresholds(@Param('id') id: string, @Body() thresholds: any) {
    return this.contractsService.updateThresholds(id, thresholds);
  }

  @Get('export/csv')
  exportCSV() {
    return this.bordereauxService.exportCSV();
  }

  @Get('export/excel')
  exportExcel() {
    return this.bordereauxService.exportExcel();
  }

  @Get('export/pdf')
  exportPDF() {
    return this.bordereauxService.exportPDF();
  }

  @Get('inbox/unassigned')
  getUnassignedBordereaux() {
    return this.bordereauxService.findUnassigned();
  }

  @Get('inbox/team/:teamId')
  getTeamBordereaux(@Param('teamId') teamId: string) {
    return this.bordereauxService.findByTeam(teamId);
  }

  @Get('inbox/user/:userId')
  getUserBordereaux(@Param('userId') userId: string) {
    return this.bordereauxService.findByUser(userId);
  }

  @Post(':id/return')
  returnBordereau(@Param('id') id: string, @Body('reason') reason: string) {
    return this.bordereauxService.returnBordereau(id, reason);
  }

  @Get()
  findAll(@Query() filters: any) {
    return this.bordereauxService.findAll(filters);
  }

  @Get('approaching-deadlines')
  getApproachingDeadlines(): Promise<BordereauResponseDto[]> {
    return this.bordereauxService.getApproachingDeadlines();
  }

  @Get('overdue')
  getOverdueBordereaux(): Promise<BordereauResponseDto[]> {
    return this.bordereauxService.getOverdueBordereaux();
  }

  @Get('kpis')
  getBordereauKPIs(): Promise<BordereauKPI[]> {
    return this.bordereauxService.getBordereauKPIs();
  }

  @Get('forecast/bordereaux')
  forecastBordereaux(@Query('days') days?: string) {
    return this.bordereauxService.forecastBordereaux(days ? Number(days) : 7);
  }

  @Get('forecast/staffing')
  estimateStaffing(@Query('days') days?: string, @Query('avgPerStaffPerDay') avg?: string) {
    return this.bordereauxService.estimateStaffing(
      days ? Number(days) : 7,
      avg ? Number(avg) : 5
    );
  }

  @Get('ai/complaints')
  analyzeComplaintsAI() {
    return this.bordereauxService.analyzeComplaintsAI();
  }

  @Get('ai/recommendations')
  getAIRecommendations() {
    return this.bordereauxService.getAIRecommendations();
  }

  @Get('search')
  searchBordereauxAndDocuments(@Query('q') query: string) {
    return this.bordereauxService.searchBordereauxAndDocuments(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBordereauDto: UpdateBordereauDto,
  ): Promise<BordereauResponseDto> {
    return this.bordereauxService.update(id, updateBordereauDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.remove(id);
  }



  @Post('assign')
  assignBordereau(@Body() assignDto: AssignBordereauDto): Promise<BordereauResponseDto> {
    return this.bordereauxService.assignBordereau(assignDto);
  }

  @Post(':id/assign')
  assignBordereauById(@Param('id') id: string, @Body() assignDto: { userId: string }): Promise<BordereauResponseDto> {
    return this.bordereauxService.assignBordereau({ bordereauId: id, assignedToUserId: assignDto.userId });
  }

  @Post(':id/process')
  processBordereau(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.markAsProcessed(id);
  }

  @Post(':id/start-scan')
  startScan(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.startScan(id);
  }

  @Post(':id/complete-scan')
  completeScan(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.completeScan(id);
  }

  @Post(':id/mark-processed')
  markAsProcessed(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.markAsProcessed(id);
  }

  @Post(':id/close')
  closeBordereau(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.closeBordereau(id);
  }

  @Post(':id/initiate-payment')
  async initiatePayment(@Param('id') id: string) {
    const bordereau = await this.bordereauxService.update(id, { statut: 'VIREMENT_EN_COURS' as any });
    return { message: 'Payment initiated', bordereau };
  }

  @Post(':id/execute-payment')
  async executePayment(@Param('id') id: string) {
    const bordereau = await this.bordereauxService.update(id, { statut: 'VIREMENT_EXECUTE' as any });
    return { message: 'Payment executed', bordereau };
  }

  @Get(':id/bs')
  getBSList(@Param('id') id: string) {
    return this.bordereauxService.getBSList(id);
  }

  @Post(':id/bs')
  createBS(@Param('id') id: string, @Body() createBSDto: CreateBSDto) {
    return this.bordereauxService.createBS(id, createBSDto);
  }

  @Patch('bs/:bsId')
  async updateBS(@Param('bsId') bsId: string, @Body() updateBSDto: UpdateBulletinSoinDto) {
    return this.bordereauxService.updateBS(bsId, updateBSDto);
  }

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.bordereauxService.getDocuments(id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() documentData: any
  ) {
    const data = { ...documentData, file };
    return this.bordereauxService.uploadDocument(id, data);
  }

  @Patch(':id/update-status')
  updateBordereauStatus(@Param('id') id: string) {
    return this.bordereauxService.updateBordereauStatus(id);
  }

  @Get(':id/virement')
  getVirement(@Param('id') id: string) {
    return this.bordereauxService.getVirement(id);
  }

  @Get(':id/alerts')
  getAlerts(@Param('id') id: string) {
    return this.bordereauxService.getAlerts(id);
  }

  @Post('seed-test-data')
  async seedTestData() {
    return this.bordereauxService.seedTestData();
  }

  @Post('seed-complaints')
  async seedComplaints() {
    return this.bordereauxService.seedComplaints();
  }

  @Get('ai/reclamations/analyze')
  analyzeReclamationsAI() {
    return this.bordereauxService.analyzeReclamationsAI();
  }

  @Get('ai/reclamations/suggestions/:id')
  getReclamationSuggestions(@Param('id') id: string) {
    return this.bordereauxService.getReclamationSuggestions(id);
  }

  @Get('ai/teams/recommendations')
  getTeamRecommendations() {
    return this.bordereauxService.getTeamRecommendations();
  }

  @Get('ai/sla-analysis')
  async getSLAAnalysis() {
    return this.bordereauxService.getAISLAAnalysis();
  }

  @Get('ai/resource-analysis')
  async getResourceAnalysis() {
    return this.bordereauxService.getAIResourceAnalysis();
  }

  @Get('ai/reassignment-analysis')
  async getReassignmentAnalysis() {
    return this.bordereauxService.getAIReassignmentAnalysis();
  }

  @Get('ai/anomaly-detection')
  async getAnomalyDetection() {
    return this.bordereauxService.getAIAnomalyDetection();
  }

  @Post(':id/ai-assign')
  async aiAutoAssign(@Param('id') id: string) {
    return this.bordereauxService.aiAutoAssign(id);
  }

  @Post(':id/ai-prioritize')
  async aiPrioritize(@Param('id') id: string) {
    return this.bordereauxService.aiPrioritize(id);
  }

  @Post('ai/resource-alert')
  async aiResourceAlert() {
    return this.bordereauxService.aiResourceAlert();
  }

  @Post('ai/predict-resources')
  async getPredictResourcesAI(@Body() payload: any) {
    return this.bordereauxService.getPredictResourcesAI(payload);
  }

  @Post('import/excel')
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(@UploadedFile() file: Express.Multer.File) {
    console.log('📡 Excel Import: Received file upload request');
    console.log('📡 File info:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size
    });
    
    if (!file) {
      console.error('❌ Excel Import: No file uploaded');
      throw new Error('No file uploaded');
    }
    
    try {
      console.log('📡 Excel Import: Processing file...');
      const { ExcelImportService } = await import('./excel-import.service');
      const importService = new ExcelImportService(this.prisma);
      const result = await importService.importFromExcel(file.buffer, file.originalname);
      console.log('✅ Excel Import: Success -', result);
      return result;
    } catch (error) {
      console.error('❌ Excel Import: Error -', error);
      throw error;
    }
  }

  @Post('generate-ov')
  @Roles(UserRole.FINANCE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async generateOV(@Body() request: any) {
    const { OVGeneratorService } = await import('../finance/ov-generator.service');
    const ovService = new OVGeneratorService(this.prisma);
    return await ovService.generateOV(request);
  }

  @Post('bulk-update')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async bulkUpdateBordereaux(@Body() data: { bordereauIds: string[]; updates: any }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      result?: BordereauResponseDto;
      error?: string;
    }> = [];
    
    for (const id of data.bordereauIds) {
      try {
        const result = await this.bordereauxService.update(id, data.updates);
        results.push({ bordereauId: id, success: true, result });
      } catch (error: any) {
        results.push({ bordereauId: id, success: false, error: error.message });
      }
    }
    
    return {
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('bulk-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async bulkAssignBordereaux(@Body() data: { bordereauIds: string[]; userId: string }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      result?: BordereauResponseDto;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const result = await this.bordereauxService.assignBordereau({ bordereauId, assignedToUserId: data.userId });
        results.push({ bordereauId, success: true, result });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }
    
    return {
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      results
    };
  }

  @Post(':id/reassign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async reassignBordereau(
    @Param('id') bordereauId: string,
    @Body() data: { newUserId: string; comment?: string; timestamp?: string }
  ) {
    console.log('🔄 REASSIGN ENDPOINT HIT');
    console.log('Bordereau ID:', bordereauId);
    console.log('New User ID:', data.newUserId);
    console.log('Comment:', data.comment);
    console.log('Request Body:', JSON.stringify(data, null, 2));
    
    const result = await this.bordereauxService.reassignBordereau(bordereauId, data.newUserId, data.comment);
    
    console.log('✅ REASSIGN SUCCESS');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    return result;
  }
  
  @Post(':id/progress')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async progressToNextStage(@Param('id') id: string) {
    return this.bordereauxService.progressToNextStage(id);
  }
  
  @Get('analytics/performance')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getPerformanceAnalytics(@Query() filters: any) {
    return this.bordereauxService.getPerformanceAnalytics(filters);
  }
  
  @Get('search/advanced')
  async advancedSearch(@Query('q') query: string, @Query() filters: any) {
    return this.bordereauxService.advancedSearch(query, filters);
  }
  
  @Post('batch/update-status')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async batchUpdateStatus(@Body() data: { bordereauIds: string[]; status: string }) {
    return this.bordereauxService.batchUpdateStatus(data.bordereauIds, data.status as any);
  }
  
  @Post(':id/notify')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async sendCustomNotification(@Param('id') id: string, @Body() data: { message: string; recipients: string[] }) {
    await this.bordereauxService.sendCustomNotification(id, data.message, data.recipients);
    return { success: true };
  }

  @Get(':id/export-pdf')
  async exportBordereauPDF(@Param('id') id: string, @Res() res: any) {
    const pdfBuffer = await this.bordereauxService.exportBordereauPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bordereau_${id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  }
  
  @Post(':id/documents/:documentId/link')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async linkDocument(@Param('id') bordereauId: string, @Param('documentId') documentId: string) {
    await this.bordereauxService.linkDocumentToBordereau(bordereauId, documentId);
    return { success: true };
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async archiveBordereau(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.archiveBordereau(id);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async restoreBordereau(@Param('id') id: string): Promise<BordereauResponseDto> {
    return this.bordereauxService.restoreBordereau(id);
  }

  @Put('bs/:bsId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async updateBSStatus(@Param('bsId') bsId: string, @Body() updates: any) {
    return this.bordereauxService.updateBS(bsId, updates);
  }

  @Post('bs/:bsId/process')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async markBSAsProcessed(@Param('bsId') bsId: string, @Body() data: { status: string }) {
    return this.bordereauxService.updateBS(bsId, { etat: data.status });
  }

  @Get('inbox/corbeille/:role')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getCorbeilleByRole(@Param('role') role: string) {
    // Return role-specific corbeille data
    const filters: any = {};
    
    switch (role) {
      case 'CHEF_EQUIPE':
        filters.statut = ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'];
        break;
      case 'GESTIONNAIRE':
        // Will be filtered by assignedToUserId in the service
        break;
      case 'SCAN_TEAM':
        filters.statut = ['A_SCANNER', 'SCAN_EN_COURS'];
        break;
      case 'BO':
        filters.statut = ['EN_ATTENTE', 'A_SCANNER'];
        break;
    }
    
    return this.bordereauxService.findAll(filters);
  }

  @Get('workflow/notifications')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getWorkflowNotifications() {
    // Return workflow-based notifications
    return {
      newBordereaux: await this.bordereauxService.findAll({ statut: 'A_SCANNER' }),
      overdueItems: await this.bordereauxService.getOverdueBordereaux(),
      approachingDeadlines: await this.bordereauxService.getApproachingDeadlines()
    };
  }
}