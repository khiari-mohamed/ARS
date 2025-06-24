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

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}



@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reclamations')
export class ReclamationsController {
  constructor(private readonly reclamationsService: ReclamationsService) {}

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

  @Patch(':id')
  async updateReclamation(
    @Param('id') id: string,
    @Body() dto: UpdateReclamationDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.updateReclamation(id, dto, user);
  }

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
  @Post('auto-assign')
  async autoAssign(@Body('department') department: string) {
    // Returns the least-loaded user in the department
    return { assignedToId: await this.reclamationsService.autoAssign(department) };
  }

  // Notification test endpoint
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

  @Get(':id')
  async getReclamation(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.getReclamation(id, user);
  }

  @Get('search')
  async searchReclamations(@Query() query: SearchReclamationDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.searchReclamations(query, user);
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

  @Get('trend')
  async trend(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.reclamationsService.trend(user);
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
}
