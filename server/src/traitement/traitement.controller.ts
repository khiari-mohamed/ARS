import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Req,
  Param,
  Res,
} from '@nestjs/common';
import { TraitementService } from './traitement.service';
import { AssignTraitementDto } from './dto/assign-traitement.dto';
import { UpdateTraitementStatusDto } from './dto/update-traitement-status.dto';
import { SearchTraitementDto } from './dto/search-traitement.dto';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@Controller('traitement')
export class TraitementController {
  constructor(private readonly traitementService: TraitementService) {}

  @Get('global-inbox')
  async globalInbox(@Query() query: SearchTraitementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.globalInbox(query, user);
  }

  @Get('personal-inbox')
  async personalInbox(@Query() query: SearchTraitementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.personalInbox(user, query);
  }

  @Post('assign')
  async assignTraitement(@Body() dto: AssignTraitementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.assignTraitement(dto, user);
  }

  @Patch('status')
  async updateStatus(@Body() dto: UpdateTraitementStatusDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.updateStatus(dto, user);
  }

  @Get('kpi')
  async kpi(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.kpi(user);
  }

  @Get('ai/recommendations')
  async aiRecommendations(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.aiRecommendations(user);
  }

  @Get('export/excel')
  async exportStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.exportStats(user);
  }

  @Get('export/pdf')
  async exportStatsPdf(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.exportStatsPdf(user);
  }

  @Get(':bordereauId/history')
  async history(@Param('bordereauId') bordereauId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.traitementService.history(bordereauId, user);
  }

  @Get(':bordereauId/history/export/excel')
  async exportHistoryExcel(@Param('bordereauId') bordereauId: string, @Req() req: any, @Res() res) {
    const user = getUserFromRequest(req);
    const result = await this.traitementService.exportHistoryExcel(bordereauId, user);
    if (result && result.filePath) {
      res.download(result.filePath);
    } else {
      res.status(500).json({ error: 'Export failed' });
    }
  }

  @Get(':bordereauId/history/export/pdf')
  async exportHistoryPdf(@Param('bordereauId') bordereauId: string, @Req() req: any, @Res() res) {
    const user = getUserFromRequest(req);
    const result = await this.traitementService.exportHistoryPdf(bordereauId, user);
    if (result && result.filePath) {
      res.download(result.filePath);
    } else {
      res.status(500).json({ error: 'Export failed' });
    }
  }
}
