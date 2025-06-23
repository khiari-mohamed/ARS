import { Module } from '@nestjs/common';
import { ReclamationsService } from './reclamations.service';
import { ReclamationsController } from './reclamations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service'; // Import the NotificationService

@Module({
  controllers: [ReclamationsController],
  providers: [ReclamationsService, PrismaService , NotificationService],
})
export class ReclamationsModule {}
