import { Module } from '@nestjs/common';
import { GedService } from './ged.service';
import { GedController } from './ged.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Module({
  controllers: [GedController],
  providers: [GedService, PrismaService , NotificationService],
  exports: [GedService , NotificationService],
})
export class GedModule {}
