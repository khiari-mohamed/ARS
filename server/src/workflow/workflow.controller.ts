import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { AutomaticWorkflowService } from './automatic-workflow.service';
import { SuperAdminOverviewService } from './super-admin-overview.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly automaticWorkflowService: AutomaticWorkflowService,
    private readonly superAdminOverviewService: SuperAdminOverviewService
  ) {}

  @Get('priorities')
  @Get('priorities/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getDailyPriorities(
    @Param('teamId') teamId?: string
  ) {
    return this.workflowService.getDailyPriorities(teamId);
  }

  @Post('assign-task')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async assignTask(
    @Body() assignTaskDto: {
      taskId: string;
      taskType: string;
      assigneeId: string;
    }
  ) {
    return this.workflowService.assignTask(assignTaskDto);
  }

  @Post('auto-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async autoAssignTasks() {
    await this.workflowService.autoAssignTasks();
    return { success: true, message: 'Auto-assignment completed' };
  }

  @Get('sla-compliance')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async monitorSlaCompliance(@Req() req: Request) {
    const user = req['user'] as any;
    await this.workflowService.monitorSlaCompliance();
    return { success: true, message: 'SLA monitoring completed' };
  }

  @Get('kpis')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getWorkflowKpis(
    @Query() query: {
      teamId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    return this.workflowService.getWorkflowKpis({
      teamId: query.teamId || '',
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined
    });
  }

  @Get('visualization/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async visualizeWorkflow(@Param('bordereauId') bordereauId: string) {
    return this.workflowService.visualizeWorkflow(bordereauId);
  }

  // Automatic Workflow endpoints
  @Post('force-progression')
  @Roles(UserRole.SUPER_ADMIN)
  async forceWorkflowProgression(
    @Body() data: {
      bordereauId: string;
      targetStatus: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;

    if (!data.bordereauId || !data.targetStatus) {
      throw new BadRequestException('Missing required fields');
    }

    return this.automaticWorkflowService.forceWorkflowProgression(
      data.bordereauId,
      data.targetStatus,
      userId
    );
  }

  @Get('sla-breaches')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getSLABreaches() {
    return this.automaticWorkflowService.getSLABreaches();
  }

  @Post('escalate-sla-breaches')
  @Roles(UserRole.SUPER_ADMIN)
  async escalateSLABreaches() {
    return this.automaticWorkflowService.escalateSLABreaches();
  }

  // Super Admin Overview endpoints
  @Get('system-overview')
  @Roles(UserRole.SUPER_ADMIN)
  async getSystemOverview() {
    return this.superAdminOverviewService.getCompleteSystemOverview();
  }

  @Get('team-performance')
  @Get('team-performance/:teamId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getTeamPerformance(@Param('teamId') teamId?: string) {
    return this.superAdminOverviewService.getTeamPerformanceDetails(teamId);
  }

  // Assignment management
  @Get('assignments')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getAllAssignments() {
    return this.workflowService.getAllAssignments();
  }

  @Get('assignments/:id')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async getAssignmentById(@Param('id') id: string) {
    return this.workflowService.getAssignmentById(id);
  }

  @Post('assignments/:id')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async updateAssignment(
    @Param('id') id: string,
    @Body() data: {
      status?: string;
      notes?: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;

    return this.workflowService.updateAssignment(id, data, userId);
  }

  @Get('assignments/:id/history')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)
  async getAssignmentHistory(@Param('id') id: string) {
    return this.workflowService.getAssignmentHistory(id);
  }

  @Post('set-priority')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async setTaskPriority(
    @Body() data: {
      taskId: string;
      priority: number;
    }
  ) {
    if (!data.taskId || data.priority === undefined) {
      throw new BadRequestException('Missing required fields');
    }

    return this.workflowService.setTaskPriority(data);
  }
}