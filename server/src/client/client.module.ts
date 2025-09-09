import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { SlaConfigurationService } from './sla-configuration.service';
import { SlaConfigurationController } from './sla-configuration.controller';
import { DocumentPreviewService } from './document-preview.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientController, SlaConfigurationController],
  providers: [ClientService, SlaConfigurationService, DocumentPreviewService],
  exports: [ClientService, SlaConfigurationService],
})
export class ClientModule {}