import { Module } from '@nestjs/common';
import { BOService } from './bo.service';
import { BOController } from './bo.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [BOController],
  providers: [BOService, PrismaService],
  exports: [BOService],
})
export class BOModule {}