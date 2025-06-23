import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TuniclaimService } from '../integrations/tuniclaim.service';

@Injectable()
export class SyncTuniclaimJob {
  private readonly logger = new Logger(SyncTuniclaimJob.name);

  constructor(private tuniclaim: TuniclaimService) {}

  // Runs every hour
  @Cron('0 * * * *')
  async handleCron() {
    this.logger.log('Starting Tuniclaim sync...');
    const result = await this.tuniclaim.syncBs();
    this.logger.log(`Tuniclaim sync complete: ${result.imported} imported, ${result.errors} errors`);
  }
}