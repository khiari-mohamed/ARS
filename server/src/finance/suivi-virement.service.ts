import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SuiviVirementData {
  numeroBordereau: string;
  societe: string;
  dateInjection: Date;
  utilisateurSante: string;
  dateTraitement?: Date;
  utilisateurFinance?: string;
  etatVirement: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE';
  dateEtatFinal?: Date;
  commentaire?: string;
  ordreVirementId?: string;
}

export interface VirementNotificationData {
  fromService: 'SANTE' | 'FINANCE';
  toService: 'FINANCE' | 'SANTE';
  ordreVirementId: string;
  message: string;
  type: string;
  userId: string;
}

@Injectable()
export class SuiviVirementService {
  private readonly logger = new Logger(SuiviVirementService.name);

  constructor(private prisma: PrismaService) {}

  // === NOTIFICATION AUTOMATIQUE SANTÉ → FINANCE ===

  async notifySanteToFinance(bordereauId: string, utilisateurSanteId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new Error('Bordereau non trouvé');
    }

    // Create ordre de virement
    const ordreVirement = await this.createOrdreVirement(bordereau, utilisateurSanteId);

    // Create suivi virement entry
    await this.createSuiviVirement({
      numeroBordereau: bordereau.reference,
      societe: bordereau.client.name,
      dateInjection: new Date(),
      utilisateurSante: utilisateurSanteId,
      etatVirement: 'NON_EXECUTE',
      ordreVirementId: ordreVirement.id
    });

    // Send notification to finance team
    await this.sendNotificationToFinance({
      fromService: 'SANTE',
      toService: 'FINANCE',
      ordreVirementId: ordreVirement.id,
      message: `Nouveau bordereau ${bordereau.reference} prêt pour virement - Montant: ${ordreVirement.montantTotal} DT`,
      type: 'BORDEREAU_READY_PAYMENT',
      userId: utilisateurSanteId
    });

