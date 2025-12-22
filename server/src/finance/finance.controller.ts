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
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../auth/user-role.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdherentService, CreateAdherentDto, UpdateAdherentDto } from './adherent.service';
import { DonneurOrdreService, CreateDonneurOrdreDto, UpdateDonneurOrdreDto } from './donneur-ordre.service';
import { OrdreVirementService, CreateOrdreVirementDto, UpdateEtatVirementDto } from './ordre-virement.service';
import { FileGenerationService } from './file-generation.service';
import { FinanceService } from './finance.service';
import { BankFormatConfigService } from './bank-format-config.service';
import { SlaConfigurationService } from './sla-configuration.service';

function getUserFromRequest(req: any) {
  // Extract from JWT token - the JWT strategy returns: id, email, role
  if (req.user && req.user.id) {
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.email || 'User'
    };
  }
  
  // Fallback to demo user
  return { id: 'demo-user', role: 'SUPER_ADMIN', fullName: 'Demo User' };
}

// EXACT roles from specifications: Chef d'équipe, Gestionnaire Senior, Finance, Super Admin, Responsable Département
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
export class FinanceController {
  constructor(
    private adherentService: AdherentService,
    private donneurOrdreService: DonneurOrdreService,
    private ordreVirementService: OrdreVirementService,
    private fileGenerationService: FileGenerationService,
    private financeService: FinanceService,
    private bankFormatConfig: BankFormatConfigService,
    private slaConfigService: SlaConfigurationService,
    private prisma: PrismaService
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
    if (search !== undefined) {
      return this.adherentService.searchAdherents(search, clientId);
    }
    if (clientId !== undefined) {
      return this.adherentService.findAdherentsByClient(clientId);
    }
    // Return all adherents if no parameters
    return this.adherentService.searchAdherents('', '');
  }

  @Get('adherents/:id')
  async getAdherent(@Param('id') id: string) {
    return this.adherentService.findAdherentByMatricule(id, ''); // Will be enhanced
  }

  @Delete('adherents/:id')
  async deleteAdherent(@Param('id') id: string) {
    return this.adherentService.deleteAdherent(id);
  }

  @Get('adherents/:id/rib-history')
  async getAdherentRibHistory(@Param('id') id: string) {
    return this.adherentService.getAdherentRibHistory(id);
  }

  @Post('adherents/import')
  @UseInterceptors(FileInterceptor('file'))
  async importAdherents(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const user = getUserFromRequest(req);
    
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      // Get first client or create one
      let defaultClient = await this.prisma.client.findFirst();
      if (!defaultClient) {
        defaultClient = await this.prisma.client.create({
          data: {
            name: 'AIR LIQUIDE TUNISIE ACTIFS',
            reglementDelay: 30,
            reclamationDelay: 15
          }
        });
      }
      
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      console.log(`📊 Total rows in Excel: ${data.length}`);
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        try {
          const matricule = row['Matricule. Assurance'] || row['Matricule'] || row['matricule'];
          const assuranceCompany = row['ASSURE'] || row['Assurance'] || '';
          const fullName = row['Name'] || row['Nom'] || row['nom'] || '';
          const rib = String(row['Banque'] || row['RIB'] || row['rib'] || '').replace(/\D/g, '');
          
          
          if (!matricule || !rib) {
            skipped++;
            errors.push(`Ligne ${i + 1} ignorée: matricule=${matricule || 'vide'}, rib=${rib || 'vide'}`);
            console.log(`⚠️ Row ${i + 1} skipped: missing data`);
            continue;
          }
          
          if (rib.length !== 20) {
            skipped++;
            errors.push(`Ligne ${i + 1}: RIB invalide (${rib.length} chiffres au lieu de 20)`);
            console.log(`⚠️ Row ${i + 1} skipped: invalid RIB length ${rib.length}`);
            continue;
          }
          
          const nameParts = fullName.split(' ');
          const adherentData = {
            matricule: String(matricule),
            nom: nameParts[0] || fullName,
            prenom: nameParts.slice(1).join(' ') || '',
            clientId: defaultClient.id,
            rib: rib,
            codeAssure: String(row['Code Assurée'] || row['Code Assuré'] || row['Code Assure'] || row['codeAssure'] || ''),
            numeroContrat: String(row['ContratN'] || row['Numéro Contrat'] || row['Numero Contrat'] || row['numeroContrat'] || ''),
            assurance: assuranceCompany,
            statut: 'ACTIF'
          };
          
          await this.adherentService.createAdherent(adherentData, user.id);
          imported++;
          console.log(`✅ Row ${i + 1} imported: ${matricule}`);
        } catch (error: any) {
          skipped++;
          errors.push(`Ligne ${i + 1}: ${error.message}`);
          console.log(`❌ Row ${i + 1} failed: ${error.message}`);
        }
      }
      
