import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { TeamManagementService, TeamStructureData } from './team-management.service';

@Controller('team-management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamManagementController {
  constructor(private readonly teamService: TeamManagementService) {}

  @Post('structure')
  @Roles(UserRole.SUPER_ADMIN)
  async createTeamStructure(@Body() data: TeamStructureData) {
    return this.teamService.createTeamStructure(data);
  }

  @Get('hierarchy')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getTeamHierarchy() {
    return this.teamService.getTeamHierarchy();
  }

  @Get('services')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getServiceTeams() {
    return this.teamService.getServiceTeams();
  }

  @Get('services/:serviceType/members')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getServiceMembers(@Param('serviceType') serviceType: string) {
    return this.teamService.getServiceMembers(serviceType);
  }

  @Get('sante/structure')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getSanteTeamStructure() {
    return this.teamService.getSanteTeamStructure();
  }

  @Get(':teamId/performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getTeamPerformanceMetrics(@Param('teamId') teamId: string) {
    return this.teamService.getTeamPerformanceMetrics(teamId);
  }

  @Get(':teamId/performance/evolution')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async getPerformanceEvolution(
    @Param('teamId') teamId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ) {
    return this.teamService.getPerformanceEvolution(teamId, period);
  }

  @Get('overload/detection')
  @Roles(UserRole.SUPER_ADMIN)
  async detectTeamOverload() {
    return this.teamService.detectTeamOverload();
  }

  @Post('services/:serviceType/rebalance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
  async handleTeamOverload(@Param('serviceType') serviceType: string) {
    return this.teamService.handleTeamOverload(serviceType);
  }
}