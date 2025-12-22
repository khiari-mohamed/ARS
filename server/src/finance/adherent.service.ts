import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAdherentDto {
  matricule: string;
  nom: string;
  prenom: string;
  clientId: string;
  rib: string;
  codeAssure?: string;
  numeroContrat?: string;
  assurance?: string;
  statut?: string;
}

export interface UpdateAdherentDto {
  nom?: string;
  prenom?: string;
  rib?: string;
  codeAssure?: string;
  numeroContrat?: string;
  assurance?: string;
  statut?: string;
}

@Injectable()
export class AdherentService {
  private readonly logger = new Logger(AdherentService.name);

  constructor(private prisma: PrismaService) {}

  async createAdherent(dto: CreateAdherentDto, userId: string) {
    // Validate RIB format (20 digits)
    if (dto.rib && !/^\d{20}$/.test(dto.rib)) {
      throw new BadRequestException('RIB must be exactly 20 digits');
    }

    // Find client by name or ID
    let client = await this.prisma.client.findFirst({
      where: {
        OR: [
          { id: dto.clientId },
          { name: dto.clientId }
        ]
      }
    });

    if (!client) {
      throw new BadRequestException(`Client ${dto.clientId} not found`);
    }

    // Check for existing matricule
    const existingAdherent = await this.prisma.adherent.findFirst({
      where: {
        matricule: dto.matricule,
        clientId: client.id
      }
    });

    if (existingAdherent) {
      throw new BadRequestException(`Matricule ${dto.matricule} already exists for this client`);
    }

    // Check for duplicate RIB (warning only, not blocking)
    const duplicateRib = await this.prisma.adherent.findFirst({
      where: { rib: dto.rib }
    });

    // Create adherent in proper table
    const newAdherent = await this.prisma.adherent.create({
      data: {
        matricule: dto.matricule,
        nom: dto.nom,
        prenom: dto.prenom,
        clientId: client.id,
        rib: dto.rib,
        codeAssure: dto.codeAssure,
        numeroContrat: dto.numeroContrat,
        assurance: dto.assurance,
        statut: dto.statut || 'ACTIF'
      },
      include: {
        client: true
      }
    });

    return {
      id: newAdherent.id,
      matricule: newAdherent.matricule,
      nom: newAdherent.nom,
      prenom: newAdherent.prenom,
      rib: newAdherent.rib,
      codeAssure: newAdherent.codeAssure,
      numeroContrat: newAdherent.numeroContrat,
      assurance: newAdherent.assurance,
      statut: newAdherent.statut,
      duplicateRib: !!duplicateRib,
      client: {
        id: newAdherent.client.id,
        name: newAdherent.client.name
      }
    };
  }

