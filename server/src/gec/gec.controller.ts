import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { GecService } from './gec.service';
import { CreateCourrierDto } from './dto/create-courrier.dto';
import { SendCourrierDto } from './dto/send-courrier.dto';
import { SearchCourrierDto } from './dto/search-courrier.dto';
import { UpdateCourrierStatusDto } from './dto/update-courrier-status.dto';
import { TemplateService, Template } from './template.service';




// Extract user from JWT token
function getUserFromRequest(req: any) {
  if (req.user && req.user.sub) {
    return { id: req.user.sub, role: req.user.role || 'SUPER_ADMIN', email: req.user.email };
  }
  // Use the actual user ID from JWT instead of hardcoded fallback
  return { id: req.user?.sub || req.user?.id || 'system', role: 'SUPER_ADMIN', email: 'system@ars.com' };
}

@Controller('courriers')
export class GecController {
  private readonly logger = new Logger(GecController.name);
  
  constructor(
    private readonly gecService: GecService,
    private readonly templateService: TemplateService,
  ) {
    this.logger.log('🚀 GecController initialized with routes:');
    this.logger.log('  GET /api/courriers/sla-breaches');
    this.logger.log('  POST /api/courriers/trigger-relances');
    this.logger.log('  POST /api/courriers/bordereau/:bordereauId/relance');
  }



  // === SPECIFIC ROUTES FIRST (CRITICAL: BEFORE ANY PARAMETERIZED ROUTES) ===
  
  // SLA breaches endpoint - MUST BE FIRST
  @Get('sla-breaches')
  async getSLABreaches(@Req() req: any) {
    return this.gecService.getSLABreaches();
  }

  // Analytics endpoints
  @Get('analytics')
  async getAnalytics(@Query('period') period: string = '30d') {
    return this.gecService.getGECAnalytics(period);
  }

  @Get('volume-stats')
  async getVolumeStats(@Query('period') period: string = '7d') {
    return this.gecService.getVolumeStats(period);
  }

  @Get('ai-insights')
  async getAIInsights() {
    return this.gecService.getAIInsights();
  }

  // SMTP endpoints
  @Get('smtp/config')
  async getSMTPConfig(@Req() req: any) {
    const user = getUserFromRequest(req);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only admins can access SMTP config');
    }
    return {
      host: process.env.SMTP_HOST || 'smtp.gnet.tn',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || 'noreply@arstunisia.com',
      from: process.env.SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>'
    };
  }

  @Post('smtp/config')
  async saveSMTPConfig(@Body() config: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only admins can modify SMTP config');
    }
    return { message: 'Configuration saved successfully' };
  }

  @Post('smtp/test')
  async testSMTPConnection(@Body() config: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only admins can test SMTP');
    }
    return this.gecService.testSMTPConnection(config);
  }

  @Get('smtp/stats')
  async getSMTPStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.getSMTPStats();
  }

  @Get('search')
  async searchCourriers(@Query() query: SearchCourrierDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.searchCourriers(query, user);
  }

  @Get('tracking/stats')
  async getTrackingStats(@Query('period') period: string = '7d', @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.getEmailTrackingStats(period);
  }

  // A/B Test endpoints
  @Get('ab-tests')
  async getABTests(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.getABTests();
  }

  @Post('ab-tests')
  async createABTest(@Body() testData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.createABTest(testData, user);
  }

  @Patch('ab-tests/:id')
  async updateABTest(@Param('id') id: string, @Body() testData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.updateABTest(id, testData, user);
  }

  @Get('ab-tests/:id/results')
  async getABTestResults(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.getABTestResults(id);
  }

  @Get('reports/data')
  async getReportData(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('client') client?: string,
    @Query('department') department?: string,
    @Req() req?: any
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.getReportData({ dateFrom, dateTo, client, department });
  }

  // Relance endpoints
  @Post('trigger-relances')
  async triggerRelances(@Req() req: any) {
    const user = getUserFromRequest(req);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only admins can trigger relances');
    }
    return this.gecService.triggerRelances();
  }

  @Post('bordereau/:bordereauId/relance')
  async createRelance(
    @Param('bordereauId') bordereauId: string,
    @Body() body: { type: 'CLIENT' | 'PRESTATAIRE' },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.createAutomaticRelance(bordereauId, body.type, user);
  }

  // --- Template Management Endpoints ---
  @Get('templates')
  listTemplates() {
    return this.templateService.listTemplates();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplate(id);
  }

  @Post('templates')
  createTemplate(@Body() dto: Template) {
    return this.templateService.createTemplate(dto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<Template>) {
    return this.templateService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id);
  }

  @Post('templates/:id/render')
  async renderTemplate(
    @Param('id') id: string, 
    @Body() body: { variables?: Record<string, string>; context?: any },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    const tpl = await this.templateService.getTemplate(id);
    
    // Use AI auto-fill if context provided, otherwise manual variables
    if (body.context) {
      const aiResult = await this.gecService['aiAutoFillService'].renderTemplateWithAI(tpl.body, body.context);
      const subjectResult = await this.gecService['aiAutoFillService'].renderTemplateWithAI(tpl.subject, body.context);
      
      return {
        subject: subjectResult.renderedContent,
        body: aiResult.renderedContent,
        confidence: aiResult.confidence,
        usedVariables: aiResult.usedVariables
      };
    } else {
      const variables = body.variables || {};
      return {
        subject: this.templateService.renderTemplate(tpl.subject, variables),
        body: this.templateService.renderTemplate(tpl.body, variables),
        confidence: 1.0,
        usedVariables: variables
      };
    }
  }

  @Post()
  async createCourrier(@Body() dto: CreateCourrierDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.createCourrier(dto, user);
  }

  // PARAMETERIZED ROUTES LAST
  @Post(':id/send')
  async sendCourrier(
    @Param('id') id: string,
    @Body() dto: SendCourrierDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.sendCourrier(id, dto, user);
  }

  @Get(':id')
  async getCourrier(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.getCourrierById(id, user);
  }

  @Patch(':id/status')
  async updateCourrierStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCourrierStatusDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.updateCourrierStatus(id, dto, user);
  }

  @Delete(':id')
  async deleteCourrier(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.deleteCourrier(id, user);
  }

  @Post(':id/respond')
  async respondToCourrier(
    @Param('id') id: string,
    @Body() body: { response: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.respondToCourrier(id, body.response, user);
  }

  // === PARAMETERIZED ROUTES LAST ===
}
