import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SlaThresholds {
  delaiTraitement: number;
  delaiVirement: number;
  delaiReclamation: number;
  seuilAlerte: number;
  seuilCritique: number;
}

export interface SlaAlerts {
  emailEnabled: boolean;
  smsEnabled: boolean;
  notificationEnabled: boolean;
  escalationEnabled: boolean;
  escalationDelai: number;
}

export interface CreateSlaConfigDto {
  clientId?: string;
  moduleType: 'BORDEREAU' | 'VIREMENT' | 'RECLAMATION' | 'GLOBAL';
  seuils: SlaThresholds;
  alertes: SlaAlerts;
  active?: boolean;
}

@Injectable()
export class SlaConfigurationService {
  constructor(private prisma: PrismaService) {}

  async createSlaConfig(dto: CreateSlaConfigDto) {
    const existing = await this.prisma.slaConfiguration.findFirst({
      where: {
        clientId: dto.clientId || null,
        moduleType: dto.moduleType
      }
    });

    if (existing) {
      throw new BadRequestException(`Configuration SLA existe déjà pour ${dto.clientId ? 'ce client' : 'le niveau global'} et module ${dto.moduleType}`);
    }

    return await this.prisma.slaConfiguration.create({
      data: {
        clientId: dto.clientId,
        moduleType: dto.moduleType,
        seuils: JSON.parse(JSON.stringify(dto.seuils)),
        alertes: JSON.parse(JSON.stringify(dto.alertes)),
        active: dto.active ?? true
      },
      include: {
        client: true
      }
    });
  }

  async updateSlaConfig(id: string, dto: Partial<CreateSlaConfigDto>) {
    return await this.prisma.slaConfiguration.update({
      where: { id },
      data: {
        seuils: dto.seuils ? JSON.parse(JSON.stringify(dto.seuils)) : undefined,
        alertes: dto.alertes ? JSON.parse(JSON.stringify(dto.alertes)) : undefined,
        active: dto.active
      },
      include: {
        client: true
      }
    });
  }

  async getSlaConfigs(clientId?: string, moduleType?: string) {
    const where: any = {};
    if (clientId !== undefined) where.clientId = clientId;
    if (moduleType) where.moduleType = moduleType;

    return await this.prisma.slaConfiguration.findMany({
      where,
      include: {
        client: true
      },
      orderBy: [
        { clientId: 'asc' },
        { moduleType: 'asc' }
      ]
    });
  }

  async getSlaConfigForBordereau(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau non trouvé');
    }

    const configs = await this.prisma.slaConfiguration.findMany({
      where: {
        OR: [
          { clientId: bordereau.clientId, moduleType: 'BORDEREAU' },
          { clientId: null, moduleType: 'BORDEREAU' },
          { clientId: bordereau.clientId, moduleType: 'GLOBAL' },
          { clientId: null, moduleType: 'GLOBAL' }
        ],
        active: true
      },
      orderBy: [
        { clientId: 'desc' },
        { moduleType: 'asc' }
      ]
    });

