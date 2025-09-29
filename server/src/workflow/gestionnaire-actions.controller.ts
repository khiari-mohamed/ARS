import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  BadRequestException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { 
  GestionnaireActionsService, 
  ProcessBordereauDto, 
  UpdateBSStatusDto 
} from './gestionnaire-actions.service';

@Controller('workflow/gestionnaire')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GestionnaireActionsController {
  constructor(private readonly gestionnaireActionsService: GestionnaireActionsService) {}

  @Get('corbeille')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGestionnaireCorbeille(@Request() req: any) {
    return this.gestionnaireActionsService.getGestionnaireCorbeille(req.user.id);
  }

  @Post('process')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async processBordereau(
    @Body() dto: Omit<ProcessBordereauDto, 'gestionnaireId'>,
    @Request() req: any
  ) {
    const processDto: ProcessBordereauDto = {
      ...dto,
      gestionnaireId: req.user.id
    };
    return this.gestionnaireActionsService.processBordereau(processDto);
  }

  @Put('start-processing/:bordereauId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async startProcessing(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.gestionnaireActionsService.startProcessing(bordereauId, req.user.id);
  }

  @Get('bordereau/:bordereauId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBordereauDetails(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.gestionnaireActionsService.getBordereauDetails(bordereauId, req.user.id);
  }

  @Put('bs/status')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async updateBSStatus(
    @Body() dto: Omit<UpdateBSStatusDto, 'gestionnaireId'>,
    @Request() req: any
  ) {
    const updateDto: UpdateBSStatusDto = {
      ...dto,
      gestionnaireId: req.user.id
    };
    return this.gestionnaireActionsService.updateBSStatus(updateDto);
  }

  @Get('dashboard-stats')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGestionnaireDashboardStats(@Request() req: any) {
    return this.gestionnaireActionsService.getGestionnaireDashboardStats(req.user.id);
  }

  @Get('global-basket')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGlobalBasket(@Request() req: any) {
    return this.gestionnaireActionsService.getGestionnaireGlobalBasket(req.user.id);
  }

  @Get('search')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async searchDossiers(
    @Request() req: any,
    @Query('q') query: string,
    @Query('societe') societe?: string
  ) {
    const filters = societe ? { societe } : undefined;
    return this.gestionnaireActionsService.searchGestionnaireDossiers(req.user.id, query || '', filters);
  }

  @Post('bulk-update')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async bulkUpdate(
    @Body() dto: { bordereauIds: string[]; operation: string },
    @Request() req: any
  ) {
    if (!dto.bordereauIds || !Array.isArray(dto.bordereauIds) || dto.bordereauIds.length === 0) {
      throw new BadRequestException('bordereauIds is required and must be a non-empty array');
    }
    
    if (!dto.operation || typeof dto.operation !== 'string') {
      throw new BadRequestException('operation is required and must be a string');
    }
    
    const validOperations = ['MARK_PROCESSED', 'RETURN_TO_CHEF', 'ASSIGN_TO_ME', 'EXPORT_SELECTED'];
    if (!validOperations.includes(dto.operation)) {
      throw new BadRequestException(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
    }
    
    return this.gestionnaireActionsService.bulkUpdateBordereaux(dto.bordereauIds, dto.operation, req.user.id);
  }

  @Get('ai-priorities')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAIPriorities(@Request() req: any) {
    return this.gestionnaireActionsService.getGestionnaireAIPriorities(req.user.id);
  }

  @Get('bordereau/:bordereauId/details')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async viewBordereauDetails(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.gestionnaireActionsService.viewBordereauDetails(bordereauId, req.user.id);
  }

  @Put('bordereau/:bordereauId/edit')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async editBordereau(
    @Param('bordereauId') bordereauId: string,
    @Body() updateData: any,
    @Request() req: any
  ) {
    return this.gestionnaireActionsService.editBordereau(bordereauId, req.user.id, updateData);
  }

  @Post('bordereau/:bordereauId/upload')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async uploadDocuments(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    // For now, return success without actual file processing
    // File upload will be handled by frontend FormData
    return {
      success: true,
      message: 'Upload endpoint ready - files will be processed'
    };
  }

  @Post('modify-status')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async modifyStatus(
    @Body() body: { dossierId: string; newStatus: string },
    @Request() req: any
  ) {
    return this.gestionnaireActionsService.modifyDossierStatus(body.dossierId, body.newStatus, req.user.id);
  }
}