import { Controller, Get, Query } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';

@Controller('analytics/documents')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get('all-types')
  async getAllDocumentTypesStats(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('clientId') clientId?: string,
    @Query('departmentId') departmentId?: string
  ) {
    return this.documentTypesService.getAllDocumentTypesStats({
      fromDate,
      toDate,
      clientId,
      departmentId
    });
  }

  @Get('types-breakdown')
  async getDocumentTypesBreakdown(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('clientId') clientId?: string
  ) {
    return this.documentTypesService.getDocumentTypesBreakdown({
      fromDate,
      toDate,
      clientId
    });
  }

  @Get('status-by-type')
  async getStatusByType(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('clientId') clientId?: string
  ) {
    return this.documentTypesService.getStatusByType({
      fromDate,
      toDate,
      clientId
    });
  }

  @Get('sla-compliance-by-type')
  async getSLAComplianceByType(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('clientId') clientId?: string
  ) {
    return this.documentTypesService.getSLAComplianceByType({
      fromDate,
      toDate,
      clientId
    });
  }

  @Get('assignment-view')
  async getDocumentsForAssignment(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('assigned') assigned?: string
  ) {
    return this.documentTypesService.getDocumentsForAssignment({
      type,
      status,
      assigned: assigned === 'true'
    });
  }
}