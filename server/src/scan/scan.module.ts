import { Module } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';
import { ManualScanController } from './manual-scan.controller';
import { ManualScanService } from './manual-scan.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ScanController, ManualScanController],
  providers: [ScanService, ManualScanService],
  exports: [ScanService, ManualScanService],
})
export class ScanModule {}