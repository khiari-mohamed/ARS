import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  Get,
  Query,
  Param,
  Patch,  
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { GedService } from './ged.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';
import { Express } from 'express';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  // Example: req.user injected by auth middleware
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}



@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class GedController {
  constructor(private readonly gedService: GedService) {}

 @Post('upload')
@UseInterceptors(
  FileInterceptor('files', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }),
)
async uploadDocument(
  @UploadedFile() file: Express.Multer.File,
  @Body() body: CreateDocumentDto,
  @Req() req: any,
) {
  const user = getUserFromRequest(req);
  if (!file) throw new Error('No file uploaded.');
  return this.gedService.uploadDocument(file, body, user);
}

  // Advanced search endpoint
  @Post('advanced-search')
  async advancedSearch(@Body() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.performAdvancedSearch(query, user);
  }

  // Document workflow endpoints
  @Get('workflows/definitions')
  async getWorkflowDefinitions(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getWorkflowDefinitions(user);
  }

  @Post('workflows/start')
  async startWorkflow(@Body() body: { documentId: string; workflowId: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.startWorkflow(body.documentId, body.workflowId, user);
  }

  @Get('workflows/tasks/:userId')
  async getUserTasks(@Param('userId') userId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getUserWorkflowTasks(userId, user);
  }

  @Get('workflows/tasks/current')
  async getCurrentUserTasks(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getUserWorkflowTasks(user.id, user);
  }

  @Post('workflows/:instanceId/steps/:stepId/complete')
  async completeWorkflowStep(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() body: { decision: string; comments: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.completeWorkflowStep(instanceId, stepId, body.decision, body.comments, user);
  }

  @Get(':id/lifecycle')
  async getDocumentLifecycle(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentLifecycle(id, user);
  }

  // Integration endpoints
  @Get('integrations/connectors')
  async getConnectors(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getIntegrationConnectors(user);
  }

  @Post('integrations/connectors')
  async createConnector(@Body() connectorData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.createConnector(connectorData, user);
  }

  @Delete('integrations/connectors/:id')
  async deleteConnector(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.deleteConnector(id, user);
  }

  @Patch('integrations/connectors/:id')
  async updateConnector(@Param('id') id: string, @Body() connectorData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.updateConnector(id, connectorData, user);
  }

  @Post('integrations/connectors/:id/test')
  async testConnector(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.testConnector(id, user);
  }

  @Post('integrations/connectors/:id/sync')
  async syncConnector(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.syncConnector(id, user);
  }

  @Get('integrations/webhooks')
  async getWebhooks(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getWebhookSubscriptions(user);
  }

  @Post('integrations/webhooks')
  async createWebhook(@Body() webhookData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.createWebhook(webhookData, user);
  }

  @Delete('integrations/webhooks/:id')
  async deleteWebhook(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.deleteWebhook(id, user);
  }

  @Get('integrations/stats')
  async getIntegrationStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getIntegrationStats(user);
  }

  // Analytics and reports
  @Get('analytics')
  async getAnalytics(@Query('period') period: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getGEDAnalytics(period || '30d', user);
  }

  @Post('reports/generate')
  async generateReport(@Body() body: { type: string; format: string; filters?: any }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.generateReport(body.type, body.format, body.filters, user);
  }

  @Post('export')
  async exportReport(@Body() body: { type: string; format: string; filters?: any; reportData?: any }, @Req() req: any, @Res() res: any) {
    const user = getUserFromRequest(req);
    try {
      const buffer = await this.gedService.exportReport(body.type, body.format, body.filters, body.reportData, user);
      
      const filename = `ged_report_${body.type}_${new Date().toISOString().split('T')[0]}.${body.format}`;
      
      if (body.format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (body.format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export report: ' + error.message });
    }
  }

  @Get('search')
  async searchDocuments(@Query() query: SearchDocumentDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.searchDocuments(query, user);
  }

  // Dashboard metrics endpoint
  @Get('stats')
  async getDocumentStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentStats(user);
  }

  // SLA breach alert endpoint
  @Get('sla-breaches')
  async getSlaBreaches(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getSlaBreaches(user);
  }
  
  // SLA status endpoint
  @Get('sla-status')
  async getSlaStatus(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getSlaStatus(user);
  }

  // Audit trail endpoint
  @Get(':id/audit')
  async getDocumentAudit(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentAudit(id, user);
  }

  // Assignment/reaffectation endpoint
  @Patch(':id/assign')
  async assignDocument(
    @Param('id') id: string,
    @Body() body: { assignedToUserId?: string; teamId?: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.assignDocument(id, body, user);
  }

  // Update document status endpoint
  @Patch(':id/status')
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.updateDocumentStatus(id, body.status, user);
  }

  @Patch(':id/tag')
  async tagDocument(
    @Param('id') id: string,
    @Body() tags: { type?: string; bordereauId?: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.tagDocument(id, tags, user);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.deleteDocument(id, user);
  }

  // PaperStream integration endpoints
  @Get('paperstream/status')
  async getPaperStreamStatus(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getPaperStreamStatus(user);
  }

  @Get('paperstream/batches')
  async getPaperStreamBatches(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getPaperStreamBatches(query, user);
  }

  @Get('paperstream/quarantine')
  async getQuarantinedBatches(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getQuarantinedBatches(user);
  }

  @Post('paperstream/quarantine/:batchId/retry')
  async retryQuarantinedBatch(@Param('batchId') batchId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.retryQuarantinedBatch(batchId, user);
  }

  @Get('paperstream/analytics')
  async getPaperStreamAnalytics(@Query('period') period: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getPaperStreamAnalytics(period || '7d', user);
  }

  @Post('paperstream/config')
  async updatePaperStreamConfig(@Body() config: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.updatePaperStreamConfig(config, user);
  }

  @Get('paperstream/config')
  async getPaperStreamConfig(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getPaperStreamConfig(user);
  }

  // Catch-all route MUST BE LAST
  @Get(':id')
  async getDocument(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentById(id, user);
  }
}