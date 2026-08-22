import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EnhancedDashboardService } from './enhanced-dashboard.service';
import { EnhancedDashboardController } from './enhanced-dashboard.controller';
import { DashboardAiController } from './dashboard-ai.controller';
import { DashboardAiService } from './dashboard-ai.service';
import { TraitementService } from '../traitement/traitement.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationModule } from '../integrations/integration.module';
import { NotificationService } from '../reclamations/notification.service';
import { ReclamationsModule } from '../reclamations/reclamations.module';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AlertsModule } from '../alerts/alerts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [IntegrationModule, ReclamationsModule, BordereauxModule, AnalyticsModule, AlertsModule, PrismaModule, SharedModule], 
  controllers: [DashboardController, EnhancedDashboardController, DashboardAiController],
  providers: [
    DashboardService,
    EnhancedDashboardService,
    DashboardAiService,
    TraitementService,
    PrismaService,
    NotificationService,
  ],
  exports: [DashboardService, EnhancedDashboardService, DashboardAiService],
})
export class DashboardModule {}