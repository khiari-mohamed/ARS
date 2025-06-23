import { Module } from '@nestjs/common';
import { GecService } from './gec.service';
import { GecController } from './gec.controller';
import { PrismaService } from '../prisma/prisma.service';
import { GedModule } from '../ged/ged.module'; // <-- Import the module, not the service
import { OutlookService } from '../integrations/outlook.service';
import { TemplateService } from './template.service';
import { NotificationController } from '../gec/notification.controller';

@Module({
  controllers: [GecController , NotificationController],
  providers: [GecService, PrismaService, OutlookService, TemplateService],
  imports: [GedModule], // <-- Import GedModule
})
export class GecModule {}