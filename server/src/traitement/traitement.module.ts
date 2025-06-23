import { Module } from '@nestjs/common';
import { TraitementService } from './traitement.service';
import { TraitementController } from './traitement.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TraitementController],
  providers: [TraitementService, PrismaService],
})
export class TraitementModule {}
