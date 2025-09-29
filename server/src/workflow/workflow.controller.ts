import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { AutoNotificationService } from './auto-notification.service';
import { WorkloadAssignmentService } from './workload-assignment.service';
import { BOWorkflowService } from './bo-workflow.service';
import { ScanWorkflowService } from './scan-workflow.service';

@Controller('workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(
    private autoNotificationService: AutoNotificationService,
    private workloadAssignmentService: WorkloadAssignmentService,
    private boWorkflowService: BOWorkflowService,
    private scanWorkflowService: ScanWorkflowService
  ) {}

  /**
   * Get workflow notifications for current user/service
   */
  @Get('notifications')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN, UserRole.BO, UserRole.SCAN_TEAM)
  async getWorkflowNotifications(
    @Query('toService') toService?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string
  ) {
    return this.autoNotificationService.getWorkflowNotifications({
      toService,
      userId,
      status,
      limit: limit ? parseInt(limit) : undefined
    });
  }

  /**
   * Mark workflow notification as read
   */
  @Post('notifications/:id/read')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN, UserRole.BO, UserRole.SCAN_TEAM)
  async markNotificationAsRead(@Param('id') notificationId: string) {
    await this.autoNotificationService.markWorkflowNotificationAsRead(notificationId);
    return { success: true };
  }

  /**
   * Get team workload overview (Chef d'Équipe only)
   */
  @Get('workload/overview')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getWorkloadOverview() {
    return this.workloadAssignmentService.getTeamWorkloadOverview();
  }

  /**
   * Get workload alerts
   */
  @Get('workload/alerts')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getWorkloadAlerts(): Promise<{
    overloadedUsers: any[];
    underutilizedUsers: any[];
    criticalAlerts: number;
  }> {
    return this.workloadAssignmentService.getWorkloadAlerts();
  }

  /**
   * Get reassignment suggestions
   */
  @Get('workload/suggestions')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getReassignmentSuggestions() {
    return this.workloadAssignmentService.suggestReassignments();
  }

  /**
   * Auto-assign a specific bordereau
   */
  @Post('assign/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async autoAssignBordereau(@Param('bordereauId') bordereauId: string) {
    return this.workloadAssignmentService.autoAssignBordereau(bordereauId);
  }

  /**
   * Update user capacity
   */
  @Post('users/:userId/capacity')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async updateUserCapacity(
    @Param('userId') userId: string,
    @Body('capacity') capacity: number
  ) {
    await this.workloadAssignmentService.updateUserCapacity(userId, capacity);
    return { success: true };
  }

  /**
   * Check and notify team overload (manual trigger)
   */
  @Post('check-overload')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async checkTeamOverload() {
    await this.autoNotificationService.checkAndNotifyTeamOverload();
    return { success: true, message: 'Overload check completed' };
  }

  /**
   * Trigger SLA breach notification (manual trigger for testing)
   */
  @Post('sla-breach/:bordereauId')
  @Roles(UserRole.SUPER_ADMIN)
  async triggerSLABreach(
    @Param('bordereauId') bordereauId: string,
    @Body('daysOverdue') daysOverdue: number,
    @Body('reference') reference: string
  ) {
    await this.autoNotificationService.notifySLABreach(bordereauId, reference, daysOverdue);
    return { success: true, message: 'SLA breach notification sent' };
  }

  /**
   * Get BO corbeille - documents waiting for processing
   */
  @Get('corbeille/bo')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getBOCorbeille(@Request() req: any) {
    return this.boWorkflowService.getBOCorbeille(req.user.id);
  }

  /**
   * Process bordereau from BO to SCAN
   */
  @Post('bo/process-for-scan/:bordereauId')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async processBordereauForScan(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.boWorkflowService.processBordereauForScan(bordereauId, req.user.id);
  }

  /**
   * Get SCAN corbeille - documents ready for scanning
   */
  @Get('corbeille/scan')
  @Roles(UserRole.SCAN_TEAM, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async getScanCorbeille(@Request() req: any) {
    return this.scanWorkflowService.getScanCorbeille(req.user.id);
  }

  /**
   * Start scanning a bordereau
   */
  @Post('scan/start/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async startScan(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.scanWorkflowService.startScan(bordereauId, req.user.id);
  }

  /**
   * Complete scanning a bordereau
   */
  @Post('scan/complete/:bordereauId')
  @Roles(UserRole.SCAN_TEAM, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.RESPONSABLE_DEPARTEMENT)
  async completeScan(
    @Param('bordereauId') bordereauId: string,
    @Request() req: any
  ) {
    return this.scanWorkflowService.completeScan(bordereauId, req.user.id);
  }
}