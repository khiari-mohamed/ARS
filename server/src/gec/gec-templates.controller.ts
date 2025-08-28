import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GecTemplatesService } from './gec-templates.service';

function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@UseGuards(JwtAuthGuard)
@Controller('gec/templates')
export class GecTemplatesController {
  constructor(private readonly gecTemplatesService: GecTemplatesService) {}

  @Get()
  async getAllTemplates(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.getAllTemplates(user);
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.getTemplate(id, user);
  }

  @Post()
  async createTemplate(@Body() templateData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.createTemplate(templateData, user);
  }

  @Put(':id')
  async updateTemplate(@Param('id') id: string, @Body() templateData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.updateTemplate(id, templateData, user);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.deleteTemplate(id, user);
  }

  @Post(':id/duplicate')
  async duplicateTemplate(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecTemplatesService.duplicateTemplate(id, user);
  }
}