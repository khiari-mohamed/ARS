import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdvancedFilteringService } from './advanced-filtering.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AdvancedFilteringController {
  constructor(private advancedFilteringService: AdvancedFilteringService) {}

  @Get('bordereaux/filtered')
  async getFilteredBordereaux(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('filters') filtersJson?: string,
    @Query('drillDown') drillDownJson?: string
  ) {
    const filters = filtersJson ? JSON.parse(filtersJson) : [];
    const drillDown = drillDownJson ? JSON.parse(drillDownJson) : [];
    
    return this.advancedFilteringService.getFilteredData(
      'bordereaux',
      filters,
      { fromDate, toDate },
      drillDown
    );
  }

  @Get('reclamations/filtered')
  async getFilteredReclamations(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('filters') filtersJson?: string,
    @Query('drillDown') drillDownJson?: string
  ) {
    const filters = filtersJson ? JSON.parse(filtersJson) : [];
    const drillDown = drillDownJson ? JSON.parse(drillDownJson) : [];
    
    return this.advancedFilteringService.getFilteredData(
      'reclamations',
      filters,
      { fromDate, toDate },
      drillDown
    );
  }

  @Get('virements/filtered')
  async getFilteredVirements(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('filters') filtersJson?: string,
    @Query('drillDown') drillDownJson?: string
  ) {
    const filters = filtersJson ? JSON.parse(filtersJson) : [];
    const drillDown = drillDownJson ? JSON.parse(drillDownJson) : [];
    
    return this.advancedFilteringService.getFilteredData(
      'virements',
      filters,
      { fromDate, toDate },
      drillDown
    );
  }

  @Get('drill-down')
  async getDrillDownOptions(
    @Query('dataSource') dataSource: string,
    @Query('filters') filtersJson?: string,
    @Query('drillDownLevel') drillDownLevel?: string,
    @Query('parentDimension') parentDimension?: string,
    @Query('parentValue') parentValue?: string
  ) {
    const filters = filtersJson ? JSON.parse(filtersJson) : [];
    const level = parseInt(drillDownLevel || '1');
    
    return this.advancedFilteringService.getDrillDownOptions(
      dataSource,
      filters,
      level,
      parentDimension,
      parentValue
    );
  }
}