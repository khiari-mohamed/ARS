import { Module } from '@nestjs/common';
import { GedService } from './ged.service';
import { GedController } from './ged.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { PaperStreamIntegrationService } from './paperstream-integration.service';
import { AdvancedSearchService } from './advanced-search.service';
import { IntegrationModule } from '../integrations/integration.module';

@Module({
  imports: [IntegrationModule],
  controllers: [GedController],
  providers: [GedService, PrismaService, NotificationService, PaperStreamIntegrationService, AdvancedSearchService],
  exports: [GedService, NotificationService, PaperStreamIntegrationService, AdvancedSearchService],
})
export class GedModule {}
