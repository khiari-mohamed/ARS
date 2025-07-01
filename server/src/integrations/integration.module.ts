import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TuniclaimService } from './tuniclaim.service';
import { PrismaService } from '../prisma/prisma.service';
import { OutlookService } from './outlook.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TuniclaimService, PrismaService, OutlookService],
  exports: [TuniclaimService , OutlookService],
})
export class IntegrationModule {
  constructor(private tuniclaim: TuniclaimService) {
    // Run every hour
    setInterval(() => this.tuniclaim.syncBordereaux(), 60 * 60 * 1000);
  }
}
