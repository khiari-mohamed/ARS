import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { 
  ChefEquipeActionsService, 
  AssignToGestionnaireDto, 
  RejectBordereauDto, 
  HandlePersonallyDto,
  RecuperBordereauDto
} from './chef-equipe-actions.service';

@Controller('workflow/chef-equipe')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChefEquipeActionsController {
  constructor(private readonly chefEquipeActionsService: ChefEquipeActionsService) {}

  @Get('corbeille')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefCorbeille(@Request() req: any) {
    return this.chefEquipeActionsService.getChefCorbeille(req.user.id);
  }

  @Post('assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async assignToGestionnaire(
    @Body() dto: Omit<AssignToGestionnaireDto, 'chefId'>,
    @Request() req: any
  ) {
    const assignDto: AssignToGestionnaireDto = {
      ...dto,
      chefId: req.user.id
    };
    return this.chefEquipeActionsService.assignToGestionnaire(assignDto);
  }

  @Post('reject')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async rejectBordereau(
    @Body() dto: Omit<RejectBordereauDto, 'chefId'>,
    @Request() req: any
  ) {
    const rejectDto: RejectBordereauDto = {
      ...dto,
      chefId: req.user.id
    };
    return this.chefEquipeActionsService.rejectBordereau(rejectDto);
  }

  @Post('handle-personally')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async handlePersonally(
    @Body() dto: Omit<HandlePersonallyDto, 'chefId'>,
    @Request() req: any
  ) {
    const handleDto: HandlePersonallyDto = {
      ...dto,
      chefId: req.user.id
    };
    return this.chefEquipeActionsService.handlePersonally(handleDto);
  }

  @Put('reassign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async reassignBordereau(
    @Body() body: {
      bordereauId: string;
      fromGestionnaireId: string;
      toGestionnaireId: string;
      reason?: string;
    },
    @Request() req: any
  ) {
    return this.chefEquipeActionsService.reassignBordereau(
      body.bordereauId,
      body.fromGestionnaireId,
      body.toGestionnaireId,
      req.user.id,
      body.reason
    );
  }

  @Post('recuperer')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async recupererBordereau(
    @Body() dto: Omit<RecuperBordereauDto, 'chefId'>,
    @Request() req: any
  ) {
    const recuperDto: RecuperBordereauDto = {
      ...dto,
      chefId: req.user.id
    };
    return this.chefEquipeActionsService.recupererBordereau(recuperDto);
  }

  @Get('dashboard-stats')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getChefDashboardStats(@Request() req: any) {
    return this.chefEquipeActionsService.getChefDashboardStats(req.user.id);
  }
}