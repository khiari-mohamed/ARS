import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAdherentDto {
  matricule: string;
  nom: string;
  prenom: string;
  clientId: string;
  rib: string;
  statut?: string;
}

export interface UpdateAdherentDto {
  nom?: string;
  prenom?: string;
  rib?: string;
  statut?: string;
}

@Injectable()
export class AdherentService {
  private readonly logger = new Logger(AdherentService.name);

  constructor(private prisma: PrismaService) {}

  async createAdherent(dto: CreateAdherentDto, userId: string) {
    // Validate matricule uniqueness per client
    const existingMatricule = await this.prisma.adherent.findFirst({
      where: {
        matricule: dto.matricule,
        clientId: dto.clientId
      }
    });

    if (existingMatricule) {
      throw new BadRequestException(`Matricule ${dto.matricule} already exists for this client`);
    }

    // Check RIB uniqueness (with alert for duplicates)
    const existingRib = await this.prisma.adherent.findFirst({
      where: { rib: dto.rib }
    });

    if (existingRib) {
      this.logger.warn(`RIB ${dto.rib} already exists for adherent ${existingRib.matricule}`);
      // Continue but log the warning - business rule allows exceptions
    }

    return await this.prisma.adherent.create({
      data: {
        ...dto,
        createdById: userId
      },
      include: {
        client: true
      }
    });
  }

  async updateAdherent(id: string, dto: UpdateAdherentDto, userId: string) {
    // Check RIB uniqueness if updating RIB
    if (dto.rib) {
      const existingRib = await this.prisma.adherent.findFirst({
        where: { 
          rib: dto.rib,
          id: { not: id }
        }
      });

      if (existingRib) {
        this.logger.warn(`RIB ${dto.rib} already exists for another adherent`);
      }
    }

    return await this.prisma.adherent.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId
      },
      include: {
        client: true
      }
    });
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
    // Check if adherent has any virement items
    const hasVirements = await this.prisma.virementItem.findFirst({
      where: { adherentId: id }
    });

    if (hasVirements) {
      throw new BadRequestException('Cannot delete adherent with existing virement records');
    }

    return await this.prisma.adherent.delete({
      where: { id }
    });
  }

  async searchAdherents(query: string, clientId?: string) {
    const where: any = {
      OR: [
        { matricule: { contains: query, mode: 'insensitive' } },
        { nom: { contains: query, mode: 'insensitive' } },
        { prenom: { contains: query, mode: 'insensitive' } },
        { rib: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (clientId) {
      where.clientId = clientId;
    }

    return await this.prisma.adherent.findMany({
      where,
      include: {
        client: true
      },
      take: 50
    });
  }
}