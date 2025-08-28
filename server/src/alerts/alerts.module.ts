import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationModule } from '../integrations/integration.module';
import { EnhancedAlertsService } from './enhanced-alerts.service';
import { EscalationEngineService } from './escalation-engine.service';
import { MultiChannelNotificationsService } from './multi-channel-notifications.service';
import { AlertAnalyticsService } from './alert-analytics.service';
import { AlertSchedulerService } from './alert-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [IntegrationModule, ScheduleModule.forRoot()],
  controllers: [AlertsController],
  providers: [
    AlertsService, 
    PrismaService,
    EnhancedAlertsService,
    EscalationEngineService,
    MultiChannelNotificationsService,
    AlertAnalyticsService,
    AlertSchedulerService
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
