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
  UploadedFiles,
  Res,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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

  @Get('unassigned')
  getUnassignedBordereaux() {
    return this.bordereauxService.findUnassigned();
  }

  @Get('team/:userId')
  getTeamBordereaux(@Param('userId') userId: string) {
    return this.bordereauxService.findByUser(userId);
  }

  @Get('inbox/unassigned')
  getUnassignedBordereaux2() {
    return this.bordereauxService.findUnassigned();
  }

  @Get('inbox/team/:teamId')
  getTeamBordereaux2(@Param('teamId') teamId: string) {
    return this.bordereauxService.findByTeam(teamId);
  }

  @Get('inbox/user/:userId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  getUserBordereaux(@Param('userId') userId: string, @Req() req) {
    const user = req.user;
    
    // Gestionnaire can only see their own bordereaux
    if (user.role === UserRole.GESTIONNAIRE && user.id !== userId) {
      throw new Error('Accès non autorisé: vous ne pouvez voir que vos propres dossiers');
    }
    
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

  @Get('ai/complaints-intelligence')
  async getAIComplaintsIntelligence() {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    return aiService.getAIComplaintsIntelligence();
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

  @Post(':id/bs/upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 20))
  @Roles(UserRole.SCAN_TEAM, UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async uploadMultipleBS(
    @Param('id') bordereauId: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      console.log('📤 Multiple BS Upload - Bordereau ID:', bordereauId);
      console.log('📤 Files received:', files?.length || 0);
      
      if (!files || files.length === 0) {
        return { success: false, error: 'No files uploaded' };
      }

      // Process each file and create BS entries
      const results: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Get a valid user ID (first available user as fallback)
        const defaultUser = await this.prisma.user.findFirst({ where: { active: true } });
        if (!defaultUser) {
          throw new Error('No active user found for BS creation');
        }
        
        // Create BS entry with file info
        const bsData: CreateBSDto = {
          bordereauId,
          ownerId: defaultUser.id,
          status: 'IN_PROGRESS' as any,
          numBs: `BS-${Date.now()}-${i}`,
          etat: 'IN_PROGRESS',
          nomAssure: file.originalname || 'N/A',
          nomBeneficiaire: 'N/A',
          nomSociete: 'N/A',
          codeAssure: 'N/A',
          matricule: 'N/A',
          dateSoin: new Date().toISOString(),
          montant: 0,
          acte: 'N/A',
          nomPrestation: 'Upload',
          nomBordereau: 'N/A',
          lien: 'N/A',
          dateCreation: new Date().toISOString(),
          dateMaladie: new Date().toISOString(),
          totalPec: 0,
          observationGlobal: 'Uploaded file',
          fileName: file.originalname,
          fileSize: file.size
        };
        
        const bs = await this.bordereauxService.createBS(bordereauId, bsData);
        results.push(bs);
      }
      
      // Recalculate bordereau progress
      await this.bordereauxService.recalculateBordereauProgress(bordereauId);
      
      console.log('✅ Multiple BS Upload successful:', results.length, 'BS created');
      return { 
        success: true, 
        message: `${results.length} BS uploaded successfully`,
        bsCreated: results.length,
        results 
      };
    } catch (error) {
      console.error('❌ Multiple BS Upload error:', error);
      return { success: false, error: error.message };
    }
  }

  @Post(':id/bs/bulk-update')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async bulkUpdateBS(
    @Param('id') bordereauId: string,
    @Body() data: { updates: { bsId: string; data: any }[] }
  ) {
    try {
      const results: any[] = [];
      for (const update of data.updates) {
        const result = await this.bordereauxService.updateBS(update.bsId, update.data as any);
        results.push(result);
      }
      
      // Recalculate progress after bulk update
      await this.bordereauxService.recalculateBordereauProgress(bordereauId);
      
      return {
        success: true,
        updated: results.length,
        results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  @Get('ai/load-forecast')
  async getAILoadForecast(@Query('days') days?: string, @Query('clientId') clientId?: string) {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    return aiService.getAILoadForecast(clientId, days ? Number(days) : 7);
  }

  @Get('ai/performance-analytics')
  async getAIPerformanceAnalytics(@Query() filters: any) {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    return aiService.getAIPerformanceAnalytics(filters);
  }

  @Post(':id/ai-analysis')
  async getAIAnalysis(@Param('id') id: string) {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    
    // Get comprehensive AI analysis for a bordereau
    const [slaAnalysis, performanceImpact, recommendations] = await Promise.all([
      this.bordereauxService.getAISLAAnalysis(),
      aiService.getAIPerformanceAnalytics({ bordereauId: id }),
      this.bordereauxService.getAIRecommendations()
    ]);
    
    return {
      sla_risk: slaAnalysis.risks?.find((r: any) => r.id === id),
      performance_impact: performanceImpact.root_causes?.[0]?.description || 'Impact normal',
      recommendations: recommendations.recommendations?.slice(0, 3) || [],
      ai_confidence: 0.87
    };
  }

  @Post('ai/predict-resources')
  async getPredictResourcesAI(@Body() payload: any) {
    return this.bordereauxService.getPredictResourcesAI(payload);
  }

  @Get('ai/daily-priorities')
  async getDailyPriorityQueues(@Query('userId') userId?: string) {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    return aiService.generateDailyPriorityQueues(userId);
  }

  @Get('ai/capacity-planning')
  async getAICapacityPlanning(@Query('days') days?: string) {
    const { AIEnhancementsService } = await import('./ai-enhancements.service');
    const aiService = new AIEnhancementsService(this.prisma);
    return aiService.getAICapacityPlanning(days ? Number(days) : 30);
  }

  // OCR Integration Endpoints
  @Post(':id/ocr/process')
  async processDocumentOCR(@Param('id') bordereauId: string) {
    const { OCRIntegrationService } = await import('./ocr-integration.service');
    const ocrService = new OCRIntegrationService(this.prisma);
    return ocrService.batchProcessOCR(bordereauId);
  }

  @Post('documents/:documentId/ocr')
  async processSingleDocumentOCR(@Param('documentId') documentId: string) {
    const { OCRIntegrationService } = await import('./ocr-integration.service');
    const ocrService = new OCRIntegrationService(this.prisma);
    return ocrService.processDocumentOCR(documentId);
  }

  @Get(':id/ocr/stats')
  async getOCRStats(@Param('id') bordereauId: string) {
    const { OCRIntegrationService } = await import('./ocr-integration.service');
    const ocrService = new OCRIntegrationService(this.prisma);
    return ocrService.getOCRStats(bordereauId);
  }

  @Get('ocr/search')
  async searchByOCR(@Query('q') query: string, @Query('bordereauId') bordereauId?: string) {
    const { OCRIntegrationService } = await import('./ocr-integration.service');
    const ocrService = new OCRIntegrationService(this.prisma);
    return ocrService.searchDocumentsByOCR(query, bordereauId);
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

  @Post('bulk-assign-documents')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async bulkAssignDocuments(@Body() data: { documentIds: string[]; userId: string }) {
    await this.prisma.document.updateMany({
      where: { id: { in: data.documentIds } },
      data: { assignedToUserId: data.userId }
    });
    
    return {
      success: true,
      message: `${data.documentIds.length} document(s) assigné(s) avec succès`
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

  @Get('search/ocr')
  async searchWithOCR(@Query('q') query: string, @Query() filters: any) {
    const { OCRIntegrationService } = await import('./ocr-integration.service');
    const ocrService = new OCRIntegrationService(this.prisma);
    const ocrResults = await ocrService.searchDocumentsByOCR(query, filters.bordereauId);
    const standardResults = await this.bordereauxService.advancedSearch(query, filters);
    
    return {
      ocr_results: ocrResults,
      standard_results: standardResults,
      total_results: ocrResults.length + standardResults.length
    };
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

  @Post(':id/manual-scan')
  @UseInterceptors(FilesInterceptor('documents', 10))
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async manualScanUpload(
    @Param('id') bordereauId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() data: any
  ) {
    return this.bordereauxService.processManualScan(bordereauId, files, data);
  }

  @Post(':id/finalize-scan')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async finalizeScan(@Param('id') bordereauId: string) {
    return this.bordereauxService.finalizeScanProcess(bordereauId);
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
    const result = await this.bordereauxService.updateBS(bsId, updates);
    // Trigger automatic bordereau progress recalculation
    if (result.bordereauId) {
      await this.bordereauxService.recalculateBordereauProgress(result.bordereauId);
    }
    return result;
  }

  @Post(':id/recalculate-progress')
  @Roles(UserRole.SCAN_TEAM, UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async recalculateBordereauProgress(@Param('id') bordereauId: string) {
    return this.bordereauxService.recalculateBordereauProgress(bordereauId);
  }

  @Post(':id/add-bs')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async addBSToBordereau(@Param('id') bordereauId: string, @Body() bsData: any[]) {
    return this.bordereauxService.addBSToBordereau(bordereauId, bsData);
  }

  @Put(':id/scan-status')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async updateScanStatus(@Param('id') bordereauId: string, @Body() data: { scanStatus: string }, @Body() user: any) {
    return this.bordereauxService.updateScanStatus(bordereauId, data.scanStatus, user);
  }

  @Put(':id/document-status')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async updateDocumentStatus(@Param('id') bordereauId: string, @Body() data: { documentStatus: string }, @Req() req) {
    const user = req.user;
    
    // Only Chef d'équipe can assign document status
    if (user.role !== 'CHEF_EQUIPE' && user.role !== 'SUPER_ADMIN') {
      throw new Error('Seuls les chefs d\'équipe peuvent assigner des statuts de document');
    }
    
    try {
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { documentStatus: data.documentStatus }
      });
      
      // Log the document status assignment
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DOCUMENT_STATUS_ASSIGNED',
          details: {
            bordereauId,
            documentStatus: data.documentStatus,
            assignedBy: user.fullName
          }
        }
      });
      
      return { success: true, bordereau };
    } catch (error) {
      throw new Error('Erreur lors de la mise à jour du statut document');
    }
  }

  @Post('bs/:bsId/process')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async markBSAsProcessed(@Param('bsId') bsId: string, @Body() data: { status: string }) {
    return this.bordereauxService.updateBS(bsId, { etat: data.status });
  }

  @Get('inbox/corbeille/:role')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getCorbeilleByRole(@Param('role') role: string) {
    const filters: any = {};
    
    switch (role) {
      case 'CHEF_EQUIPE':
        filters.statut = ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'];
        break;
      case 'GESTIONNAIRE':
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

  @Get('chef-equipe/corbeille')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getChefEquipeCorbeille(@Req() req) {
    const user = req.user;
    console.log('🔍 Chef équipe corbeille - User:', user.id, user.role);
    
    let whereClause: any = { archived: false };
    
    // Chef d'équipe only sees bordereaux from contracts assigned to them
    if (user.role === UserRole.CHEF_EQUIPE) {
      whereClause = {
        archived: false,
        contract: {
          teamLeaderId: user.id
        }
      };
      console.log('🎯 Filtering for Chef équipe:', user.id);
    }
    // Super Admin and Admin see everything
    else if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMINISTRATEUR) {
      whereClause = { archived: false };
      console.log('👑 Super Admin/Admin - no filtering');
    }
    
    const [nonAffectes, enCours, traites] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          ...whereClause,
          statut: { in: ['SCANNE', 'A_AFFECTER'] },
          assignedToUserId: null
        },
        include: {
          client: true,
          contract: true,
          currentHandler: { select: { fullName: true } }
        },
        orderBy: { dateReception: 'desc' }
      }),
      this.prisma.bordereau.findMany({
        where: {
          ...whereClause,
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          assignedToUserId: { not: null }
        },
        include: {
          client: true,
          contract: true,
          currentHandler: { select: { fullName: true } }
        },
        orderBy: { dateReception: 'desc' }
      }),
      this.prisma.bordereau.findMany({
        where: {
          ...whereClause,
          statut: { in: ['TRAITE', 'CLOTURE'] },
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        include: {
          client: true,
          contract: true,
          currentHandler: { select: { fullName: true } }
        },
        orderBy: { dateReception: 'desc' }
      })
    ]);

    console.log('📊 Results:', {
      nonAffectes: nonAffectes.length,
      enCours: enCours.length,
      traites: traites.length
    });

    return {
      nonAffectes: nonAffectes.map(b => ({
        ...b,
        dateReception: b.dateReception.toISOString(),
        dateDebutScan: b.dateDebutScan?.toISOString(),
        dateFinScan: b.dateFinScan?.toISOString(),
        dateReceptionSante: b.dateReceptionSante?.toISOString(),
        dateCloture: b.dateCloture?.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString()
      })),
      enCours: enCours.map(b => ({
        ...b,
        dateReception: b.dateReception.toISOString(),
        dateDebutScan: b.dateDebutScan?.toISOString(),
        dateFinScan: b.dateFinScan?.toISOString(),
        dateReceptionSante: b.dateReceptionSante?.toISOString(),
        dateCloture: b.dateCloture?.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString()
      })),
      traites: traites.map(b => ({
        ...b,
        dateReception: b.dateReception.toISOString(),
        dateDebutScan: b.dateDebutScan?.toISOString(),
        dateFinScan: b.dateFinScan?.toISOString(),
        dateReceptionSante: b.dateReceptionSante?.toISOString(),
        dateCloture: b.dateCloture?.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString()
      })),
      stats: {
        nonAffectes: nonAffectes.length,
        enCours: enCours.length,
        traites: traites.length
      },
      userRole: user.role,
      restrictions: user.role === UserRole.CHEF_EQUIPE ? {
        message: "Accès limité aux contrats assignés à votre équipe",
        canViewGlobalStats: false,
        canExportAll: false
      } : null
    };
  }

  @Get('workflow/notifications')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getWorkflowNotifications() {
    return {
      newBordereaux: await this.bordereauxService.findAll({ statut: 'A_SCANNER' }),
      overdueItems: await this.bordereauxService.getOverdueBordereaux(),
      approachingDeadlines: await this.bordereauxService.getApproachingDeadlines()
    };
  }
  
  @Get('scan/ready-for-import')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getBordereauReadyForScan() {
    return this.bordereauxService.getBordereauReadyForScan();
  }

  @Post(':id/auto-assign')
  @Roles(UserRole.SCAN_TEAM, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async autoAssignBordereau(@Param('id') bordereauId: string) {
    return this.bordereauxService.autoAssignBordereauAI(bordereauId);
  }

  @Get('gestionnaire/corbeille')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getGestionnaireCorbeille(@Req() req) {
    const user = req.user;
    
    // Gestionnaire only sees their assigned bordereaux
    const filters = user.role === UserRole.GESTIONNAIRE ? {
      assignedToUserId: user.id
    } : {}; // Other roles can see all (for debugging/management)
    
    const [enCours, traites, retournes] = await Promise.all([
      this.bordereauxService.findAll({ 
        ...filters,
        statut: ['ASSIGNE', 'EN_COURS']
      }),
      this.bordereauxService.findAll({ 
        ...filters,
        statut: ['TRAITE', 'CLOTURE']
      }),
      this.bordereauxService.findAll({ 
        ...filters,
        statut: ['REJETE', 'EN_DIFFICULTE']
      })
    ]);

    return {
      enCours: Array.isArray(enCours) ? enCours : enCours.items || [],
      traites: Array.isArray(traites) ? traites : traites.items || [],
      retournes: Array.isArray(retournes) ? retournes : retournes.items || [],
      stats: {
        enCours: Array.isArray(enCours) ? enCours.length : enCours.items?.length || 0,
        traites: Array.isArray(traites) ? traites.length : traites.items?.length || 0,
        retournes: Array.isArray(retournes) ? retournes.length : retournes.items?.length || 0
      },
      userRole: user.role,
      restrictions: user.role === UserRole.GESTIONNAIRE ? {
        message: "Accès limité aux dossiers qui vous sont personnellement affectés",
        canViewTeamData: false,
        canAssignTasks: false,
        canViewGlobalStats: false
      } : null
    };
  }

  @Get('debug/all-bordereaux')
  async debugAllBordereaux() {
    const bordereaux = await this.bordereauxService.findAll();
    const result = Array.isArray(bordereaux) ? bordereaux : bordereaux.items;
    return {
      total: result.length,
      bordereaux: result.map(b => ({
        id: b.id,
        reference: b.reference,
        statut: b.statut,
        client: b.client,
        dateReception: b.dateReception
      }))
    };
  }

  @Post('check-overload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async checkTeamOverload() {
    await (this.bordereauxService as any).checkAndNotifyOverload();
    return { success: true, message: 'Overload check completed' };
  }

  @Get('chef-equipe/stats')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getChefEquipeStats() {
    const [total, clotures, enCours, nonAffectes] = await Promise.all([
      this.bordereauxService.count({}),
      this.bordereauxService.count({ statut: ['TRAITE', 'CLOTURE'] }),
      this.bordereauxService.count({ statut: ['EN_COURS', 'ASSIGNE'] }),
      this.bordereauxService.count({ assignedToUserId: null })
    ]);
    
    return { total, clotures, enCours, nonAffectes };
  }

  @Get('chef-equipe/types')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getDossierTypes() {
    // Since 'type' field doesn't exist in schema, return mock data based on clients or other criteria
    const types = [
      { name: 'Prestation', total: 0, clotures: 0, enCours: 0, nonAffectes: 0 },
      { name: 'Adhésion', total: 0, clotures: 0, enCours: 0, nonAffectes: 0 },
      { name: 'Complément Dossier', total: 0, clotures: 0, enCours: 0, nonAffectes: 0 },
      { name: 'Avenant', total: 0, clotures: 0, enCours: 0, nonAffectes: 0 },
      { name: 'Réclamation', total: 0, clotures: 0, enCours: 0, nonAffectes: 0 }
    ];
    
    // Get actual counts for all bordereaux and distribute across types
    const [total, clotures, enCours, nonAffectes] = await Promise.all([
      this.bordereauxService.count({}),
      this.bordereauxService.count({ statut: ['TRAITE', 'CLOTURE'] }),
      this.bordereauxService.count({ statut: ['EN_COURS', 'ASSIGNE'] }),
      this.bordereauxService.count({ assignedToUserId: null })
    ]);
    
    // Distribute counts across types (simplified approach)
    const perType = Math.floor(total / types.length);
    const perTypeClotures = Math.floor(clotures / types.length);
    const perTypeEnCours = Math.floor(enCours / types.length);
    const perTypeNonAffectes = Math.floor(nonAffectes / types.length);
    
    return types.map((type, index) => ({
      ...type,
      total: index === 0 ? total - (perType * (types.length - 1)) : perType,
      clotures: index === 0 ? clotures - (perTypeClotures * (types.length - 1)) : perTypeClotures,
      enCours: index === 0 ? enCours - (perTypeEnCours * (types.length - 1)) : perTypeEnCours,
      nonAffectes: index === 0 ? nonAffectes - (perTypeNonAffectes * (types.length - 1)) : perTypeNonAffectes
    }));
  }

  @Get('chef-equipe/recent')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getRecentDossiers() {
    const recent = await this.bordereauxService.findAll({
      page: 1,
      pageSize: 10,
      sortBy: 'dateReception',
      sortOrder: 'desc'
    });
    
    const items = Array.isArray(recent) ? recent : recent.items || [];
    
    return items.map(bordereau => ({
      id: bordereau.id,
      reference: bordereau.reference,
      client: bordereau.client?.fullName || 'N/A',
      type: 'Bordereau',
      statut: this.getStatutLabel(bordereau.statut),
      gestionnaire: 'Non assigné',
      date: this.getRelativeTime(bordereau.dateReception)
    }));
  }

  @Get('chef-equipe/en-cours')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getDossiersEnCours() {
    const enCours = await this.bordereauxService.findAll({
      statut: ['EN_COURS', 'ASSIGNE'],
      page: 1,
      pageSize: 20
    });
    
    const items = Array.isArray(enCours) ? enCours : enCours.items || [];
    
    return items.map(bordereau => ({
      id: bordereau.id,
      reference: bordereau.reference,
      client: bordereau.client?.fullName || 'N/A',
      type: 'Bordereau',
      joursEnCours: this.calculateDaysInProgress(bordereau.dateReception),
      priorite: this.calculatePriority(bordereau)
    }));
  }

  @Get('chef-equipe/search')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async searchDossiers(@Query('query') query: string, @Query('type') type: string) {
    const filters: any = {
      page: 1,
      pageSize: 50
    };
    
    if (type === 'REF') {
      filters.reference = query;
    } else if (type === 'CLIENT') {
      filters.search = query;
    } else if (type === 'TYPE') {
      filters.search = query;
    }
    
    const results = await this.bordereauxService.findAll(filters);
    const items = Array.isArray(results) ? results : results.items || [];
    
    return items.map(bordereau => ({
      id: bordereau.id,
      reference: bordereau.reference,
      client: bordereau.client?.fullName || 'N/A',
      type: 'Bordereau',
      statut: this.getStatutLabel(bordereau.statut),
      gestionnaire: 'Non assigné'
    }));
  }

  private getTypeLabel(type: string): string {
    const typeMap = {
      'PRESTATION': 'Prestation',
      'ADHESION': 'Adhésion',
      'COMPLEMENT': 'Complément Dossier',
      'AVENANT': 'Avenant',
      'RECLAMATION': 'Réclamation'
    };
    return typeMap[type] || type;
  }

  private getStatutLabel(statut: string): string {
    const statutMap = {
      'EN_ATTENTE': 'Nouveau',
      'A_SCANNER': 'Nouveau',
      'SCAN_EN_COURS': 'En cours',
      'SCANNE': 'Nouveau',
      'A_AFFECTER': 'Nouveau',
      'ASSIGNE': 'En cours',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'CLOTURE': 'Traité',
      'EN_DIFFICULTE': 'Rejeté',
      'REJETE': 'Rejeté'
    };
    return statutMap[statut] || 'Nouveau';
  }

  private getRelativeTime(date: Date | string): string {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - targetDate.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'juste maintenant';
    if (minutes < 60) return `il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  private calculateDaysInProgress(dateReception: Date | string): number {
    const now = new Date();
    const receptionDate = typeof dateReception === 'string' ? new Date(dateReception) : dateReception;
    const diff = now.getTime() - receptionDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private calculatePriority(bordereau: any): string {
    const daysInProgress = this.calculateDaysInProgress(bordereau.dateReception);
    const delaiReglement = bordereau.delaiReglement || 30;
    
    if (daysInProgress > delaiReglement) return 'Élevée';
    if (daysInProgress > delaiReglement * 0.8) return 'Moyenne';
    return 'Normale';
  }

  @Get('chef-equipe/dashboard-stats')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getChefEquipeDashboardStats(@Req() req) {
    const [clients, bordereaux, documents, reclamations, gestionnaires] = await Promise.all([
      this.prisma.client.findMany({ select: { id: true, name: true } }),
      this.prisma.bordereau.findMany({
        include: { client: true, currentHandler: { select: { fullName: true } } },
        where: { archived: false }
      }),
      this.prisma.document.findMany({
        include: { 
          bordereau: { include: { client: true } },
          assignedTo: { select: { fullName: true } }
        },
        where: { bordereau: { archived: false } }
      }),
      this.prisma.reclamation.findMany({
        include: { client: true },
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      }),
      this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE' },
        select: { id: true, fullName: true }
      })
    ]);

    const clientBreakdown = {};
    clients.forEach(client => {
      clientBreakdown[client.name] = 0;
    });

    const gestionnaireBreakdown = {};
    gestionnaires.forEach(gest => {
      gestionnaireBreakdown[gest.fullName] = 0;
    });

    const stats = {
      prestation: { total: 0, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } },
      adhesion: { total: 0, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } },
      complement: { total: 0, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } },
      resiliation: { total: 0, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } },
      reclamation: { total: reclamations.length, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } },
      avenant: { total: 0, breakdown: { ...clientBreakdown }, gestionnaireBreakdown: { ...gestionnaireBreakdown } }
    };

    // Count documents by type and gestionnaire
    documents.forEach(doc => {
      const clientName = doc.bordereau?.client?.name;
      const gestionnaireName = doc.assignedTo?.fullName;
      
      if (!clientName || !clientBreakdown.hasOwnProperty(clientName)) return;
      
      switch (doc.type) {
        case 'BULLETIN_SOIN':
          stats.prestation.total++;
          stats.prestation.breakdown[clientName]++;
          if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
            stats.prestation.gestionnaireBreakdown[gestionnaireName]++;
          }
          break;
        case 'COMPLEMENT_INFORMATION':
          stats.complement.total++;
          stats.complement.breakdown[clientName]++;
          if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
            stats.complement.gestionnaireBreakdown[gestionnaireName]++;
          }
          break;
        case 'ADHESION':
          stats.adhesion.total++;
          stats.adhesion.breakdown[clientName]++;
          if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
            stats.adhesion.gestionnaireBreakdown[gestionnaireName]++;
          }
          break;
        case 'CONTRAT_AVENANT':
          stats.avenant.total++;
          stats.avenant.breakdown[clientName]++;
          if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
            stats.avenant.gestionnaireBreakdown[gestionnaireName]++;
          }
          break;
        case 'DEMANDE_RESILIATION':
          stats.resiliation.total++;
          stats.resiliation.breakdown[clientName]++;
          if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
            stats.resiliation.gestionnaireBreakdown[gestionnaireName]++;
          }
          break;
      }
    });

    // Map bordereaux to document types and gestionnaire
    bordereaux.forEach(bordereau => {
      const clientName = bordereau.client?.name;
      const gestionnaireName = bordereau.currentHandler?.fullName;
      
      if (!clientName || !clientBreakdown.hasOwnProperty(clientName)) return;
      
      stats.prestation.total++;
      stats.prestation.breakdown[clientName]++;
      if (gestionnaireName && gestionnaireBreakdown.hasOwnProperty(gestionnaireName)) {
        stats.prestation.gestionnaireBreakdown[gestionnaireName]++;
      }
    });

    // Count reclamations by client
    reclamations.forEach(rec => {
      const clientName = rec.client?.name;
      if (clientName && clientBreakdown.hasOwnProperty(clientName)) {
        stats.reclamation.breakdown[clientName]++;
      }
    });

    return stats;
  }

  @Get('chef-equipe/dashboard-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getChefEquipeDashboardDossiers(@Req() req) {
    const [documents, bordereaux] = await Promise.all([
      this.prisma.document.findMany({
        include: {
          bordereau: { include: { client: true } },
          assignedTo: { select: { fullName: true } }
        },
        where: { bordereau: { archived: false } },
        orderBy: { uploadedAt: 'desc' },
        take: 50
      }),
      this.prisma.bordereau.findMany({
        include: {
          client: true,
          currentHandler: { select: { fullName: true } }
        },
        where: { archived: false },
        orderBy: { dateReception: 'desc' },
        take: 50
      })
    ]);

    const dossiers: any[] = [];

    // Add documents as dossiers
    documents.forEach(doc => {
      dossiers.push({
        id: doc.id,
        reference: doc.bordereau?.reference || `DOC-${doc.id.substring(doc.id.length - 6)}`,
        nom: doc.name,
        societe: doc.bordereau?.client?.name || 'N/A',
        type: this.getDocumentTypeLabel(doc.type),
        statut: this.getDocumentStatusLabel(doc.status ?? 'UPLOADED'),
        date: doc.uploadedAt.toISOString().split('T')[0],
        gestionnaire: doc.assignedTo?.fullName || 'Non assigné'
      });
    });

    // Add bordereaux as dossiers
    bordereaux.forEach(bordereau => {
      dossiers.push({
        id: bordereau.id,
        reference: bordereau.reference,
        nom: `Bordereau ${bordereau.reference}`,
        societe: bordereau.client?.name || 'N/A',
        type: 'Prestation',
        statut: this.getStatutLabel(bordereau.statut),
        date: bordereau.dateReception?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        gestionnaire: bordereau.currentHandler?.fullName || 'Non assigné'
      });
    });

    return dossiers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);
  }

  private getDocumentTypeLabel(type: string): string {
    const typeMap = {
      'BULLETIN_SOIN': 'Prestation',
      'COMPLEMENT_INFORMATION': 'Complément de dossier',
      'ADHESION': 'Adhésion',
      'RECLAMATION': 'Réclamation',
      'CONTRAT_AVENANT': 'Avenant',
      'DEMANDE_RESILIATION': 'Résiliation'
    };
    return typeMap[type] || 'Autre';
  }

  private getDocumentStatusLabel(status: string): string {
    const statusMap = {
      'UPLOADED': 'Nouveau',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté'
    };
    return statusMap[status] || 'Nouveau';
  }

  @Get('chef-equipe/tableau-bord')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getChefEquipeTableauBord(@Req() req) {
    const dossiers = await this.getChefEquipeDashboardDossiers(req);
    return { dossiers };
  }

  @Get('chef-equipe/gestionnaire-assignments')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getGestionnaireAssignments(@Req() req) {
    const gestionnaires = await this.prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: {
        id: true,
        fullName: true,
        assignedDocuments: {
          include: {
            bordereau: { include: { client: true } }
          },
          where: {
            bordereau: { archived: false }
          }
        },
        bordereauxCurrentHandler: {
          include: { client: true },
          where: { 
            archived: false,
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    const assignments = await Promise.all(
      gestionnaires.map(async (gestionnaire) => {
        const returnedDocs = await this.prisma.documentAssignmentHistory.count({
          where: {
            fromUserId: gestionnaire.id,
            action: 'RETURNED'
          }
        });

        const docsByType = {};
        gestionnaire.assignedDocuments.forEach(doc => {
          const type = this.getDocumentTypeLabel(doc.type);
          docsByType[type] = (docsByType[type] || 0) + 1;
        });

        const bordereauxByType = {};
        gestionnaire.bordereauxCurrentHandler.forEach(bordereau => {
          const type = 'Prestation';
          bordereauxByType[type] = (bordereauxByType[type] || 0) + 1;
        });

        return {
          gestionnaire: gestionnaire.fullName,
          totalAssigned: gestionnaire.assignedDocuments.length + gestionnaire.bordereauxCurrentHandler.length,
          documentsAssigned: gestionnaire.assignedDocuments.length,
          bordereauxAssigned: gestionnaire.bordereauxCurrentHandler.length,
          documentsReturned: returnedDocs,
          documentsByType: docsByType,
          bordereauxByType: bordereauxByType
        };
      })
    );

    return assignments;
  }

  @Post(':id/gestionnaire-update-status')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async gestionnaireUpdateStatus(
    @Param('id') bordereauId: string,
    @Body() data: { newStatus: string; comment?: string },
    @Req() req
  ) {
    const user = req.user;
    
    // Get bordereau with assignment info
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });
    
    if (!bordereau) {
      throw new Error('Bordereau not found');
    }
    
    // Gestionnaire can only modify bordereaux assigned to them
    if (user.role === UserRole.GESTIONNAIRE && bordereau.assignedToUserId !== user.id) {
      throw new Error('Accès refusé: vous ne pouvez modifier que les dossiers qui vous sont assignés');
    }
    
    // Update status
    const updatedBordereau = await this.bordereauxService.update(bordereauId, {
      statut: data.newStatus as any
    });
    
    // Log the action
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'GESTIONNAIRE_STATUS_UPDATE',
        details: {
          bordereauId,
          oldStatus: bordereau.statut,
          newStatus: data.newStatus,
          comment: data.comment,
          userRole: user.role
        }
      }
    });
    
    return {
      success: true,
      bordereau: updatedBordereau,
      message: 'Statut mis à jour avec succès'
    };
  }

  @Post('chef-equipe/transfer-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async transferDossiers(@Body() data: { dossierIds: string[]; targetType: string }, @Req() req) {
    const user = req.user;
    const results: Array<{ id: string; success: boolean; type?: string; error?: string }> = [];
    
    for (const dossierId of data.dossierIds) {
      try {
        // Check if it's a document or bordereau
        const document = await this.prisma.document.findUnique({ where: { id: dossierId } });
        
        if (document) {
          // Update document type based on target
          const newType = this.getDocumentTypeFromLabel(data.targetType) as any;
          await this.prisma.document.update({
            where: { id: dossierId },
            data: { type: newType }
          });
          
          // Log the transfer
          await this.prisma.documentAssignmentHistory.create({
            data: {
              documentId: dossierId,
              assignedByUserId: user.id,
              action: 'TRANSFERRED',
              reason: `Transféré vers ${data.targetType}`
            }
          });
          
          results.push({ id: dossierId, success: true, type: 'document' });
        } else {
          // It's a bordereau - create audit log
          await this.prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'BORDEREAU_TRANSFERRED',
              details: {
                bordereauId: dossierId,
                targetType: data.targetType,
                timestamp: new Date().toISOString()
              }
            }
          });
          
          results.push({ id: dossierId, success: true, type: 'bordereau' });
        }
      } catch (error: any) {
        results.push({ id: dossierId, success: false, error: error.message });
      }
    }
    
    return {
      success: true,
      transferred: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  private getDocumentTypeFromLabel(label: string): string {
    const typeMap = {
      'Prestation': 'BULLETIN_SOIN',
      'Complément': 'COMPLEMENT_INFORMATION',
      'Adhésion': 'ADHESION',
      'Réclamation': 'RECLAMATION',
      'Avenant': 'CONTRAT_AVENANT',
      'Résiliation': 'DEMANDE_RESILIATION'
    };
    return typeMap[label] || 'BULLETIN_SOIN';
  }
}