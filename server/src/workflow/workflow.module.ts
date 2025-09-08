import { Module, forwardRef } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { CorbeilleService } from './corbeille.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';
import { TeamRoutingService } from './team-routing.service';
import { EnhancedCorbeilleService } from './enhanced-corbeille.service';
import { EnhancedCorbeilleController } from './enhanced-corbeille.controller';
import { AutomaticWorkflowService } from './automatic-workflow.service';
import { SuperAdminOverviewService } from './super-admin-overview.service';
import { BOWorkflowService } from './bo-workflow.service';
import { ScanWorkflowService } from './scan-workflow.service';
import { OverloadDetectionService } from './overload-detection.service';
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
  controllers: [WorkflowController, EnhancedCorbeilleController],
  providers: [WorkflowService, CorbeilleService, WorkflowNotificationsService, TeamRoutingService, EnhancedCorbeilleService, AutomaticWorkflowService, SuperAdminOverviewService, BOWorkflowService, ScanWorkflowService, OverloadDetectionService, PrismaService],
  exports: [WorkflowService, CorbeilleService, WorkflowNotificationsService, TeamRoutingService, EnhancedCorbeilleService, AutomaticWorkflowService, SuperAdminOverviewService, BOWorkflowService, ScanWorkflowService, OverloadDetectionService]
})
export class WorkflowModule {}