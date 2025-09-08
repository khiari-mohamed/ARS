import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AdherentService, CreateAdherentDto, UpdateAdherentDto } from './adherent.service';
import { DonneurOrdreService, CreateDonneurOrdreDto, UpdateDonneurOrdreDto } from './donneur-ordre.service';
import { OrdreVirementService, CreateOrdreVirementDto, UpdateEtatVirementDto } from './ordre-virement.service';
import { FileGenerationService } from './file-generation.service';

function getUserFromRequest(req: any) {
  return req.user || { id: 'demo-user', role: 'FINANCE', fullName: 'Demo User' };
}

@Controller('finance')
export class FinanceController {
  constructor(
    private adherentService: AdherentService,
    private donneurOrdreService: DonneurOrdreService,
    private ordreVirementService: OrdreVirementService,
    private fileGenerationService: FileGenerationService
  ) {}

  // === ADHERENT ENDPOINTS ===
  @Post('adherents')
  async createAdherent(@Body() dto: CreateAdherentDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.adherentService.createAdherent(dto, user.id);
  }

  @Put('adherents/:id')
  async updateAdherent(@Param('id') id: string, @Body() dto: UpdateAdherentDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.adherentService.updateAdherent(id, dto, user.id);
  }

  @Get('adherents')
  async getAdherents(@Query('clientId') clientId?: string, @Query('search') search?: string) {
    if (search) {
      return this.adherentService.searchAdherents(search, clientId);
    }
    if (clientId) {
      return this.adherentService.findAdherentsByClient(clientId);
    }
    throw new BadRequestException('clientId or search parameter required');
  }

  @Get('adherents/:id')
  async getAdherent(@Param('id') id: string) {
    return this.adherentService.findAdherentByMatricule(id, ''); // Will be enhanced
  }

  @Delete('adherents/:id')
  async deleteAdherent(@Param('id') id: string) {
    return this.adherentService.deleteAdherent(id);
  }

  @Post('adherents/import')
  @UseInterceptors(FileInterceptor('file'))
  async importAdherents(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const user = getUserFromRequest(req);
    // Implementation for bulk import would go here
    return { message: 'Import functionality to be implemented' };
  }

  @Post('adherents/validate')
  async validateMatricules(@Body() body: { matricules: string[]; clientId: string }) {
    return this.adherentService.validateMatricules(body.matricules, body.clientId);
  }

  // === DONNEUR D'ORDRE ENDPOINTS ===
  @Post('donneurs-ordre')
  async createDonneurOrdre(@Body() dto: CreateDonneurOrdreDto) {
    return this.donneurOrdreService.createDonneurOrdre(dto);
  }

  @Put('donneurs-ordre/:id')
  async updateDonneurOrdre(@Param('id') id: string, @Body() dto: UpdateDonneurOrdreDto) {
    return this.donneurOrdreService.updateDonneurOrdre(id, dto);
  }

  @Get('donneurs-ordre')
  async getDonneursOrdre(@Query('activeOnly') activeOnly?: string) {
    return this.donneurOrdreService.findAllDonneurs(activeOnly !== 'false');
  }

  @Get('donneurs-ordre/:id')
  async getDonneurOrdre(@Param('id') id: string) {
    return this.donneurOrdreService.findDonneurById(id);
  }

  @Delete('donneurs-ordre/:id')
  async deleteDonneurOrdre(@Param('id') id: string) {
    return this.donneurOrdreService.deleteDonneurOrdre(id);
  }

  @Put('donneurs-ordre/:id/toggle-status')
  async toggleDonneurStatus(@Param('id') id: string) {
    return this.donneurOrdreService.toggleStatus(id);
  }

  @Get('donneurs-ordre/structures/formats')
  async getStructureFormats() {
    return this.donneurOrdreService.getStructureTxtFormats();
  }

  // === ORDRE VIREMENT ENDPOINTS ===
  @Post('ordres-virement/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { clientId: string; donneurOrdreId: string },
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('Excel file is required');
    }

