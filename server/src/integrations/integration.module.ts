import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TuniclaimService } from './tuniclaim.service';
import { TuniclaimController } from './tuniclaim.controller';
import { PrismaService } from '../prisma/prisma.service';
import { OutlookService } from './outlook.service';
import { OutlookController } from './outlook.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TuniclaimController, OutlookController],
  providers: [TuniclaimService, PrismaService, OutlookService],
  exports: [TuniclaimService, OutlookService],
})
export class IntegrationModule implements OnModuleInit {
  constructor(
    private readonly tuniclaimService: TuniclaimService,
    private readonly outlookService: OutlookService
  ) {}

  async onModuleInit() {
    // Test SMTP connection on startup
    try {
      const isConnected = await this.outlookService.testConnection();
      if (isConnected) {
        console.log('✅ SMTP connection established successfully');
      } else {
        console.warn('⚠️ SMTP connection failed - email notifications disabled');
      }
    } catch (error) {
      console.error('❌ SMTP initialization error:', error.message);
    }

    // Start automatic sync every hour
    setInterval(() => {
      this.tuniclaimService.syncBordereaux().catch(error => {
        console.error('Scheduled MY TUNICLAIM sync failed:', error.message);
      });
    }, 60 * 60 * 1000); // 1 hour

    console.log('🔄 MY TUNICLAIM automatic sync scheduled (every hour)');
  }
}
