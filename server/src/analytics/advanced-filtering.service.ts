import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'contains' | 'starts_with';
  value: any;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface DrillDownPath {
  level: number;
  dimension: string;
  value: any;
  label: string;
  count: number;
  percentage: number;
}

export interface InteractiveChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  dimensions: ChartDimension[];
  metrics: ChartMetric[];
  filters: FilterCriteria[];
  drillDownEnabled: boolean;
  dateRange: { start: Date; end: Date };
}

export interface ChartDimension {
  field: string;
  label: string;
  type: 'category' | 'time' | 'numeric';
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ChartMetric {
  field: string;
  label: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct';
  format: 'number' | 'currency' | 'percentage' | 'duration';
}

export interface FilteredDataResult {
  data: any[];
  totalCount: number;
  filteredCount: number;
  aggregations: { [key: string]: any };
  drillDownOptions: DrillDownPath[];
}

@Injectable()
export class AdvancedFilteringService {
  private readonly logger = new Logger(AdvancedFilteringService.name);

  constructor(private prisma: PrismaService) {}

  // === ADVANCED FILTERING ===
  async applyFilters(
    dataSource: string,
    filters: FilterCriteria[],
    pagination?: { page: number; limit: number }
  ): Promise<FilteredDataResult> {
    try {
      const baseQuery = this.buildBaseQuery(dataSource);
      const filteredQuery = this.applyFilterCriteria(baseQuery, filters);
      
      const totalCount = await this.getTotalCount(dataSource);
      const filteredData = await this.executeQuery(filteredQuery, pagination);
      const aggregations = await this.calculateAggregations(filteredQuery);
      const drillDownOptions = await this.generateDrillDownOptions(filteredQuery, filters);

      return {
        data: filteredData,
        totalCount,
        filteredCount: filteredData.length,
        aggregations,
        drillDownOptions
      };
    } catch (error) {
      this.logger.error('Failed to apply filters:', error);
      throw error;
    }
  }

  private buildBaseQuery(dataSource: string): any {
    // Mock base queries for different data sources
    const baseQueries = {
      'bordereaux': {
        table: 'bordereau',
        fields: ['id', 'statut', 'dateCreation', 'dateTraitement', 'priorite', 'clientId', 'assignedToId'],
        joins: [
          { table: 'client', on: 'bordereau.clientId = client.id', fields: ['nom as clientNom'] },
          { table: 'user', on: 'bordereau.assignedToId = user.id', fields: ['fullName as assignedTo'] }
        ]
      },
      'reclamations': {
        table: 'reclamation',
        fields: ['id', 'statut', 'dateCreation', 'dateResolution', 'priorite', 'categorie', 'clientId'],
        joins: [
          { table: 'client', on: 'reclamation.clientId = client.id', fields: ['nom as clientNom'] }
        ]
      },
      'virements': {
        table: 'virement',
        fields: ['id', 'statut', 'dateCreation', 'montant', 'beneficiaire', 'reference'],
        joins: []
      }
    };

    return baseQueries[dataSource] || baseQueries['bordereaux'];
  }

  private applyFilterCriteria(baseQuery: any, filters: FilterCriteria[]): any {
    const query = { ...baseQuery };
    query.where = [];

    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        query.where.push(condition);
      }
    }

