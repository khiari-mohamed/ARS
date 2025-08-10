import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: 'dashboard' | 'table' | 'chart' | 'custom';
  dataSource: string;
  config: ReportConfig;
  schedule: ReportSchedule;
  recipients: ReportRecipient[];
  format: 'pdf' | 'excel' | 'csv' | 'html';
  active: boolean;
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'paused' | 'error' | 'completed';
}

export interface ReportConfig {
  filters: any[];
  dateRange: { type: 'relative' | 'absolute'; value: any };
  metrics: string[];
  dimensions: string[];
  sorting: { field: string; direction: 'asc' | 'desc' }[];
  customQuery?: string;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  time: string; // HH:mm format
  timezone: string;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  customCron?: string;
  endDate?: Date;
}

export interface ReportRecipient {
  type: 'user' | 'email' | 'group';
  identifier: string;
  name: string;
  deliveryMethod: 'email' | 'portal' | 'both';
}

export interface ReportExecution {
  id: string;
  reportId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  fileSize?: number;
  filePath?: string;
  error?: string;
  recipients: string[];
  deliveryStatus: { [recipient: string]: 'sent' | 'failed' | 'pending' };
}

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(private prisma: PrismaService) {}

  // === SCHEDULED REPORTS MANAGEMENT ===
  async createScheduledReport(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'status'>): Promise<ScheduledReport> {
    try {
      const newReport: ScheduledReport = {
        id: `report_${Date.now()}`,
        ...report,
        createdAt: new Date(),
        nextRun: this.calculateNextRun(report.schedule),
        status: 'active'
      };

      await this.prisma.auditLog.create({
        data: {
          userId: report.createdBy,
          action: 'SCHEDULED_REPORT_CREATED',
          details: {
            reportId: newReport.id,
            name: newReport.name,
            frequency: newReport.schedule.frequency
          }
        }
      });

      return newReport;
    } catch (error) {
      this.logger.error('Failed to create scheduled report:', error);
      throw error;
    }
  }

  async getScheduledReports(userId?: string): Promise<ScheduledReport[]> {
    try {
      // Mock scheduled reports
      return [
        {
          id: 'report_001',
          name: 'Rapport Quotidien des Bordereaux',
          description: 'Rapport quotidien des bordereaux traités et en cours',
          reportType: 'dashboard',
          dataSource: 'bordereaux',
          config: {
            filters: [{ field: 'statut', operator: 'in', value: ['TRAITE', 'EN_COURS'] }],
            dateRange: { type: 'relative', value: 'last_24_hours' },
            metrics: ['count', 'avg_processing_time'],
            dimensions: ['statut', 'priorite'],
            sorting: [{ field: 'dateCreation', direction: 'desc' }]
          },
          schedule: {
            frequency: 'daily',
            time: '08:00',
            timezone: 'Europe/Paris'
          },
          recipients: [
            { type: 'user', identifier: 'manager_001', name: 'Manager Principal', deliveryMethod: 'email' },
            { type: 'group', identifier: 'supervisors', name: 'Superviseurs', deliveryMethod: 'both' }
          ],
          format: 'pdf',
          active: true,
          createdBy: 'admin_001',
          createdAt: new Date('2024-01-01'),
          lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'report_002',
          name: 'Rapport Hebdomadaire des Réclamations',
          description: 'Analyse hebdomadaire des réclamations par catégorie',
          reportType: 'chart',
          dataSource: 'reclamations',
          config: {
            filters: [],
            dateRange: { type: 'relative', value: 'last_7_days' },
            metrics: ['count', 'resolution_rate'],
            dimensions: ['categorie', 'priorite'],
            sorting: [{ field: 'count', direction: 'desc' }]
          },
          schedule: {
            frequency: 'weekly',
            time: '09:00',
            timezone: 'Europe/Paris',
            daysOfWeek: [1] // Monday
          },
          recipients: [
            { type: 'email', identifier: 'direction@company.com', name: 'Direction', deliveryMethod: 'email' }
          ],
          format: 'excel',
          active: true,
          createdBy: 'admin_001',
          createdAt: new Date('2024-01-15'),
          lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'report_003',
          name: 'Rapport Mensuel Financier',
          description: 'Rapport mensuel des virements et performance financière',
          reportType: 'custom',
          dataSource: 'virements',
          config: {
            filters: [{ field: 'statut', operator: 'equals', value: 'TRAITE' }],
            dateRange: { type: 'relative', value: 'last_month' },
            metrics: ['sum_montant', 'count', 'avg_montant'],
            dimensions: ['beneficiaire', 'dateCreation'],
            sorting: [{ field: 'sum_montant', direction: 'desc' }]
          },
          schedule: {
            frequency: 'monthly',
            time: '07:00',
            timezone: 'Europe/Paris',
            dayOfMonth: 1
          },
          recipients: [
            { type: 'user', identifier: 'cfo_001', name: 'Directeur Financier', deliveryMethod: 'both' },
            { type: 'group', identifier: 'finance_team', name: 'Équipe Finance', deliveryMethod: 'portal' }
          ],
          format: 'pdf',
          active: true,
          createdBy: 'admin_001',
          createdAt: new Date('2024-01-01'),
          lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'active'
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get scheduled reports:', error);
      return [];
    }
  }

  async updateScheduledReport(reportId: string, updates: Partial<ScheduledReport>): Promise<void> {
    try {
      if (updates.schedule) {
        updates.nextRun = this.calculateNextRun(updates.schedule);
      }

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'SCHEDULED_REPORT_UPDATED',
          details: {
            reportId,
            updates: Object.keys(updates),
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update scheduled report:', error);
      throw error;
    }
  }

  async deleteScheduledReport(reportId: string, userId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'SCHEDULED_REPORT_DELETED',
          details: {
            reportId,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete scheduled report:', error);
      throw error;
    }
  }

  // === REPORT EXECUTION ===
  async executeScheduledReport(reportId: string): Promise<ReportExecution> {
    try {
      const report = await this.getScheduledReport(reportId);
      if (!report) {
        throw new Error('Scheduled report not found');
      }

      const execution: ReportExecution = {
        id: `exec_${Date.now()}`,
        reportId,
        startedAt: new Date(),
        status: 'running',
        recipients: report.recipients.map(r => r.identifier),
        deliveryStatus: {}
      };

      // Initialize delivery status
      report.recipients.forEach(recipient => {
        execution.deliveryStatus[recipient.identifier] = 'pending';
      });

      // Generate report data
      const reportData = await this.generateReportData(report);
      
      // Generate report file
      const filePath = await this.generateReportFile(report, reportData);
      
      // Update execution
      execution.completedAt = new Date();
      execution.status = 'completed';
      execution.filePath = filePath;
      execution.fileSize = Math.floor(Math.random() * 1000000) + 100000; // Mock file size

      // Deliver report
      await this.deliverReport(execution, report);

      // Update last run
      await this.updateLastRun(reportId, new Date());

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'SCHEDULED_REPORT_EXECUTED',
          details: {
            reportId,
            executionId: execution.id,
            duration: execution.completedAt.getTime() - execution.startedAt.getTime(),
            recipients: execution.recipients.length
          }
        }
      });

      return execution;
    } catch (error) {
      this.logger.error('Failed to execute scheduled report:', error);
      throw error;
    }
  }

  private async generateReportData(report: ScheduledReport): Promise<any> {
    // Mock report data generation
    const mockData = {
      title: report.name,
      description: report.description,
      generatedAt: new Date(),
      period: this.getReportPeriod(report.config.dateRange),
      summary: {
        totalRecords: Math.floor(Math.random() * 1000) + 500,
        processedRecords: Math.floor(Math.random() * 800) + 400,
        successRate: Math.random() * 20 + 80
      },
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        value: Math.floor(Math.random() * 1000) + 100,
        status: ['TRAITE', 'EN_COURS', 'NOUVEAU'][Math.floor(Math.random() * 3)],
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)]
      })),
      charts: [
        {
          type: 'bar',
          title: 'Répartition par Statut',
          data: [
            { name: 'TRAITE', value: Math.floor(Math.random() * 300) + 200 },
            { name: 'EN_COURS', value: Math.floor(Math.random() * 150) + 100 },
            { name: 'NOUVEAU', value: Math.floor(Math.random() * 100) + 50 }
          ]
        }
      ]
    };

    return mockData;
  }

  private async generateReportFile(report: ScheduledReport, data: any): Promise<string> {
    // Mock file generation
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${report.name.replace(/\s+/g, '_')}_${timestamp}.${report.format}`;
    const filePath = `/reports/${fileName}`;

    // Simulate file generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return filePath;
  }

  private async deliverReport(execution: ReportExecution, report: ScheduledReport): Promise<void> {
    for (const recipient of report.recipients) {
      try {
        if (recipient.deliveryMethod === 'email' || recipient.deliveryMethod === 'both') {
          await this.sendReportByEmail(recipient, execution, report);
        }
        
        if (recipient.deliveryMethod === 'portal' || recipient.deliveryMethod === 'both') {
          await this.saveReportToPortal(recipient, execution, report);
        }

        execution.deliveryStatus[recipient.identifier] = 'sent';
      } catch (error) {
        this.logger.error(`Failed to deliver report to ${recipient.identifier}:`, error);
        execution.deliveryStatus[recipient.identifier] = 'failed';
      }
    }
  }

  private async sendReportByEmail(recipient: ReportRecipient, execution: ReportExecution, report: ScheduledReport): Promise<void> {
    // Mock email sending
    this.logger.log(`Sending report ${report.name} to ${recipient.identifier} via email`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async saveReportToPortal(recipient: ReportRecipient, execution: ReportExecution, report: ScheduledReport): Promise<void> {
    // Mock portal saving
    this.logger.log(`Saving report ${report.name} to portal for ${recipient.identifier}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // === REPORT SCHEDULING ===
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case 'weekly':
        const targetDay = schedule.daysOfWeek?.[0] || 1; // Default to Monday
        const currentDay = nextRun.getDay();
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        if (daysUntilTarget === 0 && nextRun <= now) {
          daysUntilTarget = 7;
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;
        
      case 'monthly':
        const targetDayOfMonth = schedule.dayOfMonth || 1;
        nextRun.setDate(targetDayOfMonth);
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDayOfMonth);
        }
        break;
        
      case 'quarterly':
        // Set to first day of next quarter
        const currentQuarter = Math.floor(nextRun.getMonth() / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        const nextQuarterYear = nextQuarter === 0 ? nextRun.getFullYear() + 1 : nextRun.getFullYear();
        
        nextRun = new Date(nextQuarterYear, nextQuarter * 3, 1, hours, minutes, 0, 0);
        break;
        
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        nextRun.setMonth(0, 1); // January 1st
        break;
    }

    return nextRun;
  }

  private async updateLastRun(reportId: string, lastRun: Date): Promise<void> {
    // Mock update last run
    this.logger.log(`Updated last run for report ${reportId}: ${lastRun.toISOString()}`);
  }

  // === REPORT HISTORY ===
  async getReportExecutions(reportId?: string, limit = 50): Promise<ReportExecution[]> {
    try {
      // Mock execution history
      return Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
        id: `exec_${i + 1}`,
        reportId: reportId || `report_${Math.floor(Math.random() * 3) + 1}`,
        startedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 + Math.random() * 60 * 60 * 1000),
        status: ['completed', 'failed'][Math.floor(Math.random() * 2)] as 'completed' | 'failed',
        fileSize: Math.floor(Math.random() * 1000000) + 100000,
        filePath: `/reports/report_${i + 1}.pdf`,
        recipients: [`user_${i + 1}`, `user_${i + 2}`],
        deliveryStatus: {
          [`user_${i + 1}`]: 'sent',
          [`user_${i + 2}`]: Math.random() > 0.1 ? 'sent' : 'failed'
        }
      }));
    } catch (error) {
      this.logger.error('Failed to get report executions:', error);
      return [];
    }
  }

  async getReportStatistics(): Promise<any> {
    try {
      return {
        totalReports: 15,
        activeReports: 12,
        pausedReports: 2,
        errorReports: 1,
        totalExecutions: 456,
        successfulExecutions: 432,
        failedExecutions: 24,
        successRate: 94.7,
        avgExecutionTime: 3.2, // minutes
        totalFileSize: 2.4, // GB
        byFrequency: {
          daily: 8,
          weekly: 4,
          monthly: 2,
          quarterly: 1
        },
        byFormat: {
          pdf: 7,
          excel: 5,
          csv: 2,
          html: 1
        }
      };
    } catch (error) {
      this.logger.error('Failed to get report statistics:', error);
      return {};
    }
  }

  // === HELPER METHODS ===
  private async getScheduledReport(reportId: string): Promise<ScheduledReport | null> {
    const reports = await this.getScheduledReports();
    return reports.find(r => r.id === reportId) || null;
  }

  private getReportPeriod(dateRange: any): { start: Date; end: Date } {
    const now = new Date();
    
    switch (dateRange.value) {
      case 'last_24_hours':
        return {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now
        };
      case 'last_7_days':
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        };
      case 'last_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0)
        };
      default:
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now
        };
    }
  }

  // === AUTOMATED REPORT GENERATION ===
  async runScheduledReports(): Promise<void> {
    try {
      const reports = await this.getScheduledReports();
      const dueReports = reports.filter(report => 
        report.active && 
        report.nextRun && 
        report.nextRun <= new Date()
      );

      this.logger.log(`Found ${dueReports.length} reports due for execution`);

      for (const report of dueReports) {
        try {
          await this.executeScheduledReport(report.id);
          
          // Update next run
          const nextRun = this.calculateNextRun(report.schedule);
          await this.updateScheduledReport(report.id, { nextRun });
          
        } catch (error) {
          this.logger.error(`Failed to execute scheduled report ${report.id}:`, error);
          await this.updateScheduledReport(report.id, { status: 'error' });
        }
      }
    } catch (error) {
      this.logger.error('Failed to run scheduled reports:', error);
    }
  }
}