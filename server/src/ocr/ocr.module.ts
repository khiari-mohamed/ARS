import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OcrController],
  providers: [OcrService, PrismaService],
})
export class OcrModule {}
