import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FeedbackController],
  providers: [PrismaService],
})
export class FeedbackModule {}