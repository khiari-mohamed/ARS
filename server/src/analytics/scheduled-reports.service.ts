import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledReportsService {
  constructor(private prisma: PrismaService) {}

  async createScheduledReport(data: any) {
    return this.prisma.scheduledReport.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        dataSource: data.dataSource,
        frequency: data.frequency,
        executionTime: data.executionTime,
        timezone: data.timezone || 'Europe/Paris',
        format: data.format,
        active: data.active !== false,
        recipients: JSON.stringify(data.recipients || [])
      }
    });
  }

  async getScheduledReports() {
    const reports = await this.prisma.scheduledReport.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return reports.map(report => ({
      ...report,
      recipients: JSON.parse(report.recipients || '[]')
    }));
  }

  async updateScheduledReport(id: string, data: any) {
    return this.prisma.scheduledReport.update({
      where: { id },
      data: {
        ...data,
        recipients: data.recipients ? JSON.stringify(data.recipients) : undefined,
        updatedAt: new Date()
      }
    });
  }

  async deleteScheduledReport(id: string) {
    return this.prisma.scheduledReport.delete({
      where: { id }
    });
  }

  async executeReport(id: string) {
    const report = await this.prisma.scheduledReport.findUnique({
      where: { id }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Create execution record
    const execution = await this.prisma.reportExecution.create({
      data: {
        reportId: id,
        startedAt: new Date(),
        status: 'running'
      }
    });

    // Simulate report generation (replace with actual logic)
    setTimeout(async () => {
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          completedAt: new Date(),
          status: 'completed',
          fileSize: Math.floor(Math.random() * 1000000) + 100000
        }
      });
    }, 2000);

    return execution;
  }

  async getReportExecutions() {
    return this.prisma.reportExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50
    });
  }

  async getReportStatistics() {
    const [totalReports, activeReports, totalExecutions, successfulExecutions] = await Promise.all([
      this.prisma.scheduledReport.count(),
      this.prisma.scheduledReport.count({ where: { active: true } }),
      this.prisma.reportExecution.count(),
      this.prisma.reportExecution.count({ where: { status: 'completed' } })
    ]);

    const failedExecutions = await this.prisma.reportExecution.count({ 
      where: { status: 'failed' } 
    });

    return {
      totalReports,
      activeReports,
      pausedReports: totalReports - activeReports,
      errorReports: 0,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      avgExecutionTime: 3.2,
      byFrequency: {
        daily: await this.prisma.scheduledReport.count({ where: { frequency: 'daily' } }),
        weekly: await this.prisma.scheduledReport.count({ where: { frequency: 'weekly' } }),
        monthly: await this.prisma.scheduledReport.count({ where: { frequency: 'monthly' } })
      },
      byFormat: {
        pdf: await this.prisma.scheduledReport.count({ where: { format: 'pdf' } }),
        excel: await this.prisma.scheduledReport.count({ where: { format: 'excel' } }),
        csv: await this.prisma.scheduledReport.count({ where: { format: 'csv' } })
      }
    };
  }
}