import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDonneurOrdreDto {
  nom: string;
  rib: string;
  banque: string;
  structureTxt: string;
  statut?: string;
}

export interface UpdateDonneurOrdreDto {
  nom?: string;
  rib?: string;
  banque?: string;
  structureTxt?: string;
  statut?: string;
}

@Injectable()
export class DonneurOrdreService {
  constructor(private prisma: PrismaService) {}

  async createDonneurOrdre(dto: CreateDonneurOrdreDto) {
    // Validate RIB uniqueness
    const existingRib = await this.prisma.donneurOrdre.findFirst({
      where: { rib: dto.rib }
    });

    if (existingRib) {
      throw new BadRequestException(`RIB ${dto.rib} already exists for another donneur d'ordre`);
    }

    return await this.prisma.donneurOrdre.create({
      data: {
        ...dto,
        statut: dto.statut || 'ACTIF'
      }
    });
  }

  async updateDonneurOrdre(id: string, dto: UpdateDonneurOrdreDto) {
    // Check RIB uniqueness if updating
    if (dto.rib) {
      const existingRib = await this.prisma.donneurOrdre.findFirst({
        where: { 
          rib: dto.rib,
          id: { not: id }
        }
      });

      if (existingRib) {
        throw new BadRequestException(`RIB ${dto.rib} already exists for another donneur d'ordre`);
      }
    }

    return await this.prisma.donneurOrdre.update({
      where: { id },
      data: dto
    });
  }

  async findAllDonneurs(activeOnly = true) {
    return await this.prisma.donneurOrdre.findMany({
      where: activeOnly ? { statut: 'ACTIF' } : {},
      orderBy: { nom: 'asc' }
    });
  }

  async findDonneurById(id: string) {
    const donneur = await this.prisma.donneurOrdre.findUnique({
      where: { id },
      include: {
        ordresVirement: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!donneur) {
      throw new BadRequestException('Donneur d\'ordre not found');
    }

    return donneur;
  }

  async deleteDonneurOrdre(id: string) {
    // Check if donneur has any ordre virement
    const hasOrdres = await this.prisma.ordreVirement.findFirst({
      where: { donneurOrdreId: id }
    });

    if (hasOrdres) {
      throw new BadRequestException('Cannot delete donneur d\'ordre with existing ordre virement records');
    }

    return await this.prisma.donneurOrdre.delete({
      where: { id }
    });
  }

  async getStructureTxtFormats() {
    return [
      { id: 'STRUCTURE_1', name: 'Structure 1 - AMEN BANK (Format fixe 120 car)', description: 'Format AMEN avec enregistrements H/D/T de 120 caractères' },
      { id: 'STRUCTURE_2', name: 'Structure 2 - BANQUE POPULAIRE (Format délimité)', description: 'Format BP avec séparateurs pipe et longueur variable' },
      { id: 'STRUCTURE_3', name: 'Structure 3 - STB (Format CSV)', description: 'Format STB avec délimiteurs point-virgule et en-têtes' }
    ];
  }

  async toggleStatus(id: string) {
    const donneur = await this.findDonneurById(id);
    const newStatus = donneur.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';

    return await this.prisma.donneurOrdre.update({
      where: { id },
      data: { statut: newStatus }
    });
  }
}