  async updateAdherent(id: string, dto: UpdateAdherentDto, userId: string) {
    if (dto.rib && !/^\d{20}$/.test(dto.rib)) {
      throw new BadRequestException('RIB must be exactly 20 digits');
    }

    const current = await this.prisma.adherent.findUnique({ where: { id } });
    if (!current) throw new BadRequestException('Adherent not found');

    // Track RIB change
    if (dto.rib && dto.rib !== current.rib) {
      await this.prisma.adherentRibHistory.create({
        data: {
          adherentId: id,
          oldRib: current.rib,
          newRib: dto.rib,
          updatedById: userId
        }
      });

      // Create notification
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'FINANCE', 'CHEF_EQUIPE'] } }
      });
      
      await this.prisma.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          type: 'RIB_UPDATE',
          title: 'RIB modifié',
          message: `RIB de ${current.nom} ${current.prenom} (${current.matricule}) modifié`,
          data: { adherentId: id, oldRib: current.rib, newRib: dto.rib }
        }))
      });
    }

    let duplicateRib = false;
    if (dto.rib) {
      const existing = await this.prisma.adherent.findFirst({
        where: { rib: dto.rib, NOT: { id } }
      });
      duplicateRib = !!existing;
    }

    const updated = await this.prisma.adherent.update({
      where: { id },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        rib: dto.rib,
        codeAssure: dto.codeAssure,
        numeroContrat: dto.numeroContrat,
        assurance: dto.assurance,
        statut: dto.statut,
        updatedById: userId
      },
      include: { client: true }
    });

    return {
      id: updated.id,
      matricule: updated.matricule,
      nom: updated.nom,
      prenom: updated.prenom,
      rib: updated.rib,
      codeAssure: updated.codeAssure,
      numeroContrat: updated.numeroContrat,
      assurance: updated.assurance,
      statut: updated.statut,
      duplicateRib,
      client: { id: updated.client.id, name: updated.client.name }
    };
  }

  async getAdherentRibHistory(adherentId: string) {
    const history = await this.prisma.adherentRibHistory.findMany({
      where: { adherentId },
      orderBy: { updatedAt: 'desc' }
    });

    const userIds = [...new Set(history.map(h => h.updatedById))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, role: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return history.map(h => ({
      ...h,
      updatedBy: userMap.get(h.updatedById)
    }));
  }

  async findAdherentsByClient(clientId: string) {
    return await this.prisma.adherent.findMany({
      where: { clientId },
      include: {
        client: true
      },
      orderBy: { matricule: 'asc' }
    });
  }

  async findAdherentByMatricule(matricule: string, clientId: string) {
    return await this.prisma.adherent.findFirst({
      where: {
        matricule,
        clientId
      },
      include: {
        client: true
      }
    });
  }

  async validateMatricules(matricules: string[], clientId: string) {
    const adherents = await this.prisma.adherent.findMany({
      where: {
        matricule: { in: matricules },
        clientId
      },
      include: {
        client: true
      }
    });

    const found = adherents.map(a => a.matricule);
    const missing = matricules.filter(m => !found.includes(m));

    return {
      valid: adherents,
      missing,
      duplicateRibs: await this.checkDuplicateRibs(adherents.map(a => a.rib))
    };
  }

  private async checkDuplicateRibs(ribs: string[]) {
    const ribCounts = await this.prisma.adherent.groupBy({
      by: ['rib'],
      where: { rib: { in: ribs } },
      _count: { rib: true }
    });

    return ribCounts
      .filter(r => r._count.rib > 1)
      .map(r => r.rib);
  }

  async importAdherents(adherents: CreateAdherentDto[], userId: string) {
    const results: Array<{ success: boolean; adherent?: any; error?: string; matricule?: string }> = [];
    
    for (const adherent of adherents) {
      try {
        const created = await this.createAdherent(adherent, userId);
        results.push({ success: true, adherent: created });
      } catch (error: any) {
        results.push({ 
          success: false, 
          error: error.message,
          matricule: adherent.matricule 
        });
      }
    }

    return {
      total: adherents.length,
      success: results.filter(r => r.success).length,
      errors: results.filter(r => !r.success),
      results
    };
  }

  async deleteAdherent(id: string) {
    // Check if adherent is used in any virement items
    const virementItemsCount = await this.prisma.virementItem.count({
      where: { adherentId: id }
    });

    if (virementItemsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet adhérent car il est lié à ${virementItemsCount} virement(s). Veuillez d'abord supprimer ou modifier les virements associés.`
      );
    }

    // Delete RIB history first
    await this.prisma.adherentRibHistory.deleteMany({
      where: { adherentId: id }
    });

    // Delete from adherent table
    const deletedAdherent = await this.prisma.adherent.delete({
      where: { id },
      include: {
        client: true
      }
    });

    return {
      id: deletedAdherent.id,
      matricule: deletedAdherent.matricule,
      message: 'Adherent deleted successfully'
    };
  }

  async searchAdherents(query: string, clientId?: string) {
    try {
      const adherentWhere: any = query ? {
        OR: [
          { matricule: { contains: query, mode: 'insensitive' } },
          { nom: { contains: query, mode: 'insensitive' } },
          { prenom: { contains: query, mode: 'insensitive' } },
          { rib: { contains: query, mode: 'insensitive' } },
          { codeAssure: { contains: query, mode: 'insensitive' } },
          { numeroContrat: { contains: query, mode: 'insensitive' } }
        ]
      } : {};

      if (clientId) {
        adherentWhere.clientId = clientId;
      }

      const adherents = await this.prisma.adherent.findMany({
        where: adherentWhere,
        include: { client: true },
        orderBy: { matricule: 'asc' }
      });

      // Check for duplicate RIBs
      const ribCounts = new Map<string, number>();
      adherents.forEach(a => {
        ribCounts.set(a.rib, (ribCounts.get(a.rib) || 0) + 1);
      });

      return adherents.map(adherent => ({
        id: adherent.id,
        matricule: adherent.matricule,
        nom: adherent.nom,
        prenom: adherent.prenom,
        rib: adherent.rib,
        codeAssure: adherent.codeAssure,
        numeroContrat: adherent.numeroContrat,
        assurance: adherent.assurance,
        statut: adherent.statut,
        duplicateRib: ribCounts.get(adherent.rib)! > 1,
        client: {
          id: adherent.client.id,
          name: adherent.client.name
        }
      }));
    } catch (error) {
      console.error('Failed to search adherents:', error);
      return [];
    }
  }
}