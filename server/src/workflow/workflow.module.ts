import { Module, forwardRef } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { AutoNotificationService } from './auto-notification.service';
import { WorkloadAssignmentService } from './workload-assignment.service';
import { CorbeilleService } from './corbeille.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';
import { WorkflowNotificationService } from './workflow-notification.service';
import { TeamRoutingService } from './team-routing.service';
import { EnhancedCorbeilleService } from './enhanced-corbeille.service';
import { EnhancedCorbeilleController } from './enhanced-corbeille.controller';
import { WorkflowCorbeilleController } from './workflow-corbeille.controller';
import { AutomaticWorkflowService } from './automatic-workflow.service';
import { SuperAdminOverviewService } from './super-admin-overview.service';
import { BOWorkflowService } from './bo-workflow.service';
import { ScanWorkflowService } from './scan-workflow.service';
import { OverloadDetectionService } from './overload-detection.service';
import { TeamManagementService } from './team-management.service';
import { TeamManagementController } from './team-management.controller';
import { TeamWorkloadConfigService } from './team-workload-config.service';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';
import { ComprehensiveNotificationService } from './comprehensive-notification.service';
import { ChefEquipeActionsService } from './chef-equipe-actions.service';
import { ChefEquipeActionsController } from './chef-equipe-actions.controller';
import { GestionnaireActionsService } from './gestionnaire-actions.service';
import { GestionnaireActionsController } from './gestionnaire-actions.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GedModule } from '../ged/ged.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => BordereauxModule),
    AlertsModule,
    AnalyticsModule,
    GedModule
  ],
  controllers: [WorkflowController, EnhancedCorbeilleController, WorkflowCorbeilleController, TeamManagementController, ChefEquipeActionsController, GestionnaireActionsController],
  providers: [WorkflowService, CorbeilleService, WorkflowNotificationsService, WorkflowNotificationService, TeamRoutingService, EnhancedCorbeilleService, AutomaticWorkflowService, SuperAdminOverviewService, BOWorkflowService, ScanWorkflowService, OverloadDetectionService, TeamManagementService, TeamWorkloadConfigService, WorkflowOrchestrationService, ComprehensiveNotificationService, AutoNotificationService, WorkloadAssignmentService, ChefEquipeActionsService, GestionnaireActionsService, PrismaService],
  exports: [WorkflowService, CorbeilleService, WorkflowNotificationsService, WorkflowNotificationService, TeamRoutingService, EnhancedCorbeilleService, AutomaticWorkflowService, SuperAdminOverviewService, BOWorkflowService, ScanWorkflowService, OverloadDetectionService, TeamManagementService, AutoNotificationService, WorkloadAssignmentService, ChefEquipeActionsService, GestionnaireActionsService]
})
export class WorkflowModule {}