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
import { AICoreService } from './ai-core.service';
import { PredictiveModelsService } from './predictive-models.service';
import { ContinuousLearningService } from './continuous-learning.service';
import { GECAutoReplyService } from './gec-auto-reply.service';
import { TuniclaimIntegrationService } from './tuniclaim-integration.service';
import { GecModule } from '../gec/gec.module';

@Module({
  imports: [IntegrationModule, GecModule],
  controllers: [ReclamationsController,],
  providers: [
    AICoreService,
    PredictiveModelsService,
    ContinuousLearningService,
    ReclamationsService,
    PrismaService,
    NotificationService,
    SLAEngineService,
    CorbeilleService,
    BOIntegrationService,
    AdvancedAnalyticsService,
    AIClassificationService,
    CustomerPortalService,
    GECAutoReplyService,
    TuniclaimIntegrationService
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