    return configs[0] || this.getDefaultSlaConfig();
  }

  async getSlaConfigForVirement(ordreVirementId: string) {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        bordereau: {
          include: { client: true }
        }
      }
    });

    if (!ordreVirement) {
      throw new BadRequestException('Ordre de virement non trouvé');
    }

    const clientId = ordreVirement.bordereau?.clientId;

    const configs = await this.prisma.slaConfiguration.findMany({
      where: {
        OR: [
          { clientId: clientId, moduleType: 'VIREMENT' },
          { clientId: null, moduleType: 'VIREMENT' },
          { clientId: clientId, moduleType: 'GLOBAL' },
          { clientId: null, moduleType: 'GLOBAL' }
        ],
        active: true
      },
      orderBy: [
        { clientId: 'desc' },
        { moduleType: 'asc' }
      ]
    });

    return configs[0] || this.getDefaultSlaConfig();
  }

  async checkBordereauSla(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau non trouvé');
    }

    const slaConfig = await this.getSlaConfigForBordereau(bordereauId);
    const seuils = slaConfig.seuils as unknown as SlaThresholds;

    const now = new Date();
    const dateReception = bordereau.dateReception;
    const heuresEcoulees = (now.getTime() - dateReception.getTime()) / (1000 * 60 * 60);

    const seuilAlerte = seuils.delaiTraitement * (seuils.seuilAlerte / 100);
    const seuilCritique = seuils.delaiTraitement * (seuils.seuilCritique / 100);

    let status: 'OK' | 'ALERTE' | 'CRITIQUE' | 'DEPASSEMENT' = 'OK';
    let pourcentage = (heuresEcoulees / seuils.delaiTraitement) * 100;

    if (heuresEcoulees > seuils.delaiTraitement) {
      status = 'DEPASSEMENT';
    } else if (heuresEcoulees > seuilCritique) {
      status = 'CRITIQUE';
    } else if (heuresEcoulees > seuilAlerte) {
      status = 'ALERTE';
    }

    return {
      bordereauId,
      status,
      pourcentage: Math.round(pourcentage),
      heuresEcoulees: Math.round(heuresEcoulees),
      delaiMax: seuils.delaiTraitement,
      heuresRestantes: Math.max(0, seuils.delaiTraitement - heuresEcoulees),
      slaConfig,
      needsAlert: status !== 'OK'
    };
  }

  async checkVirementSla(ordreVirementId: string) {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        bordereau: { include: { client: true } }
      }
    });

    if (!ordreVirement) {
      throw new BadRequestException('Ordre de virement non trouvé');
    }

    const slaConfig = await this.getSlaConfigForVirement(ordreVirementId);
    const seuils = slaConfig.seuils as unknown as SlaThresholds;

    const now = new Date();
    const dateCreation = ordreVirement.dateCreation;
    const heuresEcoulees = (now.getTime() - dateCreation.getTime()) / (1000 * 60 * 60);

    const seuilAlerte = seuils.delaiVirement * (seuils.seuilAlerte / 100);
    const seuilCritique = seuils.delaiVirement * (seuils.seuilCritique / 100);

    let status: 'OK' | 'ALERTE' | 'CRITIQUE' | 'DEPASSEMENT' = 'OK';
    let pourcentage = (heuresEcoulees / seuils.delaiVirement) * 100;

    if (heuresEcoulees > seuils.delaiVirement) {
      status = 'DEPASSEMENT';
    } else if (heuresEcoulees > seuilCritique) {
      status = 'CRITIQUE';
    } else if (heuresEcoulees > seuilAlerte) {
      status = 'ALERTE';
    }

    return {
      ordreVirementId,
      status,
      pourcentage: Math.round(pourcentage),
      heuresEcoulees: Math.round(heuresEcoulees),
      delaiMax: seuils.delaiVirement,
      heuresRestantes: Math.max(0, seuils.delaiVirement - heuresEcoulees),
      slaConfig,
      needsAlert: status !== 'OK'
    };
  }

  async generateSlaAlerts() {
    const alerts: any[] = [];

    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: {
          in: ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS']
        }
      },
      include: { client: true }
    });

    for (const bordereau of bordereaux) {
      try {
        const slaCheck = await this.checkBordereauSla(bordereau.id);
        if (slaCheck.needsAlert) {
          alerts.push({
            type: 'BORDEREAU_SLA',
            level: slaCheck.status,
            bordereauId: bordereau.id,
            reference: bordereau.reference,
            client: bordereau.client.name,
            pourcentage: slaCheck.pourcentage,
            heuresRestantes: slaCheck.heuresRestantes
          });
        }
      } catch (error) {
        console.error(`Erreur SLA bordereau ${bordereau.id}:`, error);
      }
    }

    const ordresVirement = await this.prisma.ordreVirement.findMany({
      where: {
        etatVirement: {
          in: ['NON_EXECUTE', 'EN_COURS_EXECUTION']
        }
      },
      include: {
        bordereau: { include: { client: true } }
      }
    });

    for (const ordreVirement of ordresVirement) {
      try {
        const slaCheck = await this.checkVirementSla(ordreVirement.id);
        if (slaCheck.needsAlert) {
          alerts.push({
            type: 'VIREMENT_SLA',
            level: slaCheck.status,
            ordreVirementId: ordreVirement.id,
            reference: ordreVirement.reference,
            client: ordreVirement.bordereau?.client?.name || 'N/A',
            pourcentage: slaCheck.pourcentage,
            heuresRestantes: slaCheck.heuresRestantes
          });
        }
      } catch (error) {
        console.error(`Erreur SLA virement ${ordreVirement.id}:`, error);
      }
    }

    return alerts;
  }

  async deleteSlaConfig(id: string) {
    return await this.prisma.slaConfiguration.delete({
      where: { id }
    });
  }

  private getDefaultSlaConfig() {
    return {
      id: 'default',
      clientId: null,
      moduleType: 'GLOBAL',
      seuils: {
        delaiTraitement: 72,
        delaiVirement: 48,
        delaiReclamation: 24,
        seuilAlerte: 70,
        seuilCritique: 90
      } as SlaThresholds,
      alertes: {
        emailEnabled: true,
        smsEnabled: false,
        notificationEnabled: true,
        escalationEnabled: true,
        escalationDelai: 4
      } as SlaAlerts,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: null
    };
  }

  async initializeDefaultConfigs() {
    const globalExists = await this.prisma.slaConfiguration.findFirst({
      where: { clientId: null, moduleType: 'GLOBAL' }
    });

    if (!globalExists) {
      await this.createSlaConfig({
        moduleType: 'GLOBAL',
        seuils: {
          delaiTraitement: 72,
          delaiVirement: 48,
          delaiReclamation: 24,
          seuilAlerte: 70,
          seuilCritique: 90
        },
        alertes: {
          emailEnabled: true,
          smsEnabled: false,
          notificationEnabled: true,
          escalationEnabled: true,
          escalationDelai: 4
        }
      });
    }

    const bordereauExists = await this.prisma.slaConfiguration.findFirst({
      where: { clientId: null, moduleType: 'BORDEREAU' }
    });

    if (!bordereauExists) {
      await this.createSlaConfig({
        moduleType: 'BORDEREAU',
        seuils: {
          delaiTraitement: 72,
          delaiVirement: 48,
          delaiReclamation: 24,
          seuilAlerte: 70,
          seuilCritique: 90
        },
        alertes: {
          emailEnabled: true,
          smsEnabled: false,
          notificationEnabled: true,
          escalationEnabled: true,
          escalationDelai: 4
        }
      });
    }

    const virementExists = await this.prisma.slaConfiguration.findFirst({
      where: { clientId: null, moduleType: 'VIREMENT' }
    });

    if (!virementExists) {
      await this.createSlaConfig({
        moduleType: 'VIREMENT',
        seuils: {
          delaiTraitement: 24,
          delaiVirement: 24,
          delaiReclamation: 12,
          seuilAlerte: 70,
          seuilCritique: 90
        },
        alertes: {
          emailEnabled: true,
          smsEnabled: true,
          notificationEnabled: true,
          escalationEnabled: true,
          escalationDelai: 2
        }
      });
    }
  }
}