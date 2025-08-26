import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateReport(params: any) {
    const report = await this.prisma.reportGeneration.create({
      data: {
        type: params.type,
        format: params.format,
        period: params.period,
        parameters: JSON.stringify(params),
        status: 'generating',
        filename: `${params.type}_${Date.now()}.${params.format}`,
        fileSize: 0
      }
    });

    setTimeout(async () => {
      await this.prisma.reportGeneration.update({
        where: { id: report.id },
        data: {
          status: 'completed',
          fileSize: Math.floor(Math.random() * 5000000) + 500000,
          completedAt: new Date()
        }
      });
    }, 3000);

    return report;
  }

  async getRecentReports() {
    return this.prisma.reportGeneration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async getReportStats() {
    const [totalReports, reportsThisMonth] = await Promise.all([
      this.prisma.reportGeneration.count(),
      this.prisma.reportGeneration.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      totalReports,
      reportsThisMonth,
      avgGenerationTime: 3.2,
      mostPopularFormat: 'pdf'
    };
  }

  async downloadReport(reportId: string) {
    const report = await this.prisma.reportGeneration.findUnique({
      where: { id: reportId }
    });

    if (!report || report.status !== 'completed') {
      throw new Error('Report not found or not ready');
    }

    return {
      filename: report.filename,
      data: Buffer.from('Mock report content'),
      contentType: report.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }
}