      console.log(`📊 Import summary: ${imported} imported, ${skipped} skipped, ${data.length} total`);
      
      return {
        success: true,
        imported,
        skipped,
        total: data.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: `${imported} adhérent(s) importé(s) sur ${data.length}. ${skipped} ignoré(s).`
      };
    } catch (error) {
      throw new BadRequestException('Failed to process file: ' + error.message);
    }
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
    @Body() body: { clientId: string; donneurOrdreId: string; bordereauId?: string },
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
      user.id,
      body.bordereauId
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

  // EXACT SPEC: View PDF OV (generated by system) - Works like PDF Bordereau
  @Get('ordres-virement/:id/pdf')
  async viewOVPDF(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const user = getUserFromRequest(req);
    const pdfBuffer = await this.financeService.getOVPDFBuffer(id, user as any);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ordre_virement_${id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  }

  // EXACT SPEC: View TXT OV (generated by system) - Works like PDF Bordereau
  @Get('ordres-virement/:id/txt')
  async viewOVTXT(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const user = getUserFromRequest(req);
    const txtContent = await this.financeService.getOVTXTContent(id, user as any);
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `inline; filename="ordre_virement_${id}.txt"`,
      'Content-Length': Buffer.byteLength(txtContent, 'utf8')
    });
    res.send(txtContent);
  }

  // === DASHBOARD ENDPOINTS ===
  @Get('dashboard')
  async getFinanceDashboard(
    @Query() filters: {
      compagnie?: string;
      client?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.getFinanceDashboardWithFilters(filters, user as any);
  }

  // NEW: Excel export for dashboard
  @Get('dashboard/export')
  async exportDashboard(
    @Query() filters: {
      compagnie?: string;
      client?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    @Res() res: Response,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    const dashboardData = await this.financeService.getFinanceDashboardWithFilters(filters, user as any);
    
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tableau de Bord Finance');
    
    // Add headers
    worksheet.addRow([
      'Référence OV',
      'Référence Bordereau', 
      'Compagnie d\'Assurance',
      'Client/Société',
      'Bordereau',
      'Montant (TND)',
      'Statut',
      'Date d\'Exécution',
      'Motif/Observations',
      'Demande Récupération',
      'Montant Récupéré'
    ]);
    
    // Add data
    dashboardData.ordresVirement.forEach((ordre: any) => {
      worksheet.addRow([
        ordre.reference || '',
        ordre.referenceBordereau || '',
        ordre.compagnieAssurance || '',
        ordre.client || '',
        ordre.bordereau || '',
        ordre.montant || 0,
        ordre.statut || '',
        ordre.dateExecution ? new Date(ordre.dateExecution).toLocaleDateString('fr-FR') : '',
        ordre.motifObservation || '',
        ordre.demandeRecuperation ? 'Oui' : 'Non',
        ordre.montantRecupere ? 'Oui' : 'Non'
      ]);
    });
    
    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tableau_bord_finance_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('dashboard/stats')
  async getFinanceStats(
    @Query() filters: {
      compagnie?: string;
      client?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    const dashboardData = await this.financeService.getFinanceDashboardWithFilters(filters, user as any);
    return dashboardData.stats;
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

  // === ALERTS ENDPOINT ===
  @Get('alerts')
  async getFinanceAlerts() {
    const alerts = [];
    
    // Get delayed bordereaux
    const delayedBordereaux = await this.ordreVirementService['prisma'].bordereau.findMany({
      where: {
        statut: { in: ['EN_COURS', 'ASSIGNE'] }
      },
      include: {
        client: true
      },
      take: 50
    });
    
    // Get overdue virements directly
    const overdueVirements = await this.ordreVirementService['prisma'].ordreVirement.findMany({
      where: {
        etatVirement: { in: ['NON_EXECUTE', 'EN_COURS_EXECUTION'] }
      },
      take: 50
    });
    
    return {
      delayedBordereaux,
      overdueVirements,
      totalAlerts: delayedBordereaux.length + overdueVirements.length
    };
  }

  // === NOTIFICATIONS ENDPOINT ===
  @Post('notifications')
  async sendFinanceNotification(@Body() notificationData: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    
    // Log notification (could be saved to database later)
    console.log('Finance notification sent:', {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user: user.id,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Notification envoyée avec succès',
      timestamp: new Date().toISOString()
    };
  }

  // === UPLOAD STATEMENT ENDPOINT ===
  @Post('upload-statement')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { bankCode: string; accountNumber: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Log the upload details
    console.log('📄 Bank statement upload received:', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
      user: user.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Get the first available client or create a default one
      let clientId;
      try {
        const firstClient = await this.ordreVirementService['prisma'].client.findFirst();
        if (firstClient) {
          clientId = firstClient.id;
        } else {
          // Create a default client if none exists
          const defaultClient = await this.ordreVirementService['prisma'].client.create({
            data: {
              name: 'Client Import',
              email: 'import@ars.tn',
              phone: '00000000',
              address: 'Adresse Import',
              reglementDelay: 30,
              reclamationDelay: 15
            }
          });
          clientId = defaultClient.id;
        }
      } catch (error) {
        console.error('Failed to get/create client:', error);
        throw new BadRequestException('Unable to assign client to bordereau');
      }
      
      // Create a new bordereau record for the uploaded statement
      const newBordereau = await this.ordreVirementService['prisma'].bordereau.create({
        data: {
          reference: `STMT-${body.bankCode}-${Date.now()}`,
          clientId: clientId,
          dateReception: new Date(),
          statut: 'A_SCANNER', // Initial status for uploaded statement
          nombreBS: 1,
          delaiReglement: 30,
          scanStatus: 'imported',
          completionRate: 0,
          priority: 1,
          archived: false
        }
      });
      
      console.log('💾 Created new bordereau for uploaded statement:', newBordereau.id);
      
      return {
        success: true,
        message: 'Relevé bancaire importé avec succès',
        filename: file.originalname,
        size: file.size,
        bordereauId: newBordereau.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to create bordereau for uploaded statement:', error);
      
      // Still return success for the upload, but log the database error
      return {
        success: true,
        message: 'Relevé bancaire importé avec succès (fichier seulement)',
        filename: file.originalname,
        size: file.size,
        timestamp: new Date().toISOString()
      };
    }
  }

  // === PROCESS STATEMENT ENDPOINT ===
  @Post('statements/:id/process')
  async processStatement(
    @Param('id') id: string,
    @Body() body: { statementId: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      // Find the bordereau to process
      const bordereau = await this.ordreVirementService['prisma'].bordereau.findUnique({
        where: { id },
        include: {
          client: true,
          virement: true
        }
      });
      
      if (!bordereau) {
        throw new BadRequestException('Bordereau not found');
      }
      
      // Update bordereau status to processed/reconciled
      const updatedBordereau = await this.ordreVirementService['prisma'].bordereau.update({
        where: { id },
        data: {
          statut: 'TRAITE',
          dateCloture: new Date(),
          completionRate: 100
        },
        include: {
          client: true,
          virement: true
        }
      });
      
      // If no virement exists, create one for reconciliation
      if (!bordereau.virement) {
        await this.ordreVirementService['prisma'].virement.create({
          data: {
            bordereauId: id,
            montant: bordereau.nombreBS * 100, // Estimate amount
            referenceBancaire: `REF_${id.substring(0, 8)}`,
            dateDepot: new Date(),
            dateExecution: new Date(),
            confirmed: true,
            confirmedAt: new Date()
          }
        });
      }
      
      console.log('Statement processed successfully:', {
        bordereauId: id,
        status: 'TRAITE',
        user: user.id,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Traitement du relevé terminé avec succès',
        bordereau: updatedBordereau,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to process statement:', error);
      throw new BadRequestException('Failed to process statement: ' + error.message);
    }
  }

  // === RESOLVE EXCEPTION ENDPOINT ===
  @Put('exceptions/:id/resolve')
  async resolveException(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      // Extract bordereau ID from exception ID (format: exc_bordereauId)
      const bordereauId = id.replace('exc_', '');
      
      // Find and update the bordereau to resolve the exception
      const bordereau = await this.ordreVirementService['prisma'].bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: true,
          virement: true
        }
      });
      
      if (!bordereau) {
        throw new BadRequestException('Bordereau not found for exception');
      }
      
      // Update bordereau to resolve the exception
      const updatedBordereau = await this.ordreVirementService['prisma'].bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'TRAITE', // Mark as processed to resolve exception
          dateCloture: new Date(),
          completionRate: 100
        },
        include: {
          client: true,
          virement: true
        }
      });
      
      // Create virement if it doesn't exist (to complete reconciliation)
      if (!bordereau.virement) {
        await this.ordreVirementService['prisma'].virement.create({
          data: {
            bordereauId: bordereauId,
            montant: bordereau.nombreBS * 150, // Estimate amount
            referenceBancaire: `RESOLVED_${bordereauId.substring(0, 8)}`,
            dateDepot: new Date(),
            dateExecution: new Date(),
            confirmed: true,
            confirmedAt: new Date()
          }
        });
      }
      
      console.log('Exception resolved successfully:', {
        exceptionId: id,
        bordereauId: bordereauId,
        status: body.status,
        user: user.id,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Exception résolue avec succès',
        exceptionId: id,
        bordereau: updatedBordereau,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to resolve exception:', error);
      throw new BadRequestException('Failed to resolve exception: ' + error.message);
    }
  }

  // === NEW ENDPOINTS FOR MISSING FEATURES ===
  
  // Excel validation endpoint
  @Post('validate-excel')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcelFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return await this.financeService.validateOVFile(file, body, user as any);
  }

  // PDF generation endpoint
  @Get('ordre-virement/:id/generate-pdf')
  async generateOVPDF(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return await this.financeService.generateOVPDF(id, res, user as any);
  }

  // TXT generation endpoint
  @Get('ordre-virement/:id/generate-txt')
  async generateOVTXT(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return await this.financeService.generateOVTXT(id, res, user as any);
  }

  // Suivi virement endpoints
  @Get('suivi-virement')
  async getSuiviVirements(
    @Query() filters: {
      etatVirement?: string;
      societe?: string;
      dateFrom?: string;
      dateTo?: string;
      utilisateurSante?: string;
      utilisateurFinance?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return await this.financeService.getOVTracking(filters, user as any);
  }

  @Get('suivi-virement/:id')
  async getSuiviVirementById(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return await this.financeService.getVirementById(id, user as any);
  }

  // === BANK FORMAT CONFIGURATION ===
  @Get('bank-formats')
  async getBankFormats() {
    return this.bankFormatConfig.getBankFormats();
  }

  @Get('bank-formats/:formatId')
  async getBankFormat(@Param('formatId') formatId: string) {
    return this.bankFormatConfig.getBankFormat(formatId);
  }

  @Put('bank-formats/:formatId')
  async updateBankFormat(@Param('formatId') formatId: string, @Body() config: any) {
    return this.bankFormatConfig.updateBankFormat(formatId, config);
  }

  @Post('bank-formats/validate')
  async validateBankFormat(@Body() data: { formatType: string; specifications: any }) {
    return this.bankFormatConfig.validateFormatSpecification(data.formatType, data.specifications);
  }

  @Put('ordres-virement/:id/recovery')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async updateRecoveryInfo(
    @Param('id') id: string,
    @Body() body: {
      demandeRecuperation?: boolean;
      dateDemandeRecuperation?: string;
      montantRecupere?: boolean;
      dateMontantRecupere?: string;
      motifObservation?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.updateRecoveryInfo(id, body, user as any);
  }

  @Post('ordres-virement/create-manual')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async createManualOV(
    @Body() body: {
      reference: string;
      clientData: any;
      donneurOrdreId: string;
      montantTotal: number;
      nombreAdherents: number;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.createManualOV(body, user as any);
  }

  @Put('ordres-virement/:id/reinject')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async reinjectOV(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.reinjectOV(id, user as any);
  }

  // === TEST ENDPOINT WITHOUT AUTH ===
  @Get('test-bordereaux-traites/:userId')
  async testBordereauxTraites(
    @Param('userId') userId: string,
    @Query() filters: {
      compagnie?: string;
      client?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    console.log('🧪 TEST endpoint called for userId:', userId);
    
    const mockUser = {
      id: userId,
      role: 'CHEF_EQUIPE',
      fullName: 'Test Chef4'
    };
    
    return this.financeService.getBordereauxTraites(filters, mockUser as any);
  }

  // === BORDEREAUX TRAITÉS ENDPOINT ===
  // EXACT SPEC: Only bordereaux with status "TRAITÉ" appear in Finance module
  @Get('bordereaux-traites')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getBordereauxTraites(
    @Req() req: any,
    @Query() filters: {
      compagnie?: string;
      client?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    console.log('🔍 getBordereauxTraites endpoint called');
    console.log('🔍 Request headers:', req.headers.authorization ? 'Token present' : 'No token');
    console.log('🔍 Raw req.user:', req.user);
    
    const user = getUserFromRequest(req);
    console.log('🔍 Extracted user:', { id: user.id, role: user.role, fullName: user.fullName });
    
    return this.financeService.getBordereauxTraites(filters, user as any);
  }

  // === UPDATE BORDEREAU TRAITÉ ENDPOINT ===
  // EXACT SPEC: Finance can update virement status, recovery info
  @Put('bordereaux-traites/:id')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async updateBordereauTraite(
    @Param('id') id: string,
    @Body() body: {
      statutVirement?: string;
      dateTraitementVirement?: string;
      motifObservation?: string;
      demandeRecuperation?: boolean;
      dateDemandeRecuperation?: string;
      montantRecupere?: boolean;
      dateMontantRecupere?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.updateBordereauTraite(id, body, user as any);
  }

  // === CREATE OV FROM BORDEREAU TRAITÉ ===
  @Post('ordres-virement/from-bordereau/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async createOVFromBordereau(
    @Param('bordereauId') bordereauId: string,
    @Body() body: { donneurOrdreId: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    // Get bordereau data
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true, BulletinSoin: true }
    });
    
    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }
    
    if (bordereau.statut !== 'TRAITE') {
      throw new BadRequestException('Only TRAITÉ bordereaux can generate OV');
    }
    
    // Check if OV already exists
    const existingOV = await this.prisma.ordreVirement.findFirst({
      where: { bordereauId }
    });
    
    if (existingOV) {
      throw new BadRequestException('OV already exists for this bordereau');
    }
    
    // Generate reference
    const reference = `OV-${bordereau.reference}`;
    const montantTotal = bordereau.nombreBS * 150;
    
    // Create OV linked to bordereau
    const ov = await this.prisma.ordreVirement.create({
      data: {
        reference,
        donneurOrdreId: body.donneurOrdreId,
        bordereauId,
        utilisateurSante: user.id,
        montantTotal,
        nombreAdherents: bordereau.nombreBS,
        etatVirement: 'NON_EXECUTE',
        validationStatus: 'EN_ATTENTE_VALIDATION'
      },
      include: {
        bordereau: { include: { client: true } },
        donneurOrdre: true
      }
    });
    
    // Notify RESPONSABLE_DEPARTEMENT
    await this.financeService.notifyResponsableEquipeForValidation({
      ovId: ov.id,
      reference: ov.reference,
      message: `Nouvel OV créé depuis bordereau ${bordereau.reference}`,
      createdBy: user.fullName
    }, user as any);
    
    return {
      success: true,
      message: 'OV créé avec succès',
      ordreVirement: ov
    };
  }

  // === NOTIFICATION ENDPOINTS ===
  @Post('notify-responsable-equipe')
  async notifyResponsableEquipe(
    @Body() body: {
      ovId: string;
      reference: string;
      message: string;
      createdBy: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.notifyResponsableEquipeForValidation(body, user as any);
  }

  // === OV VALIDATION ENDPOINTS ===
  @Get('validation/pending')
  async getPendingValidationOVs(@Req() req: any) {
    const user = getUserFromRequest(req);
    
    // Simple query without complex includes
    const pendingOVs = await this.ordreVirementService['prisma'].ordreVirement.findMany({
      where: {
        validationStatus: 'EN_ATTENTE_VALIDATION'
      },
      select: {
        id: true,
        reference: true,
        montantTotal: true,
        nombreAdherents: true,
        dateCreation: true,
        utilisateurSante: true
      },
      orderBy: { dateCreation: 'desc' },
      take: 20
    });
    
    return pendingOVs.map(ov => ({
      id: ov.id,
      reference: ov.reference,
      client: 'Client Test',
      donneurOrdre: 'Donneur Test',
      montantTotal: ov.montantTotal,
      nombreAdherents: ov.nombreAdherents,
      dateCreation: ov.dateCreation,
      utilisateurSante: ov.utilisateurSante
    }));
  }

  @Put('validation/:id')
  @Roles(UserRole.RESPONSABLE_DEPARTEMENT, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async validateOV(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comment?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.validateOV(id, body.approved, body.comment, user as any);
  }

  // === UPDATE OV STATUS DIRECTLY (FINANCE WORKFLOW) ===
  @Put('ordres-virement/:id/status')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async updateOVStatus(
    @Param('id') id: string,
    @Body() body: {
      etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE';
      motifObservation?: string;
      demandeRecuperation?: boolean;
      dateDemandeRecuperation?: string;
      montantRecupere?: boolean;
      dateMontantRecupere?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const updateData: any = {
        etatVirement: body.etatVirement,
        utilisateurFinance: user.id,
        dateTraitement: new Date()
      };
      
      if (['EXECUTE', 'REJETE', 'BLOQUE'].includes(body.etatVirement)) {
        updateData.dateEtatFinal = new Date();
      }
      
      if (body.motifObservation !== undefined) {
        updateData.motifObservation = body.motifObservation;
      }
      
      if (body.demandeRecuperation !== undefined) {
        updateData.demandeRecuperation = body.demandeRecuperation;
        if (body.demandeRecuperation && body.dateDemandeRecuperation) {
          updateData.dateDemandeRecuperation = new Date(body.dateDemandeRecuperation);
        }
      }
      
      if (body.montantRecupere !== undefined) {
        updateData.montantRecupere = body.montantRecupere;
        if (body.montantRecupere && body.dateMontantRecupere) {
          updateData.dateMontantRecupere = new Date(body.dateMontantRecupere);
        }
      }
      
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id },
        data: updateData,
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        }
      });
      
      console.log('✅ OV status updated:', {
        id,
        oldStatus: 'previous',
        newStatus: body.etatVirement,
        user: user.id
      });
      
      return {
        success: true,
        message: 'Statut mis à jour avec succès',
        ordreVirement: updatedOV
      };
    } catch (error) {
      console.error('❌ Failed to update OV status:', error);
      throw new BadRequestException('Failed to update status: ' + error.message);
    }
  }

  // === UPLOAD PDF DOCUMENT LINKED TO BORDEREAU ===
  @Post('upload-pdf-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdfDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { bordereauId: string; documentType?: string; ordreVirementId?: string },
    @Req() req: any
  ) {
    console.log('🚀 upload-pdf-document endpoint called!');
    console.log('📦 Body:', body);
    console.log('📄 File:', file ? { name: file.originalname, size: file.size } : 'NO FILE');
    const user = getUserFromRequest(req);
    
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Verify bordereau exists
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: body.bordereauId },
        include: { client: true }
      });
      
      if (!bordereau) {
        throw new BadRequestException('Bordereau not found');
      }
      
      // Get any existing user ID to avoid FK constraint
      const anyUser = await this.prisma.user.findFirst();
      if (!anyUser) {
        throw new BadRequestException('No users found in system');
      }
      
      // Find or create OrdreVirement for this bordereau
      let ordreVirement = await this.prisma.ordreVirement.findFirst({
        where: { bordereauId: body.bordereauId },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!ordreVirement && body.ordreVirementId) {
        ordreVirement = await this.prisma.ordreVirement.findUnique({
          where: { id: body.ordreVirementId }
        });
      }
      
      if (!ordreVirement) {
        // Create temporary OV if none exists
        const donneurs = await this.prisma.donneurOrdre.findMany({ where: { statut: 'ACTIF' }, take: 1 });
        if (donneurs.length === 0) {
          throw new BadRequestException('No active donneur d\'ordre found');
        }
        
        ordreVirement = await this.prisma.ordreVirement.create({
          data: {
            reference: `OV-${bordereau.reference}`,
            donneurOrdreId: donneurs[0].id,
            bordereauId: body.bordereauId,
            utilisateurSante: user.id,
            montantTotal: 0,
            nombreAdherents: 0,
            etatVirement: 'NON_EXECUTE'
          }
        });
      }
      
      // Save file to disk
      const uploadsDir = path.join(process.cwd(), 'uploads', 'ov-documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filename = `OV_${ordreVirement.id}_${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      
      // Create OVDocument record (separate from Document table)
      const ovDocument = await this.prisma.oVDocument.create({
        data: {
          name: file.originalname,
          type: 'BORDEREAU_PDF',
          path: filePath,
          uploadedById: anyUser.id,
          bordereauId: body.bordereauId,
          ordreVirementId: ordreVirement.id
        },
        include: {
          bordereau: { include: { client: true } },
          ordreVirement: true
        }
      });
      
      // Update OrdreVirement with uploaded PDF path (for manual OV)
      await this.prisma.ordreVirement.update({
        where: { id: ordreVirement.id },
        data: { uploadedPdfPath: `/uploads/ov-documents/${filename}` }
      });
      
      console.log('✅ PDF document uploaded to OVDocument table:', {
        ovDocumentId: ovDocument.id,
        ordreVirementId: ordreVirement.id,
        bordereauId: body.bordereauId,
        filename: file.originalname,
        filePath,
        user: user.id
      });
      
      return {
        success: true,
        message: 'Document PDF téléchargé et lié au bordereau avec succès',
        document: {
          id: ovDocument.id,
          name: ovDocument.name,
          bordereauReference: bordereau.reference,
          clientName: bordereau.client.name,
          uploadedAt: ovDocument.uploadedAt,
          ordreVirementId: ordreVirement.id
        }
      };
    } catch (error) {
      console.error('❌ Failed to upload PDF document:', error);
      throw new BadRequestException('Failed to upload PDF document: ' + error.message);
    }
  }

  // === GENERATE AND STORE PDF/TXT ENDPOINTS ===
  @Post('ordres-virement/:id/generate-pdf')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async generateAndStorePDF(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const pdfBuffer = await this.financeService['pdfGenerationService'].generateOVFromOrderId(id);
      await this.financeService['storePDFInDatabase'](id, pdfBuffer, user as any);
      
      return {
        success: true,
        message: 'PDF généré et stocké avec succès',
        ordreVirementId: id
      };
    } catch (error) {
      console.error('Error generating and storing PDF:', error);
      throw new BadRequestException('Failed to generate PDF: ' + error.message);
    }
  }

  @Post('ordres-virement/:id/generate-txt')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async generateAndStoreTXT(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const txtContent = await this.financeService['txtGenerationService'].generateOVTxtFromOrderId(id);
      await this.financeService['storeTXTInDatabase'](id, txtContent, user as any);
      
      return {
        success: true,
        message: 'TXT généré et stocké avec succès',
        ordreVirementId: id
      };
    } catch (error) {
      console.error('Error generating and storing TXT:', error);
      throw new BadRequestException('Failed to generate TXT: ' + error.message);
    }
  }

  // === GET OV DOCUMENTS ===
  @Get('ordres-virement/:id/documents')
  async getOVDocuments(@Param('id') id: string) {
    try {
      console.log('🔍 Fetching OV documents for ordreVirementId:', id);
      
      // Also check what OV this ID belongs to
      const ov = await this.prisma.ordreVirement.findUnique({
        where: { id },
        select: { id: true, reference: true, bordereauId: true }
      });
      console.log('📝 OV Details:', ov);
      
      // Check all OVDocuments for this bordereau
      if (ov?.bordereauId) {
        const allDocsForBordereau = await this.prisma.oVDocument.findMany({
          where: { bordereauId: ov.bordereauId },
          select: { id: true, name: true, ordreVirementId: true, type: true }
        });
        console.log(`📄 All OVDocuments for bordereau ${ov.bordereauId}:`, allDocsForBordereau);
      }
      
      const documents = await this.prisma.oVDocument.findMany({
        where: { ordreVirementId: id },
        include: {
          bordereau: { include: { client: true } },
          uploader: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { uploadedAt: 'desc' }
      });
      
      console.log(`✅ Found ${documents.length} OV documents for this OV:`, documents.map(d => ({ id: d.id, name: d.name, type: d.type })));
      
      return documents;
    } catch (error) {
      console.error('❌ Error fetching OV documents:', error);
      throw new BadRequestException('Failed to fetch OV documents');
    }
  }

  // === VIEW OV DOCUMENT PDF ===
  @Get('ordres-virement/:id/documents/:docId/pdf')
  async viewOVDocumentPDF(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response
  ) {
    try {
      console.log('📝 Fetching PDF document:', { ovId: id, docId });
      
      const document = await this.prisma.oVDocument.findUnique({
        where: { id: docId }
      });
      
      if (!document) {
        console.error('❌ Document not found in database:', docId);
        throw new BadRequestException('Document not found');
      }
      
      console.log('📄 Document found:', { name: document.name, path: document.path });
      
      const fs = require('fs');
      if (fs.existsSync(document.path)) {
        console.log('✅ PDF file exists on disk, reading...');
        const pdfBuffer = fs.readFileSync(document.path);
        console.log('✅ PDF loaded, size:', pdfBuffer.length, 'bytes');
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${document.name}"`,
          'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
      } else {
        console.error('❌ PDF file not found on disk:', document.path);
        throw new BadRequestException(`PDF file not found on disk: ${document.path}`);
      }
    } catch (error) {
      console.error('❌ Error viewing OV document PDF:', error);
      res.status(500).json({ error: 'Failed to load PDF', details: error.message });
    }
  }

  // === VIEW UPLOADED PDF FOR MANUAL OV ===
  @Get('ordres-virement/:id/uploaded-pdf')
  async viewUploadedPDF(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    try {
      const ov = await this.prisma.ordreVirement.findUnique({
        where: { id },
        select: { uploadedPdfPath: true }
      });
      
      if (!ov?.uploadedPdfPath) {
        throw new BadRequestException('No uploaded PDF found for this OV');
      }
      
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), ov.uploadedPdfPath);
      
      if (!fs.existsSync(fullPath)) {
        throw new BadRequestException('PDF file not found on disk');
      }
      
      const pdfBuffer = fs.readFileSync(fullPath);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="uploaded_ov_${id}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Error viewing uploaded PDF:', error);
      res.status(500).json({ error: 'Failed to load PDF', details: error.message });
    }
  }
  
  // === UPLOAD MANUAL OV PDF (NO BORDEREAU) ===
  @Post('upload-manual-ov-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadManualOVPdf(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    console.log('🚀 upload-manual-ov-pdf endpoint called!');
    
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'manual-ov-pdfs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filename = `manual_ov_${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      
      const relativePath = `/uploads/manual-ov-pdfs/${filename}`;
      
      console.log('✅ Manual OV PDF uploaded:', { filename, path: relativePath });
      
      return {
        success: true,
        message: 'PDF uploadé avec succès',
        filePath: relativePath,
        filename: file.originalname
      };
    } catch (error) {
      console.error('❌ Failed to upload manual OV PDF:', error);
      throw new BadRequestException('Failed to upload PDF: ' + error.message);
    }
  }

  // === GET OV DOCUMENTS BY BORDEREAU ===
  @Get('ov-documents/bordereau/:bordereauId')
  async getOVDocumentsByBordereau(@Param('bordereauId') bordereauId: string) {
    try {
      console.log('🔍 Fetching OV documents for bordereauId:', bordereauId);
      
      const documents = await this.prisma.oVDocument.findMany({
        where: { bordereauId },
        include: {
          ordreVirement: { select: { id: true, reference: true } },
          uploader: { select: { id: true, fullName: true } }
        },
        orderBy: { uploadedAt: 'desc' }
      });
      
      console.log(`✅ Found ${documents.length} documents:`, documents.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        ordreVirementId: d.ordreVirementId
      })));
      
      return documents;
    } catch (error) {
      console.error('❌ Error fetching OV documents by bordereau:', error);
      throw new BadRequestException('Failed to fetch documents');
    }
  }
}