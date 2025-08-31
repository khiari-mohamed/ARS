import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdvancedFilteringService {
  constructor(private prisma: PrismaService) {}

  async getFilteredData(dataSource: string, filters: any[], dateRange: any, drillDown?: any[]) {
    const where: any = {};
    
    // Apply date range
    if (dateRange.fromDate || dateRange.toDate) {
      where.createdAt = {};
      if (dateRange.fromDate) where.createdAt.gte = new Date(dateRange.fromDate);
      if (dateRange.toDate) where.createdAt.lte = new Date(dateRange.toDate);
    }

    // Apply filters
    filters.forEach(filter => {
      switch (filter.operator) {
        case 'equals':
          where[filter.field] = filter.value;
          break;
        case 'not_equals':
          where[filter.field] = { not: filter.value };
          break;
        case 'contains':
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
          break;
        case 'greater_than':
          where[filter.field] = { gt: parseFloat(filter.value) || filter.value };
          break;
        case 'less_than':
          where[filter.field] = { lt: parseFloat(filter.value) || filter.value };
          break;
        case 'in':
          where[filter.field] = { in: filter.value.split(',').map((v: string) => v.trim()) };
          break;
      }
    });

    // Select appropriate table based on data source
    switch (dataSource) {
      case 'bordereaux':
        return this.prisma.bordereau.findMany({
          where,
          include: {
            client: { select: { name: true } },
            contract: { select: { delaiReglement: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });
        
      case 'reclamations':
        return this.prisma.reclamation.findMany({
          where,
          include: {
            client: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });
        
      case 'virements':
        return this.prisma.virement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1000
        });
        
      default:
        return [];
    }
  }

  async getDrillDownOptions(dataSource: string, filters: any[], level: number, parentDimension?: string, parentValue?: string) {
    try {
      const where: any = {};
      
      // Apply existing filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'equals':
            where[filter.field] = filter.value;
            break;
          case 'not_equals':
            where[filter.field] = { not: filter.value };
            break;
          case 'contains':
            where[filter.field] = { contains: filter.value, mode: 'insensitive' };
            break;
          case 'greater_than':
            where[filter.field] = { gt: parseFloat(filter.value) || filter.value };
            break;
          case 'less_than':
            where[filter.field] = { lt: parseFloat(filter.value) || filter.value };
            break;
        }
      });

      // Determine next dimension based on level and data source
      let nextDimension = '';
      switch (dataSource) {
        case 'bordereaux':
          if (level === 0 || level === 1) nextDimension = 'statut';
          else if (level === 2) nextDimension = 'priority';
          else if (level === 3) nextDimension = 'clientId';
          break;
        case 'reclamations':
          if (level === 0 || level === 1) nextDimension = 'type';
          else if (level === 2) nextDimension = 'severity';
          else if (level === 3) nextDimension = 'status';
          break;
        case 'virements':
          if (level === 0 || level === 1) nextDimension = 'confirmed';
          break;
      }

      if (!nextDimension) return [];

      // Get aggregated data for next dimension
      let groupBy: any[] = [];
      
      switch (dataSource) {
        case 'bordereaux':
          groupBy = await this.prisma.bordereau.groupBy({
            by: [nextDimension],
            _count: { id: true },
            where
          } as any);
          break;
        case 'reclamations':
          groupBy = await this.prisma.reclamation.groupBy({
            by: [nextDimension],
            _count: { id: true },
            where
          } as any);
          break;
        case 'virements':
          groupBy = await this.prisma.virement.groupBy({
            by: [nextDimension],
            _count: { id: true },
            where
          } as any);
          break;
      }

      const total = groupBy.reduce((sum: number, item: any) => sum + (item._count?.id || 0), 0);

      return groupBy.map((item: any) => ({
        level: level + 1,
        dimension: nextDimension,
        value: item[nextDimension],
        label: this.formatLabel(nextDimension, item[nextDimension]),
        count: item._count?.id || 0,
        percentage: total > 0 ? ((item._count?.id || 0) / total) * 100 : 0
      })).filter(item => item.count > 0);
    } catch (error) {
      console.error('Error getting drill-down options:', error);
      return [];
    }
  }

  private formatLabel(dimension: string, value: any): string {
    const labelMaps: { [key: string]: { [key: string]: string } } = {
      statut: {
        'NOUVEAU': 'Nouveau',
        'EN_COURS': 'En Cours',
        'TRAITE': 'Traité',
        'REJETE': 'Rejeté',
        'VALIDE': 'Validé',
        'EXECUTE': 'Exécuté'
      },
      priorite: {
        'HIGH': 'Haute',
        'MEDIUM': 'Moyenne',
        'LOW': 'Basse'
      },
      type: {
        'TECHNIQUE': 'Technique',
        'COMMERCIAL': 'Commercial',
        'ADMINISTRATIF': 'Administratif'
      },
      severite: {
        'CRITIQUE': 'Critique',
        'MAJEURE': 'Majeure',
        'MINEURE': 'Mineure'
      }
    };

    return labelMaps[dimension]?.[value] || value || 'Non défini';
  }
}