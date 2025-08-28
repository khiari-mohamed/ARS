import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('test')
export class TestStatsController {
  constructor(private prisma: PrismaService) {}

  @Get('reclamation-stats')
  async getReclamationStats() {
    try {
      // Get total count
      const total = await this.prisma.reclamation.count();

      // Get counts by status
      const byStatus = await this.prisma.reclamation.groupBy({
        by: ['status'],
        _count: { id: true }
      });

      // Get counts by severity
      const bySeverity = await this.prisma.reclamation.groupBy({
        by: ['severity'],
        _count: { id: true }
      });

      // Get counts by type
      const byType = await this.prisma.reclamation.groupBy({
        by: ['type'],
        _count: { id: true }
      });

      // Calculate specific status counts
      const resolved = byStatus.find(s => s.status === 'RESOLVED')?._count.id || 0;
      const open = byStatus.find(s => s.status === 'OPEN')?._count.id || 0;

      // Calculate average resolution time (mock for now)
      const avgResolution = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

      return {
        total,
        open,
        resolved,
        byType,
        bySeverity,
        byStatus,
        avgResolution,
        minResolution: 1 * 24 * 60 * 60 * 1000, // 1 day
        maxResolution: 30 * 24 * 60 * 60 * 1000, // 30 days
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        total: 0,
        open: 0,
        resolved: 0,
        byType: [],
        bySeverity: [],
        byStatus: [],
        avgResolution: 0,
        minResolution: 0,
        maxResolution: 0
      };
    }
  }

  @Get('reclamation-count')
  async getReclamationCount() {
    try {
      const count = await this.prisma.reclamation.count();
      return { count, timestamp: new Date().toISOString() };
    } catch (error) {
      return { count: 0, error: error.message };
    }
  }
}