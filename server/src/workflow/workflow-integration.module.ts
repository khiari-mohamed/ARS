import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamRoutingService } from './team-routing.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';
import { OverloadDetectionService } from './overload-detection.service';
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
  imports: [PrismaModule],
  providers: [
    // Core workflow services
    TeamRoutingService,
    WorkflowNotificationsService,
    OverloadDetectionService,
    
    // Enhanced services for 100% completion
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
    TeamRoutingService,
    WorkflowNotificationsService,
    OverloadDetectionService,
    TeamWorkloadConfigService,
    TeamStructureService,
    ComprehensiveNotificationService,
    WorkflowOrchestrationService,
    WorkflowAnalyticsService,
  ],
})
export class WorkflowIntegrationModule {}