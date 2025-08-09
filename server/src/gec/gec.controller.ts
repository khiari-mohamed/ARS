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
} from '@nestjs/common';
import { GecService } from './gec.service';
import { CreateCourrierDto } from './dto/create-courrier.dto';
import { SendCourrierDto } from './dto/send-courrier.dto';
import { SearchCourrierDto } from './dto/search-courrier.dto';
import { UpdateCourrierStatusDto } from './dto/update-courrier-status.dto';
import { TemplateService, Template } from './template.service';




// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@Controller('courriers')
export class GecController {
  constructor(
    private readonly gecService: GecService,
    private readonly templateService: TemplateService,
  ) {}


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
  async renderTemplate(@Param('id') id: string, @Body() variables: Record<string, string>) {
    const tpl = await this.templateService.getTemplate(id);
    return {
      subject: this.templateService.renderTemplate(tpl.subject, variables),
      body: this.templateService.renderTemplate(tpl.body, variables),
    };
  }
  @Post()
  async createCourrier(@Body() dto: CreateCourrierDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.createCourrier(dto, user);
  }

  @Post(':id/send')
  async sendCourrier(
    @Param('id') id: string,
    @Body() dto: SendCourrierDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gecService.sendCourrier(id, dto, user);
  }

  @Get('search')
  async searchCourriers(@Query() query: SearchCourrierDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gecService.searchCourriers(query, user);
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
}
