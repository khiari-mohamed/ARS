import { Module } from '@nestjs/common';
import { BOService } from './bo.service';
import { BOController } from './bo.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BOController],
  providers: [BOService],
  exports: [BOService],
})
export class BOModule {}