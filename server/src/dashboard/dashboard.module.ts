import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TraitementService } from '../traitement/traitement.service';
import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationModule } from '../integrations/integration.module';
import { NotificationService } from '../reclamations/notification.service';
import { ReclamationsModule } from '../reclamations/reclamations.module';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
@Module({
  imports: [IntegrationModule, ReclamationsModule, BordereauxModule], 
  controllers: [DashboardController],
  providers: [
    DashboardService,
    TraitementService,
    AlertsService,
    AnalyticsService,
    PrismaService,
    NotificationService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
