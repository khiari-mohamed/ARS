import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { CorbeilleService } from './corbeille.service';
import { PrismaService } from '../prisma/prisma.service';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GedModule } from '../ged/ged.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    BordereauxModule,
    AlertsModule,
    AnalyticsModule,
    GedModule
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, CorbeilleService, PrismaService],
  exports: [WorkflowService, CorbeilleService]
})
export class WorkflowModule {}