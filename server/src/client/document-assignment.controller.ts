import { Controller, Post, Patch, Body, Param, Get, Query } from '@nestjs/common';
import { DocumentAssignmentService } from './document-assignment.service';

interface BulkAssignmentDto {
  documentIds: string[];
  assignedToUserId: string;
  reason?: string;
}

interface ReassignmentDto {
  assignedToUserId: string;
  reason?: string;
}

@Controller('documents')
export class DocumentAssignmentController {
  constructor(private readonly documentAssignmentService: DocumentAssignmentService) {}

  @Post('assign-bulk')
  async assignDocumentsBulk(@Body() dto: BulkAssignmentDto) {
    return this.documentAssignmentService.assignDocumentsBulk(
      dto.documentIds,
      dto.assignedToUserId,
      dto.reason
    );
  }

  @Patch(':id/assign')
  async assignDocument(
    @Param('id') documentId: string,
    @Body() dto: { assignedToUserId: string; reason?: string }
  ) {
    return this.documentAssignmentService.assignDocument(
      documentId,
      dto.assignedToUserId,
      dto.reason
    );
  }

  @Patch(':id/reassign')
  async reassignDocument(
    @Param('id') documentId: string,
    @Body() dto: ReassignmentDto
  ) {
    return this.documentAssignmentService.reassignDocument(
      documentId,
      dto.assignedToUserId,
      dto.reason
    );
  }

  @Get('assignment-view')
  async getDocumentsForAssignment(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('assigned') assigned?: string
  ) {
    return this.documentAssignmentService.getDocumentsForAssignment({
      type,
      status,
      assigned: assigned === 'true'
    });
  }

  @Get(':id/assignment-history')
  async getDocumentAssignmentHistory(@Param('id') documentId: string) {
    return this.documentAssignmentService.getDocumentAssignmentHistory(documentId);
  }
}