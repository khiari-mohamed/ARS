import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ContractAssignmentService } from './contract-assignment.service';

interface AssignContractDto {
  contractId: string;
  teamLeaderId: string;
}

@Controller('contract-assignment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractAssignmentController {
  constructor(private readonly contractAssignmentService: ContractAssignmentService) {}

  @Get('unassigned-contracts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getUnassignedContracts() {
    return this.contractAssignmentService.getUnassignedContracts();
  }

  @Get('available-team-leaders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getAvailableTeamLeaders() {
    return this.contractAssignmentService.getAvailableTeamLeaders();
  }

  @Get('team-leader/:teamLeaderId/contracts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async getTeamLeaderContracts(@Param('teamLeaderId') teamLeaderId: string) {
    return this.contractAssignmentService.getTeamLeaderContracts(teamLeaderId);
  }

  @Post('assign-contract')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async assignContractToTeamLeader(@Body() dto: AssignContractDto, @Req() req: any) {
    const assignedBy = req.user?.id || 'system';
    return this.contractAssignmentService.assignContractToTeamLeader(
      dto.contractId,
      dto.teamLeaderId,
      assignedBy
    );
  }

  @Post('auto-assign-bordereau/:bordereauId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.SCAN_TEAM)
  async autoAssignBordereauByContract(@Param('bordereauId') bordereauId: string) {
    return this.contractAssignmentService.autoAssignBordereauByContract(bordereauId);
  }
}