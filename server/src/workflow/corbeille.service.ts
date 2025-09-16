import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorbeilleService {
  constructor(private prisma: PrismaService) {}

  async getBOCorbeille(userId: string) {
    try {
      const items = await this.prisma.bordereau.findMany({
        where: { 
          statut: 'EN_ATTENTE',
          archived: false
        },
        include: { 
          client: true, 
          contract: true 
        },
        orderBy: { dateReception: 'desc' }
      });

      const processedItems = items.map(item => ({
        id: item.id,
        type: 'bordereau',
        reference: item.reference,
        clientName: item.client?.name || 'Unknown',
        subject: `Nouveau bordereau - ${item.nombreBS || 0} BS`,
        priority: 'NORMAL',
        status: item.statut,
        createdAt: item.dateReception,
        slaStatus: 'ON_TIME',
        remainingTime: 24
      }));

      return {
        items: processedItems,
        stats: {
          pending: items.length
        }
      };
    } catch (error) {
      return { items: [], stats: { pending: 0 } };
    }
  }

  async getScanCorbeille(userId: string) {
    try {
      const [toScan, scanning, completed] = await Promise.all([
        // Ready to scan
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'A_SCANNER',
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateReception: 'asc' }
        }),

        // Currently scanning
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'SCAN_EN_COURS',
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateDebutScan: 'asc' }
        }),

        // Recently completed
        this.prisma.bordereau.findMany({
          where: { 
            statut: 'SCANNE',
            dateFinScan: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            },
            archived: false
          },
          include: { client: true, contract: true },
          orderBy: { dateFinScan: 'desc' }
        })
      ]);

      const processItems = (items: any[], status: string) => items.map(item => ({
        id: item.id,
        type: 'bordereau',
        reference: item.reference,
        clientName: item.client?.name || 'Unknown',
        subject: `${item.nombreBS || 0} BS à scanner`,
        priority: 'NORMAL',
        status,
        createdAt: item.dateReception,
        slaStatus: 'ON_TIME',
        remainingTime: 24
      }));

      return {
        toScan: processItems(toScan, 'A_SCANNER'),
        scanning: processItems(scanning, 'SCAN_EN_COURS'),
        completed: processItems(completed, 'SCANNE'),
        stats: {
          toScan: toScan.length,
          scanning: scanning.length,
          completed: completed.length
        }
      };
    } catch (error) {
      return { 
        toScan: [], 
        scanning: [], 
        completed: [],
        stats: { toScan: 0, scanning: 0, completed: 0 } 
      };
    }
  }

  async getChefEquipeCorbeille(userId: string) {
    try {
      const [nonAffectes, enCours, traites] = await Promise.all([
        // Non-assigned items ready for assignment
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['SCANNE', 'A_AFFECTER'] },
            assignedToUserId: null
          },
          include: {
            client: true,
            contract: true
          },
          orderBy: { dateReception: 'asc' }
        }),

        // Items currently being processed by team members
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] },
            assignedToUserId: { not: null }
          },
          include: {
            client: true,
            contract: true,
            currentHandler: true
          },
          orderBy: { dateReception: 'asc' }
        }),

        // Completed items
        this.prisma.bordereau.findMany({
          where: {
            statut: { in: ['TRAITE', 'CLOTURE'] },
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          include: {
            client: true,
            contract: true,
            currentHandler: true
          },
          orderBy: { updatedAt: 'desc' }
        })
      ]);

      // Calculate SLA status for each item
      const now = new Date();
      const processItems = (items: any[]) => items.map(item => {
        const daysSinceReception = Math.floor((now.getTime() - new Date(item.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        const slaLimit = item.delaiReglement || item.contract?.delaiReglement || 30;
        const remainingTime = Math.max(0, (slaLimit - daysSinceReception) * 24);

        let slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
        if (daysSinceReception > slaLimit) slaStatus = 'OVERDUE';
        else if (remainingTime <= 24) slaStatus = 'CRITICAL';
        else if (remainingTime <= 72) slaStatus = 'AT_RISK';
        else slaStatus = 'ON_TIME';

        return {
          id: item.id,
          type: 'bordereau',
          reference: item.reference,
          clientName: item.client?.name || 'Unknown',
          subject: `${item.nombreBS || 0} BS - ${item.client?.name}`,
          priority: daysSinceReception > slaLimit ? 'URGENT' : 'NORMAL',
          status: item.statut,
          createdAt: item.dateReception,
          assignedTo: item.currentHandler?.fullName,
          slaStatus,
          remainingTime
        };
      });

      const processedNonAffectes = processItems(nonAffectes);
      const processedEnCours = processItems(enCours);
      const processedTraites = processItems(traites);

      // Calculate statistics
      const stats = {
        nonAffectes: processedNonAffectes.length,
        enCours: processedEnCours.length,
        traites: processedTraites.length,
        enRetard: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'OVERDUE').length,
        critiques: [...processedNonAffectes, ...processedEnCours].filter(item => item.slaStatus === 'CRITICAL').length
      };

      return {
        nonAffectes: processedNonAffectes,
        enCours: processedEnCours,
        traites: processedTraites,
        stats
      };
    } catch (error) {
      return {
        nonAffectes: [],
        enCours: [],
        traites: [],
        stats: { nonAffectes: 0, enCours: 0, traites: 0, enRetard: 0, critiques: 0 }
      };
    }
  }

  async getGestionnaireCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'GESTIONNAIRE') return { items: [] };

    const items = await this.prisma.bordereau.findMany({
      where: { 
        assignedToUserId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      },
      include: { client: true, contract: true },
      orderBy: { dateReception: 'desc' }
    });

    return { items };
  }

  async getFinanceCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'FINANCE') return { items: [] };

    const items = await this.prisma.virement.findMany({
      where: { confirmed: false },
      include: { 
        bordereau: { 
          include: { client: true, contract: true } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    return { items };
  }

  async getUserCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { items: [], count: 0, type: 'UNKNOWN' };

    switch (user.role) {
      case 'BUREAU_ORDRE':
        return this.getBOCorbeille(userId);
      case 'SCAN':
        return this.getScanCorbeille(userId);
      case 'CHEF_EQUIPE':
        return this.getChefEquipeCorbeille(userId);
      case 'GESTIONNAIRE':
        return this.getGestionnaireCorbeille(userId);
      case 'FINANCE':
        return this.getFinanceCorbeille(userId);
      default:
        return { items: [] };
    }
  }

  async getCorbeilleStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { totalItems: 0, urgentItems: 0, role: 'UNKNOWN', type: 'UNKNOWN', lastUpdated: new Date().toISOString() };
    
    const corbeille = await this.getUserCorbeille(userId);
    
    let totalItems = 0;
    let urgentItems = 0;
    
    // Calculate totals based on corbeille structure
    if ('items' in corbeille && Array.isArray(corbeille.items)) {
      totalItems = corbeille.items.length;
    } else if ('stats' in corbeille && corbeille.stats) {
      // For BO, SCAN, CHEF roles that return stats objects
      const stats = corbeille.stats as any;
      if (user.role === 'BUREAU_ORDRE') {
        totalItems = stats.pending || 0;
      } else if (user.role === 'SCAN') {
        totalItems = (stats.toScan || 0) + (stats.scanning || 0) + (stats.completed || 0);
      } else if (user.role === 'CHEF_EQUIPE') {
        totalItems = (stats.nonAffectes || 0) + (stats.enCours || 0);
        urgentItems = (stats.critiques || 0) + (stats.enRetard || 0);
      }
    }
    
    return {
      totalItems,
      urgentItems,
      role: user.role,
      type: `${user.role}_CORBEILLE`,
      lastUpdated: new Date().toISOString()
    };
  }
}