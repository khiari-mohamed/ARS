// D:\ARS\server\src\workflow\workflow-integration.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { WorkflowModule } from './workflow.module';
import { TeamWorkloadConfigService } from './team-workload-config.service';
import { TeamStructureService } from './team-structure.service';
import { ComprehensiveNotificationService } from './comprehensive-notification.service';

// Controllers
import { TeamManagementController } from './team-management.controller';
import { EnhancedCorbeilleController } from './enhanced-corbeille.controller';

// Additional services for complete integration
import { WorkflowOrchestrationService } from './workflow-orchestration.service';
import { WorkflowAnalyticsService } from './workflow-analytics.service';

@Module({
  imports: [
    // ✅ FIXED: was redeclaring TeamRoutingService, WorkflowNotificationsService,
    // and OverloadDetectionService as its own providers alongside workflow.module.ts,
    // which meant Nest instantiated OverloadDetectionService twice — two
    // independent @Cron(EVERY_HOUR) overload scans firing together, forever.
    // Now imports WorkflowModule and reuses its exported instances instead.
    forwardRef(() => WorkflowModule),
  ],
  providers: [
    // Enhanced services for 100% completion — unique to this module, kept as-is
    TeamWorkloadConfigService,
    TeamStructureService,
    ComprehensiveNotificationService,
    WorkflowOrchestrationService,
    WorkflowAnalyticsService,
  ],
  controllers: [
    TeamManagementController,
    EnhancedCorbeilleController,
  ],
  exports: [
    TeamWorkloadConfigService,
    TeamStructureService,
    ComprehensiveNotificationService,
    WorkflowOrchestrationService,
    WorkflowAnalyticsService,
  ],
})
export class WorkflowIntegrationModule {}