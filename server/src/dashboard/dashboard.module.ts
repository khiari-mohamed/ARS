import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TraitementService } from '../traitement/traitement.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationModule } from '../integrations/integration.module';
import { NotificationService } from '../reclamations/notification.service';
import { ReclamationsModule } from '../reclamations/reclamations.module';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AlertsModule } from '../alerts/alerts.module';
@Module({
  imports: [IntegrationModule, ReclamationsModule, BordereauxModule, AnalyticsModule, AlertsModule], 
  controllers: [DashboardController],
  providers: [
    DashboardService,
    TraitementService,
    PrismaService,
    NotificationService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
