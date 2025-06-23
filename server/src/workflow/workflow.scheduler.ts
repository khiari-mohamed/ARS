import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowScheduler {
  private readonly logger = new Logger(WorkflowScheduler.name);

  constructor(private workflowService: WorkflowService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleAutoAssign() {
    this.logger.debug('Running auto-assignment');
    await this.workflowService.autoAssignTasks();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleSlaMonitoring() {
    this.logger.debug('Monitoring SLA compliance');
    await this.workflowService.monitorSlaCompliance();
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyPriorities() {
    this.logger.debug('Sending daily priorities');
    // Implementation would send emails/notifications
  }
}