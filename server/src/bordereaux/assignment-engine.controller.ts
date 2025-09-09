import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req
} from '@nestjs/common';
import { AssignmentEngineService } from './assignment-engine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/assignment-engine')
export class AssignmentEngineController {
  constructor(private readonly assignmentEngine: AssignmentEngineService) {}

  @Get('team-workloads/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getTeamWorkloads(@Param('teamId') teamId: string) {
    return this.assignmentEngine.getTeamWorkloads(teamId);
  }

  @Get('best-assignee/:bordereauId/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async findBestAssignee(
    @Param('bordereauId') bordereauId: string,
    @Param('teamId') teamId: string
  ) {
    return this.assignmentEngine.findBestAssignee(bordereauId, teamId);
  }

  @Post('rebalance/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async rebalanceTeamWorkload(@Param('teamId') teamId: string) {
    return this.assignmentEngine.rebalanceTeamWorkload(teamId);
  }

  @Get('user-skills/:userId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getUserSkills(@Param('userId') userId: string) {
    return this.assignmentEngine.getUserSkills(userId);
  }

  @Get('team-skill-matrix/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getTeamSkillMatrix(@Param('teamId') teamId: string) {
    const skillMatrix = await this.assignmentEngine.getTeamSkillMatrix(teamId);
    return Object.fromEntries(skillMatrix);
  }

  @Post('evaluate-rules/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async evaluateAssignmentRules(@Param('bordereauId') bordereauId: string) {
    return this.assignmentEngine.evaluateAssignmentRules(bordereauId);
  }
}