    return query;
  }

  private buildFilterCondition(filter: FilterCriteria): any {
    switch (filter.operator) {
      case 'equals':
        return { field: filter.field, operator: '=', value: filter.value };
      case 'not_equals':
        return { field: filter.field, operator: '!=', value: filter.value };
      case 'greater_than':
        return { field: filter.field, operator: '>', value: filter.value };
      case 'less_than':
        return { field: filter.field, operator: '<', value: filter.value };
      case 'between':
        return { field: filter.field, operator: 'BETWEEN', value: filter.value };
      case 'in':
        return { field: filter.field, operator: 'IN', value: filter.value };
      case 'contains':
        return { field: filter.field, operator: 'LIKE', value: `%${filter.value}%` };
      case 'starts_with':
        return { field: filter.field, operator: 'LIKE', value: `${filter.value}%` };
      default:
        return null;
    }
  }

  private async executeQuery(query: any, pagination?: { page: number; limit: number }): Promise<any[]> {
    // Mock query execution - in production would execute actual database query
    const mockData = this.generateMockData(query.table, pagination?.limit || 100);
    
    // Apply mock filtering
    let filteredData = mockData;
    if (query.where && query.where.length > 0) {
      filteredData = mockData.filter(item => {
        return query.where.every((condition: any) => {
          return this.evaluateCondition(item, condition);
        });
      });
    }

    // Apply pagination
    if (pagination) {
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      filteredData = filteredData.slice(start, end);
    }

    return filteredData;
  }

  private evaluateCondition(item: any, condition: any): boolean {
    const fieldValue = item[condition.field];
    
    switch (condition.operator) {
      case '=':
        return fieldValue === condition.value;
      case '!=':
        return fieldValue !== condition.value;
      case '>':
        return Number(fieldValue) > Number(condition.value);
      case '<':
        return Number(fieldValue) < Number(condition.value);
      case 'BETWEEN':
        return Number(fieldValue) >= Number(condition.value[0]) && 
               Number(fieldValue) <= Number(condition.value[1]);
      case 'IN':
        return condition.value.includes(fieldValue);
      case 'LIKE':
        return String(fieldValue).toLowerCase().includes(
          condition.value.replace(/%/g, '').toLowerCase()
        );
      default:
        return true;
    }
  }

  private generateMockData(table: string, count: number): any[] {
    const data: any[] = [];
    const statuses = ['NOUVEAU', 'EN_COURS', 'TRAITE', 'REJETE'];
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    
    for (let i = 0; i < count; i++) {
      const baseItem = {
        id: `${table}_${i + 1}`,
        statut: statuses[Math.floor(Math.random() * statuses.length)],
        dateCreation: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        priorite: priorities[Math.floor(Math.random() * priorities.length)],
        clientId: `client_${Math.floor(Math.random() * 50) + 1}`,
        clientNom: `Client ${Math.floor(Math.random() * 50) + 1}`
      };

      if (table === 'bordereau') {
        data.push({
          ...baseItem,
          dateTraitement: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          assignedToId: `user_${Math.floor(Math.random() * 20) + 1}`,
          assignedTo: `User ${Math.floor(Math.random() * 20) + 1}`
        });
      } else if (table === 'reclamation') {
        data.push({
          ...baseItem,
          dateResolution: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
          categorie: ['REMBOURSEMENT', 'DELAI', 'QUALITE', 'TECHNIQUE'][Math.floor(Math.random() * 4)]
        });
      } else if (table === 'virement') {
        data.push({
          ...baseItem,
          montant: Math.floor(Math.random() * 100000) + 1000,
          beneficiaire: `Beneficiaire ${Math.floor(Math.random() * 30) + 1}`,
          reference: `REF-${Date.now()}-${i}`
        });
      }
    }

    return data;
  }

  private async getTotalCount(dataSource: string): Promise<number> {
    // Mock total count
    return Math.floor(Math.random() * 10000) + 5000;
  }

  private async calculateAggregations(query: any): Promise<{ [key: string]: any }> {
    // Mock aggregations
    return {
      totalCount: Math.floor(Math.random() * 1000) + 500,
      avgProcessingTime: Math.floor(Math.random() * 10) + 2,
      successRate: Math.random() * 20 + 80,
      byStatus: {
        'NOUVEAU': Math.floor(Math.random() * 100) + 50,
        'EN_COURS': Math.floor(Math.random() * 150) + 100,
        'TRAITE': Math.floor(Math.random() * 300) + 200,
        'REJETE': Math.floor(Math.random() * 50) + 10
      },
      byPriority: {
        'LOW': Math.floor(Math.random() * 200) + 100,
        'MEDIUM': Math.floor(Math.random() * 250) + 150,
        'HIGH': Math.floor(Math.random() * 150) + 75,
        'URGENT': Math.floor(Math.random() * 50) + 25
      }
    };
  }

  private async generateDrillDownOptions(query: any, currentFilters: FilterCriteria[]): Promise<DrillDownPath[]> {
    const drillDownOptions: DrillDownPath[] = [];
    
    // Generate drill-down options based on current level
    const currentLevel = currentFilters.length;
    
    if (currentLevel === 0) {
      // First level - by status
      const statuses = ['NOUVEAU', 'EN_COURS', 'TRAITE', 'REJETE'];
      statuses.forEach((status, index) => {
        drillDownOptions.push({
          level: 1,
          dimension: 'statut',
          value: status,
          label: status,
          count: Math.floor(Math.random() * 200) + 50,
          percentage: Math.random() * 30 + 10
        });
      });
    } else if (currentLevel === 1) {
      // Second level - by priority
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      priorities.forEach((priority, index) => {
        drillDownOptions.push({
          level: 2,
          dimension: 'priorite',
          value: priority,
          label: priority,
          count: Math.floor(Math.random() * 100) + 25,
          percentage: Math.random() * 25 + 5
        });
      });
    } else if (currentLevel === 2) {
      // Third level - by client
      for (let i = 1; i <= 10; i++) {
        drillDownOptions.push({
          level: 3,
          dimension: 'clientId',
          value: `client_${i}`,
          label: `Client ${i}`,
          count: Math.floor(Math.random() * 50) + 10,
          percentage: Math.random() * 15 + 2
        });
      }
    }

    return drillDownOptions.sort((a, b) => b.count - a.count);
  }

  // === INTERACTIVE CHARTS ===
  async generateInteractiveChart(config: InteractiveChartConfig): Promise<any> {
    try {
      const filteredData = await this.applyFilters(
        this.getDataSourceFromConfig(config),
        config.filters
      );

      const chartData = this.transformDataForChart(filteredData.data, config);
      
      return {
        chartType: config.chartType,
        data: chartData,
        config: {
          dimensions: config.dimensions,
          metrics: config.metrics,
          drillDownEnabled: config.drillDownEnabled
        },
        metadata: {
          totalRecords: filteredData.totalCount,
          filteredRecords: filteredData.filteredCount,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate interactive chart:', error);
      throw error;
    }
  }

  private getDataSourceFromConfig(config: InteractiveChartConfig): string {
    // Determine data source based on dimensions and metrics
    const fields = [...config.dimensions.map(d => d.field), ...config.metrics.map(m => m.field)];
    
    if (fields.some(f => f.includes('reclamation') || f.includes('categorie'))) {
      return 'reclamations';
    } else if (fields.some(f => f.includes('virement') || f.includes('montant'))) {
      return 'virements';
    } else {
      return 'bordereaux';
    }
  }

  private transformDataForChart(data: any[], config: InteractiveChartConfig): any[] {
    const transformed: any[] = [];
    
    // Group data by dimensions
    const grouped = this.groupDataByDimensions(data, config.dimensions);
    
    // Calculate metrics for each group
    for (const [key, groupData] of Object.entries(grouped)) {
      const item: any = { key };
      
      // Add dimension values
      config.dimensions.forEach((dim, index) => {
        const dimValue = key.split('|')[index];
        item[dim.field] = dimValue;
        item[`${dim.field}_label`] = this.formatDimensionValue(dimValue, dim);
      });
      
      // Calculate metrics
      config.metrics.forEach(metric => {
        item[metric.field] = this.calculateMetric(groupData as any[], metric);
      });
      
      transformed.push(item);
    }
    
    return transformed;
  }

  private groupDataByDimensions(data: any[], dimensions: ChartDimension[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    
    data.forEach(item => {
      const key = dimensions.map(dim => {
        let value = item[dim.field];
        
        // Apply grouping for time dimensions
        if (dim.type === 'time' && dim.groupBy) {
          value = this.groupTimeValue(new Date(value), dim.groupBy);
        }
        
        return value;
      }).join('|');
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }

  private groupTimeValue(date: Date, groupBy: string): string {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const week = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${date.getFullYear()}-W${week}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private calculateMetric(data: any[], metric: ChartMetric): number {
    const values = data.map(item => {
      const value = item[metric.field];
      return typeof value === 'number' ? value : (value ? 1 : 0);
    }).filter(v => v !== null && v !== undefined);
    
    switch (metric.aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'count':
        return data.length;
      case 'avg':
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'distinct':
        return new Set(values).size;
      default:
        return values.length;
    }
  }

  private formatDimensionValue(value: any, dimension: ChartDimension): string {
    if (dimension.type === 'time') {
      // Format time values based on groupBy
      if (dimension.groupBy === 'week') {
        return `Semaine ${value.split('-W')[1]}`;
      } else if (dimension.groupBy === 'month') {
        const [year, month] = value.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
      } else if (dimension.groupBy === 'quarter') {
        return `${value.split('-Q')[0]} T${value.split('-Q')[1]}`;
      }
    }
    
    return String(value);
  }

  // === CUSTOM DATE RANGES ===
  async getDateRangePresets(): Promise<any[]> {
    return [
      { id: 'today', label: 'Aujourd\'hui', start: new Date(), end: new Date() },
      { id: 'yesterday', label: 'Hier', start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: 'last_7_days', label: '7 derniers jours', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
      { id: 'last_30_days', label: '30 derniers jours', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
      { id: 'this_month', label: 'Ce mois', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
      { id: 'last_month', label: 'Mois dernier', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
      { id: 'this_quarter', label: 'Ce trimestre', start: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1), end: new Date() },
      { id: 'this_year', label: 'Cette année', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }
    ];
  }

  async validateDateRange(start: Date, end: Date): Promise<{ valid: boolean; message?: string }> {
    if (start > end) {
      return { valid: false, message: 'La date de début doit être antérieure à la date de fin' };
    }
    
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return { valid: false, message: 'La période ne peut pas dépasser 365 jours' };
    }
    
    if (end > new Date()) {
      return { valid: false, message: 'La date de fin ne peut pas être dans le futur' };
    }
    
    return { valid: true };
  }
}