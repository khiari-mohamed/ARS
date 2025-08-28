import { Module } from '@nestjs/common';
import { ReclamationsService } from './reclamations.service';
import { ReclamationsController } from './reclamations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { IntegrationModule } from '../integrations/integration.module';
import { SLAEngineService } from './sla-engine.service';
import { CorbeilleService } from './corbeille.service';
import { BOIntegrationService } from './bo-integration.service';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AIClassificationService } from './ai-classification.service';
import { CustomerPortalService } from './customer-portal.service';

@Module({
  imports: [IntegrationModule],
  controllers: [ReclamationsController],
  providers: [
    ReclamationsService,
    PrismaService,
    NotificationService,
    SLAEngineService,
    CorbeilleService,
    BOIntegrationService,
    AdvancedAnalyticsService,
    AIClassificationService,
    CustomerPortalService
  ],
  exports: [
    ReclamationsService,
    SLAEngineService,
    CorbeilleService,
    AdvancedAnalyticsService,
    AIClassificationService,
    CustomerPortalService
  ]
})
export class ReclamationsModule {}
