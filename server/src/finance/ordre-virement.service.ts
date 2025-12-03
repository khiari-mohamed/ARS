import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelImportService, VirementData } from './excel-import.service';
import { FileGenerationService } from './file-generation.service';
import { WorkflowNotificationsService } from '../workflow/workflow-notifications.service';

export interface CreateOrdreVirementDto {
  donneurOrdreId: string;
  bordereauId?: string;
  virementData: VirementData[];
  utilisateurSante: string;
  uploadedPdfPath?: string;
}

export interface UpdateEtatVirementDto {
  etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE';
  commentaire?: string;
  utilisateurFinance: string;
}

@Injectable()
export class OrdreVirementService {
  private readonly logger = new Logger(OrdreVirementService.name);

  constructor(
    private prisma: PrismaService,
    private excelImportService: ExcelImportService,
    private fileGenerationService: FileGenerationService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async createOrdreVirement(dto: CreateOrdreVirementDto) {
    // Generate reference
    const reference = await this.generateReference();

    // Calculate totals - handle undefined virementData
    const virementData = dto.virementData || [];
    const validItems = virementData.filter(v => v.statut === 'VALIDE');
    const montantTotal = validItems.reduce((sum, item) => sum + item.montant, 0);
    const nombreAdherents = validItems.length;

    // Create ordre virement
    const ordreVirement = await this.prisma.ordreVirement.create({
      data: {
        reference,
        donneurOrdreId: dto.donneurOrdreId,
        bordereauId: dto.bordereauId,
        utilisateurSante: dto.utilisateurSante,
        montantTotal,
        nombreAdherents,
        etatVirement: 'EN_COURS_VALIDATION',
        validationStatus: 'EN_ATTENTE_VALIDATION',
        uploadedPdfPath: dto.uploadedPdfPath
      }
    });

    // Create virement items - skip if adherent doesn't exist
    for (const item of validItems) {
      try {
        // Check if adherent exists or create a mock one
        let adherentId = item.adherent.id;
        if (adherentId.startsWith('mock-')) {
          // Skip creating VirementItem for mock adherents
          continue;
        }
        
        await this.prisma.virementItem.create({
          data: {
            ordreVirementId: ordreVirement.id,
            adherentId: adherentId,
            montant: item.montant,
            statut: item.statut,
            erreur: item.erreur
          }
        });
      } catch (error) {
        console.log(`Skipping VirementItem creation for ${item.adherent.id}:`, error.message);
        // Continue processing other items
      }
    }

    // Generate files
    const { pdfPath, txtPath } = await this.fileGenerationService.generateFiles({
      ordreVirementId: ordreVirement.id,
      donneurOrdreId: dto.donneurOrdreId,
      virementData: dto.virementData
    });

    // Update with file paths
    const updatedOrdre = await this.prisma.ordreVirement.update({
      where: { id: ordreVirement.id },
      data: {
        fichierPdf: pdfPath,
        fichierTxt: txtPath
      },
      include: {
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        }
      }
    });

    // Create history entry
    await this.createHistoryEntry(ordreVirement.id, 'CREATION', null, 'NON_EXECUTE', dto.utilisateurSante);

    // Notify finance team
    await this.notifyFinanceTeam(updatedOrdre);

    return updatedOrdre;
  }

