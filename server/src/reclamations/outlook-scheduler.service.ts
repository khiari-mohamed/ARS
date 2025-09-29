import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutlookIntegrationService } from './outlook-integration.service';

@Injectable()
export class OutlookSchedulerService {
  private readonly logger = new Logger(OutlookSchedulerService.name);

  constructor(
    private readonly outlookIntegrationService: OutlookIntegrationService
  ) {}

  // Run every 15 minutes to check for new emails
  @Cron('*/15 * * * *')
  async syncOutlookEmails() {
    this.logger.log('Starting scheduled Outlook email sync...');
    
    try {
      await this.outlookIntegrationService.readEmailsAndCreateReclamations();
      this.logger.log('Outlook email sync completed successfully');
    } catch (error) {
      this.logger.error('Error during scheduled Outlook sync:', error);
    }
  }

  // Manual trigger for immediate sync
  async triggerManualSync() {
    this.logger.log('Manual Outlook sync triggered');
    await this.outlookIntegrationService.readEmailsAndCreateReclamations();
  }
}