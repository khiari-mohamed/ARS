import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorbeilleService {
  constructor(private prisma: PrismaService) {}

  async getBOCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'BUREAU_ORDRE') return { items: [] };

    const items = await this.prisma.bordereau.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: { client: true, contract: true },
      orderBy: { dateReception: 'desc' }
    });

    return { items, count: items.length, type: 'BO_CORBEILLE' };
  }

  async getScanCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'SCAN') return { items: [] };

    const items = await this.prisma.bordereau.findMany({
      where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS'] } },
      include: { client: true, contract: true },
      orderBy: { dateReception: 'desc' }
    });

    return { items, count: items.length, type: 'SCAN_CORBEILLE' };
  }

  async getChefEquipeCorbeille(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'CHEF_EQUIPE') return { items: [] };

    const items = await this.prisma.bordereau.findMany({
      where: { 
        statut: { in: ['SCANNE', 'A_AFFECTER'] },
        OR: [
          { teamId: userId },
          { teamId: null }
        ]
      },
      include: { client: true, contract: true, currentHandler: true },
      orderBy: { dateReception: 'desc' }
    });

    return { items, count: items.length, type: 'CHEF_EQUIPE_CORBEILLE' };
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

    return { items, count: items.length, type: 'GESTIONNAIRE_CORBEILLE' };
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

    return { items, count: items.length, type: 'FINANCE_CORBEILLE' };
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
        return { items: [], count: 0, type: 'DEFAULT' };
    }
  }

  async getCorbeilleStats(userId: string) {
    const corbeille = await this.getUserCorbeille(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    return {
      totalItems: corbeille.count,
      urgentItems: 0, // Calculate based on SLA
      role: user?.role,
      type: corbeille.type,
      lastUpdated: new Date().toISOString()
    };
  }
}