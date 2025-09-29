import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { SlaConfigurationService, CreateSlaConfigDto } from './sla-configuration.service';

function getUserFromRequest(req: any) {
  return req.user || { id: 'demo-user', role: 'SUPER_ADMIN', fullName: 'Demo User' };
}

@Controller('finance/sla')
@Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT, UserRole.CHEF_EQUIPE, UserRole.FINANCE)
export class SlaController {
  constructor(private slaConfigService: SlaConfigurationService) {}

  // === GESTION DES CONFIGURATIONS SLA ===

  @Post('configurations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async createSlaConfig(@Body() dto: CreateSlaConfigDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.createSlaConfig(dto);
  }

  @Put('configurations/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async updateSlaConfig(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSlaConfigDto>
  ) {
    return this.slaConfigService.updateSlaConfig(id, dto);
  }

  @Get('configurations')
  async getSlaConfigs(
    @Req() req: any,
    @Query('clientId') clientId?: string,
    @Query('moduleType') moduleType?: string
  ) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.getSlaConfigs(clientId, moduleType);
  }

  @Delete('configurations/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteSlaConfig(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.deleteSlaConfig(id);
  }

  // === VÉRIFICATION SLA ===

  @Get('check/bordereau/:id')
  async checkBordereauSla(@Param('id') bordereauId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.checkBordereauSla(bordereauId);
  }

  @Get('check/virement/:id')
  async checkVirementSla(@Param('id') ordreVirementId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.checkVirementSla(ordreVirementId);
  }

  // === ALERTES SLA ===

  @Get('alerts')
  async getSlaAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.slaConfigService.generateSlaAlerts();
  }

  // === INITIALISATION ===

  @Post('initialize')
  @Roles(UserRole.SUPER_ADMIN)
  async initializeDefaultConfigs(@Req() req: any) {
    const user = getUserFromRequest(req);
    await this.slaConfigService.initializeDefaultConfigs();
    return { message: 'Configurations SLA par défaut initialisées avec succès' };
  }

  // === TEMPLATES DE CONFIGURATION ===

  @Get('templates')
  async getSlaTemplates(@Req() req: any) {
    const user = getUserFromRequest(req);
    
    return {
      global: {
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
      },
      bordereau: {
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
      },
      virement: {
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
      },
      reclamation: {
        moduleType: 'RECLAMATION',
        seuils: {
          delaiTraitement: 24,
          delaiVirement: 48,
          delaiReclamation: 8,
          seuilAlerte: 60,
          seuilCritique: 80
        },
        alertes: {
          emailEnabled: true,
          smsEnabled: true,
          notificationEnabled: true,
          escalationEnabled: true,
          escalationDelai: 1
        }
      }
    };
  }
}