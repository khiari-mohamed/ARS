import { Module } from '@nestjs/common';
import { WireTransferController } from './wire-transfer.controller';
import { WireTransferService } from './wire-transfer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WireTransferController],
  providers: [WireTransferService],
  exports: [WireTransferService]
})
export class WireTransferModule {}