    const user = getUserFromRequest(req);
    return this.ordreVirementService.processExcelImport(
      file.buffer,
      body.clientId,
      body.donneurOrdreId,
      user.id
    );
  }

  @Post('ordres-virement')
  async createOrdreVirement(@Body() dto: CreateOrdreVirementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    dto.utilisateurSante = user.id;
    return this.ordreVirementService.createOrdreVirement(dto);
  }

  @Put('ordres-virement/:id/etat')
  async updateEtatVirement(
    @Param('id') id: string,
    @Body() dto: UpdateEtatVirementDto,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    dto.utilisateurFinance = user.id;
    return this.ordreVirementService.updateEtatVirement(id, dto);
  }

  @Get('ordres-virement')
  async getOrdresVirement(@Query() filters: any) {
    return this.ordreVirementService.findOrdreVirements(filters);
  }

  @Get('ordres-virement/:id')
  async getOrdreVirement(@Param('id') id: string) {
    return this.ordreVirementService.findOrdreVirementById(id);
  }

  @Get('ordres-virement/:id/pdf')
  async downloadPDF(@Param('id') id: string, @Res() res: Response) {
    const ordreVirement = await this.ordreVirementService.findOrdreVirementById(id);
    
    if (!ordreVirement.fichierPdf) {
      throw new BadRequestException('PDF file not found');
    }

    const fileContent = await this.fileGenerationService.getFileContent(ordreVirement.fichierPdf);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="virement_${ordreVirement.reference}.pdf"`);
    res.send(fileContent);
  }

  @Get('ordres-virement/:id/txt')
  async downloadTXT(@Param('id') id: string, @Res() res: Response) {
    const ordreVirement = await this.ordreVirementService.findOrdreVirementById(id);
    
    if (!ordreVirement.fichierTxt) {
      throw new BadRequestException('TXT file not found');
    }

    const fileContent = await this.fileGenerationService.getFileContent(ordreVirement.fichierTxt);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="virement_${ordreVirement.reference}.txt"`);
    res.send(fileContent);
  }

  // === DASHBOARD ENDPOINTS ===
  @Get('dashboard')
  async getFinanceDashboard() {
    return this.ordreVirementService.getFinanceDashboard();
  }

  @Get('dashboard/stats')
  async getFinanceStats(@Query() filters: any) {
    const ordres = await this.ordreVirementService.findOrdreVirements(filters);
    
    const stats = {
      totalOrdres: ordres.length,
      montantTotal: ordres.reduce((sum, o) => sum + o.montantTotal, 0),
      adherentsTotal: ordres.reduce((sum, o) => sum + o.nombreAdherents, 0),
      parEtat: ordres.reduce((acc, o) => {
        acc[o.etatVirement] = (acc[o.etatVirement] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }

  // === SUIVI ENDPOINTS ===
  @Get('suivi/bordereaux')
  async getSuiviBordereaux(@Query() filters: any) {
    // Get bordereaux with virement tracking
    return this.ordreVirementService.findOrdreVirements({
      ...filters,
      includeBordereau: true
    });
  }

  @Get('suivi/notifications')
  async getSuiviNotifications(@Req() req: any) {
    const user = getUserFromRequest(req);
    
    // Get finance-related notifications
    const notifications = await this.ordreVirementService['prisma'].notification.findMany({
      where: {
        userId: user.id,
        type: { in: ['NOUVEAU_VIREMENT', 'VIREMENT_UPDATE'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return notifications;
  }

  // === HISTORIQUE ENDPOINTS ===
  @Get('historique')
  async getHistorique(@Query() filters: any) {
    return this.ordreVirementService.findOrdreVirements({
      ...filters,
      includeHistory: true
    });
  }

  @Get('historique/:id')
  async getHistoriqueOrdre(@Param('id') id: string) {
    const ordreVirement = await this.ordreVirementService.findOrdreVirementById(id);
    return {
      ordreVirement,
      historique: ordreVirement.historique
    };
  }
}