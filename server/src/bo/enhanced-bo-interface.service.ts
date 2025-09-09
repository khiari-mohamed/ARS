import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BOManualEntryData {
  typeFichier: string;
  nombreFichiers: number;
  reference: string;
  clientId: string;
  delaiReglement?: number;
  delaiReclamation?: number;
  gestionnairePrefere?: string;
  commentaires?: string;
}

export interface BOBatchData {
  clientId: string;
  typeFichier: string;
  fichiers: Array<{
    nom: string;
    nombreBS: number;
    reference: string;
  }>;
  gestionnairePrefere?: string;
}

@Injectable()
export class EnhancedBOInterfaceService {
  private readonly logger = new Logger(EnhancedBOInterfaceService.name);

  constructor(private prisma: PrismaService) {}

  // === INTERFACE SAISIE MANUELLE ===

  async createManualEntry(data: BOManualEntryData, userId: string): Promise<any> {
    // Verify client exists and get auto-fill data
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
      include: {
        gestionnaires: true,
        chargeCompte: true
      }
    });

    if (!client) {
      throw new Error('Client non trouvé');
    }

    // Auto-fill delays from client configuration
    const delaiReglement = data.delaiReglement || client.reglementDelay;
    const delaiReclamation = data.delaiReclamation || client.reclamationDelay;

    // Auto-select gestionnaire based on charge de compte or preferred
    let gestionnairePrefere = data.gestionnairePrefere;
    if (!gestionnairePrefere && client.chargeCompte) {
      gestionnairePrefere = client.chargeCompte.id;
    } else if (!gestionnairePrefere && client.gestionnaires.length > 0) {
      // Select least loaded gestionnaire
      gestionnairePrefere = await this.selectOptimalGestionnaire(client.gestionnaires) ?? undefined;
    }

    // Create bordereau with auto-filled data
    const bordereau = await this.prisma.bordereau.create({
      data: {
        reference: data.reference,
        clientId: data.clientId,
        dateReception: new Date(),
        delaiReglement,
        nombreBS: data.nombreFichiers,
        statut: 'EN_ATTENTE',
        currentHandlerId: gestionnairePrefere ? gestionnairePrefere : undefined,
        chargeCompteId: client.chargeCompteId ? client.chargeCompteId : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        client: true,
        currentHandler: true,
        chargeCompte: true
      }
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BO_MANUAL_ENTRY',
        details: {
          bordereauId: bordereau.id,
          reference: data.reference,
          clientName: client.name,
          typeFichier: data.typeFichier,
          nombreFichiers: data.nombreFichiers,
          autoFilled: {
            delaiReglement,
            delaiReclamation,
            gestionnairePrefere,
            chargeCompte: client.chargeCompte?.fullName
          }
        }
      }
    });

    // Send automatic notification to SCAN
    await this.sendNotificationToScan(bordereau.id, userId);

    this.logger.log(`Bordereau ${data.reference} créé manuellement par BO avec auto-remplissage`);

    return {
      bordereau,
      autoFilledData: {
        delaiReglement,
        delaiReclamation,
        gestionnairePrefere,
        chargeCompte: client.chargeCompte?.fullName
      }
    };
  }

  // === LIAISON AUTO AVEC MODULE CLIENT ===

  async getClientAutoFillData(clientId: string): Promise<any> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            role: true,
            // capacity field removed
          }
        },
        chargeCompte: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        contracts: {
          where: { endDate: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        slaConfigurations: {
          where: { active: true },
          take: 1
        }
      }
    });

    if (!client) {
      throw new Error('Client non trouvé');
    }

    // Calculate optimal gestionnaire based on current workload
    const optimalGestionnaire = client.gestionnaires.length > 0 
      ? await this.selectOptimalGestionnaire(client.gestionnaires)
      : null;

    // Get current workload for each gestionnaire
    const gestionnairesWithWorkload = await Promise.all(
      client.gestionnaires.map(async (g) => {
        const currentLoad = await this.prisma.bordereau.count({
          where: {
            currentHandlerId: g.id,
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        });

        return {
          ...g,
          currentLoad,
          utilizationRate: 0 // capacity field not available
        };
      })
    );

    return {
      client: {
        id: client.id,
        name: client.name,
        reglementDelay: client.reglementDelay,
        reclamationDelay: client.reclamationDelay
      },
      chargeCompte: client.chargeCompte,
      gestionnaires: gestionnairesWithWorkload,
      optimalGestionnaire,
      activeContract: client.contracts[0] || null,
      slaConfiguration: client.slaConfigurations[0] || null,
      recommendations: {
        suggestedGestionnaire: optimalGestionnaire,
        workloadBalance: this.analyzeWorkloadBalance(gestionnairesWithWorkload),
        slaRisk: await this.assessSLARisk(clientId)
      }
    };
  }

  private async selectOptimalGestionnaire(gestionnaires: any[]): Promise<string | null> {
    if (gestionnaires.length === 0) return null;

    // Calculate current workload for each gestionnaire
    const workloads = await Promise.all(
      gestionnaires.map(async (g) => {
        const currentLoad = await this.prisma.bordereau.count({
          where: {
            currentHandlerId: g.id,
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        });

        const efficiency = await this.getUserEfficiency(g.id);

        return {
          id: g.id,
          currentLoad,
          capacity: g.capacity || 20,
          efficiency,
          score: this.calculateGestionnaireScore(currentLoad, g.capacity || 20, efficiency)
        };
      })
    );

    // Select gestionnaire with best score (lowest utilization, highest efficiency)
    const optimal = workloads.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return optimal.id;
  }

  private calculateGestionnaireScore(currentLoad: number, capacity: number, efficiency: number): number {
    const utilizationRate = capacity > 0 ? currentLoad / capacity : 1;
    const availabilityScore = Math.max(0, 1 - utilizationRate);
    const efficiencyScore = efficiency / 100;
    
    return (availabilityScore * 0.6) + (efficiencyScore * 0.4);
  }

  private async getUserEfficiency(userId: string): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const completed = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        statut: 'TRAITE',
        updatedAt: { gte: last30Days }
      }
    });

    const assigned = await this.prisma.bordereau.count({
      where: {
        currentHandlerId: userId,
        updatedAt: { gte: last30Days }
      }
    });

    return assigned > 0 ? (completed / assigned) * 100 : 80;
  }

  private analyzeWorkloadBalance(gestionnaires: any[]): any {
    if (gestionnaires.length === 0) {
      return { status: 'NO_GESTIONNAIRES', message: 'Aucun gestionnaire disponible' };
    }

    const avgUtilization = gestionnaires.reduce((sum, g) => sum + g.utilizationRate, 0) / gestionnaires.length;
    const maxUtilization = Math.max(...gestionnaires.map(g => g.utilizationRate));
    const minUtilization = Math.min(...gestionnaires.map(g => g.utilizationRate));

    let status = 'BALANCED';
    let message = 'Charge de travail équilibrée';

    if (maxUtilization > 90) {
      status = 'OVERLOADED';
      message = 'Certains gestionnaires sont surchargés';
    } else if (maxUtilization - minUtilization > 30) {
      status = 'UNBALANCED';
      message = 'Charge de travail déséquilibrée';
    }

    return {
      status,
      message,
      avgUtilization,
      maxUtilization,
      minUtilization,
      overloadedCount: gestionnaires.filter(g => g.utilizationRate > 90).length
    };
  }

  private async assessSLARisk(clientId: string): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        clientId,
        dateReception: { gte: last30Days }
      }
    });

    if (recentBordereaux.length === 0) {
      return { risk: 'LOW', message: 'Pas d\'historique récent' };
    }

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    const delayedCount = recentBordereaux.filter(b => {
      const daysSinceReception = Math.floor((new Date().getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceReception > (client?.reglementDelay || 30);
    }).length;

    const delayRate = (delayedCount / recentBordereaux.length) * 100;

    let risk = 'LOW';
    let message = 'Risque SLA faible';

    if (delayRate > 20) {
      risk = 'HIGH';
      message = `Risque SLA élevé (${delayRate.toFixed(1)}% de retards)`;
    } else if (delayRate > 10) {
      risk = 'MEDIUM';
      message = `Risque SLA modéré (${delayRate.toFixed(1)}% de retards)`;
    }

    return { risk, message, delayRate, delayedCount, totalCount: recentBordereaux.length };
  }

  // === NOTIFICATION AUTO → SCAN ===

  private async sendNotificationToScan(bordereauId: string, userId: string): Promise<void> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) return;

    // Get all SCAN users
    const scanUsers = await this.prisma.user.findMany({
      where: {
        role: 'SCAN',
        active: true
      }
    });

    // Send notification to each SCAN user
    for (const scanUser of scanUsers) {
      await this.prisma.notification.create({
        data: {
          userId: scanUser.id,
          type: 'BORDEREAU_RECEIVED',
          title: 'Nouveau bordereau à scanner',
          message: `Bordereau ${bordereau.reference} de ${bordereau.client.name} prêt pour numérisation (${bordereau.nombreBS} BS)`,
          data: {
            bordereauId,
            reference: bordereau.reference,
            clientName: bordereau.client.name,
            nombreBS: bordereau.nombreBS
          }
        }
      });
    }

    // Create workflow notification
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BO_TO_SCAN_NOTIFICATION',
        details: {
          bordereauId,
          reference: bordereau.reference,
          clientName: bordereau.client.name,
          nombreBS: bordereau.nombreBS,
          notifiedUsers: scanUsers.length
        }
      }
    });

    this.logger.log(`Notification envoyée à ${scanUsers.length} utilisateurs SCAN pour bordereau ${bordereau.reference}`);
  }

  // === BATCH OPERATIONS ===

  async createBatchEntry(data: BOBatchData, userId: string): Promise<any> {
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
      include: { chargeCompte: true, gestionnaires: true }
    });

    if (!client) {
      throw new Error('Client non trouvé');
    }

    const bordereaux: any[] = [];
    
    for (const fichier of data.fichiers) {
      const gestionnairePrefere = data.gestionnairePrefere || 
        client.chargeCompteId || 
        await this.selectOptimalGestionnaire(client.gestionnaires);

      const bordereau = await this.prisma.bordereau.create({
        data: {
          reference: fichier.reference,
          clientId: data.clientId,
          dateReception: new Date(),
          delaiReglement: client.reglementDelay,
          nombreBS: fichier.nombreBS,
          statut: 'EN_ATTENTE',
          currentHandlerId: gestionnairePrefere || undefined,
          chargeCompteId: client.chargeCompteId || undefined
        },
        include: {
          client: true,
          currentHandler: true
        }
      });

      bordereaux.push(bordereau);

      // Send notification to SCAN for each bordereau
      await this.sendNotificationToScan(bordereau.id, userId);
    }

    // Create batch audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BO_BATCH_ENTRY',
        details: {
          clientId: data.clientId,
          clientName: client.name,
          typeFichier: data.typeFichier,
          nombreFichiers: data.fichiers.length,
          totalBS: data.fichiers.reduce((sum, f) => sum + f.nombreBS, 0),
          bordereauIds: bordereaux.map(b => b.id)
        }
      }
    });

    this.logger.log(`Lot de ${data.fichiers.length} bordereaux créé pour client ${client.name}`);

    return {
      success: true,
      bordereaux,
      summary: {
        totalFichiers: data.fichiers.length,
        totalBS: data.fichiers.reduce((sum, f) => sum + f.nombreBS, 0),
        clientName: client.name,
        gestionnairePrefere: bordereaux[0]?.currentHandler?.fullName
      }
    };
  }

  // === DASHBOARD & ANALYTICS ===

  async getBODashboard(userId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      todayEntries,
      weeklyEntries,
      monthlyEntries,
      pendingScan,
      recentEntries,
      clientStats
    ] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          dateReception: { gte: startOfDay }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          dateReception: { gte: last7Days }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          dateReception: { gte: last30Days }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] }
        }
      }),
      this.prisma.bordereau.findMany({
        take: 10,
        orderBy: { dateReception: 'desc' },
        include: {
          client: { select: { name: true } },
          currentHandler: { select: { fullName: true } }
        }
      }),
      this.prisma.bordereau.groupBy({
        by: ['clientId'],
        where: {
          dateReception: { gte: last30Days }
        },
        _count: { id: true },
        _sum: { nombreBS: true }
      })
    ]);

    // Get client names for stats
    const clientIds = clientStats.map(s => s.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true }
    });

    const clientStatsWithNames = clientStats.map(stat => {
      const client = clients.find(c => c.id === stat.clientId);
      return {
        clientId: stat.clientId,
        clientName: client?.name || 'Client inconnu',
        bordereauCount: stat._count.id,
        totalBS: stat._sum.nombreBS || 0
      };
    }).sort((a, b) => b.bordereauCount - a.bordereauCount);

    return {
      summary: {
        todayEntries,
        weeklyEntries,
        monthlyEntries,
        pendingScan,
        avgDailyEntries: Math.round(weeklyEntries / 7)
      },
      recentEntries: recentEntries.map((entry: any) => ({
        id: entry.id,
        reference: entry.reference,
        clientName: entry.client.name,
        nombreBS: entry.nombreBS,
        statut: entry.statut,
        dateReception: entry.dateReception,
        gestionnaire: entry.currentHandler?.fullName
      })),
      topClients: clientStatsWithNames.slice(0, 5),
      workflowStatus: {
        enAttente: await this.prisma.bordereau.count({ where: { statut: 'EN_ATTENTE' } }),
        aScanner: await this.prisma.bordereau.count({ where: { statut: 'A_SCANNER' } }),
        scanEnCours: await this.prisma.bordereau.count({ where: { statut: 'SCAN_EN_COURS' } }),
        scanne: await this.prisma.bordereau.count({ where: { statut: 'SCANNE' } })
      }
    };
  }

  // === PERFORMANCE METRICS ===

  async getBOPerformanceMetrics(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<any> {
    const days = period === 'daily' ? 7 : period === 'weekly' ? 28 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const entries = await this.prisma.bordereau.findMany({
      where: {
        dateReception: { gte: startDate }
      },
      include: {
        client: { select: { name: true } }
      }
    });

    // Group by period
    const groupedData = this.groupEntriesByPeriod(entries, period);

    // Calculate metrics
    const totalEntries = entries.length;
    const avgEntriesPerPeriod = totalEntries / groupedData.length;
    const totalBS = entries.reduce((sum, e) => sum + e.nombreBS, 0);
    const avgBSPerEntry = totalEntries > 0 ? totalBS / totalEntries : 0;

    // Processing time analysis
    const processedEntries = entries.filter(e => e.dateFinScan);
    const avgProcessingTime = processedEntries.length > 0
      ? processedEntries.reduce((sum, e) => {
          const processingTime = e.dateFinScan!.getTime() - e.dateReception!.getTime();
          return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / processedEntries.length
      : 0;

    return {
      period,
      summary: {
        totalEntries,
        totalBS,
        avgEntriesPerPeriod,
        avgBSPerEntry,
        avgProcessingTime,
        processedRate: totalEntries > 0 ? (processedEntries.length / totalEntries) * 100 : 0
      },
      timeline: groupedData,
      topPerformers: await this.getTopPerformingClients(startDate)
    };
  }

  private groupEntriesByPeriod(entries: any[], period: string): any[] {
    const grouped = new Map();

    entries.forEach(entry => {
      let key: string;
      const date = new Date(entry.dateReception);

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped.has(key)) {
        grouped.set(key, { period: key, count: 0, totalBS: 0 });
      }

      const group = grouped.get(key);
      group.count++;
      group.totalBS += entry.nombreBS;
    });

    return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  private async getTopPerformingClients(startDate: Date): Promise<any[]> {
    const clientStats = await this.prisma.bordereau.groupBy({
      by: ['clientId'],
      where: {
        dateReception: { gte: startDate }
      },
      _count: { id: true },
      _sum: { nombreBS: true }
    });

    const clientIds = clientStats.map(s => s.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true }
    });

    return clientStats
      .map(stat => {
        const client = clients.find(c => c.id === stat.clientId);
        return {
          clientId: stat.clientId,
          clientName: client?.name || 'Client inconnu',
          bordereauCount: stat._count.id,
          totalBS: stat._sum.nombreBS || 0
        };
      })
      .sort((a, b) => b.totalBS - a.totalBS)
      .slice(0, 10);
  }
}