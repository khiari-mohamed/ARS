import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TraitementService } from '../traitement/traitement.service';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { ReclamationsService } from '../reclamations/reclamations.service';
import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationModule } from '../integrations/integration.module'; // <-- Import IntegrationModule
import { NotificationService } from '../reclamations/notification.service'; // adjust path as needed
import { ReclamationsModule } from '../reclamations/reclamations.module';
@Module({
  imports: [IntegrationModule , ReclamationsModule], 
  controllers: [DashboardController],
  providers: [
    DashboardService,
    TraitementService,
    BordereauxService,
    ReclamationsService,
    AlertsService,
    AnalyticsService,
    PrismaService,
    NotificationService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
