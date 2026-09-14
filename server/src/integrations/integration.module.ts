import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TuniclaimService } from './tuniclaim.service';
import { TuniclaimController } from './tuniclaim.controller';
import { OutlookService } from './outlook.service';
import { OutlookController } from './outlook.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TuniclaimController, OutlookController],
  providers: [TuniclaimService, OutlookService],
  exports: [TuniclaimService, OutlookService],
})
export class IntegrationModule implements OnModuleInit {
  constructor(
    private readonly tuniclaimService: TuniclaimService,
    private readonly outlookService: OutlookService
  ) {}

  async onModuleInit() {
    // Start automatic sync every hour
    setInterval(() => {
      this.tuniclaimService.syncBordereaux().catch(error => {
        console.error('Scheduled MY TUNICLAIM sync failed:', error.message);
      });
    }, 60 * 60 * 1000); // 1 hour

    console.log('🔄 MY TUNICLAIM automatic sync scheduled (every hour)');
  }
}
