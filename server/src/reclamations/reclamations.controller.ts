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
import { GECAutoReplyService } from './gec-auto-reply.service';
import { TuniclaimIntegrationService } from './tuniclaim-integration.service';
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly boIntegrationService: BOIntegrationService,
    private readonly aiClassificationService: AIClassificationService,
    private readonly gecAutoReplyService: GECAutoReplyService,
    private readonly tuniclaimIntegrationService: TuniclaimIntegrationService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { dest: './uploads/reclamations' }))
  async createReclamation(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    
    console.log('Creating reclamation with data:', dto);
    console.log('User ID:', userId);
    
    try {
      // Create reclamation directly with Prisma
      const reclamation = await this.prisma.reclamation.create({
        data: {
          type: dto.type || 'REMBOURSEMENT',
          severity: dto.severity || 'MOYENNE',
          status: 'OPEN',
          description: dto.description,
          department: dto.department || 'RECLAMATIONS',
          clientId: dto.clientId,
          createdById: userId,
          assignedToId: userId, // Auto-assign to creator for now
          evidencePath: file?.path
        }
      });
      
      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: reclamation.id,
          userId: userId,
          action: 'CREATE',
          toStatus: 'OPEN',
          description: 'Réclamation créée'
        }
      });
      
      console.log('Successfully created reclamation:', reclamation.id);
      return { 
        success: true, 
        message: 'Réclamation créée avec succès',
        data: reclamation 
      };
    } catch (error) {
      console.error('Error creating reclamation:', error);
      throw new Error('Erreur lors de la création de la réclamation');
    }
  }

  @Patch(':id')
  async updateReclamation(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    
    console.log(`Updating reclamation ${id} by user ${userId}`);
    console.log('Update data:', dto);
    
    try {
      // Get current reclamation
      const currentReclamation = await this.prisma.reclamation.findUnique({
        where: { id }
      });
      
      if (!currentReclamation) {
        throw new Error('Réclamation non trouvée');
      }
      
      // Update reclamation
      const updatedReclamation = await this.prisma.reclamation.update({
        where: { id },
        data: {
          status: dto.status || currentReclamation.status,
          description: dto.description || currentReclamation.description,
          assignedToId: dto.assignedToId !== undefined ? dto.assignedToId : currentReclamation.assignedToId
        }
      });
      
      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: id,
          userId: userId,
          action: 'UPDATE',
          fromStatus: currentReclamation.status,
          toStatus: updatedReclamation.status,
          description: dto.description || `Status updated to ${updatedReclamation.status}`
        }
      });
      
      console.log(`Successfully updated reclamation ${id}`);
      return { 
        success: true, 
        message: 'Réclamation mise à jour avec succès',
        data: updatedReclamation 
      };
    } catch (error) {
      console.error('Error updating reclamation:', error);
      throw new Error('Erreur lors de la mise à jour');
    }
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
    return this.gecAutoReplyService.generateAutoReply(id);
  }

  @Post(':id/auto-reply/approve')
  async approveAutoReply(
    @Param('id') id: string,
    @Body() body: { subject: string; body: string; recipientEmail: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.gecAutoReplyService.approveAndSendReply(id, {
      subject: body.subject,
      body: body.body,
      recipientEmail: body.recipientEmail
    }, user.id);
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

  // Enhanced Corbeille endpoints with complete workflow visibility
  @Get('corbeille/chef')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefCorbeille(@Req() req: any) {
    const user = getUserFromRequest(req);
    try {
      const [nonAffectes, enCours, traites] = await Promise.all([
        (this.reclamationsService as any).findMany({
          where: { assignedToId: null, status: { in: ['OPEN', 'PENDING'] } },
          include: { client: true, createdBy: true }
        }),
        (this.reclamationsService as any).findMany({
          where: { status: 'IN_PROGRESS' },
          include: { client: true, assignedTo: true, createdBy: true }
        }),
        (this.reclamationsService as any).findMany({
          where: { status: { in: ['RESOLVED', 'CLOSED'] } },
          include: { client: true, assignedTo: true, createdBy: true },
          orderBy: { updatedAt: 'desc' },
          take: 50
        })
      ]);

      const processItems = (items: any[]) => items.map(item => ({
        id: item.id,
        type: 'reclamation',
        reference: `REC-${item.id.slice(-6)}`,
        clientName: item.client?.name || 'Unknown',
        subject: item.description?.substring(0, 100) || 'No description',
        priority: item.severity || 'MOYENNE',
        status: item.status,
        createdAt: item.createdAt,
        assignedTo: item.assignedTo?.fullName,
        slaStatus: this.calculateSLAStatus(item),
        remainingTime: this.calculateRemainingTime(item)
      }));

      const stats = {
        nonAffectes: nonAffectes.length,
        enCours: enCours.length,
        traites: traites.length,
        enRetard: [...nonAffectes, ...enCours].filter(item => this.calculateSLAStatus(item) === 'OVERDUE').length,
        critiques: [...nonAffectes, ...enCours].filter(item => item.severity === 'HAUTE').length
      };

      return {
        nonAffectes: processItems(nonAffectes),
        enCours: processItems(enCours),
        traites: processItems(traites),
        stats
      };
    } catch (error) {
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  @Get('corbeille/gestionnaire')
  async getGestionnaireCorbeille(@Req() req: any) {
    console.log('Full req.user object:', JSON.stringify(req.user, null, 2));
    const userId = req.user?.sub || req.user?.id;
    
    console.log('Extracted userId:', userId);
    console.log('Getting corbeille for user:', userId);
    
    try {
      // Get reclamations assigned to this gestionnaire
      const reclamations = await this.prisma.reclamation.findMany({
        where: { assignedToId: userId },
        include: {
          client: true,
          assignedTo: true,
          createdBy: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`Found ${reclamations.length} reclamations for user ${userId}`);

      // Group by status
      const enCours = reclamations.filter(r => r.status === 'IN_PROGRESS' || r.status === 'OPEN');
      const traites = reclamations.filter(r => r.status === 'RESOLVED');
      const retournes = reclamations.filter(r => r.status === 'ESCALATED');

      // Format for frontend
      const formatItem = (r: any) => ({
        id: r.id,
        reference: `REC-${r.id.substring(0, 8)}`,
        clientName: r.client?.name || 'Unknown',
        subject: r.description?.substring(0, 100) || 'No description',
        priority: r.severity || 'MOYENNE',
        status: r.status,
        createdAt: r.createdAt,
        slaStatus: 'ON_TIME',
        remainingTime: 24
      });

      const result = {
        enCours: enCours.map(formatItem),
        traites: traites.map(formatItem),
        retournes: retournes.map(formatItem),
        stats: {
          enCours: enCours.length,
          traites: traites.length,
          retournes: retournes.length,
          enRetard: 0,
          critiques: enCours.filter(r => r.severity === 'critical').length
        }
      };

      console.log('Returning result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('Error in getGestionnaireCorbeille:', error);
      return {
        enCours: [],
        traites: [],
        retournes: [],
        stats: { enCours: 0, traites: 0, retournes: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  @Post('corbeille/bulk-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async corbeillebulkAssign(
    @Body() body: { reclamationIds: string[]; assignedToId: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    
    for (const id of body.reclamationIds) {
      try {
        await this.reclamationsService.assignReclamation(id, body.assignedToId, user);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Post(':id/return')
  async returnToChef(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any
  ) {
    const userId = req.user?.sub || req.user?.id;
    
    console.log(`Returning reclamation ${id} to chef by user ${userId}`);
    console.log('Reason:', body.reason);
    
    try {
      // Update reclamation status and clear assignment
      const updatedReclamation = await this.prisma.reclamation.update({
        where: { id },
        data: {
          status: 'ESCALATED',
          assignedToId: null
        }
      });
      
      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: id,
          userId: userId,
          action: 'RETURNED_TO_CHEF',
          fromStatus: updatedReclamation.status,
          toStatus: 'ESCALATED',
          description: `Returned to chef: ${body.reason}`
        }
      });
      
      console.log(`Successfully returned reclamation ${id} to chef`);
      return { success: true, message: 'Réclamation retournée au chef avec succès' };
    } catch (error) {
      console.error('Error returning to chef:', error);
      throw new Error('Erreur lors du retour au chef');
    }
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
    try {
      const result = await this.aiClassificationService.classifyClaim(body.text, body.metadata);
      return result;
    } catch (error) {
      console.error('Classification error:', error);
      throw new Error('Classification failed: ' + error.message);
    }
  }

  // Real AI Analysis endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/analyze')
  async performAIAnalysis(@Body() body: { type: string; parameters: any }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.performAIAnalysis(body.type, body.parameters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/predict-trends')
  async predictTrends(@Body() body: { period: string; categories?: string[] }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.advancedAnalyticsService.predictClaimTrends(body.period, body.categories);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('ai/learning-stats')
  async getLearningStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    // Access continuous learning service through DI
    const continuousLearning = this.reclamationsService['continuousLearningService'];
    if (continuousLearning) {
      return continuousLearning.getRecentLearningStats();
    }
    return { message: 'Continuous learning service not available' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ai/force-learning')
  async forceLearning(@Req() req: any) {
    const user = getUserFromRequest(req);
    const continuousLearning = this.reclamationsService['continuousLearningService'];
    if (continuousLearning) {
      await continuousLearning.forceLearningUpdate();
      return { success: true, message: 'Learning update triggered' };
    }
    return { success: false, message: 'Continuous learning service not available' };
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
    return this.aiClassificationService.getClassificationStats(period);
  }

  @Post('classification/feedback')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async updateClassificationModel(@Body() body: { feedbackData: any[] }) {
    return this.aiClassificationService.updateClassificationModel(body.feedbackData);
  }

  @Get('classification/recommendations')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAIRecommendations(@Query('period') period = '30d') {
    return this.aiClassificationService.getAIRecommendations(period);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SCAN_TEAM, UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getReclamationAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getReclamationAlerts(user);
  }

  // Mark alert as read
  @Patch('alerts/:id/read')
  async markAlertAsRead(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.markAlertAsRead(id, user);
  }

  // === MY TUNICLAIM INTEGRATION ENDPOINTS ===

  // Gestion centralisée des réclamations
  @Get('tuniclaim/centralized')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getCentralizedTuniclaimReclamations(@Query() filters: any) {
    return this.tuniclaimIntegrationService.getCentralizedReclamations(filters);
  }

  // Classification automatique via IA
  @Post(':id/tuniclaim/classify')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async classifyTuniclaimReclamation(@Param('id') id: string) {
    return this.tuniclaimIntegrationService.classifyReclamation(id);
  }

  // Historique et traçabilité complète
  @Get(':id/tuniclaim/complete-history')
  async getTuniclaimCompleteHistory(@Param('id') id: string) {
    return this.tuniclaimIntegrationService.getCompleteHistory(id);
  }

  // Notifications et relances automatiques
  @Post(':id/tuniclaim/setup-notifications')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async setupTuniclaimNotifications(
    @Param('id') id: string,
    @Body() config: any
  ) {
    return this.tuniclaimIntegrationService.setupAutomaticNotifications(id, config);
  }

  // Analyse IA et détection d'anomalies
  @Get('tuniclaim/anomaly-detection')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async performTuniclaimAnomalyDetection(@Query('period') period = '30d') {
    return this.tuniclaimIntegrationService.performAnomalyDetection(period);
  }

  // Réponses automatiques
  @Post(':id/tuniclaim/auto-response')
  async generateTuniclaimAutoResponse(@Param('id') id: string) {
    return this.tuniclaimIntegrationService.generateAutoResponse(id);
  }

  // Intégration avec processus internes
  @Get(':id/tuniclaim/internal-integration')
  async getTuniclaimInternalIntegration(@Param('id') id: string) {
    return this.tuniclaimIntegrationService.integrateWithInternalProcesses(id);
  }

  // Gestion des escalades
  @Post(':id/tuniclaim/escalate')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async manageTuniclaimEscalation(
    @Param('id') id: string,
    @Body() body: { type?: 'AUTO' | 'MANUAL' }
  ) {
    return this.tuniclaimIntegrationService.manageEscalation(id, body.type || 'AUTO');
  }

  // Helper methods for corbeille functionality
  private calculateSLAStatus(item: any): 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL' {
    const now = new Date();
    const createdAt = new Date(item.createdAt);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const slaHours = this.getSLAHours(item.severity);
    
    if (hoursSinceCreation > slaHours) return 'OVERDUE';
    if (hoursSinceCreation > slaHours * 0.9) return 'CRITICAL';
    if (hoursSinceCreation > slaHours * 0.7) return 'AT_RISK';
    return 'ON_TIME';
  }

  private calculateRemainingTime(item: any): number {
    const now = new Date();
    const createdAt = new Date(item.createdAt);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const slaHours = this.getSLAHours(item.severity);
    return Math.max(0, slaHours - hoursSinceCreation);
  }

  private getSLAHours(severity: string): number {
    switch (severity) {
      case 'HAUTE': return 4;
      case 'MOYENNE': return 24;
      case 'BASSE': return 72;
      default: return 24;
    }
  }
}
