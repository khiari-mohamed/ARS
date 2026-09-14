import { Module } from '@nestjs/common';
import { TraitementService } from './traitement.service';
import { TraitementController } from './traitement.controller';

@Module({
  controllers: [TraitementController],
  providers: [TraitementService],
})
export class TraitementModule {}
