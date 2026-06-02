import {
  Controller,
  Get,
  Post,
  Put,
  Delete, 
  Body,
  Param,
  Query,
  Patch,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  Res,
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { RecouvrementService, BulkRecouvrementDto } from './recouvrement.service';
import { SlaConfigurationService } from './sla-configuration.service';
import { buildExportWorkbook } from './exportDashboard_exceljs';
import { SageTxtGenerationService } from './sage-txt-generation.service';
import { SageApiIntegrationService } from './sage-api-integration.service';

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
    private readonly sageTxtGenerationService: SageTxtGenerationService,
    private readonly sageApiIntegrationService: SageApiIntegrationService,
    private readonly recouvrementService: RecouvrementService,
    private prisma: PrismaService
    
  ) {}

  // === GET CLIENT AUTO-FILL DATA FOR ADHERENT FORM ===
  @Get('clients/:clientId/autofill-data')
  async getClientAutofillData(@Param('clientId') clientId: string) {
    try {
      console.log('🔍 Fetching autofill data for client:', clientId);
      
      // Find client by ID or name
      const client = await this.prisma.client.findFirst({
        where: {
          OR: [
            { id: clientId },
            { name: clientId }
          ]
        },
        include: {
          compagnieAssurance: true,
          contracts: {
            // Get ALL contracts, not just active ones (to ensure we get data)
            orderBy: { createdAt: 'desc' },
            take: 5  // Get last 5 contracts to check
          }
        }
      });
      
      if (!client) {
        throw new BadRequestException('Client not found');
      }
      
      console.log('✅ Client found:', {
        id: client.id,
        name: client.name,
        hasInsurance: !!client.compagnieAssurance,
        insuranceName: client.compagnieAssurance?.nom,
        contractsCount: client.contracts.length,
        contracts: client.contracts.map(c => ({
          id: c.id,
          codeAssure: c.codeAssure,
          startDate: c.startDate,
          endDate: c.endDate,
          isActive: c.startDate <= new Date() && c.endDate >= new Date()
        }))
      });
      
      // Try to find active contract first, then fall back to most recent
      const now = new Date();
      let selectedContract = client.contracts.find(c => 
        c.startDate <= now && c.endDate >= now
      );
      
      // If no active contract, use most recent one
      if (!selectedContract && client.contracts.length > 0) {
        selectedContract = client.contracts[0];
        console.log('⚠️ No active contract found, using most recent:', {
          id: selectedContract.id,
          codeAssure: selectedContract.codeAssure
        });
      }
      
      // Extract auto-fill data
      const autofillData = {
        assurance: client.compagnieAssurance?.nom || '',
        codeAssure: selectedContract?.codeAssure || '',
        numeroContrat: ''  // Leave empty - user must enter manually (per-adherent field)
      };
      
      console.log('📋 Autofill data to return:', autofillData);
      
      return {
        success: true,
        data: autofillData,
        clientInfo: {
          id: client.id,
          name: client.name,
          hasActiveContract: !!selectedContract,
          contractUsed: selectedContract ? {
            id: selectedContract.id,
            codeAssure: selectedContract.codeAssure,
            isActive: selectedContract.startDate <= now && selectedContract.endDate >= now
          } : null
        }
      };
    } catch (error : any) {
      console.error('❌ Error fetching client autofill data:', error);
      throw new BadRequestException('Failed to fetch client data: ' + error.message);
    }
  }

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
  async getAdherents(@Query('clientId') clientId?: string, @Query('search') search?: string, @Req() req?: any) {
    const user = req ? getUserFromRequest(req) : undefined;
    if (search !== undefined) {
      return this.adherentService.searchAdherents(search, clientId, user);
    }
    if (clientId !== undefined) {
      return this.adherentService.findAdherentsByClient(clientId);
    }
    // Return all adherents if no parameters
    return this.adherentService.searchAdherents('', '', user);
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
      
      // EXACT STRUCTURE VALIDATION - Reject if structure doesn't match
      const REQUIRED_COLUMNS = [
        'Matricule',
        'Société',
        'Nom',
        'Prénom',
        'RIB',
        'Code Assuré',
        'Numéro Contrat',
        'Assurance',
        'Statut'
      ];
      
      // Check if file has data
      if (!data || data.length === 0) {
        throw new BadRequestException(
          '❌ STRUCTURE INVALIDE: Le fichier Excel est vide. Veuillez utiliser le modèle exact fourni par le système.'
        );
      }
      
      // Get actual columns from first row
      const firstRow = data[0] as any;
      const actualColumns = Object.keys(firstRow);
      
      console.log('📊 VALIDATION - Colonnes attendues:', REQUIRED_COLUMNS);
      console.log('📊 VALIDATION - Colonnes reçues:', actualColumns);
      
      // Check for missing required columns
      const missingColumns = REQUIRED_COLUMNS.filter(col => !actualColumns.includes(col));
      
      // Check for extra/unexpected columns
      const extraColumns = actualColumns.filter(col => !REQUIRED_COLUMNS.includes(col));
      
      if (missingColumns.length > 0 || extraColumns.length > 0) {
        let errorMessage = '❌ STRUCTURE INVALIDE: Le fichier Excel ne correspond pas au format requis.\n\n';
        
        if (missingColumns.length > 0) {
          errorMessage += `❌ Colonnes manquantes: ${missingColumns.join(', ')}\n`;
        }
        
        if (extraColumns.length > 0) {
          errorMessage += `⚠️ Colonnes non reconnues: ${extraColumns.join(', ')}\n`;
        }
        
        errorMessage += '\n✅ Structure attendue (ordre exact):\n';
        errorMessage += REQUIRED_COLUMNS.map((col, idx) => `${idx + 1}. ${col}`).join('\n');
        errorMessage += '\n\n📌 Veuillez télécharger le modèle Excel depuis le système et ne pas modifier les noms de colonnes.';
        
        console.log('❌ VALIDATION FAILED:', errorMessage);
        throw new BadRequestException(errorMessage);
      }
      
      console.log('✅ VALIDATION PASSED: Structure Excel correcte');
      
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      const blockedDuplicates: any[] = [];
      
      console.log(`📊 Total rows in Excel: ${data.length}`);
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        try {
          const matricule = row['Matricule'];
          const societe = row['Société'];
          const nom = row['Nom'];
          const prenom = row['Prénom'];
          const rib = String(row['RIB'] || '').replace(/\D/g, '');
          const codeAssure = String(row['Code Assuré'] || '');
          const numeroContrat = String(row['Numéro Contrat'] || '');
          const assuranceCompany = row['Assurance'] || '';
          const statut = row['Statut'] || 'ACTIF';
          
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
          
          let targetClient = await this.prisma.client.findFirst({
            where: {
              OR: [
                { name: { contains: societe, mode: 'insensitive' } },
                { name: { equals: societe, mode: 'insensitive' } }
              ]
            },
            include: { compagnieAssurance: true }
          });
          
          if (!targetClient) {
            skipped++;
            const errorMsg = `Ligne ${i + 1}: Client "${societe}" n'existe pas dans le système. Veuillez créer le client d'abord.`;
            errors.push(errorMsg);
            console.log(`❌ Row ${i + 1}: Client "${societe}" not found - REJECTED`);
            continue;
          }
          
          console.log(`✅ Row ${i + 1}: Matched client "${targetClient.name}" for société "${societe}"`);
          
          // Check matricule duplicate
          const existingAdherent = await this.prisma.adherent.findFirst({
            where: { matricule: String(matricule), clientId: targetClient.id }
          });
          
          if (existingAdherent) {
            console.log(`❌ Row ${i + 1} failed: Matricule ${matricule} already exists for this client`);
            skipped++;
            continue;
          }
          
          // Check duplicate RIB
          const duplicateRib = await this.prisma.adherent.findFirst({
            where: { rib },
            include: { client: true }
          });
          
          if (duplicateRib) {
            console.log(`❌ Row ${i + 1} failed: RIB ${rib} already exists`);
            blockedDuplicates.push({
              newAdherent: {
                matricule: String(matricule),
                nom,
                prenom,
                rib,
                clientId: targetClient.id,
                clientName: targetClient.name,
                codeAssure: codeAssure || undefined,
                numeroContrat: numeroContrat || undefined
              },
              existingAdherent: {
                id: duplicateRib.id,
                matricule: duplicateRib.matricule,
                nom: duplicateRib.nom,
                prenom: duplicateRib.prenom,
                rib: duplicateRib.rib,
                clientName: duplicateRib.client.name
              },
              pendingData: {
                matricule: String(matricule),
                nom,
                prenom,
                rib,
                clientId: targetClient.id,
                codeAssure: codeAssure || undefined,
                numeroContrat: numeroContrat || undefined,
                assurance: assuranceCompany || undefined,
                statut
              }
            });
            skipped++;
            continue;
          }
          
          const adherentData = {
            matricule: String(matricule),
            nom,
            prenom,
            clientId: targetClient.id,
            rib,
            codeAssure,
            numeroContrat,
            assurance: assuranceCompany,
            statut
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
      
      // Send ONE notification with ALL duplicates
      if (blockedDuplicates.length > 0) {
        await this.adherentService['notifyDuplicateRibBlocked'](
          user.id,
          blockedDuplicates,
          imported,
          skipped - blockedDuplicates.length
        );
      }
      
      const blockedCount = blockedDuplicates.length;
      console.log(`📊 Import summary: ${imported} imported, ${skipped} skipped (${blockedCount} duplicate RIBs), ${data.length} total`);
      
      return {
        success: true,
        imported,
        skipped,
        blocked: blockedCount,
        total: data.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: `${imported} adhérent(s) importé(s) sur ${data.length}. ${skipped} ignoré(s) (dont ${blockedCount} RIB dupliqués).`
      };
    } catch (error : any) {
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
  async getOrdresVirement(@Query() filters: any, @Req() req?: any) {
    const user = req ? getUserFromRequest(req) : undefined;
    
    // GESTIONNAIRE_SENIOR & CHEF_EQUIPE: Filter by assigned contracts
    if (user?.role === 'GESTIONNAIRE_SENIOR' || user?.role === 'CHEF_EQUIPE') {
      const assignedContracts = await this.prisma.contract.findMany({
        where: { teamLeaderId: user.id },
        select: { clientId: true }
      });
      const clientIds = assignedContracts.map(c => c.clientId);
      
      // Add client filter to existing filters
      if (!filters.clientId) {
        filters.clientIds = clientIds;
      }
    }
    
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
    let txtContent = await this.financeService.getOVTXTContent(id, user as any);
    
    // Decode HTML entities to ensure plain text output
    txtContent = txtContent
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
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
    
    // Use the styled Excel export function
    const buffer = await buildExportWorkbook(dashboardData.ordresVirement);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tableau_bord_finance_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(Buffer.from(buffer as ArrayBuffer));
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
      
    } catch (error : any) {
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
      
    } catch (error : any) {
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
  @UseInterceptors(FilesInterceptor('files', 2))
  async reinjectOV(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    if (!files || files.length < 2) {
      throw new BadRequestException('Both Excel and PDF files are required for reinject');
    }
    
    // Identify which file is Excel and which is PDF
    const excelFile = files.find(f => f.mimetype.includes('spreadsheet') || f.originalname.endsWith('.xlsx') || f.originalname.endsWith('.xls'));
    const pdfFile = files.find(f => f.mimetype === 'application/pdf' || f.originalname.endsWith('.pdf'));
    
    if (!excelFile || !pdfFile) {
      throw new BadRequestException('Could not identify Excel and PDF files. Please ensure you upload one Excel file and one PDF file.');
    }
    
    return this.financeService.reinjectOV(id, excelFile, pdfFile, user as any);
  }
  
  @Get('ordres-virement/:id/details')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getOVDetails(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const ov = await this.prisma.ordreVirement.findUnique({
        where: { id },
        include: {
          donneurOrdre: true,
          bordereau: { include: { client: true } }
        }
      });
      
      if (!ov) {
        throw new BadRequestException('Ordre de virement not found');
      }
      
      return {
        success: true,
        montantTotal: ov.montantTotal || 0,
        nombreAdherents: ov.nombreAdherents || 0,
        donneurOrdreId: ov.donneurOrdreId,
        observations: ov.motifObservation || '',
        reference: ov.reference,
        clientName: ov.bordereau?.client?.name || ov.clientName || ''
      };
    } catch (error: any) {
      console.error('Error fetching OV details:', error);
      throw new BadRequestException('Failed to fetch OV details: ' + error.message);
    }
  }
  
  @Put('ordres-virement/:id/details')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async updateOVDetails(
    @Param('id') id: string,
    @Body() body: {
      montantTotal?: number;
      nombreAdherents?: number;
      donneurOrdreId?: string;
      observations?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const updateData: any = {};
      
      if (body.montantTotal !== undefined) updateData.montantTotal = body.montantTotal;
      if (body.nombreAdherents !== undefined) updateData.nombreAdherents = body.nombreAdherents;
      if (body.donneurOrdreId !== undefined) updateData.donneurOrdreId = body.donneurOrdreId;
      if (body.observations !== undefined) updateData.motifObservation = body.observations;
      
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id },
        data: updateData,
        include: {
          donneurOrdre: true,
          bordereau: { include: { client: true } }
        }
      });
      
      console.log('✅ OV details updated:', { id, updates: updateData, user: user.id });
      
      return {
        success: true,
        message: 'Détails de l\'ordre de virement mis à jour avec succès',
        ordreVirement: updatedOV
      };
    } catch (error: any) {
      console.error('Error updating OV details:', error);
      throw new BadRequestException('Failed to update OV details: ' + error.message);
    }
  }
  
  @Put('ordres-virement/:id/restart-processing')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN)
  async restartOVProcessing(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const updatedOV = await this.prisma.ordreVirement.update({
        where: { id },
        data: {
          etatVirement: 'NON_EXECUTE',
          dateTraitement: null,
          dateEtatFinal: null,
          motifObservation: 'Traitement relancé par ' + user.fullName,
          utilisateurFinance: null
        },
        include: {
          bordereau: { include: { client: true } },
          donneurOrdre: true
        }
      });
      
      console.log('✅ OV processing restarted:', { id, user: user.id });
      
      return {
        success: true,
        message: 'Traitement financier relancé avec succès',
        ordreVirement: updatedOV
      };
    } catch (error: any) {
      console.error('Error restarting OV processing:', error);
      throw new BadRequestException('Failed to restart processing: ' + error.message);
    }
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

  // === MANUAL OV ENTRIES (WITHOUT BORDEREAU) ===
  @Get('manual-ov-entries')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getManualOVEntries(
    @Req() req: any,
    @Query() filters: {
      client?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }
  ) {
    const user = getUserFromRequest(req);
    
    const where: any = {
      bordereauId: null  // Only manual entries without bordereau
    };
    
    // EXACT SPEC: GESTIONNAIRE_SENIOR sees only their created manual OVs
    if (user.role === 'GESTIONNAIRE_SENIOR' || user.role === 'CHEF_EQUIPE') {
      where.utilisateurSante = user.id;
    }
    
    if (filters.client) {
      where.clientName = { contains: filters.client, mode: 'insensitive' };
    }
    
    if (filters.dateFrom) {
      where.dateCreation = { ...where.dateCreation, gte: new Date(filters.dateFrom) };
    }
    
    if (filters.dateTo) {
      where.dateCreation = { ...where.dateCreation, lte: new Date(filters.dateTo) };
    }
    
    if (filters.status) {
      where.etatVirement = filters.status;
    }
    
    const manualOVs = await this.prisma.ordreVirement.findMany({
      where,
      include: {
        client: true, // NEW: Include direct client for manual entries
        contract: true, // NEW: Include direct contract for manual entries
        donneurOrdre: true
      },
      orderBy: { dateCreation: 'desc' }
    });
    
    return manualOVs.map(ov => ({
      id: ov.id,
      clientSociete: ov.client?.name || ov.clientName || 'Entrée manuelle',
      referenceOV: ov.reference,
      referenceBordereau: '-',
      montantBordereau: ov.montantTotal || 0,
      dateInjection: ov.dateCreation,
      statutVirement: ov.etatVirement,
      dateTraitementVirement: ov.dateTraitement,
      motifObservation: ov.motifObservation,
      demandeRecuperation: ov.demandeRecuperation || false,
      dateDemandeRecuperation: ov.dateDemandeRecuperation,
      montantRecupere: ov.montantRecupere || false,
      dateMontantRecupere: ov.dateMontantRecupere,
      modeRecuperation: ov.client?.modeRecuperation || null, // NEW: Get from direct client
      nomDonneur: ov.donneurOrdre?.nom || null, // NEW: Nom du donneur
      numeroContrat: ov.contract?.codeAssure || null // NEW: Get from direct contract (optional)
    }));
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
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async updateOVStatus(
    @Param('id') id: string,
    @Body() body: {
      etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'BLOQUE' | 'EXECUTE' | 'VIREMENT_NON_VALIDE' | 'VIREMENT_DEPOSE';
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
      // EXACT SPEC: Responsable Département can ONLY set these statuses
      if (user.role === 'RESPONSABLE_DEPARTEMENT') {
        const allowedStatuses = ['VIREMENT_NON_VALIDE', 'VIREMENT_DEPOSE'];
        
        if (!allowedStatuses.includes(body.etatVirement)) {
          throw new BadRequestException(
            `Responsable Département peut uniquement définir les statuts: Virement non validé (VIREMENT_NON_VALIDE) ou Virement déposé (VIREMENT_DEPOSE). Statut demandé: ${body.etatVirement}`
          );
        }
      }
      
      // Get current OV state before update
      const currentOV = await this.prisma.ordreVirement.findUnique({
        where: { id },
        select: { etatVirement: true }
      });

      if (!currentOV) {
        throw new BadRequestException('Ordre de virement not found');
      }

      const previousState = currentOV.etatVirement;
      
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

      // LOG HISTORY - Determine action type
      const { logVirementHistory, VIREMENT_ACTIONS } = await import('./virement-history.helper');
      
      let action: string;
      if (body.etatVirement === 'EXECUTE') {
        action = VIREMENT_ACTIONS.EXECUTION;
      } else if (body.etatVirement === 'REJETE') {
        action = VIREMENT_ACTIONS.REJET;
      } else {
        action = VIREMENT_ACTIONS.CHANGEMENT_STATUT;
      }

      await logVirementHistory(
        id,
        action,
        user.id,
        {
          previousState,
          newState: body.etatVirement,
          comment: body.motifObservation || `Statut changé par ${user.fullName || user.email}`
        }
      );
      
      // EXACT SPEC: Auto-update bordereau status when virement is EXECUTE
      if (body.etatVirement === 'EXECUTE' && updatedOV.bordereauId) {
        await this.prisma.bordereau.update({
          where: { id: updatedOV.bordereauId },
          data: {
            statut: 'VIREMENT_EXECUTE',
            dateCloture: new Date()
          }
        });
        console.log('✅ AUTO-STATUS: Bordereau status updated to VIREMENT_EXECUTE');
      }
      
      console.log('✅ OV status updated:', {
        id,
        oldStatus: previousState,
        newStatus: body.etatVirement,
        user: user.id,
        role: user.role
      });
      
      return {
        success: true,
        message: 'Statut mis à jour avec succès',
        ordreVirement: updatedOV
      };
    } catch (error : any) {
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
      
      // Find existing OrdreVirement for this bordereau
      let ordreVirement = await this.prisma.ordreVirement.findFirst({
        where: { bordereauId: body.bordereauId },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!ordreVirement && body.ordreVirementId) {
        ordreVirement = await this.prisma.ordreVirement.findUnique({
          where: { id: body.ordreVirementId }
        });
      }
      
      // EXACT FIX: Store PDF to disk, return path for later OV creation
      // NO OVDocument record created (avoids premature OV creation)
      if (!ordreVirement) {
        console.log('⚠️ No OV exists yet - storing PDF temporarily');
        
        // Save file to disk
        const uploadsDir = path.join(process.cwd(), 'uploads', 'ov-documents');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filename = `TEMP_${body.bordereauId}_${Date.now()}_${file.originalname}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        
        console.log('✅ PDF stored temporarily at:', filePath);
        
        return {
          success: true,
          message: 'Document PDF téléchargé avec succès. L\'OV sera créé lors de la validation.',
          document: {
            name: file.originalname,
            bordereauReference: bordereau.reference,
            clientName: bordereau.client.name,
            uploadedAt: new Date(),
            ordreVirementId: null,
            tempFilePath: filePath  // Return path for later use
          }
        };
      }
      
      // Save file to disk
      const uploadsDir = path.join(process.cwd(), 'uploads', 'ov-documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filename = `OV_${ordreVirement.id}_${Date.now()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      
      // Create OVDocument record
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
      
      // Update OrdreVirement with uploaded PDF path
      await this.prisma.ordreVirement.update({
        where: { id: ordreVirement.id },
        data: { uploadedPdfPath: `/uploads/ov-documents/${filename}` }
      });
      
      console.log('✅ PDF document uploaded to OVDocument table:', {
        ovDocumentId: ovDocument.id,
        ordreVirementId: ordreVirement?.id || 'null (will be linked later)',
        bordereauId: body.bordereauId,
        filename: file.originalname,
        filePath,
        user: user.id
      });
      
      return {
        success: true,
        message: ordreVirement 
          ? 'Document PDF téléchargé et lié au bordereau avec succès'
          : 'Document PDF téléchargé (sera lié à l\'OV lors de sa création)',
        document: {
          id: ovDocument.id,
          name: ovDocument.name,
          bordereauReference: bordereau.reference,
          clientName: bordereau.client.name,
          uploadedAt: ovDocument.uploadedAt,
          ordreVirementId: ordreVirement?.id || null
        }
      };
    } catch (error : any) {
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
    } catch (error : any) {
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
    } catch (error : any) {
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
      const document = await this.prisma.oVDocument.findUnique({
        where: { id: docId }
      });
      
      if (!document) {
        throw new BadRequestException('Document not found');
      }
      
      const fs = require('fs');
      const path = require('path');
      
      let filePath = document.path;
      console.log('🔍 DB path:', filePath);
      
      const pathsToTry: string[] = [];
      
      if (path.isAbsolute(filePath)) {
        pathsToTry.push(filePath);
        if (filePath.startsWith('/')) {
          const rel = filePath.replace(/^\/home\/[^\/]+\//, '');
          pathsToTry.push(path.join(process.cwd(), rel));
        }
      } else {
        pathsToTry.push(path.join(process.cwd(), filePath));
      }
      
      pathsToTry.push(path.join(process.cwd(), '..', 'uploads', 'ov-documents', path.basename(filePath)));
      pathsToTry.push(path.join(process.cwd(), 'uploads', 'ov-documents', path.basename(filePath)));
      
      for (const tryPath of pathsToTry) {
        if (fs.existsSync(tryPath)) {
          console.log('✅ Found:', tryPath);
          const pdfBuffer = fs.readFileSync(tryPath);
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${document.name}"`,
            'Content-Length': pdfBuffer.length
          });
          return res.send(pdfBuffer);
        }
      }
      
      console.log('❌ Not found in:', pathsToTry);
      throw new BadRequestException(`PDF file not found: ${document.name}`);
    } catch (error : any) {
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
      console.log('🔍 Fetching uploaded PDF for OV:', id);
      
      // Get OV to find bordereau
      const ov = await this.prisma.ordreVirement.findUnique({
        where: { id },
        select: { uploadedPdfPath: true, bordereauId: true }
      });
      
      if (!ov) {
        throw new BadRequestException('Ordre de virement not found');
      }
      
      console.log('📝 OV found:', { id, bordereauId: ov.bordereauId, uploadedPdfPath: ov.uploadedPdfPath });
      
      // PRIORITY 1: Check for temporary PDF files by bordereauId (uploaded BEFORE OV creation)
      if (ov.bordereauId) {
        console.log('🔍 PRIORITY 1: Checking for temporary PDF files by bordereauId:', ov.bordereauId);
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'ov-documents');
        
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          const tempFile = files.find(f => f.startsWith(`TEMP_${ov.bordereauId}_`));
          
          console.log('📄 PRIORITY 1 Result:', tempFile ? `Found: ${tempFile}` : 'Not found');
          
          if (tempFile) {
            const filePath = path.join(uploadsDir, tempFile);
            const fileExists = fs.existsSync(filePath);
            console.log('💾 File exists on disk:', fileExists);
            
            if (fileExists) {
              console.log('✅ SUCCESS: Returning PDF from PRIORITY 1 (temporary file)');
              const pdfBuffer = fs.readFileSync(filePath);
              res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${tempFile}"`,
                'Content-Length': pdfBuffer.length
              });
              return res.send(pdfBuffer);
            }
          }
        }
      } else {
        console.log('⚠️ PRIORITY 1: Skipped (no bordereauId)');
      }
      
      // PRIORITY 2: Check OVDocument by ordreVirementId (PDF uploaded AFTER OV creation)
      console.log('🔍 PRIORITY 2: Checking OVDocument by ordreVirementId:', id);
      const ovDocument = await this.prisma.oVDocument.findFirst({
        where: { 
          ordreVirementId: id,
          type: 'BORDEREAU_PDF'
        },
        orderBy: { uploadedAt: 'desc' }
      });
      
      console.log('📄 PRIORITY 2 Result:', ovDocument ? `Found: ${ovDocument.name} at ${ovDocument.path}` : 'Not found');
      
      if (ovDocument) {
        const fs = require('fs');
        const fileExists = fs.existsSync(ovDocument.path);
        console.log('💾 File exists on disk:', fileExists);
        
        if (fileExists) {
          console.log('✅ SUCCESS: Returning PDF from PRIORITY 2 (ordreVirementId)');
          const pdfBuffer = fs.readFileSync(ovDocument.path);
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${ovDocument.name}"`,
            'Content-Length': pdfBuffer.length
          });
          return res.send(pdfBuffer);
        } else {
          console.log('⚠️ PRIORITY 2: File found in DB but missing on disk');
        }
      }
      
      // PRIORITY 3: Check uploadedPdfPath field (for manual OV uploads)
      if (ov.uploadedPdfPath) {
        console.log('🔍 PRIORITY 3: Checking uploadedPdfPath:', ov.uploadedPdfPath);
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), ov.uploadedPdfPath);
        const fileExists = fs.existsSync(fullPath);
        console.log('💾 File exists on disk:', fileExists);
        
        if (fileExists) {
          console.log('✅ SUCCESS: Returning PDF from PRIORITY 3 (uploadedPdfPath)');
          const pdfBuffer = fs.readFileSync(fullPath);
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="uploaded_ov_${id}.pdf"`,
            'Content-Length': pdfBuffer.length
          });
          return res.send(pdfBuffer);
        } else {
          console.log('⚠️ PRIORITY 3: Path exists in DB but file missing on disk');
        }
      } else {
        console.log('⚠️ PRIORITY 3: Skipped (no uploadedPdfPath)');
      }
      
      console.error('❌ ALL PRIORITIES FAILED - No uploaded PDF found for OV:', id);
      throw new BadRequestException('No uploaded PDF found for this OV');
    } catch (error : any) {
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
    } catch (error : any) {
      console.error('❌ Failed to upload manual OV PDF:', error);
      throw new BadRequestException('Failed to upload PDF: ' + error.message);
    }
  }

  // === GET OV DOCUMENTS BY BORDEREAU ===
  @Get('ov-documents/bordereau/:bordereauId')
  async getOVDocumentsByBordereau(@Param('bordereauId') bordereauId: string) {
    try {
      console.log('🔍 Fetching OV documents for bordereauId:', bordereauId);
      
      // Check ALL OVDocuments in database
      const allDocs = await this.prisma.oVDocument.findMany({
        select: { id: true, name: true, bordereauId: true, ordreVirementId: true }
      });
      console.log(`📊 Total OVDocuments in database: ${allDocs.length}`);
      if (allDocs.length > 0) {
        console.log('📄 Sample documents:', allDocs.slice(0, 5));
      }
      
      const documents = await this.prisma.oVDocument.findMany({
        where: { bordereauId },
        include: {
          ordreVirement: { select: { id: true, reference: true } },
          uploader: { select: { id: true, fullName: true } }
        },
        orderBy: { uploadedAt: 'desc' }
      });
      
      console.log(`✅ Found ${documents.length} documents for bordereau ${bordereauId}:`, documents.map(d => ({
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

  // === EXPORT OV DETAILS TO EXCEL ===
  @Get('ordres-virement/:id/export-excel')
  async exportOVDetailsExcel(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.exportOVDetailsExcel(id, res, user as any);
  }

  // === GET NEXT OV REFERENCE ===
  @Get('next-ov-reference')
  async getNextOVReference() {
    const currentYear = new Date().getFullYear();
    const prefix = `OV-${currentYear}`;
    
    const existingRefs = await this.prisma.ordreVirement.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
      orderBy: { reference: 'desc' },
      take: 1
    });
    
    let maxSeq = 0;
    if (existingRefs.length > 0) {
      const parts = existingRefs[0].reference.split('-');
      const seqStr = parts[parts.length - 1];
      maxSeq = parseInt(seqStr || '0', 10);
    }
    
    const nextReference = `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
    
    return {
      reference: nextReference,
      year: currentYear,
      sequence: maxSeq + 1
    };
  }

  // === DUPLICATE RIB APPROVAL ENDPOINTS ===
  @Post('adherents/duplicate-rib/approve/:notificationId/:duplicateId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async approveDuplicateRib(
    @Param('notificationId') notificationId: string,
    @Param('duplicateId') duplicateId: string,
    @Body() body: { justification?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.adherentService.approveDuplicateRib(notificationId, duplicateId, user.id, body.justification);
  }

  @Post('adherents/duplicate-rib/reject/:notificationId/:duplicateId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async rejectDuplicateRib(
    @Param('notificationId') notificationId: string,
    @Param('duplicateId') duplicateId: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.adherentService.rejectDuplicateRib(notificationId, duplicateId, user.id, body.reason);
  }

  @Post('adherents/duplicate-rib/approve-all/:notificationId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async approveAllDuplicateRibs(
    @Param('notificationId') notificationId: string,
    @Body() body: { justification?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.adherentService.approveAllDuplicateRibs(notificationId, user.id, body.justification);
  }

  // === VIREMENT HISTORY ENDPOINT ===
  @Get('ordres-virement/:id/history')
  async getVirementHistory(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    try {
      const history = await this.prisma.virementHistory.findMany({
        where: { virementId: id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      return history.map(entry => ({
        id: entry.id,
        action: entry.action,
        previousState: entry.previousState,
        newState: entry.newState,
        comment: entry.comment,
        createdAt: entry.createdAt,
        user: {
          id: entry.user.id,
          name: entry.user.fullName,
          role: entry.user.role
        }
      }));
    } catch (error: any) {
      console.error('Failed to fetch virement history:', error);
      throw new BadRequestException('Failed to fetch history: ' + error.message);
    }
  }

  // === SAGE TXT ENDPOINTS ===
  @Get('ordres-virement/:id/sage-txt')
  async downloadSageTxt(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query('templateId') templateId?: string,
  ) {
    try {
      // Use the service's existing API which generates and persists the file
      const userId: string = req.user?.id ?? 'system';
      const result = await this.sageTxtGenerationService.generateForOrdreVirement(id, userId, templateId);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.content);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('sage-txt-batch')
async downloadSageTxtBatch(
  @Body() body: { ordreVirementIds: string[]; templateId?: string },
  @Req() req: any,
  @Res() res: Response,
) {
  if (!body?.ordreVirementIds?.length) {
    throw new BadRequestException('ordreVirementIds must be a non-empty array');
  }
 
  const userId: string = req.user?.id ?? 'system';
 
  const result = await this.sageTxtGenerationService.generateBatch(
    body.ordreVirementIds,
    userId,
    body.templateId,
  );
 
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${result.fileName}"`,
  );
  return res.send(result.content);
}

// ─── Endpoint 3: OV history ───────────────────────────────────────────────────
/**
 * GET /finance/ordres-virement/:id/sage-txt/history
 * Lists all Sage TXT generations for an OV.
 */
@Get('ordres-virement/:id/sage-txt/history')
async getSageTxtHistory(@Param('id') id: string) {
  return this.sageTxtGenerationService.getHistory(id);
}

// ─── Endpoint 4: Re-download a past generation ───────────────────────────────
/**
 * GET /finance/sage-txt-generations/:generationId/download
 * Re-downloads a previously generated file from history.
 */
@Get('sage-txt-generations/:generationId/download')
async reDownloadSageTxt(
  @Param('generationId') generationId: string,
  @Res() res: Response,
) {
  const content = await this.sageTxtGenerationService.getGeneratedContent(generationId);
 
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="sage_${generationId}.TXT"`,
  );
  return res.send(content);
}

  // ─── Endpoint 5: Get all Sage generations (for History tab) ─────────────────
  /**
   * GET /finance/sage-txt-generations/all
   * Returns all Sage TXT generations with OV details
   */
  @Get('sage-txt-generations/all')
  async getAllSageGenerations() {
    const generations = await this.prisma.sageTxtGeneration.findMany({
      orderBy: { generatedAt: 'desc' },
      include: {
        ordreVirement: {
          select: {
            reference: true,
            montantTotal: true,
            clientName: true,
          },
        },
      },
    });

    // Manually fetch user details for each generation
    const result = await Promise.all(
      generations.map(async (gen) => {
        const user = await this.prisma.user.findUnique({
          where: { id: gen.generatedById },
          select: { fullName: true },
        });
        return {
          ...gen,
          generatedBy: user,
        };
      }),
    );

    return result;
  }

  @Patch('clients/:id/sage-config')
  async updateClientSageConfig(
    @Param('id') id: string,
    @Body() body: { compteAuxiliaireSage: string; codeJournalSage?: string }
  ) {
    return this.prisma.client.update({
      where: { id },
      data: {
        compteAuxiliaireSage: body.compteAuxiliaireSage,
        codeJournalSage: body.codeJournalSage,
      }
    });
  }

  // ─── Endpoint 6: Update DonneurOrdre Sage config ─────────────────────────────
/**
 * PATCH /finance/donneurs-ordre/:id/sage-config
 * Body: { codeJournalSage: string, compteTresoreriesSage: string }
 * Sets the Sage journal code and treasury account on a DonneurOrdre.
 */
@Patch('donneurs-ordre/:id/sage-config')
async updateDonneurOrdreSageConfig(
  @Param('id') id: string,
  @Body() body: { codeJournal?: string; compteTresorerie?: string },
) {
  return this.prisma.donneurOrdre.update({
    where: { id },
    data: {
      ...(body.codeJournal && { codeJournal: body.codeJournal }),
      ...(body.compteTresorerie && { compteTresorerie: body.compteTresorerie }),
    },
    select: {
      id: true,
      nom: true,
      codeJournal: true,
      compteTresorerie: true,
    },
  });
}
 
// ─── Endpoint 7: Update CompagnieAssurance Sage config ───────────────────────
/**
 * PATCH /finance/compagnies-assurance/:id/sage-config
 * Body: { compteGeneralSage: string }
 */
@Patch('compagnies-assurance/:id/sage-config')
async updateCompagnieSageConfig(
  @Param('id') id: string,
  @Body() body: { compteGeneralSage: string },
) {
  if (!body?.compteGeneralSage) {
    throw new BadRequestException('compteGeneralSage is required');
  }
  if (!/^\d{8}$/.test(body.compteGeneralSage)) {
    throw new BadRequestException('compteGeneralSage must be exactly 8 digits');
  }
 
  return this.prisma.compagnieAssurance.update({
    where: { id },
    data: { compteGeneralSage: body.compteGeneralSage },
    select: { id: true, nom: true, compteGeneralSage: true },
  });
}

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE RECOUVREMENT (SR) ENDPOINTS - CRITICAL GATE AFTER VIREMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bulk validate/reject OVs by Service Recouvrement
   * ROLE: FINANCE or SUPER_ADMIN (Recouvrement is a function, not a separate role)
   */
  @Post('recouvrement/bulk-validate')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async bulkValidateRecouvrement(
    @Body() dto: BulkRecouvrementDto,
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    const result = await this.recouvrementService.bulkValidateRecouvrement(dto, user.id, user.role);
    
    // Send notifications based on status
    for (const ovId of dto.ordreVirementIds) {
      if (dto.status === 'AUTORISE') {
        await this.recouvrementService.notifyFinanceOnAutorise(ovId);
      } else if (dto.status === 'NON_AUTORISE') {
        await this.recouvrementService.notifySuperAdminOnNonAutorise(ovId);
      }
    }
    
    return result;
  }

  /**
   * Get OVs pending recouvrement validation
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Get('recouvrement/pending')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getPendingRecouvrementOVs(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.recouvrementService.getPendingRecouvrementOVs(user.role);
  }

  /**
   * Get NON_AUTORISE OVs (Super Admin only)
   * ROLE: SUPER_ADMIN only
   */
  @Get('recouvrement/non-autorise')
  @Roles(UserRole.SUPER_ADMIN)
  async getNonAutoriseOVs(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.recouvrementService.getNonAutoriseOVs(user.role);
  }

  /**
   * Get all OVs with recouvrement status (for tracking)
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Get('recouvrement/all')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getAllRecouvrementOVs(
    @Query() filters: {
      status?: string;
      recouvre?: string;
      dateFrom?: string;
      dateTo?: string;
      clientId?: string;
    },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.recouvrementService.getAllRecouvrementOVs(user.role, {
      ...filters,
      recouvre: filters.recouvre === 'true' ? true : filters.recouvre === 'false' ? false : undefined,
    });
  }

  /**
   * Override NON_AUTORISE to AUTORISE (Super Admin only)
   * ROLE: SUPER_ADMIN only
   */
  @Put('recouvrement/:id/override-autorise')
  @Roles(UserRole.SUPER_ADMIN)
  async overrideNonAutorise(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    if (!body.comment || body.comment.trim().length === 0) {
      throw new BadRequestException('Un commentaire est obligatoire pour débloquer un OV');
    }
    
    await this.recouvrementService.overrideNonAutorise(id, user.id, user.role, body.comment);
    
    // Notify Finance that OV is now AUTORISE
    await this.recouvrementService.notifyFinanceOnAutorise(id);
    
    return {
      success: true,
      message: 'OV débloqué et autorisé avec succès'
    };
  }

  /**
   * Get recouvrement statistics
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Get('recouvrement/stats')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getRecouvrementStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.recouvrementService.getRecouvrementStats(user.role);
  }

  // === COMPAGNIES ASSURANCE ENDPOINTS ===
  @Get('compagnies-assurance')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getCompagniesAssurance() {
    return this.prisma.compagnieAssurance.findMany({
      orderBy: { nom: 'asc' }
    });
  }

  @Post('compagnies-assurance')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async createCompagnieAssurance(
    @Body() body: { nom: string; code: string; compteGeneralSage?: string }
  ) {
    return this.prisma.compagnieAssurance.create({ data: body });
  }

  @Put('compagnies-assurance/:id')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async updateCompagnieAssurance(
    @Param('id') id: string,
    @Body() body: { nom?: string; compteGeneralSage?: string; statut?: string }
  ) {
    return this.prisma.compagnieAssurance.update({ where: { id }, data: body });
  }

  @Delete('compagnies-assurance/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteCompagnieAssurance(@Param('id') id: string) {
    // Safety check — don't delete if clients linked
    const count = await this.prisma.client.count({ where: { compagnieAssuranceId: id } });
    if (count > 0) {
      throw new BadRequestException(`Impossible de supprimer: ${count} client(s) lié(s)`);
    }
    return this.prisma.compagnieAssurance.delete({ where: { id } });
  }

  // === SAGE TEMPLATE ENDPOINTS ===
  @Get('sage/templates')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getSageTemplates() {
    return this.prisma.sageTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post('sage/templates')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async createSageTemplate(
    @Body() body: { name: string; type: string; structure: any; isDefault?: boolean }
  ) {
    // If setting as default, unset other defaults of same type
    if (body.isDefault) {
      await this.prisma.sageTemplate.updateMany({
        where: { type: body.type, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    return this.prisma.sageTemplate.create({ data: body });
  }

  @Put('sage/templates/:id')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async updateSageTemplate(
    @Param('id') id: string,
    @Body() body: { name?: string; type?: string; structure?: any; isDefault?: boolean }
  ) {
    // If setting as default, unset other defaults of same type
    if (body.isDefault && body.type) {
      await this.prisma.sageTemplate.updateMany({
        where: { type: body.type, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }
    
    return this.prisma.sageTemplate.update({ where: { id }, data: body });
  }

  @Delete('sage/templates/:id')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async deleteSageTemplate(@Param('id') id: string) {
    return this.prisma.sageTemplate.delete({ where: { id } });
  }

  // ─── Set default template ────────────────────────────────────────────────────
  @Post('sage/templates/:id/set-default')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async setDefaultSageTemplate(@Param('id') id: string) {
    // Unset all other defaults of same type first
    const template = await this.prisma.sageTemplate.findUnique({ where: { id } });
    if (!template) throw new BadRequestException('Template not found');

    await this.prisma.sageTemplate.updateMany({
      where: { type: template.type, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.sageTemplate.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  // ─── Get active template (default or hardcoded) ──────────────────────────────
  @Get('sage/active-template')
  async getActiveSageTemplate(@Query('type') type: string = 'TXT') {
    const defaultTemplate = await this.prisma.sageTemplate.findFirst({
      where: { type, isDefault: true },
    });

    return {
      hasDefault: !!defaultTemplate,
      template: defaultTemplate,
      usingHardcoded: !defaultTemplate,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAGE API INTEGRATION ENDPOINTS - STEP 5: AUTO-INJECT TO SAGE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /finance/sage/integrate/:id
   * Generate TXT and send to SAGE API (real-time mode)
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Post('sage/integrate/:id')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async integrateSingleOV(
    @Param('id') id: string,
    @Body() body: { templateId?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    return this.sageApiIntegrationService.integrateOrdreVirement(id, user.id, body.templateId);
  }

  /**
   * POST /finance/sage/integrate-batch
   * Generate TXT files and send to SAGE API (batch mode)
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Post('sage/integrate-batch')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async integrateBatchOVs(
    @Body() body: { ordreVirementIds: string[]; templateId?: string },
    @Req() req: any
  ) {
    const user = getUserFromRequest(req);
    
    if (!body?.ordreVirementIds?.length) {
      throw new BadRequestException('ordreVirementIds must be a non-empty array');
    }
    
    return this.sageApiIntegrationService.integrateBatch(
      body.ordreVirementIds,
      user.id,
      body.templateId,
    );
  }

  /**
   * GET /finance/sage/integration-status/:sageTransactionId
   * Check integration status in SAGE
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Get('sage/integration-status/:sageTransactionId')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async checkSageIntegrationStatus(
    @Param('sageTransactionId') sageTransactionId: string
  ) {
    return this.sageApiIntegrationService.checkIntegrationStatus(sageTransactionId);
  }

  /**
   * GET /finance/ordres-virement/:id/sage-integration-history
   * Get SAGE integration history for an OV
   * ROLE: FINANCE or SUPER_ADMIN
   */
  @Get('ordres-virement/:id/sage-integration-history')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getSageIntegrationHistory(@Param('id') id: string) {
    return this.sageApiIntegrationService.getIntegrationHistory(id);
  }

  /**
   * GET /finance/sage/test-connection
   * Test SAGE API connection
   * ROLE: SUPER_ADMIN only
   */
  @Get('sage/test-connection')
  @Roles(UserRole.SUPER_ADMIN)
  async testSageConnection() {
    const isConnected = await this.sageApiIntegrationService.testConnection();
    return {
      success: isConnected,
      message: isConnected ? 'SAGE API connection successful' : 'SAGE API connection failed',
      config: this.sageApiIntegrationService.getConfig(),
    };
  }

  /**
   * GET /finance/sage/config
   * Get SAGE API configuration
   * ROLE: SUPER_ADMIN only
   */
  @Get('sage/config')
  @Roles(UserRole.SUPER_ADMIN)
  async getSageConfig() {
    return this.sageApiIntegrationService.getConfig();
  }
  
  /**
   * GET /finance/sage/integrations/stats
   * Aggregated statistics for the admin dashboard card.
   * NOTE: must be declared BEFORE /sage/integrations/:id routes
   */
  @Get('sage/integrations/stats')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getSageIntegrationStats() {
    return this.sageApiIntegrationService.getStats();
  }

  /**
   * GET /finance/sage/integrations
   * Paginated, filtered list of all integration attempts.
   *
   * Query params:
   *   status     – SUCCESS | FAILED | PENDING
   *   search     – OV reference or SAGE transaction ID substring
   *   dateFrom   – ISO date string
   *   dateTo     – ISO date string
   *   page       – default 1
   *   pageSize   – default 20, max 100
   */
  @Get('sage/integrations')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async getAllSageIntegrations(
    @Query('status')   status?: string,
    @Query('search')   search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('ordreVirementId') ordreVirementId?: string,
  ) {
    return this.sageApiIntegrationService.getAllIntegrations({
      status: status as any,
      search,
      dateFrom,
      dateTo,
      ordreVirementId,
      page:     page     ? parseInt(page,     10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  /**
   * POST /finance/sage/integrations/:id/retry
   * Re-attempt a FAILED integration record.
   * The old failed record is deleted and a fresh attempt is made.
   */
  @Post('sage/integrations/:id/retry')
  @Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN)
  async retrySageIntegration(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.sageApiIntegrationService.retryIntegration(id, user.id);
  }

  /**
   * DELETE /finance/sage/integrations/:id
   * Remove a FAILED or PENDING integration record.
   * Successful records are protected — cannot be deleted (audit trail).
   * ROLE: SUPER_ADMIN only.
   */
  @Delete('sage/integrations/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteSageIntegration(@Param('id') id: string) {
    return this.sageApiIntegrationService.deleteIntegration(id);
  }

  /**
   * POST /finance/sage/config/reload
   * Hot-reload SAGE API configuration from .env without restarting the server.
   * Call this after updating SAGE_API_URL / SAGE_API_KEY in .env.
   * ROLE: SUPER_ADMIN only.
   */
  @Post('sage/config/reload')
  @Roles(UserRole.SUPER_ADMIN)
  async reloadSageConfig() {
    await this.sageApiIntegrationService.reloadConfig();
    return this.sageApiIntegrationService.getConfig();
  }
  
  @Put('sage/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async updateSageConfig(
    @Body() body: {
      apiUrl?:          string;
      apiKey?:          string | null;
      webhookSecret?:   string | null;
      timeout?:         number;
      retryAttempts?:   number;
      pollIntervalMin?: number;
    },
    @Req() req: any,
  ) {
    return this.sageApiIntegrationService.updateConfig(body, req.user.id);
  }
  
}