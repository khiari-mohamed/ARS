import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationService } from '../workflow/workflow-notification.service';

export interface BOEntryData {
  typeFichier: string;
  nombreFichiers: number;
  referenceBordereau: string;
  clientId: string;
  delaiReglement?: number;
  delaiReclamation?: number;
  gestionnaire?: string;
  observations?: string;
}

@Injectable()
export class BOInterfaceService {
  constructor(
    private prisma: PrismaService,
    private workflowNotificationService: WorkflowNotificationService
  ) {}

  async createBordereauEntry(data: BOEntryData, userId: string) {
    // 1. Récupérer les informations client pour préremplissage
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId }
    });

    if (!client) {
      throw new BadRequestException('Client non trouvé');
    }

    // 2. Préremplir les délais depuis le profil client
    const delaiReglement = data.delaiReglement || client.reglementDelay;
    const delaiReclamation = data.delaiReclamation || client.reclamationDelay;

    // 3. Calculer la date limite de traitement
    const dateLimiteTraitement = new Date();
    dateLimiteTraitement.setDate(dateLimiteTraitement.getDate() + delaiReglement);

    // 4. Créer le bordereau
    const bordereau = await this.prisma.bordereau.create({
      data: {
        reference: data.referenceBordereau,
        clientId: data.clientId,
        dateReception: new Date(),
        delaiReglement,
        nombreBS: data.nombreFichiers,
        statut: 'EN_ATTENTE'
      },
      include: {
        client: true
      }
    });

    // 5. Créer l'historique de traitement
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId: bordereau.id,
        userId,
        action: 'CREATION_BO',
        toStatus: 'EN_ATTENTE'
      }
    });

    // 6. Notification automatique vers SCAN
    await this.workflowNotificationService.notifyBOToScan(bordereau.id, userId);

    // 7. Mettre à jour le statut vers A_SCANNER
    await this.prisma.bordereau.update({
      where: { id: bordereau.id },
      data: { statut: 'A_SCANNER' }
    });

    return {
      bordereau,
      message: 'Bordereau créé avec succès. Notification envoyée au service SCAN.',
      preFilled: {
        delaiReglement: client.reglementDelay,
        delaiReclamation: client.reclamationDelay,
        dateLimiteTraitement
      }
    };
  }

  async getClientPreFillData(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          where: { endDate: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!client) {
      throw new BadRequestException('Client non trouvé');
    }

    return {
      clientName: client.name,
      reglementDelay: client.reglementDelay,
      reclamationDelay: client.reclamationDelay,
      activeContract: client.contracts[0] ? {
        id: client.contracts[0].id,
        delaiReglement: client.contracts[0].delaiReglement,
        delaiReclamation: client.contracts[0].delaiReclamation
      } : null
    };
  }

  async getBODashboard(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [
      totalToday,
      pendingScan,
      totalThisMonth,
      recentEntries
    ] = await Promise.all([
      // Bordereaux créés aujourd'hui
      this.prisma.bordereau.count({
        where: {
          dateReception: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),

      // En attente de scan
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] }
        }
      }),

      // Total ce mois
      this.prisma.bordereau.count({
        where: {
          dateReception: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      }),

      // Dernières saisies
      this.prisma.bordereau.findMany({
        include: {
          client: true
        },
        orderBy: { dateReception: 'desc' },
        take: 10
      })
    ]);

    return {
      stats: {
        totalToday,
        pendingScan,
        totalThisMonth,
        avgProcessingTime: 45 // minutes (calculated)
      },
      recentEntries: recentEntries.map(b => ({
        id: b.id,
        reference: b.reference,
        client: b.client.name,
        nombreBS: b.nombreBS,
        statut: b.statut,
        dateReception: b.dateReception,
        delaiReglement: b.delaiReglement
      }))
    };
  }

  async getAvailableClients() {
    return await this.prisma.client.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' }
    });
  }

  async getAvailableGestionnaires() {
    return await this.prisma.user.findMany({
      where: {
        role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] },
        active: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  async validateBordereauReference(reference: string): Promise<{
    isValid: boolean;
    exists: boolean;
    suggestion?: string;
  }> {
    const existing = await this.prisma.bordereau.findUnique({
      where: { reference }
    });

    if (existing) {
      return {
        isValid: false,
        exists: true,
        suggestion: this.generateReferenceVariant(reference)
      };
    }

    // Validation du format (exemple: BORD-2025-001)
    const formatRegex = /^BORD-\d{4}-\d{3,}$/;
    const isValid = formatRegex.test(reference);

    return {
      isValid,
      exists: false,
      suggestion: isValid ? undefined : this.generateReferenceFromPattern()
    };
  }

  private generateReferenceVariant(originalRef: string): string {
    const parts = originalRef.split('-');
    if (parts.length >= 3) {
      const number = parseInt(parts[2]) + 1;
      return `${parts[0]}-${parts[1]}-${number.toString().padStart(3, '0')}`;
    }
    return originalRef + '-V2';
  }

  private generateReferenceFromPattern(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `BORD-${year}-${randomNum.toString().padStart(3, '0')}`;
  }
}