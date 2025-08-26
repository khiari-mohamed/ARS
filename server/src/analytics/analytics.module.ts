import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RealTimeAnalyticsService } from './real-time-analytics.service';
import { SLAAnalyticsService } from './sla-analytics.service';
import { OVAnalyticsService } from './ov-analytics.service';
import { AdvancedFilteringService } from './advanced-filtering.service';
import { AdvancedFilteringController } from './advanced-filtering.controller';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [AnalyticsController, AdvancedFilteringController, ScheduledReportsController],
  providers: [
    AnalyticsService, 
    RealTimeAnalyticsService,
    SLAAnalyticsService,
    OVAnalyticsService,
    AdvancedFilteringService,
    ScheduledReportsService,
    PrismaService
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
