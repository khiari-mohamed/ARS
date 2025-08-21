import { Controller, Get, Post, Body, Query, Param, Put, Delete, UseInterceptors, UploadedFile, Req 
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CorbeilleService } from './corbeille.service';
import { Request } from 'express';
import { AssignTaskDto } from './dto/assign-task.dto';
import { WorkflowKpiDto } from './dto/workflow-kpi.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Workflow')
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly corbeilleService: CorbeilleService
  ) {}


  @Post('auto-assign')
  @ApiOperation({ summary: 'Trigger AI-based auto-assignment of tasks (admin/team lead only)' })
  async autoAssignTasks() {
    await this.workflowService.autoAssignTasks();
    return { success: true, message: 'AI-based assignment triggered.' };
  }

  @Put('priority')
  @ApiOperation({ summary: 'Manually override the priority of a workflow task (admin only)' })
  async setTaskPriority(@Body() dto: import('./dto/workflow-priority.dto').WorkflowPriorityDto) {
    return this.workflowService.setTaskPriority(dto);
  }

  @Get('assignments/history/:id')
  @ApiOperation({ summary: 'Get audit history for a workflow assignment' })
  async getAssignmentHistory(@Param('id') id: string) {
    return this.workflowService.getAssignmentHistory(id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a task to a user' })
  async assignTask(@Body() dto: AssignTaskDto) {
    return this.workflowService.assignTask(dto);
  }

  @Get('priorities')
  @ApiOperation({ summary: 'Get prioritized tasks for a team' })
  async getPriorities(@Query('teamId') teamId?: string) {
    return this.workflowService.getDailyPriorities(teamId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get workflow KPIs' })
  async getKpis(@Query() query: WorkflowKpiDto) {
    return this.workflowService.getWorkflowKpis(query);
  }

  @Get('visualize/:id')
  @ApiOperation({ summary: 'Visualize workflow for a bordereau' })
  async visualizeWorkflow(@Param('id') bordereauId: string) {
    return this.workflowService.visualizeWorkflow(bordereauId);
  }

  // --- NEW ENDPOINTS FOR ASSIGNMENTS ---

  @Get('assignments')
  @ApiOperation({ summary: 'List all workflow assignments' })
  async getAssignments() {
    return this.workflowService.getAllAssignments();
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get a workflow assignment by ID' })
  async getAssignment(@Param('id') id: string) {
    return this.workflowService.getAssignmentById(id);
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Create a workflow assignment (manual override)' })
  async createAssignment(@Body() dto: AssignTaskDto) {
    return this.workflowService.assignTask(dto);
  }

  @Put('assignments/:id')
  @ApiOperation({ summary: 'Update a workflow assignment (status, notes, etc.)' })
  async updateAssignment(@Param('id') id: string, @Body() data: any, @Query('updatedByUserId') updatedByUserId?: string) {
    return this.workflowService.updateAssignment(id, data, updatedByUserId);
  }

  // --- CORBEILLE ENDPOINTS ---

  @Get('corbeille')
  @ApiOperation({ summary: 'Get user-specific corbeille (inbox)' })
  async getCorbeille(@Req() req: Request) {
    const userId = req?.['user']?.id || req?.['user']?.sub;
    if (!userId) return { items: [], count: 0, type: 'UNAUTHORIZED' };
    return this.corbeilleService.getUserCorbeille(userId);
  }

  @Get('corbeille/stats')
  @ApiOperation({ summary: 'Get corbeille statistics' })
  async getCorbeilleStats(@Req() req: Request) {
    const userId = req?.['user']?.id || req?.['user']?.sub;
    if (!userId) return { totalItems: 0, urgentItems: 0, role: 'UNKNOWN' };
    return this.corbeilleService.getCorbeilleStats(userId);
  }
}

