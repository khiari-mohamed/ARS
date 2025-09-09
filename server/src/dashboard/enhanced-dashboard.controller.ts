import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { EnhancedDashboardService } from './enhanced-dashboard.service';

@Controller('enhanced-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnhancedDashboardController {
  constructor(private readonly dashboardService: EnhancedDashboardService) {}

  @Get('corbeille/bo')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBOCorbeille(@Request() req: any) {
    return this.dashboardService.getBOCorbeille(req.user.id);
  }

  @Get('corbeille/scan')
  @Roles(UserRole.SCAN_TEAM, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getScanCorbeille(@Request() req: any) {
    return this.dashboardService.getScanCorbeille(req.user.id);
  }

  @Get('corbeille/chef')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefCorbeille(@Request() req: any) {
    return this.dashboardService.getChefCorbeille(req.user.id);
  }

  @Get('corbeille/gestionnaire')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGestionnaireCorbeille(@Request() req: any) {
    return this.dashboardService.getGestionnaireCorbeille(req.user.id);
  }

  @Get('role/bo')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBODashboard(@Request() req: any) {
    return this.dashboardService.getBODashboard(req.user.id);
  }

  @Get('role/scan')
  @Roles(UserRole.SCAN_TEAM, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getScanDashboard(@Request() req: any) {
    return this.dashboardService.getScanDashboard(req.user.id);
  }

  @Get('role/chef')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefDashboard(@Request() req: any) {
    return this.dashboardService.getChefDashboard(req.user.id);
  }

  @Get('role/gestionnaire')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGestionnaireDashboard(@Request() req: any) {
    return this.dashboardService.getGestionnaireDashboard(req.user.id);
  }

  @Get('role/super-admin')
  @Roles(UserRole.SUPER_ADMIN)
  async getSuperAdminDashboard(@Request() req: any) {
    return this.dashboardService.getSuperAdminDashboard(req.user.id);
  }
}