import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BordereauxService } from './bordereaux.service';
import { BordereauxController } from './bordereaux.controller';
import { AssignmentEngineService } from './assignment-engine.service';
import { AssignmentEngineController } from './assignment-engine.controller';
import { TeamAnalyticsService } from './team-analytics.service';
import { TeamAnalyticsController } from './team-analytics.controller';
import { ChefEquipeTableauBordController } from './chef-equipe-tableau-bord.controller';
import { ChefEquipeDashboardController, GestionnaireSeniorDashboardController } from './chef-equipe-dashboard.controller';
import { BordereauStatusAutomationService } from './bordereau-status-automation.service';
import { ScanSLAService } from './scan-sla.service';
import { ScanSLAController } from './scan-sla.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditLogModule } from './audit-log.module'; 
import { SeedController } from '../seed.controller';
import { WorkflowModule } from '../workflow/workflow.module';
@Module({
  imports: [
    PrismaModule, 
    AlertsModule, 
    AuditLogModule, 
    forwardRef(() => WorkflowModule),
    ScheduleModule.forRoot() // Enable cron jobs
  ],
  controllers: [
    BordereauxController, 
    SeedController, 
    AssignmentEngineController, 
    TeamAnalyticsController, 
    ChefEquipeTableauBordController, 
    ChefEquipeDashboardController, 
    GestionnaireSeniorDashboardController,
    ScanSLAController // NEW: SCAN SLA controller
  ],
  providers: [
    BordereauxService, 
    AssignmentEngineService, 
    TeamAnalyticsService, 
    BordereauStatusAutomationService, 
    ScanSLAService // NEW: SCAN SLA service
  ],
  exports: [
    BordereauxService, 
    AssignmentEngineService, 
    TeamAnalyticsService, 
    BordereauStatusAutomationService, 
    ScanSLAService
  ],
})
export class BordereauxModule {}