    // Update bordereau status
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: 'PRET_VIREMENT' }
    });

    this.logger.log(`Notification envoyée à Finance pour bordereau ${bordereau.reference}`);
  }

  private async createOrdreVirement(bordereau: any, utilisateurSanteId: string): Promise<any> {
    // Get default donneur d'ordre (should be configurable)
    const donneurOrdre = await this.prisma.donneurOrdre.findFirst({
      where: { statut: 'ACTIF' }
    });

    if (!donneurOrdre) {
      throw new Error('Aucun donneur d\'ordre actif trouvé');
    }

    // Calculate total amount from bulletin soins
    const bulletinSoins = await this.prisma.bulletinSoin.findMany({
      where: { bordereauId: bordereau.id }
    });

    const montantTotal = bulletinSoins.reduce((sum, bs) => sum + (bs.montant || 0), 0);

    return this.prisma.ordreVirement.create({
      data: {
        reference: `OV-${bordereau.reference}-${Date.now()}`,
        donneurOrdreId: donneurOrdre.id,
        bordereauId: bordereau.id,
        utilisateurSante: utilisateurSanteId,
        etatVirement: 'NON_EXECUTE',
        montantTotal,
        nombreAdherents: bulletinSoins.length
      }
    });
  }

  // === GESTION DES 5 ÉTATS EXACTS ===

  async updateEtatVirement(
    ordreVirementId: string, 
    nouvelEtat: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE',
    utilisateurFinanceId: string,
    commentaire?: string
  ): Promise<void> {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId }
    });

    if (!ordreVirement) {
      throw new Error('Ordre de virement non trouvé');
    }

    const ancienEtat = ordreVirement.etatVirement;

    // Update ordre de virement
    await this.prisma.ordreVirement.update({
      where: { id: ordreVirementId },
      data: {
        etatVirement: nouvelEtat,
        utilisateurFinance: utilisateurFinanceId,
        dateTraitement: new Date(),
        dateEtatFinal: ['EXECUTE', 'REJETE'].includes(nouvelEtat) ? new Date() : null,
        commentaire
      }
    });

    // Update suivi virement
    await this.prisma.suiviVirement.updateMany({
      where: { ordreVirementId },
      data: {
        etatVirement: nouvelEtat,
        utilisateurFinance: utilisateurFinanceId,
        dateTraitement: new Date(),
        dateEtatFinal: ['EXECUTE', 'REJETE'].includes(nouvelEtat) ? new Date() : null,
        commentaire
      }
    });

    // Create history entry
    await this.prisma.virementHistorique.create({
      data: {
        ordreVirementId,
        action: 'CHANGEMENT_ETAT',
        ancienEtat,
        nouvelEtat,
        utilisateurId: utilisateurFinanceId,
        commentaire
      }
    });

    // Update bordereau status based on virement state
    if (ordreVirement.bordereauId) {
      const updateData: any = {};
      
      // EXACT SPEC: When virement is EXECUTE, bordereau status changes to VIREMENT_EXECUTE
      if (nouvelEtat === 'EXECUTE') {
        updateData.statut = 'VIREMENT_EXECUTE';
        updateData.dateCloture = new Date();
        this.logger.log(`✅ AUTO-STATUS: Bordereau ${ordreVirement.bordereauId} changed TRAITE → VIREMENT_EXECUTE (virement executed)`);
        
        await this.prisma.bordereau.update({
          where: { id: ordreVirement.bordereauId },
          data: updateData
        });
      }
      // For all other virement states (NON_EXECUTE, EN_COURS_EXECUTION, REJETE, etc.)
      // Bordereau status remains TRAITE - NO CHANGE
    }

    this.logger.log(`État virement ${ordreVirementId} changé de ${ancienEtat} vers ${nouvelEtat}`);
  }

  // === CHAMPS DE SUIVI COMPLETS ===

  async createSuiviVirement(data: SuiviVirementData): Promise<any> {
    return this.prisma.suiviVirement.create({
      data: {
        numeroBordereau: data.numeroBordereau,
        societe: data.societe,
        dateInjection: data.dateInjection,
        utilisateurSante: data.utilisateurSante,
        dateTraitement: data.dateTraitement,
        utilisateurFinance: data.utilisateurFinance,
        etatVirement: data.etatVirement,
        dateEtatFinal: data.dateEtatFinal,
        commentaire: data.commentaire,
        ordreVirementId: data.ordreVirementId
      }
    });
  }

  async getSuiviVirements(filters?: {
    numeroBordereau?: string;
    societe?: string;
    etatVirement?: string;
    dateFrom?: Date;
    dateTo?: Date;
    utilisateurSante?: string;
    utilisateurFinance?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (filters) {
      if (filters.numeroBordereau) {
        where.numeroBordereau = { contains: filters.numeroBordereau, mode: 'insensitive' };
      }
      if (filters.societe) {
        where.societe = { contains: filters.societe, mode: 'insensitive' };
      }
      if (filters.etatVirement) {
        where.etatVirement = filters.etatVirement;
      }
      if (filters.dateFrom || filters.dateTo) {
        where.dateInjection = {};
        if (filters.dateFrom) where.dateInjection.gte = filters.dateFrom;
        if (filters.dateTo) where.dateInjection.lte = filters.dateTo;
      }
      if (filters.utilisateurSante) {
        where.utilisateurSante = filters.utilisateurSante;
      }
      if (filters.utilisateurFinance) {
        where.utilisateurFinance = filters.utilisateurFinance;
      }
    }

    return this.prisma.suiviVirement.findMany({
      where,
      include: {
        ordreVirement: {
          include: {
            donneurOrdre: true,
            items: {
              include: {
                adherent: true
              }
            }
          }
        }
      },
      orderBy: { dateInjection: 'desc' }
    });
  }

  async getSuiviVirementDetails(suiviId: string): Promise<any> {
    const suivi = await this.prisma.suiviVirement.findUnique({
      where: { id: suiviId },
      include: {
        ordreVirement: {
          include: {
            donneurOrdre: true,
            items: {
              include: {
                adherent: {
                  include: { client: true }
                }
              }
            },
            historique: {
              orderBy: { dateAction: 'desc' }
            }
          }
        }
      }
    });

    if (!suivi) {
      throw new Error('Suivi de virement non trouvé');
    }

    return {
      ...suivi,
      timeline: await this.getVirementTimeline(suivi.ordreVirementId!),
      statistics: await this.getVirementStatistics(suivi.ordreVirementId!)
    };
  }

  private async getVirementTimeline(ordreVirementId: string): Promise<any[]> {
    const historique = await this.prisma.virementHistorique.findMany({
      where: { ordreVirementId },
      orderBy: { dateAction: 'asc' }
    });

    return historique.map(h => ({
      date: h.dateAction,
      action: h.action,
      ancienEtat: h.ancienEtat,
      nouvelEtat: h.nouvelEtat,
      utilisateur: h.utilisateurId,
      commentaire: h.commentaire
    }));
  }

  private async getVirementStatistics(ordreVirementId: string): Promise<any> {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: { items: true }
    });

    if (!ordreVirement) return null;

    const totalItems = ordreVirement.items.length;
    const validItems = ordreVirement.items.filter(i => i.statut === 'VALIDE').length;
    const errorItems = ordreVirement.items.filter(i => i.statut === 'ERREUR').length;

    return {
      totalAdherents: totalItems,
      adherentsValides: validItems,
      adherentsErreur: errorItems,
      montantTotal: ordreVirement.montantTotal,
      tauxReussite: totalItems > 0 ? (validItems / totalItems) * 100 : 0
    };
  }

  // === NOTIFICATIONS ===

  private async sendNotificationToFinance(data: VirementNotificationData): Promise<void> {
    // Get all finance users
    const financeUsers = await this.prisma.user.findMany({
      where: {
        role: 'FINANCE',
        active: true
      }
    });

    // Send notification to each finance user
    for (const user of financeUsers) {
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: data.type,
          title: 'Nouveau virement à traiter',
          message: data.message,
          data: {
            ordreVirementId: data.ordreVirementId,
            fromService: data.fromService
          }
        }
      });
    }

    // Create workflow notification log
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: 'VIREMENT_NOTIFICATION',
        details: {
          fromService: data.fromService,
          toService: data.toService,
          ordreVirementId: data.ordreVirementId,
          message: data.message,
          type: data.type
        }
      }
    });
  }

  // === DASHBOARD & ANALYTICS ===

  async getVirementDashboard(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    utilisateurFinance?: string;
  }): Promise<any> {
    const where: any = {};

    if (filters) {
      if (filters.dateFrom || filters.dateTo) {
        where.dateInjection = {};
        if (filters.dateFrom) where.dateInjection.gte = filters.dateFrom;
        if (filters.dateTo) where.dateInjection.lte = filters.dateTo;
      }
      if (filters.utilisateurFinance) {
        where.utilisateurFinance = filters.utilisateurFinance;
      }
    }

    const [
      totalVirements,
      virementsByEtat,
      avgProcessingTime,
      recentVirements
    ] = await Promise.all([
      this.prisma.suiviVirement.count({ where }),
      this.prisma.suiviVirement.groupBy({
        by: ['etatVirement'],
        where,
        _count: { id: true }
      }),
      this.getAverageProcessingTime(where),
      this.prisma.suiviVirement.findMany({
        where,
        take: 10,
        orderBy: { dateInjection: 'desc' },
        include: {
          ordreVirement: {
            include: { donneurOrdre: true }
          }
        }
      })
    ]);

    const etatStats = {
      NON_EXECUTE: 0,
      EN_COURS_EXECUTION: 0,
      EXECUTE_PARTIELLEMENT: 0,
      REJETE: 0,
      EXECUTE: 0
    };

    virementsByEtat.forEach(stat => {
      etatStats[stat.etatVirement as keyof typeof etatStats] = stat._count.id;
    });

    const tauxReussite = totalVirements > 0 
      ? ((etatStats.EXECUTE + etatStats.EXECUTE_PARTIELLEMENT) / totalVirements) * 100 
      : 0;

    return {
      summary: {
        totalVirements,
        tauxReussite,
        avgProcessingTime,
        enAttente: etatStats.NON_EXECUTE,
        enCours: etatStats.EN_COURS_EXECUTION,
        executes: etatStats.EXECUTE,
        rejetes: etatStats.REJETE,
        partiels: etatStats.EXECUTE_PARTIELLEMENT
      },
      etatDistribution: etatStats,
      recentVirements: recentVirements.map(v => ({
        id: v.id,
        numeroBordereau: v.numeroBordereau,
        societe: v.societe,
        etatVirement: v.etatVirement,
        dateInjection: v.dateInjection,
        dateTraitement: v.dateTraitement,
        donneurOrdre: v.ordreVirement?.donneurOrdre?.nom
      }))
    };
  }

  private async getAverageProcessingTime(where: any): Promise<number> {
    const completedVirements = await this.prisma.suiviVirement.findMany({
      where: {
        ...where,
        dateTraitement: { not: null },
        etatVirement: { in: ['EXECUTE', 'REJETE', 'EXECUTE_PARTIELLEMENT'] }
      }
    });

    if (completedVirements.length === 0) return 0;

    const totalTime = completedVirements.reduce((sum, v) => {
      const processingTime = v.dateTraitement!.getTime() - v.dateInjection.getTime();
      return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);

    return totalTime / completedVirements.length;
  }

  // === EXPORT & REPORTING ===

  async exportSuiviVirements(filters?: any, format: 'csv' | 'excel' = 'excel'): Promise<Buffer | string> {
    const suivis = await this.getSuiviVirements(filters);

    if (format === 'csv') {
      const headers = [
        'Numéro Bordereau',
        'Société',
        'Date Injection',
        'Utilisateur Santé',
        'Date Traitement',
        'Utilisateur Finance',
        'État Virement',
        'Date État Final',
        'Commentaire'
      ];

      const csvContent = [headers.join(',')];
      
      suivis.forEach(suivi => {
        csvContent.push([
          suivi.numeroBordereau,
          `"${suivi.societe}"`,
          suivi.dateInjection.toISOString().split('T')[0],
          suivi.utilisateurSante || '',
          suivi.dateTraitement?.toISOString().split('T')[0] || '',
          suivi.utilisateurFinance || '',
          suivi.etatVirement,
          suivi.dateEtatFinal?.toISOString().split('T')[0] || '',
          `"${suivi.commentaire || ''}"`
        ].join(','));
      });

      return csvContent.join('\n');
    }

    // Excel export would be implemented here
    return Buffer.from('Excel export not implemented yet');
  }

  async generateFinancialReport(data: {
    format: string;
    filters: any;
    data: any;
    cashFlowProjection: any;
    financialKPIs: any;
  }): Promise<Buffer> {
    console.log('📊 Generating financial report:', data.format);
    
    try {
      // Get real financial data from database
      const [ordresVirement, suiviVirements, bordereaux] = await Promise.all([
        this.prisma.ordreVirement.findMany({
          include: {
            donneurOrdre: true,
            items: { include: { adherent: true } }
          },
          take: 100,
          orderBy: { dateCreation: 'desc' }
        }),
        this.prisma.suiviVirement.findMany({
          take: 100,
          orderBy: { dateInjection: 'desc' }
        }),
        this.prisma.bordereau.findMany({
          include: { client: true, virement: true },
          take: 100,
          orderBy: { dateReception: 'desc' }
        })
      ]);
      
      if (data.format === 'csv') {
        const headers = [
          'Type',
          'Référence',
          'Date',
          'Montant',
          'Statut',
          'Client/Société',
          'Utilisateur'
        ];
        
        const csvContent = [headers.join(',')];
        
        // Add ordre virement data
        ordresVirement.forEach(ov => {
          csvContent.push([
            'Ordre Virement',
            ov.reference,
            ov.dateCreation.toISOString().split('T')[0],
            ov.montantTotal.toString(),
            ov.etatVirement,
            ov.donneurOrdre?.nom || 'N/A',
            ov.utilisateurSante || 'N/A'
          ].join(','));
        });
        
        // Add bordereau data
        bordereaux.forEach(b => {
          csvContent.push([
            'Bordereau',
            b.reference,
            b.dateReception.toISOString().split('T')[0],
            (b.nombreBS * 100).toString(),
            b.statut,
            b.client?.name || 'N/A',
            'N/A'
          ].join(','));
        });
        
        return Buffer.from(csvContent.join('\n'), 'utf-8');
      }
      
      if (data.format === 'pdf') {
        const reportContent = `RAPPORT FINANCIER\n================\n\nGénéré le: ${new Date().toLocaleString('fr-FR')}\n\nRÉSUMÉ EXÉCUTIF\n---------------\nTotal Ordres de Virement: ${ordresVirement.length}\nTotal Bordereaux: ${bordereaux.length}\nMontant Total OV: ${ordresVirement.reduce((sum, ov) => sum + ov.montantTotal, 0).toLocaleString('fr-FR')} DT\n\nDERNIERS ORDRES DE VIREMENT\n---------------------------\n${ordresVirement.slice(0, 10).map(ov => `${ov.reference} - ${ov.montantTotal.toLocaleString('fr-FR')} DT - ${ov.etatVirement}`).join('\n')}\n\n---\nRapport généré automatiquement par le système ARS`;
        
        return Buffer.from(reportContent, 'utf-8');
      }
      
      // Default to Excel format
      const excelContent = `Référence\tType\tDate\tMontant\tStatut\tClient\n${[
        ...ordresVirement.map(ov => 
          `${ov.reference}\tOrdre Virement\t${ov.dateCreation.toISOString().split('T')[0]}\t${ov.montantTotal}\t${ov.etatVirement}\t${ov.donneurOrdre?.nom || 'N/A'}`
        ),
        ...bordereaux.map(b => 
          `${b.reference}\tBordereau\t${b.dateReception.toISOString().split('T')[0]}\t${b.nombreBS * 100}\t${b.statut}\t${b.client?.name || 'N/A'}`
        )
      ].join('\n')}`;
      
      return Buffer.from(excelContent, 'utf-8');
      
    } catch (error) {
      console.error('Failed to generate financial report:', error);
      throw new Error('Report generation failed: ' + error.message);
    }
  }
}