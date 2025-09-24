import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BulletinSoinService } from './bulletin-soin.service';
import { CreateBulletinSoinDto } from './dto/create-bulletin-soin.dto';
import { UpdateBulletinSoinDto } from './dto/update-bulletin-soin.dto';
import { AssignBulletinSoinDto } from './dto/assign-bulletin-soin.dto';
import { ExpertiseInfoDto } from './dto/expertise-info.dto';
import { BsLogDto } from './dto/bs-log.dto';
import { BsQueryDto } from './dto/bs-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { ReconciliationReport } from './reconciliation.types';

@Controller('bulletin-soin')
export class BulletinSoinController {
  constructor(private readonly bsService: BulletinSoinService) {}

  // NOTIFICATIONS
  @Post('notify/sla')
  notifySla() {
    return this.bsService.notifySlaAlerts();
  }

  @Post('notify/assignment')
  notifyAssignment(@Body() body: { bsId: string; userId: string }) {
    return this.bsService.notifyAssignment(body.bsId, body.userId);
  }

  @Post('notify/overload')
  notifyOverload(@Body() body: { gestionnaireId: string; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }) {
    return this.bsService.notifyOverload(body.gestionnaireId, body.riskLevel);
  }

  @Get('notifications')
  @Public()
  async getNotifications() {
    try {
      // Return empty array for now - implement notifications later if needed
      return [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  // EXPORT/REPORTING
  @Get('export/excel')
  async exportExcel(@Req() req, @Res() res) {
    try {
      const bsList = await this.bsService.exportBsListToExcel();
      
      // Create Excel-compatible CSV with proper formatting
      const headers = ['Numéro BS', 'Assuré', 'Bénéficiaire', 'Prestataire', 'Date Création', 'Montant (DT)', 'Statut', 'Code Assuré'];
      const csvRows = [headers.join('\t')]; // Use tab separator for better Excel compatibility
      
      bsList.forEach(bs => {
        const row = [
          bs.numBs || '',
          bs.nomAssure || '',
          bs.nomBeneficiaire || '',
          bs.nomPrestation || '',
          bs.dateCreation ? new Date(bs.dateCreation).toLocaleDateString('fr-FR') : '',
          bs.totalPec ? Number(bs.totalPec).toFixed(3) : '0.000',
          bs.etat || '',
          bs.codeAssure || ''
        ];
        csvRows.push(row.join('\t'));
      });
      
      const csvContent = csvRows.join('\r\n');
      const filename = `BS_Export_${new Date().toISOString().split('T')[0]}.xls`;
      
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send('\uFEFF' + csvContent); // Add BOM for Excel UTF-8 support
    } catch (error) {
      console.error('Export error:', error);
      // Fallback to CSV if Excel fails
      const headers = ['Numéro BS', 'Assuré', 'Bénéficiaire', 'Prestataire', 'Date Création', 'Montant (DT)', 'Statut', 'Code Assuré'];
      const csvRows = [headers.join(',')];
      const bsList = await this.bsService.exportBsListToExcel();
      
      bsList.forEach(bs => {
        const row = [
          bs.numBs || '',
          bs.nomAssure || '',
          bs.nomBeneficiaire || '',
          bs.nomPrestation || '',
          bs.dateCreation ? new Date(bs.dateCreation).toLocaleDateString('fr-FR') : '',
          bs.totalPec ? Number(bs.totalPec).toFixed(3) : '0.000',
          bs.etat || '',
          bs.codeAssure || ''
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const filename = `BS_Export_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send('\uFEFF' + csvContent);
    }
  }



  // RECLAMATIONS LINK
  @Get('with-reclamations')
  getBsWithReclamations() {
    return this.bsService.getBsWithReclamations();
  }

  // DYNAMIC SLA
  @Get('calculate-due-date')
  calculateDueDate(@Query('dateCreation') dateCreation: string, @Query('contractId') contractId?: string) {
    return this.bsService.calculateDueDate(new Date(dateCreation), contractId);
  }

  // REBALANCING
  @Get('suggest-rebalancing')
  @Public()
  suggestRebalancing() {
    return this.bsService.suggestRebalancing();
  }

  @Post('apply-rebalancing')
  @Public()
  applyRebalancing(@Body() body: { bsId: string; toUserId: string }) {
    return this.bsService.applyRebalancing(body.bsId, body.toUserId);
  }

  // PREDICTIVE IA
  @Get('ai/escalation-risk/:bsId')
  estimateEscalationRisk(@Param('bsId') bsId: string) {
    return this.bsService.estimateEscalationRisk(bsId);
  }

  // AI ASSIGNMENT & PRIORITIZATION
  @Get('ai/suggest-assignment')
  @Public()
  async suggestAssignment() {
    try {
      const suggestions = await this.bsService.suggestAssignment();
      // Transform to expected format
      return suggestions.map(s => ({
        assignee: s.fullName || s.id,
        confidence: s.score > 0.8 ? 'high' : s.score > 0.5 ? 'medium' : 'low',
        score: s.score,
        reasoning: [
          `Efficacité: ${s.efficiency_score?.toFixed(2) || 'N/A'}`,
          `Charge actuelle: ${s.inProgress} BS`,
          `Retards: ${s.overdue} BS`,
          s.avgProcessingHours ? `Temps moyen: ${s.avgProcessingHours.toFixed(1)}h` : 'Nouveau gestionnaire'
        ]
      }));
    } catch (error) {
      return [];
    }
  }

  @Get('ai/suggest-priorities/:gestionnaireId')
  suggestPriorities(@Param('gestionnaireId') gestionnaireId: string) {
    return this.bsService.suggestPriorities(gestionnaireId);
  }

  /**
   * Advanced payment reconciliation with accounting system
   */
  @Get('reconcile-payments')
  reconcilePayments(): Promise<ReconciliationReport> {
    return this.bsService.reconcilePaymentsWithAccounting();
  }

  /**
   * Get payment status for a BS
   */
  @Get(':id/payment-status')
  getPaymentStatus(@Param('id') id: string) {
    return this.bsService.getPaymentStatus(id);
  }

  /**
   * List all BS for a virement
   */
  @Get('virement/:virementId')
  getBsForVirement(@Param('virementId') virementId: string) {
    return this.bsService.getBsForVirement(virementId);
  }

  /**
   * Mark a BS as paid (after virement confirmation)
   */
  @Patch(':id/mark-paid')
  markBsAsPaid(@Param('id') id: string) {
    return this.bsService.markBsAsPaid(id);
  }

  /**
   * Get gestionnaires list
   */
  @Get('gestionnaires')
  async getGestionnaires() {
    console.log('🔍 Getting gestionnaires endpoint hit...');
    try {
      const result = await this.bsService.getGestionnaires();
      console.log('✅ Gestionnaires found:', result.length, result);
      return { data: result, success: true };
    } catch (error) {
      console.error('❌ Error in getGestionnaires controller:', error);
      return { data: [], success: false, error: error.message };
    }
  }

  /**
   * Get paginated list of bulletins de soin with filtering.
   */
  @Get()
  @Public()
  findAll(@Query() query: BsQueryDto, @Req() req) {
    return this.bsService.findAll(query, req?.user);
  }

  /**
   * Get SLA alerts (overdue and approaching BS)
   */
  @Get('sla/alerts')
  getSlaAlerts() {
    return this.bsService.getSlaAlerts();
  }

  /**
   * Get performance metrics (BS processed per user per day)
   */
  @Get('kpi/performance')
  getPerformanceMetrics(@Query('start') start: string, @Query('end') end: string) {
    // Dates in YYYY-MM-DD format
    const startDate = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = end ? new Date(end) : new Date();
    return this.bsService.getPerformanceMetrics({ start: startDate, end: endDate });
  }

  /**
   * Get a single bulletin de soin by ID.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bsService.findOne(id, req.user);
  }

  /**
   * Create a new bulletin de soin.
   */
  @Post()
  create(@Body() dto: CreateBulletinSoinDto, @Req() req) {
    return this.bsService.create(dto);
  }

  /**
   * Update a bulletin de soin.
   */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBulletinSoinDto, @Req() req) {
    return this.bsService.update(id, dto, req.user);
  }

  /**
   * Soft delete a bulletin de soin.
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bsService.remove(id, req.user);
  }

  /**
   * Assign a bulletin de soin to a user.
   */
  @Post(':id/assign')
  @Public()
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignBulletinSoinDto, @Req() req) {
    return this.bsService.assign(id, dto, req?.user);
  }

  /**
   * Get OCR result for a bulletin de soin.
   */
  @Get(':id/ocr')
  getOcr(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bsService.getOcr(id, req.user);
  }

  /**
   * Get expertise info for a bulletin de soin.
   */
  @Get(':id/expertise')
  getExpertise(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bsService.getExpertise(id, req.user);
  }

  /**
   * Add or update expertise info for a bulletin de soin.
   */
  @Post(':id/expertise')
  updateExpertise(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ExpertiseInfoDto, @Req() req) {
    return this.bsService.upsertExpertise(Number(id), dto, req.user, dto);
  }

  /**
   * Get logs for a bulletin de soin.
   */
  @Get(':id/logs')
  getLogs(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bsService.getLogs(id, req.user);
  }

  /**
   * Add a log entry for a bulletin de soin.
   */
  @Post(':id/logs')
  addLog(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BsLogDto, @Req() req) {
    return this.bsService.addLog(id, dto, req.user);
  }

  /**
   * BS ANALYTICS ENDPOINTS
   */
  @Get('analytics/dashboard')
  @Public()
  getAnalyticsDashboard(@Query('period') period?: string) {
    return this.bsService.getAnalyticsDashboard(period);
  }

  @Get('analytics/trends')
  @Public()
  getTrends(@Query('period') period?: string) {
    return this.bsService.getTrends(period);
  }

  @Get('analytics/sla-compliance')
  @Public()
  getSlaCompliance(@Query('period') period?: string) {
    return this.bsService.getSlaCompliance(period);
  }

  @Get('analytics/team-performance')
  @Public()
  getTeamPerformanceAnalytics(@Query('period') period?: string) {
    return this.bsService.getTeamPerformanceAnalytics(period);
  }

  @Get('analytics/volume-stats')
  @Public()
  getVolumeAnalytics(@Query('period') period?: string) {
    return this.bsService.getVolumeStats(period);
  }

  /**
   * Bulk assign multiple BS to a user
   */
  @Post('bulk-assign')
  bulkAssign(@Body() body: { bsIds: string[]; ownerId: string }, @Req() req) {
    return Promise.all(
      body.bsIds.map(bsId => 
        this.bsService.assign(bsId, { ownerId: parseInt(body.ownerId) }, req.user)
      )
    );
  }

  /**
   * Get BS statistics for dashboard
   */
  @Get('stats/dashboard')
  getDashboardStats(@Req() req) {
    return this.bsService.getDashboardStats(req.user);
  }

  /**
   * Get team workload analysis
   */
  @Get('stats/team-workload')
  @Public()
  getTeamWorkload() {
    return this.bsService.getTeamWorkloadStats();
  }

  /**
   * Analyse charge (team load analysis)
   */
  @Get('analyse-charge')
  @Public()
  analyseCharge() {
    return this.bsService.analyseCharge();
  }

  /**
   * Test endpoint
   */
  @Get('test')
  @Public()
  test() {
    return { message: 'BS API is working', timestamp: new Date() };
  }

  /**
   * Sync BS from MY TUNICLAIM
   */
  @Post('sync/tuniclaim')
  @Public()
  async syncFromTuniclaim() {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.bsService['prisma'], outlookService);
      
      const result = await tuniclaimService.syncBs();
      
      return {
        success: true,
        ...result,
        message: result.errors > 0 
          ? `Synchronisation terminée avec ${result.errors} erreur(s). ${result.imported} bordereaux importés.`
          : `Synchronisation réussie! ${result.imported} bordereaux importés.`
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: 1,
        error: error.message,
        message: 'Erreur lors de la synchronisation avec MY TUNICLAIM'
      };
    }
  }

  /**
   * Get MY TUNICLAIM sync status
   */
  @Get('sync/tuniclaim/status')
  @Public()
  async getTuniclaimSyncStatus() {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.bsService['prisma'], outlookService);
      
      const logs = await tuniclaimService.getSyncLogs(10);
      const status = tuniclaimService.getSyncStatus();
      
      return {
        ...status,
        logs
      };
    } catch (error) {
      return {
        lastSync: null,
        lastResult: null,
        isHealthy: false,
        logs: [],
        error: error.message
      };
    }
  }

  /**
   * Push status update to MY TUNICLAIM
   */
  @Post('sync/tuniclaim/push-status')
  @Public()
  async pushStatusToTuniclaim(@Body() body: { bordereauId: string; statusData: any }) {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.bsService['prisma'], outlookService);
      
      await tuniclaimService.pushStatusUpdate(body.bordereauId, body.statusData);
      
      return {
        success: true,
        message: 'Status update pushed to MY TUNICLAIM successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to push status update to MY TUNICLAIM'
      };
    }
  }

  /**
   * Push payment update to MY TUNICLAIM
   */
  @Post('sync/tuniclaim/push-payment')
  @Public()
  async pushPaymentToTuniclaim(@Body() body: { bordereauId: string; paymentData: any }) {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.bsService['prisma'], outlookService);
      
      await tuniclaimService.pushPaymentUpdate(body.bordereauId, body.paymentData);
      
      return {
        success: true,
        message: 'Payment update pushed to MY TUNICLAIM successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to push payment update to MY TUNICLAIM'
      };
    }
  }
}