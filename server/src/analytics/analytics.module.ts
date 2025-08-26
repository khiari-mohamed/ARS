import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RealTimeAnalyticsService } from './real-time-analytics.service';
import { SLAAnalyticsService } from './sla-analytics.service';
import { OVAnalyticsService } from './ov-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService, 
    RealTimeAnalyticsService,
    SLAAnalyticsService,
    OVAnalyticsService,
    PrismaService
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