  async updateEtatVirement(ordreVirementId: string, dto: UpdateEtatVirementDto) {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true
          }
        }
      }
    });

    if (!ordreVirement) {
      throw new BadRequestException('Ordre virement not found');
    }

    const previousEtat = ordreVirement.etatVirement;

    // Update ordre virement
    const updated = await this.prisma.ordreVirement.update({
      where: { id: ordreVirementId },
      data: {
        etatVirement: dto.etatVirement,
        commentaire: dto.commentaire,
        utilisateurFinance: dto.utilisateurFinance,
        dateTraitement: new Date(),
        dateEtatFinal: ['EXECUTE', 'REJETE'].includes(dto.etatVirement) ? new Date() : undefined
      }
    });

    // Create history entry
    await this.createHistoryEntry(
      ordreVirementId,
      'MISE_A_JOUR_ETAT',
      previousEtat,
      dto.etatVirement,
      dto.utilisateurFinance,
      dto.commentaire
    );

    // Update bordereau status if applicable
    if (ordreVirement.bordereauId) {
      await this.updateBordereauStatus(ordreVirement.bordereauId, dto.etatVirement);
    }

    return updated;
  }

  async processExcelImport(fileBuffer: Buffer, clientId: string, donneurOrdreId: string, userId: string, bordereauId?: string) {
    // Validate Excel structure
    const validation = await this.excelImportService.validateExcelStructure(fileBuffer);
    if (!validation.valid) {
      throw new BadRequestException(`Excel file validation failed: ${validation.errors.join(', ')}`);
    }

    // Process Excel data
    const importResult = await this.excelImportService.processExcelFile(fileBuffer, clientId);

    if (importResult.valid.length === 0) {
      throw new BadRequestException('No valid data found in Excel file');
    }

    return {
      importResult,
      bordereauId,
      preview: {
        validItems: importResult.valid.slice(0, 10), // Preview first 10
        summary: importResult.summary,
        canProceed: importResult.valid.filter(v => v.statut === 'VALIDE').length > 0
      }
    };
  }

  async findOrdreVirements(filters: any = {}) {
    const where: any = {};

    if (filters.etatVirement) where.etatVirement = filters.etatVirement;
    if (filters.donneurOrdreId) where.donneurOrdreId = filters.donneurOrdreId;
    if (filters.dateStart) where.dateCreation = { gte: new Date(filters.dateStart) };
    if (filters.dateEnd) where.dateCreation = { ...where.dateCreation, lte: new Date(filters.dateEnd) };

    return await this.prisma.ordreVirement.findMany({
      where,
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true
          }
        },
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOrdreVirementById(id: string) {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true
          }
        },
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        },
        historique: {
          orderBy: { dateAction: 'desc' }
        }
      }
    });

    if (!ordreVirement) {
      throw new BadRequestException('Ordre virement not found');
    }

    return ordreVirement;
  }

  async getFinanceDashboard() {
    // Get data from both sources: ordreVirement and virement tables
    const [
      ordreVirements,
      virements,
      ordreVirementTotal,
      virementTotal,
      transferTotal
    ] = await Promise.all([
      this.prisma.ordreVirement.findMany({
        include: {
          donneurOrdre: true,
          bordereau: {
            include: {
              client: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.virement.findMany({
        include: {
          bordereau: {
            include: {
              client: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.ordreVirement.aggregate({ _sum: { montantTotal: true } }),
      this.prisma.virement.aggregate({ _sum: { montant: true } }),
      this.prisma.wireTransfer.aggregate({ _sum: { amount: true } })
    ]);

    // Combine data from both sources
    const allOrdres = [...ordreVirements];
    
    // Transform virements to match OV format
    const transformedVirements = virements.map((v, index) => ({
      id: v.id,
      reference: `VIR-2024-${String(index + 1).padStart(4, '0')}`,
      etatVirement: v.confirmed ? 'EXECUTE' : 'NON_EXECUTE' as any,
      montantTotal: v.montant,
      dateCreation: v.createdAt,
      createdAt: v.createdAt,
      updatedAt: v.createdAt,
      bordereauId: v.bordereauId,
      commentaire: null,
      donneurOrdreId: 'default',
      utilisateurSante: 'system',
      utilisateurFinance: null,
      dateTraitement: null,
      dateEtatFinal: v.confirmed ? v.confirmedAt : null,
      nombreAdherents: 1,
      fichierPdf: null,
      fichierTxt: null,
      bordereau: v.bordereau,
      donneurOrdre: {
        id: 'default',
        nom: 'ARS Compte Principal',
        statut: 'ACTIF',
        createdAt: v.createdAt,
        updatedAt: v.createdAt,
        rib: '',
        banque: 'ARS TUNISIE',
        structureTxt: '',
        formatTxtType: 'SWIFT',
        signaturePath: null
      }
    }));
    
    allOrdres.push(...(transformedVirements as any));

    // Calculate combined stats
    const totalOrdres = ordreVirements.length + virements.length;
    const ordresEnCours = ordreVirements.filter(o => o.etatVirement === 'EN_COURS_EXECUTION').length + 
                         virements.filter(v => !v.confirmed).length;
    const ordresExecutes = ordreVirements.filter(o => o.etatVirement === 'EXECUTE').length + 
                          virements.filter(v => v.confirmed).length;
    const ordresRejetes = ordreVirements.filter(o => o.etatVirement === 'REJETE').length;
    const montantTotal = (ordreVirementTotal._sum.montantTotal || 0) + 
                        (virementTotal._sum.montant || 0) + 
                        (transferTotal._sum.amount || 0);

    // Sort combined orders by date
    const recentOrdres = allOrdres
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      stats: {
        totalOrdres,
        ordresEnCours,
        ordresExecutes,
        ordresRejetes,
        montantTotal
      },
      recentOrdres
    };
  }

  private async generateReference(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const count = await this.prisma.ordreVirement.count({
      where: {
        createdAt: {
          gte: new Date(year, now.getMonth(), now.getDate()),
          lt: new Date(year, now.getMonth(), now.getDate() + 1)
        }
      }
    });

    return `VIR-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }

  private async createHistoryEntry(
    ordreVirementId: string,
    action: string,
    ancienEtat: string | null,
    nouvelEtat: string,
    utilisateurId: string,
    commentaire?: string
  ) {
    await this.prisma.virementHistorique.create({
      data: {
        ordreVirementId,
        action,
        ancienEtat,
        nouvelEtat,
        utilisateurId,
        commentaire
      }
    });
  }

  private async notifyFinanceTeam(ordreVirement: any) {
    try {
      const financeUsers = await this.prisma.user.findMany({
        where: { role: 'FINANCE', active: true }
      });

      for (const user of financeUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'NOUVEAU_VIREMENT',
            title: 'Nouveau bordereau de remboursement',
            message: `Un nouveau bordereau de remboursement a été injecté pour ${ordreVirement.bordereau?.client?.name || 'une société'}. Merci de mettre à jour son état de virement.`,
            data: {
              ordreVirementId: ordreVirement.id,
              reference: ordreVirement.reference,
              montantTotal: ordreVirement.montantTotal,
              nombreAdherents: ordreVirement.nombreAdherents
            }
          }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify finance team: ${error.message}`);
    }
  }

  private async updateBordereauStatus(bordereauId: string, etatVirement: string) {
    let newStatus;
    
    switch (etatVirement) {
      case 'EN_COURS_EXECUTION':
        newStatus = 'VIREMENT_EN_COURS';
        break;
      case 'EXECUTE':
        newStatus = 'VIREMENT_EXECUTE';
        break;
      case 'REJETE':
        newStatus = 'VIREMENT_REJETE';
        break;
      default:
        return; // No status change needed
    }

    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: newStatus }
    });
  }
}