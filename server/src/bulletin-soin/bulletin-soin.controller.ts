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
import { ReconciliationReport } from './reconciliation.types';

@Controller('bulletin-soin')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  // EXPORT/REPORTING
  @Get('export/excel')
  exportExcel() {
    return this.bsService.exportBsListToExcel();
  }

  // LOAD/CAPACITY ANALYSIS
  @Get('analyse-charge')
  analyseCharge() {
    return this.bsService.analyseCharge();
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
  suggestRebalancing() {
    return this.bsService.suggestRebalancing();
  }

  // PREDICTIVE IA
  @Get('ai/escalation-risk/:bsId')
  estimateEscalationRisk(@Param('bsId') bsId: string) {
    return this.bsService.estimateEscalationRisk(bsId);
  }

  // AI ASSIGNMENT & PRIORITIZATION
  @Get('ai/suggest-assignment')
  suggestAssignment() {
    return this.bsService.suggestAssignment();
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
   * Get paginated list of bulletins de soin with filtering.
   */
  @Get()
  findAll(@Query() query: BsQueryDto, @Req() req) {
    return this.bsService.findAll(query, req.user);
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
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignBulletinSoinDto, @Req() req) {
    return this.bsService.assign(id, dto, req.user);
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
}