import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { SlaConfigurationService } from './sla-configuration.service';
import { SlaConfigurationController } from './sla-configuration.controller';
import { DocumentPreviewService } from './document-preview.service';
import { DocumentAssignmentController } from './document-assignment.controller';
import { DocumentAssignmentService } from './document-assignment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientExcelGenerator }  from './excel/client-excel.generator';
@Module({
  imports: [PrismaModule],
  controllers: [ClientController, SlaConfigurationController, DocumentAssignmentController],
  providers: [ClientService, SlaConfigurationService, DocumentPreviewService, DocumentAssignmentService,
        ClientExcelGenerator,  // ← ADD THIS LINE
  ],
  exports: [ClientService, SlaConfigurationService, DocumentAssignmentService],
})
export class ClientModule {}