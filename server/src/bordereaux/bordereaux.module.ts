import { Module, forwardRef } from '@nestjs/common';
import { BordereauxService } from './bordereaux.service';
import { BordereauxController } from './bordereaux.controller';
import { AssignmentEngineService } from './assignment-engine.service';
import { AssignmentEngineController } from './assignment-engine.controller';
import { TeamAnalyticsService } from './team-analytics.service';
import { TeamAnalyticsController } from './team-analytics.controller';
import { ChefEquipeTableauBordController } from './chef-equipe-tableau-bord.controller';
import { ChefEquipeDashboardController } from './chef-equipe-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditLogModule } from './audit-log.module'; 
import { SeedController } from '../seed.controller';
import { WorkflowModule } from '../workflow/workflow.module';
@Module({
  imports: [PrismaModule, AlertsModule, AuditLogModule, forwardRef(() => WorkflowModule)],
  controllers: [BordereauxController, SeedController, AssignmentEngineController, TeamAnalyticsController, ChefEquipeTableauBordController, ChefEquipeDashboardController],
  providers: [BordereauxService, AssignmentEngineService, TeamAnalyticsService],
  exports: [BordereauxService, AssignmentEngineService, TeamAnalyticsService],
})
export class BordereauxModule {}