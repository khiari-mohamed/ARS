import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GecService } from './gec.service';
import { GecController } from './gec.controller';
import { PrismaService } from '../prisma/prisma.service';
import { GedModule } from '../ged/ged.module';
import { OutlookService } from '../integrations/outlook.service';
import { TemplateService } from './template.service';
import { MailTrackingService } from './mail-tracking.service';
import { NotificationController } from '../gec/notification.controller';

@Module({
  controllers: [GecController, NotificationController],
  providers: [GecService, PrismaService, OutlookService, TemplateService, MailTrackingService],
  imports: [GedModule, ScheduleModule.forRoot()],
  exports: [GecService, TemplateService]
})
export class GecModule {}