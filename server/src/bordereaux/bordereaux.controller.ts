import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux')
export class BordereauxController {
  contractsService: any;
  constructor(
    private readonly bordereauxService: BordereauxService,
    private readonly auditLogService: AuditLogService,
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
  findAll(): Promise<BordereauResponseDto[]> {
    return this.bordereauxService.findAll();
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

  // --- BS (BulletinSoin) Management ---
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

  // --- Documents, Virement, Alerts ---
  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.bordereauxService.getDocuments(id);
  }

  // Document upload (file upload + metadata)
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() documentData: any
  ) {
    // Merge file info into documentData if needed
    const data = { ...documentData, file };
    return this.bordereauxService.uploadDocument(id, data);
  }

  // Update bordereau status manually
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

  // --- Advanced Forecasting ---
  // --- Advanced Forecasting ---
  // Move these above the :id route to avoid conflicts
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

  // --- Temporary: Seed test data endpoint ---
  @Post('seed-test-data')
  async seedTestData() {
    return this.bordereauxService.seedTestData();
  }

  // --- Temporary: Seed complaints endpoint ---
  @Post('seed-complaints')
  async seedComplaints() {
    return this.bordereauxService.seedComplaints();
  }

  // --- AI Integration ---
  @Get('ai/complaints')
  analyzeComplaintsAI() {
    return this.bordereauxService.analyzeComplaintsAI();
  }

  @Get('ai/recommendations')
  getAIRecommendations() {
    return this.bordereauxService.getAIRecommendations();
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

  // --- Full-Text Search ---
  @Get('search')
  searchBordereauxAndDocuments(@Query('query') query: string) {
    return this.bordereauxService.searchBordereauxAndDocuments(query);
  }
}