import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OVAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOVDashboard(user: any, filters: any = {}) {
    const where: any = {};
    
    // Apply date filters ONLY if explicitly provided
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }
    // No default date filtering - show all records

    // Apply company filter (search in client name)
    if (filters.company) {
      where.bordereau = {
        client: {
          name: { contains: filters.company, mode: 'insensitive' }
        }
      };
    }

    // Apply status filter
    if (filters.status) {
      if (filters.status === 'EXECUTE') {
        where.confirmed = true;
      } else if (filters.status === 'EN_ATTENTE') {
        where.confirmed = false;
      }
    }

    const [
      totalOV,
      executedOV,
      pendingOV,
      rejectedOV,
      ovList,
      avgExecutionTime,
      ovByStatus,
      ovByDay,
      alertsOV
    ] = await Promise.all([
      this.prisma.virement.count({ where }),
      this.prisma.virement.count({ where: { ...where, confirmed: true } }),
      this.prisma.virement.count({ where: { ...where, confirmed: false } }),
      0, // No rejected status in Virement table
      this.getOVList(where, filters),
      this.getAvgExecutionTime(where),
      this.getOVByStatus(where),
      this.getOVByDay(where),
      this.getOVAlerts(where)
    ]);

    const executionRate = totalOV > 0 ? (executedOV / totalOV) * 100 : 0;

    return {
      overview: {
        totalOV,
        executedOV,
        pendingOV,
        rejectedOV,
        executionRate,
        avgExecutionTime
      },
      ovList,
      byStatus: ovByStatus,
      trend: ovByDay,
      alerts: alertsOV
    };
  }

  private async getOVList(where: any, filters: any) {
    const orderBy: any = {};
    
    // Apply sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'date':
          orderBy.createdAt = filters.sortOrder || 'desc';
          break;
        case 'amount':
          orderBy.montant = filters.sortOrder || 'desc';
          break;
        case 'status':
          orderBy.confirmed = filters.sortOrder || 'asc';
          break;
        default:
          orderBy.createdAt = 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const ovList = await this.prisma.virement.findMany({
      where,
      orderBy,
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        bordereau: {
          select: {
            reference: true,
            client: { select: { name: true } }
          }
        }
      }
    });

    return ovList.map(ov => {
      const executionDelay = ov.dateExecution && ov.dateDepot
        ? Math.floor((new Date(ov.dateExecution).getTime() - new Date(ov.dateDepot).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: ov.id,
        societe: ov.bordereau?.client?.name || 'N/A',
        numeroBordereau: ov.bordereau?.reference || 'N/A',
        dateInjection: ov.dateDepot,
        dateExecution: ov.dateExecution,
        etatVirement: ov.confirmed ? 'EXECUTE' : 'EN_ATTENTE',
        delaiExecution: executionDelay,
        donneurOrdre: 'ARS',
        montant: ov.montant,
        observations: '',
        alertLevel: this.getOVAlertLevel(ov, executionDelay)
      };
    });
  }

  private getOVAlertLevel(ov: any, executionDelay: number | null) {
    if (ov.confirmed) return 'success';
    
    if (!ov.confirmed && ov.dateDepot) {
      const daysSinceInjection = Math.floor(
        (new Date().getTime() - new Date(ov.dateDepot).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceInjection > 1) return 'critical';
      if (daysSinceInjection > 0.5) return 'warning';
    }
    
    return 'info';
  }

  private async getAvgExecutionTime(where: any) {
    const executedOV = await this.prisma.virement.findMany({
      where: {
        ...where,
        confirmed: true
      },
      select: {
        dateDepot: true,
        dateExecution: true
      }
    });

    if (executedOV.length === 0) return 0;

    const totalDays = executedOV.reduce((sum, ov) => {
      if (ov.dateExecution && ov.dateDepot) {
        const days = Math.floor(
          (new Date(ov.dateExecution).getTime() - new Date(ov.dateDepot).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + Math.max(days, 0);
      }
      return sum;
    }, 0);

    return executedOV.length > 0 ? totalDays / executedOV.length : 0;
  }

  private async getOVByStatus(where: any) {
    const statusCounts = await this.prisma.virement.groupBy({
      by: ['confirmed'],
      _count: { id: true },
      where
    });

    return statusCounts.map(item => ({
      status: item.confirmed ? 'EXECUTE' : 'EN_ATTENTE',
      count: item._count?.id || 0,
      percentage: 0 // Will be calculated in frontend
    }));
  }

  private async getOVByDay(where: any) {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all OV, not just last 30 days, to ensure we show data
    const dailyOV = await this.prisma.virement.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyStats = new Map();
    
    for (const ov of dailyOV) {
      const date = ov.createdAt.toISOString().split('T')[0];
      
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { created: 0, executed: 0 });
      }
      
      dailyStats.get(date).created += ov._count.id;
    }

    // Get executed OV by day
    const executedDaily = await this.prisma.virement.groupBy({
      by: ['dateExecution'],
      _count: { id: true },
      where: {
        ...where,
        confirmed: true
      }
    });

    for (const ov of executedDaily) {
      const date = ov.dateExecution.toISOString().split('T')[0];
      
      if (dailyStats.has(date)) {
        dailyStats.get(date).executed += ov._count.id;
      }
    }

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      created: stats.created,
      executed: stats.executed,
      executionRate: stats.created > 0 ? (stats.executed / stats.created) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getOVAlerts(where: any) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get OV that are pending for more than 24h
    const pendingOV = await this.prisma.virement.findMany({
      where: {
        ...where,
        confirmed: false,
        dateDepot: { lte: yesterday }
      },
      include: {
        bordereau: {
          select: {
            reference: true,
            client: { select: { name: true } }
          }
        }
      },
      orderBy: { dateDepot: 'asc' }
    });

    const alerts: any[] = [];

    // Add pending alerts
    for (const ov of pendingOV) {
      const daysPending = Math.floor(
        (now.getTime() - new Date(ov.dateDepot).getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'pending',
        ovId: ov.id,
        reference: ov.bordereau?.reference,
        clientName: ov.bordereau?.client?.name,
        daysPending,
        message: `OV pending for ${daysPending} days`,
        severity: daysPending > 3 ? 'error' : 'warning',
        dateInjection: ov.dateDepot
      });
    }

    return alerts.sort((a: any, b: any) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (b.severity === 'error' && a.severity !== 'error') return 1;
      return 0;
    });
  }

  async exportOVToExcel(filters: any, user: any) {
    const ovData = await this.getOVList({}, filters);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ordres de Virement');

    // Set headers
    worksheet.columns = [
      { header: 'Société', key: 'societe', width: 25 },
      { header: 'N° Bordereau', key: 'numeroBordereau', width: 20 },
      { header: 'Date Injection', key: 'dateInjection', width: 15 },
      { header: 'Date Exécution', key: 'dateExecution', width: 15 },
      { header: 'État du Virement', key: 'etatVirement', width: 15 },
      { header: 'Délai d\'Exécution (jours)', key: 'delaiExecution', width: 20 },
      { header: 'Donneur d\'Ordre', key: 'donneurOrdre', width: 25 },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Observations', key: 'observations', width: 30 }
    ];

    // Add data
    for (const ov of ovData) {
      worksheet.addRow({
        societe: ov.societe,
        numeroBordereau: ov.numeroBordereau,
        dateInjection: ov.dateInjection ? new Date(ov.dateInjection).toLocaleDateString() : '',
        dateExecution: ov.dateExecution ? new Date(ov.dateExecution).toLocaleDateString() : '',
        etatVirement: ov.etatVirement,
        delaiExecution: ov.delaiExecution || '',
        donneurOrdre: ov.donneurOrdre,
        montant: ov.montant || '',
        observations: ov.observations
      });
    }

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.width && column.width < 10) column.width = 10;
    });

    // Save file
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `ov_export_${Date.now()}.xlsx`;
    const filePath = path.join(exportsDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);

    return { filePath, fileName };
  }

  async getOVStatistics(filters: any = {}) {
    const where: any = {};
    
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const [
      totalOV,
      executedOV,
      pendingOV,
      rejectedOV,
      avgExecutionTime,
      totalAmount,
      executedAmount
    ] = await Promise.all([
      this.prisma.virement.count({ where }),
      this.prisma.virement.count({ where: { ...where, confirmed: true } }),
      this.prisma.virement.count({ where: { ...where, confirmed: false } }),
      0, // No rejected status in Virement table
      this.getAvgExecutionTime(where),
      this.prisma.virement.aggregate({
        _sum: { montant: true },
        where
      }),
      this.prisma.virement.aggregate({
        _sum: { montant: true },
        where: { ...where, confirmed: true }
      })
    ]);

    return {
      counts: {
        total: totalOV,
        executed: executedOV,
        pending: pendingOV,
        rejected: rejectedOV
      },
      rates: {
        executionRate: totalOV > 0 ? (executedOV / totalOV) * 100 : 0,
        rejectionRate: totalOV > 0 ? (rejectedOV / totalOV) * 100 : 0
      },
      timing: {
        avgExecutionTime
      },
      amounts: {
        total: totalAmount._sum.montant || 0,
        executed: executedAmount._sum.montant || 0,
        pending: (totalAmount._sum.montant || 0) - (executedAmount._sum.montant || 0)
      }
    };
  }
}