import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ReclamationsService } from './reclamations.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { SearchReclamationDto } from './dto/search-reclamation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Express } from 'express';
import { SLAEngineService } from './sla-engine.service';
import { CorbeilleService } from './corbeille.service';
import { BOIntegrationService } from './bo-integration.service';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AIClassificationService } from './ai-classification.service';
import { CustomerPortalService } from './customer-portal.service';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}



@Controller('reclamations')
export class ReclamationsController {
  
  // Apply guards to specific endpoints instead of globally
  private applyGuards() {
    return UseGuards(JwtAuthGuard, RolesGuard);
  }
  constructor(
    private readonly reclamationsService: ReclamationsService,
    private readonly slaEngineService: SLAEngineService,
    private readonly corbeilleService: CorbeilleService,
    private readonly boIntegrationService: BOIntegrationService
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', { dest: './uploads/reclamations' }))
  async createReclamation(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateReclamationDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    // Validate input
    if (!dto.description || !dto.type || !dto.severity || !dto.department) {
      throw new Error('All required fields (description, type, severity, department) must be provided.');
    }
    // Attach file path if uploaded
    if (file) dto['evidencePath'] = file.path;
    return this.reclamationsService.createReclamation(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async updateReclamation(
    @Param('id') id: string,
    @Body() dto: UpdateReclamationDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.updateReclamation(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/assign')
  async assignReclamation(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.assignReclamation(id, assignedToId, user);
  }

  // Automatic assignment endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('auto-assign')
  async autoAssign(@Body('department') department: string) {
    // Returns the least-loaded user in the department
    return { assignedToId: await this.reclamationsService.autoAssign(department) };
  }

  // Notification test endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/notify')
  async notify(@Param('id') id: string, @Body() body: { type: string, email?: string, sms?: string, message?: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    const reclamation = await this.reclamationsService.getReclamation(id, user);
    // Real email notification
    if (body.email) {
      await this.reclamationsService.notificationService.sendEmail(body.email, body.type || 'Notification', body.message || '');
    }
    // Real SMS notification (stub, implement in NotificationService)
    // if (body.sms) {
    //   await this.reclamationsService.notificationService.sendSms(body.sms, body.message || '');
    // }
    await this.reclamationsService.sendNotification(body.type, reclamation);
    return { notified: true };
  }

  // Bulk update endpoint
  @Patch('bulk-update')
  async bulkUpdate(@Body() body: { ids: string[], data: any }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.bulkUpdate(body.ids, body.data, user);
  }

  // Bulk assign endpoint
  @Patch('bulk-assign')
  async bulkAssign(@Body() body: { ids: string[], assignedToId: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.bulkAssign(body.ids, body.assignedToId, user);
  }

  // SLA tracking endpoint (get breaches)
  @Get('sla/breaches')
  async getSlaBreaches(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getSlaBreaches(user);
  }

  // SLA tracking endpoint (trigger check)
  @Post('sla/check')
  async checkSla(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.checkSla(user);
  }

  // GEC document retrieval endpoint (stub)
  @Get(':id/gec/document')
  async getGecDocument(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getGecDocument(id, user);
  }

  // Advanced AI/ML endpoint (stub)
  @Post('ai/predict')
  async aiPredict(@Body('text') text: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.aiPredict(text, user);
  }

  // GEC document generation endpoint
  @Post(':id/gec/generate')
  async generateGec(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    await this.reclamationsService.generateGecDocument(id, user);
    return { gecGenerated: true };
  }

  // Performance analytics endpoint
  @Get('analytics/performance')
  async performanceAnalytics(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.analytics(user);
  }

  @Patch(':id/escalate')
  async escalateReclamation(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.escalateReclamation(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getAllReclamations(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getAllReclamations(query, user);
  }

  @Get('search')
  async searchReclamations(@Query() query: SearchReclamationDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.searchReclamations(query, user);
  }

  @Get('trend')
  async trend(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.trend(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async getReclamation(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getReclamation(id, user);
  }

  @Get(':id/history')
  async getReclamationHistory(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getReclamationHistory(id, user);
  }

  @Get('ai/analysis')
  async aiAnalysis(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.aiAnalysis(user);
  }

  // AI-based correlation endpoint
  @Post('ai/correlation')
  async getCorrelationAI(@Body() payload: any) {
    return this.reclamationsService.getCorrelationAI(payload);
  }

  @Get('analytics/dashboard')
  async analytics(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.analytics(user);
  }

  @Post(':id/convert-to-task')
  async convertToTask(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.convertToTask(id, user);
  }

  @Get(':id/auto-reply')
  async autoReplySuggestion(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.autoReplySuggestion(id, user);
  }

  // === NEW ENDPOINTS FOR ENHANCED FUNCTIONALITY ===

  // BO Integration endpoints
  @Post('bo/create')
  @Roles(UserRole.BO, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('files', { dest: './uploads/reclamations' }))
  async createFromBO(
    @UploadedFile() files: Express.Multer.File,
    @Body() dto: any,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    if (files) dto.evidenceFiles = [files];
    return this.boIntegrationService.createFromBO(dto, user.id);
  }

  @Get('bo/stats')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBOStats() {
    return this.boIntegrationService.getBOStats();
  }

  @Post('bo/validate')
  @Roles(UserRole.BO, UserRole.SUPER_ADMIN)
  async validateReclamationData(@Body() dto: any) {
    return this.boIntegrationService.validateReclamationData(dto);
  }

  // Corbeille endpoints
  @Get('corbeille/chef')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefCorbeille(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.corbeilleService.getChefCorbeille(user.id);
  }

  @Get('corbeille/gestionnaire')
  @Roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async getGestionnaireCorbeille(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.corbeilleService.getGestionnaireCorbeille(user.id);
  }

  @Post('corbeille/bulk-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async corbeillebulkAssign(
    @Body() body: { reclamationIds: string[]; assignedToId: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.corbeilleService.bulkAssign(body.reclamationIds, body.assignedToId, user.id);
  }

  @Post(':id/return')
  @Roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async returnToChef(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.corbeilleService.returnToChef(id, user.id, body.reason);
  }

  @Post(':id/auto-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async autoAssignReclamation(@Param('id') id: string) {
    return this.corbeilleService.autoAssign(id);
  }

  // SLA Engine endpoints
  @Get(':id/sla-status')
  async getSLAStatus(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaEngineService.getSLAStatus(id);
  }

  @Get('sla/metrics')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getSLAMetrics(@Query('period') period = '30d') {
    return this.slaEngineService.getSLAMetrics(period);
  }

  @Post('sla/escalate-overdue')
  @Roles(UserRole.SUPER_ADMIN)
  async escalateOverdueReclamations() {
    return this.slaEngineService.escalateOverdueReclamations();
  }

  @Post('sla/monitor')
  @Roles(UserRole.SUPER_ADMIN)
  async triggerSLAMonitoring() {
    await this.slaEngineService.monitorSLAs();
    return { message: 'SLA monitoring triggered' };
  }

  // Advanced Analytics endpoints
  @Get('analytics/patterns')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getClaimPatterns(@Query('period') period = '90d') {
    return this.reclamationsService.advancedAnalyticsService.analyzeClaimPatterns(period);
  }

  @Get('analytics/root-causes')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getRootCauses(@Query('period') period = '90d') {
    return this.reclamationsService.advancedAnalyticsService.identifyRootCauses(period);
  }

  @Get('analytics/insights')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAnalyticsInsights(@Query('period') period = '90d') {
    return this.reclamationsService.advancedAnalyticsService.generateAnalyticsInsights(period);
  }

  @Get('analytics/metrics')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAdvancedMetrics(@Query('period') period = '30d') {
    return this.reclamationsService.advancedAnalyticsService.getAdvancedMetrics(period);
  }

  // AI Classification endpoints
  @Post('classify')
  async classifyClaim(@Body() body: { text: string; metadata?: any }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.aiClassificationService.classifyClaim(body.text, body.metadata);
  }

  // Real AI Analysis endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/analyze')
  async performAIAnalysis(@Body() body: { type: string; parameters: any }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.performAIAnalysis(body.type, body.parameters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/generate-report')
  async generateAIReport(@Body() body: { reportType: string; period: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.generateAIReport(body.reportType, body.period);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/predict')
  async predictClaimTrends(@Body() body: { period: string; categories?: string[] }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.predictClaimTrends(body.period, body.categories);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/cost-analysis')
  async performCostAnalysis(@Body() body: { period: string; currency?: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.performCostAnalysis(body.period, body.currency || 'TND');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/generate-action-plan')
  async generateActionPlan(@Body() body: { rootCause: any; period: string; currency?: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.generateActionPlan(body.rootCause, body.period, body.currency || 'TND');
  }

  @Get('classification/stats')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getClassificationStats(@Query('period') period = '30d') {
    return this.reclamationsService.aiClassificationService.getClassificationStats(period);
  }

  @Post('classification/feedback')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async updateClassificationModel(@Body() body: { feedbackData: any[] }) {
    return this.reclamationsService.aiClassificationService.updateClassificationModel(body.feedbackData);
  }

  @Get('classification/recommendations')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAIRecommendations(@Query('period') period = '30d') {
    return this.reclamationsService.aiClassificationService.getAIRecommendations(period);
  }



  // Customer Portal endpoints
  @Post('customer/submit')
  @UseInterceptors(FileInterceptor('attachments', { dest: './uploads/reclamations' }))
  async submitCustomerClaim(
    @UploadedFile() files: Express.Multer.File,
    @Body() submission: any
  ) {
    if (files) {
      submission.attachments = [files];
    }
    return this.reclamationsService.customerPortalService.submitClaim(submission);
  }

  @Get('customer/:claimId/status')
  async getCustomerClaimStatus(
    @Param('claimId') claimId: string,
    @Query('clientId') clientId: string
  ) {
    return this.reclamationsService.customerPortalService.getClaimStatus(claimId, clientId);
  }

  @Get('customer/:clientId/stats')
  async getCustomerPortalStats(@Param('clientId') clientId: string) {
    return this.reclamationsService.customerPortalService.getCustomerPortalStats(clientId);
  }

  @Get('customer/:clientId/claims')
  async getCustomerClaims(@Param('clientId') clientId: string, @Query() filters?: any) {
    return this.reclamationsService.customerPortalService.getCustomerClaims(clientId, filters);
  }

  @Post('customer/:claimId/response')
  @UseInterceptors(FileInterceptor('attachments', { dest: './uploads/reclamations' }))
  async addCustomerResponse(
    @Param('claimId') claimId: string,
    @UploadedFile() files: Express.Multer.File,
    @Body() body: { clientId: string; message: string }
  ) {
    const attachments = files ? [files] : undefined;
    return this.reclamationsService.customerPortalService.addCustomerResponse(
      claimId,
      body.clientId || 'demo',
      body.message,
      attachments
    );
  }

  @Post('customer/:claimId/feedback')
  async submitCustomerFeedback(
    @Param('claimId') claimId: string,
    @Body() body: { clientId: string; rating: number; comments?: string }
  ) {
    return this.reclamationsService.customerPortalService.submitCustomerFeedback(
      claimId,
      body.clientId,
      body.rating,
      body.comments
    );
  }

  // Alerts endpoint
  @Get('alerts')
  async getReclamationAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    // Mock alerts for now - in production would fetch from AlertLog
    return [
      {
        id: '1',
        type: 'SLA_BREACH',
        level: 'error',
        title: 'SLA dépassé',
        message: 'La réclamation REC-001 a dépassé son SLA',
        reclamationId: 'rec-001',
        clientName: 'Client Test',
        createdAt: new Date().toISOString(),
        read: false
      }
    ];
  }
}
